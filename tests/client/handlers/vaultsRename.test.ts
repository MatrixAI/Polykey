import type { TLSConfig } from '@/network/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type NotificationsManager from '@/notifications/NotificationsManager';
import type ACL from '@/acl/ACL';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import { VaultsRenameHandler } from '@/client/handlers/vaultsRename';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import VaultManager from '@/vaults/VaultManager';
import * as vaultsUtils from '@/vaults/utils';
import { vaultsRename } from '@/client/handlers/clientManifest';
import * as testsUtils from '../../utils';

describe('vaultsRename', () => {
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
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
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
      keyRing,
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
  test('should rename vault', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        vaultsRename: new VaultsRenameHandler({
          db,
          vaultManager,
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
        vaultsRename,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const vaultId1 = await vaultManager.createVault('test-vault1');
    const vaultId1Encoded = vaultsUtils.encodeVaultId(vaultId1);
    const vaultId2 = await rpcClient.methods.vaultsRename({
      nameOrId: vaultId1Encoded,
      newName: 'test-vault2',
    });
    expect(vaultId2.vaultIdEncoded).toEqual(vaultId1Encoded);
    const renamedVaultId = await vaultManager.getVaultId('test-vault2');
    expect(renamedVaultId).toStrictEqual(vaultId1);
  });
});
