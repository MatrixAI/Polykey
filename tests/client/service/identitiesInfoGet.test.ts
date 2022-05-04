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
import identitiesInfoGet from '@/client/service/identitiesInfoGet';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';
import TestProvider from '../../identities/TestProvider';

describe('identitiesInfoGet', () => {
  const logger = new Logger('identitiesInfoGet test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const testToken = {
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
    const clientService = {
      identitiesInfoGet: identitiesInfoGet({
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
  test('gets an identity', async () => {
    // Setup provider
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider.users['user1'] = user1;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      provider.id,
      testToken.identityId,
      testToken.tokenData,
    );
    const request = new identitiesPB.ProviderSearch();
    request.setIdentityId(user1.identityId);
    const response = grpcClient.identitiesInfoGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Info.AsObject>();
    for await (const identityInfoMessage of response) {
      expect(identityInfoMessage).toBeInstanceOf(identitiesPB.Info);
      const obj = identityInfoMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      provider: {
        identityId: user1.identityId,
        providerId: user1.providerId,
      },
      url: user1.url,
    });
  });
  test('searches for a handle across providers', async () => {
    // Setup providers
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider2.users['user1'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.tokenData,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.tokenData,
    );
    const request = new identitiesPB.ProviderSearch();
    request.setIdentityId('user1');
    const response = grpcClient.identitiesInfoGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Info.AsObject>();
    for await (const identityInfoMessage of response) {
      expect(identityInfoMessage).toBeInstanceOf(identitiesPB.Info);
      const obj = identityInfoMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(2);
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
  });
  test('searches for identities matching a search term', async () => {
    // Setup providers
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'abc',
      email: 'abc@test.com',
      url: 'provider1.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'def',
      email: 'def@test.com',
      url: 'provider2.com/user1',
    };
    provider2.users['user1'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.tokenData,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.tokenData,
    );
    const request = new identitiesPB.ProviderSearch();
    request.setIdentityId('user1');
    request.setSearchTermList(['abc']);
    const response = grpcClient.identitiesInfoGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Info.AsObject>();
    for await (const identityInfoMessage of response) {
      expect(identityInfoMessage).toBeInstanceOf(identitiesPB.Info);
      const obj = identityInfoMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      provider: {
        identityId: user1.identityId,
        providerId: user1.providerId,
      },
      url: user1.url,
    });
  });
  test('gets no connected identities', async () => {
    // Setup provider
    const provider = new TestProvider();
    const user1 = {
      providerId: provider.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider.users['user1'] = user1;
    const user2 = {
      providerId: provider.id,
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider.users['user2'] = user2;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      provider.id,
      testToken.identityId,
      testToken.tokenData,
    );
    const request = new identitiesPB.ProviderSearch();
    request.setIdentityId('user1');
    request.setLimit('0');
    const response = grpcClient.identitiesInfoGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Info.AsObject>();
    for await (const identityInfoMessage of response) {
      expect(identityInfoMessage).toBeInstanceOf(identitiesPB.Info);
      const obj = identityInfoMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(0);
  });
  test('gets one connected identity', async () => {
    // Setup providers
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider2.users['user1'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.tokenData,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.tokenData,
    );
    const request = new identitiesPB.ProviderSearch();
    request.setIdentityId('user1');
    request.setLimit('1');
    const response = grpcClient.identitiesInfoGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Info.AsObject>();
    for await (const identityInfoMessage of response) {
      expect(identityInfoMessage).toBeInstanceOf(identitiesPB.Info);
      const obj = identityInfoMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      provider: {
        identityId: user1.identityId,
        providerId: user1.providerId,
      },
      url: user1.url,
    });
  });
  test('cannot get more identities than available', async () => {
    // Setup providers
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider2.users['user1'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.tokenData,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.tokenData,
    );
    const request = new identitiesPB.ProviderSearch();
    request.setIdentityId('user1');
    request.setLimit('3');
    const response = grpcClient.identitiesInfoGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Info.AsObject>();
    for await (const identityInfoMessage of response) {
      expect(identityInfoMessage).toBeInstanceOf(identitiesPB.Info);
      const obj = identityInfoMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(2);
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
  });
  test('can only get from authenticated providers', async () => {
    // Setup providers
    const provider1 = new TestProvider('provider1' as ProviderId);
    const provider2 = new TestProvider('provider2' as ProviderId);
    const user1 = {
      providerId: provider1.id,
      identityId: 'user1' as IdentityId,
      name: 'User1',
      email: 'user1@test.com',
      url: 'test.com/user1',
    };
    provider1.users['user1'] = user1;
    const user2 = {
      providerId: provider2.id,
      identityId: 'user1' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user1'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.tokenData,
    );
    const request = new identitiesPB.ProviderSearch();
    request.setIdentityId('user1');
    const response = grpcClient.identitiesInfoGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<identitiesPB.Info.AsObject>();
    for await (const identityInfoMessage of response) {
      expect(identityInfoMessage).toBeInstanceOf(identitiesPB.Info);
      const obj = identityInfoMessage.toObject();
      output.push(obj);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      provider: {
        identityId: user1.identityId,
        providerId: user1.providerId,
      },
      url: user1.url,
    });
  });
});
