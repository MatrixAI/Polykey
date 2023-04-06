import type { TLSConfig } from '@/network/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type NotificationsManager from '@/notifications/NotificationsManager';
import type ACL from '@/acl/ACL';
import type { VaultListMessage } from '@/client/handlers/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import { VaultsCreateHandler } from '@/client/handlers/vaultsCreate';
import { VaultsDeleteHandler } from '@/client/handlers/vaultsDelete';
import { VaultsListHandler } from '@/client/handlers/vaultsList';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import VaultManager from '@/vaults/VaultManager';
import {
  vaultsCreate,
  vaultsDelete,
  vaultsList,
} from '@/client/handlers/clientManifest';
import * as testsUtils from '../../utils';

describe('vaultsCreateDeleteList', () => {
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
  test('creates, lists, and deletes vaults', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        vaultsCreate: new VaultsCreateHandler({
          vaultManager,
          db,
        }),
        vaultsDelete: new VaultsDeleteHandler({
          vaultManager,
          db,
        }),
        vaultsList: new VaultsListHandler({
          vaultManager,
          db,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => rpcServer.handleStream(streamPair),
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
        vaultsCreate,
        vaultsDelete,
        vaultsList,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    // Create vault
    const createResponse = await rpcClient.methods.vaultsCreate({
      vaultName: 'test-vault',
    });
    // List vault
    const listResponse1 = await rpcClient.methods.vaultsList({});
    const vaults1: Array<VaultListMessage> = [];
    for await (const vault of listResponse1) {
      vaults1.push(vault);
    }
    expect(vaults1).toHaveLength(1);
    expect(vaults1[0].vaultName).toBe('test-vault');
    expect(vaults1[0].vaultIdEncoded).toBe(createResponse.vaultIdEncoded);
    // Delete vault
    const deleteResponse = await rpcClient.methods.vaultsDelete({
      nameOrId: createResponse.vaultIdEncoded,
    });
    expect(deleteResponse.success).toBeTruthy();
    // Check vault was deleted
    const listResponse2 = await rpcClient.methods.vaultsList({});
    const vaults2: Array<VaultListMessage> = [];
    for await (const vault of listResponse2) {
      vaults2.push(vault);
    }
    expect(vaults2).toHaveLength(0);
  });
});
