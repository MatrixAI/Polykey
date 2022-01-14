import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
import type { ProviderId } from '@/identities/types';
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
import identitiesProvidersList from '@/client/service/identitiesProvidersList';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
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
