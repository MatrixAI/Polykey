import type { TLSConfig } from '@/network/types';
import type { VaultPermissionMessage } from '@/client/handlers/types';
import type NodeManager from 'nodes/NodeManager';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import GestaltGraph from '@/gestalts/GestaltGraph';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import {
  vaultsPermissionSet,
  VaultsPermissionSetHandler,
} from '@/client/handlers/vaultsPermissionSet';
import {
  vaultsPermissionGet,
  VaultsPermissionGetHandler,
} from '@/client/handlers/vaultsPermissionGet';
import {
  vaultsPermissionUnset,
  VaultsPermissionUnsetHandler,
} from '@/client/handlers/vaultsPermissionUnset';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import NotificationsManager from '@/notifications/NotificationsManager';
import ACL from '@/acl/ACL';
import VaultManager from '@/vaults/VaultManager';
import * as nodesUtils from '@/nodes/utils';
import * as testsUtils from '../../utils';
import * as testUtils from '../../utils/index';

describe('vaultsPermissionSetUnsetGet', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  const nodeId = testUtils.generateRandomNodeId();
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
  let tlsConfig: TLSConfig;
  let vaultManager: VaultManager;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let notificationsManager: NotificationsManager;
  let mockedSendNotification: jest.SpyInstance;

  beforeEach(async () => {
    mockedSendNotification = jest
      .spyOn(NotificationsManager.prototype, 'sendNotification')
      .mockImplementation();
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
    mockedSendNotification.mockRestore();
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
  test('sets, gets, and unsets vault permissions', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        vaultsPermissionSet: new VaultsPermissionSetHandler({
          acl,
          db,
          gestaltGraph,
          notificationsManager,
          vaultManager,
        }),
        vaultsPermissionGet: new VaultsPermissionGetHandler({
          acl,
          db,
          vaultManager,
        }),
        vaultsPermissionUnset: new VaultsPermissionUnsetHandler({
          acl,
          db,
          gestaltGraph,
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
        vaultsPermissionSet,
        vaultsPermissionGet,
        vaultsPermissionUnset,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
    const vaultName = 'test-vault';
    await vaultManager.createVault(vaultName);
    // Set permissions
    const setResponse = await rpcClient.methods.vaultsPermissionSet({
      nameOrId: vaultName,
      nodeIdEncoded: nodeIdEncoded,
      vaultPermissionList: ['clone', 'pull'],
    });
    expect(setResponse.success).toBeTruthy();
    // Get permissions
    const getResponse1 = await rpcClient.methods.vaultsPermissionGet({
      nameOrId: vaultName,
    });
    const list1: Array<VaultPermissionMessage> = [];
    for await (const permission of getResponse1) {
      const permissionsList = permission.vaultPermissionList;
      expect(permissionsList).toContain('pull');
      expect(permissionsList).toContain('clone');
      const receivedNodeId = permission.nodeIdEncoded;
      expect(receivedNodeId).toEqual(nodeIdEncoded);
      list1.push(permission);
    }
    expect(list1).toHaveLength(1);
    // Unset permissions
    const deleteResponse = await rpcClient.methods.vaultsPermissionUnset({
      nameOrId: vaultName,
      nodeIdEncoded: nodeIdEncoded,
      vaultPermissionList: ['pull', 'clone'],
    });
    expect(deleteResponse.success).toBeTruthy();
    // Check permissions were unset
    const getResponse2 = await rpcClient.methods.vaultsPermissionGet({
      nameOrId: vaultName,
    });
    const list2: Array<VaultPermissionMessage> = [];
    for await (const permission of getResponse2) {
      const permissionsList = permission.vaultPermissionList;
      expect(permissionsList).toEqual([]);
      expect(permission.nodeIdEncoded).toEqual(nodeIdEncoded);
      list2.push(permission);
    }
    expect(list2).toHaveLength(1);
  });
});
