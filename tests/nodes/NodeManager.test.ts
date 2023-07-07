import type { NodeAddress } from '@/nodes/types';
import type { Host, Port, TLSConfig } from '@/network/types';
import type { Host as QUICHost } from '@matrixai/quic/dist/types';
import type { Task } from '@/tasks/types';
import path from 'path';
import { DB } from '@matrixai/db';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICSocket } from '@matrixai/quic';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import * as keysUtils from '@/keys/utils';
import NodeManager from '@/nodes/NodeManager';
import Sigchain from '@/sigchain/Sigchain';
import KeyRing from '@/keys/KeyRing';
import ACL from '@/acl/ACL';
import GestaltGraph from '@/gestalts/GestaltGraph';
import NodeGraph from '@/nodes/NodeGraph';
import TaskManager from '@/tasks/TaskManager';
import NodeConnection from '@/nodes/NodeConnection';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import { never, promise, sleep } from '@/utils';
import * as nodesUtils from '@/nodes/utils';
import PolykeyAgent from '@/PolykeyAgent';
import * as testNodesUtils from './utils';
import * as nodesTestUtils from '../nodes/utils';
import * as tlsTestUtils from '../utils/tls';

describe(`${NodeManager.name} test`, () => {
  const logger = new Logger(`${NodeConnection.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const localHost = '127.0.0.1' as Host;
  const port = 55556 as Port;
  const password = 'password';
  const mockedPingNode = jest.fn();
  const mockedIsSeedNode = jest.fn();
  const dummyNodeConnectionManager = {
    connConnectTime: 5000,
    pingTimeout: 5000,
    pingNode: mockedPingNode,
    isSeedNode: mockedIsSeedNode,
  } as unknown as NodeConnectionManager;
  const dummySigchain = {} as Sigchain;
  const crypto = tlsTestUtils.createCrypto();

  let keyRing: KeyRing;
  let db: DB;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let taskManager: TaskManager;

  let clientSocket: QUICSocket;
  let tlsConfig: TLSConfig;

  beforeEach(async () => {
    // Setting up client dependencies
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
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
    });

    clientSocket = new QUICSocket({
      logger: logger.getChild('clientSocket'),
    });
    await clientSocket.start({
      host: localHost as unknown as QUICHost,
    });

    tlsConfig = await tlsTestUtils.createTLSConfig(keyRing.keyPair);
  });

  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await sigchain.stop();
    await sigchain.destroy();
    await nodeGraph.stop();
    await nodeGraph.destroy();
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
    await acl.stop();
    await acl.destroy();
    await taskManager.stop();
    await db.stop();
    await db.destroy();
    await keyRing.stop();
    await keyRing.destroy();

    await clientSocket.stop({ force: true });
  });

  test('should add a node when bucket has room', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });

    await nodeManager.start();
    const localNodeId = keyRing.getNodeId();
    const bucketIndex = 100;
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      localNodeId,
      bucketIndex,
    );
    await nodeManager.setNode(nodeId, {} as NodeAddress);

    // Checking bucket
    const bucket = await nodeManager.getBucket(bucketIndex);
    expect(bucket).toHaveLength(1);
  });
  test('should update a node if node exists', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    const localNodeId = keyRing.getNodeId();
    const bucketIndex = 100;
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      localNodeId,
      bucketIndex,
    );
    await nodeManager.setNode(nodeId, {
      host: '' as Host,
      port: 11111 as Port,
    });

    const nodeData = (await nodeGraph.getNode(nodeId))!;
    // Seconds resolution so we wait more than 1 second
    await sleep(1100);

    // Should update the node
    await nodeManager.setNode(nodeId, {
      host: '' as Host,
      port: 22222 as Port,
    });

    const newNodeData = (await nodeGraph.getNode(nodeId))!;
    expect(newNodeData.address.port).not.toEqual(nodeData.address.port);
    expect(newNodeData.lastUpdated).not.toEqual(nodeData.lastUpdated);
  });
  test('should not add node if bucket is full and old node is alive', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    const localNodeId = keyRing.getNodeId();
    const bucketIndex = 100;
    // Creating 20 nodes in bucket
    for (let i = 1; i <= 20; i++) {
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
        i,
      );
      await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
    }
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      localNodeId,
      bucketIndex,
    );
    // Mocking ping
    mockedPingNode.mockResolvedValue(true);
    const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
    const oldestNode = await nodeGraph.getNode(oldestNodeId!);
    // Waiting for a second to tick over
    await sleep(1500);
    // Adding a new node with bucket full
    await nodeManager.setNode(nodeId, { port: 55555 } as NodeAddress, true);
    // Bucket still contains max nodes
    const bucket = await nodeManager.getBucket(bucketIndex);
    expect(bucket).toHaveLength(nodeGraph.nodeBucketLimit);
    // New node was not added
    const node = await nodeGraph.getNode(nodeId);
    expect(node).toBeUndefined();
    // Oldest node was updated
    const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
    expect(oldestNodeNew!.lastUpdated).not.toEqual(oldestNode!.lastUpdated);
  });
  test('should add node if bucket is full, old node is alive and force is set', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    const localNodeId = keyRing.getNodeId();
    const bucketIndex = 100;
    // Creating 20 nodes in bucket
    for (let i = 1; i <= 20; i++) {
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
        i,
      );
      await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
    }
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      localNodeId,
      bucketIndex,
    );
    // Mocking ping
    const nodeManagerPingMock = jest.spyOn(NodeManager.prototype, 'pingNode');
    nodeManagerPingMock.mockResolvedValue(true);
    const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
    // Adding a new node with bucket full
    await nodeManager.setNode(
      nodeId,
      { port: 55555 } as NodeAddress,
      undefined,
      true,
    );
    // Bucket still contains max nodes
    const bucket = await nodeManager.getBucket(bucketIndex);
    expect(bucket).toHaveLength(nodeGraph.nodeBucketLimit);
    // New node was added
    const node = await nodeGraph.getNode(nodeId);
    expect(node).toBeDefined();
    // Oldest node was removed
    const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
    expect(oldestNodeNew).toBeUndefined();
    nodeManagerPingMock.mockRestore();
  });
  test('should add node if bucket is full and old node is dead', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    const localNodeId = keyRing.getNodeId();
    const bucketIndex = 100;
    // Creating 20 nodes in bucket
    for (let i = 1; i <= 20; i++) {
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
        i,
      );
      await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
    }
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      localNodeId,
      bucketIndex,
    );
    // Mocking ping
    const nodeManagerPingMock = jest.spyOn(NodeManager.prototype, 'pingNode');
    nodeManagerPingMock.mockResolvedValue(false);
    const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
    // Adding a new node with bucket full
    await nodeManager.setNode(nodeId, { port: 55555 } as NodeAddress, true);
    // New node was added
    const node = await nodeGraph.getNode(nodeId);
    expect(node).toBeDefined();
    // Oldest node was removed
    const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
    expect(oldestNodeNew).toBeUndefined();
    nodeManagerPingMock.mockRestore();
  });
  test('should add node when an incoming connection is established', async () => {
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      quicClientConfig: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      logger,
    });
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    await nodeConnectionManager.start({ nodeManager });
    const server = await PolykeyAgent.createPolykeyAgent({
      password: 'password',
      nodePath: path.join(dataDir, 'server'),
      networkConfig: {
        agentHost: '127.0.0.1' as Host,
      },
      logger: logger,
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    const serverNodeId = server.keyRing.getNodeId();
    const serverNodeAddress: NodeAddress = {
      host: server.quicServerAgent.host as unknown as Host,
      port: server.quicServerAgent.port as unknown as Port,
    };
    await nodeGraph.setNode(serverNodeId, serverNodeAddress);

    const expectedHost = clientSocket.host;
    const expectedPort = clientSocket.port;
    const expectedNodeId = keyRing.getNodeId();

    const nodeData = await server.nodeGraph.getNode(expectedNodeId);
    expect(nodeData).toBeUndefined();

    // Now we want to connect to the server
    await nodeConnectionManager.withConnF(serverNodeId, async () => {
      // Do nothing
    });

    const nodeData2 = await server.nodeGraph.getNode(expectedNodeId);
    expect(nodeData2).toBeDefined();
    expect(nodeData2?.address.host).toEqual(expectedHost);
    expect(nodeData2?.address.port).toEqual(expectedPort);
  });
  test('should not add nodes to full bucket if pings succeeds', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    const nodeId = keyRing.getNodeId();
    const address = { host: localHost, port };
    // Let's fill a bucket
    for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
      const newNode = nodesTestUtils.generateNodeIdForBucket(nodeId, 100, i);
      await nodeManager.setNode(newNode, address);
    }

    // Helpers
    const listBucket = async (bucketIndex: number) => {
      const bucket = await nodeManager.getBucket(bucketIndex);
      return bucket?.map(([nodeId]) => nodesUtils.encodeNodeId(nodeId));
    };

    // Pings succeed, node not added
    mockedPingNode.mockImplementation(async () => true);
    const newNode = nodesTestUtils.generateNodeIdForBucket(nodeId, 100, 21);
    await nodeManager.setNode(newNode, address, true);
    expect(await listBucket(100)).not.toContain(
      nodesUtils.encodeNodeId(newNode),
    );
  });
  test('should add nodes to full bucket if pings fail', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    const nodeId = keyRing.getNodeId();
    const address = { host: localHost, port };
    // Let's fill a bucket
    for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
      const newNode = nodesTestUtils.generateNodeIdForBucket(nodeId, 100, i);
      await nodeManager.setNode(newNode, address);
    }
    // Wait for 2 secs for new nodes to be added with new times
    await sleep(2000);

    // Helpers
    const listBucket = async (bucketIndex: number) => {
      const bucket = await nodeManager.getBucket(bucketIndex);
      return bucket?.map(([nodeId]) => nodesUtils.encodeNodeId(nodeId));
    };

    // Pings fail, new nodes get added
    mockedPingNode.mockImplementation(async () => false);
    const newNode1 = nodesTestUtils.generateNodeIdForBucket(nodeId, 100, 22);
    const newNode2 = nodesTestUtils.generateNodeIdForBucket(nodeId, 100, 23);
    const newNode3 = nodesTestUtils.generateNodeIdForBucket(nodeId, 100, 24);
    await nodeManager.setNode(newNode1, address, true);
    await nodeManager.setNode(newNode2, address, true);
    await nodeManager.setNode(newNode3, address, true);
    const list = await listBucket(100);
    expect(list).toContain(nodesUtils.encodeNodeId(newNode1));
    expect(list).toContain(nodesUtils.encodeNodeId(newNode2));
    expect(list).toContain(nodesUtils.encodeNodeId(newNode3));
  });
  test('should not block when bucket is full', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    const nodeId = keyRing.getNodeId();
    const address = { host: localHost, port };
    // Let's fill a bucket
    for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
      const newNode = testNodesUtils.generateNodeIdForBucket(nodeId, 100, i);
      await nodeManager.setNode(newNode, address);
    }

    // Set node does not block
    const delayPing = promise();
    mockedPingNode.mockImplementation(async (_) => {
      await delayPing.p;
      return true;
    });
    const newNode4 = testNodesUtils.generateNodeIdForBucket(nodeId, 100, 25);
    // Set manually to non-blocking
    await expect(
      nodeManager.setNode(newNode4, address, false),
    ).resolves.toBeUndefined();
    delayPing.resolveP();
  });
  test('should update deadline when updating a bucket', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    const mockRefreshBucket = jest.spyOn(
      NodeManager.prototype,
      'refreshBucket',
    );
    mockRefreshBucket.mockImplementation(
      () => new PromiseCancellable((resolve) => resolve()),
    );
    // Getting starting value
    const bucketIndex = 100;
    let refreshBucketTask: Task | undefined;
    for await (const task of taskManager.getTasks('asc', true, [
      nodeManager.basePath,
      nodeManager.refreshBucketHandlerId,
      `${bucketIndex}`,
    ])) {
      refreshBucketTask = task;
    }
    if (refreshBucketTask == null) never();
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      keyRing.getNodeId(),
      bucketIndex,
    );
    await sleep(100);
    await nodeManager.setNode(nodeId, {} as NodeAddress);
    // Deadline should be updated
    let refreshBucketTaskUpdated: Task | undefined;
    for await (const task of taskManager.getTasks('asc', true, [
      nodeManager.basePath,
      nodeManager.refreshBucketHandlerId,
      `${bucketIndex}`,
    ])) {
      refreshBucketTaskUpdated = task;
    }
    if (refreshBucketTaskUpdated == null) never();
    expect(refreshBucketTaskUpdated?.delay).not.toEqual(
      refreshBucketTask?.delay,
    );
  });
  test('refreshBucket should not throw errors when network is empty', async () => {
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      quicClientConfig: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      logger,
    });
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeConnectionManager.start({ nodeManager });
    await nodeManager.start();

    await expect(nodeManager.refreshBucket(100)).resolves.not.toThrow();
  });
  test('refreshBucket tasks should have spread delays', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    const mockRefreshBucket = jest.spyOn(
      NodeManager.prototype,
      'refreshBucket',
    );
    mockRefreshBucket.mockImplementation(
      () => new PromiseCancellable((resolve) => resolve()),
    );
    await nodeManager.start();
    // Getting starting value
    const startingDelay = new Set<number>();
    for await (const task of taskManager.getTasks('asc', true, [
      'refreshBucket',
    ])) {
      startingDelay.add(task.delay);
    }
    expect(startingDelay.size).not.toBe(1);
    // Updating delays should have spread
    for (
      let bucketIndex = 0;
      bucketIndex < nodeGraph.nodeIdBits;
      bucketIndex++
    ) {
      await nodeManager.updateRefreshBucketDelay(bucketIndex, undefined, true);
    }
    const updatedDelay = new Set<number>();
    for await (const task of taskManager.getTasks('asc', true, [
      'refreshBucket',
    ])) {
      updatedDelay.add(task.delay);
    }
    expect(updatedDelay.size).not.toBe(1);
  });
  test('Stopping nodeManager should cancel all ephemeral tasks', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();

    // Creating dummy tasks
    const task1 = await taskManager.scheduleTask({
      handlerId: nodeManager.pingAndSetNodeHandlerId,
      lazy: false,
      path: [nodeManager.basePath],
    });
    const task2 = await taskManager.scheduleTask({
      handlerId: nodeManager.pingAndSetNodeHandlerId,
      lazy: false,
      path: [nodeManager.basePath],
    });

    // Stopping nodeManager should cancel any nodeManager tasks
    await taskManager.stopProcessing();
    await nodeManager.stop();
    const tasks: Array<any> = [];
    for await (const task of taskManager.getTasks('asc', true, [
      nodeManager.basePath,
    ])) {
      tasks.push(task);
    }
    expect(tasks.length).toEqual(0);
    await expect(task1.promise()).toReject();
    await expect(task2.promise()).toReject();
  });
  test('Should have unique HandlerIds', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: dummySigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    // This is a sanity check for a previous bug with SWC decorators causing Thing.name to be ''
    expect(nodeManager.gcBucketHandlerId).not.toEqual(
      nodeManager.refreshBucketHandlerId,
    );
    expect(nodeManager.gcBucketHandlerId).not.toEqual(
      nodeManager.pingAndSetNodeHandlerId,
    );
    expect(nodeManager.refreshBucketHandlerId).not.toEqual(
      nodeManager.pingAndSetNodeHandlerId,
    );
  });
});
