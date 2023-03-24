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
import { VaultsSecretsNewHandler } from '@/client/handlers/vaultsSecretsNew';
import { VaultsSecretsDeleteHandler } from '@/client/handlers/vaultsSecretsDelete';
import { VaultsSecretsGetHandler } from '@/client/handlers/vaultsSecretsGet';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import VaultManager from '@/vaults/VaultManager';
import * as vaultsUtils from '@/vaults/utils';
import * as vaultsErrors from '@/vaults/errors';
import {
  vaultsSecretsDelete,
  vaultsSecretsGet,
  vaultsSecretsNew,
} from '@/client/handlers/clientManifest';
import * as testUtils from '../../utils/index';
import * as testsUtils from '../../utils';

describe('vaultsSecretsNewDeleteGet', () => {
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
  test('creates, gets, and deletes secrets', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        vaultsSecretsNew: new VaultsSecretsNewHandler({
          db,
          vaultManager,
        }),
        vaultsSecretsDelete: new VaultsSecretsDeleteHandler({
          db,
          vaultManager,
        }),
        vaultsSecretsGet: new VaultsSecretsGetHandler({
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
        vaultsSecretsNew,
        vaultsSecretsDelete,
        vaultsSecretsGet,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    // Create secret
    const secret = 'test-secret';
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const createResponse = await rpcClient.methods.vaultsSecretsNew({
      nameOrId: vaultIdEncoded,
      secretName: secret,
      secretContent: Buffer.from(secret).toString('binary'),
    });
    expect(createResponse.success).toBeTruthy();
    // Get secret
    const getResponse1 = await rpcClient.methods.vaultsSecretsGet({
      nameOrId: vaultIdEncoded,
      secretName: secret,
    });
    const secretContent = getResponse1.secretContent;
    expect(secretContent).toStrictEqual(secret);
    // Delete secret
    const deleteResponse = await rpcClient.methods.vaultsSecretsDelete({
      nameOrId: vaultIdEncoded,
      secretName: secret,
    });
    expect(deleteResponse.success).toBeTruthy();
    // Check secret was deleted
    await testUtils.expectRemoteError(
      rpcClient.methods.vaultsSecretsGet({
        nameOrId: vaultIdEncoded,
        secretName: secret,
      }),
      vaultsErrors.ErrorSecretsSecretUndefined,
    );
  });
});
