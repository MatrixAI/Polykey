import type { NodeAddress, NodeBucket, NodeId, SeedNodes } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import type NodeManager from '@/nodes/NodeManager';
import type TaskManager from '@/tasks/TaskManager';
import type { Key } from '@/keys/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DB } from '@matrixai/db';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import PolykeyAgent from '@/PolykeyAgent';
import KeyRing from '@/keys/KeyRing';
import NodeGraph from '@/nodes/NodeGraph';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import Proxy from '@/network/Proxy';
import GRPCClientAgent from '@/agent/GRPCClientAgent';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as grpcUtils from '@/grpc/utils';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as utils from '@/utils/index';
import * as testNodesUtils from './utils';
import * as testsUtils from '../utils';

describe(`${NodeConnectionManager.name} general test`, () => {
  const logger = new Logger(
    `${NodeConnectionManager.name} test`,
    LogLevel.WARN,
    [new StreamHandler()],
  );
  grpcUtils.setLogger(logger.getChild('grpc'));

  const nodeConnectionManagerLogger = logger.getChild(
    'nodeConnectionManagerUT',
  );
  // Constants
  const password = 'password';
  const nodeId1 = IdInternal.create<NodeId>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 5,
  ]);
  const nodeId2 = IdInternal.create<NodeId>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 8,
  ]);
  const nodeId3 = IdInternal.create<NodeId>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 124,
  ]);
  const dummyNodeId = nodesUtils.decodeNodeId(
    'vi3et1hrpv2m2lrplcm7cu913kr45v51cak54vm68anlbvuf83ra0',
  )!;

  const localHost = '127.0.0.1' as Host;
  const serverHost = '127.0.0.1' as Host;
  const serverPort = 55555 as Port;

  const dummySeedNodes: SeedNodes = {};
  dummySeedNodes[nodesUtils.encodeNodeId(nodeId1)] = {
    host: serverHost,
    port: serverPort,
  };
  dummySeedNodes[nodesUtils.encodeNodeId(nodeId2)] = {
    host: serverHost,
    port: serverPort,
  };
  dummySeedNodes[nodesUtils.encodeNodeId(nodeId3)] = {
    host: serverHost,
    port: serverPort,
  };

  //
  let dataDir: string;
  let dataDir2: string;
  let keyRing: KeyRing;
  let db: DB;
  let proxy: Proxy;
  let nodeGraph: NodeGraph;

  let remoteNode1: PolykeyAgent;
  let remoteNode2: PolykeyAgent;
  let remoteNodeId1: NodeId;
  let remoteNodeId2: NodeId;

  // Utils functions
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

  const dummyNodeManager = {
    setNode: jest.fn(),
    updateRefreshBucketDelay: jest.fn(),
  } as unknown as NodeManager;
  const dummyTaskManager: TaskManager = {
    registerHandler: jest.fn(),
    deregisterHandler: jest.fn(),
  } as unknown as TaskManager;

  beforeAll(async () => {
    dataDir2 = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    // Creating remotes, they just exist to start connections or fail them if needed
    remoteNode1 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir2, 'remoteNode1'),
      networkConfig: {
        proxyHost: localHost,
        agentHost: localHost,
        clientHost: localHost,
        forwardHost: localHost,
      },
      logger: logger.getChild('remoteNode1'),
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    remoteNodeId1 = remoteNode1.keyRing.getNodeId();
    remoteNode2 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir2, 'remoteNode2'),
      networkConfig: {
        proxyHost: localHost,
        agentHost: localHost,
        clientHost: localHost,
        forwardHost: localHost,
      },
      logger: logger.getChild('remoteNode2'),
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    remoteNodeId2 = remoteNode2.keyRing.getNodeId();
  });

  afterAll(async () => {
    await remoteNode1.stop();
    await remoteNode2.stop();
    await fs.promises.rm(dataDir2, { force: true, recursive: true });
  });

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger: logger.getChild('keyRing'),
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger: nodeConnectionManagerLogger,
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    const tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    proxy = new Proxy({
      authToken: 'auth',
      logger: logger.getChild('proxy'),
    });
    await proxy.start({
      tlsConfig,
      serverHost,
      serverPort,
      proxyHost: localHost,
    });
    await nodeGraph.setNode(remoteNodeId1, {
      host: remoteNode1.proxy.getProxyHost(),
      port: remoteNode1.proxy.getProxyPort(),
    });
    await nodeGraph.setNode(remoteNodeId2, {
      host: remoteNode2.proxy.getProxyHost(),
      port: remoteNode2.proxy.getProxyPort(),
    });
  });

  afterEach(async () => {
    await nodeGraph.stop();
    await db.stop();
    await keyRing.stop();
    await proxy.stop();
  });

  // General functionality
  test('finds node (local)', async () => {
    // NodeConnectionManager under test
    const nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      proxy,
      taskManager: dummyTaskManager,
      logger: nodeConnectionManagerLogger,
    });
    await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
    try {
      // Case 1: node already exists in the local node graph (no contact required)
      const nodeId = nodeId1;
      const nodeAddress: NodeAddress = {
        host: localHost,
        port: 11111 as Port,
      };
      await nodeGraph.setNode(nodeId, nodeAddress);
      // Expect no error thrown
      const findNodePromise = nodeConnectionManager.findNode(nodeId);
      await expect(findNodePromise).resolves.not.toThrowError();
      expect(await findNodePromise).toStrictEqual(nodeAddress);
    } finally {
      await nodeConnectionManager.stop();
    }
  });
  test(
    'finds node (contacts remote node)',
    async () => {
      const mockedPingNode = jest.spyOn(
        NodeConnectionManager.prototype,
        'pingNode',
      );
      mockedPingNode.mockImplementation(
        () => new PromiseCancellable((resolve) => resolve(true)),
      );
      // NodeConnectionManager under test
      const nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        nodeGraph,
        proxy,
        taskManager: dummyTaskManager,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      try {
        // Case 2: node can be found on the remote node
        const nodeId = nodeId1;
        const nodeAddress: NodeAddress = {
          host: localHost,
          port: 11111 as Port,
        };
        const server = await PolykeyAgent.createPolykeyAgent({
          nodePath: path.join(dataDir, 'node2'),
          password,
          networkConfig: {
            proxyHost: localHost,
            agentHost: localHost,
            clientHost: localHost,
            forwardHost: localHost,
          },
          logger: nodeConnectionManagerLogger,
          keyRingConfig: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        });
        await nodeGraph.setNode(server.keyRing.getNodeId(), {
          host: server.proxy.getProxyHost(),
          port: server.proxy.getProxyPort(),
        } as NodeAddress);
        await server.nodeGraph.setNode(nodeId, nodeAddress);
        const foundAddress2 = await nodeConnectionManager.findNode(nodeId);
        expect(foundAddress2).toStrictEqual(nodeAddress);

        await server.stop();
      } finally {
        await nodeConnectionManager.stop();
        mockedPingNode.mockRestore();
      }
    },
    globalThis.polykeyStartupTimeout,
  );
  test(
    'cannot find node (contacts remote node)',
    async () => {
      // NodeConnectionManager under test
      const nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        nodeGraph,
        proxy,
        taskManager: dummyTaskManager,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      try {
        // Case 3: node exhausts all contacts and cannot find node
        const nodeId = nodeId1;
        const server = await PolykeyAgent.createPolykeyAgent({
          nodePath: path.join(dataDir, 'node3'),
          password,
          networkConfig: {
            proxyHost: localHost,
            agentHost: localHost,
            clientHost: localHost,
            forwardHost: localHost,
          },
          logger: nodeConnectionManagerLogger,
          keyRingConfig: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        });
        await nodeGraph.setNode(server.keyRing.getNodeId(), {
          host: server.proxy.getProxyHost(),
          port: server.proxy.getProxyPort(),
        } as NodeAddress);
        // Add a dummy node to the server node graph database
        // Server will not be able to connect to this node (the only node in its
        // database), and will therefore not be able to locate the node
        await server.nodeGraph.setNode(dummyNodeId, {
          host: '127.0.0.2' as Host,
          port: 22222 as Port,
        } as NodeAddress);
        // Un-findable Node cannot be found
        await expect(nodeConnectionManager.findNode(nodeId)).resolves.toEqual(
          undefined,
        );

        await server.stop();
      } finally {
        await nodeConnectionManager.stop();
      }
    },
    globalThis.failedConnectionTimeout * 2,
  );
  test('receives 20 closest local nodes from connected target', async () => {
    let serverPKAgent: PolykeyAgent | undefined;
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      serverPKAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        logger: logger.getChild('serverPKAgent'),
        nodePath: path.join(dataDir, 'serverPKAgent'),
        networkConfig: {
          proxyHost: localHost,
          agentHost: localHost,
          clientHost: localHost,
          forwardHost: localHost,
        },
        keyRingConfig: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        nodeGraph,
        proxy,
        taskManager: dummyTaskManager,
        logger: logger.getChild('NodeConnectionManager'),
      });

      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      const targetNodeId = serverPKAgent.keyRing.getNodeId();
      await nodeGraph.setNode(targetNodeId, {
        host: serverPKAgent.proxy.getProxyHost(),
        port: serverPKAgent.proxy.getProxyPort(),
      });

      // Now generate and add 20 nodes that will be close to this node ID
      const addedClosestNodes: NodeBucket = [];
      for (let i = 1; i < 101; i += 5) {
        const closeNodeId = testNodesUtils.generateNodeIdForBucket(
          targetNodeId,
          i,
        );
        const nodeAddress = {
          host: (i + '.' + i + '.' + i + '.' + i) as Host,
          port: i as Port,
        };
        await serverPKAgent.nodeGraph.setNode(closeNodeId, nodeAddress);
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
        await serverPKAgent.nodeGraph.setNode(farNodeId, nodeAddress);
      }

      // Get the closest nodes to the target node
      const closest = await nodeConnectionManager.getRemoteNodeClosestNodes(
        targetNodeId,
        targetNodeId,
      );
      // Sort the received nodes on distance such that we can check its equality
      // with addedClosestNodes
      nodesUtils.bucketSortByDistance(closest, targetNodeId);
      expect(closest.length).toBe(20);
      expect(closest).toEqual(addedClosestNodes);
    } finally {
      await serverPKAgent?.stop();
      await nodeConnectionManager?.stop();
    }
  });
  test('sendHolePunchMessage', async () => {
    // NodeConnectionManager under test
    let nodeConnectionManager: NodeConnectionManager | undefined;
    const mockedNodesHolePunchMessageSend = jest.spyOn(
      GRPCClientAgent.prototype,
      'nodesHolePunchMessageSend',
    );
    mockedNodesHolePunchMessageSend.mockResolvedValue(
      new utilsPB.EmptyMessage(),
    );
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        nodeGraph,
        proxy,
        taskManager: dummyTaskManager,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // To test this we need to...
      // 2. call relayHolePunchMessage
      // 3. check that the relevant call was made.
      const sourceNodeId = testNodesUtils.generateRandomNodeId();
      const targetNodeId = testNodesUtils.generateRandomNodeId();
      await nodeConnectionManager.sendSignalingMessage(
        remoteNodeId1,
        sourceNodeId,
        targetNodeId,
        '',
      );

      expect(mockedNodesHolePunchMessageSend).toHaveBeenCalled();
    } finally {
      mockedNodesHolePunchMessageSend.mockRestore();
      await nodeConnectionManager?.stop();
    }
  });
  test('relayHolePunchMessage', async () => {
    // NodeConnectionManager under test
    let nodeConnectionManager: NodeConnectionManager | undefined;
    const mockedNodesHolePunchMessageSend = jest.spyOn(
      GRPCClientAgent.prototype,
      'nodesHolePunchMessageSend',
    );
    mockedNodesHolePunchMessageSend.mockResolvedValue(
      new utilsPB.EmptyMessage(),
    );
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        nodeGraph,
        proxy,
        taskManager: dummyTaskManager,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // To test this we need to...
      // 2. call relayHolePunchMessage
      // 3. check that the relevant call was made.
      const sourceNodeId = testNodesUtils.generateRandomNodeId();
      const relayMessage = new nodesPB.Relay();
      relayMessage.setSrcId(nodesUtils.encodeNodeId(sourceNodeId));
      relayMessage.setTargetId(nodesUtils.encodeNodeId(remoteNodeId1));
      relayMessage.setProxyAddress('');
      await nodeConnectionManager.relaySignalingMessage(relayMessage, {
        host: '' as Host,
        port: 0 as Port,
      });

      expect(mockedNodesHolePunchMessageSend).toHaveBeenCalled();
    } finally {
      mockedNodesHolePunchMessageSend.mockRestore();
      await nodeConnectionManager?.stop();
    }
  });
  test('getClosestGlobalNodes should skip recent offline nodes', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    const mockedPingNode = jest.spyOn(
      NodeConnectionManager.prototype,
      'pingNode',
    );
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        nodeGraph,
        proxy,
        taskManager: dummyTaskManager,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // Check two things,
      // 1. existence of a node in the backoff map
      // 2. getClosestGlobalNodes doesn't try to connect to offline node

      // Add fake data to `NodeGraph`
      await nodeGraph.setNode(nodeId1, {
        host: serverHost,
        port: serverPort,
      });
      await nodeGraph.setNode(nodeId2, {
        host: serverHost,
        port: serverPort,
      });

      // Making pings fail
      mockedPingNode.mockImplementation(
        () => new PromiseCancellable((resolve) => resolve(false)),
      );
      await nodeConnectionManager.getClosestGlobalNodes(nodeId3, false);
      expect(mockedPingNode).toHaveBeenCalled();

      // Nodes 1 and 2 should exist in backoff map
      // @ts-ignore: kidnap protected property
      const backoffMap = nodeConnectionManager.nodesBackoffMap;
      expect(backoffMap.has(nodeId1.toString())).toBeTrue();
      expect(backoffMap.has(nodeId2.toString())).toBeTrue();
      expect(backoffMap.has(nodeId3.toString())).toBeFalse();

      // Next find node should skip offline nodes
      mockedPingNode.mockClear();
      await nodeConnectionManager.getClosestGlobalNodes(nodeId3, true);
      expect(mockedPingNode).not.toHaveBeenCalled();

      // We can try connecting anyway
      mockedPingNode.mockClear();
      await nodeConnectionManager.getClosestGlobalNodes(nodeId3, false);
      expect(mockedPingNode).toHaveBeenCalled();
    } finally {
      mockedPingNode.mockRestore();
      await nodeConnectionManager?.stop();
    }
  });
});
