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
import identitiesAuthenticatedGet from '@/client/service/identitiesAuthenticatedGet';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';
import TestProvider from '../../identities/TestProvider';

describe('identitiesAuthenticatedGet', () => {
  const logger = new Logger('identitiesAuthenticatedGet test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const providerToken = {
    accessToken: 'abc123',
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
    const clientService = {
      identitiesAuthenticatedGet: identitiesAuthenticatedGet({
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
  test('gets an authenticated identity', async () => {
    // Setup provider
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
    };
    provider.users['user1'] = user1;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      user1.providerId,
      user1.identityId,
      providerToken,
    );
    const request = new identitiesPB.OptionalProvider();
    const response = grpcClient.identitiesAuthenticatedGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Provider.AsObject>();
    for await (const providerMessage of response) {
      expect(providerMessage).toBeInstanceOf(identitiesPB.Provider);
      const obj = providerMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual(user1);
  });
  test('does not get an unauthenticated identity', async () => {
    // Setup provider
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
    };
    provider.users['user1'] = user1;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      user1.providerId,
      user1.identityId,
      providerToken,
    );
    await identitiesManager.delToken(user1.providerId, user1.identityId);
    const request = new identitiesPB.OptionalProvider();
    const response = grpcClient.identitiesAuthenticatedGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Provider.AsObject>();
    for await (const providerMessage of response) {
      expect(providerMessage).toBeInstanceOf(identitiesPB.Provider);
      const obj = providerMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(0);
  });
  test('gets authenticated identities from multiple providers', async () => {
    // Setup providers
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
    };
    const user2 = {
      providerId: provider1.id,
      identityId: 'user2' as IdentityId,
    };
    const user3 = {
      providerId: provider2.id,
      identityId: 'user3' as IdentityId,
    };
    provider1.users['user1'] = user1;
    provider1.users['user2'] = user2;
    provider2.users['user3'] = user3;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      user1.providerId,
      user1.identityId,
      providerToken,
    );
    await identitiesManager.putToken(
      user2.providerId,
      user2.identityId,
      providerToken,
    );
    await identitiesManager.putToken(
      user3.providerId,
      user3.identityId,
      providerToken,
    );
    const request = new identitiesPB.OptionalProvider();
    const response = grpcClient.identitiesAuthenticatedGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Provider.AsObject>();
    for await (const providerMessage of response) {
      expect(providerMessage).toBeInstanceOf(identitiesPB.Provider);
      const obj = providerMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(3);
    expect(output[0]).toEqual(user1);
    expect(output[1]).toEqual(user2);
    expect(output[2]).toEqual(user3);
  });
  test('gets authenticated identities a specific provider', async () => {
    // Setup providers
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
    };
    const user2 = {
      providerId: provider1.id,
      identityId: 'user2' as IdentityId,
    };
    const user3 = {
      providerId: provider2.id,
      identityId: 'user3' as IdentityId,
    };
    provider1.users['user1'] = user1;
    provider1.users['user2'] = user2;
    provider2.users['user3'] = user3;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      user1.providerId,
      user1.identityId,
      providerToken,
    );
    await identitiesManager.putToken(
      user2.providerId,
      user2.identityId,
      providerToken,
    );
    await identitiesManager.putToken(
      user3.providerId,
      user3.identityId,
      providerToken,
    );
    const request = new identitiesPB.OptionalProvider();
    request.setProviderId(provider2.id);
    const response = grpcClient.identitiesAuthenticatedGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Provider.AsObject>();
    for await (const providerMessage of response) {
      expect(providerMessage).toBeInstanceOf(identitiesPB.Provider);
      const obj = providerMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual(user3);
  });
});
