import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { NodeIdEncoded } from '@/ids/types';
import type { TLSConfig, Host, Port } from '@/network/types';
import type { Notification } from '@/notifications/types';
import type { NodeAddress } from '@/nodes/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { RPCClient } from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import ACL from '@/acl/ACL';
import KeyRing from '@/keys/KeyRing';
import NodeManager from '@/nodes/NodeManager';
import NodeGraph from '@/nodes/NodeGraph';
import TaskManager from '@/tasks/TaskManager';
import Sigchain from '@/sigchain/Sigchain';
import NotificationsManager from '@/notifications/NotificationsManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import ClientService from '@/client/ClientService';
import {
  NodesAdd,
  NodesClaim,
  NodesFind,
  NodesPing,
  NodesGetAll,
  NodesListConnections,
} from '@/client/handlers';
import {
  nodesAdd,
  nodesClaim,
  nodesFind,
  nodesPing,
  nodesGetAll,
  nodesListConnections,
} from '@/client/callers';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as networkUtils from '@/network/utils';
import * as validationErrors from '@/validation/errors';
import { parseNodeId } from '@/ids';
import * as testsUtils from '../../utils';

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
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    nodesAdd: typeof nodesAdd;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        nodesAdd: new NodesAdd({
          db,
          nodeManager,
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
        nodesAdd,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
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
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('adds a node', async () => {
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
    expect(result!.address).toEqual({
      host: '127.0.0.1',
      port: 11111,
      scopes: ['global'],
    });
  });
  test('cannot add invalid node', async () => {
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
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    nodesClaim: typeof nodesClaim;
  }>;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);

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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        nodesClaim: new NodesClaim({
          db,
          nodeManager,
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
        nodesClaim,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedFindGestaltInvite.mockRestore();
    mockedSendNotification.mockRestore();
    mockedClaimNode.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
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
    const response = await rpcClient.methods.nodesClaim({
      nodeIdEncoded:
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
      forceInvite: false,
    });
    expect(response.success).toBeTruthy();
  });
  test('cannot claim an invalid node', async () => {
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
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    nodesFind: typeof nodesFind;
  }>;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let sigchain: Sigchain;
  let mockedFindNode: jest.SpyInstance;
  beforeEach(async () => {
    mockedFindNode = jest
      .spyOn(NodeConnectionManager.prototype, 'findNode')
      .mockResolvedValue({
        host: '127.0.0.1' as Host,
        port: 11111 as Port,
        scopes: ['local'],
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        nodesFind: new NodesFind({
          nodeConnectionManager,
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
        nodesFind,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedFindNode.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
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
    const response = await rpcClient.methods.nodesFind({
      nodeIdEncoded:
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
    });
    const address = response.addresses.at(0);
    expect(address?.host).toBe('127.0.0.1');
    expect(address?.port).toBe(11111);
  });
  test('cannot find an invalid node', async () => {
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
  let tlsConfig: TLSConfig;
  let clientService: ClientService;
  let webSocketClient: WebSocketClient;
  let rpcClient: RPCClient<{
    nodesPing: typeof nodesPing;
  }>;
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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        nodesPing: new NodesPing({
          nodeManager,
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
        nodesPing,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedPingNode.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
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
    mockedPingNode.mockResolvedValue(false);
    const response = await rpcClient.methods.nodesPing({
      nodeIdEncoded:
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
    });
    expect(response.success).toBeFalsy();
  });
  test('pings a node (online)', async () => {
    mockedPingNode.mockResolvedValue(true);
    const response = await rpcClient.methods.nodesPing({
      nodeIdEncoded:
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
    });
    expect(response.success).toBeTruthy();
  });
  test('cannot ping an invalid node', async () => {
    await testsUtils.expectRemoteError(
      rpcClient.methods.nodesPing({
        nodeIdEncoded: 'nodeId' as NodeIdEncoded,
      }),
      validationErrors.ErrorValidation,
    );
  });
});
describe('nodesGetAll', () => {
  const logger = new Logger('nodesGetAll test', LogLevel.WARN, [
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
    nodesGetAll: typeof nodesGetAll;
  }>;
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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        nodesGetAll: new NodesGetAll({
          nodeGraph,
          keyRing,
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
        nodesGetAll,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
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
  test('gets all nodes', async () => {
    await nodeManager.setNode(
      parseNodeId(
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded,
      ),
      {
        host: networkUtils.parseHostOrHostname('127.0.0.1'),
        port: networkUtils.parsePort(1111),
      } as NodeAddress,
    );
    const values: Array<any> = [];
    const response = await rpcClient.methods.nodesGetAll({});
    for await (const respons of response) {
      values.push(respons);
    }
    expect(values[0].nodeIdEncoded).toEqual(
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
    );
  });
});
describe('nodesListConnections', () => {
  const logger = new Logger('nodesConnections test', LogLevel.WARN, [
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
    nodesListConnections: typeof nodesListConnections;
  }>;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let sigchain: Sigchain;
  let mockedConnection: jest.SpyInstance;
  beforeEach(async () => {
    mockedConnection = jest.spyOn(
      NodeConnectionManager.prototype,
      'listConnections',
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
    clientService = new ClientService({
      tlsConfig,
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        nodesListConnections: new NodesListConnections({
          nodeConnectionManager,
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
        nodesListConnections,
      },
      streamFactory: () => webSocketClient.connection.newStream(),
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
  });
  afterEach(async () => {
    mockedConnection.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await clientService.stop({ force: true });
    await webSocketClient.destroy({ force: true });
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
  test('lists all connections', async () => {
    mockedConnection.mockReturnValue([
      {
        nodeId: testsUtils.generateRandomNodeId(),
        address: {
          host: '127.0.0.1',
          port: 11111,
          hostname: undefined,
        },
        usageCount: 1,
        timeout: undefined,
      },
    ]);
    const values: Array<any> = [];
    const responses = await rpcClient.methods.nodesListConnections({});
    for await (const response of responses) {
      values.push(response);
    }
    expect(values[0].port).toEqual(11111);
  });
});
