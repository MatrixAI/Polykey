import type { IdentityId, ProviderId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
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
import identitiesAuthenticate from '@/client/service/identitiesAuthenticate';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import { utils as nodesUtils } from '@/nodes';
import TestProvider from '../../identities/TestProvider';

describe('identitiesAuthenticate', () => {
  const logger = new Logger('identitiesAuthenticate test', LogLevel.WARN, [
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
      identitiesAuthenticate: identitiesAuthenticate({
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
      nodeId: nodesUtils.decodeNodeId(
        'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg',
      )!,
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
  test('authenticates identity', async () => {
    const request = new identitiesPB.Provider();
    request.setProviderId(testToken.providerId);
    request.setIdentityId(testToken.identityId);
    const response = grpcClient.identitiesAuthenticate(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    let step = 0;
    for await (const message of response) {
      if (step === 0) {
        expect(message.getStepCase()).toBe(
          identitiesPB.AuthenticationProcess.StepCase.REQUEST,
        );
        const authRequest = message.getRequest()!;
        expect(authRequest.getUrl()).toBe('test.com');
        expect(authRequest.getDataMap().get('userCode')).toBe('randomtestcode');
      }
      if (step === 1) {
        expect(message.getStepCase()).toBe(
          identitiesPB.AuthenticationProcess.StepCase.RESPONSE,
        );
        const authResponse = message.getResponse()!;
        expect(authResponse.getIdentityId()).toBe(testToken.identityId);
      }
      step++;
    }
    expect(
      await identitiesManager.getToken(
        testToken.providerId,
        testToken.identityId,
      ),
    ).toEqual(testToken.tokenData);
    expect(response.stream.destroyed).toBeTruthy();
    await identitiesManager.delToken(
      testToken.providerId,
      testToken.identityId,
    );
  });
});
