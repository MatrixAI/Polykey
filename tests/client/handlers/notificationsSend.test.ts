import type { TLSConfig } from '@/network/types';
import type GestaltGraph from '../../../src/gestalts/GestaltGraph';
import type { Host, Port } from '@/network/types';
import type { SignedNotification } from '@/notifications/types';
import type { NodeIdEncoded } from '@/ids/index';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import {
  notificationsSend,
  NotificationsSendHandler,
} from '@/client/handlers/notificationsSend';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import * as nodesUtils from '@/nodes/utils';
import * as notificationsUtils from '@/notifications/utils';
import * as testsUtils from '../../utils';
import NodeGraph from '../../../src/nodes/NodeGraph';
import TaskManager from '../../../src/tasks/TaskManager';
import NodeConnectionManager from '../../../src/nodes/NodeConnectionManager';
import NodeManager from '../../../src/nodes/NodeManager';
import NotificationsManager from '../../../src/notifications/NotificationsManager';
import ACL from '../../../src/acl/ACL';
import Sigchain from '../../../src/sigchain/Sigchain';
import Proxy from '../../../src/network/Proxy';

describe('notificationsSend', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  const authToken = 'abc123';
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
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let proxy: Proxy;
  let mockedSignNotification: jest.SpyInstance;
  let mockedSendNotification: jest.SpyInstance;

  beforeEach(async () => {
    mockedSignNotification = jest.spyOn(
      notificationsUtils,
      'generateNotification',
    );
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
    proxy = new Proxy({
      authToken,
      logger,
    });
    await proxy.start({
      tlsConfig: await testsUtils.createTLSConfig(keyRing.keyPair),
      serverHost: '127.0.0.1' as Host,
      serverPort: 0 as Port,
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
      proxy,
      taskManager,
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
    mockedSignNotification.mockRestore();
    mockedSendNotification.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
    await notificationsManager.stop();
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await proxy.stop();
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
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        notificationsSend: new NotificationsSendHandler({
          notificationsManager,
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
        notificationsSend,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    mockedSignNotification.mockImplementation(async () => {
      return 'signedNotification' as SignedNotification;
    });
    mockedSendNotification.mockImplementation();
    const receiverNodeIdEncoded =
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded;
    await rpcClient.methods.notificationsSend({
      nodeIdEncoded: receiverNodeIdEncoded,
      message: 'test',
    });
    // Check we signed and sent the notification
    expect(mockedSignNotification.mock.calls.length).toBe(1);
    expect(mockedSendNotification.mock.calls.length).toBe(1);
    expect(
      nodesUtils.encodeNodeId(mockedSendNotification.mock.calls[0][0]),
    ).toEqual(receiverNodeIdEncoded);
    // Check notification content
    expect(mockedSignNotification.mock.calls[0][0]).toEqual({
      typ: 'notification',
      data: {
        type: 'General',
        message: 'test',
      },
      iss: nodesUtils.encodeNodeId(keyRing.getNodeId()),
      sub: receiverNodeIdEncoded,
      isRead: false,
    });
  });
});
