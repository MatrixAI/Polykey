import type { TLSConfig } from '@/network/types';
import type GestaltGraph from '../../../src/gestalts/GestaltGraph';
import type { General, Notification, VaultShare } from '@/notifications/types';
import type { VaultIdEncoded } from '@/ids';
import type { VaultName } from '@/vaults/types';
import type { Host as QUICHost } from '@matrixai/quic/dist/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { QUICSocket } from '@matrixai/quic';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import { NotificationsReadHandler } from '@/client/handlers/notificationsRead';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import * as nodesUtils from '@/nodes/utils';
import { notificationsRead } from '@/client';
import * as tlsTestsUtils from '../../utils/tls';
import NodeGraph from '../../../src/nodes/NodeGraph';
import TaskManager from '../../../src/tasks/TaskManager';
import NodeConnectionManager from '../../../src/nodes/NodeConnectionManager';
import NodeManager from '../../../src/nodes/NodeManager';
import NotificationsManager from '../../../src/notifications/NotificationsManager';
import ACL from '../../../src/acl/ACL';
import Sigchain from '../../../src/sigchain/Sigchain';
import * as testNodesUtils from '../../nodes/utils';

describe('identitiesTokenPutDeleteGet', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  const nodeIdSender = testNodesUtils.generateRandomNodeId();
  const nodeIdSenderEncoded = nodesUtils.encodeNodeId(nodeIdSender);
  const nodeIdReceiverEncoded = 'test';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
  let tlsConfig: TLSConfig;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let quicSocket: QUICSocket;
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
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
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
    const crypto = tlsTestsUtils.createCrypto();
    quicSocket = new QUICSocket({
      crypto,
      logger,
    });
    await quicSocket.start({
      host: '127.0.0.1' as QUICHost,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      quicClientConfig: {
        crypto,
        config: {
          verifyPeer: false,
        },
      },
      quicSocket,
      connConnectTime: 2000,
      connTimeoutTime: 2000,
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
    await nodeConnectionManager.start({ nodeManager });
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
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await quicSocket.stop();
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
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
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
        notificationsRead,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
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
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
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
        notificationsRead,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
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
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
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
        notificationsRead,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
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
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
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
        notificationsRead,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
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
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
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
        notificationsRead,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
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
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        notificationsRead: new NotificationsReadHandler({
          db,
          notificationsManager,
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
        notificationsRead,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
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
