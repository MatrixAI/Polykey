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
import identitiesInfoConnectedGet from '@/client/service/identitiesInfoConnectedGet';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';
import * as identitiesErrors from '@/identities/errors';
import TestProvider from '../../identities/TestProvider';
import * as testUtils from '../../utils';

describe('identitiesInfoConnectedGet', () => {
  const logger = new Logger('identitiesInfoConnectedGet test', LogLevel.WARN, [
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
      // @ts-ignore - version of js-logger is incompatible (remove when EFS logger updates to 3.*)
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      logger,
    });
    const clientService = {
      identitiesInfoConnectedGet: identitiesInfoConnectedGet({
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
  test('gets connected identities from a single provider', async () => {
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
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const request = new identitiesPB.ProviderSearch();
    request.setProviderIdList([provider.id]);
    const response = grpcClient.identitiesInfoConnectedGet(
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
  test('gets connected identities to a particular identity id', async () => {
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
    provider.users[testToken.identityId].connected = [user1.identityId];
    await identitiesManager.putToken(
      provider.id,
      'otherAuthenticatedId' as IdentityId,
      testToken.tokenData,
    );
    provider.users['otherAuthenticatedId'] = { connected: [user2.identityId] };
    const request = new identitiesPB.ProviderSearch();
    request.setProviderIdList([provider.id]);
    request.setAuthIdentityId('otherAuthenticatedId');
    const response = grpcClient.identitiesInfoConnectedGet(
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
      email: user2.email,
      name: user2.name,
      provider: {
        identityId: user2.identityId,
        providerId: user2.providerId,
      },
      url: user2.url,
    });
  });
  test('gets connected identities from multiple providers', async () => {
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
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user2'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.tokenData,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.tokenData,
    );
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const request = new identitiesPB.ProviderSearch();
    request.setProviderIdList([provider1.id, provider2.id]);
    const response = grpcClient.identitiesInfoConnectedGet(
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
  test('gets connected identities from all providers', async () => {
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
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user2'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.tokenData,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.tokenData,
    );
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const request = new identitiesPB.ProviderSearch();
    request.setProviderIdList([]);
    const response = grpcClient.identitiesInfoConnectedGet(
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
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const request = new identitiesPB.ProviderSearch();
    request.setSearchTermList(['1']);
    const response = grpcClient.identitiesInfoConnectedGet(
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
  test('searches for identities matching multiple search terms', async () => {
    // Setup providers
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
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const request = new identitiesPB.ProviderSearch();
    request.setSearchTermList(['1', '2']);
    const response = grpcClient.identitiesInfoConnectedGet(
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
  test('searches for identities matching a search term across multiple providers', async () => {
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
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const request = new identitiesPB.ProviderSearch();
    request.setSearchTermList(['1']);
    const response = grpcClient.identitiesInfoConnectedGet(
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
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const request = new identitiesPB.ProviderSearch();
    request.setLimit('0');
    const response = grpcClient.identitiesInfoConnectedGet(
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
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user2'] = user2;
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
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const request = new identitiesPB.ProviderSearch();
    request.setLimit('1');
    const response = grpcClient.identitiesInfoConnectedGet(
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
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user2'] = user2;
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
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const request = new identitiesPB.ProviderSearch();
    request.setLimit('3');
    const response = grpcClient.identitiesInfoConnectedGet(
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
      identityId: 'user2' as IdentityId,
      name: 'User2',
      email: 'user2@test.com',
      url: 'test.com/user2',
    };
    provider2.users['user2'] = user2;
    identitiesManager.registerProvider(provider1);
    identitiesManager.registerProvider(provider2);
    await identitiesManager.putToken(
      provider1.id,
      testToken.identityId,
      testToken.tokenData,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const request = new identitiesPB.ProviderSearch();
    const response = grpcClient.identitiesInfoConnectedGet(
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
  test('gets disconnected identities', async () => {
    // This feature is not implemented yet - should throw error
    const request = new identitiesPB.ProviderSearch();
    request.setDisconnected(true);
    await testUtils.expectRemoteError(
      grpcClient
        .identitiesInfoConnectedGet(
          request,
          clientUtils.encodeAuthFromPassword(password),
        )
        .next(),
      identitiesErrors.ErrorProviderUnimplemented,
    );
  });
});
