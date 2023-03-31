import type WebSocketServer from '@/websockets/WebSocketServer';
import type WebSocketClient from '@/websockets/WebSocketClient';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type NodeManager from 'nodes/NodeManager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import GestaltGraph from '@/gestalts/GestaltGraph';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import NotificationsManager from '@/notifications/NotificationsManager';
import ACL from '@/acl/ACL';
import VaultManager from '@/vaults/VaultManager';
import * as testUtils from '../../utils/index';

describe('vaultsPull', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  // Const host = '127.0.0.1';
  const nodeId = testUtils.generateRandomNodeId();
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
  // Let tlsConfig: TLSConfig;
  let vaultManager: VaultManager;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let notificationsManager: NotificationsManager;

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
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    await gestaltGraph.setNode({
      nodeId: nodeId,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager: {} as NodeConnectionManager,
        nodeManager: {} as NodeManager,
        keyRing,
        logger,
      });
    const vaultsPath = path.join(dataDir, 'vaults');
    vaultManager = await VaultManager.createVaultManager({
      vaultsPath,
      db,
      acl,
      keyRing,
      nodeConnectionManager: {} as NodeConnectionManager,
      gestaltGraph,
      notificationsManager,
      logger,
    });
  });
  afterEach(async () => {
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
    await vaultManager.stop();
    await notificationsManager.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test.todo('pulls from a vault'); // , async () => {
  //   // Setup
  //   const rpcServer = await RPCServer.createRPCServer({
  //     manifest: {
  //       vaultsPermissionSet: new VaultsPermissionSetHandler({
  //         acl,
  //         db,
  //         gestaltGraph,
  //         notificationsManager,
  //         vaultManager
  //       }),
  //       vaultsPermissionGet: new VaultsPermissionGetHandler({
  //         acl,
  //         db,
  //         vaultManager
  //       }),
  //       vaultsPermissionUnset: new VaultsPermissionUnsetHandler({
  //         acl,
  //         db,
  //         gestaltGraph,
  //         vaultManager
  //       }),
  //     },
  //     logger,
  //   });
  //   webSocketServer = await WebSocketServer.createWebSocketServer({
  //     connectionCallback: (streamPair, connectionInfo) =>
  //       rpcServer.handleStream(streamPair, connectionInfo),
  //     host,
  //     tlsConfig,
  //     logger: logger.getChild('server'),
  //   });
  //   webSocketClient = await WebSocketClient.createWebSocketClient({
  //     expectedNodeIds: [keyRing.getNodeId()],
  //     host,
  //     logger: logger.getChild('client'),
  //     port: webSocketServer.port,
  //   });
  //   const rpcClient = await RPCClient.createRPCClient({
  //     manifest: {
  //       vaultsPermissionSet,
  //       vaultsPermissionGet,
  //       vaultsPermissionUnset,
  //     },
  //     streamFactory: (ctx) => webSocketClient.startConnection(ctx),
  //     logger: logger.getChild('clientRPC'),
  //   });
  //
  //   // Doing the test
  //
  // });
});
