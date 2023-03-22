import type { TLSConfig } from '@/network/types';
import type { IdentityId } from '@/ids/index';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type Sigchain from '../../../src/sigchain/Sigchain';
import type { ProviderId } from '@/ids/index';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import { IdentitiesTokenPutHandler } from '@/client/handlers/identitiesTokenPut';
import { IdentitiesTokenDeleteHandler } from '@/client/handlers/identitiesTokenDelete';
import { IdentitiesTokenGetHandler } from '@/client/handlers/identitiesTokenGet';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import IdentitiesManager from '@/identities/IdentitiesManager';
import {
  identitiesTokenDelete,
  identitiesTokenGet,
  identitiesTokenPut,
} from '@/client';
import * as testsUtils from '../../utils';

describe('identitiesTokenPutDeleteGet', () => {
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
    providerId: 'test-provider' as ProviderId,
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
  test('puts/deletes/gets tokens', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        identitiesTokenPut: new IdentitiesTokenPutHandler({
          identitiesManager,
          db,
        }),
        identitiesTokenDelete: new IdentitiesTokenDeleteHandler({
          db,
          identitiesManager,
        }),
        identitiesTokenGet: new IdentitiesTokenGetHandler({
          db,
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
        identitiesTokenPut,
        identitiesTokenDelete,
        identitiesTokenGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    // Put token
    const providerMessage = {
      providerId: testToken.providerId,
      identityId: testToken.identityId,
    };
    await rpcClient.methods.identitiesTokenPut({
      ...providerMessage,
      token: testToken.providerToken,
    });
    // Get token
    const getPutResponse = await rpcClient.methods.identitiesTokenGet(
      providerMessage,
    );
    expect(getPutResponse.token).toStrictEqual(testToken.providerToken);
    // Delete token
    await rpcClient.methods.identitiesTokenDelete(providerMessage);
    // Check token was deleted
    const getDeleteResponse = await rpcClient.methods.identitiesTokenGet(
      providerMessage,
    );
    expect(getDeleteResponse.token).toBeUndefined();
  });
});
