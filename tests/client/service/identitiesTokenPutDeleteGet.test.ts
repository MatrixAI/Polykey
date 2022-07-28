import type { IdentityId, ProviderId } from '@/identities/types';
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
import identitiesTokenPut from '@/client/service/identitiesTokenPut';
import identitiesTokenGet from '@/client/service/identitiesTokenGet';
import identitiesTokenDelete from '@/client/service/identitiesTokenDelete';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';
import TestProvider from '../../identities/TestProvider';

describe('identitiesTokenPutDeleteGet', () => {
  const logger = new Logger('identitiesTokenPutDeleteGet test', LogLevel.WARN, [
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
      // @ts-ignore - version of js-logger is incompatible (remove when EFS logger updates to 3.*)
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      logger,
    });
    identitiesManager.registerProvider(new TestProvider());
    const clientService = {
      identitiesTokenPut: identitiesTokenPut({
        authenticate,
        identitiesManager,
        logger,
        db,
      }),
      identitiesTokenGet: identitiesTokenGet({
        authenticate,
        identitiesManager,
        logger,
        db,
      }),
      identitiesTokenDelete: identitiesTokenDelete({
        authenticate,
        identitiesManager,
        logger,
        db,
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
  test('puts/deletes/gets tokens', async () => {
    // Put token
    const putRequest = new identitiesPB.TokenSpecific();
    const providerMessage = new identitiesPB.Provider();
    providerMessage.setProviderId(testToken.providerId);
    providerMessage.setIdentityId(testToken.identityId);
    putRequest.setProvider(providerMessage);
    putRequest.setToken(testToken.tokenData.accessToken);
    const putResponse = await grpcClient.identitiesTokenPut(
      putRequest,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(putResponse).toBeInstanceOf(utilsPB.EmptyMessage);
    // Get token
    const getPutResponse = await grpcClient.identitiesTokenGet(
      providerMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(getPutResponse).toBeInstanceOf(identitiesPB.Token);
    expect(JSON.parse(getPutResponse.getToken())).toEqual(testToken.tokenData);
    // Delete token
    const deleteResponse = await grpcClient.identitiesTokenDelete(
      providerMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(deleteResponse).toBeInstanceOf(utilsPB.EmptyMessage);
    // Check token was deleted
    const getDeleteResponse = await grpcClient.identitiesTokenGet(
      providerMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(getDeleteResponse).toBeInstanceOf(identitiesPB.Token);
    expect(getDeleteResponse.getToken()).toEqual('');
  });
});
