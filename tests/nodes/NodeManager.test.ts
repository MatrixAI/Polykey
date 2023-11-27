import type { Host, Port } from '@/network/types';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import type { NodeId } from '@/ids';
import type nodeGraph from '@/nodes/NodeGraph';
import type { NCMState } from './utils';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { Timer } from '@matrixai/timer';
import { destroyed } from '@matrixai/async-init';
import { DB } from '@matrixai/db';
import * as keysUtils from '@/keys/utils';
import * as nodesEvents from '@/nodes/events';
import * as nodesErrors from '@/nodes/errors';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodesConnectionSignalFinal from '@/nodes/agent/handlers/NodesConnectionSignalFinal';
import NodesConnectionSignalInitial from '@/nodes/agent/handlers/NodesConnectionSignalInitial';
import * as nodesUtils from '@/nodes/utils';
import { TaskManager } from '@/tasks';
import { NodeManager } from '@/nodes';
import { GestaltGraph } from '@/gestalts';
import { Sigchain } from '@/sigchain';
import { KeyRing } from '@/keys';
import NodeGraph from '@/nodes/NodeGraph';
import { sleep } from '@/utils';
import { NodesClosestActiveConnectionsGet } from '@/nodes/agent/handlers';
import * as nodesTestUtils from './utils';
import * as testsNodesUtils from './utils';
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

    describe('with 1 peer', () => {
      let basePath: string;
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
        basePath = path.join(dataDir, 'peer');
        const keysPath = path.join(basePath, 'keys');
        keyRingPeer = await KeyRing.createKeyRing({
          password,
          keysPath,
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
          logger: logger.getChild(KeyRing.name),
        });
        const dbPath = path.join(basePath, 'db');
        dbPeer = await DB.createDB({
          dbPath,
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
        await fs.promises.rm(basePath, {
          force: true,
          recursive: true,
        });
      });

      test('asd', async () => {});
      test.todo('acquire Connection');
      test.todo('withConnF');
      test.todo('withConnG');
      test.todo('pingNode success');
      test.todo('pingNode success with existing connection');
      test.todo('pingNode fail');
      test.todo('pingNodeAddress success');
      test.todo('pingNodeAddress success with existing connection');
      test.todo('pingNodeAddress fail');
      test.todo('requestChainData');
      test.todo('claimNode');
      test.todo('');
      test.todo('');
      test.todo('');
      test.todo('');
      test.todo('');
      test.todo('');
    });
    describe('with peers in network', () => {
      // Will create 6 peers forming a simple network
      let ncmPeers: Array<NCMState>;
      async function link(a: number, b: number) {
        const ncmA = ncmPeers[a];
        const ncmB = ncmPeers[b];
        await ncmA.nodeConnectionManager.createConnection(
          [ncmB.nodeId],
          localHost,
          ncmB.port,
        );
      }
      async function quickLink(structure: Array<Array<number>>) {
        const linkPs: Array<Promise<void>> = [];
        for (const chain of structure) {
          for (let i = 1; i < chain.length; i++) {
            linkPs.push(link(chain[i - 1], chain[i]));
          }
        }
        await Promise.all(linkPs);
      }

      beforeEach(async () => {
        ncmPeers = [];
        const createPs: Array<Promise<void>> = [];
        for (let i = 0; i < 5; i++) {
          const peerP = nodesTestUtils
            .nodeConnectionManagerFactory({
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
                  }) as AgentServerManifest,
              },
              logger: logger.getChild(`${NodeConnectionManager.name}Peer${i}`),
            })
            .then((peer) => {
              ncmPeers[i] = peer;
            });
          createPs.push(peerP);
        }
        await Promise.all(createPs);
      });
      afterEach(async () => {
        const destroyPs: Array<Promise<void>> = [];
        for (const ncmPeer of ncmPeers) {
          destroyPs.push(ncmPeer.nodeConnectionManager.stop({ force: true }));
        }
        await Promise.all(destroyPs);
      });

      test('connection found in chain graph', async () => {
        // Structure is an acyclic graph
        // 0 -> 1 -> 2 -> 3 -> 4
        await quickLink([[0, 1, 2, 3, 4]]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const path = await nodeManager.findNode(ncmPeers[4].nodeId, 3);
        expect(path).toBeDefined();
        expect(path!.length).toBe(5);
      });
      test('connection found in MST graph', async () => {
        // Structure is an acyclic graph
        // 0 -> 1 -> 2
        // 3 -> 1 -> 4
        await quickLink([
          [0, 1, 2],
          [3, 1, 4],
        ]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const path = await nodeManager.findNode(ncmPeers[4].nodeId, 3);
        expect(path).toBeDefined();
        expect(path!.length).toBe(3);
      });
      test('connection found in cyclic graph', async () => {
        // Structure is a ring with a branch
        // 0 -> 1 -> 2 -> 3 -> 0
        // 4 -> 2
        await quickLink([
          [0, 1, 2, 3, 0],
          [4, 2],
        ]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const path = await nodeManager.findNode(ncmPeers[4].nodeId, 3);
        expect(path).toBeDefined();
        expect(path!.length).toBe(4);
      });
      test('finding self will do exhaustive search and not find self', async () => {
        // Structure is branching
        // 0 -> 1 -> 2 -> 3
        // 1 -> 4
        await quickLink([
          [0, 1, 2, 3],
          [1, 4],
        ]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const path = await nodeManager.findNode(keyRing.getNodeId(), 3);
        expect(path).toBeUndefined();
        // All connections made
        expect(nodeConnectionManager.connectionsActive()).toBe(5);
      });
      test('finding self will hit limit and not find self', async () => {
        // Structure is a chain
        // 0 -> 1 -> 2 -> 3 -> 4
        await quickLink([[0, 1, 2, 3, 4]]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const path = await nodeManager.findNode(keyRing.getNodeId(), 3, 3);
        expect(path).toBeUndefined();
        // All connections made
        expect(nodeConnectionManager.connectionsActive()).toBe(4);
      });
      test('connection found in two attempts', async () => {
        // Structure is a chain
        // 0 -> 1 -> 2 -> 3 -> 4
        await quickLink([[0, 1, 2, 3, 4]]);
        // Creating first connection to 0;
        await nodeConnectionManager.createConnection(
          [ncmPeers[0].nodeId],
          localHost,
          ncmPeers[0].port,
        );

        const path = await nodeManager.findNode(ncmPeers[4].nodeId, 1, 3);
        expect(path).toBeUndefined();
        // Should have initial connection + 3 new ones
        expect(nodeConnectionManager.connectionsActive()).toBe(4);

        // 2nd attempt continues where we left off due to existing connections
        const path2 = await nodeManager.findNode(ncmPeers[4].nodeId, 1, 3);
        expect(path2).toBeDefined();
        expect(path2!.length).toBe(2);
      });
    });
  });
});
