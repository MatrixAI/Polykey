import type { NodeId, NodeIdEncoded, SeedNodes } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import type { Sigchain } from '@/sigchain';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DB } from '@matrixai/db';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { Timer } from '@matrixai/timer';
import NodeManager from '@/nodes/NodeManager';
import PolykeyAgent from '@/PolykeyAgent';
import KeyManager from '@/keys/KeyManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import Proxy from '@/network/Proxy';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as grpcUtils from '@/grpc/utils';
import TaskManager from '@/tasks/TaskManager';
import { sleep } from '@/utils/index';
import { globalRootKeyPems } from '../fixtures/globalRootKeyPems';

describe(`${NodeConnectionManager.name} seed nodes test`, () => {
  const logger = new Logger(
    `${NodeConnectionManager.name} test`,
    LogLevel.WARN,
    [new StreamHandler()],
  );
  grpcUtils.setLogger(logger.getChild('grpc'));

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

  let dataDir: string;
  let dataDir2: string;
  let keyManager: KeyManager;
  let db: DB;
  let proxy: Proxy;

  let nodeGraph: NodeGraph;

  let remoteNode1: PolykeyAgent;
  let remoteNode2: PolykeyAgent;
  let remoteNodeId1: NodeId;
  let remoteNodeId2: NodeId;

  let taskManager: TaskManager;
  const dummyNodeManager = {
    setNode: jest.fn(),
    refreshBucketQueueAdd: jest.fn(),
  } as unknown as NodeManager;

  function createPromiseCancellable<T>(result: T) {
    return () => new PromiseCancellable<T>((resolve) => resolve(result));
  }

  function createPromiseCancellableNop() {
    return () => new PromiseCancellable<void>((resolve) => resolve());
  }

  beforeAll(async () => {
    dataDir2 = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    // Creating remotes, they just exist to start connections or fail them if needed
    remoteNode1 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir2, 'remoteNode1'),
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
      logger: logger.getChild('remoteNode1'),
    });
    remoteNodeId1 = remoteNode1.keyManager.getNodeId();
    remoteNode2 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir2, 'remoteNode2'),
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[1],
      },
      logger: logger.getChild('remoteNode2'),
    });
    remoteNodeId2 = remoteNode2.keyManager.getNodeId();
  });

  afterAll(async () => {
    await remoteNode1.stop();
    await remoteNode1.destroy();
    await remoteNode2.stop();
    await remoteNode2.destroy();
    await fs.promises.rm(dataDir2, { force: true, recursive: true });
  });

  beforeEach(async () => {
    // Clearing nodes from graphs
    for await (const [nodeId] of remoteNode1.nodeGraph.getNodes()) {
      await remoteNode1.nodeGraph.unsetNode(nodeId);
    }
    for await (const [nodeId] of remoteNode2.nodeGraph.getNodes()) {
      await remoteNode2.nodeGraph.unsetNode(nodeId);
    }
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      privateKeyPemOverride: globalRootKeyPems[2],
      logger: logger.getChild('keyManager'),
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger: logger,
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger: logger.getChild('taskManager'),
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger: logger.getChild('NodeGraph'),
    });
    const tlsConfig = {
      keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
      certChainPem: keysUtils.certToPem(keyManager.getRootCert()),
    };
    proxy = new Proxy({
      authToken: 'auth',
      logger: logger.getChild('proxy'),
    });
    await proxy.start({
      serverHost,
      serverPort,
      proxyHost: localHost,
      tlsConfig,
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
    await nodeGraph.destroy();
    await db.stop();
    await db.destroy();
    await keyManager.stop();
    await keyManager.destroy();
    await proxy.stop();
    await taskManager.stop();
  });

  // Seed nodes
  test('starting should add seed nodes to the node graph', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let nodeManager: NodeManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        taskManager,
        seedNodes: dummySeedNodes,
        logger: logger,
      });
      nodeManager = new NodeManager({
        db,
        keyManager,
        logger,
        nodeConnectionManager,
        nodeGraph,
        taskManager,
        sigchain: {} as Sigchain,
      });
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      const seedNodes = nodeConnectionManager.getSeedNodes();
      expect(seedNodes).toContainEqual(nodeId1);
      expect(seedNodes).toContainEqual(nodeId2);
      expect(seedNodes).toContainEqual(nodeId3);
      expect(await nodeGraph.getNode(seedNodes[0])).toBeDefined();
      expect(await nodeGraph.getNode(seedNodes[1])).toBeDefined();
      expect(await nodeGraph.getNode(seedNodes[2])).toBeDefined();
      expect(await nodeGraph.getNode(dummyNodeId)).toBeUndefined();
    } finally {
      // Clean up
      await nodeConnectionManager?.stop();
      await taskManager.stopProcessing();
      await nodeManager?.stop();
    }
  });
  test('should get seed nodes', async () => {
    // NodeConnectionManager under test
    const nodeConnectionManager = new NodeConnectionManager({
      keyManager,
      nodeGraph,
      proxy,
      taskManager,
      seedNodes: dummySeedNodes,
      logger: logger,
    });
    await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
    try {
      const seedNodes = nodeConnectionManager.getSeedNodes();
      expect(seedNodes).toHaveLength(3);
      expect(seedNodes).toContainEqual(nodeId1);
      expect(seedNodes).toContainEqual(nodeId2);
      expect(seedNodes).toContainEqual(nodeId3);
    } finally {
      await nodeConnectionManager.stop();
    }
  });
  test('should synchronise nodeGraph', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let nodeManager: NodeManager | undefined;
    const mockedRefreshBucket = jest.spyOn(
      NodeManager.prototype,
      'refreshBucket',
    );
    mockedRefreshBucket.mockImplementation(createPromiseCancellableNop());
    const mockedPingNode = jest.spyOn(
      NodeConnectionManager.prototype,
      'pingNode',
    );
    mockedPingNode.mockImplementation(createPromiseCancellable(true));
    try {
      const seedNodes: SeedNodes = {};
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId1)] = {
        host: remoteNode1.proxy.getProxyHost(),
        port: remoteNode1.proxy.getProxyPort(),
      };
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId2)] = {
        host: remoteNode2.proxy.getProxyHost(),
        port: remoteNode2.proxy.getProxyPort(),
      };
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        taskManager,
        seedNodes,
        logger: logger,
      });
      nodeManager = new NodeManager({
        db,
        keyManager,
        logger,
        nodeConnectionManager,
        nodeGraph,
        taskManager,
        sigchain: {} as Sigchain,
      });
      await nodeManager.start();
      await remoteNode1.nodeGraph.setNode(nodeId1, {
        host: serverHost,
        port: serverPort,
      });
      await remoteNode2.nodeGraph.setNode(nodeId2, {
        host: serverHost,
        port: serverPort,
      });
      await nodeConnectionManager.start({ nodeManager });
      await taskManager.startProcessing();
      await nodeManager.syncNodeGraph(true, 2000);
      expect(await nodeGraph.getNode(nodeId1)).toBeDefined();
      expect(await nodeGraph.getNode(nodeId2)).toBeDefined();
      expect(await nodeGraph.getNode(dummyNodeId)).toBeUndefined();
    } finally {
      mockedRefreshBucket.mockRestore();
      mockedPingNode.mockRestore();
      await taskManager.stopProcessing();
      await nodeManager?.stop();
      await nodeConnectionManager?.stop();
    }
  });
  test('should call refreshBucket when syncing nodeGraph', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let nodeManager: NodeManager | undefined;
    const mockedRefreshBucket = jest.spyOn(
      NodeManager.prototype,
      'refreshBucket',
    );
    mockedRefreshBucket.mockImplementation(createPromiseCancellableNop());
    const mockedPingNode = jest.spyOn(
      NodeConnectionManager.prototype,
      'pingNode',
    );
    mockedPingNode.mockImplementation(createPromiseCancellable(true));
    try {
      const seedNodes: SeedNodes = {};
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId1)] = {
        host: remoteNode1.proxy.getProxyHost(),
        port: remoteNode1.proxy.getProxyPort(),
      };
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId2)] = {
        host: remoteNode2.proxy.getProxyHost(),
        port: remoteNode2.proxy.getProxyPort(),
      };
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        taskManager,
        seedNodes,
        logger: logger,
      });
      nodeManager = new NodeManager({
        db,
        keyManager,
        logger,
        nodeConnectionManager,
        nodeGraph,
        sigchain: {} as Sigchain,
        taskManager,
      });
      await nodeManager.start();
      await remoteNode1.nodeGraph.setNode(nodeId1, {
        host: serverHost,
        port: serverPort,
      });
      await remoteNode2.nodeGraph.setNode(nodeId2, {
        host: serverHost,
        port: serverPort,
      });
      await nodeConnectionManager.start({ nodeManager });
      await taskManager.startProcessing();
      await nodeManager.syncNodeGraph(true, 2000);
      await sleep(1000);
      expect(mockedRefreshBucket).toHaveBeenCalled();
    } finally {
      mockedRefreshBucket.mockRestore();
      mockedPingNode.mockRestore();
      await taskManager.stopProcessing();
      await nodeManager?.stop();
      await nodeConnectionManager?.stop();
    }
  });
  test('should handle an offline seed node when synchronising nodeGraph', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    let nodeManager: NodeManager | undefined;
    const mockedRefreshBucket = jest.spyOn(
      NodeManager.prototype,
      'refreshBucket',
    );
    mockedRefreshBucket.mockImplementation(createPromiseCancellableNop());
    const mockedPingNode = jest.spyOn(
      NodeConnectionManager.prototype,
      'pingNode',
    );
    mockedPingNode.mockImplementation((nodeId: NodeId) => {
      if (dummyNodeId.equals(nodeId)) return createPromiseCancellable(false)();
      return createPromiseCancellable(true)();
    });
    try {
      const seedNodes: SeedNodes = {};
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId1)] = {
        host: remoteNode1.proxy.getProxyHost(),
        port: remoteNode1.proxy.getProxyPort(),
      };
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId2)] = {
        host: remoteNode2.proxy.getProxyHost(),
        port: remoteNode2.proxy.getProxyPort(),
      };
      seedNodes[nodesUtils.encodeNodeId(dummyNodeId)] = {
        host: serverHost,
        port: serverPort,
      };
      // Adding information to remotes to find
      await remoteNode1.nodeGraph.setNode(nodeId1, {
        host: serverHost,
        port: serverPort,
      });
      await remoteNode2.nodeGraph.setNode(nodeId2, {
        host: serverHost,
        port: serverPort,
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        taskManager,
        seedNodes,
        connConnectTime: 500,
        logger: logger,
      });
      nodeManager = new NodeManager({
        db,
        keyManager,
        logger,
        nodeConnectionManager,
        nodeGraph,
        sigchain: {} as Sigchain,
        taskManager,
      });
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      await taskManager.startProcessing();
      // This should complete without error
      await nodeManager.syncNodeGraph(true, 5000, {
        timer: new Timer({ delay: 20000 }),
      });
      // Information on remotes are found
      expect(await nodeGraph.getNode(nodeId1)).toBeDefined();
      expect(await nodeGraph.getNode(nodeId2)).toBeDefined();
    } finally {
      mockedRefreshBucket.mockRestore();
      mockedPingNode.mockRestore();
      await nodeConnectionManager?.stop();
      await taskManager.stopProcessing();
      await nodeManager?.stop();
    }
  });
  test(
    'should expand the network when nodes enter',
    async () => {
      // Using a single seed node we need to check that each entering node adds itself to the seed node.
      // Also need to check that the new nodes can be seen in the network.
      let node1: PolykeyAgent | undefined;
      let node2: PolykeyAgent | undefined;
      const seedNodes: SeedNodes = {};
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId1)] = {
        host: remoteNode1.proxy.getProxyHost(),
        port: remoteNode1.proxy.getProxyPort(),
      };
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId2)] = {
        host: remoteNode2.proxy.getProxyHost(),
        port: remoteNode2.proxy.getProxyPort(),
      };
      const mockedPingNode = jest.spyOn(
        NodeConnectionManager.prototype,
        'pingNode',
      );
      mockedPingNode.mockImplementation(createPromiseCancellable(true));
      try {
        node1 = await PolykeyAgent.createPolykeyAgent({
          nodePath: path.join(dataDir, 'node1'),
          password: 'password',
          networkConfig: {
            proxyHost: localHost,
            agentHost: localHost,
            clientHost: localHost,
            forwardHost: localHost,
          },
          keysConfig: {
            privateKeyPemOverride: globalRootKeyPems[3],
          },
          seedNodes,
          logger,
        });
        node2 = await PolykeyAgent.createPolykeyAgent({
          nodePath: path.join(dataDir, 'node2'),
          password: 'password',
          networkConfig: {
            proxyHost: localHost,
            agentHost: localHost,
            clientHost: localHost,
            forwardHost: localHost,
          },
          keysConfig: {
            privateKeyPemOverride: globalRootKeyPems[4],
          },
          seedNodes,
          logger,
        });

        await node1.nodeManager.syncNodeGraph(true, 2000);
        await node2.nodeManager.syncNodeGraph(true, 2000);

        const getAllNodes = async (node: PolykeyAgent) => {
          const nodes: Array<NodeIdEncoded> = [];
          for await (const [nodeId] of node.nodeGraph.getNodes()) {
            nodes.push(nodesUtils.encodeNodeId(nodeId));
          }
          return nodes;
        };
        const rNode1Nodes = await getAllNodes(remoteNode1);
        const rNode2Nodes = await getAllNodes(remoteNode2);
        const node1Nodes = await getAllNodes(node1);
        const node2Nodes = await getAllNodes(node2);

        const nodeIdR1 = nodesUtils.encodeNodeId(remoteNodeId1);
        const nodeIdR2 = nodesUtils.encodeNodeId(remoteNodeId2);
        const nodeId1 = nodesUtils.encodeNodeId(node1.keyManager.getNodeId());
        const nodeId2 = nodesUtils.encodeNodeId(node2.keyManager.getNodeId());
        expect(rNode1Nodes).toContain(nodeId1);
        expect(rNode1Nodes).toContain(nodeId2);
        expect(rNode2Nodes).toContain(nodeId1);
        expect(rNode2Nodes).toContain(nodeId2);
        expect(node1Nodes).toContain(nodeIdR1);
        expect(node1Nodes).toContain(nodeIdR2);
        expect(node1Nodes).toContain(nodeId2);
        expect(node2Nodes).toContain(nodeIdR1);
        expect(node2Nodes).toContain(nodeIdR2);
        expect(node2Nodes).toContain(nodeId1);
      } finally {
        mockedPingNode.mockRestore();
        await node1?.stop();
        await node1?.destroy();
        await node2?.stop();
        await node2?.destroy();
      }
    },
    globalThis.defaultTimeout * 2,
  );
  test(
    'refreshBucket delays should be reset after finding less than 20 nodes',
    async () => {
      // Using a single seed node we need to check that each entering node adds itself to the seed node.
      // Also need to check that the new nodes can be seen in the network.
      let node1: PolykeyAgent | undefined;
      const seedNodes: SeedNodes = {};
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId1)] = {
        host: remoteNode1.proxy.getProxyHost(),
        port: remoteNode1.proxy.getProxyPort(),
      };
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId2)] = {
        host: remoteNode2.proxy.getProxyHost(),
        port: remoteNode2.proxy.getProxyPort(),
      };
      const mockedPingNode = jest.spyOn(
        NodeConnectionManager.prototype,
        'pingNode',
      );
      mockedPingNode.mockImplementation(createPromiseCancellable(true));
      try {
        node1 = await PolykeyAgent.createPolykeyAgent({
          nodePath: path.join(dataDir, 'node1'),
          password: 'password',
          networkConfig: {
            proxyHost: localHost,
            agentHost: localHost,
            clientHost: localHost,
            forwardHost: localHost,
          },
          keysConfig: {
            privateKeyPemOverride: globalRootKeyPems[3],
          },
          seedNodes,
          logger,
        });

        // Reset all the refresh bucket timers to a distinct time
        for (
          let bucketIndex = 0;
          bucketIndex < node1.nodeGraph.nodeIdBits;
          bucketIndex++
        ) {
          await node1.nodeManager.updateRefreshBucketDelay(
            bucketIndex,
            10000,
            true,
          );
        }

        // Trigger a refreshBucket
        await node1.nodeManager.refreshBucket(1);

        for await (const task of node1.taskManager.getTasks('asc', true, [
          'refreshBucket',
        ])) {
          expect(task.delay).toBeGreaterThanOrEqual(50000);
        }
      } finally {
        mockedPingNode.mockRestore();
        await node1?.stop();
        await node1?.destroy();
      }
    },
    globalThis.defaultTimeout * 2,
  );
});
