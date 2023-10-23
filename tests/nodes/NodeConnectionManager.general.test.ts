import type { Host, Port, TLSConfig } from '@/network/types';
import type { NodeId } from '@/ids';
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
import * as nodesErrors from '@/nodes/errors';
import Sigchain from '@/sigchain/Sigchain';
import TaskManager from '@/tasks/TaskManager';
import PolykeyAgent from '@/PolykeyAgent';
import * as utils from '@/utils';
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
  let nodePathA: string;
  let nodePathB: string;

  let remotePolykeyAgentA: PolykeyAgent;
  let serverAddressA: NodeAddress;
  let serverNodeIdA: NodeId;
  let remotePolykeyAgentB: PolykeyAgent;

  let keyRing: KeyRing;
  let db: DB;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let taskManager: TaskManager;

  let nodeConnectionManager: NodeConnectionManager;

  // Mocking the relay send
  let mockedHolePunchReverse: jest.SpyInstance<PromiseCancellable<void>>;
  let mockedPingNode: jest.SpyInstance<PromiseCancellable<boolean>>;

  beforeEach(async () => {
    mockedHolePunchReverse = jest.spyOn(
      NodeConnectionManager.prototype,
      'holePunch',
    );
    mockedPingNode = jest.spyOn(NodeConnectionManager.prototype, 'pingNode');
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    // Setting up remote node
    nodePathA = path.join(dataDir, 'agentA');
    nodePathB = path.join(dataDir, 'agentB');
    remotePolykeyAgentA = await PolykeyAgent.createPolykeyAgent({
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
      logger: logger.getChild('AgentA'),
    });
    serverNodeIdA = remotePolykeyAgentA.keyRing.getNodeId();
    serverAddressA = {
      host: remotePolykeyAgentA.agentServiceHost as Host,
      port: remotePolykeyAgentA.agentServicePort as Port,
      scopes: ['external']
    };
    remotePolykeyAgentB = await PolykeyAgent.createPolykeyAgent({
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
      logger: logger.getChild('AgentB'),
    });

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
  });

  afterEach(async () => {
    logger.info('AFTER EACH');
    mockedHolePunchReverse.mockRestore();
    mockedPingNode.mockRestore();
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
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

    await remotePolykeyAgentA?.stop();
    await remotePolykeyAgentB?.stop();
  });

  test('finds node (local)', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    // Case 1: node already exists in the local node graph (no contact required)
    const nodeId = testNodesUtils.generateRandomNodeId();
    const nodeAddress: NodeAddress = {
      host: localHost as Host,
      port: 11111 as Port,
      scopes: ['external'],
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
      connectionKeepAliveTimeoutTime: 10000,
      connectionKeepAliveIntervalTime: 1000,
      tlsConfig,
      seedNodes: undefined,
    });
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

    await nodeGraph.setNode(serverNodeIdA, serverAddressA);
    // Adding node information to remote node
    const nodeId = testNodesUtils.generateRandomNodeId();
    const nodeAddress: NodeAddress = {
      host: localHost as Host,
      port: 11111 as Port,
      scopes: ['external'],
    };
    await remotePolykeyAgentA.nodeGraph.setNode(nodeId, nodeAddress);

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
      connectionKeepAliveTimeoutTime: 10000,
      connectionKeepAliveIntervalTime: 1000,
      tlsConfig,
      seedNodes: undefined,
    });
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

    await nodeGraph.setNode(serverNodeIdA, serverAddressA);
    // Adding node information to remote node
    const nodeId = testNodesUtils.generateRandomNodeId();

    // Expect no error thrown
    const findNodePromise = nodeConnectionManager.findNode(nodeId);
    await expect(findNodePromise).resolves.toBe(undefined);

    await nodeConnectionManager.stop();
  });
  test('receives 20 closest local nodes from connected target', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionKeepAliveTimeoutTime: 10000,
      connectionKeepAliveIntervalTime: 1000,
      tlsConfig,
      seedNodes: undefined,
    });
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

    await nodeGraph.setNode(serverNodeIdA, serverAddressA);

    // Now generate and add 20 nodes that will be close to this node ID
    const addedClosestNodes: NodeBucket = [];
    for (let i = 1; i < 101; i += 5) {
      const closeNodeId = testNodesUtils.generateNodeIdForBucket(
        serverNodeIdA,
        i,
      );
      const nodeAddress: NodeAddress = {
        host: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
        scopes: ['external'],
      };
      await remotePolykeyAgentA.nodeGraph.setNode(closeNodeId, nodeAddress);
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
      await remotePolykeyAgentA.nodeGraph.setNode(farNodeId, nodeAddress);
    }

    // Get the closest nodes to the target node
    const closest = await nodeConnectionManager.getRemoteNodeClosestNodes(
      serverNodeIdA,
      serverNodeIdA,
    );
    // Sort the received nodes on distance such that we can check its equality
    // with addedClosestNodes
    nodesUtils.bucketSortByDistance(closest, serverNodeIdA);
    expect(closest.length).toBe(20);
    expect(closest).toEqual(addedClosestNodes);

    await nodeConnectionManager.stop();
  });
  test('holePunchSignalRequest with no target node', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionKeepAliveTimeoutTime: 10000,
      connectionKeepAliveIntervalTime: 1000,
      tlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    mockedHolePunchReverse.mockImplementation(() => {
      return new PromiseCancellable<void>((res) => {
        res();
      });
    });

    await nodeGraph.setNode(serverNodeIdA, serverAddressA);

    const targetNodeId = testNodesUtils.generateRandomNodeId();
    const relayNodeId = remotePolykeyAgentA.keyRing.getNodeId();

    await expect(
      nodeConnectionManager.connectionSignalInitial(targetNodeId, relayNodeId),
    ).rejects.toThrow();
    await nodeConnectionManager.stop();
  });
  test('holePunchSignalRequest with target node', async () => {
    // Establish connection between remote A and B
    expect(
      await remotePolykeyAgentA.nodeConnectionManager.pingNode(
        remotePolykeyAgentB.keyRing.getNodeId(),
        [{
          host: remotePolykeyAgentB.agentServiceHost,
          port: remotePolykeyAgentB.agentServicePort,
          scopes: ['external']
        }]
      ),
    ).toBeTrue();

    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionKeepAliveTimeoutTime: 10000,
      connectionKeepAliveIntervalTime: 1000,
      tlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    mockedHolePunchReverse.mockImplementation(() => {
      return new PromiseCancellable<void>((res) => {
        res();
      });
    });

    const serverNodeId = remotePolykeyAgentA.keyRing.getNodeId();
    const serverAddress: NodeAddress = {
      host: remotePolykeyAgentA.agentServiceHost as Host,
      port: remotePolykeyAgentA.agentServicePort as Port,
      scopes: ['external']
    };
    await nodeGraph.setNode(serverNodeId, serverAddress);

    const targetNodeId = remotePolykeyAgentB.keyRing.getNodeId();
    const relayNodeId = remotePolykeyAgentA.keyRing.getNodeId();

    await nodeConnectionManager.connectionSignalInitial(
      targetNodeId,
      relayNodeId,
    );
    // Await the FAF signalling to finish.
    const signalMapA =
      // @ts-ignore: kidnap protected property
      remotePolykeyAgentA.nodeConnectionManager.activeSignalFinalPs;
    for (const p of signalMapA) {
      await p;
    }
    const punchMapB =
      // @ts-ignore: kidnap protected property
      remotePolykeyAgentB.nodeConnectionManager.activeHolePunchPs;
    for await (const [, p] of punchMapB) {
      await p;
    }
    expect(mockedHolePunchReverse).toHaveBeenCalled();
    await nodeConnectionManager.stop();
  });
  test('holePunchSignalRequest is nonblocking', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionKeepAliveTimeoutTime: 10000,
      connectionKeepAliveIntervalTime: 1000,
      tlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    const { p: waitP, resolveP: waitResolveP } = utils.promise<void>();
    mockedHolePunchReverse.mockImplementation(() => {
      return new PromiseCancellable<void>(async (res) => {
        await waitP;
        res();
      });
    });

    const serverNodeId = remotePolykeyAgentA.keyRing.getNodeId();
    const serverAddress: NodeAddress = {
      host: remotePolykeyAgentA.agentServiceHost,
      port: remotePolykeyAgentA.agentServicePort,
      scopes: ['external']
    };
    await nodeGraph.setNode(serverNodeId, serverAddress);
    // Establish connection between remote A and B
    expect(
      await remotePolykeyAgentA.nodeConnectionManager.pingNode(
        remotePolykeyAgentB.keyRing.getNodeId(),
        [{
          host: remotePolykeyAgentB.agentServiceHost,
          port: remotePolykeyAgentB.agentServicePort,
          scopes: ['external']
        }]
      ),
    ).toBeTrue();

    const targetNodeId = remotePolykeyAgentB.keyRing.getNodeId();
    const relayNodeId = remotePolykeyAgentA.keyRing.getNodeId();
    // Creating 5 concurrent attempts
    const holePunchSignalRequests = [1, 2, 3, 4, 5].map(() =>
      nodeConnectionManager.connectionSignalInitial(targetNodeId, relayNodeId),
    );
    // All should resolve immediately and not block
    await Promise.all(holePunchSignalRequests);

    // Await the FAF signalling to finish.
    const signalMapA =
      // @ts-ignore: kidnap protected property
      remotePolykeyAgentA.nodeConnectionManager.activeSignalFinalPs;
    for (const p of signalMapA) {
      await p;
    }
    // Only one attempt is being made
    const punchMapB =
      // @ts-ignore: kidnap protected property
      remotePolykeyAgentB.nodeConnectionManager.activeHolePunchPs;
    expect(punchMapB.size).toBe(1);
    // Allow the attempt to complete
    waitResolveP();
    for await (const [, p] of punchMapB) {
      await p;
    }
    // Only attempted once
    expect(mockedHolePunchReverse).toHaveBeenCalledTimes(1);
    await nodeConnectionManager.stop();
  });
  test('holePunchRequest single target with multiple ports is rate limited', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionKeepAliveTimeoutTime: 10000,
      connectionKeepAliveIntervalTime: 1000,
      tlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    const { p: waitP, resolveP: waitResolveP } = utils.promise<void>();
    mockedHolePunchReverse.mockImplementation(() => {
      return new PromiseCancellable<void>(async (res) => {
        await waitP;
        res();
      });
    });

    nodeConnectionManager.handleNodesConnectionSignalFinal(
      '127.0.0.1' as Host,
      55550 as Port,
    );
    nodeConnectionManager.handleNodesConnectionSignalFinal(
      '127.0.0.1' as Host,
      55551 as Port,
    );
    nodeConnectionManager.handleNodesConnectionSignalFinal(
      '127.0.0.1' as Host,
      55552 as Port,
    );
    nodeConnectionManager.handleNodesConnectionSignalFinal(
      '127.0.0.1' as Host,
      55553 as Port,
    );
    nodeConnectionManager.handleNodesConnectionSignalFinal(
      '127.0.0.1' as Host,
      55554 as Port,
    );
    nodeConnectionManager.handleNodesConnectionSignalFinal(
      '127.0.0.1' as Host,
      55555 as Port,
    );

    // @ts-ignore: protected property
    expect(nodeConnectionManager.activeHolePunchPs.size).toBe(6);
    // @ts-ignore: protected property
    expect(nodeConnectionManager.activeHolePunchAddresses.size).toBe(1);
    waitResolveP();
    // @ts-ignore: protected property
    for await (const [, p] of nodeConnectionManager.activeHolePunchPs) {
      await p;
    }

    // Only attempted once
    expect(mockedHolePunchReverse).toHaveBeenCalledTimes(6);
    await nodeConnectionManager.stop();
  });
  test('holePunchSignalRequest rejects excessive requests', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      connectionKeepAliveTimeoutTime: 10000,
      connectionKeepAliveIntervalTime: 1000,
      tlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost as Host,
    });
    await taskManager.startProcessing();

    mockedHolePunchReverse.mockImplementation(() => {
      return new PromiseCancellable<void>(async (res) => {
        res();
      });
    });

    expect(
      await nodeConnectionManager.pingNode(
        remotePolykeyAgentB.keyRing.getNodeId(),
        [{
          host: remotePolykeyAgentB.agentServiceHost,
          port: remotePolykeyAgentB.agentServicePort,
          scopes: ['external']
        }]
      ),
    ).toBeTrue();
    const keyPair = keysUtils.generateKeyPair();
    const sourceNodeId = keysUtils.publicKeyToNodeId(keyPair.publicKey);
    const targetNodeId = remotePolykeyAgentB.keyRing.getNodeId();
    const data = Buffer.concat([sourceNodeId, targetNodeId]);
    const signature = keysUtils.signWithPrivateKey(keyPair, data);
    expect(() => {
      for (let i = 0; i < 30; i++) {
        nodeConnectionManager.handleNodesConnectionSignalInitial(
          sourceNodeId,
          targetNodeId,
          {
            host: '127.0.0.1' as Host,
            port: 55555 as Port,
            scopes: ['external']
          },
          signature.toString('base64url'),
        );
      }
    }).toThrow(nodesErrors.ErrorNodeConnectionManagerRequestRateExceeded);

    const signalMapA =
      // @ts-ignore: kidnap protected property
      nodeConnectionManager.activeSignalFinalPs;
    for (const p of signalMapA.values()) {
      await p;
    }
    const punchMapB =
      // @ts-ignore: kidnap protected property
      remotePolykeyAgentB.nodeConnectionManager.activeHolePunchPs;
    for (const [, p] of punchMapB) {
      await p;
    }

    await nodeConnectionManager.stop();
  });
  test.todo('Handles reverse streams');
});
