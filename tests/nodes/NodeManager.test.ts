import type { NodeAddress } from '@/nodes/types';
import type { Task } from '@/tasks/types';
import type { Host, Port, TLSConfig } from '@/network/types';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { DB } from '@matrixai/db';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import ACL from '@/acl/ACL';
import KeyRing from '@/keys/KeyRing';
import Sigchain from '@/sigchain/Sigchain';
import GestaltGraph from '@/gestalts/GestaltGraph';
import TaskManager from '@/tasks/TaskManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeConnection from '@/nodes/NodeConnection';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeManager from '@/nodes/NodeManager';
import PolykeyAgent from '@/PolykeyAgent';
import * as utils from '@/utils';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as nodesErrors from '@/nodes/errors';
import * as testsNodesUtils from './utils';
import * as testsUtils from '../utils';

describe(`${NodeManager.name} test`, () => {

  // const logger = new Logger(`${NodeManager.name} test`, LogLevel.WARN, [
  //   new StreamHandler(
  //     formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
  //   ),
  // ]);

  const logger = new Logger(`${NodeManager.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';

  const localHost = '127.0.0.1' as Host;

  // I think this should be `0`
  // And should not be a variable here at all
  const port = 55556 as Port;

  // I think mocks are going to be test function specific
  // Not for the entire test module
  // const mockedPingNode = jest.fn();
  // const mockedIsSeedNode = jest.fn();
  // const dummyNodeConnectionManager = {
  //   connectionConnectTime: 5000,
  //   pingTimeoutTime: 5000,
  //   pingNode: mockedPingNode,
  //   isSeedNode: mockedIsSeedNode,
  //   addEventListener: jest.fn(),
  //   removeEventListener: jest.fn(),
  // } as unknown as NodeConnectionManager;
  // const dummySigchain = {} as Sigchain;

  let dataDir: string;
  let keyRing: KeyRing;
  let db: DB;
  let acl: ACL;
  let sigchain: Sigchain;
  let gestaltGraph: GestaltGraph;
  let nodeGraph: NodeGraph;
  let nodeConnectionManager: NodeConnectionManager;
  let taskManager: TaskManager;

  // let tlsConfig: TLSConfig;
  // let server: PolykeyAgent;

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
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
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
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      tlsConfig: await testsUtils.createTLSConfig(keyRing.keyPair),
      logger,
    });
    await nodeConnectionManager.start({
      host: localHost
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
    });
  });
  afterEach(async () => {
    await taskManager.stop();
    await nodeConnectionManager.stop();
    await nodeGraph.stop();
    await gestaltGraph.stop();
    await sigchain.stop();
    await acl.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('NodeManager readiness', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();
    // Should be a noop
    await nodeManager.start();
    await nodeManager.stop();
    await expect(async () => {
      await nodeManager.setNode(
        testsNodesUtils.generateRandomNodeId(),
        {
          host: '127.0.0.1' as Host,
          port: 55555 as Port,
          scopes: ['local']
        }
      );
    }).rejects.toThrow(nodesErrors.ErrorNodeManagerNotRunning);
    // Should be a noop
    await nodeManager.stop();
  });
  test('stopping NodeManager should cancel all tasks', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeManager.stop();
    const tasks: Array<any> = [];
    for await (const task of taskManager.getTasks('asc', true, [
      nodeManager.tasksPath,
    ])) {
      tasks.push(task);
    }
    expect(tasks.length).toEqual(0);
  });
  test('task handler ids are not empty', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager,
      taskManager,
      logger,
    });
    expect(nodeManager.gcBucketHandlerId).toEqual(
      'NodeManager.gcBucketHandler',
    );
    expect(nodeManager.refreshBucketHandlerId).toEqual(
      'NodeManager.refreshBucketHandler',
    );
  });
  // test('should add a node when bucket has room', async () => {
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager: dummyNodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });

  //   await nodeManager.start();
  //   const localNodeId = keyRing.getNodeId();
  //   const bucketIndex = 100;
  //   const nodeId = testsNodesUtils.generateNodeIdForBucket(
  //     localNodeId,
  //     bucketIndex,
  //   );
  //   await nodeManager.setNode(nodeId, {} as NodeAddress);

  //   // Checking bucket
  //   const bucket = await nodeManager.getBucket(bucketIndex);
  //   expect(bucket).toHaveLength(1);
  // });
  // test('should update a node if node exists', async () => {
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager: dummyNodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeManager.start();

  //   const localNodeId = keyRing.getNodeId();
  //   const bucketIndex = 100;
  //   const nodeId = testsNodesUtils.generateNodeIdForBucket(
  //     localNodeId,
  //     bucketIndex,
  //   );
  //   await nodeManager.setNode(nodeId, {
  //     host: '' as Host,
  //     port: 11111 as Port,
  //     scopes: ['global'],
  //   });

  //   const nodeData = (await nodeGraph.getNode(nodeId))!;
  //   // Seconds resolution so we wait more than 1 second
  //   await utils.sleep(1100);

  //   // Should update the node
  //   await nodeManager.setNode(nodeId, {
  //     host: '' as Host,
  //     port: 22222 as Port,
  //     scopes: ['global'],
  //   });

  //   const newNodeData = (await nodeGraph.getNode(nodeId))!;
  //   expect(newNodeData.address.port).not.toEqual(nodeData.address.port);
  //   expect(newNodeData.lastUpdated).not.toEqual(nodeData.lastUpdated);
  // });
  // test('should not add node if bucket is full and old node is alive', async () => {
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager: dummyNodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeManager.start();

  //   const localNodeId = keyRing.getNodeId();
  //   const bucketIndex = 100;
  //   // Creating 20 nodes in bucket
  //   for (let i = 1; i <= 20; i++) {
  //     const nodeId = testsNodesUtils.generateNodeIdForBucket(
  //       localNodeId,
  //       bucketIndex,
  //       i,
  //     );
  //     await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
  //   }
  //   const nodeId = testsNodesUtils.generateNodeIdForBucket(
  //     localNodeId,
  //     bucketIndex,
  //   );
  //   // Mocking ping
  //   mockedPingNode.mockResolvedValue(true);
  //   const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
  //   const oldestNode = await nodeGraph.getNode(oldestNodeId!);
  //   // Waiting for a second to tick over
  //   await utils.sleep(1500);
  //   // Adding a new node with bucket full
  //   await nodeManager.setNode(nodeId, { port: 55555 } as NodeAddress, true);
  //   // Bucket still contains max nodes
  //   const bucket = await nodeManager.getBucket(bucketIndex);
  //   expect(bucket).toHaveLength(nodeGraph.nodeBucketLimit);
  //   // New node was not added
  //   const node = await nodeGraph.getNode(nodeId);
  //   expect(node).toBeUndefined();
  //   // Oldest node was updated
  //   const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
  //   expect(oldestNodeNew!.lastUpdated).not.toEqual(oldestNode!.lastUpdated);
  // });
  // test('should add node if bucket is full, old node is alive and force is set', async () => {
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager: dummyNodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeManager.start();

  //   const localNodeId = keyRing.getNodeId();
  //   const bucketIndex = 100;
  //   // Creating 20 nodes in bucket
  //   for (let i = 1; i <= 20; i++) {
  //     const nodeId = testsNodesUtils.generateNodeIdForBucket(
  //       localNodeId,
  //       bucketIndex,
  //       i,
  //     );
  //     await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
  //   }
  //   const nodeId = testsNodesUtils.generateNodeIdForBucket(
  //     localNodeId,
  //     bucketIndex,
  //   );
  //   // Mocking ping
  //   const nodeManagerPingMock = jest.spyOn(NodeManager.prototype, 'pingNode');
  //   nodeManagerPingMock.mockResolvedValue(true);
  //   const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
  //   // Adding a new node with bucket full
  //   await nodeManager.setNode(
  //     nodeId,
  //     { port: 55555 } as NodeAddress,
  //     undefined,
  //     true,
  //   );
  //   // Bucket still contains max nodes
  //   const bucket = await nodeManager.getBucket(bucketIndex);
  //   expect(bucket).toHaveLength(nodeGraph.nodeBucketLimit);
  //   // New node was added
  //   const node = await nodeGraph.getNode(nodeId);
  //   expect(node).toBeDefined();
  //   // Oldest node was removed
  //   const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
  //   expect(oldestNodeNew).toBeUndefined();
  //   nodeManagerPingMock.mockRestore();
  // });
  // test('should add node if bucket is full and old node is dead', async () => {
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager: dummyNodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeManager.start();

  //   const localNodeId = keyRing.getNodeId();
  //   const bucketIndex = 100;
  //   // Creating 20 nodes in bucket
  //   for (let i = 1; i <= 20; i++) {
  //     const nodeId = testsNodesUtils.generateNodeIdForBucket(
  //       localNodeId,
  //       bucketIndex,
  //       i,
  //     );
  //     await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
  //   }
  //   const nodeId = testsNodesUtils.generateNodeIdForBucket(
  //     localNodeId,
  //     bucketIndex,
  //   );
  //   // Mocking ping
  //   const nodeManagerPingMock = jest.spyOn(NodeManager.prototype, 'pingNode');
  //   nodeManagerPingMock.mockResolvedValue(false);
  //   const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
  //   // Adding a new node with bucket full
  //   await nodeManager.setNode(nodeId, { port: 55555 } as NodeAddress, true);
  //   // New node was added
  //   const node = await nodeGraph.getNode(nodeId);
  //   expect(node).toBeDefined();
  //   // Oldest node was removed
  //   const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
  //   expect(oldestNodeNew).toBeUndefined();
  //   nodeManagerPingMock.mockRestore();
  // });
  // test('should add node when an incoming connection is established', async () => {
  //   nodeConnectionManager = new NodeConnectionManager({
  //     keyRing,
  //     nodeGraph,
  //     tlsConfig,
  //     logger,
  //   });
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeManager.start();

  //   await nodeConnectionManager.start({
  //     host: localHost as Host,
  //   });
  //   server = await PolykeyAgent.createPolykeyAgent({
  //     password: 'password',
  //     options: {
  //       nodePath: path.join(dataDir, 'server'),
  //       agentServiceHost: localHost,
  //       clientServiceHost: localHost,
  //       keys: {
  //         passwordOpsLimit: keysUtils.passwordOpsLimits.min,
  //         passwordMemLimit: keysUtils.passwordMemLimits.min,
  //         strictMemoryLock: false,
  //       },
  //     },
  //     logger: logger,
  //   });
  //   const serverNodeId = server.keyRing.getNodeId();
  //   const serverNodeAddress: NodeAddress = {
  //     host: server.agentServiceHost,
  //     port: server.agentServicePort,
  //     scopes: ['global'],
  //   };
  //   await nodeGraph.setNode(serverNodeId, serverNodeAddress);

  //   const expectedHost = nodeConnectionManager.host;
  //   const expectedPort = nodeConnectionManager.port;
  //   const expectedNodeId = keyRing.getNodeId();

  //   const nodeData = await server.nodeGraph.getNode(expectedNodeId);
  //   expect(nodeData).toBeUndefined();

  //   // Now we want to connect to the server
  //   await nodeConnectionManager.withConnF(serverNodeId, async () => {
  //     // Do nothing
  //   });
  //   // Wait for background logic to settle
  //   await utils.sleep(100);
  //   const nodeData2 = await server.nodeGraph.getNode(expectedNodeId);
  //   expect(nodeData2).toBeDefined();
  //   expect(nodeData2?.address.host).toEqual(expectedHost);
  //   expect(nodeData2?.address.port).toEqual(expectedPort);
  // });
  // test('should not add nodes to full bucket if pings succeeds', async () => {
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager: dummyNodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeManager.start();

  //   const nodeId = keyRing.getNodeId();
  //   const address: NodeAddress = {
  //     host: localHost as Host,
  //     port: port as Port,
  //     scopes: ['global'],
  //   };
  //   // Let's fill a bucket
  //   for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
  //     const newNode = testsNodesUtils.generateNodeIdForBucket(nodeId, 100, i);
  //     await nodeManager.setNode(newNode, address);
  //   }

  //   // Helpers
  //   const listBucket = async (bucketIndex: number) => {
  //     const bucket = await nodeManager.getBucket(bucketIndex);
  //     return bucket?.map(([nodeId]) => nodesUtils.encodeNodeId(nodeId));
  //   };

  //   // Pings succeed, node not added
  //   mockedPingNode.mockImplementation(async () => true);
  //   const newNode = testsNodesUtils.generateNodeIdForBucket(nodeId, 100, 21);
  //   await nodeManager.setNode(newNode, address, true);
  //   expect(await listBucket(100)).not.toContain(
  //     nodesUtils.encodeNodeId(newNode),
  //   );
  // });
  // test('should add nodes to full bucket if pings fail', async () => {
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager: dummyNodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeManager.start();

  //   const nodeId = keyRing.getNodeId();
  //   const address: NodeAddress = {
  //     host: localHost as Host,
  //     port: port as Port,
  //     scopes: ['global'],
  //   };
  //   // Let's fill a bucket
  //   for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
  //     const newNode = testsNodesUtils.generateNodeIdForBucket(nodeId, 100, i);
  //     await nodeManager.setNode(newNode, address);
  //   }
  //   // Wait for 2 secs for new nodes to be added with new times
  //   await utils.sleep(2000);

  //   // Helpers
  //   const listBucket = async (bucketIndex: number) => {
  //     const bucket = await nodeManager.getBucket(bucketIndex);
  //     return bucket?.map(([nodeId]) => nodesUtils.encodeNodeId(nodeId));
  //   };

  //   // Pings fail, new nodes get added
  //   mockedPingNode.mockImplementation(async () => false);
  //   const newNode1 = testsNodesUtils.generateNodeIdForBucket(nodeId, 100, 22);
  //   const newNode2 = testsNodesUtils.generateNodeIdForBucket(nodeId, 100, 23);
  //   const newNode3 = testsNodesUtils.generateNodeIdForBucket(nodeId, 100, 24);
  //   await nodeManager.setNode(newNode1, address, true);
  //   await nodeManager.setNode(newNode2, address, true);
  //   await nodeManager.setNode(newNode3, address, true);
  //   const list = await listBucket(100);
  //   expect(list).toContain(nodesUtils.encodeNodeId(newNode1));
  //   expect(list).toContain(nodesUtils.encodeNodeId(newNode2));
  //   expect(list).toContain(nodesUtils.encodeNodeId(newNode3));
  // });
  // test('should not block when bucket is full', async () => {
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager: dummyNodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeManager.start();

  //   const nodeId = keyRing.getNodeId();
  //   const address: NodeAddress = {
  //     host: localHost as Host,
  //     port: port as Port,
  //     scopes: ['global'],
  //   };
  //   // Let's fill a bucket
  //   for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
  //     const newNode = testsNodesUtils.generateNodeIdForBucket(nodeId, 100, i);
  //     await nodeManager.setNode(newNode, address);
  //   }

  //   // Set node does not block
  //   const delayPing = utils.promise();
  //   mockedPingNode.mockImplementation(async (_) => {
  //     await delayPing.p;
  //     return true;
  //   });
  //   const newNode4 = testsNodesUtils.generateNodeIdForBucket(nodeId, 100, 25);
  //   // Set manually to non-blocking
  //   await expect(
  //     nodeManager.setNode(newNode4, address, false),
  //   ).resolves.toBeUndefined();
  //   delayPing.resolveP();
  // });
  // test('should update deadline when updating a bucket', async () => {
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager: dummyNodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeManager.start();

  //   const mockRefreshBucket = jest.spyOn(
  //     NodeManager.prototype,
  //     'refreshBucket',
  //   );
  //   mockRefreshBucket.mockImplementation(
  //     () => new PromiseCancellable((resolve) => resolve()),
  //   );
  //   // Getting starting value
  //   const bucketIndex = 100;
  //   let refreshBucketTask: Task | undefined;
  //   for await (const task of taskManager.getTasks('asc', true, [
  //     nodeManager.basePath,
  //     nodeManager.refreshBucketHandlerId,
  //     `${bucketIndex}`,
  //   ])) {
  //     refreshBucketTask = task;
  //   }
  //   if (refreshBucketTask == null) utils.never();
  //   const nodeId = testsNodesUtils.generateNodeIdForBucket(
  //     keyRing.getNodeId(),
  //     bucketIndex,
  //   );
  //   await utils.sleep(100);
  //   await nodeManager.setNode(nodeId, {} as NodeAddress);
  //   // Deadline should be updated
  //   let refreshBucketTaskUpdated: Task | undefined;
  //   for await (const task of taskManager.getTasks('asc', true, [
  //     nodeManager.basePath,
  //     nodeManager.refreshBucketHandlerId,
  //     `${bucketIndex}`,
  //   ])) {
  //     refreshBucketTaskUpdated = task;
  //   }
  //   if (refreshBucketTaskUpdated == null) utils.never();
  //   expect(refreshBucketTaskUpdated?.delay).not.toEqual(
  //     refreshBucketTask?.delay,
  //   );
  // });
  // test('refreshBucket should not throw errors when network is empty', async () => {
  //   nodeConnectionManager = new NodeConnectionManager({
  //     keyRing,
  //     nodeGraph,
  //     tlsConfig,
  //     logger,
  //   });
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeConnectionManager.start({
  //     host: localHost as Host,
  //   });
  //   await nodeManager.start();

  //   await expect(nodeManager.refreshBucket(100)).resolves.not.toThrow();
  // });
  // test('refreshBucket tasks should have spread delays', async () => {
  //   const nodeManager = new NodeManager({
  //     db,
  //     sigchain: dummySigchain,
  //     keyRing,
  //     gestaltGraph,
  //     nodeGraph,
  //     nodeConnectionManager: dummyNodeConnectionManager,
  //     taskManager,
  //     logger,
  //   });
  //   await nodeManager.start();

  //   const mockRefreshBucket = jest.spyOn(
  //     NodeManager.prototype,
  //     'refreshBucket',
  //   );
  //   mockRefreshBucket.mockImplementation(
  //     () => new PromiseCancellable((resolve) => resolve()),
  //   );
  //   await nodeManager.start();
  //   // Getting starting value
  //   const startingDelay = new Set<number>();
  //   for await (const task of taskManager.getTasks('asc', true, [
  //     'refreshBucket',
  //   ])) {
  //     startingDelay.add(task.delay);
  //   }
  //   expect(startingDelay.size).not.toBe(1);
  //   // Updating delays should have spread
  //   for (
  //     let bucketIndex = 0;
  //     bucketIndex < nodeGraph.nodeIdBits;
  //     bucketIndex++
  //   ) {
  //     await nodeManager.updateRefreshBucketDelay(bucketIndex, undefined, true);
  //   }
  //   const updatedDelay = new Set<number>();
  //   for await (const task of taskManager.getTasks('asc', true, [
  //     'refreshBucket',
  //   ])) {
  //     updatedDelay.add(task.delay);
  //   }
  //   expect(updatedDelay.size).not.toBe(1);
  // });
});
