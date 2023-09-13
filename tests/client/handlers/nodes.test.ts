import type { TLSConfig } from '@/network/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { NodeIdEncoded } from '@/ids/types';
import type { Host, Port } from '@/network/types';
import type { Notification } from '@/notifications/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import { NodesAddHandler } from '@/client/handlers/nodesAdd';
import RPCClient from '@/rpc/RPCClient';
import WebSocketClient from '@/websockets/WebSocketClient';
import * as nodesUtils from '@/nodes/utils';
import NodeManager from '@/nodes/NodeManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import * as validationErrors from '@/validation/errors';
import {
  nodesAdd,
  nodesClaim,
  NodesClaimHandler,
  nodesFind,
  NodesFindHandler,
  nodesPing,
  NodesPingHandler,
} from '@/client';
import TaskManager from '@/tasks/TaskManager';
import Sigchain from '@/sigchain/Sigchain';
import NotificationsManager from '@/notifications/NotificationsManager';
import ACL from '@/acl/ACL';
import ClientService from '@/client/ClientService';
import * as tlsTestsUtils from '../../utils/tls';
import * as testsUtils from '../../utils/utils';

describe('nodesAdd', () => {
  const logger = new Logger('nodesAdd test', LogLevel.WARN, [
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
  let sigchain: Sigchain;

  beforeEach(async () => {
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
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
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
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTime: 2000,
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
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await sigchain.stop();
    await db.stop();
    await keyRing.stop();
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('adds a node', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        nodesAdd: new NodesAddHandler({
          db,
          nodeManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        nodesAdd,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await rpcClient.methods.nodesAdd({
      nodeIdEncoded:
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
      host: '127.0.0.1',
      port: 11111,
      ping: false,
      force: false,
    });
    const result = await nodeGraph.getNode(
      nodesUtils.decodeNodeId(
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
      )!,
    );
    expect(result).toBeDefined();
    expect(result!.address).toEqual({ host: '127.0.0.1', port: 11111 });
  });
  test('cannot add invalid node', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        nodesAdd: new NodesAddHandler({
          db,
          nodeManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        nodesAdd,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test

    // Invalid host
    await testsUtils.expectRemoteError(
      rpcClient.methods.nodesAdd({
        nodeIdEncoded:
          'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
        host: '',
        port: 11111,
        ping: false,
        force: false,
      }),
      validationErrors.ErrorValidation,
    );
    // Invalid port
    await testsUtils.expectRemoteError(
      rpcClient.methods.nodesAdd({
        nodeIdEncoded:
          'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
        host: '127.0.0.1',
        port: 111111,
        ping: false,
        force: false,
      }),
      validationErrors.ErrorValidation,
    );
    // Invalid nodeid
    await testsUtils.expectRemoteError(
      rpcClient.methods.nodesAdd({
        nodeIdEncoded: 'nodeId' as NodeIdEncoded,
        host: '127.0.0.1',
        port: 11111,
        ping: false,
        force: false,
      }),
      validationErrors.ErrorValidation,
    );
  });
});
describe('nodesClaim', () => {
  const logger = new Logger('nodesClaim test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
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
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let notificationsManager: NotificationsManager;
  let acl: ACL;
  let sigchain: Sigchain;
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
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);

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
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTime: 2000,
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
    mockedFindGestaltInvite.mockRestore();
    mockedSendNotification.mockRestore();
    mockedClaimNode.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await nodeGraph.stop();
    await notificationsManager.stop();
    await sigchain.stop();
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
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        nodesClaim: new NodesClaimHandler({
          db,
          nodeManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        nodesClaim,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
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
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        nodesClaim: new NodesClaimHandler({
          db,
          nodeManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        nodesClaim,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await testsUtils.expectRemoteError(
      rpcClient.methods.nodesClaim({
        nodeIdEncoded: 'nodeId' as NodeIdEncoded,
      }),
      validationErrors.ErrorValidation,
    );
  });
});
describe('nodesFind', () => {
  const logger = new Logger('nodesFind test', LogLevel.WARN, [
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
  let sigchain: Sigchain;
  let mockedFindNode: jest.SpyInstance;

  beforeEach(async () => {
    mockedFindNode = jest
      .spyOn(NodeConnectionManager.prototype, 'findNode')
      .mockResolvedValue({
        host: localhost as Host,
        port: 11111 as Port,
      });
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
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
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
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    await nodeConnectionManager.start({ host: localhost as Host });
    await taskManager.startProcessing();
  });
  afterEach(async () => {
    mockedFindNode.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('finds a node', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        nodesFind: new NodesFindHandler({
          nodeConnectionManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        nodesFind,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const response = await rpcClient.methods.nodesFind({
      nodeIdEncoded:
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
    });
    expect(response.host).toBe('127.0.0.1');
    expect(response.port).toBe(11111);
  });
  test('cannot find an invalid node', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        nodesFind: new NodesFindHandler({
          nodeConnectionManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        nodesFind,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await testsUtils.expectRemoteError(
      rpcClient.methods.nodesFind({
        nodeIdEncoded: 'nodeId' as NodeIdEncoded,
      }),
      validationErrors.ErrorValidation,
    );
  });
});
describe('nodesPing', () => {
  const logger = new Logger('nodesPing test', LogLevel.WARN, [
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
  let sigchain: Sigchain;
  let mockedPingNode: jest.SpyInstance;

  beforeEach(async () => {
    mockedPingNode = jest.spyOn(NodeManager.prototype, 'pingNode');
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
      connectionConnectTimeoutTime: 2000,
      connectionIdleTimeoutTime: 2000,
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
    await nodeConnectionManager.start({ host: localhost as Host });
    await taskManager.startProcessing();
  });
  afterEach(async () => {
    mockedPingNode.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('pings a node (offline)', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        nodesPing: new NodesPingHandler({
          nodeManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        nodesPing,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    mockedPingNode.mockResolvedValue(false);
    const response = await rpcClient.methods.nodesPing({
      nodeIdEncoded:
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
    });
    expect(response.success).toBeFalsy();
  });
  test('pings a node (online)', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        nodesPing: new NodesPingHandler({
          nodeManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        nodesPing,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    mockedPingNode.mockResolvedValue(true);
    const response = await rpcClient.methods.nodesPing({
      nodeIdEncoded:
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
    });
    expect(response.success).toBeTruthy();
  });
  test('cannot ping an invalid node', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        nodesPing: new NodesPingHandler({
          nodeManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        nodesPing,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await testsUtils.expectRemoteError(
      rpcClient.methods.nodesPing({
        nodeIdEncoded: 'nodeId' as NodeIdEncoded,
      }),
      validationErrors.ErrorValidation,
    );
  });
});
