import type { TLSConfig } from '@/network/types';
import type { FileSystem } from '@/types';
import type { VaultId } from '@/ids';
import type NodeManager from '@/nodes/NodeManager';
import type {
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
  test('should edit a secret', async () => {
    const vaultName = 'test-vault';
    const secretName = 'test-secret';
    const vaultId = await vaultManager.createVault(vaultName);
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName, secretName);
      });
    });
    const response = await rpcClient.methods.vaultsSecretsWriteFile({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
      secretContent: Buffer.from('content-change').toString('binary'),
    });
    expect(response.success).toBeTruthy();
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect((await efs.readFile(secretName)).toString()).toStrictEqual(
          'content-change',
        );
      });
    });
  });
  test('should create target file with contents if it does not exist', async () => {
    const vaultName = 'test-vault';
    const secretName = 'test-secret';
    const vaultId = await vaultManager.createVault(vaultName);
    const response = await rpcClient.methods.vaultsSecretsWriteFile({
      nameOrId: vaultsUtils.encodeVaultId(vaultId),
      secretName: secretName,
      secretContent: Buffer.from('content-change').toString('binary'),
    });
    expect(response.success).toBeTruthy();
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect((await efs.readFile(secretName)).toString()).toStrictEqual(
          'content-change',
        );
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
describe('vaultsSecretsNew and vaultsSecretsDelete, vaultsSecretsGet', () => {
  const logger = new Logger('vaultsSecretsNewDeleteGet test', LogLevel.WARN, [
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
    vaultsSecretsRemove: typeof vaultsSecretsRemove;
    vaultsSecretsGet: typeof vaultsSecretsGet;
    vaultsSecretsMkdir: typeof vaultsSecretsMkdir;
    vaultsSecretsStat: typeof vaultsSecretsStat;
  }>;
  let vaultManager: VaultManager;
  // Helper function to create secrets in a vault
  const createVaultSecret = async (
    vaultId: VaultId,
    secretName: string,
    content: string,
  ) => {
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName, content);
        expect(await efs.exists(secretName)).toBeTruthy();
      });
    });
  };
  // Helper function to ensure each file path was deleted
  const checkSecretIsDeleted = async (vaultId: VaultId, secretName: string) => {
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect(await efs.exists(secretName)).toBeFalsy();
      });
    });
  };
  // Helper function to ensure each file path exists in the vault
  const checkSecretExists = async (vaultId: VaultId, secretName: string) => {
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect(await efs.exists(secretName)).toBeTruthy();
      });
    });
  };
  // Helper function to create a directory
  const createVaultDir = async (
    vaultId: VaultId,
    dirName: string,
    recursive: boolean = false,
  ) => {
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.mkdir(dirName, { recursive: recursive });
      });
    });
  };
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
        vaultsSecretsRemove: new VaultsSecretsRemove({
          db,
          vaultManager,
        }),
        vaultsSecretsGet: new VaultsSecretsGet({
          db,
          vaultManager,
        }),
        vaultsSecretsMkdir: new VaultsSecretsMkdir({
          db,
          vaultManager,
        }),
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
        vaultsSecretsNew,
        vaultsSecretsRemove,
        vaultsSecretsGet,
        vaultsSecretsMkdir,
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
  test('creates, gets, and deletes secrets', async () => {
    // Create secret
    const secretName = 'test-secret';
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const createResponse = await rpcClient.methods.vaultsSecretsNew({
      nameOrId: vaultIdEncoded,
      secretName: secretName,
      secretContent: Buffer.from(secretName).toString('binary'),
    });
    expect(createResponse.success).toBeTruthy();
    // Get secret
    const getStream = await rpcClient.methods.vaultsSecretsGet();
    const getWriter = getStream.writable.getWriter();
    await getWriter.write({
      nameOrId: vaultIdEncoded,
      secretName: secretName,
    });
    await getWriter.close();
    const secretContent: Array<string> = [];
    for await (const data of getStream.readable) {
      secretContent.push(data.secretContent);
    }
    const concatenatedContent = secretContent.join('');
    expect(concatenatedContent).toStrictEqual(secretName);
    // Delete secret
    const deleteStream = await rpcClient.methods.vaultsSecretsRemove();
    const deleteWriter = deleteStream.writable.getWriter();
    await deleteWriter.write({
      nameOrId: vaultIdEncoded,
      secretName: secretName,
    });
    await deleteWriter.close();
    expect((await deleteStream.output).success).toBeTruthy();
    // Check secret was deleted
    const deleteGetStream = await rpcClient.methods.vaultsSecretsGet();
    const deleteGetWriter = deleteGetStream.writable.getWriter();
    await deleteGetWriter.write({
      nameOrId: vaultIdEncoded,
      secretName: secretName,
    });
    await deleteGetWriter.close();
    await testsUtils.expectRemoteError(
      (async () => {
        for await (const _ of deleteGetStream.readable);
      })(),
      vaultsErrors.ErrorSecretsSecretUndefined,
    );
  });
  test('gets multiple secrets in order', async () => {
    // Create secrets
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const secretName3 = 'test-secret3';
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    await createVaultSecret(vaultId, secretName1, secretName1);
    await createVaultSecret(vaultId, secretName2, secretName2);
    await createVaultSecret(vaultId, secretName3, secretName3);
    // Get secrets
    const getStream = await rpcClient.methods.vaultsSecretsGet();
    const getWriter = getStream.writable.getWriter();
    await getWriter.write({
      nameOrId: vaultIdEncoded,
      secretName: secretName1,
    });
    await getWriter.write({
      nameOrId: vaultIdEncoded,
      secretName: secretName2,
    });
    await getWriter.write({
      nameOrId: vaultIdEncoded,
      secretName: secretName3,
    });
    await getWriter.close();
    let secretContent: string = '';
    for await (const data of getStream.readable) {
      secretContent += data.secretContent;
    }
    expect(secretContent).toStrictEqual(
      `${secretName1}${secretName2}${secretName3}`,
    );
  });
  test('should not fail to get secrets on error when continueOnError is set', async () => {
    // Create secrets
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    await createVaultSecret(vaultId, secretName1, secretName1);
    await createVaultSecret(vaultId, secretName2, secretName2);
    // Get secrets
    const getStream = await rpcClient.methods.vaultsSecretsGet();
    const getWriter = getStream.writable.getWriter();
    await getWriter.write({
      nameOrId: vaultIdEncoded,
      secretName: secretName1,
      metadata: { options: { continueOnError: true } },
    });
    await getWriter.write({ nameOrId: vaultIdEncoded, secretName: 'invalid' });
    await getWriter.write({
      nameOrId: vaultIdEncoded,
      secretName: secretName2,
    });
    await getWriter.close();
    let secretContent: string = '';
    let errorContent: string = '';
    await expect(
      (async () => {
        for await (const data of getStream.readable) {
          if (data.error) errorContent += data.error;
          else secretContent += data.secretContent;
        }
      })(),
    ).toResolve();
    expect(secretContent).toStrictEqual(`${secretName1}${secretName2}`);
    expect(errorContent.length).not.toBe(0);
  });
  test('deletes multiple secrets from the same vault', async () => {
    // Create secrets
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    await createVaultSecret(vaultId, secretName1, secretName1);
    await createVaultSecret(vaultId, secretName2, secretName2);
    // Delete secrets
    const deleteStream = await rpcClient.methods.vaultsSecretsRemove();
    const deleteWriter = deleteStream.writable.getWriter();
    await deleteWriter.write({
      nameOrId: vaultIdEncoded,
      secretName: secretName1,
    });
    await deleteWriter.write({
      nameOrId: vaultIdEncoded,
      secretName: secretName2,
    });
    await deleteWriter.close();
    expect((await deleteStream.output).success).toBeTruthy();
    // Check each secret was deleted
    await checkSecretIsDeleted(vaultId, secretName1);
    await checkSecretIsDeleted(vaultId, secretName2);
  });
  test('gets secrets from multiple vaults', async () => {
    // Create secret
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const secretName3 = 'test-secret3';
    const vaultId1 = await vaultManager.createVault('test-vault1');
    const vaultId2 = await vaultManager.createVault('test-vault2');
    const vaultIdEncoded1 = vaultsUtils.encodeVaultId(vaultId1);
    const vaultIdEncoded2 = vaultsUtils.encodeVaultId(vaultId2);
    await createVaultSecret(vaultId1, secretName1, secretName1);
    await createVaultSecret(vaultId1, secretName2, secretName2);
    await createVaultSecret(vaultId2, secretName3, secretName3);
    // Get secret
    const getStream = await rpcClient.methods.vaultsSecretsGet();
    const getWriter = getStream.writable.getWriter();
    await getWriter.write({
      nameOrId: vaultIdEncoded1,
      secretName: secretName1,
    });
    await getWriter.write({
      nameOrId: vaultIdEncoded1,
      secretName: secretName2,
    });
    await getWriter.write({
      nameOrId: vaultIdEncoded2,
      secretName: secretName3,
    });
    await getWriter.close();
    let secretContent: string = '';
    for await (const data of getStream.readable) {
      secretContent += data.secretContent;
    }
    expect(secretContent).toStrictEqual(
      `${secretName1}${secretName2}${secretName3}`,
    );
  });
  test('deletes secrets from multiple vaults in one log', async () => {
    // Create secret
    const secretName1 = 'test-secret1';
    const secretName2 = 'test-secret2';
    const secretName3 = 'test-secret3';
    const vaultId1 = await vaultManager.createVault('test-vault1');
    const vaultId2 = await vaultManager.createVault('test-vault2');
    const vaultIdEncoded1 = vaultsUtils.encodeVaultId(vaultId1);
    const vaultIdEncoded2 = vaultsUtils.encodeVaultId(vaultId2);
    await createVaultSecret(vaultId1, secretName1, secretName1);
    await createVaultSecret(vaultId1, secretName2, secretName2);
    await createVaultSecret(vaultId2, secretName3, secretName3);
    // Get log size
    let logLength1 = 0;
    let logLength2 = 0;
    await vaultManager.withVaults(
      [vaultId1, vaultId2],
      async (vault1, vault2) => {
        logLength1 = (await vault1.log()).length;
        logLength2 = (await vault2.log()).length;
      },
    );
    // Delete secret
    const deleteStream = await rpcClient.methods.vaultsSecretsRemove();
    const deleteWriter = deleteStream.writable.getWriter();
    await deleteWriter.write({
      nameOrId: vaultIdEncoded1,
      secretName: secretName1,
    });
    await deleteWriter.write({
      nameOrId: vaultIdEncoded1,
      secretName: secretName2,
    });
    await deleteWriter.write({
      nameOrId: vaultIdEncoded2,
      secretName: secretName3,
    });
    await deleteWriter.close();
    expect((await deleteStream.output).success).toBeTruthy();
    // Ensure single log message for deleting the secrets
    await vaultManager.withVaults(
      [vaultId1, vaultId2],
      async (vault1, vault2) => {
        expect((await vault1.log()).length).toEqual(logLength1 + 1);
        expect((await vault2.log()).length).toEqual(logLength2 + 1);
      },
    );
  });
  test('should recursively delete directories', async () => {
    // Create secrets
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const secretDir = 'secret-dir';
    const secretName1 = `${secretDir}/test-secret1`;
    const secretName2 = `${secretDir}/test-secret2`;
    const secretName3 = `${secretDir}/test-secret3`;
    await createVaultDir(vaultId, secretDir);
    await createVaultSecret(vaultId, secretName1, secretName1);
    await createVaultSecret(vaultId, secretName2, secretName2);
    await createVaultSecret(vaultId, secretName3, secretName3);
    // Deleting directory with recursive set should not fail
    const deleteStream = await rpcClient.methods.vaultsSecretsRemove();
    await (async () => {
      const writer = deleteStream.writable.getWriter();
      await writer.write({
        nameOrId: vaultIdEncoded,
        secretName: secretDir,
        metadata: { options: { recursive: true } },
      });
      await writer.close();
    })();
    expect((await deleteStream.output).success).toBeTruthy();
    // Check each secret and the secret directory were deleted
    await checkSecretIsDeleted(vaultId, secretName1);
    await checkSecretIsDeleted(vaultId, secretName2);
    await checkSecretIsDeleted(vaultId, secretName3);
    await testsUtils.expectRemoteError(
      rpcClient.methods.vaultsSecretsStat({
        nameOrId: vaultIdEncoded,
        secretName: secretDir,
      }),
      vaultsErrors.ErrorSecretsSecretUndefined,
    );
  });
  test('should fail to delete directory without recursive option', async () => {
    // Create secrets
    const vaultId = await vaultManager.createVault('test-vault');
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const secretDir = 'secret-dir';
    const secretName1 = `${secretDir}/test-secret1`;
    const secretName2 = `${secretDir}/test-secret2`;
    const secretName3 = `${secretDir}/test-secret3`;
    await createVaultDir(vaultId, secretDir);
    await createVaultSecret(vaultId, secretName1, secretName1);
    await createVaultSecret(vaultId, secretName2, secretName2);
    await createVaultSecret(vaultId, secretName3, secretName3);
    // Deleting directory with recursive unset should fail
    const failDeleteStream = await rpcClient.methods.vaultsSecretsRemove();
    await (async () => {
      const writer = failDeleteStream.writable.getWriter();
      await writer.write({ nameOrId: vaultIdEncoded, secretName: secretDir });
      await writer.close();
    })();
    await testsUtils.expectRemoteError(
      failDeleteStream.output,
      vaultsErrors.ErrorVaultsRecursive,
    );
    // Check each secret and the secret directory exist
    await checkSecretExists(vaultId, secretName1);
    await checkSecretExists(vaultId, secretName2);
    await checkSecretExists(vaultId, secretName3);
    await checkSecretExists(vaultId, secretDir);
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
