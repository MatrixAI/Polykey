import type { Host, Port } from '@/network/types';
import type { SignedNotification } from '@/notifications/types';
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
import notificationsSend from '@/client/service/notificationsSend';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as notificationsPB from '@/proto/js/polykey/v1/notifications/notifications_pb';
import * as nodesUtils from '@/nodes/utils';
import * as notificationsUtils from '@/notifications/utils';
import * as clientUtils from '@/client/utils';
import * as keysUtils from '@/keys/utils/index';
import { CertificatePEMChain } from '@/keys/types';
import * as testsUtils from '../../utils/index';

describe('notificationsSend', () => {
  const logger = new Logger('notificationsSend test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedSignNotification: jest.SpyInstance;
  let mockedSendNotification: jest.SpyInstance;
  beforeAll(async () => {
    mockedSignNotification = jest
      .spyOn(notificationsUtils, 'signNotification')
      .mockImplementation(async () => {
        return 'signedNotification' as SignedNotification;
      });
    mockedSendNotification = jest
      .spyOn(NodeConnectionManager.prototype, 'withConnF')
      .mockImplementation();
  });
  afterAll(async () => {
    mockedSignNotification.mockRestore();
    mockedSendNotification.mockRestore();
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
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({ nodeManager });
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
    const clientService = {
      notificationsSend: notificationsSend({
        authenticate,
        notificationsManager,
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
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await sigchain.stop();
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
    const receiverNodeIdEncoded =
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0';
    const generalMessage = new notificationsPB.General();
    generalMessage.setMessage('test');
    const request = new notificationsPB.Send();
    request.setData(generalMessage);
    request.setReceiverId(receiverNodeIdEncoded);
    const response = await grpcClient.notificationsSend(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    // Check we signed and sent the notification
    expect(mockedSignNotification.mock.calls.length).toBe(1);
    expect(mockedSendNotification.mock.calls.length).toBe(1);
    expect(
      nodesUtils.encodeNodeId(mockedSendNotification.mock.calls[0][0]),
    ).toEqual(receiverNodeIdEncoded);
    // Check notification content
    expect(mockedSignNotification.mock.calls[0][0]).toEqual({
      data: {
        type: 'General',
        message: 'test',
      },
      senderId: nodesUtils.encodeNodeId(keyRing.getNodeId()),
      isRead: false,
    });
  });
});
