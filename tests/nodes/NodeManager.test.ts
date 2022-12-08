import type { Host, Port } from '@/network/types';
import type { NodeId, NodeAddress } from '@/nodes/types';
import type { Task } from '@/tasks/types';
import type { Key } from '@/keys/types';
import type { SignedClaim } from '@/claims/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import UTP from 'utp-native';
import { Timer } from '@matrixai/timer';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import TaskManager from '@/tasks/TaskManager';
import PolykeyAgent from '@/PolykeyAgent';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import Proxy from '@/network/Proxy';
import Sigchain from '@/sigchain/Sigchain';
import { never, promise, promisify, sleep } from '@/utils';
import * as nodesUtils from '@/nodes/utils';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as utils from '@/utils/index';
import ACL from '@/acl/ACL';
import GestaltGraph from '@/gestalts/GestaltGraph';
import Token from '@/tokens/Token';
import { generateNodeIdForBucket } from './utils';
import * as nodesTestUtils from './utils';
import * as testsUtils from '../utils';

describe(`${NodeManager.name} test`, () => {
  const password = 'password';
  const logger = new Logger(`${NodeManager.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let nodeConnectionManager: NodeConnectionManager;
  let proxy: Proxy;
  let keyRing: KeyRing;
  let db: DB;
  let sigchain: Sigchain;
  let utpSocket: UTP;

  const serverHost = '::1' as Host;
  const externalHost = '127.0.0.1' as Host;
  const localhost = '127.0.0.1' as Host;
  const port = 55556 as Port;
  const serverPort = 0 as Port;
  const externalPort = 0 as Port;
  const mockedPingNode = jest.fn(); // Jest.spyOn(NodeManager.prototype, 'pingNode');
  const mockedIsSeedNode = jest.fn();
  const dummyNodeConnectionManager = {
    connConnectTime: 5000,
    pingTimeout: 5000,
    pingNode: mockedPingNode,
    isSeedNode: mockedIsSeedNode,
  } as unknown as NodeConnectionManager;

  beforeEach(async () => {
    mockedPingNode.mockImplementation(async (_) => true);
    mockedIsSeedNode.mockReturnValue(false);

    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });

    proxy = new Proxy({
      authToken: 'abc',
      logger: logger,
    });
    utpSocket = new UTP({ allowHalfOpen: true });
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(55555, '127.0.0.1');
    await proxy.start({
      serverHost,
      serverPort,
      proxyHost: externalHost,
      proxyPort: externalPort,
      tlsConfig: await testsUtils.createTLSConfig(keyRing.keyPair),
    });
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
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
    sigchain = await Sigchain.createSigchain({ keyRing, db, logger });

    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    taskManager = await TaskManager.createTaskManager({
      activeLimit: 0,
      db,
      lazy: true,
      logger,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      taskManager,
      proxy,
      connConnectTime: 4000,
      pingTimeout: 4000,
      logger,
    });
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    mockedPingNode.mockClear();
    mockedPingNode.mockImplementation(async (_) => true);
    await nodeConnectionManager.stop();
    await nodeGraph.stop();
    await sigchain.stop();
    await taskManager.stop();
    await db.stop();
    await keyRing.stop();
    await proxy.stop();
    utpSocket.close();
    utpSocket.unref();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test(
    'pings node',
    async () => {
      let server: PolykeyAgent | undefined;
      let nodeManager: NodeManager | undefined;
      try {
        server = await PolykeyAgent.createPolykeyAgent({
          password: 'password',
          nodePath: path.join(dataDir, 'server'),
          networkConfig: {
            proxyHost: '127.0.0.1' as Host,
          },
          logger: logger,
          keyRingConfig: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        });
        const serverNodeId = server.keyRing.getNodeId();
        let serverNodeAddress: NodeAddress = {
          host: server.proxy.getProxyHost(),
          port: server.proxy.getProxyPort(),
        };
        await nodeGraph.setNode(serverNodeId, serverNodeAddress);
        nodeManager = new NodeManager({
          db,
          sigchain,
          gestaltGraph,
          keyRing,
          nodeGraph,
          nodeConnectionManager,
          taskManager,
          logger,
        });
        await nodeManager.start();
        await nodeConnectionManager.start({ nodeManager });

        // Set server node offline
        await server.stop();
        // Check if active
        // Case 1: cannot establish new connection, so offline
        const active1 = await nodeManager.pingNode(serverNodeId, undefined, {
          timer: new Timer({ delay: 2000 }),
        });
        expect(active1).toBe(false);
        // Bring server node online
        await server.start({
          password: 'password',
          networkConfig: {
            proxyHost: '127.0.0.1' as Host,
          },
        });
        // Update the node address (only changes because we start and stop)
        serverNodeAddress = {
          host: server.proxy.getProxyHost(),
          port: server.proxy.getProxyPort(),
        };
        await nodeGraph.setNode(serverNodeId, serverNodeAddress);
        // Check if active
        // Case 2: can establish new connection, so online
        const active2 = await nodeManager.pingNode(serverNodeId, undefined, {
          timer: new Timer({ delay: 2000 }),
        });
        expect(active2).toBe(true);
        // Turn server node offline again
        await server.stop();
        // Check if active
        // Case 3: pre-existing connection no longer active, so offline
        const active3 = await nodeManager.pingNode(serverNodeId, undefined, {
          timer: new Timer({ delay: 2000 }),
        });
        expect(active3).toBe(false);
      } finally {
        // Clean up
        await nodeManager?.stop();
        await server?.stop();
      }
    },
    globalThis.failedConnectionTimeout * 2,
  );
  describe('Cross signing claims', () => {
    // These tests follow the following process (from the perspective of Y):
    // 1. X -> sends notification (to start cross signing request) -> Y
    // 2. X <- sends its intermediary signed claim <- Y
    // 3. X -> sends doubly signed claim (Y's intermediary) + its own intermediary claim -> Y
    // 4. X <- sends doubly signed claim (X's intermediary) <- Y
    // We're unable to mock the actions of the server, but we can ensure the
    // state on each side is as expected

    let xDataDir: string;
    let x: PolykeyAgent;
    let xNodeId: NodeId;
    let xNodeAddress: NodeAddress;

    let yDataDir: string;
    let y: PolykeyAgent;
    let yNodeId: NodeId;
    let yNodeAddress: NodeAddress;

    beforeAll(async () => {
      xDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      x = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: xDataDir,
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger,
        keyRingConfig: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      });

      xNodeId = x.keyRing.getNodeId();
      xNodeAddress = {
        host: externalHost,
        port: x.proxy.getProxyPort(),
      };

      yDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      y = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: yDataDir,
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger,
        keyRingConfig: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      });
      yNodeId = y.keyRing.getNodeId();
      yNodeAddress = {
        host: externalHost,
        port: y.proxy.getProxyPort(),
      };

      await x.nodeGraph.setNode(yNodeId, yNodeAddress);
      await y.nodeGraph.setNode(xNodeId, xNodeAddress);
    }, globalThis.polykeyStartupTimeout * 2);
    afterAll(async () => {
      await y.stop();
      await x.stop();
      await fs.promises.rm(yDataDir, {
        force: true,
        recursive: true,
      });
      await fs.promises.rm(xDataDir, {
        force: true,
        recursive: true,
      });
    });

    // Make sure to remove any side-effects after each test
    afterEach(async () => {
      await x.sigchain.stop();
      await x.sigchain.start({ fresh: true });
      await y.sigchain.stop();
      await y.sigchain.start({ fresh: true });
    });

    test('can successfully cross sign a claim', async () => {
      // Make the call to initialise the cross-signing process:
      // 2. X <- sends its intermediary signed claim <- Y
      // 3. X -> sends doubly signed claim (Y's intermediary) + its own intermediary claim -> Y
      // 4. X <- sends doubly signed claim (X's intermediary) <- Y
      await x.acl.setNodeAction(yNodeId, 'claim');
      await y.nodeManager.claimNode(xNodeId);

      // Check X's sigchain state
      let claimX: SignedClaim | undefined;
      for await (const [, claim_] of x.sigchain.getSignedClaims()) {
        claimX = claim_;
      }
      if (claimX == null) fail('No claims exist');
      expect(claimX.payload.typ).toBe('ClaimLinkNode');
      expect(claimX.payload.iss).toBe(nodesUtils.encodeNodeId(yNodeId));
      expect(claimX.payload.sub).toBe(nodesUtils.encodeNodeId(xNodeId));
      // Expect it to be signed by both sides
      const tokenX = Token.fromSigned(claimX);
      expect(
        tokenX.verifyWithPublicKey(x.keyRing.keyPair.publicKey),
      ).toBeTrue();
      expect(
        tokenX.verifyWithPublicKey(y.keyRing.keyPair.publicKey),
      ).toBeTrue();

      // Check Y's sigchain state
      let claimY: SignedClaim | undefined;
      for await (const [, claim_] of y.sigchain.getSignedClaims()) {
        claimY = claim_;
      }
      if (claimY == null) fail('No claims exist');
      expect(claimY.payload.typ).toBe('ClaimLinkNode');
      expect(claimY.payload.iss).toBe(nodesUtils.encodeNodeId(yNodeId));
      expect(claimY.payload.sub).toBe(nodesUtils.encodeNodeId(xNodeId));
      // Expect it to be signed by both sides
      const tokenY = Token.fromSigned(claimY);
      expect(
        tokenY.verifyWithPublicKey(x.keyRing.keyPair.publicKey),
      ).toBeTrue();
      expect(
        tokenY.verifyWithPublicKey(y.keyRing.keyPair.publicKey),
      ).toBeTrue();
    });
    test('can request chain data', async () => {
      let nodeManager: NodeManager | undefined;
      try {
        // Cross signing claims
        await x.acl.setNodeAction(yNodeId, 'claim');
        await y.nodeManager.claimNode(xNodeId);

        nodeManager = new NodeManager({
          db,
          sigchain,
          gestaltGraph,
          keyRing,
          nodeGraph,
          nodeConnectionManager,
          taskManager,
          logger,
        });
        await nodeManager.start();
        await nodeConnectionManager.start({ nodeManager });

        await nodeGraph.setNode(xNodeId, xNodeAddress);
        // We want to get the public key of the server
        const chainData = JSON.stringify(
          await nodeManager.requestChainData(xNodeId),
        );
        expect(chainData).toContain(nodesUtils.encodeNodeId(xNodeId));
        expect(chainData).toContain(nodesUtils.encodeNodeId(yNodeId));
      } finally {
        await nodeManager?.stop();
      }
    });
  });
  test('should add a node when bucket has room', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    try {
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      const localNodeId = keyRing.getNodeId();
      const bucketIndex = 100;
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
      );
      await nodeManager.setNode(nodeId, {} as NodeAddress);

      // Checking bucket
      const bucket = await nodeManager.getBucket(bucketIndex);
      expect(bucket).toHaveLength(1);
    } finally {
      await nodeManager.stop();
    }
  });
  test('should update a node if node exists', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    try {
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      const localNodeId = keyRing.getNodeId();
      const bucketIndex = 100;
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
      );
      await nodeManager.setNode(nodeId, {
        host: '' as Host,
        port: 11111 as Port,
      });

      const nodeData = (await nodeGraph.getNode(nodeId))!;
      await sleep(1100);

      // Should update the node
      await nodeManager.setNode(nodeId, {
        host: '' as Host,
        port: 22222 as Port,
      });

      const newNodeData = (await nodeGraph.getNode(nodeId))!;
      expect(newNodeData.address.port).not.toEqual(nodeData.address.port);
      expect(newNodeData.lastUpdated).not.toEqual(nodeData.lastUpdated);
    } finally {
      await nodeManager.stop();
    }
  });
  test('should not add node if bucket is full and old node is alive', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    const nodeManagerPingMock = jest.spyOn(NodeManager.prototype, 'pingNode');
    try {
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      const localNodeId = keyRing.getNodeId();
      const bucketIndex = 100;
      // Creating 20 nodes in bucket
      for (let i = 1; i <= 20; i++) {
        const nodeId = nodesTestUtils.generateNodeIdForBucket(
          localNodeId,
          bucketIndex,
          i,
        );
        await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
      }
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
      );
      // Mocking ping
      nodeManagerPingMock.mockResolvedValue(true);
      const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
      const oldestNode = await nodeGraph.getNode(oldestNodeId!);
      // Waiting for a second to tick over
      await sleep(1500);
      // Adding a new node with bucket full
      await nodeManager.setNode(nodeId, { port: 55555 } as NodeAddress, true);
      // Bucket still contains max nodes
      const bucket = await nodeManager.getBucket(bucketIndex);
      expect(bucket).toHaveLength(nodeGraph.nodeBucketLimit);
      // New node was not added
      const node = await nodeGraph.getNode(nodeId);
      expect(node).toBeUndefined();
      // Oldest node was updated
      const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
      expect(oldestNodeNew!.lastUpdated).not.toEqual(oldestNode!.lastUpdated);
    } finally {
      await nodeManager.stop();
      nodeManagerPingMock.mockRestore();
    }
  });
  test('should add node if bucket is full, old node is alive and force is set', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    try {
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      const localNodeId = keyRing.getNodeId();
      const bucketIndex = 100;
      // Creating 20 nodes in bucket
      for (let i = 1; i <= 20; i++) {
        const nodeId = nodesTestUtils.generateNodeIdForBucket(
          localNodeId,
          bucketIndex,
          i,
        );
        await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
      }
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
      );
      // Mocking ping
      const nodeManagerPingMock = jest.spyOn(NodeManager.prototype, 'pingNode');
      nodeManagerPingMock.mockResolvedValue(true);
      const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
      // Adding a new node with bucket full
      await nodeManager.setNode(
        nodeId,
        { port: 55555 } as NodeAddress,
        undefined,
        true,
      );
      // Bucket still contains max nodes
      const bucket = await nodeManager.getBucket(bucketIndex);
      expect(bucket).toHaveLength(nodeGraph.nodeBucketLimit);
      // New node was added
      const node = await nodeGraph.getNode(nodeId);
      expect(node).toBeDefined();
      // Oldest node was removed
      const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
      expect(oldestNodeNew).toBeUndefined();
      nodeManagerPingMock.mockRestore();
    } finally {
      await nodeManager.stop();
    }
  });
  test('should add node if bucket is full and old node is dead', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    try {
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      const localNodeId = keyRing.getNodeId();
      const bucketIndex = 100;
      // Creating 20 nodes in bucket
      for (let i = 1; i <= 20; i++) {
        const nodeId = nodesTestUtils.generateNodeIdForBucket(
          localNodeId,
          bucketIndex,
          i,
        );
        await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
      }
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
      );
      // Mocking ping
      const nodeManagerPingMock = jest.spyOn(NodeManager.prototype, 'pingNode');
      nodeManagerPingMock.mockResolvedValue(false);
      const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
      // Adding a new node with bucket full
      await nodeManager.setNode(nodeId, { port: 55555 } as NodeAddress, true);
      // New node was added
      const node = await nodeGraph.getNode(nodeId);
      expect(node).toBeDefined();
      // Oldest node was removed
      const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
      expect(oldestNodeNew).toBeUndefined();
      nodeManagerPingMock.mockRestore();
    } finally {
      await nodeManager.stop();
    }
  });
  test('should add node when an incoming connection is established', async () => {
    let server: PolykeyAgent | undefined;
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    try {
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      server = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(dataDir, 'server'),
        networkConfig: {
          proxyHost: localhost,
        },
        logger: logger,
        keyRingConfig: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      });
      const serverNodeId = server.keyRing.getNodeId();
      const serverNodeAddress: NodeAddress = {
        host: server.proxy.getProxyHost(),
        port: server.proxy.getProxyPort(),
      };
      await nodeGraph.setNode(serverNodeId, serverNodeAddress);

      const expectedHost = proxy.getProxyHost();
      const expectedPort = proxy.getProxyPort();
      const expectedNodeId = keyRing.getNodeId();

      const nodeData = await server.nodeGraph.getNode(expectedNodeId);
      expect(nodeData).toBeUndefined();

      // Now we want to connect to the server by making an echo request.
      await nodeConnectionManager.withConnF(serverNodeId, async (conn) => {
        const client = conn.getClient();
        await client.echo(new utilsPB.EchoMessage().setChallenge('hello'));
      });

      const nodeData2 = await server.nodeGraph.getNode(expectedNodeId);
      expect(nodeData2).toBeDefined();
      expect(nodeData2?.address.host).toEqual(expectedHost);
      expect(nodeData2?.address.port).toEqual(expectedPort);
    } finally {
      // Clean up
      await server?.stop();
      await nodeManager.stop();
    }
  });
  test('should not add nodes to full bucket if pings succeeds', async () => {
    mockedPingNode.mockImplementation(async (_) => true);
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    try {
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      const nodeId = keyRing.getNodeId();
      const address = { host: localhost, port };
      // Let's fill a bucket
      for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
        const newNode = generateNodeIdForBucket(nodeId, 100, i);
        await nodeManager.setNode(newNode, address);
      }

      // Helpers
      const listBucket = async (bucketIndex: number) => {
        const bucket = await nodeManager.getBucket(bucketIndex);
        return bucket?.map(([nodeId]) => nodesUtils.encodeNodeId(nodeId));
      };

      // Pings succeed, node not added
      mockedPingNode.mockImplementation(async () => true);
      const newNode = generateNodeIdForBucket(nodeId, 100, 21);
      await nodeManager.setNode(newNode, address, true);
      expect(await listBucket(100)).not.toContain(
        nodesUtils.encodeNodeId(newNode),
      );
    } finally {
      await nodeManager.stop();
    }
  });
  test('should add nodes to full bucket if pings fail', async () => {
    mockedPingNode.mockImplementation(async (_) => true);
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();
    try {
      await nodeConnectionManager.start({ nodeManager });
      const nodeId = keyRing.getNodeId();
      const address = { host: localhost, port };
      // Let's fill a bucket
      for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
        const newNode = generateNodeIdForBucket(nodeId, 100, i);
        await nodeManager.setNode(newNode, address);
      }
      // Wait for 2 secs for new nodes to be added with new times
      await sleep(2000);

      // Helpers
      const listBucket = async (bucketIndex: number) => {
        const bucket = await nodeManager.getBucket(bucketIndex);
        return bucket?.map(([nodeId]) => nodesUtils.encodeNodeId(nodeId));
      };

      // Pings fail, new nodes get added
      mockedPingNode.mockImplementation(async () => false);
      const newNode1 = generateNodeIdForBucket(nodeId, 100, 22);
      const newNode2 = generateNodeIdForBucket(nodeId, 100, 23);
      const newNode3 = generateNodeIdForBucket(nodeId, 100, 24);
      await nodeManager.setNode(newNode1, address, true);
      await nodeManager.setNode(newNode2, address, true);
      await nodeManager.setNode(newNode3, address, true);
      const list = await listBucket(100);
      expect(list).toContain(nodesUtils.encodeNodeId(newNode1));
      expect(list).toContain(nodesUtils.encodeNodeId(newNode2));
      expect(list).toContain(nodesUtils.encodeNodeId(newNode3));
    } finally {
      await nodeManager.stop();
    }
  });
  test('should not block when bucket is full', async () => {
    const tempNodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    mockedPingNode.mockImplementation(async (_) => true);
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph: tempNodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    await nodeManager.start();
    try {
      await nodeConnectionManager.start({ nodeManager });
      const nodeId = keyRing.getNodeId();
      const address = { host: localhost, port };
      // Let's fill a bucket
      for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
        const newNode = generateNodeIdForBucket(nodeId, 100, i);
        await nodeManager.setNode(newNode, address);
      }

      // Set node does not block
      const delayPing = promise();
      mockedPingNode.mockImplementation(async (_) => {
        await delayPing.p;
        return true;
      });
      const newNode4 = generateNodeIdForBucket(nodeId, 100, 25);
      // Set manually to non-blocking
      await expect(
        nodeManager.setNode(newNode4, address, false),
      ).resolves.toBeUndefined();
      delayPing.resolveP();
    } finally {
      await nodeManager.stop();
      await tempNodeGraph.stop();
    }
  });
  test('should update deadline when updating a bucket', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      refreshBucketDelay: 100000,
      logger,
    });
    const mockRefreshBucket = jest.spyOn(
      NodeManager.prototype,
      'refreshBucket',
    );
    try {
      mockRefreshBucket.mockImplementation(
        () => new PromiseCancellable((resolve) => resolve()),
      );
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      // Getting starting value
      const bucketIndex = 100;
      let refreshBucketTask: Task | undefined;
      for await (const task of taskManager.getTasks('asc', true, [
        nodeManager.basePath,
        nodeManager.refreshBucketHandlerId,
        `${bucketIndex}`,
      ])) {
        refreshBucketTask = task;
      }
      if (refreshBucketTask == null) never();
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        keyRing.getNodeId(),
        bucketIndex,
      );
      await sleep(100);
      await nodeManager.setNode(nodeId, {} as NodeAddress);
      // Deadline should be updated
      let refreshBucketTaskUpdated: Task | undefined;
      for await (const task of taskManager.getTasks('asc', true, [
        nodeManager.basePath,
        nodeManager.refreshBucketHandlerId,
        `${bucketIndex}`,
      ])) {
        refreshBucketTaskUpdated = task;
      }
      if (refreshBucketTaskUpdated == null) never();
      expect(refreshBucketTaskUpdated.delay).not.toEqual(
        refreshBucketTask.delay,
      );
    } finally {
      await taskManager.stopProcessing();
      await taskManager.stopTasks();
      mockRefreshBucket.mockRestore();
      await nodeManager.stop();
    }
  });
  test('refreshBucket should not throw errors when network is empty', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager,
      taskManager,
      refreshBucketDelay: 10000000,
      logger,
    });
    await nodeConnectionManager.start({ nodeManager });
    try {
      await expect(nodeManager.refreshBucket(100)).resolves.not.toThrow();
    } finally {
      await nodeManager.stop();
    }
  });
  test('refreshBucket tasks should have spread delays', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      refreshBucketDelay: 100000,
      logger,
    });
    const mockRefreshBucket = jest.spyOn(
      NodeManager.prototype,
      'refreshBucket',
    );
    try {
      mockRefreshBucket.mockImplementation(
        () => new PromiseCancellable((resolve) => resolve()),
      );
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });
      // Getting starting value
      const startingDelay = new Set<number>();
      for await (const task of taskManager.getTasks('asc', true, [
        'refreshBucket',
      ])) {
        startingDelay.add(task.delay);
      }
      expect(startingDelay.size).not.toBe(1);
      // Updating delays should have spread
      for (
        let bucketIndex = 0;
        bucketIndex < nodeGraph.nodeIdBits;
        bucketIndex++
      ) {
        await nodeManager.updateRefreshBucketDelay(
          bucketIndex,
          undefined,
          true,
        );
      }
      const updatedDelay = new Set<number>();
      for await (const task of taskManager.getTasks('asc', true, [
        'refreshBucket',
      ])) {
        updatedDelay.add(task.delay);
      }
      expect(updatedDelay.size).not.toBe(1);
    } finally {
      mockRefreshBucket.mockRestore();
      await nodeManager.stop();
    }
  });
  test('Stopping nodeManager should cancel all ephemeral tasks', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    try {
      await nodeManager.start();
      await nodeConnectionManager.start({ nodeManager });

      // Creating dummy tasks
      const task1 = await taskManager.scheduleTask({
        handlerId: nodeManager.pingAndSetNodeHandlerId,
        lazy: false,
        path: [nodeManager.basePath],
      });
      const task2 = await taskManager.scheduleTask({
        handlerId: nodeManager.pingAndSetNodeHandlerId,
        lazy: false,
        path: [nodeManager.basePath],
      });

      // Stopping nodeManager should cancel any nodeManager tasks
      await nodeManager.stop();
      const tasks: Array<any> = [];
      for await (const task of taskManager.getTasks('asc', true, [
        nodeManager.basePath,
      ])) {
        tasks.push(task);
      }
      expect(tasks.length).toEqual(0);
      await expect(task1.promise()).toReject();
      await expect(task2.promise()).toReject();
    } finally {
      await nodeManager.stop();
    }
  });
  test('Should have unique HandlerIds', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyRing,
      gestaltGraph,
      nodeGraph,
      nodeConnectionManager: dummyNodeConnectionManager,
      taskManager,
      logger,
    });
    expect(nodeManager.gcBucketHandlerId).not.toEqual(
      nodeManager.refreshBucketHandlerId,
    );
    expect(nodeManager.gcBucketHandlerId).not.toEqual(
      nodeManager.pingAndSetNodeHandlerId,
    );
    expect(nodeManager.refreshBucketHandlerId).not.toEqual(
      nodeManager.pingAndSetNodeHandlerId,
    );
  });
});
