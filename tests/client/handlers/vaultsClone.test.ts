import type GestaltGraph from '../../../src/gestalts/GestaltGraph';
import type WebSocketServer from '@/websockets/WebSocketServer';
import type WebSocketClient from '@/websockets/WebSocketClient';
import type NodeConnectionManager from '../../../src/nodes/NodeConnectionManager';
import type NotificationsManager from '../../../src/notifications/NotificationsManager';
import type ACL from '../../../src/acl/ACL';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import VaultManager from '@/vaults/VaultManager';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';

describe('notificationsSend', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  // Const host = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
  // Let tlsConfig: TLSConfig;
  let vaultManager: VaultManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    // TlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    const vaultsPath = path.join(dataDir, 'vaults');
    vaultManager = await VaultManager.createVaultManager({
      vaultsPath,
      db,
      acl: {} as ACL,
      keyRing: {} as KeyRing,
      nodeConnectionManager: {} as NodeConnectionManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
  });
  afterEach(async () => {
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test.todo('sends a notification'); // , async () => {
  //     // Setup
  //     const rpcServer = await RPCServer.createRPCServer({
  //       manifest: {
  //         notificationsSend: new NotificationsSendHandler({
  //           notificationsManager,
  //         }),
  //       },
  //       logger,
  //     });
  //     webSocketServer = await WebSocketServer.createWebSocketServer({
  //       connectionCallback: (streamPair) =>
  //         rpcServer.handleStream(streamPair),
  //       host,
  //       tlsConfig,
  //       logger: logger.getChild('server'),
  //     });
  //     webSocketClient = await WebSocketClient.createWebSocketClient({
  //       expectedNodeIds: [keyRing.getNodeId()],
  //       host,
  //       logger: logger.getChild('client'),
  //       port: webSocketServer.port,
  //     });
  //     const rpcClient = await RPCClient.createRPCClient({
  //       manifest: {
  //         notificationsSend,
  //       },
  //       streamFactory: (ctx) => webSocketClient.startConnection(ctx),
  //       logger: logger.getChild('clientRPC'),
  //     });
  //
  //     // Doing the test
  //
  //   });
});
