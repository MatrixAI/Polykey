import type { TLSConfig } from '@/network/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { NodeIdEncoded } from '@/ids';
import type { Notification } from '@/notifications/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/RPC/RPCServer';
import { nodesClaim, NodesClaimHandler } from '@/client/handlers/nodesClaim';
import RPCClient from '@/RPC/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import * as validationErrors from '@/validation/errors';
import * as testsUtils from '../../utils';
import ACL from '../../../src/acl/ACL';
import Proxy from '../../../src/network/Proxy';
import NodeGraph from '../../../src/nodes/NodeGraph';
import TaskManager from '../../../src/tasks/TaskManager';
import NodeConnectionManager from '../../../src/nodes/NodeConnectionManager';
import NodeManager from '../../../src/nodes/NodeManager';
import NotificationsManager from '../../../src/notifications/NotificationsManager';
import * as testUtils from '../../utils';
import Sigchain from '../../../src/sigchain/Sigchain';

describe('nodesClaim', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  const authToken = 'abc123';
  const dummyNotification: Notification = {
    typ: 'notification',
    data: {
      type: 'GestaltInvite',
    },
    iss: 'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg' as NodeIdEncoded,
    sub: 'test' as NodeIdEncoded,
    isRead: false,
  };
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
  let mockedFindGestaltInvite: jest.SpyInstance;
  let mockedSendNotification: jest.SpyInstance;
  let mockedClaimNode: jest.SpyInstance;

  beforeEach(async () => {
    mockedFindGestaltInvite = jest
      .spyOn(NotificationsManager.prototype, 'findGestaltInvite')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue(dummyNotification);
    mockedSendNotification = jest
      .spyOn(NotificationsManager.prototype, 'sendNotification')
      .mockResolvedValue(undefined);
    mockedClaimNode = jest
      .spyOn(NodeManager.prototype, 'claimNode')
      .mockResolvedValue(undefined);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);

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
      gestaltGraph: {} as GestaltGraph,
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
  });
  afterEach(async () => {
    mockedFindGestaltInvite.mockRestore();
    mockedSendNotification.mockRestore();
    mockedClaimNode.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await nodeGraph.stop();
    await notificationsManager.stop();
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
  test('claims a node', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        nodesClaim: new NodesClaimHandler({
          db,
          nodeManager,
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
        nodesClaim,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const response = await rpcClient.methods.nodesClaim({
      nodeIdEncoded:
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
      forceInvite: false,
    });
    expect(response.success).toBeTruthy();
  });
  test('cannot claim an invalid node', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        nodesClaim: new NodesClaimHandler({
          db,
          nodeManager,
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
        nodesClaim,
      },
      streamPairCreateCallback: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await testUtils.expectRemoteError(
      rpcClient.methods.nodesClaim({
        nodeIdEncoded: 'nodeId' as NodeIdEncoded,
      }),
      validationErrors.ErrorValidation,
    );
  });
});
