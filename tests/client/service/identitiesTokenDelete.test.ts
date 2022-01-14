import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
import type { IdentityId, ProviderId } from '@/identities/types';
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
import identitiesTokenDelete from '@/client/service/identitiesTokenDelete';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import TestProvider from '../../identities/TestProvider';

describe('identitiesTokenDelete', () => {
  const logger = new Logger('identitiesTokenDelete test', LogLevel.WARN, [
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
    identitiesManager.registerProvider(new TestProvider());
    const clientService = {
      identitiesTokenDelete: identitiesTokenDelete({
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
  test('un-authenticates providers', async () => {
    // Needs an authenticated identity
    await identitiesManager.putToken(
      testToken.providerId,
      testToken.identityId,
      testToken.tokenData,
    );
    const request = new identitiesPB.Provider();
    request.setProviderId(testToken.providerId);
    request.setIdentityId(testToken.identityId);
    const response = await grpcClient.identitiesTokenDelete(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    expect(await identitiesManager.getTokens(testToken.providerId)).toEqual({});
  });
});
