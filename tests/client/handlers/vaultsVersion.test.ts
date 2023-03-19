import type { TLSConfig } from '@/network/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type NotificationsManager from '@/notifications/NotificationsManager';
import type ACL from '@/acl/ACL';
import type { FileSystem } from '@/types';
import type { VaultId } from '@/ids/index';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/RPC/RPCServer';
import {
  vaultsVersion,
  VaultsVersionHandler,
} from '@/client/handlers/vaultsVersion';
import RPCClient from '@/RPC/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import VaultManager from '@/vaults/VaultManager';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as vaultsUtils from '@/vaults/utils';
import * as vaultsErrors from '@/vaults/errors';
import * as testUtils from '../../utils/index';
import * as testsUtils from '../../utils';

describe('vaultsVersion', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  const fs: FileSystem = require('fs');
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
  let tlsConfig: TLSConfig;
  let vaultManager: VaultManager;
  let vaultId: VaultId;
  const secretVer1 = {
    name: 'secret1v1',
    content: 'Secret-1-content-ver1',
  };
  const secretVer2 = {
    name: 'secret1v2',
    content: 'Secret-1-content-ver2',
  };
  const vaultName = 'test-vault';

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
    vaultId = await vaultManager.createVault(vaultName);
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
  test('should switch a vault to a version', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        vaultsVersion: new VaultsVersionHandler({
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
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        vaultsVersion,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    // Commit some history
    const ver1Oid = await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretVer1.name, secretVer1.content);
      });
      const ver1Oid = (await vault.log())[0].commitId;
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretVer2.name, secretVer2.content);
      });
      return ver1Oid;
    });
    // Revert the version
    const vaultMessage = new vaultsPB.Vault();
    vaultMessage.setNameOrId(vaultName);
    const vaultVersionMessage = new vaultsPB.Version();
    vaultVersionMessage.setVault(vaultMessage);
    vaultVersionMessage.setVersionId(ver1Oid);
    const version = await rpcClient.methods.vaultsVersion({
      nameOrId: vaultName,
      versionId: ver1Oid,
    });
    expect(version.latestVersion).toBeFalsy();
    // Read old history
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect((await efs.readFile(secretVer1.name)).toString()).toStrictEqual(
          secretVer1.content,
        );
      });
    });
  });
  test('should fail to find a non existent version', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        vaultsVersion: new VaultsVersionHandler({
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
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        vaultsVersion,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    // Revert the version
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const version = rpcClient.methods.vaultsVersion({
      nameOrId: vaultIdEncoded,
      versionId: 'invalidOid',
    });
    await testUtils.expectRemoteError(
      version,
      vaultsErrors.ErrorVaultReferenceInvalid,
    );
    const version2 = rpcClient.methods.vaultsVersion({
      nameOrId: vaultIdEncoded,
      versionId: '7660aa9a2fee90e875c2d19e5deefe882ca1d4d9',
    });
    await testUtils.expectRemoteError(
      version2,
      vaultsErrors.ErrorVaultReferenceMissing,
    );
  });
});
