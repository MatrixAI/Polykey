import type { Host, Port } from '@/network/types';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import type nodeGraph from '@/nodes/NodeGraph';
import type { NCMState } from './utils';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Semaphore } from '@matrixai/async-locks';
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
import NodeGraph from '@/nodes/NodeGraph';
import {
  NodesClosestActiveConnectionsGet,
  NodesClosestLocalNodesGet,
} from '@/nodes/agent/handlers';
import NodeConnectionQueue from '@/nodes/NodeConnectionQueue';
import * as nodesTestUtils from './utils';
import ACL from '../../src/acl/ACL';
import * as testsUtils from '../utils';

describe(`NodeConnectionManager`, () => {
  const logger = new Logger(
    `${NodeConnectionManager.name} test`,
    LogLevel.WARN,
    [
      new StreamHandler(
        formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
      ),
    ],
  );
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
    });
    test.todo('general tests for adding new nodes');
    // Previously these tests were
    // 'should add a node when bucket has room'
    // 'should update a node if node exists'
    // 'should not add node if bucket is full and old node is alive'
    // 'should add node if bucket is full, old node is alive and force is set'
    // 'should add node if bucket is full and old node is dead'
    // 'should add node when an incoming connection is established'
    // 'should not add nodes to full bucket if pings succeeds'
    // 'should add nodes to full bucket if pings fail'
    // 'should not block when bucket is full'
    // 'should update deadline when updating a bucket'
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
    test.todo('requestChainData');
    test.todo('claimNode');

    // TODO: These require mdns integration with `NodeManager`.
    test.todo('findNodeByMdns');
    test.todo('findNode with mdns');
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

    async function linkGraph(a, b) {
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
      // FIXME: this is a bit in-determinate right now
      test.skip('connection found in two attempts', async () => {
        // Structure is a chain
        // 0 -> 1 -> 2 -> 3 -> 4
        await quickLinkConnection([[0, 1, 2, 3, 4]]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const rateLimiter = new Semaphore(1);
        const path = await nodeManager.findNodeBySignal(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            3,
            rateLimiter,
            rateLimiter,
          ),
        );
        expect(path).toBeUndefined();
        // Should have initial connection + 3 new ones
        expect(nodeConnectionManager.connectionsActive()).toBe(3);

        // 2nd attempt continues where we left off due to existing connections
        const path2 = await nodeManager.findNodeBySignal(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            3,
            rateLimiter,
            rateLimiter,
          ),
        );
        expect(path2).toBeDefined();
        expect(path2!.length).toBe(2);
      });
      test.todo('handles offline nodes');
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
      // FIXME: needs to store made connections in nodeGraph for this to work
      test.skip('connection found in two attempts', async () => {
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
        const result1 = await nodeManager.findNodeByDirect(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            3,
            rateLimiter,
            rateLimiter,
          ),
        );
        expect(result1).toBeUndefined();
        // All connections made
        expect(nodeConnectionManager.connectionsActive()).toBe(4);

        const result2 = await nodeManager.findNodeByDirect(
          ncmPeers[4].nodeId,
          new NodeConnectionQueue(
            keyRing.getNodeId(),
            ncmPeers[4].nodeId,
            3,
            rateLimiter,
            rateLimiter,
          ),
        );
        expect(result2).toBeDefined();
        // All connections made
        expect(nodeConnectionManager.connectionsActive()).toBe(5);
      });
      test.todo('handles offline nodes');
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

        const result = await nodeManager.findNode(ncmPeers[4].nodeId);
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

        const result = await nodeManager.findNode(ncmPeers[4].nodeId);
        expect(result).toMatchObject([
          [localHost, ncmPeers[4].nodeConnectionManager.port],
          {
            mode: 'direct',
            connectedTime: expect.any(Number),
            scopes: expect.any(Array),
          },
        ]);
      });
      test.todo('handles offline nodes');
    });
    test.todo('network entry with syncNodeGraph');
    test.todo('network entry with syncNodeGraph handles offline nodes');
    test.todo('refresh buckets');
    test.todo('nodeGraph entry is updated when connection is made');
  });
});
