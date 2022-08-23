import type { ProviderId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import IdentitiesManager from '@/identities/IdentitiesManager';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import identitiesProvidersList from '@/client/service/identitiesProvidersList';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';
import TestProvider from '../../identities/TestProvider';

describe('identitiesProvidersList', () => {
  const logger = new Logger('identitiesProvidersList test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const id1 = 'provider1' as ProviderId;
  const id2 = 'provider2' as ProviderId;
  const providers = {};
  providers[id1] = new TestProvider();
  providers[id2] = new TestProvider();
  let mockedGetProviders: jest.SpyInstance;
  beforeAll(async () => {
    mockedGetProviders = jest
      .spyOn(IdentitiesManager.prototype, 'getProviders')
      .mockReturnValue(providers);
  });
  afterAll(async () => {
    mockedGetProviders.mockRestore();
  });
  let dataDir: string;
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
    const clientService = {
      identitiesProvidersList: identitiesProvidersList({
        authenticate,
        identitiesManager,
        logger,
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
      port: grpcServer.getPort(),
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
  test('lists providers', async () => {
    const request = new utilsPB.EmptyMessage();
    const response = await grpcClient.identitiesProvidersList(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(identitiesPB.Provider);
    expect(response.getProviderId()).toContain('provider1');
    expect(response.getProviderId()).toContain('provider2');
  });
});
