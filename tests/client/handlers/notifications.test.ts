import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { Host, TLSConfig } from '@/network/types';
import type { General, Notification, VaultShare } from '@/notifications/types';
import type {
  VaultIdEncoded,
  NodeIdEncoded,
  NotificationIdEncoded,
} from '@/ids/types';
import type { VaultName } from '@/vaults/types';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import KeyRing from '@/keys/KeyRing';
import ClientService from '@/client/ClientService';
import ACL from '@/acl/ACL';
import Sigchain from '@/sigchain/Sigchain';
import NodeGraph from '@/nodes/NodeGraph';
import TaskManager from '@/tasks/TaskManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeManager from '@/nodes/NodeManager';
import NotificationsManager from '@/notifications/NotificationsManager';
import {
  NotificationsInboxClear,
  NotificationsOutboxClear,
  NotificationsOutboxRead,
  NotificationsOutboxRemove,
  NotificationsInboxRead,
  NotificationsInboxRemove,
  NotificationsSend,
} from '@/client/handlers';
import {
  notificationsInboxClear,
  notificationsInboxRead,
  notificationsSend,
  notificationsOutboxClear,
  notificationsOutboxRead,
  notificationsOutboxRemove,
  notificationsInboxRemove,
} from '@/client/callers';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as networkUtils from '@/network/utils';
import * as notificationsUtils from '@/notifications/utils';
import * as testsNodesUtils from '../../nodes/utils';
import * as testsUtils from '../../utils';

describe('notificationsInboxClear', () => {
  const logger = new Logger('notificationsInboxClear test', LogLevel.WARN, [
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
    notificationsInboxClear: typeof notificationsInboxClear;
  }>;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let mockedClearNotifications: jest.SpyInstance;
  beforeEach(async () => {
    mockedClearNotifications = jest
      .spyOn(NotificationsManager.prototype, 'clearInboxNotifications')
      .mockResolvedValue();
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
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      // TLS not needed for this test
      tlsConfig: {} as TLSConfig,
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTimeMin: 2000,
      connectionIdleTimeoutTimeScale: 0,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      gestaltGraph: {} as GestaltGraph,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localhost as Host,
      agentService: {} as AgentServerManifest,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        notificationsInboxClear: new NotificationsInboxClear({
          db,
          notificationsManager,
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
        notificationsInboxClear,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedClearNotifications.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await sigchain.stop();
    await acl.stop();
    await notificationsManager.stop();
    await nodeManager.stop();
    await nodeConnectionManager.stop();
    await nodeGraph.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await taskManager.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('puts/deletes/gets tokens', async () => {
    await rpcClient.methods.notificationsInboxClear({});
    expect(mockedClearNotifications.mock.calls.length).toBe(1);
  });
});
describe('notificationsInboxRead', () => {
  const logger = new Logger('notificationsInboxRead test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const generateNotificationId =
    notificationsUtils.createNotificationIdGenerator();
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  const nodeIdSender = testsNodesUtils.generateRandomNodeId();
  const nodeIdSenderEncoded = nodesUtils.encodeNodeId(nodeIdSender);
  const nodeIdReceiverEncoded = 'test';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    notificationsInboxRead: typeof notificationsInboxRead;
  }>;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let mockedReadNotifications: jest.SpyInstance;
  beforeEach(async () => {
    mockedReadNotifications = jest.spyOn(
      NotificationsManager.prototype,
      'readInboxNotifications',
    );
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
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      // TLS not needed for this test
      tlsConfig: {} as TLSConfig,
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTimeMin: 2000,
      connectionIdleTimeoutTimeScale: 0,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      gestaltGraph: {} as GestaltGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localhost as Host,
      agentService: {} as AgentServerManifest,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        notificationsInboxRead: new NotificationsInboxRead({
          db,
          notificationsManager,
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
        notificationsInboxRead,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedReadNotifications.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await acl.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('reads a single notification', async () => {
    mockedReadNotifications.mockReturnValueOnce([
      {
        notificationIdEncoded: notificationsUtils.encodeNotificationId(
          generateNotificationId(),
        ),
        typ: 'notification',
        data: {
          type: 'General',
          message: 'test',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
    ]);
    const response = await rpcClient.methods.notificationsInboxRead({
      order: 'desc',
      limit: 1,
      unread: false,
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(1);
    const notification = notificationList[0];
    expect(notification.data.type).toBe('General');
    const messageData = notification.data as General;
    expect(messageData.message).toBe('test');
    expect(notification.iss).toBe(nodeIdSenderEncoded);
    expect(notification.sub).toBe(nodeIdReceiverEncoded);
    expect(notification.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[0][0].limit).toBe(1);
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('desc');
  });
  test('reads unread notifications', async () => {
    mockedReadNotifications.mockReturnValueOnce([
      {
        notificationIdEncoded: notificationsUtils.encodeNotificationId(
          generateNotificationId(),
        ),
        typ: 'notification',
        data: {
          type: 'General',
          message: 'test1',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
      {
        typ: 'notification',
        data: {
          type: 'General',
          message: 'test2',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
    ]);
    const response = await rpcClient.methods.notificationsInboxRead({
      unread: true,
      limit: Infinity,
      order: 'desc',
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(2);
    const notification1 = notificationList[0];
    const notification2 = notificationList[1];
    expect(notification1.data.type).toBe('General');
    const messageData1 = notification1.data as General;
    expect(messageData1.message).toBe('test1');
    expect(notification1.iss).toBe(nodeIdSenderEncoded);
    expect(notification1.sub).toBe(nodeIdReceiverEncoded);
    expect(notification1.isRead).toBeTruthy();
    expect(notification2.data.type).toBe('General');
    const messageData2 = notification2.data as General;
    expect(messageData2.message).toBe('test2');
    expect(notification2.iss).toBe(nodeIdSenderEncoded);
    expect(notification2.sub).toBe(nodeIdReceiverEncoded);
    expect(notification2.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[0][0].unread).toBeTruthy();
    expect(mockedReadNotifications.mock.calls[0][0].limit).toBe(null);
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('desc');
  });
  test('reads notifications in reverse order', async () => {
    mockedReadNotifications.mockReturnValueOnce([
      {
        notificationIdEncoded: notificationsUtils.encodeNotificationId(
          generateNotificationId(),
        ),
        typ: 'notification',
        data: {
          type: 'General',
          message: 'test2',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
      {
        typ: 'notification',
        data: {
          type: 'General',
          message: 'test1',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
    ]);
    const response = await rpcClient.methods.notificationsInboxRead({
      unread: false,
      limit: Infinity,
      order: 'asc',
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(2);
    const notification1 = notificationList[0];
    const notification2 = notificationList[1];
    expect(notification1.data.type).toBe('General');
    const messageData1 = notification1.data as General;
    expect(messageData1.message).toBe('test2');
    expect(notification1.iss).toBe(nodeIdSenderEncoded);
    expect(notification1.sub).toBe(nodeIdReceiverEncoded);
    expect(notification1.isRead).toBeTruthy();
    expect(notification2.data.type).toBe('General');
    const messageData2 = notification2.data as General;
    expect(messageData2.message).toBe('test1');
    expect(notification2.iss).toBe(nodeIdSenderEncoded);
    expect(notification2.sub).toBe(nodeIdReceiverEncoded);
    expect(notification2.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[0][0].limit).toBe(null);
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('asc');
  });
  test('reads gestalt invite notifications', async () => {
    mockedReadNotifications.mockReturnValueOnce([
      {
        notificationIdEncoded: notificationsUtils.encodeNotificationId(
          generateNotificationId(),
        ),
        typ: 'notification',
        data: {
          type: 'GestaltInvite',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
    ]);
    const response = await rpcClient.methods.notificationsInboxRead({
      unread: false,
      limit: Infinity,
      order: 'asc',
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(1);
    const notification = notificationList[0];
    expect(notification.data.type).toBe('GestaltInvite');
    expect(notification.iss).toBe(nodeIdSenderEncoded);
    expect(notification.sub).toBe(nodeIdReceiverEncoded);
    expect(notification.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[0][0].limit).toBe(null);
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('asc');
  });
  test('reads vault share notifications', async () => {
    mockedReadNotifications.mockReturnValueOnce([
      {
        notificationIdEncoded: notificationsUtils.encodeNotificationId(
          generateNotificationId(),
        ),
        typ: 'notification',
        data: {
          type: 'VaultShare',
          vaultId: 'vault' as VaultIdEncoded,
          vaultName: 'vault' as VaultName,
          actions: {
            clone: null,
            pull: null,
          },
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
    ]);
    const response = await rpcClient.methods.notificationsInboxRead({
      unread: false,
      limit: Infinity,
      order: 'desc',
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(1);
    const notification = notificationList[0];
    expect(notification.data.type).toBe('VaultShare');
    const notificationData = notification.data as VaultShare;
    expect(notificationData.vaultId).toBe('vault');
    expect(notificationData.vaultName).toBe('vault');
    expect(notificationData.actions).toStrictEqual({
      clone: null,
      pull: null,
    });
    expect(notification.iss).toBe(nodeIdSenderEncoded);
    expect(notification.sub).toBe(nodeIdReceiverEncoded);
    expect(notification.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[0][0].limit).toBe(null);
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('desc');
  });
  test('reads no notifications', async () => {
    mockedReadNotifications.mockReturnValueOnce([]);
    const response = await rpcClient.methods.notificationsInboxRead({
      unread: false,
      limit: Infinity,
      order: 'desc',
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(0);
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[0][0].limit).toBe(null);
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('desc');
  });
});
describe('notificationsInboxRemove', () => {
  const logger = new Logger('notificationsInboxRemove test', LogLevel.WARN, [
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
    notificationsInboxRemove: typeof notificationsInboxRemove;
  }>;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let mockedRemoveNotification: jest.SpyInstance;
  beforeEach(async () => {
    mockedRemoveNotification = jest.spyOn(
      NotificationsManager.prototype,
      'removeInboxNotification',
    );
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
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      tlsConfig: {} as TLSConfig,
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTimeMin: 2000,
      connectionIdleTimeoutTimeScale: 0,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      gestaltGraph: {} as GestaltGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localhost as Host,
      agentService: {} as AgentServerManifest,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        notificationsInboxRemove: new NotificationsInboxRemove({
          db,
          notificationsManager,
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
        notificationsInboxRemove,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedRemoveNotification.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await acl.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('removes a notification', async () => {
    mockedRemoveNotification.mockImplementation();
    const receiverNotificationIdEncoded =
      'v0ph20eva21o0197dk3ovbl3l2o' as NotificationIdEncoded;
    await rpcClient.methods.notificationsInboxRemove({
      notificationIdEncoded: receiverNotificationIdEncoded,
    });
    expect(mockedRemoveNotification.mock.calls.length).toBe(1);
    expect(
      nodesUtils.encodeNodeId(mockedRemoveNotification.mock.calls[0][0]),
    ).toEqual(receiverNotificationIdEncoded);
  });
});
describe('notificationsOutboxClear', () => {
  const logger = new Logger('notificationsOutboxClear test', LogLevel.WARN, [
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
    notificationsOutboxClear: typeof notificationsOutboxClear;
  }>;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let mockedOutboxClearNotifications: jest.SpyInstance;
  beforeEach(async () => {
    mockedOutboxClearNotifications = jest
      .spyOn(NotificationsManager.prototype, 'clearOutboxNotifications')
      .mockResolvedValue();
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
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      // TLS not needed for this test
      tlsConfig: {} as TLSConfig,
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTimeMin: 2000,
      connectionIdleTimeoutTimeScale: 0,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      gestaltGraph: {} as GestaltGraph,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localhost as Host,
      agentService: {} as AgentServerManifest,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        notificationsOutboxClear: new NotificationsOutboxClear({
          db,
          notificationsManager,
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
        notificationsOutboxClear,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedOutboxClearNotifications.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await sigchain.stop();
    await acl.stop();
    await notificationsManager.stop();
    await nodeManager.stop();
    await nodeConnectionManager.stop();
    await nodeGraph.stop();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await taskManager.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('puts/deletes/gets tokens', async () => {
    await rpcClient.methods.notificationsOutboxClear({});
    expect(mockedOutboxClearNotifications.mock.calls.length).toBe(1);
  });
});
describe('notificationsOutboxRead', () => {
  const logger = new Logger('notificationsOutboxRead test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const generateNotificationId =
    notificationsUtils.createNotificationIdGenerator();
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  const nodeIdSender = testsNodesUtils.generateRandomNodeId();
  const nodeIdSenderEncoded = nodesUtils.encodeNodeId(nodeIdSender);
  const nodeIdReceiverEncoded = 'test';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    notificationsOutboxRead: typeof notificationsOutboxRead;
  }>;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let mockedOutboxReadNotifications: jest.SpyInstance;
  beforeEach(async () => {
    mockedOutboxReadNotifications = jest.spyOn(
      NotificationsManager.prototype,
      'readOutboxNotifications',
    );
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
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      // TLS not needed for this test
      tlsConfig: {} as TLSConfig,
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTimeMin: 2000,
      connectionIdleTimeoutTimeScale: 0,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      gestaltGraph: {} as GestaltGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localhost as Host,
      agentService: {} as AgentServerManifest,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        notificationsOutboxRead: new NotificationsOutboxRead({
          db,
          notificationsManager,
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
        notificationsOutboxRead,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedOutboxReadNotifications.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await acl.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('reads a single notification', async () => {
    mockedOutboxReadNotifications.mockReturnValueOnce([
      {
        notificationIdEncoded: notificationsUtils.encodeNotificationId(
          generateNotificationId(),
        ),
        typ: 'notification',
        data: {
          type: 'General',
          message: 'test',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
    ]);
    const response = await rpcClient.methods.notificationsOutboxRead({
      order: 'desc',
      limit: 1,
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(1);
    const notification = notificationList[0];
    expect(notification.data.type).toBe('General');
    const messageData = notification.data as General;
    expect(messageData.message).toBe('test');
    expect(notification.iss).toBe(nodeIdSenderEncoded);
    expect(notification.sub).toBe(nodeIdReceiverEncoded);
    expect(notification.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedOutboxReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedOutboxReadNotifications.mock.calls[0][0].limit).toBe(1);
    expect(mockedOutboxReadNotifications.mock.calls[0][0].order).toBe('desc');
  });
  test('reads notifications in reverse order', async () => {
    mockedOutboxReadNotifications.mockReturnValueOnce([
      {
        notificationIdEncoded: notificationsUtils.encodeNotificationId(
          generateNotificationId(),
        ),
        typ: 'notification',
        data: {
          type: 'General',
          message: 'test2',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
      {
        notificationIdEncoded: notificationsUtils.encodeNotificationId(
          generateNotificationId(),
        ),
        typ: 'notification',
        data: {
          type: 'General',
          message: 'test1',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
    ]);
    const response = await rpcClient.methods.notificationsOutboxRead({
      limit: Infinity,
      order: 'asc',
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(2);
    const notification1 = notificationList[0];
    const notification2 = notificationList[1];
    expect(notification1.data.type).toBe('General');
    const messageData1 = notification1.data as General;
    expect(messageData1.message).toBe('test2');
    expect(notification1.iss).toBe(nodeIdSenderEncoded);
    expect(notification1.sub).toBe(nodeIdReceiverEncoded);
    expect(notification1.isRead).toBeTruthy();
    expect(notification2.data.type).toBe('General');
    const messageData2 = notification2.data as General;
    expect(messageData2.message).toBe('test1');
    expect(notification2.iss).toBe(nodeIdSenderEncoded);
    expect(notification2.sub).toBe(nodeIdReceiverEncoded);
    expect(notification2.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedOutboxReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedOutboxReadNotifications.mock.calls[0][0].limit).toBe(null);
    expect(mockedOutboxReadNotifications.mock.calls[0][0].order).toBe('asc');
  });
  test('reads gestalt invite notifications', async () => {
    mockedOutboxReadNotifications.mockReturnValueOnce([
      {
        notificationIdEncoded: notificationsUtils.encodeNotificationId(
          generateNotificationId(),
        ),
        typ: 'notification',
        data: {
          type: 'GestaltInvite',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
    ]);
    const response = await rpcClient.methods.notificationsOutboxRead({
      limit: Infinity,
      order: 'desc',
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(1);
    const notification = notificationList[0];
    expect(notification.data.type).toBe('GestaltInvite');
    expect(notification.iss).toBe(nodeIdSenderEncoded);
    expect(notification.sub).toBe(nodeIdReceiverEncoded);
    expect(notification.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedOutboxReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedOutboxReadNotifications.mock.calls[0][0].limit).toBe(null);
    expect(mockedOutboxReadNotifications.mock.calls[0][0].order).toBe('desc');
  });
  test('reads vault share notifications', async () => {
    mockedOutboxReadNotifications.mockReturnValueOnce([
      {
        notificationIdEncoded: notificationsUtils.encodeNotificationId(
          generateNotificationId(),
        ),
        typ: 'notification',
        data: {
          type: 'VaultShare',
          vaultId: 'vault' as VaultIdEncoded,
          vaultName: 'vault' as VaultName,
          actions: {
            clone: null,
            pull: null,
          },
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
    ]);
    const response = await rpcClient.methods.notificationsOutboxRead({
      limit: Infinity,
      order: 'desc',
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(1);
    const notification = notificationList[0];
    expect(notification.data.type).toBe('VaultShare');
    const notificationData = notification.data as VaultShare;
    expect(notificationData.vaultId).toBe('vault');
    expect(notificationData.vaultName).toBe('vault');
    expect(notificationData.actions).toStrictEqual({
      clone: null,
      pull: null,
    });
    expect(notification.iss).toBe(nodeIdSenderEncoded);
    expect(notification.sub).toBe(nodeIdReceiverEncoded);
    expect(notification.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedOutboxReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedOutboxReadNotifications.mock.calls[0][0].limit).toBe(null);
    expect(mockedOutboxReadNotifications.mock.calls[0][0].order).toBe('desc');
  });
  test('reads no notifications', async () => {
    mockedOutboxReadNotifications.mockReturnValueOnce([]);
    const response = await rpcClient.methods.notificationsOutboxRead({
      limit: Infinity,
      order: 'desc',
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(0);
    // Check request was parsed correctly
    expect(mockedOutboxReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedOutboxReadNotifications.mock.calls[0][0].limit).toBe(null);
    expect(mockedOutboxReadNotifications.mock.calls[0][0].order).toBe('desc');
  });
});
describe('notificationsOutboxRemove', () => {
  const logger = new Logger('notificationsOutboxRemove test', LogLevel.WARN, [
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
    notificationsOutboxRemove: typeof notificationsOutboxRemove;
  }>;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let mockedRemoveOutboxNotification: jest.SpyInstance;
  beforeEach(async () => {
    mockedRemoveOutboxNotification = jest.spyOn(
      NotificationsManager.prototype,
      'removeOutboxNotification',
    );
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
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      tlsConfig: {} as TLSConfig,
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTimeMin: 2000,
      connectionIdleTimeoutTimeScale: 0,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      gestaltGraph: {} as GestaltGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localhost as Host,
      agentService: {} as AgentServerManifest,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        notificationsOutboxRemove: new NotificationsOutboxRemove({
          db,
          notificationsManager,
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
        notificationsOutboxRemove,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedRemoveOutboxNotification.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await acl.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('removes a notification', async () => {
    mockedRemoveOutboxNotification.mockImplementation();
    const receiverNotificationIdEncoded =
      'v0ph20eva21o0197dk3ovbl3l2o' as NotificationIdEncoded;
    await rpcClient.methods.notificationsOutboxRemove({
      notificationIdEncoded: receiverNotificationIdEncoded,
    });
    expect(mockedRemoveOutboxNotification.mock.calls.length).toBe(1);
    expect(
      nodesUtils.encodeNodeId(mockedRemoveOutboxNotification.mock.calls[0][0]),
    ).toEqual(receiverNotificationIdEncoded);
  });
});
describe('notificationsSend', () => {
  const logger = new Logger('notificationsSend test', LogLevel.WARN, [
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
    notificationsSend: typeof notificationsSend;
  }>;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let mockedSendNotification: jest.SpyInstance;
  beforeEach(async () => {
    mockedSendNotification = jest.spyOn(NodeManager.prototype, 'withConnF');
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
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      tlsConfig: {} as TLSConfig,
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTimeMin: 2000,
      connectionIdleTimeoutTimeScale: 0,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      gestaltGraph: {} as GestaltGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localhost as Host,
      agentService: {} as AgentServerManifest,
    });
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        notificationsSend: new NotificationsSend({
          notificationsManager,
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
        notificationsSend,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedSendNotification.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await acl.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('sends a notification', async () => {
    mockedSendNotification.mockImplementation();
    const receiverNodeIdEncoded =
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded;
    await rpcClient.methods.notificationsSend({
      nodeIdEncoded: receiverNodeIdEncoded,
      message: 'test',
      blocking: true,
      retries: 0,
    });
    // Check we signed and sent the notification
    expect(mockedSendNotification.mock.calls.length).toBe(1);
    expect(
      nodesUtils.encodeNodeId(mockedSendNotification.mock.calls[0][0]),
    ).toEqual(receiverNodeIdEncoded);
  });
});
