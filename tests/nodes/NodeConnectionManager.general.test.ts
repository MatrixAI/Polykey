import type { Host, Port, TLSConfig } from '@/network/types';
import type { NodeId, NodeIdEncoded } from '@/ids';
import type { NodeAddress, NodeBucket } from '@/nodes/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { DB } from '@matrixai/db';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import * as nodesUtils from '@/nodes/utils';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeConnection from '@/nodes/NodeConnection';
import * as keysUtils from '@/keys/utils';
import KeyRing from '@/keys/KeyRing';
import ACL from '@/acl/ACL';
import GestaltGraph from '@/gestalts/GestaltGraph';
import NodeGraph from '@/nodes/NodeGraph';
import Sigchain from '@/sigchain/Sigchain';
import TaskManager from '@/tasks/TaskManager';
import NodeManager from '@/nodes/NodeManager';
import PolykeyAgent from '@/PolykeyAgent';
import * as testNodesUtils from './utils';
import * as tlsTestUtils from '../utils/tls';

describe(`${NodeConnectionManager.name} general test`, () => {
  const logger = new Logger(`${NodeConnection.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const localHost = '127.0.0.1';
  const password = 'password';

  let tlsConfig: TLSConfig;

  const nodeIdGenerator = (number: number) => {
    const idArray = new Uint8Array([
      223,
      24,
      34,
      40,
      46,
      217,
      4,
      71,
      103,
      71,
      59,
      123,
      143,
      187,
      9,
      29,
      157,
      41,
      131,
      44,
      68,
      160,
      79,
      127,
      137,
      154,
      221,
      86,
      157,
      23,
      77,
      number,
    ]);
    return IdInternal.create<NodeId>(idArray);
  };

  let dataDir: string;

  let remotePolykeyAgent: PolykeyAgent;
  let serverAddress: NodeAddress;
  let serverNodeId: NodeId;
  let serverNodeIdEncoded: NodeIdEncoded;

  let keyRing: KeyRing;
  let db: DB;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let taskManager: TaskManager;
  let nodeManager: NodeManager;

  let nodeConnectionManager: NodeConnectionManager;
  // Default stream handler, just drop the stream

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    // Setting up remote node
    const nodePath = path.join(dataDir, 'agentA');
    remotePolykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        agentServiceHost: localHost,
        clientServiceHost: localHost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger: logger.getChild('AgentA'),
    });
    serverNodeId = remotePolykeyAgent.keyRing.getNodeId();
    serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);

    // Setting up client dependencies
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      }
    });
    tlsConfig = await tlsTestUtils.createTLSConfig(keyRing.keyPair);
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
    serverAddress = {
      host: remotePolykeyAgent.agentServiceHost as Host,
      port: remotePolykeyAgent.agentServicePort as Port,
    };
  });

  afterEach(async () => {
    logger.info('AFTER EACH');
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await nodeManager?.stop();
    await nodeConnectionManager?.stop();
    await sigchain.stop();
    await sigchain.destroy();
    await nodeGraph.stop();
    await nodeGraph.destroy();
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
    await acl.stop();
    await acl.destroy();
    await db.stop();
    await db.destroy();
    await keyRing.stop();
    await keyRing.destroy();
    await taskManager.stop();

    await remotePolykeyAgent.stop();
  });

  test('finds node (local)', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig,
      seedNodes: undefined,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    // Case 1: node already exists in the local node graph (no contact required)
    const nodeId = testNodesUtils.generateRandomNodeId();
    const nodeAddress: NodeAddress = {
      host: localHost as Host,
      port: 11111 as Port,
    };
    await nodeGraph.setNode(nodeId, nodeAddress);
    // Expect no error thrown
    const findNodePromise = nodeConnectionManager.findNode(nodeId);
    await expect(findNodePromise).resolves.not.toThrowError();
    await expect(findNodePromise).resolves.toStrictEqual(nodeAddress);

    await nodeConnectionManager.stop();
  });
  test('finds node (contacts remote node)', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      options: {
        connectionKeepAliveTimeoutTime: 10000,
        connectionKeepAliveIntervalTime: 1000,
      },
      tlsConfig,
      seedNodes: undefined,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();
    // Mocking pinging to always return true
    const mockedPingNode = jest.spyOn(
      NodeConnectionManager.prototype,
      'pingNode',
    );
    mockedPingNode.mockImplementation(
      () => new PromiseCancellable((resolve) => resolve(true)),
    );
    logger.info('DOING TEST');

    await nodeGraph.setNode(serverNodeId, serverAddress);
    // Adding node information to remote node
    const nodeId = testNodesUtils.generateRandomNodeId();
    const nodeAddress: NodeAddress = {
      host: localHost as Host,
      port: 11111 as Port,
    };
    await remotePolykeyAgent.nodeGraph.setNode(nodeId, nodeAddress);

    // Expect no error thrown
    const findNodePromise = nodeConnectionManager.findNode(nodeId);
    await expect(findNodePromise).resolves.not.toThrowError();
    await expect(findNodePromise).resolves.toStrictEqual(nodeAddress);

    await nodeConnectionManager.stop();
  });
  test('cannot find node (contacts remote node)', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      options: {
        connectionKeepAliveTimeoutTime: 10000,
        connectionKeepAliveIntervalTime: 1000,
      },
      tlsConfig,
      seedNodes: undefined,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();
    // Mocking pinging to always return true
    const mockedPingNode = jest.spyOn(
      NodeConnectionManager.prototype,
      'pingNode',
    );
    mockedPingNode.mockImplementation(
      () => new PromiseCancellable((resolve) => resolve(true)),
    );

    await nodeGraph.setNode(serverNodeId, serverAddress);
    // Adding node information to remote node
    const nodeId = testNodesUtils.generateRandomNodeId();

    // Expect no error thrown
    const findNodePromise = nodeConnectionManager.findNode(nodeId);
    await expect(findNodePromise).resolves.toBeUndefined();

    await nodeConnectionManager.stop();
  });
  test('receives 20 closest local nodes from connected target', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      options: {
        connectionKeepAliveTimeoutTime: 10000,
        connectionKeepAliveIntervalTime: 1000,
      },
      tlsConfig,
      seedNodes: undefined,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();
    // Mocking pinging to always return true
    const mockedPingNode = jest.spyOn(
      NodeConnectionManager.prototype,
      'pingNode',
    );
    mockedPingNode.mockImplementation(
      () => new PromiseCancellable((resolve) => resolve(true)),
    );

    await nodeGraph.setNode(serverNodeId, serverAddress);

    // Now generate and add 20 nodes that will be close to this node ID
    const addedClosestNodes: NodeBucket = [];
    for (let i = 1; i < 101; i += 5) {
      const closeNodeId = testNodesUtils.generateNodeIdForBucket(
        serverNodeId,
        i,
      );
      const nodeAddress = {
        host: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await remotePolykeyAgent.nodeGraph.setNode(closeNodeId, nodeAddress);
      addedClosestNodes.push([
        closeNodeId,
        {
          address: nodeAddress,
          lastUpdated: 0,
        },
      ]);
    }
    // Now create and add 10 more nodes that are far away from this node
    for (let i = 1; i <= 10; i++) {
      const farNodeId = nodeIdGenerator(i);
      const nodeAddress = {
        host: `${i}.${i}.${i}.${i}`,
        port: i,
      } as NodeAddress;
      await remotePolykeyAgent.nodeGraph.setNode(farNodeId, nodeAddress);
    }

    // Get the closest nodes to the target node
    const closest = await nodeConnectionManager.getRemoteNodeClosestNodes(
      serverNodeId,
      serverNodeId,
    );
    // Sort the received nodes on distance such that we can check its equality
    // with addedClosestNodes
    nodesUtils.bucketSortByDistance(closest, serverNodeId);
    expect(closest.length).toBe(20);
    expect(closest).toEqual(addedClosestNodes);

    await nodeConnectionManager.stop();
  });
  test('sendHolePunchMessage', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      options: {
        connectionKeepAliveTimeoutTime: 10000,
        connectionKeepAliveIntervalTime: 1000,
      },
      tlsConfig,
      seedNodes: undefined,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();
    // Mocking pinging to always return true
    const mockedPingNode = jest.spyOn(
      NodeConnectionManager.prototype,
      'pingNode',
    );
    mockedPingNode.mockImplementation(
      () => new PromiseCancellable((resolve) => resolve(true)),
    );

    await nodeGraph.setNode(serverNodeId, serverAddress);

    // Now generate and add 20 nodes that will be close to this node ID
    const addedClosestNodes: NodeBucket = [];
    for (let i = 1; i < 101; i += 5) {
      const closeNodeId = testNodesUtils.generateNodeIdForBucket(
        serverNodeId,
        i,
      );
      const nodeAddress = {
        host: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await remotePolykeyAgent.nodeGraph.setNode(closeNodeId, nodeAddress);
      addedClosestNodes.push([
        closeNodeId,
        {
          address: nodeAddress,
          lastUpdated: 0,
        },
      ]);
    }
    // Now create and add 10 more nodes that are far away from this node
    for (let i = 1; i <= 10; i++) {
      const farNodeId = nodeIdGenerator(i);
      const nodeAddress = {
        host: `${i}.${i}.${i}.${i}`,
        port: i,
      } as NodeAddress;
      await remotePolykeyAgent.nodeGraph.setNode(farNodeId, nodeAddress);
    }

    // Get the closest nodes to the target node
    const closest = await nodeConnectionManager.getRemoteNodeClosestNodes(
      serverNodeId,
      serverNodeId,
    );
    // Sort the received nodes on distance such that we can check its equality
    // with addedClosestNodes
    nodesUtils.bucketSortByDistance(closest, serverNodeId);
    expect(closest.length).toBe(20);
    expect(closest).toEqual(addedClosestNodes);

    await nodeConnectionManager.stop();
  });
  test('relayHolePunchMessage', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      options: {
        connectionKeepAliveTimeoutTime: 10000,
        connectionKeepAliveIntervalTime: 1000,
      },
      tlsConfig,
      seedNodes: undefined,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    // Mocking the relay send
    const mockedHolePunchReverse = jest.spyOn(
      NodeConnectionManager.prototype,
      'holePunchReverse',
    );
    mockedHolePunchReverse.mockImplementation(() => {
      return new PromiseCancellable<void>((res) => {
        res();
      });
    });

    await nodeGraph.setNode(serverNodeId, serverAddress);

    const srcNodeId = testNodesUtils.generateRandomNodeId();
    const srcNodeIdEncoded = nodesUtils.encodeNodeId(srcNodeId);

    await nodeConnectionManager.relaySignalingMessage(
      {
        srcIdEncoded: srcNodeIdEncoded,
        dstIdEncoded: serverNodeIdEncoded,
        address: {
          host: '127.0.0.2',
          port: 22222,
        },
      },
      {
        host: '127.0.0.3' as Host,
        port: 33333 as Port,
      },
    );

    expect(mockedHolePunchReverse).toHaveBeenCalled();

    await nodeConnectionManager.stop();
  });
  test.todo('Handles reverse streams');
});
