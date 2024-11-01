import type { TLSConfig } from '@/network/types';
import type { FileSystem } from '@/types';
import type { VaultId } from '@/ids';
import type NodeManager from '@/nodes/NodeManager';
import type {
  ContentSuccessMessage,
  ErrorMessage,
  LogEntryMessage,
  SecretContentMessage,
  VaultListMessage,
  VaultPermissionMessage,
} from '@/client/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import TaskManager from '@/tasks/TaskManager';
import ACL from '@/acl/ACL';
import KeyRing from '@/keys/KeyRing';
import VaultManager from '@/vaults/VaultManager';
import GestaltGraph from '@/gestalts/GestaltGraph';
import NotificationsManager from '@/notifications/NotificationsManager';
import ClientService from '@/client/ClientService';
import {
  VaultsCreate,
  VaultsDelete,
  VaultsList,
  VaultsLog,
  VaultsPermissionGet,
  VaultsPermissionSet,
  VaultsPermissionUnset,
  VaultsRename,
  VaultsSecretsRemove,
  VaultsSecretsWriteFile,
  VaultsSecretsEnv,
  VaultsSecretsGet,
  VaultsSecretsCat,
  VaultsSecretsList,
  VaultsSecretsMkdir,
  VaultsSecretsNewDir,
  VaultsSecretsNew,
  VaultsSecretsRename,
  VaultsSecretsStat,
  VaultsVersion,
} from '@/client/handlers';
import {
  vaultsCreate,
  vaultsDelete,
  vaultsList,
  vaultsLog,
  vaultsPermissionGet,
  vaultsPermissionSet,
  vaultsPermissionUnset,
  vaultsRename,
  vaultsSecretsRemove,
  vaultsSecretsWriteFile,
  vaultsSecretsEnv,
  vaultsSecretsGet,
  vaultsSecretsCat,
  vaultsSecretsList,
  vaultsSecretsMkdir,
  vaultsSecretsNew,
  vaultsSecretsNewDir,
  vaultsSecretsRename,
  vaultsSecretsStat,
  vaultsVersion,
} from '@/client/callers';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as vaultsErrors from '@/vaults/errors';
import * as networkUtils from '@/network/utils';
import * as testsUtils from '../../utils';

describe('vaultsClone', () => {
  const logger = new Logger('vaultsClone test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let vaultManager: VaultManager;
  let taskManager: TaskManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test.todo('clones a vault');
});
describe('vaultsCreate and vaultsDelete and vaultsList', () => {
  const logger = new Logger('vaultsCreateDeleteList test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsCreate: typeof vaultsCreate;
    vaultsDelete: typeof vaultsDelete;
    vaultsList: typeof vaultsList;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsCreate: new VaultsCreate({
          vaultManager,
          db,
        }),
        vaultsDelete: new VaultsDelete({
          vaultManager,
          db,
        }),
        vaultsList: new VaultsList({
          vaultManager,
          db,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },

      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsCreate,
        vaultsDelete,
        vaultsList,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('creates, lists, and deletes vaults', async () => {
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
describe('vaultsLog', () => {
  const logger = new Logger('vaultsLog test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsLog: typeof vaultsLog;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsLog: new VaultsLog({
          vaultManager,
          db,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsLog,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('should get the full log', async () => {
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
describe('vaultsPermissionSet and vaultsPermissionUnset and vaultsPermissionGet', () => {
  const logger = new Logger('vaultsPermissionSetUnsetGet test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  const nodeId = testsUtils.generateRandomNodeId();
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsPermissionSet: typeof vaultsPermissionSet;
    vaultsPermissionUnset: typeof vaultsPermissionUnset;
    vaultsPermissionGet: typeof vaultsPermissionGet;
  }>;
  let taskManager: TaskManager;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager: {} as NodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    const vaultsPath = path.join(dataDir, 'vaults');
    vaultManager = await VaultManager.createVaultManager({
      vaultsPath,
      db,
      acl,
      keyRing,
      nodeManager: {} as NodeManager,
      gestaltGraph,
      notificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsPermissionSet: new VaultsPermissionSet({
          acl,
          db,
          gestaltGraph,
          notificationsManager,
          vaultManager,
        }),
        vaultsPermissionGet: new VaultsPermissionGet({
          acl,
          db,
          vaultManager,
        }),
        vaultsPermissionUnset: new VaultsPermissionUnset({
          acl,
          db,
          gestaltGraph,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsPermissionSet,
        vaultsPermissionGet,
        vaultsPermissionUnset,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedSendNotification.mockRestore();
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await notificationsManager.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('sets, gets, and unsets vault permissions', async () => {
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
describe('vaultsPull', () => {
  const logger = new Logger('vaultsPull test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const nodeId = testsUtils.generateRandomNodeId();
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let vaultManager: VaultManager;
  let taskManager: TaskManager;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager: {} as NodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    const vaultsPath = path.join(dataDir, 'vaults');
    vaultManager = await VaultManager.createVaultManager({
      vaultsPath,
      db,
      acl,
      keyRing,
      nodeManager: {} as NodeManager,
      gestaltGraph,
      notificationsManager,
      logger,
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
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
  test.todo('pulls from a vault');
});
describe('vaultsRename', () => {
  const logger = new Logger('vaultsRename test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsRename: typeof vaultsRename;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsRename: new VaultsRename({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsRename,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('should rename vault', async () => {
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
describe('vaultsScan', () => {
  const logger = new Logger('vaultsScan test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test.todo('scans a vault');
});
describe('vaultsSecretsWriteFile', () => {
  const logger = new Logger('vaultsSecretsEdit test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsSecretsWriteFile: typeof vaultsSecretsWriteFile;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsSecretsWriteFile: new VaultsSecretsWriteFile({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsSecretsWriteFile,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('should fail with an invalid vault name', async () => {
    const writeP = async () => {
      try {
        await rpcClient.methods.vaultsSecretsWriteFile({
          nameOrId: 'doesnt-exist',
          secretName: 'doesnt-matter',
          secretContent: 'doesnt-matter',
        });
      } catch (e) {
        throw e.cause;
      }
    };
    await expect(writeP).rejects.toThrow(
      vaultsErrors.ErrorVaultsVaultUndefined,
    );
  });
  test('should edit a secret', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const secretName = 'test-secret';
    const newContent = 'content-changed';
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName, secretName);
      });
    });
    const response = await rpcClient.methods.vaultsSecretsWriteFile({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
      secretContent: Buffer.from(newContent).toString('binary'),
    });
    expect(response.success).toBeTruthy();
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect((await efs.readFile(secretName)).toString()).toStrictEqual(
          newContent,
        );
      });
    });
  });
  test('should create file if it does not exist', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const secretName = 'test-secret';
    const response = await rpcClient.methods.vaultsSecretsWriteFile({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
      secretContent: Buffer.from(secretName).toString('binary'),
    });
    expect(response.success).toBeTruthy();
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        const content = await efs.readFile(secretName);
        expect(content.toString()).toStrictEqual(secretName);
      });
    });
  });
  test('should fail when writing to a directory', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const dirName = 'test-secret';
    // Make the directory
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.mkdir(dirName);
      });
    });
    // Try writing to directory
    const writeP = async () => {
      try {
        await rpcClient.methods.vaultsSecretsWriteFile({
          nameOrId: vaultsUtils.encodeVaultId(vaultId),
          secretName: dirName,
          secretContent: Buffer.from(dirName).toString('binary'),
        });
      } catch (e) {
        throw e.cause;
      }
    };
    await expect(writeP).rejects.toThrow(vaultsErrors.ErrorSecretsIsDirectory);
  });
  test('should fail when parent does not exist', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const dirName = 'dir';
    const secretName = 'secret-name';
    const secretPath = path.join(dirName, secretName);
    // Try writing
    const writeP = async () => {
      try {
        await rpcClient.methods.vaultsSecretsWriteFile({
          nameOrId: vaultsUtils.encodeVaultId(vaultId),
          secretName: secretPath,
          secretContent: Buffer.from(secretName).toString('binary'),
        });
      } catch (e) {
        throw e.cause;
      }
    };
    await expect(writeP).rejects.toThrow(
      vaultsErrors.ErrorSecretsSecretUndefined,
    );
  });
  test('should write to nested path', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const dirName = 'dir';
    const secretName = 'secret-name';
    const secretPath = path.join(dirName, secretName);
    // Make the directory
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.mkdir(dirName);
      });
    });
    // Try writing
    const response = await rpcClient.methods.vaultsSecretsWriteFile({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretPath,
      secretContent: Buffer.from(secretName).toString('binary'),
    });
    expect(response.success).toBeTruthy();
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        const content = await efs.readFile(secretPath);
        expect(content.toString()).toStrictEqual(secretName);
      });
    });
  });
});
describe('vaultsSecretEnv', () => {
  const logger = new Logger('vaultsSecretEnv test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsSecretsEnv: typeof vaultsSecretsEnv;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsSecretsEnv: new VaultsSecretsEnv({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsSecretsEnv,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('should get secrets', async () => {
    // Demonstrating we can pull out multiple secrets across separate vaults
    const vaultName1 = 'vault1';
    const vaultName2 = 'vault2';
    const secretName1 = 'secret1';
    const secretName2 = 'secret2';
    const secretName3 = 'secret3';
    const secretName4 = 'secret4';
    const vaultId1 = await vaultManager.createVault(vaultName1);
    await vaultManager.withVaults([vaultId1], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName1, secretName1);
        await efs.writeFile(secretName2, secretName2);
      });
    });
    const vaultId2 = await vaultManager.createVault(vaultName2);
    await vaultManager.withVaults([vaultId2], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName3, secretName3);
        await efs.writeFile(secretName4, secretName4);
      });
    });

    const secrets = [
      [vaultName1, secretName1],
      [vaultName1, secretName2],
      [vaultName2, secretName3],
      [vaultName2, secretName4],
    ];

    const duplexStream = await rpcClient.methods.vaultsSecretsEnv();
    const writeP = (async () => {
      const writer = duplexStream.writable.getWriter();
      for (const [name, secret] of secrets) {
        await writer.write({
          nameOrId: name,
          secretName: secret,
        });
      }
      await writer.close();
    })();
    const results: Array<SecretContentMessage> = [];
    for await (const value of duplexStream.readable) {
      results.push(value);
    }
    await writeP;

    expect(results[0]).toMatchObject({
      nameOrId: vaultName1,
      secretName: secretName1,
      secretContent: secretName1,
    });
    expect(results[1]).toMatchObject({
      nameOrId: vaultName1,
      secretName: secretName2,
      secretContent: secretName2,
    });
    expect(results[2]).toMatchObject({
      nameOrId: vaultName2,
      secretName: secretName3,
      secretContent: secretName3,
    });
    expect(results[3]).toMatchObject({
      nameOrId: vaultName2,
      secretName: secretName4,
      secretContent: secretName4,
    });
  });
  test('should get secrets by directory', async () => {
    // Demonstrating we can pull out multiple secrets across separate vaults
    const vaultName1 = 'vault1';
    const dirName1 = 'dir1';
    const dirName2 = 'dir2';
    const dirName3 = 'dir3';
    const secretName1 = 'secret1';
    const secretName2 = 'secret2';
    const secretName3 = 'secret3';
    const secretName4 = 'secret4';
    const vaultId1 = await vaultManager.createVault(vaultName1);

    await vaultManager.withVaults([vaultId1], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.mkdir(dirName1);
        await efs.writeFile(`${dirName1}/${secretName1}`, secretName1);
        await efs.writeFile(`${dirName1}/${secretName2}`, secretName2);
        await efs.mkdir(dirName2);
        await efs.writeFile(`${dirName2}/${secretName3}`, secretName3);
        await efs.mkdir(`${dirName2}/${dirName3}`);
        await efs.writeFile(
          `${dirName2}/${dirName3}/${secretName4}`,
          secretName4,
        );
      });
    });

    const secrets = [
      [vaultName1, dirName1],
      [vaultName1, dirName2],
    ];

    const duplexStream = await rpcClient.methods.vaultsSecretsEnv();
    const writeP = (async () => {
      const writer = duplexStream.writable.getWriter();
      for (const [name, secret] of secrets) {
        await writer.write({
          nameOrId: name,
          secretName: secret,
        });
      }
      await writer.close();
    })();
    const results: Map<string, SecretContentMessage> = new Map();
    for await (const value of duplexStream.readable) {
      results.set(value.secretName, value);
    }
    await writeP;
    expect(results.size).toBe(4);
    expect(results.has(`${dirName1}/${secretName1}`)).toBeTrue();
    expect(results.get(`${dirName1}/${secretName1}`)).toMatchObject({
      nameOrId: vaultName1,
      secretName: `${dirName1}/${secretName1}`,
      secretContent: secretName1,
    });
    expect(results.has(`${dirName1}/${secretName2}`)).toBeTrue();
    expect(results.get(`${dirName1}/${secretName2}`)).toMatchObject({
      nameOrId: vaultName1,
      secretName: `${dirName1}/${secretName2}`,
      secretContent: secretName2,
    });
    expect(results.has(`${dirName2}/${dirName3}/${secretName4}`)).toBeTrue();
    expect(results.get(`${dirName2}/${dirName3}/${secretName4}`)).toMatchObject(
      {
        nameOrId: vaultName1,
        secretName: `${dirName2}/${dirName3}/${secretName4}`,
        secretContent: secretName4,
      },
    );
    expect(results.has(`${dirName2}/${secretName3}`)).toBeTrue();
    expect(results.get(`${dirName2}/${secretName3}`)).toMatchObject({
      nameOrId: vaultName1,
      secretName: `${dirName2}/${secretName3}`,
      secretContent: secretName3,
    });
  });
  test('errors should be descriptive', async () => {
    // Demonstrating we can pull out multiple secrets across separate vaults
    const vaultName1 = 'vault1';
    await vaultManager.createVault(vaultName1);

    const secrets = [[vaultName1, 'noSecret']];

    const duplexStream = await rpcClient.methods.vaultsSecretsEnv();
    const writeP = (async () => {
      const writer = duplexStream.writable.getWriter();
      for (const [name, secret] of secrets) {
        await writer.write({
          nameOrId: name,
          secretName: secret,
        });
      }
      await writer.close();
    })();
    await testsUtils.expectRemoteError(
      (async () => {
        for await (const _ of duplexStream.readable) {
          // Do nothing until it throws
        }
      })(),
      vaultsErrors.ErrorSecretsSecretUndefined,
    );
    await writeP;
  });
});
describe('vaultsSecretsMkdir', () => {
  const logger = new Logger('vaultsSecretsMkdir test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsSecretsMkdir: typeof vaultsSecretsMkdir;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsSecretsMkdir: new VaultsSecretsMkdir({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsSecretsMkdir,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('fails with invalid vault name', async () => {
    const vaultName = 'test-vault';
    const dirName = 'dir';
    const response = await rpcClient.methods.vaultsSecretsMkdir();
    const writer = response.writable.getWriter();
    await writer.write({
      nameOrId: vaultName,
      dirName: dirName,
    });
    await writer.close();
    const consumeP = async () => {
      try {
        for await (const _ of response.readable);
      } catch (e) {
        throw e.cause;
      }
    };
    await expect(consumeP()).rejects.toThrow(
      vaultsErrors.ErrorVaultsVaultUndefined,
    );
  });
  test('makes a directory', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const dirPath = 'dir/dir1/dir2';
    const response = await rpcClient.methods.vaultsSecretsMkdir();
    const writer = response.writable.getWriter();
    await writer.write({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      dirName: dirPath,
      metadata: { options: { recursive: true } },
    });
    await writer.close();

    for await (const data of response.readable) {
      expect(data.type).toEqual('success');
    }
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect(await efs.exists(dirPath)).toBeTruthy();
      });
    });
  });
  test('fails to make directories without recursive', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const encodeVaultId = vaultsUtils.encodeVaultId(vaultId);
    const dirPath = 'dir/dir1/dir2';
    const response = await rpcClient.methods.vaultsSecretsMkdir();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: encodeVaultId, dirName: dirPath });
    await writer.close();
    for await (const data of response.readable) {
      expect(data.type).toEqual('error');
      // TS cannot properly evaluate a type as nested as this, so we use the
      // as keyword to help it. Inside this block, the type of data is 'error'.
      const error = data as ErrorMessage;
      expect(error.code).toEqual('ENOENT');
      expect(error.reason).toEqual(dirPath);
    }
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect(await efs.exists(dirPath)).toBeFalsy();
      });
    });
  });
  test('makes directories across multiple vaults', async () => {
    const vaultName1 = 'test-vault1';
    const vaultName2 = 'test-vault2';
    const vaultId1 = await vaultManager.createVault(vaultName1);
    const vaultId2 = await vaultManager.createVault(vaultName2);
    const vaultIdEncoded1 = vaultsUtils.encodeVaultId(vaultId1);
    const vaultIdEncoded2 = vaultsUtils.encodeVaultId(vaultId2);
    const dirPath1 = 'dir-1';
    const dirPath2 = 'dir-2';
    const dirPath3 = 'dir-3';
    // Attempt to make directories
    const response = await rpcClient.methods.vaultsSecretsMkdir();
    const writer = response.writable.getWriter();
    await writer.write({
      nameOrId: vaultIdEncoded1,
      dirName: dirPath1,
      metadata: { options: { recursive: true } },
    });
    await writer.write({ nameOrId: vaultIdEncoded2, dirName: dirPath2 });
    await writer.write({ nameOrId: vaultIdEncoded1, dirName: dirPath3 });
    await writer.close();
    // Check if the operation concluded as expected
    for await (const data of response.readable) {
      expect(data.type).toEqual('success');
    }
    await vaultManager.withVaults(
      [vaultId1, vaultId2],
      async (vault1, vault2) => {
        await vault1.readF(async (efs) => {
          expect(await efs.exists(dirPath1)).toBeTruthy();
          expect(await efs.exists(dirPath3)).toBeTruthy();
        });
        await vault2.readF(async (efs) => {
          expect(await efs.exists(dirPath2)).toBeTruthy();
        });
      },
    );
  });
  test('continues on error', async () => {
    const vaultName1 = 'test-vault1';
    const vaultName2 = 'test-vault2';
    const vaultId1 = await vaultManager.createVault(vaultName1);
    const vaultId2 = await vaultManager.createVault(vaultName2);
    const vaultIdEncoded1 = vaultsUtils.encodeVaultId(vaultId1);
    const vaultIdEncoded2 = vaultsUtils.encodeVaultId(vaultId2);
    const dirPath1 = 'dir-1';
    const dirPath2 = 'dir-2';
    const dirPath3 = 'nodir/dir-3';
    // Attempt to make directories
    const response = await rpcClient.methods.vaultsSecretsMkdir();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: vaultIdEncoded1, dirName: dirPath1 });
    await writer.write({ nameOrId: vaultIdEncoded2, dirName: dirPath2 });
    await writer.write({ nameOrId: vaultIdEncoded1, dirName: dirPath3 });
    await writer.close();
    // Check if the operation concluded as expected
    for await (const data of response.readable) {
      if (data.type === 'error') {
        // TS cannot properly evaluate a type as nested as this, so we use the
        // as keyword to help it. Inside this block, the type of data is 'error'.
        const error = data as ErrorMessage;
        expect(error.code).toEqual('ENOENT');
        expect(error.reason).toEqual(dirPath3);
      }
    }
    await vaultManager.withVaults(
      [vaultId1, vaultId2],
      async (vault1, vault2) => {
        await vault1.readF(async (efs) => {
          expect(await efs.exists(dirPath1)).toBeTruthy();
          expect(await efs.exists(dirPath3)).toBeFalsy();
        });
        await vault2.readF(async (efs) => {
          expect(await efs.exists(dirPath2)).toBeTruthy();
        });
      },
    );
  });
  test('fails if secret with same name exists', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const dirPath = 'secret-first';
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(dirPath, dirPath);
      });
    });
    // Attempt to make directory
    const response = await rpcClient.methods.vaultsSecretsMkdir();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: vaultIdEncoded, dirName: dirPath });
    await writer.close();
    // Check if the operation concluded as expected
    for await (const data of response.readable) {
      expect(data.type).toEqual('error');
      // TS cannot properly evaluate a type as nested as this, so we use the
      // as keyword to help it. Inside this block, the type of data is 'error'.
      const error = data as ErrorMessage;
      expect(error.code).toEqual('EEXIST');
      expect(error.reason).toEqual(dirPath);
    }
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        const stat = await efs.stat(dirPath);
        expect(stat.isFile).toBeTruthy();
      });
    });
  });
});
describe('vaultsSecretsCat', () => {
  const logger = new Logger('vaultsSecretsCat test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsSecretsCat: typeof vaultsSecretsCat;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsSecretsCat: new VaultsSecretsCat({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsSecretsCat,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('fails with invalid vault name', async () => {
    const vaultName = 'test-vault';
    const secretName = 'secret';
    // Cat file
    const response = await rpcClient.methods.vaultsSecretsCat();
    const writer = response.writable.getWriter();
    await writer.write({
      nameOrId: vaultName,
      secretName: secretName,
    });
    await writer.close();
    // Read response
    const consumeP = async () => {
      for await (const _ of response.readable);
    };
    await testsUtils.expectRemoteError(
      consumeP(),
      vaultsErrors.ErrorVaultsVaultUndefined,
    );
  });
  test('reads a secret', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const secretName = 'secret';
    const secretContent = 'secret-content';
    // Write file
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName, secretContent);
      });
    });
    // Cat file
    const response = await rpcClient.methods.vaultsSecretsCat();
    const writer = response.writable.getWriter();
    await writer.write({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
    });
    await writer.close();
    // Read response
    for await (const data of response.readable) {
      expect(data.type).toEqual('success');
      // TS cannot properly evaluate a type as nested as this, so we use the
      // as keyword to help it. Inside this block, the type of data is 'success'.
      const message = data as ContentSuccessMessage;
      expect(message.secretContent).toEqual(secretContent);
    }
  });
  test('fails to read invalid secret', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const secretName = 'secret';
    // Cat file
    const response = await rpcClient.methods.vaultsSecretsCat();
    const writer = response.writable.getWriter();
    await writer.write({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
    });
    await writer.close();
    // Read response
    for await (const data of response.readable) {
      expect(data.type).toEqual('error');
      // TS cannot properly evaluate a type as nested as this, so we use the
      // as keyword to help it. Inside this block, the type of data is 'success'.
      const error = data as ErrorMessage;
      expect(error.code).toEqual('ENOENT');
      expect(error.reason).toEqual(secretName);
    }
  });
  test('fails to read a directory', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const secretName = 'secret';
    // Write files
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.mkdir(secretName);
      });
    });
    // Cat file
    const response = await rpcClient.methods.vaultsSecretsCat();
    const writer = response.writable.getWriter();
    await writer.write({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
    });
    await writer.close();
    // Read response
    for await (const data of response.readable) {
      expect(data.type).toEqual('error');
      // TS cannot properly evaluate a type as nested as this, so we use the
      // as keyword to help it. Inside this block, the type of data is 'success'.
      const error = data as ErrorMessage;
      expect(error.code).toEqual('EISDIR');
      expect(error.reason).toEqual(secretName);
    }
  });
  test('reads multiple secrets in order', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const secretName1 = 'secret1';
    const secretName2 = 'secret2';
    const secretContent1 = 'contents-of-secret1';
    const secretContent2 = 'contents-of-secret2';
    // Write secrets
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName1, secretContent1);
        await efs.writeFile(secretName2, secretContent2);
      });
    });
    // Cat files
    const response = await rpcClient.methods.vaultsSecretsCat();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: vaultIdEncoded, secretName: secretName1 });
    await writer.write({ nameOrId: vaultIdEncoded, secretName: secretName2 });
    await writer.close();
    // Read response
    let totalContent = '';
    for await (const data of response.readable) {
      expect(data.type).toEqual('success');
      // TS cannot properly evaluate a type as nested as this, so we use the
      // as keyword to help it. Inside this block, the type of data is 'success'.
      const message = data as ContentSuccessMessage;
      totalContent += message.secretContent;
    }
    expect(totalContent).toEqual(`${secretContent1}${secretContent2}`);
  });
  test('reads secrets across multiple vaults', async () => {
    const vaultName1 = 'test-vault1';
    const vaultName2 = 'test-vault2';
    const vaultId1 = await vaultManager.createVault(vaultName1);
    const vaultId2 = await vaultManager.createVault(vaultName2);
    const vaultIdEncoded1 = vaultsUtils.encodeVaultId(vaultId1);
    const vaultIdEncoded2 = vaultsUtils.encodeVaultId(vaultId2);
    const secretName1 = 'secret1';
    const secretName2 = 'secret2';
    const secretName3 = 'secret3';
    const secretContent1 = 'content1';
    const secretContent2 = 'content2';
    const secretContent3 = 'content3';
    // Write secrets
    await vaultManager.withVaults(
      [vaultId1, vaultId2],
      async (vault1, vault2) => {
        await vault1.writeF(async (efs) => {
          await efs.writeFile(secretName1, secretContent1);
          await efs.writeFile(secretName3, secretContent3);
        });
        await vault2.writeF(async (efs) => {
          await efs.writeFile(secretName2, secretContent2);
        });
      },
    );
    // Cat files
    const response = await rpcClient.methods.vaultsSecretsCat();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: vaultIdEncoded1, secretName: secretName1 });
    await writer.write({ nameOrId: vaultIdEncoded2, secretName: secretName2 });
    await writer.write({ nameOrId: vaultIdEncoded1, secretName: secretName3 });
    await writer.close();
    // Read response
    let totalContent = '';
    for await (const data of response.readable) {
      expect(data.type).toEqual('success');
      // TS cannot properly evaluate a type as nested as this, so we use the
      // as keyword to help it. Inside this block, the type of data is 'success'.
      const message = data as ContentSuccessMessage;
      totalContent += message.secretContent;
    }
    expect(totalContent).toEqual(
      `${secretContent1}${secretContent2}${secretContent3}`,
    );
  });
  test('continues on error across multiple vaults', async () => {
    const vaultName1 = 'test-vault1';
    const vaultName2 = 'test-vault2';
    const vaultId1 = await vaultManager.createVault(vaultName1);
    const vaultId2 = await vaultManager.createVault(vaultName2);
    const vaultIdEncoded1 = vaultsUtils.encodeVaultId(vaultId1);
    const vaultIdEncoded2 = vaultsUtils.encodeVaultId(vaultId2);
    const secretName1 = 'secret1';
    const secretName2 = 'secret2';
    const secretName3 = 'secret3';
    const invalidName = 'nosecret';
    const secretContent1 = 'content1';
    const secretContent2 = 'content2';
    const secretContent3 = 'content3';
    // Write secrets
    await vaultManager.withVaults(
      [vaultId1, vaultId2],
      async (vault1, vault2) => {
        await vault1.writeF(async (efs) => {
          await efs.writeFile(secretName1, secretContent1);
          await efs.writeFile(secretName3, secretContent3);
        });
        await vault2.writeF(async (efs) => {
          await efs.writeFile(secretName2, secretContent2);
        });
      },
    );
    // Cat files
    const response = await rpcClient.methods.vaultsSecretsCat();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: vaultIdEncoded1, secretName: secretName1 });
    await writer.write({ nameOrId: vaultIdEncoded2, secretName: secretName2 });
    await writer.write({ nameOrId: vaultIdEncoded1, secretName: invalidName });
    await writer.write({ nameOrId: vaultIdEncoded2, secretName: invalidName });
    await writer.write({ nameOrId: vaultIdEncoded1, secretName: secretName3 });
    await writer.close();
    // Read response
    let totalContent = '';
    for await (const data of response.readable) {
      if (data.type === 'success') {
        // TS cannot properly evaluate a type as nested as this, so we use the
        // as keyword to help it. Inside this block, the type of data is 'success'.
        const message = data as ContentSuccessMessage;
        totalContent += message.secretContent;
      } else {
        // TS cannot properly evaluate a type as nested as this, so we use the
        // as keyword to help it. Inside this block, the type of data is 'success'.
        const error = data as ErrorMessage;
        expect(error.code).toEqual('ENOENT');
        expect(error.reason).toEqual(invalidName);
      }
    }
    expect(totalContent).toEqual(
      `${secretContent1}${secretContent2}${secretContent3}`,
    );
  });
});
describe('vaultsSecretsGet', () => {
  const logger = new Logger('vaultsSecretsGet test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsSecretsGet: typeof vaultsSecretsGet;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsSecretsGet: new VaultsSecretsGet({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsSecretsGet,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('fails with invalid vault name', async () => {
    const vaultName = 'test-vault';
    const secretName = 'secret';
    // Get file
    const response = await rpcClient.methods.vaultsSecretsGet({
      nameOrId: vaultName,
      secretName: secretName,
    });
    // Read response
    const consumeP = async () => {
      for await (const _ of response);
    };
    await testsUtils.expectRemoteError(
      consumeP(),
      vaultsErrors.ErrorVaultsVaultUndefined,
    );
  });
  test('gets a secret', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const secretName = 'secret';
    const secretContent = 'secret-content';
    // Write file
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName, secretContent);
      });
    });
    // Cat file
    const response = await rpcClient.methods.vaultsSecretsGet({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
    });
    // Read response
    let totalContent = '';
    for await (const data of response) {
      totalContent += data.secretContent;
    }
    expect(totalContent).toEqual(secretContent);
  });
  test('fails to read invalid secret', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const secretName = 'secret';
    // Cat file
    const response = await rpcClient.methods.vaultsSecretsGet({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
    });
    // Read response
    const consumeP = async () => {
      for await (const _ of response);
    };
    await testsUtils.expectRemoteError(
      consumeP(),
      vaultsErrors.ErrorSecretsSecretUndefined,
    );
  });
  test('fails to read a directory', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const secretName = 'secret';
    // Create a directory
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.mkdir(secretName);
      });
    });
    // Cat file
    const response = await rpcClient.methods.vaultsSecretsGet({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
    });
    // Read response
    const consumeP = async () => {
      for await (const _ of response);
    };
    await testsUtils.expectRemoteError(
      consumeP(),
      vaultsErrors.ErrorSecretsIsDirectory,
    );
  });
});
describe('vaultsSecretsNew', () => {
  const logger = new Logger('vaultsSecretsNew test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsSecretsNew: typeof vaultsSecretsNew;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsSecretsNew: new VaultsSecretsNew({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsSecretsNew,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('fails with invalid vault name', async () => {
    const vaultName = 'test-vault';
    const secretName = 'secret';
    // New file
    const responseP = rpcClient.methods.vaultsSecretsNew({
      nameOrId: vaultName,
      secretName: secretName,
      secretContent: secretName,
    });
    await testsUtils.expectRemoteError(
      responseP,
      vaultsErrors.ErrorVaultsVaultUndefined,
    );
  });
  test('creates a secret', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const secretName = 'secret';
    const secretContent = 'secret-content';
    // Create file
    await rpcClient.methods.vaultsSecretsNew({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
      secretContent: secretContent,
    });
    // Check for file
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        const fileContent = await efs.readFile(secretName);
        expect(fileContent.toString()).toEqual(secretContent);
      });
    });
  });
  test('creates nested secret', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const dirName = 'dir';
    const secretName = 'secret';
    const secretPath = path.join(dirName, secretName);
    const secretContent = 'secret-content';
    // Create file
    await rpcClient.methods.vaultsSecretsNew({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretPath,
      secretContent: secretContent,
    });
    // Check for file
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        const dirStat = await efs.stat(dirName);
        expect(dirStat.isDirectory()).toBeTruthy();
        const fileStat = await efs.stat(secretPath);
        expect(fileStat.isFile()).toBeTruthy();
        const fileContent = await efs.readFile(secretPath);
        expect(fileContent.toString()).toEqual(secretContent);
      });
    });
  });
  test('fails to create an existing secret', async () => {
    const vaultName = 'test-vault';
    const vaultId = await vaultManager.createVault(vaultName);
    const secretName = 'secret';
    const oldSecretContent = 'secret-content';
    const newSecretContent = 'new-secret-content';
    // Write file
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName, oldSecretContent);
      });
    });
    // Cat file
    const responseP = rpcClient.methods.vaultsSecretsNew({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
      secretContent: newSecretContent,
    });
    // Read response
    await testsUtils.expectRemoteError(
      responseP,
      vaultsErrors.ErrorSecretsSecretDefined,
    );
    // Confirm the file is unchanged
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        const content = await efs.readFile(secretName);
        expect(content.toString()).toEqual(oldSecretContent);
      });
    });
  });
});
describe('vaultsSecretsRemove', () => {
  const logger = new Logger('vaultsSecretsRemove test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsSecretsRemove: typeof vaultsSecretsRemove;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsSecretsRemove: new VaultsSecretsRemove({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsSecretsRemove,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('fails with invalid vault name', async () => {
    // Write paths
    const response = await rpcClient.methods.vaultsSecretsRemove();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: 'invalid', secretName: 'invalid' });
    await writer.close();
    // Read response
    const consumeP = async () => {
      for await (const _ of response.readable);
    };
    await testsUtils.expectRemoteError(
      consumeP(),
      vaultsErrors.ErrorVaultsVaultUndefined,
    );
  });
  test('fails deleting vault root', async () => {
    // Create secrets
    const secretName = 'test-secret1';
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName, secretName);
      });
    });
    // Delete secrets
    const response = await rpcClient.methods.vaultsSecretsRemove();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: vaultIdEncoded, secretName: '/' });
    await writer.close();
    for await (const data of response.readable) {
      expect(data.type).toStrictEqual('error');
      // TS cannot properly evaluate a type as nested as this, so we use the
      // as keyword to help it. Inside this block, the type of data is 'error'.
      const error = data as ErrorMessage;
      // The error code should be an invalid operation
      expect(error.code).toStrictEqual('EINVAL');
    }
    // Check
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect(await efs.exists(secretName)).toBeTruthy();
      });
    });
  });
  test('deletes multiple secrets', async () => {
    // Create secrets
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName1, secretName1);
        await efs.writeFile(secretName2, secretName2);
      });
    });
    // Delete secrets
    const response = await rpcClient.methods.vaultsSecretsRemove();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: vaultIdEncoded, secretName: secretName1 });
    await writer.write({ nameOrId: vaultIdEncoded, secretName: secretName2 });
    await writer.close();
    for await (const data of response.readable) {
      expect(data.type).toStrictEqual('success');
    }
    // Check each secret was deleted
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect(await efs.exists(secretName1)).toBeFalsy();
        expect(await efs.exists(secretName2)).toBeFalsy();
      });
    });
  });
  test('continues on error', async () => {
    // Create secrets
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const invalidName = 'invalid';
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName1, secretName1);
        await efs.writeFile(secretName2, secretName2);
      });
    });
    // Delete secrets
    const response = await rpcClient.methods.vaultsSecretsRemove();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: vaultIdEncoded, secretName: secretName1 });
    await writer.write({ nameOrId: vaultIdEncoded, secretName: invalidName });
    await writer.write({ nameOrId: vaultIdEncoded, secretName: secretName2 });
    await writer.close();
    let errorCount = 0;
    for await (const data of response.readable) {
      if (data.type === 'error') {
        // TS cannot properly evaluate a type as nested as this, so we use the
        // as keyword to help it. Inside this block, the type of data is 'error'.
        const error = data as ErrorMessage;
        // No other file name should raise this error
        expect(error.reason).toStrictEqual(invalidName);
        errorCount++;
        continue;
      }
      expect(data.type).toStrictEqual('success');
    }
    // Only one error should have happened
    expect(errorCount).toEqual(1);
    // Check each secret was deleted
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect(await efs.exists(secretName1)).toBeFalsy();
        expect(await efs.exists(secretName2)).toBeFalsy();
      });
    });
  });
  test('deletes multiple secrets in one log message', async () => {
    // Create secret
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName1, secretName1);
        await efs.writeFile(secretName2, secretName2);
      });
    });
    // Get log size
    let logLength = 0;
    await vaultManager.withVaults([vaultId], async (vault) => {
      logLength = (await vault.log()).length;
    });
    // Delete secret
    const response = await rpcClient.methods.vaultsSecretsRemove();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: vaultIdEncoded, secretName: secretName1 });
    await writer.write({ nameOrId: vaultIdEncoded, secretName: secretName2 });
    await writer.close();
    for await (const data of response.readable) {
      expect(data.type).toStrictEqual('success');
    }
    // Ensure single log message for deleting the secrets
    await vaultManager.withVaults([vaultId], async (vault) => {
      expect((await vault.log()).length).toEqual(logLength + 1);
    });
  });
  test('deletes secrets from multiple vaults', async () => {
    // Create secret
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const secretName3 = 'test-secret3';
    const vaultId1 = await vaultManager.createVault('test-vault1');
    const vaultId2 = await vaultManager.createVault('test-vault2');
    const vaultIdEncoded1 = vaultsUtils.encodeVaultId(vaultId1);
    const vaultIdEncoded2 = vaultsUtils.encodeVaultId(vaultId2);
    // Write files
    await vaultManager.withVaults(
      [vaultId1, vaultId2],
      async (vault1, vault2) => {
        await vault1.writeF(async (efs) => {
          await efs.writeFile(secretName1, secretName1);
          await efs.writeFile(secretName3, secretName3);
        });
        await vault2.writeF(async (efs) => {
          await efs.writeFile(secretName2, secretName2);
        });
      },
    );
    // Delete secret
    const response = await rpcClient.methods.vaultsSecretsRemove();
    const writer = response.writable.getWriter();
    await writer.write({ nameOrId: vaultIdEncoded1, secretName: secretName1 });
    await writer.write({ nameOrId: vaultIdEncoded2, secretName: secretName2 });
    await writer.write({ nameOrId: vaultIdEncoded1, secretName: secretName3 });
    await writer.close();
    for await (const data of response.readable) {
      expect(data.type).toStrictEqual('success');
    }
    // Ensure single log message for deleting the secrets
    await vaultManager.withVaults(
      [vaultId1, vaultId2],
      async (vault1, vault2) => {
        await vault1.readF(async (efs) => {
          expect(await efs.exists(secretName1)).toBeFalsy();
          expect(await efs.exists(secretName3)).toBeFalsy();
        });
        await vault2.readF(async (efs) => {
          expect(await efs.exists(secretName2)).toBeFalsy();
        });
      },
    );
  });
  test('should recursively delete directories', async () => {
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const dirName = 'dir';
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const secretPath1 = path.join(dirName, secretName1);
    const secretPath2 = path.join(dirName, secretName2);
    // Create secrets
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.mkdir(dirName);
        await efs.writeFile(secretPath1);
        await efs.writeFile(secretPath2);
      });
    });
    // Deleting directory with recursive set should not fail
    const response = await rpcClient.methods.vaultsSecretsRemove();
    const writer = response.writable.getWriter();
    await writer.write({
      nameOrId: vaultIdEncoded,
      secretName: dirName,
      metadata: { options: { recursive: true } },
    });
    await writer.close();
    for await (const data of response.readable) {
      expect(data.type).toStrictEqual('success');
    }
    // Check each secret and the secret directory were deleted
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect(await efs.exists(dirName)).toBeFalsy();
        expect(await efs.exists(secretPath1)).toBeFalsy();
        expect(await efs.exists(secretPath2)).toBeFalsy();
      });
    });
  });
  test('fails to delete directory without recursive', async () => {
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const dirName = 'dir';
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const secretPath1 = path.join(dirName, secretName1);
    const secretPath2 = path.join(dirName, secretName2);
    // Create secrets
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.mkdir(dirName);
        await efs.writeFile(secretPath1);
        await efs.writeFile(secretPath2);
      });
    });
    // Deleting directory with recursive set should not fail
    const response = await rpcClient.methods.vaultsSecretsRemove();
    const writer = response.writable.getWriter();
    await writer.write({
      nameOrId: vaultIdEncoded,
      secretName: dirName,
    });
    await writer.close();
    for await (const data of response.readable) {
      expect(data.type).toStrictEqual('error');
    }
    // Check each secret and the secret directory were deleted
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect(await efs.exists(dirName)).toBeTruthy();
        expect(await efs.exists(secretPath1)).toBeTruthy();
        expect(await efs.exists(secretPath2)).toBeTruthy();
      });
    });
  });
});
describe('vaultsSecretsNewDir and vaultsSecretsList', () => {
  const logger = new Logger('vaultsSecretsNewDirList test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  const fs: FileSystem = require('fs');
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsSecretsNewDir: typeof vaultsSecretsNewDir;
    vaultsSecretsList: typeof vaultsSecretsList;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsSecretsNewDir: new VaultsSecretsNewDir({
          db,
          fs,
          vaultManager,
        }),
        vaultsSecretsList: new VaultsSecretsList({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsSecretsNewDir,
        vaultsSecretsList,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('adds and lists a directory of secrets', async () => {
    // Doing the test
    // Add directory of secrets
    const vaultName = 'test-vault';
    const secretList = ['test-secret1', 'test-secret2', 'test-secret3'];
    const secretDir = path.join(dataDir, 'secretDir');
    await fs.promises.mkdir(secretDir);
    for (const secret of secretList) {
      const secretFile = path.join(secretDir, secret);
      // Write secret to file
      await fs.promises.writeFile(secretFile, secret);
    }
    const vaultId = await vaultManager.createVault(vaultName);
    const vaultsIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const addResponse = await rpcClient.methods.vaultsSecretsNewDir({
      nameOrId: vaultsIdEncoded,
      dirName: secretDir,
    });
    expect(addResponse.success).toBeTruthy();

    const noFiles = await rpcClient.methods.vaultsSecretsList({
      nameOrId: vaultsIdEncoded,
      secretName: 'doesntExist',
    });

    await expect(async () => {
      try {
        for await (const _ of noFiles);
      } catch (e) {
        throw e.cause;
      }
    }).rejects.toThrow(vaultsErrors.ErrorSecretsDirectoryUndefined);

    const secrets = await rpcClient.methods.vaultsSecretsList({
      nameOrId: vaultsIdEncoded,
      secretName: 'secretDir',
    });

    // Extract secret file paths
    const parsedFiles: Array<string> = [];
    for await (const file of secrets) {
      parsedFiles.push(file.path);
    }
    expect(parsedFiles).toIncludeAllMembers(
      secretList.map((secret) => path.join('secretDir', secret)),
    );
  });
});
describe('vaultsSecretsRename', () => {
  const logger = new Logger('vaultsSecretsRename test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  const fs: FileSystem = require('fs');
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsSecretsRename: typeof vaultsSecretsRename;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsSecretsRename: new VaultsSecretsRename({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsSecretsRename,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('renames a secret', async () => {
    const vaultName = 'test-vault';
    const secretName = 'test-secret';
    const vaultId = await vaultManager.createVault(vaultName);
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName, secretName);
      });
    });
    const response = await rpcClient.methods.vaultsSecretsRename({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
      newSecretName: 'name-change',
    });
    expect(response.success).toBeTruthy();
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect((await efs.readFile('name-change')).toString()).toStrictEqual(
          secretName,
        );
      });
    });
  });
});
describe('vaultsSecretsStat', () => {
  const logger = new Logger('vaultsSecretsStat test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  const fs: FileSystem = require('fs');
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsSecretsStat: typeof vaultsSecretsStat;
  }>;
  let vaultManager: VaultManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsSecretsStat: new VaultsSecretsStat({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsSecretsStat,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('stats a file', async () => {
    const vaultName = 'test-vault';
    const secretName = 'test-secret';
    const vaultId = await vaultManager.createVault(vaultName);
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName, secretName);
      });
    });
    const response = await rpcClient.methods.vaultsSecretsStat({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
    });
    const stat = response.stat;
    expect(stat.size).toBe(secretName.length);
    expect(stat.blksize).toBe(4096);
    expect(stat.blocks).toBe(1);
  });
});
describe('vaultsVersion', () => {
  const logger = new Logger('vaultsVersion test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  const fs: FileSystem = require('fs');
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    vaultsVersion: typeof vaultsVersion;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    vaultId = await vaultManager.createVault(vaultName);
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        vaultsVersion: new VaultsVersion({
          db,
          vaultManager,
        }),
      },
      host: localhost,
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild(WebSocketClient.name),
      port: clientService.port,
    });
    rpcClient = new RPCClient({
      manifest: {
        vaultsVersion,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await vaultManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('should switch a vault to a version', async () => {
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
    // Revert the version
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const version = rpcClient.methods.vaultsVersion({
      nameOrId: vaultIdEncoded,
      versionId: 'invalidOid',
    });
    await testsUtils.expectRemoteError(
      version,
      vaultsErrors.ErrorVaultReferenceInvalid,
    );
    const version2 = rpcClient.methods.vaultsVersion({
      nameOrId: vaultIdEncoded,
      versionId: '7660aa9a2fee90e875c2d19e5deefe882ca1d4d9',
    });
    await testsUtils.expectRemoteError(
      version2,
      vaultsErrors.ErrorVaultReferenceMissing,
    );
  });
});
