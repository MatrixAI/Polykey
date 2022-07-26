import type { NodeId, NodeIdString, SeedNodes } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import type NodeManager from 'nodes/NodeManager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DB } from '@matrixai/db';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { withF } from '@matrixai/resources';
import { IdInternal } from '@matrixai/id';
import Queue from '@/nodes/Queue';
import PolykeyAgent from '@/PolykeyAgent';
import KeyManager from '@/keys/KeyManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import Proxy from '@/network/Proxy';

import * as nodesUtils from '@/nodes/utils';
import * as nodesErrors from '@/nodes/errors';
import * as keysUtils from '@/keys/utils';
import * as grpcUtils from '@/grpc/utils';
import { timerStart } from '@/utils';
import { globalRootKeyPems } from '../fixtures/globalRootKeyPems';

describe(`${NodeConnectionManager.name} lifecycle test`, () => {
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

  const nop = async () => {};

  let dataDir: string;
  let dataDir2: string;
  let keyManager: KeyManager;
  let db: DB;
  let proxy: Proxy;

  let nodeGraph: NodeGraph;
  let queue: Queue;

  let remoteNode1: PolykeyAgent;
  let remoteNode2: PolykeyAgent;
  let remoteNodeId1: NodeId;
  let remoteNodeIdString1: NodeIdString;
  let remoteNodeId2: NodeId;

  const dummyNodeManager = { setNode: jest.fn() } as unknown as NodeManager;

  beforeAll(async () => {
    dataDir2 = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    // Creating remotes, they just exist to start connections or fail them if needed
    remoteNode1 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir2, 'remoteNode1'),
      networkConfig: {
        proxyHost: serverHost,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
      logger: logger.getChild('remoteNode1'),
    });
    remoteNodeId1 = remoteNode1.keyManager.getNodeId();
    remoteNodeIdString1 = remoteNodeId1.toString() as NodeIdString;
    remoteNode2 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir2, 'remoteNode2'),
      networkConfig: {
        proxyHost: serverHost,
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
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger: logger.getChild('keyManager'),
      privateKeyPemOverride: globalRootKeyPems[2],
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger: nodeConnectionManagerLogger,
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger: logger.getChild('NodeGraph'),
    });
    queue = new Queue({
      logger: logger.getChild('queue'),
    });
    await queue.start();
    const tlsConfig = {
      keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
      certChainPem: keysUtils.certToPem(keyManager.getRootCert()),
    };
    proxy = new Proxy({
      authToken: 'auth',
      logger: logger.getChild('proxy'),
    });
    await proxy.start({
      tlsConfig,
      serverHost,
      proxyHost: localHost,
      serverPort,
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
    await queue.stop();
    await nodeGraph.stop();
    await nodeGraph.destroy();
    await db.stop();
    await db.destroy();
    await keyManager.stop();
    await keyManager.destroy();
    await proxy.stop();
  });

  // Connection life cycle
  test('should create connection', async () => {
    // NodeConnectionManager under test
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // @ts-ignore: kidnap connections
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnap connectionLocks
      const connectionLocks = nodeConnectionManager.connectionLocks;
      const initialConnection = connections.get(remoteNodeIdString1);
      expect(initialConnection).toBeUndefined();
      await nodeConnectionManager.withConnF(remoteNodeId1, nop);
      const finalConnection = connections.get(remoteNodeIdString1);
      // Check entry is in map and lock is released
      expect(finalConnection).toBeDefined();
      expect(connectionLocks.isLocked(remoteNodeIdString1)).toBeFalsy();
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('acquireConnection should create connection', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // @ts-ignore: kidnap connections
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnap connectionLocks
      const connectionLocks = nodeConnectionManager.connectionLocks;
      const initialConnection = connections.get(remoteNodeIdString1);
      expect(initialConnection).toBeUndefined();
      await withF(
        [await nodeConnectionManager.acquireConnection(remoteNodeId1)],
        async (conn) => {
          expect(conn).toBeDefined();
          const intermediaryConnection = connections.get(remoteNodeIdString1);
          expect(intermediaryConnection).toBeDefined();
          expect(connectionLocks.isLocked(remoteNodeIdString1)).toBeTruthy();
        },
      );
      const finalConnection = connections.get(remoteNodeIdString1);
      expect(finalConnection).toBeDefined();
      // Neither write nor read lock should be locked now
      expect(connectionLocks.isLocked(remoteNodeIdString1)).toBeFalsy();
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('withConnF should create connection and hold lock', async () => {
    // NodeConnectionManager under test
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // @ts-ignore: kidnap connections
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnap connectionLocks
      const connectionLocks = nodeConnectionManager.connectionLocks;
      const initialConnection = connections.get(remoteNodeIdString1);
      expect(initialConnection).toBeUndefined();
      await nodeConnectionManager.withConnF(remoteNodeId1, async () => {
        expect(connectionLocks.isLocked(remoteNodeIdString1)).toBe(true);
      });
      const finalConnection = connections.get(remoteNodeIdString1);
      // Check entry is in map and lock is released
      expect(finalConnection).toBeDefined();
      expect(connectionLocks.isLocked(remoteNodeIdString1)).toBeFalsy();
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('withConnG should create connection and hold lock', async () => {
    // NodeConnectionManager under test
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // @ts-ignore: kidnap connections
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnap connectionLocks
      const connectionLocks = nodeConnectionManager.connectionLocks;
      const initialConnection = connections.get(remoteNodeIdString1);
      expect(initialConnection).toBeUndefined();

      const testGenerator = async function* () {
        for (let i = 0; i < 10; i++) {
          yield 'HelloWorld ' + i;
        }
      };

      // Creating the generator
      const gen = nodeConnectionManager.withConnG(
        remoteNodeId1,
        async function* () {
          yield* testGenerator();
        },
      );

      // Connection is not created yet, no locking applied
      expect(connections.get(remoteNodeIdString1)).not.toBeDefined();

      // Iterating over generator
      for await (const _ of gen) {
        // Should be locked for duration of stream
        expect(connectionLocks.isLocked(remoteNodeIdString1)).toBe(true);
      }
      // Unlocked after stream finished
      expect(connectionLocks.isLocked(remoteNodeIdString1)).toBe(false);

      const finalConnection = connections.get(remoteNodeIdString1);
      // Check entry is in map and lock is released
      expect(finalConnection).toBeDefined();
      expect(connectionLocks.isLocked(remoteNodeIdString1)).toBe(false);
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('should fail to create connection to offline node', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      // NodeConnectionManager under test
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        connConnectTime: 500,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // Add the dummy node
      await nodeGraph.setNode(dummyNodeId, {
        host: '125.0.0.1' as Host,
        port: 55555 as Port,
      });
      // @ts-ignore: kidnap connection map
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnap connectionLocks
      const connectionLocks = nodeConnectionManager.connectionLocks;
      expect(connections.size).toBe(0);

      await expect(() =>
        nodeConnectionManager?.withConnF(dummyNodeId, nop),
      ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
      expect(connections.size).toBe(0);
      const connLock = connections.get(dummyNodeId.toString() as NodeIdString);
      // There should still be an entry in the connection map, but it should
      // only contain a lock - no connection
      expect(connLock).not.toBeDefined();
      expect(
        connectionLocks.isLocked(dummyNodeId.toString() as NodeIdString),
      ).toBe(false);
      expect(connLock?.connection).toBeUndefined();

      // Undo the initial dummy node add
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('connection should persist', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      // NodeConnectionManager under test
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // @ts-ignore accessing protected NodeConnectionMap
      const connections = nodeConnectionManager.connections;
      expect(connections.size).toBe(0);
      const initialConnection = connections.get(remoteNodeIdString1);
      expect(initialConnection).toBeUndefined();
      await nodeConnectionManager.withConnF(remoteNodeId1, nop);
      // Check we only have this single connection
      expect(connections.size).toBe(1);
      await nodeConnectionManager.withConnF(remoteNodeId1, nop);
      // Check we still only have this single connection
      expect(connections.size).toBe(1);
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('should create 1 connection with concurrent creates.', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      // NodeConnectionManager under test
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // @ts-ignore accessing protected NodeConnectionMap
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnap connectionLocks
      const connectionLocks = nodeConnectionManager.connectionLocks;
      expect(connections.size).toBe(0);
      const initialConnection = connections.get(remoteNodeIdString1);
      expect(initialConnection).toBeUndefined();
      // Concurrently create connection to same target
      await Promise.all([
        nodeConnectionManager.withConnF(remoteNodeId1, nop),
        nodeConnectionManager.withConnF(remoteNodeId1, nop),
      ]);
      // Check only 1 connection exists
      expect(connections.size).toBe(1);
      const finalConnection = connections.get(remoteNodeIdString1);
      // Check entry is in map and lock is released
      expect(finalConnection).toBeDefined();
      expect(connectionLocks.isLocked(remoteNodeIdString1)).toBeFalsy();
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('should destroy a connection', async () => {
    // NodeConnectionManager under test
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // @ts-ignore: kidnap connections
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnap connectionLocks
      const connectionLocks = nodeConnectionManager.connectionLocks;
      const initialConnection = connections.get(remoteNodeIdString1);
      expect(initialConnection).toBeUndefined();
      await nodeConnectionManager.withConnF(remoteNodeId1, nop);
      const midConnAndLock = connections.get(remoteNodeIdString1);
      // Check entry is in map and lock is released
      expect(midConnAndLock).toBeDefined();
      expect(connectionLocks.isLocked(remoteNodeIdString1)).toBeFalsy();

      // Destroying the connection
      // @ts-ignore: private method
      await nodeConnectionManager.destroyConnection(remoteNodeId1);
      const finalConnAndLock = connections.get(remoteNodeIdString1);
      expect(finalConnAndLock).not.toBeDefined();
      expect(connectionLocks.isLocked(remoteNodeIdString1)).toBeFalsy();
      expect(finalConnAndLock?.connection).toBeUndefined();
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('stopping should destroy all connections', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      // Do testing
      // set up connections
      await nodeConnectionManager.withConnF(remoteNodeId1, nop);
      await nodeConnectionManager.withConnF(remoteNodeId2, nop);

      // @ts-ignore: Hijack connection map
      const connections = nodeConnectionManager.connections;
      // @ts-ignore: kidnap connectionLocks
      const connectionLocks = nodeConnectionManager.connectionLocks;
      expect(connections.size).toBe(2);
      for (const [nodeIdString, connAndLock] of connections) {
        expect(connAndLock.connection).toBeDefined();
        expect(connAndLock.timer).toBeDefined();
        expect(connectionLocks.isLocked(nodeIdString)).toBeDefined();
      }

      // Destroying connections
      await nodeConnectionManager.stop();
      expect(connections.size).toBe(0);
      for (const [nodeIdString, connAndLock] of connections) {
        expect(connAndLock.connection).toBeUndefined();
        expect(connAndLock.timer).toBeUndefined();
        expect(connectionLocks.isLocked(nodeIdString)).toBeDefined();
      }
    } finally {
      // Clean up
      await nodeConnectionManager?.stop();
    }
  });

  // New ping tests
  test('should ping node with address', async () => {
    // NodeConnectionManager under test
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });
      await nodeConnectionManager.pingNode(
        remoteNodeId1,
        remoteNode1.proxy.getProxyHost(),
        remoteNode1.proxy.getProxyPort(),
      );
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('should fail to ping non existent node', async () => {
    // NodeConnectionManager under test
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      // Pinging node
      expect(
        await nodeConnectionManager.pingNode(
          remoteNodeId1,
          '127.1.2.3' as Host,
          55555 as Port,
          timerStart(1000),
        ),
      ).toEqual(false);
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('should fail to ping node if NodeId does not match', async () => {
    // NodeConnectionManager under test
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        proxy,
        queue,
        logger: nodeConnectionManagerLogger,
      });
      await nodeConnectionManager.start({ nodeManager: dummyNodeManager });

      expect(
        await nodeConnectionManager.pingNode(
          remoteNodeId1,
          remoteNode2.proxy.getProxyHost(),
          remoteNode2.proxy.getProxyPort(),
          timerStart(1000),
        ),
      ).toEqual(false);

      expect(
        await nodeConnectionManager.pingNode(
          remoteNodeId2,
          remoteNode1.proxy.getProxyHost(),
          remoteNode1.proxy.getProxyPort(),
          timerStart(1000),
        ),
      ).toEqual(false);
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
});
