import type { TLSConfig } from '@/network/types';
import type { IdentityId, ProviderId } from '@/ids/index';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import type Sigchain from '../../../src/sigchain/Sigchain';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import { IdentitiesAuthenticatedGetHandler } from '@/client/handlers/identitiesAuthenticatedGet';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import IdentitiesManager from '@/identities/IdentitiesManager';
import { identitiesAuthenticatedGet } from '@/client';
import * as testsUtils from '../../utils';
import TestProvider from '../../identities/TestProvider';

describe('identitiesClaim', () => {
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
  const providerToken = {
    accessToken: 'abc123',
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
  test('gets an authenticated identity', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesAuthenticatedGet: new IdentitiesAuthenticatedGetHandler({
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
      port: webSocketServer.getPort(),
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesAuthenticatedGet,
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
    };
    provider.users['user1'] = user1;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      user1.providerId,
      user1.identityId,
      providerToken,
    );
    const response = await rpcClient.methods.identitiesAuthenticatedGet({});
    const output = Array<identitiesPB.Provider.AsObject>();
    for await (const providerMessage of response) {
      output.push(providerMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual(user1);
  });
  test('does not get an unauthenticated identity', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesAuthenticatedGet: new IdentitiesAuthenticatedGetHandler({
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
      port: webSocketServer.getPort(),
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesAuthenticatedGet,
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
    };
    provider.users['user1'] = user1;
    identitiesManager.registerProvider(provider);
    await identitiesManager.putToken(
      user1.providerId,
      user1.identityId,
      providerToken,
    );
    await identitiesManager.delToken(user1.providerId, user1.identityId);
    const response = await rpcClient.methods.identitiesAuthenticatedGet({});
    const output = Array<identitiesPB.Provider.AsObject>();
    for await (const providerMessage of response) {
      output.push(providerMessage);
    }
    expect(output).toHaveLength(0);
  });
  test('gets authenticated identities from multiple providers', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesAuthenticatedGet: new IdentitiesAuthenticatedGetHandler({
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
      port: webSocketServer.getPort(),
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesAuthenticatedGet,
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
    const response = await rpcClient.methods.identitiesAuthenticatedGet({});
    const output = Array<identitiesPB.Provider.AsObject>();
    for await (const providerMessage of response) {
      output.push(providerMessage);
    }
    expect(output).toHaveLength(3);
    expect(output[0]).toEqual(user1);
    expect(output[1]).toEqual(user2);
    expect(output[2]).toEqual(user3);
  });
  test('gets authenticated identities a specific provider', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesAuthenticatedGet: new IdentitiesAuthenticatedGetHandler({
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
      port: webSocketServer.getPort(),
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        identitiesAuthenticatedGet,
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
    const response = await rpcClient.methods.identitiesAuthenticatedGet({
      providerId: provider2.id,
    });
    const output = Array<identitiesPB.Provider.AsObject>();
    for await (const providerMessage of response) {
      output.push(providerMessage);
    }
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual(user3);
  });
});
