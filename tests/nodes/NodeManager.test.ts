import type { Host, Port } from '@/network/types';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import type nodeGraph from '@/nodes/NodeGraph';
import type { NCMState } from './utils';
import type { NodeAddress, NodeContactAddressData } from '@/nodes/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Semaphore } from '@matrixai/async-locks';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import NodeGraph from '@/nodes/NodeGraph';
import {
  NodesClaimsGet,
  NodesClosestActiveConnectionsGet,
  NodesClosestLocalNodesGet,
} from '@/nodes/agent/handlers';
import * as keysUtils from '@/keys/utils';
import * as nodesErrors from '@/nodes/errors';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodesConnectionSignalFinal from '@/nodes/agent/handlers/NodesConnectionSignalFinal';
import NodesConnectionSignalInitial from '@/nodes/agent/handlers/NodesConnectionSignalInitial';
import * as nodesUtils from '@/nodes/utils';
import { TaskManager } from '@/tasks';
import { NodeConnection, NodeManager } from '@/nodes';
import { GestaltGraph } from '@/gestalts';
import { Sigchain } from '@/sigchain';
import { KeyRing } from '@/keys';
import NodeConnectionQueue from '@/nodes/NodeConnectionQueue';
import * as utils from '@/utils';
import { generateNodeIdForBucket } from './utils';
import * as nodesTestUtils from './utils';
import ACL from '../../src/acl/ACL';
import * as testsUtils from '../utils';
import NodesCrossSignClaim from '../../src/nodes/agent/handlers/NodesCrossSignClaim';

describe(`${NodeManager.name}`, () => {
  const logger = new Logger(`${NodeManager.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'password';
  const localHost = '127.0.0.1' as Host;
  const timeoutTime = 300;

  let dataDir: string;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('NodeManager readiness', async () => {
    let db: DB | undefined;
    let taskManager: TaskManager | undefined;
    let nodeManager: NodeManager | undefined;
    try {
      // Creating dependencies
      const dbPath = path.join(dataDir, 'db');
      db = await DB.createDB({
        dbPath,
        logger: logger.getChild(DB.name),
      });
      taskManager = await TaskManager.createTaskManager({
        db,
        logger: logger.getChild(TaskManager.name),
      });

      // Creating NodeManager
      nodeManager = new NodeManager({
        db,
        gestaltGraph: {} as GestaltGraph,
        keyRing: {} as KeyRing,
        nodeConnectionManager: {
          addEventListener: (..._args) => {},
          removeEventListener: (..._args) => {},
        } as NodeConnectionManager,
        nodeGraph: {} as nodeGraph,
        sigchain: {} as Sigchain,
        taskManager,
        logger: logger.getChild(NodeManager.name),
      });
      await nodeManager.start();
      await nodeManager.stop();
      // Await expect(async () => {
      //   await nodeManager.setNode(testsNodesUtils.generateRandomNodeId(), {
      //     host: '127.0.0.1' as Host,
      //     port: 55555 as Port,
      //     scopes: ['local'],
      //   });
      // }).rejects.toThrow(nodesErrors.ErrorNodeManagerNotRunning);
      await nodeManager.start();
      await nodeManager.stop();
    } finally {
      await db?.stop();
      await taskManager?.stop();
      await nodeManager?.stop();
    }
  });
  describe('with NodeManager', () => {
    const nodeAddress: NodeAddress = [localHost, 55555 as Port];
    const nodeContactAddressData: NodeContactAddressData = {
      mode: 'direct',
      connectedTime: 0,
      scopes: ['global'],
    };

    let basePath: string;
    let keyRing: KeyRing;
    let db: DB;
    let acl: ACL;
    let sigchain: Sigchain;
    let gestaltGraph: GestaltGraph;
    let nodeGraph: NodeGraph;
    let nodeConnectionManager: NodeConnectionManager;
    let taskManager: TaskManager;
    let nodeManager: NodeManager;

    beforeEach(async () => {
      basePath = path.join(dataDir, 'local');
      const keysPath = path.join(basePath, 'keys');
      keyRing = await KeyRing.createKeyRing({
        password,
        keysPath,
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
        logger: logger.getChild(KeyRing.name),
      });
      const dbPath = path.join(basePath, 'db');
      db = await DB.createDB({
        dbPath,
        logger: logger.getChild(DB.name),
      });
      acl = await ACL.createACL({
        db,
        logger: logger.getChild(ACL.name),
      });
      sigchain = await Sigchain.createSigchain({
        db,
        keyRing,
        logger: logger.getChild(Sigchain.name),
      });
      gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger: logger.getChild(GestaltGraph.name),
      });
      nodeGraph = await NodeGraph.createNodeGraph({
        db,
        keyRing,
        logger: logger.getChild(NodeGraph.name),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        tlsConfig: await testsUtils.createTLSConfig(keyRing.keyPair),
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      await nodeConnectionManager.start({
        agentService: {} as AgentServerManifest,
        host: localHost,
      });
      taskManager = await TaskManager.createTaskManager({
        db,
        logger: logger.getChild(TaskManager.name),
      });

      nodeManager = new NodeManager({
        db,
        keyRing,
        gestaltGraph,
        nodeGraph,
        nodeConnectionManager,
        sigchain,
        taskManager,
        logger: logger.getChild(NodeManager.name),
      });
      await nodeManager.start();
    });
    afterEach(async () => {
      await taskManager.stopProcessing();
      await taskManager.stopTasks();
      await nodeManager.stop();
      await nodeConnectionManager.stop();
      await nodeGraph.stop();
      await gestaltGraph.stop();
      await sigchain.stop();
      await acl.stop();
      await db.stop();
      await keyRing.stop();
      await taskManager.stop();
      await fs.promises.rm(basePath, {
        force: true,
        recursive: true,
      });
    });

    test('stopping NodeManager should cancel all tasks', async () => {
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
      expect(nodeManager.gcBucketHandlerId).toEqual(
        'NodeManager.gcBucketHandler',
      );
      expect(nodeManager.refreshBucketHandlerId).toEqual(
        'NodeManager.refreshBucketHandler',
      );
      expect(nodeManager.checkConnectionsHandlerId).toEqual(
        'NodeManager.checkConnectionsHandler',
      );
      expect(nodeManager.syncNodeGraphHandlerId).toEqual(
        'NodeManager.syncNodeGraphHandler',
      );
    });
    test('should add a node', async () => {
      const nodeId = nodesTestUtils.generateRandomNodeId();
      await nodeManager.setNode(nodeId, nodeAddress, nodeContactAddressData);
      // Node should be added
      expect(await nodeGraph.getNodeContact(nodeId)).toBeDefined();
    });
    test('should update node if exists', async () => {
      const nodeId = nodesTestUtils.generateRandomNodeId();
      await nodeManager.setNode(nodeId, nodeAddress, nodeContactAddressData);
      const nodeContactFirst = JSON.stringify(
        await nodeGraph.getNodeContact(nodeId),
      );
      await nodeManager.setNode(nodeId, [localHost, 55555 as Port], {
        mode: 'signal',
        connectedTime: 0,
        scopes: ['global'],
      });
      const nodeContactSecond = JSON.stringify(
        await nodeGraph.getNodeContact(nodeId),
      );
      expect(nodeContactFirst).not.toBe(nodeContactSecond);
      expect(nodeContactSecond);
    });
    test('should not add new node if bucket is full and old nodes are responsive', async () => {
      const mockedPingNode = jest.spyOn(nodeManager, 'pingNode');
      // Fill bucket
      const nodeId = generateNodeIdForBucket(keyRing.getNodeId(), 255, 0);
      for (let i = 0; i < 20; i++) {
        const nodeId = generateNodeIdForBucket(keyRing.getNodeId(), 255, i + 1);
        await nodeManager.setNode(nodeId, [localHost, 55555 as Port], {
          mode: 'direct',
          connectedTime: 0,
          scopes: ['global'],
        });
      }

      mockedPingNode.mockResolvedValue([nodeAddress, nodeContactAddressData]);
      // Add 21st node
      await nodeManager.setNode(
        nodeId,
        nodeAddress,
        nodeContactAddressData,
        true,
      );

      expect(await nodeGraph.getNodeContact(nodeId)).toBeUndefined();
    });
    test('should add new node if bucket is full and old nodes are responsive but force is set', async () => {
      const mockedPingNode = jest.spyOn(nodeManager, 'pingNode');
      // Fill bucket
      const nodeId = generateNodeIdForBucket(keyRing.getNodeId(), 255, 0);
      for (let i = 0; i < 20; i++) {
        const nodeId = generateNodeIdForBucket(keyRing.getNodeId(), 255, i + 1);
        await nodeManager.setNode(nodeId, [localHost, 55555 as Port], {
          mode: 'direct',
          connectedTime: 0,
          scopes: ['global'],
        });
      }

      mockedPingNode.mockResolvedValue([nodeAddress, nodeContactAddressData]);
      // Add 21st node
      await nodeManager.setNode(
        nodeId,
        nodeAddress,
        nodeContactAddressData,
        true,
        true,
      );

      expect(await nodeGraph.getNodeContact(nodeId)).toBeDefined();
    });
    test('should add new node if bucket is full and old nodes are unresponsive', async () => {
      const mockedPingNode = jest.spyOn(nodeManager, 'pingNode');
      // Fill bucket
      const nodeId = generateNodeIdForBucket(keyRing.getNodeId(), 255, 0);
      for (let i = 0; i < 20; i++) {
        const nodeId = generateNodeIdForBucket(keyRing.getNodeId(), 255, i + 1);
        await nodeManager.setNode(nodeId, nodeAddress, nodeContactAddressData);
      }

      mockedPingNode.mockResolvedValue(undefined);
      // Add 21st node
      await nodeManager.setNode(
        nodeId,
        nodeAddress,
        nodeContactAddressData,
        true,
      );

      expect(await nodeGraph.getNodeContact(nodeId)).toBeDefined();
    });
    test('should not block when bucket is full', async () => {
      const mockedPingNode = jest.spyOn(nodeManager, 'pingNode');
      // Fill bucket
      const nodeId = generateNodeIdForBucket(keyRing.getNodeId(), 255, 0);
      for (let i = 0; i < 20; i++) {
        const nodeId = generateNodeIdForBucket(keyRing.getNodeId(), 255, i + 1);
        await nodeManager.setNode(nodeId, [localHost, 55555 as Port], {
          mode: 'direct',
          connectedTime: 0,
          scopes: ['global'],
        });
      }

      const { p: waitP, resolveP: waitResolveP } = utils.promise<void>();

      mockedPingNode.mockImplementation(() => {
        return new PromiseCancellable(async (resolve) => {
          await waitP;
          resolve(undefined);
        });
      });
      // Add 21st node
      // Should not time out
      await nodeManager.setNode(nodeId, nodeAddress, nodeContactAddressData);
      waitResolveP();
    });
  });
  describe('with 1 peer', () => {
    let basePath: string;
    let keyRing: KeyRing;
    let db: DB;
    let acl: ACL;
    let sigchain: Sigchain;
    let gestaltGraph: GestaltGraph;
    let nodeGraph: NodeGraph;
    let nodeConnectionManager: NodeConnectionManager;
    let taskManager: TaskManager;
    let nodeManager: NodeManager;

    let basePathPeer: string;
    let keyRingPeer: KeyRing;
    let dbPeer: DB;
    let aclPeer: ACL;
    let sigchainPeer: Sigchain;
    let gestaltGraphPeer: GestaltGraph;
    let nodeGraphPeer: NodeGraph;
    let nodeConnectionManagerPeer: NodeConnectionManager;
    let taskManagerPeer: TaskManager;
    let nodeManagerPeer: NodeManager;

    beforeEach(async () => {
      basePath = path.join(dataDir, 'local');
      const keysPath = path.join(basePath, 'keys');
      keyRing = await KeyRing.createKeyRing({
        password,
        keysPath,
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
        logger: logger.getChild(KeyRing.name),
      });
      const dbPath = path.join(basePath, 'db');
      db = await DB.createDB({
        dbPath,
        logger: logger.getChild(DB.name),
      });
      acl = await ACL.createACL({
        db,
        logger: logger.getChild(ACL.name),
      });
      sigchain = await Sigchain.createSigchain({
        db,
        keyRing,
        logger: logger.getChild(Sigchain.name),
      });
      gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger: logger.getChild(GestaltGraph.name),
      });
      nodeGraph = await NodeGraph.createNodeGraph({
        db,
        keyRing,
        logger: logger.getChild(NodeGraph.name),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        tlsConfig: await testsUtils.createTLSConfig(keyRing.keyPair),
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      await nodeConnectionManager.start({
        agentService: {} as AgentServerManifest,
        host: localHost,
      });
      taskManager = await TaskManager.createTaskManager({
        db,
        logger: logger.getChild(TaskManager.name),
      });

      nodeManager = new NodeManager({
        db,
        keyRing,
        gestaltGraph,
        nodeGraph,
        nodeConnectionManager,
        sigchain,
        taskManager,
        logger: logger.getChild(NodeManager.name),
      });
      await nodeManager.start();

      basePathPeer = path.join(dataDir, 'peer');
      const keysPathPeer = path.join(basePathPeer, 'keys');
      keyRingPeer = await KeyRing.createKeyRing({
        password,
        keysPath: keysPathPeer,
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
        logger: logger.getChild(KeyRing.name),
      });
      const dbPathPeer = path.join(basePathPeer, 'db');
      dbPeer = await DB.createDB({
        dbPath: dbPathPeer,
        logger: logger.getChild(DB.name),
      });
      aclPeer = await ACL.createACL({
        db: dbPeer,
        logger: logger.getChild(ACL.name),
      });
      sigchainPeer = await Sigchain.createSigchain({
        db: dbPeer,
        keyRing: keyRingPeer,
        logger: logger.getChild(Sigchain.name),
      });
      gestaltGraphPeer = await GestaltGraph.createGestaltGraph({
        db: dbPeer,
        acl: aclPeer,
        logger: logger.getChild(GestaltGraph.name),
      });
      nodeGraphPeer = await NodeGraph.createNodeGraph({
        db: dbPeer,
        keyRing: keyRingPeer,
        logger: logger.getChild(NodeGraph.name),
      });
      nodeConnectionManagerPeer = new NodeConnectionManager({
        keyRing: keyRingPeer,
        tlsConfig: await testsUtils.createTLSConfig(keyRingPeer.keyPair),
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      taskManagerPeer = await TaskManager.createTaskManager({
        db: dbPeer,
        logger: logger.getChild(TaskManager.name),
      });
      nodeManagerPeer = new NodeManager({
        db: dbPeer,
        keyRing: keyRingPeer,
        gestaltGraph: gestaltGraphPeer,
        nodeGraph: nodeGraphPeer,
        nodeConnectionManager: nodeConnectionManagerPeer,
        sigchain: sigchainPeer,
        taskManager: taskManagerPeer,
        logger: logger.getChild(NodeManager.name),
      });
      await nodeManagerPeer.start();
      await nodeConnectionManagerPeer.start({
        agentService: {
          nodesClaimsGet: new NodesClaimsGet({
            sigchain: sigchainPeer,
            db: dbPeer,
          }),
          nodesCrossSignClaim: new NodesCrossSignClaim({
            nodeManager: nodeManagerPeer,
            acl: aclPeer,
          }),
        } as AgentServerManifest,
        host: localHost,
      });
    });
    afterEach(async () => {
      await taskManager.stopProcessing();
      await taskManager.stopTasks();
      await nodeManager.stop();
      await nodeConnectionManager.stop();
      await nodeGraph.stop();
      await gestaltGraph.stop();
      await sigchain.stop();
      await acl.stop();
      await db.stop();
      await keyRing.stop();
      await taskManager.stop();
      await fs.promises.rm(basePath, {
        force: true,
        recursive: true,
      });

      await taskManagerPeer.stopProcessing();
      await taskManagerPeer.stopTasks();
      await nodeManagerPeer.stop();
      await nodeConnectionManagerPeer.stop();
      await nodeGraphPeer.stop();
      await gestaltGraphPeer.stop();
      await sigchainPeer.stop();
      await aclPeer.stop();
      await dbPeer.stop();
      await keyRingPeer.stop();
      await taskManagerPeer.stop();
      await fs.promises.rm(basePathPeer, {
        force: true,
        recursive: true,
      });
    });

    describe('context functions', () => {
      test('acquire Connection', async () => {
        const nodeId = keyRingPeer.getNodeId();
        await nodeGraph.setNodeContactAddressData(
          nodeId,
          nodesUtils.nodeContactAddress([
            localHost,
            nodeConnectionManagerPeer.port,
          ]),
          {
            mode: 'direct',
            connectedTime: 0,
            scopes: ['global'],
          },
        );
        const [resourceReleaser, nodeConnection] =
          await nodeManager.acquireConnection(nodeId)();
        expect(nodeConnection).toBeInstanceOf(NodeConnection);
        expect(nodeConnectionManager.hasConnection(nodeId)).toBeTrue();
        await resourceReleaser();
      });
      test('acquire Connection fails', async () => {
        const nodeId = keyRingPeer.getNodeId();
        await expect(nodeManager.acquireConnection(nodeId)()).rejects.toThrow(
          nodesErrors.ErrorNodeManagerConnectionFailed,
        );
      });
      test('withConnF', async () => {
        const nodeId = keyRingPeer.getNodeId();
        await nodeGraph.setNodeContactAddressData(
          nodeId,
          nodesUtils.nodeContactAddress([
            localHost,
            nodeConnectionManagerPeer.port,
          ]),
          {
            mode: 'direct',
            connectedTime: 0,
            scopes: ['global'],
          },
        );

        await nodeManager.withConnF(nodeId, async (conn) => {
          expect(conn).toBeInstanceOf(NodeConnection);
        });
      });
      test('withConnG', async () => {
        const nodeId = keyRingPeer.getNodeId();
        await nodeGraph.setNodeContactAddressData(
          nodeId,
          nodesUtils.nodeContactAddress([
            localHost,
            nodeConnectionManagerPeer.port,
          ]),
          {
            mode: 'direct',
            connectedTime: 0,
            scopes: ['global'],
          },
        );

        const gen = nodeManager.withConnG(
          nodeId,
          async function* (
            conn,
          ): AsyncGenerator<undefined, undefined, undefined> {
            expect(conn).toBeInstanceOf(NodeConnection);
          },
        );

        for await (const _ of gen) {
          // Consume until done, should not throw
        }
      });
    });
    describe('pinging', () => {
      test('pingNode success', async () => {
        const nodeIdTarget = keyRingPeer.getNodeId();
        await nodeGraph.setNodeContactAddressData(
          nodeIdTarget,
          nodesUtils.nodeContactAddress([
            localHost,
            nodeConnectionManagerPeer.port,
          ]),
          {
            mode: 'direct',
            connectedTime: 0,
            scopes: ['global'],
          },
        );
        await expect(
          nodeManager.pingNode(nodeIdTarget, { timer: timeoutTime }),
        ).resolves.toBeDefined();
      });
      test('pingNode success with existing connection', async () => {
        const nodeId = keyRingPeer.getNodeId();
        await nodeGraph.setNodeContactAddressData(
          nodeId,
          nodesUtils.nodeContactAddress([
            localHost,
            nodeConnectionManagerPeer.port,
          ]),
          {
            mode: 'direct',
            connectedTime: 0,
            scopes: ['global'],
          },
        );
        await expect(
          nodeManager.pingNode(nodeId, { timer: timeoutTime }),
        ).resolves.toBeDefined();
        await expect(
          nodeManager.pingNode(nodeId, { timer: timeoutTime }),
        ).resolves.toBeDefined();
      });
      test('pingNode fail', async () => {
        const nodeId = keyRingPeer.getNodeId();
        await expect(
          nodeManager.pingNode(nodeId, { timer: timeoutTime }),
        ).resolves.toBeUndefined();
      });
      test('pingNodeAddress success', async () => {
        const nodeId = keyRingPeer.getNodeId();
        await expect(
          nodeManager.pingNodeAddress(
            nodeId,
            localHost,
            nodeConnectionManagerPeer.port,
          ),
        ).resolves.toBeTrue();
      });
      test('pingNodeAddress success with existing connection', async () => {
        const nodeId = keyRingPeer.getNodeId();
        await expect(
          nodeManager.pingNodeAddress(
            nodeId,
            localHost,
            nodeConnectionManagerPeer.port,
          ),
        ).resolves.toBeTrue();
        await expect(
          nodeManager.pingNodeAddress(
            nodeId,
            localHost,
            nodeConnectionManagerPeer.port,
          ),
        ).resolves.toBeTrue();
        expect(nodeConnectionManager.connectionsActive()).toBe(1);
      });
      test('pingNodeAddress fail', async () => {
        const nodeId = keyRingPeer.getNodeId();
        await expect(
          nodeManager.pingNodeAddress(nodeId, localHost, 50000 as Port, {
            timer: timeoutTime,
          }),
        ).resolves.toBeFalse();
        await expect(
          nodeManager.pingNodeAddress(
            keyRing.getNodeId(),
            localHost,
            nodeConnectionManagerPeer.port,
            { timer: timeoutTime },
          ),
        ).resolves.toBeFalse();
      });
    });
    test('requestChainData', async () => {
      const nodeIdTarget = keyRingPeer.getNodeId();
      await nodeGraph.setNodeContactAddressData(
        nodeIdTarget,
        nodesUtils.nodeContactAddress([
          localHost,
          nodeConnectionManagerPeer.port,
        ]),
        {
          mode: 'direct',
          connectedTime: 0,
          scopes: ['global'],
        },
      );
      // Add some data
      for (let i = 0; i < 3; i++) {
        await sigchainPeer.addClaim({
          iss: nodesUtils.encodeNodeId(nodeIdTarget),
        });
      }
      const chainData = await nodeManager.requestChainData(nodeIdTarget);
      expect(Object.keys(chainData)).toHaveLength(3);
    });
    test('claimNode', async () => {
      const nodeIdTarget = keyRingPeer.getNodeId();
      await nodeGraph.setNodeContactAddressData(
        nodeIdTarget,
        nodesUtils.nodeContactAddress([
          localHost,
          nodeConnectionManagerPeer.port,
        ]),
        {
          mode: 'direct',
          connectedTime: 0,
          scopes: ['global'],
        },
      );
      // Adding permission
      await aclPeer.setNodePerm(keyRing.getNodeId(), {
        gestalt: {
          claim: null,
        },
        vaults: {},
      });
      await nodeManager.claimNode(nodeIdTarget);
      const nodeIdPeerEncoded = nodesUtils.encodeNodeId(
        keyRingPeer.getNodeId(),
      );
      for await (const claim of sigchain.getClaims()) {
        expect(claim[1].sub).toBe(nodeIdPeerEncoded);
      }
    });
    test('successful forward connections are added to node graph', async () => {
      const { p, resolveP } = utils.promise();
      const mockedSetNode = jest
        .spyOn(nodeManager, 'setNode')
        .mockImplementation(() => {
          return new PromiseCancellable((resolve) => {
            resolveP();
            resolve();
          });
        });
      const nodeIdPeer = keyRingPeer.getNodeId();
      await nodeConnectionManager.createConnection(
        [nodeIdPeer],
        nodeConnectionManagerPeer.host,
        nodeConnectionManagerPeer.port,
      );
      await p;
      expect(mockedSetNode).toHaveBeenCalled();
      const [nodeId, [host, port]] = mockedSetNode.mock.lastCall!;
      expect(nodeId.equals(keyRingPeer.getNodeId())).toBeTrue();
      expect(host).toBe(localHost);
      expect(port).toBe(nodeConnectionManagerPeer.port);
    });
    test('successful reverse connections are added to node graph', async () => {
      const { p, resolveP } = utils.promise();
      const mockedSetNode = jest
        .spyOn(nodeManager, 'setNode')
        .mockImplementation(() => {
          return new PromiseCancellable((resolve) => {
            resolveP();
            resolve();
          });
        });
      const nodeIdPeer = keyRingPeer.getNodeId();
      await nodeConnectionManager.createConnection(
        [nodeIdPeer],
        nodeConnectionManagerPeer.host,
        nodeConnectionManagerPeer.port,
      );
      await p;
      expect(mockedSetNode).toHaveBeenCalled();
      const [nodeId, [host, port]] = mockedSetNode.mock.lastCall!;
      expect(nodeId.equals(keyRingPeer.getNodeId())).toBeTrue();
      expect(host).toBe(localHost);
      expect(port).toBe(nodeConnectionManagerPeer.port);
    });
    test('adds node to NodeGraph after successful connection', async () => {
      await nodeConnectionManager.createConnection(
        [keyRingPeer.getNodeId()],
        localHost,
        nodeConnectionManagerPeer.port,
      );
      // Wait for handler to add nodes to the graph
      await utils.sleep(100);
      expect(await nodeGraph.nodesTotal()).toBe(1);
      expect(await nodeGraphPeer.nodesTotal()).toBe(1);
    });
  });
  describe('with 1 peer and mdns', () => {
    let basePath: string;
    let keyRing: KeyRing;
    let db: DB;
    let acl: ACL;
    let sigchain: Sigchain;
    let gestaltGraph: GestaltGraph;
    let nodeGraph: NodeGraph;
    let nodeConnectionManager: NodeConnectionManager;
    let taskManager: TaskManager;
    let nodeManager: NodeManager;

    let basePathPeer: string;
    let keyRingPeer: KeyRing;
    let dbPeer: DB;
    let aclPeer: ACL;
    let sigchainPeer: Sigchain;
    let gestaltGraphPeer: GestaltGraph;
    let nodeGraphPeer: NodeGraph;
    let nodeConnectionManagerPeer: NodeConnectionManager;
    let taskManagerPeer: TaskManager;
    let nodeManagerPeer: NodeManager;

    beforeEach(async () => {
      basePath = path.join(dataDir, 'local');
      const keysPath = path.join(basePath, 'keys');
      keyRing = await KeyRing.createKeyRing({
        password,
        keysPath,
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
        logger: logger.getChild(KeyRing.name),
      });
      const dbPath = path.join(basePath, 'db');
      db = await DB.createDB({
        dbPath,
        logger: logger.getChild(DB.name),
      });
      acl = await ACL.createACL({
        db,
        logger: logger.getChild(ACL.name),
      });
      sigchain = await Sigchain.createSigchain({
        db,
        keyRing,
        logger: logger.getChild(Sigchain.name),
      });
      gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger: logger.getChild(GestaltGraph.name),
      });
      nodeGraph = await NodeGraph.createNodeGraph({
        db,
        keyRing,
        logger: logger.getChild(NodeGraph.name),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        tlsConfig: await testsUtils.createTLSConfig(keyRing.keyPair),
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      await nodeConnectionManager.start({
        agentService: {} as AgentServerManifest,
        host: localHost,
      });
      taskManager = await TaskManager.createTaskManager({
        db,
        logger: logger.getChild(TaskManager.name),
      });

      nodeManager = new NodeManager({
        db,
        keyRing,
        gestaltGraph,
        nodeGraph,
        nodeConnectionManager,
        sigchain,
        taskManager,
        mdnsOptions: {
          groups: ['224.0.0.250', 'ff02::fa17'] as Array<Host>,
          port: 64023 as Port,
        },
        logger: logger.getChild(NodeManager.name),
      });
      await nodeManager.start();

      basePathPeer = path.join(dataDir, 'peer');
      const keysPathPeer = path.join(basePathPeer, 'keys');
      keyRingPeer = await KeyRing.createKeyRing({
        password,
        keysPath: keysPathPeer,
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
        logger: logger.getChild(KeyRing.name),
      });
      const dbPathPeer = path.join(basePathPeer, 'db');
      dbPeer = await DB.createDB({
        dbPath: dbPathPeer,
        logger: logger.getChild(DB.name),
      });
      aclPeer = await ACL.createACL({
        db: dbPeer,
        logger: logger.getChild(ACL.name),
      });
      sigchainPeer = await Sigchain.createSigchain({
        db: dbPeer,
        keyRing: keyRingPeer,
        logger: logger.getChild(Sigchain.name),
      });
      gestaltGraphPeer = await GestaltGraph.createGestaltGraph({
        db: dbPeer,
        acl: aclPeer,
        logger: logger.getChild(GestaltGraph.name),
      });
      nodeGraphPeer = await NodeGraph.createNodeGraph({
        db: dbPeer,
        keyRing: keyRingPeer,
        logger: logger.getChild(NodeGraph.name),
      });
      nodeConnectionManagerPeer = new NodeConnectionManager({
        keyRing: keyRingPeer,
        tlsConfig: await testsUtils.createTLSConfig(keyRingPeer.keyPair),
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      await nodeConnectionManagerPeer.start({
        agentService: {} as AgentServerManifest,
        host: localHost,
      });
      taskManagerPeer = await TaskManager.createTaskManager({
        db: dbPeer,
        logger: logger.getChild(TaskManager.name),
      });

      nodeManagerPeer = new NodeManager({
        db: dbPeer,
        keyRing: keyRingPeer,
        gestaltGraph: gestaltGraphPeer,
        nodeGraph: nodeGraphPeer,
        nodeConnectionManager: nodeConnectionManagerPeer,
        sigchain: sigchainPeer,
        taskManager: taskManagerPeer,
        mdnsOptions: {
          groups: ['224.0.0.250', 'ff02::fa17'] as Array<Host>,
          port: 64023 as Port,
        },
        logger: logger.getChild(NodeManager.name),
      });

      await nodeManagerPeer.start();
    });
    afterEach(async () => {
      await taskManager.stopProcessing();
      await taskManager.stopTasks();
      await nodeManager.stop();
      await nodeConnectionManager.stop();
      await nodeGraph.stop();
      await gestaltGraph.stop();
      await sigchain.stop();
      await acl.stop();
      await db.stop();
      await keyRing.stop();
      await taskManager.stop();
      await fs.promises.rm(basePath, {
        force: true,
        recursive: true,
      });

      await taskManagerPeer.stopProcessing();
      await taskManagerPeer.stopTasks();
      await nodeManagerPeer.stop();
      await nodeConnectionManagerPeer.stop();
      await nodeGraphPeer.stop();
      await gestaltGraphPeer.stop();
      await sigchainPeer.stop();
      await aclPeer.stop();
      await dbPeer.stop();
      await keyRingPeer.stop();
      await taskManagerPeer.stop();
      await fs.promises.rm(basePathPeer, {
        force: true,
        recursive: true,
      });
    });

    test('findNodeByMdns', async () => {
      const result = await nodeManager.findNodeByMDNS(keyRingPeer.getNodeId());
      expect(result).toBeDefined();
      const [[host, port]] = result;
      expect(host).toBe(localHost);
      expect(port).toBe(nodeConnectionManagerPeer.port);
    });
    test('findNode with mdns', async () => {
      const result = await nodeManager.findNode({
        nodeId: keyRingPeer.getNodeId(),
      });
      expect(result).toBeDefined();
      const [[host, port]] = result!;
      expect(host).toBe(localHost);
      expect(port).toBe(nodeConnectionManagerPeer.port);
    });
  });
  describe('with peers in network', () => {
    let basePath: string;
    let keyRing: KeyRing;
    let db: DB;
    let acl: ACL;
    let sigchain: Sigchain;
    let gestaltGraph: GestaltGraph;
    let nodeGraph: NodeGraph;
    let nodeConnectionManager: NodeConnectionManager;
    let taskManager: TaskManager;
    let nodeManager: NodeManager;

    // Will create 6 peers forming a simple network
    let ncmPeers: Array<
      NCMState & {
        db: DB;
        keyRing: KeyRing;
        nodeGraph: NodeGraph;
      }
    >;
    async function linkConnection(a: number, b: number) {
      const ncmA = ncmPeers[a];
      const ncmB = ncmPeers[b];
      await ncmA.nodeConnectionManager.createConnection(
        [ncmB.nodeId],
        localHost,
        ncmB.port,
      );
    }
    async function quickLinkConnection(structure: Array<Array<number>>) {
      const linkPs: Array<Promise<void>> = [];
      for (const chain of structure) {
        for (let i = 1; i < chain.length; i++) {
          linkPs.push(linkConnection(chain[i - 1], chain[i]));
        }
      }
      await Promise.all(linkPs);
    }

    async function linkGraph(a: number, b: number) {
      const ncmA = ncmPeers[a];
      const ncmB = ncmPeers[b];
      const nodeContactAddressB = nodesUtils.nodeContactAddress([
        ncmB.nodeConnectionManager.host,
        ncmB.nodeConnectionManager.port,
      ]);
      await ncmA.nodeGraph.setNodeContact(ncmB.keyRing.getNodeId(), {
        [nodeContactAddressB]: {
          mode: 'direct',
          connectedTime: Date.now(),
          scopes: ['global'],
        },
      });
    }

    async function quickLinkGraph(structure: Array<Array<number>>) {
      for (const chain of structure) {
        for (let i = 1; i < chain.length; i++) {
          await linkGraph(chain[i - 1], chain[i]);
          await linkGraph(chain[i], chain[i - 1]);
        }
      }
    }

    beforeEach(async () => {
      basePath = path.join(dataDir, 'local');
      const keysPath = path.join(basePath, 'keys');
      keyRing = await KeyRing.createKeyRing({
        password,
        keysPath,
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
        logger: logger.getChild(KeyRing.name),
      });
      const dbPath = path.join(basePath, 'db');
      db = await DB.createDB({
        dbPath,
        logger: logger.getChild(DB.name),
      });
      acl = await ACL.createACL({
        db,
        logger: logger.getChild(ACL.name),
      });
      sigchain = await Sigchain.createSigchain({
        db,
        keyRing,
        logger: logger.getChild(Sigchain.name),
      });
      gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger: logger.getChild(GestaltGraph.name),
      });
      nodeGraph = await NodeGraph.createNodeGraph({
        db,
        keyRing,
        logger: logger.getChild(NodeGraph.name),
      });
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        tlsConfig: await testsUtils.createTLSConfig(keyRing.keyPair),
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      await nodeConnectionManager.start({
        agentService: {} as AgentServerManifest,
        host: localHost,
      });
      taskManager = await TaskManager.createTaskManager({
        db,
        logger: logger.getChild(TaskManager.name),
      });

      nodeManager = new NodeManager({
        db,
        keyRing,
        gestaltGraph,
        nodeGraph,
        nodeConnectionManager,
        sigchain,
        taskManager,
        logger: logger.getChild(NodeManager.name),
      });
      await nodeManager.start();

      ncmPeers = [];
      const createPs: Array<Promise<void>> = [];
      for (let i = 0; i < 5; i++) {
        const db = await DB.createDB({
          dbPath: path.join(basePath, `db${i}`),
          logger,
        });
        const keyRing = await KeyRing.createKeyRing({
          keysPath: path.join(basePath, `key${i}`),
          password,
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
          logger,
        });
        const nodeGraph = await NodeGraph.createNodeGraph({
          db,
          keyRing,
          logger,
        });

        const peerP = nodesTestUtils
          .nodeConnectionManagerFactory({
            keyRing,
            createOptions: {
              connectionConnectTimeoutTime: timeoutTime,
            },
            startOptions: {
              host: localHost,
              agentService: (nodeConnectionManager) =>
                ({
                  nodesConnectionSignalFinal: new NodesConnectionSignalFinal({
                    nodeConnectionManager,
                    logger,
                  }),
                  nodesConnectionSignalInitial:
                    new NodesConnectionSignalInitial({
                      nodeConnectionManager,
                    }),
                  nodesClosestActiveConnectionsGet:
                    new NodesClosestActiveConnectionsGet({
                      nodeConnectionManager,
                    }),
                  nodesClosestLocalNodesGet: new NodesClosestLocalNodesGet({
                    db,
                    nodeGraph,
                  }),
                }) as AgentServerManifest,
            },
            logger: logger.getChild(`${NodeConnectionManager.name}Peer${i}`),
          })
          .then((peer) => {
            ncmPeers[i] = {
              ...peer,
              db,
              keyRing,
              nodeGraph,
            };
          });
        createPs.push(peerP);
      }
      await Promise.all(createPs);
      // Sort in order of distance
      const nodeDistanceCmp = nodesUtils.nodeDistanceCmpFactory(
        keyRing.getNodeId(),
      );
      ncmPeers.sort((a, b) => {
        return nodeDistanceCmp(a.nodeId, b.nodeId);
      });
      for (let i = 0; i < ncmPeers.length; i++) {
        logger.warn(
          `${i}, ${nodesUtils.encodeNodeId(ncmPeers[i].keyRing.getNodeId())}`,
        );
      }
    });
    afterEach(async () => {
      await taskManager.stopProcessing();
      await taskManager.stopTasks();
      await nodeManager.stop();
      await nodeConnectionManager.stop();
      await nodeGraph.stop();
      await gestaltGraph.stop();
      await sigchain.stop();
      await acl.stop();
      await db.stop();
      await keyRing.stop();
      await taskManager.stop();
      await fs.promises.rm(basePath, {
        force: true,
        recursive: true,
      });

      const destroyPs: Array<Promise<void>> = [];
      for (const ncmPeer of ncmPeers) {
        destroyPs.push(ncmPeer.nodeConnectionManager.stop({ force: true }));
        destroyPs.push(ncmPeer.nodeGraph.stop());
        destroyPs.push(ncmPeer.keyRing.stop());
        destroyPs.push(ncmPeer.db.stop());
      }
      await Promise.all(destroyPs);
    });

    describe('findNode by signalled connections', () => {
      test('connection found in chain graph', async () => {
        // Structure is an acyclic graph
        // 0 -> 1 -> 2 -> 3 -> 4
        await quickLinkConnection([[0, 1, 2, 3, 4]]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const rateLimiter = new Semaphore(3);
        const result = await nodeManager.findNodeBySignal(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            20,
            rateLimiter,
            rateLimiter,
          ),
        );
        expect(result).toBeDefined();
        const [[host, port]] = result!;
        expect(host).toBe(localHost);
        expect(port).toBe(ncmPeers[4].nodeConnectionManager.port);
      });
      test('connection found in MST graph', async () => {
        // Structure is an acyclic graph
        // 0 -> 1 -> 2
        // 3 -> 1 -> 4
        await quickLinkConnection([
          [0, 1, 2],
          [3, 1, 4],
        ]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const rateLimiter = new Semaphore(3);
        const result = await nodeManager.findNodeBySignal(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            20,
            rateLimiter,
            rateLimiter,
          ),
        );
        expect(result).toBeDefined();
        const [[host, port]] = result!;
        expect(host).toBe(localHost);
        expect(port).toBe(ncmPeers[4].nodeConnectionManager.port);
      });
      test('connection found in cyclic graph', async () => {
        // Structure is a ring with a branch
        // 0 -> 1 -> 2 -> 3 -> 0
        // 4 -> 2
        await quickLinkConnection([
          [0, 1, 2, 3, 0],
          [4, 2],
        ]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const rateLimiter = new Semaphore(3);
        const result = await nodeManager.findNodeBySignal(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            20,
            rateLimiter,
            rateLimiter,
          ),
        );
        expect(result).toBeDefined();
        const [[host, port]] = result!;
        expect(host).toBe(localHost);
        expect(port).toBe(ncmPeers[4].nodeConnectionManager.port);
      });
      test('finding self will do exhaustive search and not find self', async () => {
        // Structure is branching
        // 0 -> 1 -> 2 -> 3
        // 1 -> 4
        await quickLinkConnection([
          [0, 1, 2, 3],
          [1, 4],
        ]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const rateLimiter = new Semaphore(3);
        const resultP = nodeManager.findNodeBySignal(
          keyRing.getNodeId(),
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            keyRing.getNodeId(),
            20,
            rateLimiter,
            rateLimiter,
          ),
        );
        await expect(resultP).rejects.toThrow(
          nodesErrors.ErrorNodeManagerFindNodeFailed,
        );
        // All connections made
        expect(nodeConnectionManager.connectionsActive()).toBe(5);
      });
      test('finding self will hit limit and not find self', async () => {
        // Structure is a chain
        // 0 -> 1 -> 2 -> 3 -> 4
        await quickLinkConnection([[0, 1, 2, 3, 4]]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const rateLimiter = new Semaphore(3);
        const resultP = nodeManager.findNodeBySignal(
          keyRing.getNodeId(),
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            keyRing.getNodeId(),
            3,
            rateLimiter,
            rateLimiter,
          ),
        );
        await expect(resultP).rejects.toThrow(
          nodesErrors.ErrorNodeManagerFindNodeFailed,
        );
        // All connections made
        expect(nodeConnectionManager.connectionsActive()).toBe(3);
      });
      test('handles offline nodes', async () => {
        // Short chain with offline leafs
        // 0 -> 2 -> 4
        // 0 -> 1
        // 2 -> 3
        await quickLinkConnection([
          // [0, 1, 2, 3, 4]
          [0, 2, 4],
          [0, 1],
          [2, 3],
        ]);
        // Nodes 1 and 3 need to be offline
        await Promise.all([
          ncmPeers[1].nodeConnectionManager.stop({ force: true }),
          ncmPeers[3].nodeConnectionManager.stop({ force: true }),
          ncmPeers[4].nodeConnectionManager.stop({ force: true }),
        ]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const rateLimiter = new Semaphore(3);
        const resultP = nodeManager.findNodeBySignal(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            20,
            rateLimiter,
            rateLimiter,
          ),
          1000,
        );
        await expect(resultP).rejects.toThrow(
          nodesErrors.ErrorNodeManagerFindNodeFailed,
        );
      });
    });
    describe('findNode by direct connections', () => {
      test('connection found in chain graph', async () => {
        // Structure is an acyclic graph
        // 0 -> 1 -> 2 -> 3 -> 4
        await quickLinkGraph([[0, 1, 2, 3, 4]]);

        // Setting up entry point
        const nodeContactAddressB = nodesUtils.nodeContactAddress([
          ncmPeers[0].nodeConnectionManager.host,
          ncmPeers[0].nodeConnectionManager.port,
        ]);
        await nodeGraph.setNodeContact(ncmPeers[0].keyRing.getNodeId(), {
          [nodeContactAddressB]: {
            mode: 'direct',
            connectedTime: Date.now(),
            scopes: ['global'],
          },
        });

        const rateLimiter = new Semaphore(3);
        const result = await nodeManager.findNodeByDirect(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            20,
            rateLimiter,
            rateLimiter,
          ),
        );
        expect(result).toBeDefined();
        const [[host, port]] = result!;
        expect(host).toBe(localHost);
        expect(port).toBe(ncmPeers[4].nodeConnectionManager.port);
      });
      test('connection found in MST graph', async () => {
        // Structure is an acyclic graph
        // 0 -> 1 -> 2
        // 3 -> 1 -> 4
        await quickLinkGraph([
          [0, 1, 2],
          [3, 1, 4],
        ]);

        // Setting up entry point
        const nodeContactAddressB = nodesUtils.nodeContactAddress([
          ncmPeers[0].nodeConnectionManager.host,
          ncmPeers[0].nodeConnectionManager.port,
        ]);
        await nodeGraph.setNodeContact(ncmPeers[0].keyRing.getNodeId(), {
          [nodeContactAddressB]: {
            mode: 'direct',
            connectedTime: Date.now(),
            scopes: ['global'],
          },
        });

        const rateLimiter = new Semaphore(3);
        const result = await nodeManager.findNodeByDirect(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            20,
            rateLimiter,
            rateLimiter,
          ),
        );
        expect(result).toBeDefined();
        const [[host, port]] = result!;
        expect(host).toBe(localHost);
        expect(port).toBe(ncmPeers[4].nodeConnectionManager.port);
      });
      test('connection found in cyclic graph', async () => {
        // Structure is an acyclic graph
        // 0 -> 1 -> 2 -> 3 -> 0
        // 4 -> 2
        await quickLinkGraph([
          [0, 1, 2, 3, 0],
          [4, 2],
        ]);

        // Setting up entry point
        const nodeContactAddressB = nodesUtils.nodeContactAddress([
          ncmPeers[0].nodeConnectionManager.host,
          ncmPeers[0].nodeConnectionManager.port,
        ]);
        await nodeGraph.setNodeContact(ncmPeers[0].keyRing.getNodeId(), {
          [nodeContactAddressB]: {
            mode: 'direct',
            connectedTime: Date.now(),
            scopes: ['global'],
          },
        });

        const rateLimiter = new Semaphore(3);
        const result = await nodeManager.findNodeByDirect(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            20,
            rateLimiter,
            rateLimiter,
          ),
        );
        expect(result).toBeDefined();
        const [[host, port]] = result!;
        expect(host).toBe(localHost);
        expect(port).toBe(ncmPeers[4].nodeConnectionManager.port);
      });
      test('finding self will do exhaustive search and not find self', async () => {
        // Structure is an acyclic graph
        // 0 -> 1 -> 2 -> 3
        // 1 -> 4
        await quickLinkGraph([
          [0, 1, 2, 3],
          [1, 4],
        ]);

        // Setting up entry point
        const nodeContactAddressB = nodesUtils.nodeContactAddress([
          ncmPeers[0].nodeConnectionManager.host,
          ncmPeers[0].nodeConnectionManager.port,
        ]);
        await nodeGraph.setNodeContact(ncmPeers[0].keyRing.getNodeId(), {
          [nodeContactAddressB]: {
            mode: 'direct',
            connectedTime: Date.now(),
            scopes: ['global'],
          },
        });

        const rateLimiter = new Semaphore(3);
        const resultP = nodeManager.findNodeByDirect(
          keyRing.getNodeId(),
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            keyRing.getNodeId(),
            20,
            rateLimiter,
            rateLimiter,
          ),
        );
        await expect(resultP).rejects.toThrow(
          nodesErrors.ErrorNodeManagerFindNodeFailed,
        );
        // All connections made
        expect(nodeConnectionManager.connectionsActive()).toBe(5);
      });
      test('finding self will hit limit and not find self', async () => {
        // Structure is an acyclic graph
        // 0 -> 1 -> 2 -> 3 -> 4
        await quickLinkGraph([[0, 1, 2, 3, 4]]);

        // Setting up entry point
        const nodeContactAddressB = nodesUtils.nodeContactAddress([
          ncmPeers[0].nodeConnectionManager.host,
          ncmPeers[0].nodeConnectionManager.port,
        ]);
        await nodeGraph.setNodeContact(ncmPeers[0].keyRing.getNodeId(), {
          [nodeContactAddressB]: {
            mode: 'direct',
            connectedTime: Date.now(),
            scopes: ['global'],
          },
        });

        const rateLimiter = new Semaphore(3);
        const resultP = nodeManager.findNodeByDirect(
          keyRing.getNodeId(),
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            keyRing.getNodeId(),
            20,
            rateLimiter,
            rateLimiter,
          ),
        );
        await expect(resultP).rejects.toThrow(
          nodesErrors.ErrorNodeManagerFindNodeFailed,
        );
        // All connections made
        expect(nodeConnectionManager.connectionsActive()).toBe(5);
      });
      test('handles offline nodes', async () => {
        // Short chain with offline leafs
        // 0 -> 1 -> 2 -> 3 -> 4
        await quickLinkGraph([
          [0, 2, 4],
          [0, 1],
          [2, 3],
        ]);
        // Nodes 1 and 3 need to be offline
        await Promise.all([
          ncmPeers[1].nodeConnectionManager.stop({ force: true }),
          ncmPeers[3].nodeConnectionManager.stop({ force: true }),
          ncmPeers[4].nodeConnectionManager.stop({ force: true }),
        ]);
        // Setting up entry point
        const nodeContactAddressB = nodesUtils.nodeContactAddress([
          ncmPeers[0].nodeConnectionManager.host,
          ncmPeers[0].nodeConnectionManager.port,
        ]);
        await nodeGraph.setNodeContact(ncmPeers[0].keyRing.getNodeId(), {
          [nodeContactAddressB]: {
            mode: 'direct',
            connectedTime: Date.now(),
            scopes: ['global'],
          },
        });

        const rateLimiter = new Semaphore(3);
        const start = Date.now();
        const resultP = nodeManager.findNodeByDirect(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            20,
            rateLimiter,
            rateLimiter,
          ),
          1000,
        );
        await expect(resultP).rejects.toThrow(
          nodesErrors.ErrorNodeManagerFindNodeFailed,
        );
        const duration = Date.now() - start;
        // Should time out after 1000ms
        expect(duration).toBeGreaterThanOrEqual(1000);
        // Should time out faster than default timeout of 15000
        expect(duration).toBeLessThan(5000);
      });
    });
    describe('findNode by both', () => {
      test('connection found in chain graph', async () => {
        // Structure is an acyclic graph
        // connections
        // 0 -> 1, 2 -> 3
        // graph links
        // 1 -> 2, 3 -> 4
        await quickLinkConnection([
          [0, 1],
          [2, 3],
        ]);
        await quickLinkGraph([
          [1, 2],
          [3, 4],
        ]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const result = await nodeManager.findNode({
          nodeId: ncmPeers[4].nodeId,
        });
        expect(result).toMatchObject([
          [localHost, ncmPeers[4].nodeConnectionManager.port],
          {
            mode: 'direct',
            connectedTime: expect.any(Number),
            scopes: expect.any(Array),
          },
        ]);
      });
      test('connection found with shortcut', async () => {
        // Structure is an acyclic graph
        // connections
        // 0 -> 1 -> 2 -> 3
        // graph links
        // 0 -> 4
        await quickLinkConnection([[0, 1, 2, 3]]);
        await quickLinkGraph([[0, 4]]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const result = await nodeManager.findNode({
          nodeId: ncmPeers[4].nodeId,
        });
        expect(result).toMatchObject([
          [localHost, ncmPeers[4].nodeConnectionManager.port],
          {
            mode: 'direct',
            connectedTime: expect.any(Number),
            scopes: expect.any(Array),
          },
        ]);
      });
      test('finding self will do exhaustive search', async () => {
        // Structure is an acyclic graph
        // connections
        // 0 -> 1 -> 2 -> 3
        // graph links
        // 0 -> 4
        await quickLinkConnection([[0, 1, 2, 3]]);
        await quickLinkGraph([[0, 4]]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const result = await nodeManager.findNode({
          nodeId: keyRing.getNodeId(),
        });
        expect(result).toBeUndefined();
        expect(nodeConnectionManager.connectionsActive()).toBeGreaterThan(3);
      });
      test('handles offline nodes', async () => {
        // Structure is an acyclic graph
        // connections
        // 0 -> 1
        // 1 -> 2
        // graph links
        // 1 -> 3
        // 0 -> 4
        // 2, 3, and 4 are dead.
        await quickLinkConnection([
          [0, 1],
          [1, 2],
        ]);
        await quickLinkGraph([
          [1, 3],
          [0, 4],
        ]);
        await Promise.all([
          await ncmPeers[2].nodeConnectionManager.stop({ force: true }),
          await ncmPeers[3].nodeConnectionManager.stop({ force: true }),
          await ncmPeers[4].nodeConnectionManager.stop({ force: true }),
        ]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const start = Date.now();
        const result = await nodeManager.findNode({
          nodeId: keyRing.getNodeId(),
          connectionConnectTimeoutTime: 1000,
        });
        const duration = Date.now() - start;
        // Should time out after 1000ms
        expect(duration).toBeGreaterThanOrEqual(1000);
        // Should time out faster than default timeout of 15000
        expect(duration).toBeLessThan(5000);

        expect(result).toBeUndefined();
      });
    });
    test('network entry with syncNodeGraph', async () => {
      // Structure is an acyclic graph
      // connections
      // 0 -> 1, 2 -> 3
      // graph links
      // 1 -> 2, 3 -> 4
      await quickLinkConnection([
        [0, 1],
        [2, 3],
      ]);
      await quickLinkGraph([
        [1, 2],
        [3, 4],
      ]);
      // Creating first connection to 0;
      await nodeConnectionManager.createConnection(
        [ncmPeers[0].nodeId],
        localHost,
        ncmPeers[0].port,
      );

      const mockedRefreshBucket = jest.spyOn(nodeManager, 'refreshBucket');

      await nodeManager.syncNodeGraph(
        [
          [
            ncmPeers[0].nodeId,
            [localHost, ncmPeers[0].nodeConnectionManager.port],
          ],
          [
            ncmPeers[4].nodeId,
            [localHost, ncmPeers[4].nodeConnectionManager.port],
          ],
        ],
        1000,
        true,
      );

      // Things to check
      //  1. all peers connected to.
      //  2. all peers learned about our node.
      //  3. refresh buckets were called.

      expect(nodeConnectionManager.connectionsActive()).toBeGreaterThanOrEqual(
        5,
      );
      for (const ncmPeer of ncmPeers) {
        expect(
          ncmPeer.nodeConnectionManager.hasConnection(keyRing.getNodeId()),
        ).toBeTrue();
      }
      expect(mockedRefreshBucket).toHaveBeenCalled();
    });
    test('network entry with syncNodeGraph handles offline nodes', async () => {
      // Structure is an acyclic graph
      // connections
      // 0 -> 1, 2 -> 4
      // graph links
      // 1 -> 2, 1 -> 3
      await quickLinkConnection([
        [0, 1],
        [2, 3],
      ]);
      await quickLinkGraph([
        [1, 2],
        [3, 4],
      ]);
      // Creating first connection to 0;
      await nodeConnectionManager.createConnection(
        [ncmPeers[0].nodeId],
        localHost,
        ncmPeers[0].port,
      );

      await Promise.all([
        await ncmPeers[3].nodeConnectionManager.stop({ force: true }),
        await ncmPeers[4].nodeConnectionManager.stop({ force: true }),
      ]);

      const mockedRefreshBucket = jest.spyOn(nodeManager, 'refreshBucket');

      await nodeManager.syncNodeGraph(
        [
          [
            ncmPeers[0].nodeId,
            [localHost, ncmPeers[0].nodeConnectionManager.port],
          ],
        ],
        1000,
        true,
      );

      // Things to check
      //  1. all peers connected to.
      //  2. all peers learned about our node.
      //  3. refresh buckets were called.

      expect(nodeConnectionManager.connectionsActive()).toBeGreaterThanOrEqual(
        3,
      );
      expect(mockedRefreshBucket).toHaveBeenCalled();
    });
    test('refresh buckets', async () => {
      // Structure is an acyclic graph
      // connections
      // 0 -> 1, 2 -> 3
      // graph links
      // 1 -> 2, 3 -> 4
      await quickLinkConnection([
        [0, 1],
        [2, 3],
      ]);
      await quickLinkGraph([
        [1, 2],
        [3, 4],
      ]);
      // Creating first connection to 0;
      await nodeConnectionManager.createConnection(
        [ncmPeers[0].nodeId],
        localHost,
        ncmPeers[0].port,
      );

      await nodeManager.refreshBucket(100, 1000);
      // Small networks less than 20 nodes will contact all nodes
      expect(nodeConnectionManager.connectionsActive()).toBeGreaterThanOrEqual(
        5,
      );
      for (const ncmPeer of ncmPeers) {
        expect(
          ncmPeer.nodeConnectionManager.hasConnection(keyRing.getNodeId()),
        ).toBeTrue();
      }
    });
    test('nodeGraph entry is updated when connection is made', async () => {
      // Structure is an acyclic graph
      // connections
      // 0 -> 1, 2 -> 3
      // graph links
      // 1 -> 2, 3 -> 4
      await quickLinkConnection([
        [0, 1],
        [2, 3],
      ]);
      await quickLinkGraph([
        [1, 2],
        [3, 4],
      ]);
      // Creating first connection to 0;
      await nodeConnectionManager.createConnection(
        [ncmPeers[0].nodeId],
        localHost,
        ncmPeers[0].port,
      );

      expect(await nodeGraph.nodesTotal()).toBe(0);

      await nodeManager.syncNodeGraph(
        [
          [
            ncmPeers[0].nodeId,
            [localHost, ncmPeers[0].nodeConnectionManager.port],
          ],
          [
            ncmPeers[4].nodeId,
            [localHost, ncmPeers[4].nodeConnectionManager.port],
          ],
        ],
        1000,
        true,
      );

      expect(await nodeGraph.nodesTotal()).toBe(5);
    });
  });
});
