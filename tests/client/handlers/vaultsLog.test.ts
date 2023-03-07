import type { TLSConfig } from '@/network/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type NotificationsManager from '@/notifications/NotificationsManager';
import type ACL from '@/acl/ACL';
import type { VaultId } from '@/ids/index';
import type { LogEntryMessage } from '@/client/handlers/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/RPC/RPCServer';
import { vaultsLog, VaultsLogHandler } from '@/client/handlers/vaultsLog';
import RPCClient from '@/RPC/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import VaultManager from '@/vaults/VaultManager';
import * as testsUtils from '../../utils';

describe('vaultsLog', () => {
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

  const vaultName = 'test-vault';
  const secret1 = { name: 'secret1', content: 'Secret-1-content' };
  const secret2 = { name: 'secret2', content: 'Secret-2-content' };
  let vaultId: VaultId;
  let commit1Oid: string;
  let commit2Oid: string;
  let commit3Oid: string;

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
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
      });
      commit1Oid = (await vault.log(undefined, 0))[0].commitId;
      await vault.writeF(async (efs) => {
        await efs.writeFile(secret2.name, secret2.content);
      });
      commit2Oid = (await vault.log(undefined, 0))[0].commitId;
      await vault.writeF(async (efs) => {
        await efs.unlink(secret2.name);
      });
      commit3Oid = (await vault.log(undefined, 0))[0].commitId;
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
  test('should get the full log', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        vaultsLog: new VaultsLogHandler({
          vaultManager,
          db,
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
        vaultsLog,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const logStream = await rpcClient.methods.vaultsLog({
      nameOrId: vaultName,
    });
    const logMessages: Array<LogEntryMessage> = [];
    for await (const log of logStream) {
      logMessages.push(log);
    }
    // Checking commits exist in order.
    expect(logMessages[2].commitId).toEqual(commit1Oid);
    expect(logMessages[1].commitId).toEqual(commit2Oid);
    expect(logMessages[0].commitId).toEqual(commit3Oid);
  });
  test('should get a part of the log', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        vaultsLog: new VaultsLogHandler({
          vaultManager,
          db,
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
        vaultsLog,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const logStream = await rpcClient.methods.vaultsLog({
      nameOrId: vaultName,
      depth: 2,
    });
    const logMessages: Array<LogEntryMessage> = [];
    for await (const log of logStream) {
      logMessages.push(log);
    }
    // Checking commits exist in order.
    expect(logMessages[1].commitId).toEqual(commit2Oid);
    expect(logMessages[0].commitId).toEqual(commit3Oid);
  });
  test('should get a specific commit', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        vaultsLog: new VaultsLogHandler({
          vaultManager,
          db,
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
        vaultsLog,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const logStream = await rpcClient.methods.vaultsLog({
      nameOrId: vaultName,
      commitId: commit2Oid,
    });
    const logMessages: Array<LogEntryMessage> = [];
    for await (const log of logStream) {
      logMessages.push(log);
    }
    // Checking commits exist in order.
    expect(logMessages[0].commitId).toEqual(commit2Oid);
  });
});
