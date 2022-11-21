import type { Host, Port } from '@/network/types';
import type { VaultIdEncoded, VaultName } from '@/vaults/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import { DB } from '@matrixai/db';
import TaskManager from '@/tasks/TaskManager';
import KeyRing from '@/keys/KeyRing';
import GRPCServer from '@/grpc/GRPCServer';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import Sigchain from '@/sigchain/Sigchain';
import Proxy from '@/network/Proxy';
import NotificationsManager from '@/notifications/NotificationsManager';
import ACL from '@/acl/ACL';
import GRPCClientClient from '@/client/GRPCClientClient';
import notificationsRead from '@/client/service/notificationsRead';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as notificationsPB from '@/proto/js/polykey/v1/notifications/notifications_pb';
import * as nodesUtils from '@/nodes/utils';
import * as clientUtils from '@/client/utils';
import * as keysUtils from '@/keys/utils/index';
import * as testNodesUtils from '../../nodes/utils';
import * as testsUtils from '../../utils/index';

describe('notificationsRead', () => {
  const logger = new Logger('notificationsRead test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const nodeIdSender = testNodesUtils.generateRandomNodeId();
  const nodeIdSenderEncoded = nodesUtils.encodeNodeId(nodeIdSender);
  const nodeIdReceiverEncoded = 'test';
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedReadNotifications: jest.SpyInstance;
  beforeAll(async () => {
    mockedReadNotifications = jest
      .spyOn(NotificationsManager.prototype, 'readNotifications')
      .mockResolvedValueOnce([
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
      ])
      .mockResolvedValueOnce([
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
      ])
      .mockResolvedValueOnce([
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
      ])
      .mockResolvedValueOnce([
        {
          typ: 'notification',
          data: {
            type: 'GestaltInvite',
          },
          iss: nodeIdSenderEncoded,
          sub: nodeIdReceiverEncoded,
          isRead: true,
        },
      ])
      .mockResolvedValueOnce([
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
      ])
      .mockResolvedValueOnce([]);
  });
  afterAll(async () => {
    mockedReadNotifications.mockRestore();
  });
  const authToken = 'abc123';
  let dataDir: string;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
  let proxy: Proxy;

  let db: DB;
  let keyRing: KeyRing;
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
    const clientService = {
      notificationsRead: notificationsRead({
        authenticate,
        notificationsManager,
        logger,
        db,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[ClientServiceService, clientService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: keyRing.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await grpcClient.destroy();
    await grpcServer.stop();
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
  test('reads a single notification', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(false);
    request.setNumber('1');
    request.setOrder('newest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(1);
    const notification = JSON.parse(output[0].getContent());
    expect(notification.data.type).toBe('General');
    expect(notification.data.message).toBe('test');
    expect(notification.iss).toBe(nodeIdSenderEncoded);
    expect(notification.sub).toBe(nodeIdReceiverEncoded);
    expect(notification.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[0][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[0][0].number).toBe(1);
    expect(mockedReadNotifications.mock.calls[0][0].order).toBe('newest');
  });
  test('reads unread notifications', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(true);
    request.setNumber('all');
    request.setOrder('newest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(2);
    const notification1 = JSON.parse(output[0].getContent());
    const notification2 = JSON.parse(output[1].getContent());
    expect(notification1.data.type).toBe('General');
    expect(notification1.data.message).toBe('test1');
    expect(notification1.iss).toBe(nodeIdSenderEncoded);
    expect(notification1.sub).toBe(nodeIdReceiverEncoded);
    expect(notification1.isRead).toBeTruthy();
    expect(notification2.data.type).toBe('General');
    expect(notification2.data.message).toBe('test2');
    expect(notification2.iss).toBe(nodeIdSenderEncoded);
    expect(notification2.sub).toBe(nodeIdReceiverEncoded);
    expect(notification2.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[1][0].unread).toBeTruthy();
    expect(mockedReadNotifications.mock.calls[1][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[1][0].order).toBe('newest');
  });
  test('reads notifications in reverse order', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(false);
    request.setNumber('all');
    request.setOrder('oldest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(2);
    const notification1 = JSON.parse(output[0].getContent());
    const notification2 = JSON.parse(output[1].getContent());
    expect(notification1.data.type).toBe('General');
    expect(notification1.data.message).toBe('test2');
    expect(notification1.iss).toBe(nodeIdSenderEncoded);
    expect(notification1.sub).toBe(nodeIdReceiverEncoded);
    expect(notification1.isRead).toBeTruthy();
    expect(notification2.data.type).toBe('General');
    expect(notification2.data.message).toBe('test1');
    expect(notification2.iss).toBe(nodeIdSenderEncoded);
    expect(notification2.sub).toBe(nodeIdReceiverEncoded);
    expect(notification2.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[2][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[2][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[2][0].order).toBe('oldest');
  });
  test('reads gestalt invite notifications', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(false);
    request.setNumber('all');
    request.setOrder('newest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(1);
    const notification = JSON.parse(output[0].getContent());
    expect(notification.data.type).toBe('GestaltInvite');
    expect(notification.iss).toBe(nodeIdSenderEncoded);
    expect(notification.sub).toBe(nodeIdReceiverEncoded);
    expect(notification.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[3][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[3][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[3][0].order).toBe('newest');
  });
  test('reads vault share notifications', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(false);
    request.setNumber('all');
    request.setOrder('newest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(1);
    const notification = JSON.parse(output[0].getContent());
    expect(notification.data.type).toBe('VaultShare');
    expect(notification.data.vaultId).toBe('vault');
    expect(notification.data.vaultName).toBe('vault');
    expect(notification.data.actions).toStrictEqual({
      clone: null,
      pull: null,
    });
    expect(notification.iss).toBe(nodeIdSenderEncoded);
    expect(notification.sub).toBe(nodeIdReceiverEncoded);
    expect(notification.isRead).toBeTruthy();
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[4][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[4][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[4][0].order).toBe('newest');
  });
  test('reads no notifications', async () => {
    const request = new notificationsPB.Read();
    request.setUnread(false);
    request.setNumber('all');
    request.setOrder('newest');
    const response = await grpcClient.notificationsRead(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(notificationsPB.List);
    const output = response.getNotificationList();
    expect(output).toHaveLength(0);
    // Check request was parsed correctly
    expect(mockedReadNotifications.mock.calls[5][0].unread).toBeFalsy();
    expect(mockedReadNotifications.mock.calls[5][0].number).toBe('all');
    expect(mockedReadNotifications.mock.calls[5][0].order).toBe('newest');
  });
});
