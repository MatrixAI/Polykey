import type { TLSConfig } from '@/network/types';
import type { IdentityId } from '@/ids/index';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { ClientRPCResponseResult } from '@/client/types';
import type { IdentityInfoMessage } from '@/client/handlers/types';
import type { ProviderId } from '@/ids/index';
import type Sigchain from '../../../src/sigchain/Sigchain';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import { IdentitiesInfoConnectedGetHandler } from '@/client/handlers/identitiesInfoConnectedGet';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import IdentitiesManager from '@/identities/IdentitiesManager';
import * as identitiesErrors from '@/identities/errors';
import { identitiesInfoConnectedGet } from '@/client';
import * as testUtils from '../../utils';
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
  test('gets connected identities from a single provider', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      providerIdList: [provider.id],
      identityId: '',
      disconnected: false,
      searchTermList: [],
    });
    const output = Array<ClientRPCResponseResult<IdentityInfoMessage>>();
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
  test('gets connected identities to a particular identity id', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
    provider.users[testToken.identityId].connected = [user1.identityId];
    await identitiesManager.putToken(
      provider.id,
      'otherAuthenticatedId' as IdentityId,
      testToken.providerToken,
    );
    provider.users['otherAuthenticatedId'] = { connected: [user2.identityId] };
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      authIdentityId: 'otherAuthenticatedId',
      providerIdList: [provider.id],
      identityId: '',
      disconnected: false,
      searchTermList: [],
    });
    const output = Array<IdentityInfoMessage>();
    for await (const identityInfoMessage of response) {
      output.push(identityInfoMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      email: user2.email,
      name: user2.name,
      identityId: user2.identityId,
      providerId: user2.providerId,
      url: user2.url,
    });
  });
  test('gets connected identities from multiple providers', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      identityId: '',
      disconnected: false,
      searchTermList: [],
      providerIdList: [provider1.id, provider2.id],
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
  test('gets connected identities from all providers', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      providerIdList: [],
      identityId: '',
      disconnected: false,
      searchTermList: [],
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
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      searchTermList: ['1'],
      identityId: '',
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
  test('searches for identities matching multiple search terms', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test

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
      testToken.providerToken,
    );
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      searchTermList: ['1', '2'],
      identityId: '',
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
  test('searches for identities matching a search term across multiple providers', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      searchTermList: ['1'],
      identityId: '',
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
  test('gets no connected identities', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
    provider.users[testToken.identityId].connected = [
      user1.identityId,
      user2.identityId,
    ];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      limit: 0,
      identityId: '',
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
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      limit: 1,
      identityId: '',
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
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
      testToken.providerToken,
    );
    await identitiesManager.putToken(
      provider2.id,
      testToken.identityId,
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      limit: 3,
      identityId: '',
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
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
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
      testToken.providerToken,
    );
    provider1.users[testToken.identityId].connected = [user1.identityId];
    provider2.users[testToken.identityId].connected = [user2.identityId];
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      identityId: '',
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
  test('gets disconnected identities', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesInfoConnectedGet: new IdentitiesInfoConnectedGetHandler({
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
        identitiesInfoConnectedGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test

    // This feature is not implemented yet - should throw error
    const response = await rpcClient.methods.identitiesInfoConnectedGet({
      disconnected: true,
      identityId: '',
      providerIdList: [],
    });
    const reader = response.getReader();
    await testUtils.expectRemoteError(
      reader.read(),
      identitiesErrors.ErrorProviderUnimplemented,
    );
  });
});
