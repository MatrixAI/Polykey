import type { Host, TLSConfig } from '@/network/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { General, Notification, VaultShare } from '@/notifications/types';
import type { VaultIdEncoded } from '@/ids/types';
import type { VaultName } from '@/vaults/types';
import type { NodeIdEncoded } from '@/ids/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import { NotificationsClearHandler } from '@/client/handlers/notificationsClear';
import {
  notificationsClear,
  notificationsRead,
  NotificationsReadHandler,
  notificationsSend,
  NotificationsSendHandler,
} from '@/client';
import ClientService from '@/client/ClientService';
import * as nodesUtils from '@/nodes/utils';
import ACL from '@/acl/ACL';
import Sigchain from '@/sigchain/Sigchain';
import NodeGraph from '@/nodes/NodeGraph';
import TaskManager from '@/tasks/TaskManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeManager from '@/nodes/NodeManager';
import NotificationsManager from '@/notifications/NotificationsManager';
import * as networkUtils from '@/network/utils';
import * as tlsTestsUtils from '../../utils/tls';
import * as testNodesUtils from '../../nodes/utils';

describe('notificationsClear', () => {
  const logger = new Logger('notificationsClear test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
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
      .spyOn(NotificationsManager.prototype, 'clearNotifications')
      .mockResolvedValue();
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
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
      nodeGraph,
      // TLS not needed for this test
      tlsConfig: {} as TLSConfig,
      options: {
        connectionConnectTimeoutTime: 2000,
        connectionIdleTimeoutTime: 2000,
      },
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
    await nodeConnectionManager.start({ host: localhost as Host });
    await taskManager.startProcessing();
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyRing,
        logger,
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        notificationsClear: new NotificationsClearHandler({
          db,
          notificationsManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },

      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = new RPCClient({
      manifest: {
        notificationsClear,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await rpcClient.methods.notificationsClear({});
    expect(mockedClearNotifications.mock.calls.length).toBe(1);
  });
});
describe('notificationsRead', () => {
  const logger = new Logger('notificationsRead test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  const nodeIdSender = testNodesUtils.generateRandomNodeId();
  const nodeIdSenderEncoded = nodesUtils.encodeNodeId(nodeIdSender);
  const nodeIdReceiverEncoded = 'test';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
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
      'readNotifications',
    );
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
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
      nodeGraph,
      // TLS not needed for this test
      tlsConfig: {} as TLSConfig,
      options: {
        connectionConnectTimeoutTime: 2000,
        connectionIdleTimeoutTime: 2000,
      },
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
    await nodeConnectionManager.start({ host: localhost as Host });
    await taskManager.start();
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyRing,
        logger,
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = new RPCClient({
      manifest: {
        notificationsRead,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    mockedReadNotifications.mockResolvedValueOnce([
      {
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
    const response = await rpcClient.methods.notificationsRead({
      order: 'newest',
      number: 1,
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
    expect(mockedReadNotifications.mock.calls[0][0].number).toBe(1);
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('newest');
  });
  test('reads unread notifications', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = new RPCClient({
      manifest: {
        notificationsRead,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    mockedReadNotifications.mockResolvedValueOnce([
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
    const response = await rpcClient.methods.notificationsRead({
      unread: true,
      number: 'all',
      order: 'newest',
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
    expect(mockedReadNotifications.mock.calls[0][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('newest');
  });
  test('reads notifications in reverse order', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = new RPCClient({
      manifest: {
        notificationsRead,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    mockedReadNotifications.mockResolvedValueOnce([
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
    const response = await rpcClient.methods.notificationsRead({
      unread: false,
      number: 'all',
      order: 'oldest',
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
    expect(mockedReadNotifications.mock.calls[0][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('oldest');
  });
  test('reads gestalt invite notifications', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = new RPCClient({
      manifest: {
        notificationsRead,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    mockedReadNotifications.mockResolvedValueOnce([
      {
        typ: 'notification',
        data: {
          type: 'GestaltInvite',
        },
        iss: nodeIdSenderEncoded,
        sub: nodeIdReceiverEncoded,
        isRead: true,
      },
    ]);
    const response = await rpcClient.methods.notificationsRead({
      unread: false,
      number: 'all',
      order: 'newest',
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
    expect(mockedReadNotifications.mock.calls[0][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('newest');
  });
  test('reads vault share notifications', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = new RPCClient({
      manifest: {
        notificationsRead,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    mockedReadNotifications.mockResolvedValueOnce([
      {
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
    const response = await rpcClient.methods.notificationsRead({
      unread: false,
      number: 'all',
      order: 'newest',
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
    expect(mockedReadNotifications.mock.calls[0][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('newest');
  });
  test('reads no notifications', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = new RPCClient({
      manifest: {
        notificationsRead,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    mockedReadNotifications.mockResolvedValueOnce([]);
    const response = await rpcClient.methods.notificationsRead({
      unread: false,
      number: 'all',
      order: 'newest',
    });
    const notificationList: Array<Notification> = [];
    for await (const notificationMessage of response) {
      notificationList.push(notificationMessage.notification);
    }
    expect(notificationList).toHaveLength(0);
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[0][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('newest');
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
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let mockedSendNotification: jest.SpyInstance;

  beforeEach(async () => {
    mockedSendNotification = jest.spyOn(
      NodeConnectionManager.prototype,
      'withConnF',
    );
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger,
    });
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
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
      nodeGraph,
      tlsConfig: {} as TLSConfig,
      options: {
        connectionConnectTimeoutTime: 2000,
        connectionIdleTimeoutTime: 2000,
      },
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
    await nodeConnectionManager.start({ host: localhost as Host });
    await taskManager.start();
    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyRing,
        logger,
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
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        notificationsSend: new NotificationsSendHandler({
          notificationsManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = new RPCClient({
      manifest: {
        notificationsSend,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    mockedSendNotification.mockImplementation();
    const receiverNodeIdEncoded =
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded;
    await rpcClient.methods.notificationsSend({
      nodeIdEncoded: receiverNodeIdEncoded,
      message: 'test',
    });
    // Check we signed and sent the notification
    expect(mockedSendNotification.mock.calls.length).toBe(1);
    expect(
      nodesUtils.encodeNodeId(mockedSendNotification.mock.calls[0][0]),
    ).toEqual(receiverNodeIdEncoded);
  });
});
