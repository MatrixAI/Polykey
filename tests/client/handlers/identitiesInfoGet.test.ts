import type { TLSConfig } from '@/network/types';
import type { IdentityId } from '@/ids/index';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type Sigchain from '../../../src/sigchain/Sigchain';
import type { IdentityInfoMessage } from '@/client/handlers/types';
import type { ProviderId } from '@/ids/index';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/RPC/RPCServer';
import {
  identitiesInfoGet,
  IdentitiesInfoGetHandler,
} from '@/client/handlers/identitiesInfoGet';
import RPCClient from '@/RPC/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import IdentitiesManager from '@/identities/IdentitiesManager';
import TestProvider from '../../identities/TestProvider';
import * as testsUtils from '../../utils';

describe('identitiesInfoConnectedGet', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
  let tlsConfig: TLSConfig;
  let identitiesManager: IdentitiesManager;
  const testToken = {
    identityId: 'test_user' as IdentityId,
    providerToken: {
      accessToken: 'abc123',
    },
  };

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      gestaltGraph: {} as GestaltGraph,
      keyRing: {} as KeyRing,
      sigchain: {} as Sigchain,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
    await identitiesManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets an identity', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoGet: new IdentitiesInfoGetHandler({
          identitiesManager,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesInfoGet,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: user1.identityId,
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
  test('searches for a handle across providers', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoGet: new IdentitiesInfoGetHandler({
          identitiesManager,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesInfoGet,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
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
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('searches for identities matching a search term', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoGet: new IdentitiesInfoGetHandler({
          identitiesManager,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesInfoGet,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test

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
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      searchTermList: ['abc'],
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
  test('gets no connected identities', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoGet: new IdentitiesInfoGetHandler({
          identitiesManager,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesInfoGet,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test

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
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      limit: 0,
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(0);
  });
  test('gets one connected identity', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoGet: new IdentitiesInfoGetHandler({
          identitiesManager,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesInfoGet,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test

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
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      limit: 1,
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
  test('cannot get more identities than available', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoGet: new IdentitiesInfoGetHandler({
          identitiesManager,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesInfoGet,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test

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
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      limit: 3,
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
    expect(output[1]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('can only get from authenticated providers', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoGet: new IdentitiesInfoGetHandler({
          identitiesManager,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesInfoGet,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test

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
      testToken.providerToken,
    );
    const response = await rpcClient.methods.identitiesInfoGet({
      identityId: 'user1',
      disconnected: false,
      providerIdList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user1.email,
      name: user1.name,
      identityId: user1.identityId,
      providerId: user1.providerId,
      url: user1.url,
    });
  });
});
