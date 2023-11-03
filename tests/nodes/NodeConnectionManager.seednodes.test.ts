import type { Host, Port, TLSConfig } from '@/network/types';
import type { NodeId, NodeIdEncoded } from '@/ids';
import type { NodeAddress, SeedNodes } from '@/nodes/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { events as quicEvents } from '@matrixai/quic';
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
import * as utils from '@/utils';
import * as testNodesUtils from './utils';
import * as tlsTestUtils from '../utils/tls';

describe(`${NodeConnectionManager.name} seednodes test`, () => {
  const logger = new Logger(`${NodeConnection.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const localHost = '127.0.0.1';
  const testAddress: NodeAddress = {
    host: '127.0.0.1' as Host,
    port: 55555 as Port,
    scopes: ['local'],
  };
  const password = 'password';

  function createPromiseCancellableNop() {
    return () => new PromiseCancellable<void>((resolve) => resolve());
  }

  let dataDir: string;

  let remotePolykeyAgent1: PolykeyAgent;
  let remotePolykeyAgent2: PolykeyAgent;
  let remoteAddress1: NodeAddress;
  let remoteAddress2: NodeAddress;
  let remoteNodeId1: NodeId;
  let remoteNodeId2: NodeId;
  let remoteNodeIdEncoded1: NodeIdEncoded;

  let keyRing: KeyRing;
  let db: DB;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let tlsConfig: TLSConfig;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    // Setting up remote node
    const nodePathA = path.join(dataDir, 'agentA');
    remotePolykeyAgent1 = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath: nodePathA,
        agentServiceHost: localHost,
        clientServiceHost: localHost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger: logger.getChild('Agent1'),
    });
    remoteNodeId1 = remotePolykeyAgent1.keyRing.getNodeId();
    remoteNodeIdEncoded1 = nodesUtils.encodeNodeId(remoteNodeId1);
    remoteAddress1 = {
      host: remotePolykeyAgent1.agentServiceHost,
      port: remotePolykeyAgent1.agentServicePort,
      scopes: ['external'],
    };

    const nodePathB = path.join(dataDir, 'agentB');
    remotePolykeyAgent2 = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath: nodePathB,
        agentServiceHost: localHost,
        clientServiceHost: localHost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger: logger.getChild('Agent2'),
    });
    remoteNodeId2 = remotePolykeyAgent2.keyRing.getNodeId();
    remoteAddress2 = {
      host: remotePolykeyAgent2.agentServiceHost,
      port: remotePolykeyAgent2.agentServicePort,
      scopes: ['external'],
    };

    // Setting up client dependencies
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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

    tlsConfig = await tlsTestUtils.createTLSConfig(keyRing.keyPair);
    tlsConfig = await tlsTestUtils.createTLSConfig(keyRing.keyPair);
  });

  afterEach(async () => {
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
    await taskManager.stop();
    await db.stop();
    await db.destroy();
    await keyRing.stop();
    await keyRing.destroy();

    await remotePolykeyAgent1.stop();
    await remotePolykeyAgent2.stop();
  });

  test('should synchronise nodeGraph', async () => {
    const seedNodes = {
      [remoteNodeIdEncoded1]: remoteAddress1,
    };
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionConnectTimeoutTime: 1000,
      tlsConfig,
      seedNodes,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      connectionConnectTimeoutTime: 1000,
      logger,
    });
    await nodeManager.start();
    // Add seed nodes to the nodeGraph
    const setNodeProms = new Array<Promise<void>>();
    for (const nodeIdEncoded in seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      if (nodeId == null) utils.never();
      const setNodeProm = nodeManager.setNode(
        nodeId,
        seedNodes[nodeIdEncoded],
        true,
      );
      setNodeProms.push(setNodeProm);
    }
    await Promise.all(setNodeProms);

    const dummyNodeId = testNodesUtils.generateRandomNodeId();
    await remotePolykeyAgent1.nodeGraph.setNode(remoteNodeId2, remoteAddress2);

    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    await nodeManager.syncNodeGraph(true, 2000);
    expect(await nodeGraph.getNode(remoteNodeId1)).toBeDefined();
    expect(await nodeGraph.getNode(remoteNodeId2)).toBeDefined();
    expect(await nodeGraph.getNode(dummyNodeId)).toBeUndefined();

    await nodeConnectionManager.stop();
  });
  test('syncNodeGraph handles connection rejections from peer', async () => {
    // Force close connections.
    // @ts-ignore: kidnap protected property
    const quicServer = remotePolykeyAgent1.nodeConnectionManager.quicServer;
    quicServer.addEventListener(
      quicEvents.EventQUICServerConnection.name,
      async (evt: quicEvents.EventQUICServerConnection) => {
        await evt.detail.stop({
          isApp: true,
          errorCode: 42,
          reason: Buffer.from('life the universe and everything'),
          force: true,
        });
      },
    );

    const seedNodes = {
      [remoteNodeIdEncoded1]: remoteAddress1,
    };
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionConnectTimeoutTime: 1000,
      tlsConfig,
      seedNodes,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      connectionConnectTimeoutTime: 1000,
      logger,
    });
    await nodeManager.start();
    // Add seed nodes to the nodeGraph
    const setNodeProms = new Array<Promise<void>>();
    for (const nodeIdEncoded in seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      if (nodeId == null) utils.never();
      const setNodeProm = nodeManager.setNode(
        nodeId,
        seedNodes[nodeIdEncoded],
        true,
      );
      setNodeProms.push(setNodeProm);
    }
    await Promise.all(setNodeProms);

    await remotePolykeyAgent1.nodeGraph.setNode(remoteNodeId2, remoteAddress2);

    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    await nodeManager.syncNodeGraph(true, 2000);

    await nodeConnectionManager.stop();
  });
  test('syncNodeGraph handles own nodeId', async () => {
    const localNodeId = keyRing.getNodeId();
    const seedNodes: SeedNodes = {
      [nodesUtils.encodeNodeId(localNodeId)]: {
        host: '127.0.0.1' as Host,
        port: 55123 as Port,
        scopes: ['external'],
      },
    };
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionConnectTimeoutTime: 1000,
      tlsConfig,
      seedNodes,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      connectionConnectTimeoutTime: 1000,
      logger,
    });
    await nodeManager.start();
    // Add seed nodes to the nodeGraph
    const setNodeProms = new Array<Promise<void>>();
    for (const nodeIdEncoded in seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      if (nodeId == null) utils.never();
      const setNodeProm = nodeManager.setNode(
        nodeId,
        seedNodes[nodeIdEncoded],
        true,
        true,
      );
      setNodeProms.push(setNodeProm);
    }
    await Promise.all(setNodeProms);

    await nodeConnectionManager.start({
      host: localHost as Host,
      port: 55123 as Port,
    });
    await taskManager.startProcessing();

    // Completes without error
    await nodeManager.syncNodeGraph(true, 2000);

    await nodeConnectionManager.stop();
  });
  test('syncNodeGraph handles offline seed node', async () => {
    const seedNodes: SeedNodes = {
      [nodesUtils.encodeNodeId(remoteNodeId2)]: {
        host: '127.0.0.1' as Host,
        port: 55124 as Port,
        scopes: ['external'],
      },
    };
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionConnectTimeoutTime: 1000,
      tlsConfig,
      seedNodes,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      connectionConnectTimeoutTime: 1000,
      logger,
    });
    await nodeManager.start();
    // Add seed nodes to the nodeGraph
    const setNodeProms = new Array<Promise<void>>();
    for (const nodeIdEncoded in seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      if (nodeId == null) utils.never();
      const setNodeProm = nodeManager.setNode(
        nodeId,
        seedNodes[nodeIdEncoded],
        true,
        true,
      );
      setNodeProms.push(setNodeProm);
    }
    await Promise.all(setNodeProms);

    await nodeConnectionManager.start({
      host: localHost as Host,
      port: 55123 as Port,
    });
    await taskManager.startProcessing();

    // Completes without error
    await nodeManager.syncNodeGraph(true, 2000);

    await nodeConnectionManager.stop();
  });
  test('should call refreshBucket when syncing nodeGraph', async () => {
    const seedNodes = {
      [remoteNodeIdEncoded1]: remoteAddress1,
    };
    const mockedRefreshBucket = jest.spyOn(
      NodeManager.prototype,
      'refreshBucket',
    );
    mockedRefreshBucket.mockImplementation(createPromiseCancellableNop());
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionConnectTimeoutTime: 1000,
      tlsConfig,
      seedNodes,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      connectionConnectTimeoutTime: 1000,
      logger,
    });
    await nodeManager.start();
    // Add seed nodes to the nodeGraph
    const setNodeProms = new Array<Promise<void>>();
    for (const nodeIdEncoded in seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      if (nodeId == null) utils.never();
      const setNodeProm = nodeManager.setNode(
        nodeId,
        seedNodes[nodeIdEncoded],
        true,
      );
      setNodeProms.push(setNodeProm);
    }
    await Promise.all(setNodeProms);
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    await remotePolykeyAgent1.nodeGraph.setNode(remoteNodeId2, remoteAddress2);

    await nodeManager.syncNodeGraph(true, 100);
    expect(mockedRefreshBucket).toHaveBeenCalled();

    await nodeConnectionManager.stop();
  });
  test('should handle an offline seed node when synchronising nodeGraph', async () => {
    const randomNodeId1 = testNodesUtils.generateRandomNodeId();
    const randomNodeId2 = testNodesUtils.generateRandomNodeId();
    await remotePolykeyAgent1.nodeGraph.setNode(randomNodeId1, testAddress);
    await remotePolykeyAgent1.nodeGraph.setNode(remoteNodeId2, remoteAddress2);
    await remotePolykeyAgent2.nodeGraph.setNode(randomNodeId2, testAddress);
    const mockedRefreshBucket = jest.spyOn(
      NodeManager.prototype,
      'refreshBucket',
    );
    mockedRefreshBucket.mockImplementation(createPromiseCancellableNop());

    const seedNodes = {
      [remoteNodeIdEncoded1]: remoteAddress1,
    };
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionConnectTimeoutTime: 1000,
      tlsConfig,
      seedNodes,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      connectionConnectTimeoutTime: 1000,
      logger,
    });
    await nodeManager.start();
    // Add seed nodes to the nodeGraph
    const setNodeProms = new Array<Promise<void>>();
    for (const nodeIdEncoded in seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      if (nodeId == null) utils.never();
      const setNodeProm = nodeManager.setNode(
        nodeId,
        seedNodes[nodeIdEncoded],
        true,
      );
      setNodeProms.push(setNodeProm);
    }
    await Promise.all(setNodeProms);
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    // This should complete without error
    await nodeManager.syncNodeGraph(true, 2000, {
      timer: 15000,
    });
    // Information on remotes are found
    expect(await nodeGraph.getNode(remoteNodeId1)).toBeDefined();
    expect(await nodeGraph.getNode(remoteNodeId2)).toBeDefined();

    await nodeConnectionManager.stop();
  });
  test('should expand the network when nodes enter', async () => {
    const mockedRefreshBucket = jest.spyOn(
      NodeManager.prototype,
      'refreshBucket',
    );
    mockedRefreshBucket.mockImplementation(createPromiseCancellableNop());
    const seedNodes = {
      [remoteNodeIdEncoded1]: remoteAddress1,
    };
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionConnectTimeoutTime: 1000,
      tlsConfig,
      seedNodes,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      connectionConnectTimeoutTime: 1000,
      logger,
    });
    await nodeManager.start();
    // Add seed nodes to the nodeGraph
    const setNodeProms = new Array<Promise<void>>();
    for (const nodeIdEncoded in seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      if (nodeId == null) utils.never();
      const setNodeProm = nodeManager.setNode(
        nodeId,
        seedNodes[nodeIdEncoded],
        true,
      );
      setNodeProms.push(setNodeProm);
    }
    await Promise.all(setNodeProms);
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    await remotePolykeyAgent1.nodeGraph.setNode(remoteNodeId2, remoteAddress2);

    // We expect the following to happen
    // 1. local asks remote 1 for list, remote1 returns information about remote 2
    // 2. local attempts a ping to remote 2 and forms a connection
    // 3. due to connection establishment local and remote 2 add each others information to their node graph

    await nodeManager.syncNodeGraph(true, 500);
    // Local and remote nodes should know each other now
    expect(await nodeGraph.getNode(remoteNodeId2)).toBeDefined();
    expect(
      await remotePolykeyAgent2.nodeGraph.getNode(keyRing.getNodeId()),
    ).toBeDefined();

    await nodeConnectionManager.stop();
  });
  test('refreshBucket delays should be reset after finding less than 20 nodes', async () => {
    const seedNodes = {
      [remoteNodeIdEncoded1]: remoteAddress1,
    };
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionConnectTimeoutTime: 1000,
      tlsConfig,
      seedNodes,
    });
    nodeManager = new NodeManager({
      db,
      gestaltGraph,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      connectionConnectTimeoutTime: 1000,
      logger,
    });
    await nodeManager.start();
    // Add seed nodes to the nodeGraph
    const setNodeProms = new Array<Promise<void>>();
    for (const nodeIdEncoded in seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      if (nodeId == null) utils.never();
      const setNodeProm = nodeManager.setNode(
        nodeId,
        seedNodes[nodeIdEncoded],
        true,
      );
      setNodeProms.push(setNodeProm);
    }
    await Promise.all(setNodeProms);
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    // Reset all the refresh bucket timers to a distinct time
    for (
      let bucketIndex = 0;
      bucketIndex < nodeGraph.nodeIdBits;
      bucketIndex++
    ) {
      await nodeManager.updateRefreshBucketDelay(bucketIndex, 10000, true);
    }

    // Trigger a refreshBucket
    await nodeManager.refreshBucket(1);

    for await (const task of taskManager.getTasks('asc', true, [
      'refreshBucket',
    ])) {
      expect(task.delay).toBeGreaterThanOrEqual(50000);
    }

    await nodeConnectionManager.stop();
  });
});
