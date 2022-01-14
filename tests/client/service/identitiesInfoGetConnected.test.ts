import type { IdentityData, IdentityId, ProviderId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import { DB } from '@matrixai/db';
import { GRPCServer } from '@/grpc';
import { IdentitiesManager } from '@/identities';
import {
  GRPCClientClient,
  ClientServiceService,
  utils as clientUtils,
} from '@/client';
import identitiesInfoGetConnected from '@/client/service/identitiesInfoGetConnected';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import TestProvider from '../../identities/TestProvider';

describe('identitiesInfoGetConnected', () => {
  const logger = new Logger('identitiesInfoGetConnected test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };
  const user1: IdentityData = {
    providerId: testToken.providerId,
    identityId: 'user1' as IdentityId,
    name: 'User1',
    email: 'user1@test.com',
    url: 'test.com/user1',
  };
  const user2: IdentityData = {
    providerId: testToken.providerId,
    identityId: 'user2' as IdentityId,
    name: 'User2',
    email: 'user2@test.com',
    url: 'test.com/user2',
  };
  const getConnectedInfos = async function* (): AsyncGenerator<IdentityData> {
    yield user1;
    yield user2;
  };
  let mockedGetConnectedIdentityDatas: jest.SpyInstance;
  beforeAll(async () => {
    mockedGetConnectedIdentityDatas = jest
      .spyOn(TestProvider.prototype, 'getConnectedIdentityDatas')
      .mockImplementation(getConnectedInfos);
  });
  afterAll(async () => {
    mockedGetConnectedIdentityDatas.mockRestore();
  });
  let dataDir: string;
  let testProvider: TestProvider;
  let identitiesManager: IdentitiesManager;
  let db: DB;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      logger,
    });
    testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    const clientService = {
      identitiesInfoGetConnected: identitiesInfoGetConnected({
        authenticate,
        identitiesManager,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[ClientServiceService, clientService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: 'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg' as NodeId,
      host: '127.0.0.1' as Host,
      port: grpcServer.port,
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await identitiesManager.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets connected identities', async () => {
    // Needs an authenticated identity
    await identitiesManager.putToken(
      testToken.providerId,
      testToken.identityId,
      testToken.tokenData,
    );
    const request = new identitiesPB.ProviderSearch();
    const provider = new identitiesPB.Provider();
    provider.setProviderId(testToken.providerId);
    provider.setIdentityId(testToken.identityId);
    request.setProvider(provider);
    request.setSearchTermList([]);
    const response = grpcClient.identitiesInfoGetConnected(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Info.AsObject>();
    for await (const identityInfoMessage of response) {
      expect(identityInfoMessage).toBeInstanceOf(identitiesPB.Info);
      const obj = identityInfoMessage.toObject();
      output.push(obj);
    }
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      provider: {
        identityId: user1.identityId,
        providerId: user1.providerId,
      },
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      provider: {
        identityId: user2.identityId,
        providerId: user2.providerId,
      },
      url: user2.url,
    });
    // Unauthenticate
    await identitiesManager.delToken(
      testToken.providerId,
      testToken.identityId,
    );
  });
});
