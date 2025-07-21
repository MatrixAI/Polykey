import type { Host, Port } from '#network/types.js';
import type { AgentServerManifest } from '#nodes/agent/handlers/index.js';
import type nodeGraph from '#nodes/NodeGraph.js';
import type { NCMState } from './utils.js';
import type {
  NodeAddress,
  NodeContactAddressData,
  NodeId,
} from '#nodes/types.js';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  NodesAuthenticateConnectionMessage,
  SuccessMessage,
} from '#nodes/agent/types.js';
import type { JSONValue, ObjectEmpty } from '#index.js';
import type { ContextTimed } from '@matrixai/contexts';
import type { AgentClientManifest } from '#nodes/agent/callers/index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { jest } from '@jest/globals';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Semaphore } from '@matrixai/async-locks';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { UnaryHandler } from '@matrixai/rpc';
import { generateNodeIdForBucket } from './utils.js';
import * as nodesTestUtils from './utils.js';
import * as testsUtils from '../utils/index.js';
import ACL from '#acl/ACL.js';
import NodeGraph from '#nodes/NodeGraph.js';
import {
  NodesClaimsGet,
  NodesClosestActiveConnectionsGet,
  NodesClosestLocalNodesGet,
} from '#nodes/agent/handlers/index.js';
import * as keysUtils from '#keys/utils/index.js';
import * as nodesErrors from '#nodes/errors.js';
import * as nodesEvents from '#nodes/events.js';
import NodeConnectionManager from '#nodes/NodeConnectionManager.js';
import NodesCrossSignClaim from '#nodes/agent/handlers/NodesCrossSignClaim.js';
import NodesConnectionSignalFinal from '#nodes/agent/handlers/NodesConnectionSignalFinal.js';
import NodesConnectionSignalInitial from '#nodes/agent/handlers/NodesConnectionSignalInitial.js';
import NodesAuthenticateConnection from '#nodes/agent/handlers/NodesAuthenticateConnection.js';
import * as nodesUtils from '#nodes/utils.js';
import { TaskManager } from '#tasks/index.js';
import { NodeConnection, NodeManager } from '#nodes/index.js';
import { GestaltGraph } from '#gestalts/index.js';
import { Sigchain } from '#sigchain/index.js';
import { KeyRing } from '#keys/index.js';
import NodeConnectionQueue from '#nodes/NodeConnectionQueue.js';
import * as utils from '#utils/index.js';
import rpcClientManifest from '#nodes/agent/callers/index.js';
import * as claimNetworkAuthorityUtils from '#claims/payloads/claimNetworkAuthority.js';
import * as claimNetworkAccessUtils from '#claims/payloads/claimNetworkAccess.js';
import NodesClaimNetworkSign from '#nodes/agent/handlers/NodesClaimNetworkSign.js';
import NodesClaimNetworkAuthorityGet from '#nodes/agent/handlers/NodesClaimNetworkAuthorityGet.js';
import * as claimsErrors from '#claims/errors.js';

class DummyNodesAuthenticateConnection extends UnaryHandler<
  ObjectEmpty,
  AgentRPCRequestParams<NodesAuthenticateConnectionMessage>,
  AgentRPCResponseResult<SuccessMessage>
> {
  public handle = async (
    _input: AgentRPCRequestParams<NodesAuthenticateConnectionMessage>,
    _cancel,
    _meta: Record<string, JSONValue> | undefined,
    _ctx: ContextTimed,
  ): Promise<AgentRPCResponseResult<SuccessMessage>> => {
    return {
      type: 'success',
      success: true,
    };
  };
}

async function allowNodeToJoin(
  gestaltGraph: GestaltGraph,
  nodeId: NodeId,
): Promise<void> {
  await gestaltGraph.setNode({
    nodeId: nodeId,
  });
  await gestaltGraph.setGestaltAction(['node', nodeId], 'join');
}

describe(`${NodeManager.name}`, () => {
  const logger = new Logger(`${NodeManager.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'password';
  const localHost = '127.0.0.1' as Host;
  const timeoutTime = 1000;
  const dummyAgentService = {
    nodesAuthenticateConnection: new DummyNodesAuthenticateConnection({}),
  } as unknown as AgentServerManifest;

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
    let nodeManager: NodeManager<AgentClientManifest> | undefined;
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
        } as NodeConnectionManager<AgentClientManifest>,
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
    let nodeConnectionManager: NodeConnectionManager<AgentClientManifest>;
    let taskManager: TaskManager;
    let nodeManager: NodeManager<AgentClientManifest>;

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
        rpcClientManifest: rpcClientManifest,
        authenticateNetworkForwardCallback:
          nodesUtils.nodesAuthenticateConnectionForwardBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        authenticateNetworkReverseCallback:
          nodesUtils.nodesAuthenticateConnectionReverseBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      await nodeConnectionManager.start({
        agentService: dummyAgentService,
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
    test('adding and updating a single node should not cause conflicts', async () => {
      // We need 5+ addresses to be added multiple times all concurrently
      // quick way to generate address data
      let count = 1;
      const nodeContactAddressDataFactory = (): NodeContactAddressData => {
        return {
          mode: 'signal',
          connectedTime: count++,
          scopes: ['global'],
        };
      };

      const nodeId = nodesTestUtils.generateRandomNodeId();
      const { p, resolveP } = utils.promise();
      const promises: Array<Promise<void>> = [];
      for (let i = 0; i < 30; i++) {
        promises.push(
          (async () => {
            await p;
            await nodeManager.setNode(
              nodeId,
              ['123.123.123.123' as Host, (i % 6) as Port],
              nodeContactAddressDataFactory(),
            );
          })(),
        );
      }
      await Promise.all([...promises, resolveP()]);

      const nodeContact = await nodeGraph.getNodeContact(nodeId);
      expect(Object.keys(nodeContact!).length).toBeLessThanOrEqual(
        nodeGraph.nodeContactAddressLimit,
      );
    });
    test('should not add new node if bucket is full and old nodes are responsive', async () => {
      const mockedPingNode = jest.spyOn(nodeManager, 'pingNodeAddressMultiple');
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

      mockedPingNode.mockResolvedValue(true);
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
      const mockedPingNode = jest.spyOn(nodeManager, 'pingNodeAddressMultiple');
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

      mockedPingNode.mockResolvedValue(true);
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
      const mockedPingNode = jest.spyOn(nodeManager, 'pingNodeAddressMultiple');
      // Fill bucket
      const nodeId = generateNodeIdForBucket(keyRing.getNodeId(), 255, 0);
      for (let i = 0; i < 20; i++) {
        const nodeId = generateNodeIdForBucket(keyRing.getNodeId(), 255, i + 1);
        await nodeManager.setNode(nodeId, nodeAddress, nodeContactAddressData);
      }

      mockedPingNode.mockResolvedValue(false);
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
      const mockedPingNode = jest.spyOn(nodeManager, 'pingNodeAddressMultiple');
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
          resolve(false);
        });
      });
      // Add 21st node
      // Should not time out
      await nodeManager.setNode(nodeId, nodeAddress, nodeContactAddressData);
      waitResolveP();
    });
    test('can create a claimNetworkAuthority and verify using the network public ID', async () => {
      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'test.network.com';
      const result = await nodeManager.createClaimNetworkAuthority(
        networkNodeId,
        network,
        true,
        async (claim) => {
          claim.signWithPrivateKey(networkKeyPair.privateKey);
          return claim;
        },
      );

      const [, token] = result;
      const targetNodeId = keyRing.getNodeId();
      // The generated claim is valid
      claimNetworkAuthorityUtils.verifyClaimNetworkAuthority(
        networkNodeId,
        targetNodeId,
        network,
        token,
      );

      // Will throw because the subject node isn't the network authority or vice versa
      expect(() =>
        claimNetworkAuthorityUtils.verifyClaimNetworkAuthority(
          targetNodeId,
          networkNodeId,
          network,
          token,
        ),
      ).toThrow();
      // Will throw if network doesn't match
      expect(() =>
        claimNetworkAuthorityUtils.verifyClaimNetworkAuthority(
          networkNodeId,
          targetNodeId,
          'some.other.network.com',
          token,
        ),
      ).toThrow();
    });
    test('can create a self signed claimNetworkAccess and verify it', async () => {
      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'test.network.com';
      const result = await nodeManager.createClaimNetworkAuthority(
        networkNodeId,
        network,
        true,
        async (claim) => {
          claim.signWithPrivateKey(networkKeyPair.privateKey);
          return claim;
        },
      );

      const [, token] = result;
      const targetNodeId = keyRing.getNodeId();

      // Creating the self signed access claim
      const [, selfSignedClaimNetworkAccessToken] =
        await nodeManager.createSelfSignedClaimNetworkAccess(token);
      claimNetworkAccessUtils.verifyClaimNetworkAccess(
        networkNodeId,
        targetNodeId,
        network,
        selfSignedClaimNetworkAccessToken,
      );
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
    let nodeConnectionManager: NodeConnectionManager<AgentClientManifest>;
    let taskManager: TaskManager;
    let nodeManager: NodeManager<AgentClientManifest>;

    let basePathPeer: string;
    let keyRingPeer: KeyRing;
    let dbPeer: DB;
    let aclPeer: ACL;
    let sigchainPeer: Sigchain;
    let gestaltGraphPeer: GestaltGraph;
    let nodeGraphPeer: NodeGraph;
    let nodeConnectionManagerPeer: NodeConnectionManager<AgentClientManifest>;
    let taskManagerPeer: TaskManager;
    let nodeManagerPeer: NodeManager<AgentClientManifest>;

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
        rpcClientManifest: rpcClientManifest,
        authenticateNetworkForwardCallback:
          nodesUtils.nodesAuthenticateConnectionForwardBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        authenticateNetworkReverseCallback:
          nodesUtils.nodesAuthenticateConnectionReverseBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        logger: logger.getChild(`${NodeConnectionManager.name}Local`),
        connectionConnectTimeoutTime: timeoutTime,
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
      await nodeConnectionManager.start({
        agentService: {
          nodesAuthenticateConnection: new NodesAuthenticateConnection({
            nodeConnectionManager: nodeConnectionManager,
          }),
        } as AgentServerManifest,
        host: localHost,
      });

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
        rpcClientManifest: rpcClientManifest,
        authenticateNetworkForwardCallback:
          nodesUtils.nodesAuthenticateConnectionForwardBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        authenticateNetworkReverseCallback:
          nodesUtils.nodesAuthenticateConnectionReverseBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        logger: logger.getChild(`${NodeConnectionManager.name}Peer`),
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
          nodesAuthenticateConnection: new NodesAuthenticateConnection({
            nodeConnectionManager: nodeConnectionManagerPeer,
          }),
          nodesClaimNetworkSign: new NodesClaimNetworkSign({
            nodeManager: nodeManagerPeer,
            acl: aclPeer,
          }),
          nodesClaimNetworkAuthorityGet: new NodesClaimNetworkAuthorityGet({
            nodeManager: nodeManagerPeer,
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
        const abortController = new AbortController();
        const ctx = { signal: abortController.signal } as ContextTimed;
        const [resourceReleaser, nodeConnection] =
          await nodeManager.acquireConnection(nodeId, ctx)();
        expect(nodeConnection).toBeInstanceOf(NodeConnection);
        expect(nodeConnectionManager.hasConnection(nodeId)).toBeTrue();
        await resourceReleaser();
      });
      test('acquire Connection fails', async () => {
        const abortController = new AbortController();
        const ctx = { signal: abortController.signal } as ContextTimed;
        const nodeId = keyRingPeer.getNodeId();
        await expect(
          nodeManager.acquireConnection(nodeId, ctx)(),
        ).rejects.toThrow(nodesErrors.ErrorNodeManagerConnectionFailed);
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

        await nodeManager.withConnF(nodeId, undefined, async (conn) => {
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
          undefined,
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
    test('adds node to NodeGraph after successful  and authentication', async () => {
      await nodeConnectionManager.createConnection(
        [keyRingPeer.getNodeId()],
        localHost,
        nodeConnectionManagerPeer.port,
      );
      // Wait for handler to add nodes to the graph
      await testsUtils.promFromEvent(
        nodeConnectionManager,
        nodesEvents.EventNodeConnectionManagerConnectionAuthenticated,
      );
      // Give time for the node to be added
      await utils.sleep(500);
      expect(await nodeGraph.nodesTotal()).toBe(1);
      expect(await nodeGraphPeer.nodesTotal()).toBe(1);
    });
    test('failure to authenticate will not add node to NodeGraph', async () => {
      nodeConnectionManager.setAuthenticateNetworkReverseCallback(
        nodesUtils.nodesAuthenticateConnectionReverseDeny,
      );
      nodeConnectionManagerPeer.setAuthenticateNetworkReverseCallback(
        nodesUtils.nodesAuthenticateConnectionReverseDeny,
      );
      await nodeConnectionManager.createConnection(
        [keyRingPeer.getNodeId()],
        localHost,
        nodeConnectionManagerPeer.port,
      );
      // Give time for the node to be added
      await utils.sleep(1000);
      expect(await nodeGraph.nodesTotal()).toBe(0);
      expect(await nodeGraphPeer.nodesTotal()).toBe(0);
    });

    // TODO tests
    //  1. claiming a network should fail if issuer doesn't have a valid claimNetworkAuthority
    //  2. Claming a network should fail if issuer doesn't allow the requesting node access.
    test('creating a claimNetworkAccess token and verifying it', async () => {
      const nodeIdTarget = keyRingPeer.getNodeId();
      // Adding permission
      await aclPeer.setNodePerm(keyRing.getNodeId(), {
        gestalt: {
          claim: null,
        },
        vaults: {},
      });

      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'test.network.com';

      await nodeManagerPeer.createClaimNetworkAuthority(
        networkNodeId,
        network,
        true,
        async (claim) => {
          claim.signWithPrivateKey(networkKeyPair.privateKey);
          return claim;
        },
      );
      // Start the connection
      await nodeConnectionManager.createConnection(
        [nodeIdTarget],
        localHost,
        nodeConnectionManagerPeer.port,
      );
      await allowNodeToJoin(gestaltGraphPeer, keyRing.getNodeId());
      const result = await nodeManager.claimNetwork(nodeIdTarget, network);
      const [, token] = result;
      claimNetworkAccessUtils.verifyClaimNetworkAccess(
        networkNodeId,
        keyRing.getNodeId(),
        network,
        token,
      );
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
    let nodeConnectionManager: NodeConnectionManager<AgentClientManifest>;
    let taskManager: TaskManager;
    let nodeManager: NodeManager<AgentClientManifest>;

    let basePathPeer: string;
    let keyRingPeer: KeyRing;
    let dbPeer: DB;
    let aclPeer: ACL;
    let sigchainPeer: Sigchain;
    let gestaltGraphPeer: GestaltGraph;
    let nodeGraphPeer: NodeGraph;
    let nodeConnectionManagerPeer: NodeConnectionManager<AgentClientManifest>;
    let taskManagerPeer: TaskManager;
    let nodeManagerPeer: NodeManager<AgentClientManifest>;

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
        rpcClientManifest: rpcClientManifest,
        authenticateNetworkForwardCallback:
          nodesUtils.nodesAuthenticateConnectionForwardBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        authenticateNetworkReverseCallback:
          nodesUtils.nodesAuthenticateConnectionReverseBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      await nodeConnectionManager.start({
        agentService: dummyAgentService,
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
        rpcClientManifest: rpcClientManifest,
        authenticateNetworkForwardCallback:
          nodesUtils.nodesAuthenticateConnectionForwardBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        authenticateNetworkReverseCallback:
          nodesUtils.nodesAuthenticateConnectionReverseBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      await nodeConnectionManagerPeer.start({
        agentService: dummyAgentService,
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
      // Allow time for DNS to propagate
      await utils.sleep(100);
      const result = await nodeManager.findNodeByMDNS(keyRingPeer.getNodeId());
      expect(result).toBeDefined();
      const [[host, port]] = result;
      expect(host).toBe(localHost);
      expect(port).toBe(nodeConnectionManagerPeer.port);
    });
    test('findNode with mdns', async () => {
      // Allow time for DNS to propagate
      await utils.sleep(100);
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
    let nodeConnectionManager: NodeConnectionManager<AgentClientManifest>;
    let taskManager: TaskManager;
    let nodeManager: NodeManager<AgentClientManifest>;

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
      await ncmA.nodeConnectionManager.isAuthenticatedP(ncmB.nodeId);
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
        rpcClientManifest: rpcClientManifest,
        authenticateNetworkForwardCallback:
          nodesUtils.nodesAuthenticateConnectionForwardBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        authenticateNetworkReverseCallback:
          nodesUtils.nodesAuthenticateConnectionReverseBasicPublicFactory(
            testsUtils.testNetworkName,
          ),
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      await nodeConnectionManager.start({
        agentService: {
          nodesAuthenticateConnection: new NodesAuthenticateConnection({
            nodeConnectionManager: nodeConnectionManager,
          }),
        } as AgentServerManifest,
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
                  nodesAuthenticateConnection: new NodesAuthenticateConnection({
                    nodeConnectionManager: nodeConnectionManager,
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
        logger.debug(
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
        await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
        await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
        await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
        await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
        await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
        await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
        await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
        await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
        await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
        await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
        undefined,
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
      await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

      await Promise.all([
        await ncmPeers[3].nodeConnectionManager.stop({ force: true }),
        await ncmPeers[4].nodeConnectionManager.stop({ force: true }),
      ]);

      const mockedRefreshBucket = jest.spyOn(nodeManager, 'refreshBucket');

      await nodeManager.syncNodeGraph(
        undefined,
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
    test('network entry with syncNodeGraph handles failure to resolve hostnames', async () => {
      const syncP = nodeManager.syncNodeGraph(
        undefined,
        [
          [ncmPeers[0].nodeId, ['some.random.host' as Host, 55555 as Port]],
          [ncmPeers[0].nodeId, [localHost, 55555 as Port]],
        ],
        1000,
        true,
      );
      await expect(syncP).rejects.toThrow(
        nodesErrors.ErrorNodeManagerSyncNodeGraphFailed,
      );
      const error = await syncP.catch((e) => e);
      // Expecting `Failed to establish any connections with the following errors '[ErrorNodeManagerResolveNodeFailed: Failed to resolve 'some.random.host',ErrorNodeConnectionTimeout]'`
      expect(error.message).toIncludeMultiple([
        'Failed to establish any connections with the following errors',
        'ErrorNodeManagerResolveNodeFailed',
        'some.random.host',
        'ErrorNodeConnectionTimeout',
      ]);
      expect(error.cause).toBeInstanceOf(AggregateError);
      expect(error.cause.errors[0]).toBeInstanceOf(
        nodesErrors.ErrorNodeManagerResolveNodeFailed,
      );
      expect(error.cause.errors[1]).toBeInstanceOf(
        nodesErrors.ErrorNodeConnectionTimeout,
      );
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
      await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

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
      await nodeConnectionManager.isAuthenticatedP(ncmPeers[0].nodeId);

      expect(await nodeGraph.nodesTotal()).toBe(0);

      await nodeManager.syncNodeGraph(
        undefined,
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
  describe('simulating a private network', () => {
    let basePath: string;

    // Will create 6 peers forming a simple network
    const ncmPeers: Array<{
      db: DB;
      keyRing: KeyRing;
      acl: ACL;
      sigchain: Sigchain;
      gestaltGraph: GestaltGraph;
      nodeGraph: NodeGraph;
      nodeConnectionManager: NodeConnectionManager<AgentClientManifest>;
      taskManager: TaskManager;
      nodeManager: NodeManager<AgentClientManifest>;
    }> = [];

    const createPeerNode = async (): Promise<{
      db: DB;
      keyRing: KeyRing;
      acl: ACL;
      sigchain: Sigchain;
      gestaltGraph: GestaltGraph;
      nodeGraph: NodeGraph;
      nodeConnectionManager: NodeConnectionManager<AgentClientManifest>;
      taskManager: TaskManager;
      nodeManager: NodeManager<AgentClientManifest>;
    }> => {
      const newId = ncmPeers.length;
      const db = await DB.createDB({
        dbPath: path.join(basePath, `db-${newId}`),
        logger,
      });
      const keyRing = await KeyRing.createKeyRing({
        keysPath: path.join(basePath, `key-${newId}`),
        password,
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
        logger,
      });
      const acl = await ACL.createACL({
        db,
        logger: logger.getChild(ACL.name),
      });
      const sigchain = await Sigchain.createSigchain({
        db,
        keyRing,
        logger: logger.getChild(Sigchain.name),
      });
      const gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger: logger.getChild(GestaltGraph.name),
      });
      const nodeGraph = await NodeGraph.createNodeGraph({
        db,
        keyRing,
        logger: logger.getChild(NodeGraph.name),
      });
      const nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        tlsConfig: await testsUtils.createTLSConfig(keyRing.keyPair),
        rpcClientManifest: rpcClientManifest,
        authenticateNetworkForwardCallback:
          nodesUtils.nodesAuthenticateConnectionForwardDefault,
        authenticateNetworkReverseCallback:
          nodesUtils.nodesAuthenticateConnectionReverseDeny,
        logger: logger.getChild(NodeConnectionManager.name),
        connectionConnectTimeoutTime: timeoutTime,
      });
      const taskManager = await TaskManager.createTaskManager({
        db,
        logger: logger.getChild(TaskManager.name),
      });
      const nodeManager = new NodeManager({
        db,
        keyRing,
        gestaltGraph,
        nodeGraph,
        nodeConnectionManager,
        sigchain,
        taskManager,
        logger: logger.getChild(NodeManager.name),
      });
      await nodeConnectionManager.start({
        agentService: {
          nodesAuthenticateConnection: new NodesAuthenticateConnection({
            nodeConnectionManager: nodeConnectionManager,
          }),
          nodesClaimNetworkSign: new NodesClaimNetworkSign({
            nodeManager,
            acl,
          }),
          nodesClaimNetworkAuthorityGet: new NodesClaimNetworkAuthorityGet({
            nodeManager,
          }),
        },
        host: localHost,
      });
      await nodeManager.start();

      const peer = {
        db,
        keyRing,
        acl,
        sigchain,
        gestaltGraph,
        nodeGraph,
        nodeConnectionManager,
        taskManager,
        nodeManager,
      };
      ncmPeers[newId] = peer;
      return peer;
    };

    beforeEach(async () => {
      basePath = path.join(dataDir, 'local');
      await fs.promises.mkdir(basePath);
    });
    afterEach(async () => {
      for (const ncmPeer of ncmPeers) {
        await ncmPeer.nodeManager.stop();
        await ncmPeer.taskManager.stop();
        await ncmPeer.nodeConnectionManager.stop();
        await ncmPeer.nodeGraph.stop();
        await ncmPeer.gestaltGraph.stop();
        await ncmPeer.sigchain.stop();
        await ncmPeer.acl.stop();
        await ncmPeer.db.stop();
        await ncmPeer.keyRing.stop();
      }
    });

    test('one seed node and one joining node', async () => {
      // Creating network credentials
      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'test.network.com';

      // Setting up seed nodes claims
      const seedNode = await createPeerNode();
      const [, seedNodeClaimNetworkAuthority] =
        await seedNode.nodeManager.createClaimNetworkAuthority(
          networkNodeId,
          network,
          true,
          async (claim) => {
            claim.signWithPrivateKey(networkKeyPair.privateKey);
            return claim;
          },
        );
      await seedNode.nodeManager.createSelfSignedClaimNetworkAccess(
        seedNodeClaimNetworkAuthority,
      );
      const seedNodeId = seedNode.keyRing.getNodeId();

      // Setting up the new node entering the network
      const node1 = await createPeerNode();
      // Connect to the seed node
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      const node1Id = node1.keyRing.getNodeId();
      await allowNodeToJoin(seedNode.gestaltGraph, node1Id);
      const [, peerClaimNetworkAccess] = await node1.nodeManager.claimNetwork(
        seedNodeId,
        network,
      );
      claimNetworkAccessUtils.verifyClaimNetworkAccess(
        networkNodeId,
        node1Id,
        network,
        peerClaimNetworkAccess,
      );

      // We have now proved that a node can request access to the network from a node with network authority.
      // Now We should be able to connect while authenticated to the seed node.

      // Re-initiate authentication
      await seedNode.nodeConnectionManager.destroyConnection(node1Id, true);
      await node1.nodeConnectionManager.destroyConnection(seedNodeId, true);
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      await node1.nodeManager.withConnF(seedNodeId, undefined, async () => {
        // Do nothing
      });
    });
    test('joining node can restart and stay apart of the network', async () => {
      // Creating network credentials
      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'test.network.com';

      // Setting up seed nodes claims
      const seedNode = await createPeerNode();
      const [, seedNodeClaimNetworkAuthority] =
        await seedNode.nodeManager.createClaimNetworkAuthority(
          networkNodeId,
          network,
          true,
          async (claim) => {
            claim.signWithPrivateKey(networkKeyPair.privateKey);
            return claim;
          },
        );
      await seedNode.nodeManager.createSelfSignedClaimNetworkAccess(
        seedNodeClaimNetworkAuthority,
      );
      const seedNodeId = seedNode.keyRing.getNodeId();

      // Setting up the new node entering the network
      const node1 = await createPeerNode();
      // Connect to the seed node
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      await allowNodeToJoin(seedNode.gestaltGraph, node1.keyRing.getNodeId());
      const [, peerClaimNetworkAccess] = await node1.nodeManager.claimNetwork(
        seedNodeId,
        network,
      );
      const node1Id = node1.keyRing.getNodeId();
      claimNetworkAccessUtils.verifyClaimNetworkAccess(
        networkNodeId,
        node1Id,
        network,
        peerClaimNetworkAccess,
      );

      // We have now proved that a node can request access to the network from a node with network authority.
      // Now We should be able to connect while authenticated to the seed node.

      // Re-initiate authentication
      await seedNode.nodeConnectionManager.destroyConnection(node1Id, true);

      await node1.nodeManager.stop();
      await node1.nodeConnectionManager.stop();
      await node1.nodeConnectionManager.start({
        agentService: {
          nodesAuthenticateConnection: new NodesAuthenticateConnection({
            nodeConnectionManager: node1.nodeConnectionManager,
          }),
          nodesClaimNetworkSign: new NodesClaimNetworkSign({
            nodeManager: node1.nodeManager,
            acl: node1.acl,
          }),
        } as AgentServerManifest,
        host: localHost,
      });
      await node1.nodeManager.start();
      await node1.nodeManager.switchNetwork(network);

      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      await node1.nodeManager.withConnF(seedNodeId, undefined, async () => {
        // Do nothing
      });
    });
    test('two nodes can join a network and connect to each other', async () => {
      // Creating network credentials
      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'test.network.com';

      // Setting up seed nodes claims
      const seedNode = await createPeerNode();
      const [, seedNodeClaimNetworkAuthority] =
        await seedNode.nodeManager.createClaimNetworkAuthority(
          networkNodeId,
          network,
          true,
          async (claim) => {
            claim.signWithPrivateKey(networkKeyPair.privateKey);
            return claim;
          },
        );
      await seedNode.nodeManager.createSelfSignedClaimNetworkAccess(
        seedNodeClaimNetworkAuthority,
      );
      const seedNodeId = seedNode.keyRing.getNodeId();

      // Setting up the new nodes entering the network
      const node1 = await createPeerNode();
      const node2 = await createPeerNode();
      const node1Id = node1.keyRing.getNodeId();
      const node2Id = node2.keyRing.getNodeId();

      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      await node2.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      await allowNodeToJoin(seedNode.gestaltGraph, node1Id);
      await node1.nodeManager.claimNetwork(seedNodeId, network);
      await allowNodeToJoin(seedNode.gestaltGraph, node2Id);
      await node2.nodeManager.claimNetwork(seedNodeId, network);

      // The two nodes should allow connections to each other
      await node1.nodeConnectionManager.createConnection(
        [node2Id],
        localHost,
        node2.nodeConnectionManager.port,
      );

      await node1.nodeManager.withConnF(node2Id, undefined, async () => {});
    });
    test('two nodes can not communicate if they do not share the network', async () => {
      // Creating network credentials
      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'test.network.com';

      // Setting up seed nodes claims
      const seedNode = await createPeerNode();
      const [, seedNodeClaimNetworkAuthority] =
        await seedNode.nodeManager.createClaimNetworkAuthority(
          networkNodeId,
          network,
          true,
          async (claim) => {
            claim.signWithPrivateKey(networkKeyPair.privateKey);
            return claim;
          },
        );
      await seedNode.nodeManager.createSelfSignedClaimNetworkAccess(
        seedNodeClaimNetworkAuthority,
      );
      const seedNodeId = seedNode.keyRing.getNodeId();

      // Setting up the new nodes entering the network
      const node1 = await createPeerNode();
      const node2 = await createPeerNode();
      const node1Id = node1.keyRing.getNodeId();
      const node2Id = node2.keyRing.getNodeId();

      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      await node2.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      await allowNodeToJoin(seedNode.gestaltGraph, node1Id);
      await node1.nodeManager.claimNetwork(seedNodeId, network);
      // We intentionally don't have node2 join the network here

      // The two nodes should allow connections to each other
      await node1.nodeConnectionManager.createConnection(
        [node2Id],
        localHost,
        node2.nodeConnectionManager.port,
      );

      await expect(
        node1.nodeManager.withConnF(node2Id, undefined, async () => {
          // Do nothing
        }),
      ).rejects.toThrow(nodesErrors.ErrorNodeManagerAuthenticationFailed);
    });
    test('two networks can operate side by side without crosstalk', async () => {
      // Creating network credentials
      const networkKeyPair1 = keysUtils.generateKeyPair();
      const networkNodeId1 = keysUtils.publicKeyToNodeId(
        networkKeyPair1.publicKey,
      );
      const network1 = 'test1.network.com';

      // Setting up seed nodes claims
      const seedNode1 = await createPeerNode();
      const [, seedNodeClaimNetworkAuthority1] =
        await seedNode1.nodeManager.createClaimNetworkAuthority(
          networkNodeId1,
          network1,
          true,
          async (claim) => {
            claim.signWithPrivateKey(networkKeyPair1.privateKey);
            return claim;
          },
        );
      await seedNode1.nodeManager.createSelfSignedClaimNetworkAccess(
        seedNodeClaimNetworkAuthority1,
      );
      const seedNodeId1 = seedNode1.keyRing.getNodeId();

      // Setting up 2nd seed node
      // Creating network credentials
      const networkKeyPair2 = keysUtils.generateKeyPair();
      const networkNodeId2 = keysUtils.publicKeyToNodeId(
        networkKeyPair2.publicKey,
      );
      const network2 = 'test2.network.com';

      // Setting up seed nodes claims
      const seedNode2 = await createPeerNode();
      const [, seedNodeClaimNetworkAuthority2] =
        await seedNode2.nodeManager.createClaimNetworkAuthority(
          networkNodeId2,
          network2,
          true,
          async (claim) => {
            claim.signWithPrivateKey(networkKeyPair2.privateKey);
            return claim;
          },
        );
      await seedNode2.nodeManager.createSelfSignedClaimNetworkAccess(
        seedNodeClaimNetworkAuthority2,
      );
      const seedNodeId2 = seedNode2.keyRing.getNodeId();

      // Setting up the new nodes entering the network
      const node1 = await createPeerNode();
      const node1Id = node1.keyRing.getNodeId();
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId1],
        localHost,
        seedNode1.nodeConnectionManager.port,
      );
      await allowNodeToJoin(seedNode1.gestaltGraph, node1Id);
      await node1.nodeManager.claimNetwork(seedNodeId1, network1);

      const node2 = await createPeerNode();
      const node2Id = node2.keyRing.getNodeId();
      await node2.nodeConnectionManager.createConnection(
        [seedNodeId2],
        localHost,
        seedNode2.nodeConnectionManager.port,
      );
      await allowNodeToJoin(seedNode2.gestaltGraph, node2Id);
      await node2.nodeManager.claimNetwork(seedNodeId2, network2);

      // The two nodes should allow connections to each other
      await node1.nodeConnectionManager.createConnection(
        [node2Id],
        localHost,
        node2.nodeConnectionManager.port,
      );
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId2],
        localHost,
        seedNode2.nodeConnectionManager.port,
      );
      await node2.nodeConnectionManager.createConnection(
        [node1Id],
        localHost,
        node1.nodeConnectionManager.port,
      );
      await node2.nodeConnectionManager.createConnection(
        [seedNodeId1],
        localHost,
        seedNode1.nodeConnectionManager.port,
      );
      await seedNode1.nodeConnectionManager.createConnection(
        [seedNodeId2],
        localHost,
        seedNode2.nodeConnectionManager.port,
      );

      // Two nodes can't talk
      await expect(
        node1.nodeManager.withConnF(node2Id, undefined, async () => {
          // Do nothing
        }),
      ).rejects.toThrow(nodesErrors.ErrorNodeManagerAuthenticationFailed);
      await expect(
        node2.nodeManager.withConnF(node1Id, undefined, async () => {
          // Do nothing
        }),
      ).rejects.toThrow(nodesErrors.ErrorNodeManagerAuthenticationFailed);

      // Two seed nodes can't talk
      await expect(
        seedNode1.nodeManager.withConnF(seedNodeId2, undefined, async () => {
          // Do nothing
        }),
      ).rejects.toThrow(nodesErrors.ErrorNodeManagerAuthenticationFailed);
      await expect(
        seedNode2.nodeManager.withConnF(seedNodeId1, undefined, async () => {
          // Do nothing
        }),
      ).rejects.toThrow(nodesErrors.ErrorNodeManagerAuthenticationFailed);

      await seedNode1.nodeConnectionManager.destroyConnection(node1Id, true);
      await node1.nodeConnectionManager.destroyConnection(seedNodeId1, true);
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId1],
        localHost,
        seedNode1.nodeConnectionManager.port,
      );
      // Test1 network can talk
      await node1.nodeManager.withConnF(seedNodeId1, undefined, async () => {
        // Do nothing
      });
      await seedNode1.nodeManager.withConnF(node1Id, undefined, async () => {
        // Do nothing
      });

      await seedNode2.nodeConnectionManager.destroyConnection(node2Id, true);
      await node2.nodeConnectionManager.destroyConnection(seedNodeId2, true);
      await node2.nodeConnectionManager.createConnection(
        [seedNodeId2],
        localHost,
        seedNode2.nodeConnectionManager.port,
      );
      // Test2 network can talk
      await node2.nodeManager.withConnF(seedNodeId2, undefined, async () => {
        // Do nothing
      });
      await seedNode2.nodeManager.withConnF(node2Id, undefined, async () => {
        // Do nothing
      });
    });
    test('a node can join a public network without permissions', async () => {
      // Creating network credentials
      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'public.network.com';

      // Setting up seed nodes claims
      const seedNode = await createPeerNode();
      const [, seedNodeClaimNetworkAuthority] =
        await seedNode.nodeManager.createClaimNetworkAuthority(
          networkNodeId,
          network,
          false,
          async (claim) => {
            claim.signWithPrivateKey(networkKeyPair.privateKey);
            return claim;
          },
        );
      await seedNode.nodeManager.createSelfSignedClaimNetworkAccess(
        seedNodeClaimNetworkAuthority,
      );
      const seedNodeId = seedNode.keyRing.getNodeId();

      // Setting up the new node entering the network
      const node1 = await createPeerNode();
      // Connect to the seed node
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      const node1Id = node1.keyRing.getNodeId();
      // We intentionally do not add permission for the joining node to the seed node
      const [, peerClaimNetworkAccess] = await node1.nodeManager.claimNetwork(
        seedNodeId,
        network,
      );
      claimNetworkAccessUtils.verifyClaimNetworkAccess(
        networkNodeId,
        node1Id,
        network,
        peerClaimNetworkAccess,
      );

      // We have now proved that a node can request access to the network from a node with network authority.
      // Now We should be able to connect while authenticated to the seed node.

      // Re-initiate authentication
      await seedNode.nodeConnectionManager.destroyConnection(node1Id, true);
      await node1.nodeConnectionManager.destroyConnection(seedNodeId, true);
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      await node1.nodeManager.withConnF(seedNodeId, undefined, async () => {
        // Do nothing
      });
    });
    test('node can not join network without permission', async () => {
      // Creating network credentials
      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'test.network.com';

      // Setting up seed nodes claims
      const seedNode = await createPeerNode();
      const [, seedNodeClaimNetworkAuthority] =
        await seedNode.nodeManager.createClaimNetworkAuthority(
          networkNodeId,
          network,
          true,
          async (claim) => {
            claim.signWithPrivateKey(networkKeyPair.privateKey);
            return claim;
          },
        );
      await seedNode.nodeManager.createSelfSignedClaimNetworkAccess(
        seedNodeClaimNetworkAuthority,
      );
      const seedNodeId = seedNode.keyRing.getNodeId();

      // Setting up the new node entering the network
      const node1 = await createPeerNode();
      // Connect to the seed node
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );
      // We intentionally don't provide permission here
      await expect(
        node1.nodeManager.claimNetwork(seedNodeId, network),
      ).rejects.toThrow(claimsErrors.ErrorEmptyStream);
    });
    test('node should automatically request a claim if it does not exist', async () => {
      // Creating network credentials
      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'public.network.com';

      // Setting up seed nodes claims
      const seedNode = await createPeerNode();
      const [, seedNodeClaimNetworkAuthority] =
        await seedNode.nodeManager.createClaimNetworkAuthority(
          networkNodeId,
          network,
          false,
          async (claim) => {
            claim.signWithPrivateKey(networkKeyPair.privateKey);
            return claim;
          },
        );
      await seedNode.nodeManager.createSelfSignedClaimNetworkAccess(
        seedNodeClaimNetworkAuthority,
      );
      const seedNodeId = seedNode.keyRing.getNodeId();

      // Setting up the new node entering the network
      const node1 = await createPeerNode();
      // We intentionally do not claim the network manually
      const node1Id = node1.keyRing.getNodeId();
      await allowNodeToJoin(seedNode.gestaltGraph, node1Id);
      // Connect to the seed node
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );

      await node1.nodeManager.syncNodeGraph(
        network,
        [
          [
            seedNode.keyRing.getNodeId(),
            [localHost, seedNode.nodeConnectionManager.port],
          ],
        ],
        1000,
        true,
      );

      // We have now proved that a node can request access to the network from a node with network authority.
      // Now We should be able to connect while authenticated to the seed node.

      // Re-initiate authentication
      await seedNode.nodeConnectionManager.destroyConnection(node1Id, true);
      await node1.nodeConnectionManager.destroyConnection(seedNodeId, true);
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );

      const networkAccess =
        await node1.nodeManager.getClaimNetworkAccess(network);
      if (networkAccess == null) {
        throw new Error('network access claim not found');
      }
      claimNetworkAccessUtils.verifyClaimNetworkAccess(
        networkNodeId,
        node1Id,
        network,
        networkAccess,
      );

      await node1.nodeManager.withConnF(seedNodeId, undefined, async () => {
        // Do nothing
      });
    });
    test('node should not request new claim if it already exists', async () => {
      // Creating network credentials
      const networkKeyPair = keysUtils.generateKeyPair();
      const networkNodeId = keysUtils.publicKeyToNodeId(
        networkKeyPair.publicKey,
      );
      const network = 'test.network.com';

      // Setting up seed nodes claims
      const seedNode = await createPeerNode();
      const [, seedNodeClaimNetworkAuthority] =
        await seedNode.nodeManager.createClaimNetworkAuthority(
          networkNodeId,
          network,
          true,
          async (claim) => {
            claim.signWithPrivateKey(networkKeyPair.privateKey);
            return claim;
          },
        );
      await seedNode.nodeManager.createSelfSignedClaimNetworkAccess(
        seedNodeClaimNetworkAuthority,
      );
      const seedNodeId = seedNode.keyRing.getNodeId();

      // Setting up the new node entering the network
      const node1 = await createPeerNode();

      const node1Id = node1.keyRing.getNodeId();
      await allowNodeToJoin(seedNode.gestaltGraph, node1Id);

      // Connect to the seednode
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );

      // Create a network access claim
      await node1.nodeManager.claimNetwork(seedNodeId, network);

      // Re-initiate authentication
      await seedNode.nodeConnectionManager.destroyConnection(node1Id, true);
      await node1.nodeConnectionManager.destroyConnection(seedNodeId, true);
      await node1.nodeConnectionManager.createConnection(
        [seedNodeId],
        localHost,
        seedNode.nodeConnectionManager.port,
      );

      // Check the claim once we have re-authenticated
      const token1 = await node1.nodeManager.getClaimNetworkAccess(network);
      if (token1 == null) throw new Error('network access claim not found');
      const token1Id = token1.payload.jti;

      // Try claiming again
      await expect(node1.nodeManager.claimNetwork(seedNodeId, network)).toReject();

      // The token should not have changed
      const token2 = await node1.nodeManager.getClaimNetworkAccess(network);
      if (token2 == null) throw new Error('network access claim not found');
      const token2Id = token2.payload.jti;
      expect(token1Id).toBe(token2Id);
    });
  });
});
