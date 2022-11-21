import type { Host, Port } from '@/network/types';
import type NodeManager from '@/nodes/NodeManager';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import ACL from '@/acl/ACL';
import GestaltGraph from '@/gestalts/GestaltGraph';
import KeyRing from '@/keys/KeyRing';
import NotificationsManager from '@/notifications/NotificationsManager';
import VaultManager from '@/vaults/VaultManager';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import vaultsPermissionGet from '@/client/service/vaultsPermissionGet';
import vaultsPermissionSet from '@/client/service/vaultsPermissionSet';
import vaultsPermissionUnset from '@/client/service/vaultsPermissionUnset';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils/index';
import * as testUtils from '../../utils';

describe('vaultsPermissionSetUnsetGet', () => {
  const logger = new Logger('vaultsPermissionSetUnsetGet test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedSendNotification: jest.SpyInstance;
  beforeAll(async () => {
    mockedSendNotification = jest
      .spyOn(NotificationsManager.prototype, 'sendNotification')
      .mockImplementation();
  });
  afterAll(async () => {
    mockedSendNotification.mockRestore();
  });
  const nodeId = testUtils.generateRandomNodeId();
  let dataDir: string;
  let keyRing: KeyRing;
  let db: DB;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let notificationsManager: NotificationsManager;
  let vaultManager: VaultManager;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
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
      notificationsManager: notificationsManager,
      logger,
    });
    const clientService = {
      vaultsPermissionSet: vaultsPermissionSet({
        authenticate,
        vaultManager,
        gestaltGraph,
        acl,
        notificationsManager,
        db,
        logger,
      }),
      vaultsPermissionUnset: vaultsPermissionUnset({
        authenticate,
        vaultManager,
        gestaltGraph,
        acl,
        db,
        logger,
      }),
      vaultsPermissionGet: vaultsPermissionGet({
        authenticate,
        vaultManager,
        acl,
        db,
        logger,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[ClientServiceService, clientService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: testUtils.generateRandomNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
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
    const vaultName = 'test-vault';
    await vaultManager.createVault(vaultName);
    // Set permissions
    const vault = new vaultsPB.Vault();
    vault.setNameOrId(vaultName);
    const node = new nodesPB.Node();
    node.setNodeId(nodesUtils.encodeNodeId(nodeId));
    const permissions = new vaultsPB.Permissions();
    permissions.setVault(vault);
    permissions.setNode(node);
    permissions.setVaultPermissionsList(['clone', 'pull']);
    const setResponse = await grpcClient.vaultsPermissionSet(
      permissions,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(setResponse).toBeInstanceOf(utilsPB.StatusMessage);
    expect(setResponse.getSuccess()).toBeTruthy();
    // Get permissions
    const getResponse1 = grpcClient.vaultsPermissionGet(
      vault,
      clientUtils.encodeAuthFromPassword(password),
    );
    const list1: Record<string, unknown>[] = [];
    for await (const permission of getResponse1) {
      expect(permission).toBeInstanceOf(vaultsPB.Permissions);
      const permissionsList = permission.getVaultPermissionsList();
      expect(permissionsList).toContain('pull');
      expect(permissionsList).toContain('clone');
      const node = permission.getNode();
      const receivedNodeId = node?.getNodeId();
      expect(receivedNodeId).toEqual(nodesUtils.encodeNodeId(nodeId));
      list1.push(permission.toObject());
    }
    expect(list1).toHaveLength(1);
    // Unset permissions
    const deleteResponse = await grpcClient.vaultsPermissionUnset(
      permissions,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(deleteResponse).toBeInstanceOf(utilsPB.StatusMessage);
    expect(deleteResponse.getSuccess()).toBeTruthy();
    // Check permissions were unset
    const getResponse2 = grpcClient.vaultsPermissionGet(
      vault,
      clientUtils.encodeAuthFromPassword(password),
    );
    const list2: Record<string, unknown>[] = [];
    for await (const permission of getResponse2) {
      expect(permission).toBeInstanceOf(vaultsPB.Permissions);
      const permissionsList = permission.getVaultPermissionsList();
      expect(permissionsList).toEqual([]);
      const node = permission.getNode();
      const receivedNodeId = node?.getNodeId();
      expect(receivedNodeId).toEqual(nodesUtils.encodeNodeId(nodeId));
      list2.push(permission.toObject());
    }
    expect(list2).toHaveLength(1);
  });
});
