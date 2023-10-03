import type { Host, Port, TLSConfig } from '@/network/types';
import type { NodeAddress } from '@/nodes/types';
import type { NodeId, NodeIdEncoded, NodeIdString } from '@/ids';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { DB } from '@matrixai/db';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import KeyRing from '@/keys/KeyRing';
import NodeGraph from '@/nodes/NodeGraph';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import { promise, sleep } from '@/utils';
import * as nodesErrors from '@/nodes/errors';
import NodeConnection from '@/nodes/NodeConnection';
import RPCServer from '@/rpc/RPCServer';
import * as tlsUtils from '../utils/tls';

describe(`${NodeConnectionManager.name} lifecycle test`, () => {
  const logger = new Logger(`${NodeConnection.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const localHost = '127.0.0.1' as Host;
  const password = 'password';

  let dataDir: string;

  let serverTlsConfig: TLSConfig;
  let clientTlsConfig: TLSConfig;
  let serverNodeId: NodeId;
  let clientNodeId: NodeId;
  let serverNodeIdEncoded: NodeIdEncoded;
  let keyRingPeer: KeyRing;
  let nodeConnectionManagerPeer: NodeConnectionManager;
  let rpcServer: RPCServer;
  let serverAddress: NodeAddress;

  let keyRing: KeyRing;
  let db: DB;
  let nodeGraph: NodeGraph;

  let nodeConnectionManager: NodeConnectionManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPathPeer = path.join(dataDir, 'keysPeer');
    const serverKeyPair = keysUtils.generateKeyPair();
    const clientKeyPair = keysUtils.generateKeyPair();
    serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey);
    clientNodeId = keysUtils.publicKeyToNodeId(clientKeyPair.publicKey);
    serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    serverTlsConfig = await tlsUtils.createTLSConfig(serverKeyPair);
    clientTlsConfig = await tlsUtils.createTLSConfig(clientKeyPair);
    keyRingPeer = await KeyRing.createKeyRing({
      password,
      keysPath: keysPathPeer,
      logger,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      }
    })
    nodeConnectionManagerPeer = new NodeConnectionManager({
      keyRing: keyRingPeer,
      logger: logger.getChild(`${NodeConnectionManager.name}Peer`),
      nodeGraph: {} as NodeGraph,
      tlsConfig: serverTlsConfig,
      seedNodes: undefined
    });
    await nodeConnectionManagerPeer.start({
      host: localHost,
    })
    rpcServer = await RPCServer.createRPCServer({
      handlerTimeoutGraceTime: 1000,
      handlerTimeoutTime: 5000,
      logger: logger.getChild(`${RPCServer.name}`),
      manifest: {}, // TODO: test server manifest
      sensitive: false,
    });

    // Setting up client dependencies
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      }
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    serverAddress = {
      host: nodeConnectionManagerPeer.host,
      port: nodeConnectionManagerPeer.port,
    };
  });

  afterEach(async () => {
    await nodeConnectionManager?.stop();
    await nodeGraph.stop();
    await nodeGraph.destroy();
    await db.stop();
    await db.destroy();
    await keyRing.stop();
    await keyRing.destroy();

    await rpcServer.destroy({ force: true });
    await nodeConnectionManagerPeer.stop();
  });

  test('NodeConnectionManager readiness', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined
    });
    await nodeConnectionManager.start({
      host: localHost,
    });

    await nodeConnectionManager.stop();
  });
  test('NodeConnectionManager consecutive start stops', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined
    });
    await nodeConnectionManager.start({
      host: localHost,
    });

    await nodeConnectionManager.stop();
    await nodeConnectionManager.start({
      host: localHost,
    });
    await nodeConnectionManager.stop();
  });

  // FIXME: holding process open for a time. connectionKeepAliveIntervalTime holds the process open, failing to clean up?
  test('acquireConnection should create connection', async () => {
    await nodeGraph.setNode(serverNodeId, serverAddress);
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      options: {
        connectionConnectTimeoutTime: 1000,
      },
      logger: logger.getChild(`${NodeConnectionManager.name}Local`),
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });

    const acquire = await nodeConnectionManager.acquireConnection(serverNodeId);
    const [release] = await acquire();
    expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();
    await release();
    await nodeConnectionManager.stop();
  });
  test('withConnF should create connection', async () => {
    await nodeGraph.setNode(serverNodeId, serverAddress);
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });

    await nodeConnectionManager.withConnF(serverNodeId, async () => {
      expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();
    });

    await nodeConnectionManager.stop();
  });
  test('should list active connections', async () => {
    await nodeGraph.setNode(serverNodeId, serverAddress);
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });

    await nodeConnectionManager.withConnF(serverNodeId, async () => {
      expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();
    });

    const connectionsList = nodeConnectionManager.listConnections();
    expect(connectionsList).toHaveLength(1);
    expect(nodesUtils.encodeNodeId(connectionsList[0].nodeId)).toEqual(
      serverNodeIdEncoded,
    );
    expect(connectionsList[0].address.host).toEqual(nodeConnectionManagerPeer.host);
    expect(connectionsList[0].address.port).toEqual(nodeConnectionManagerPeer.port);

    await nodeConnectionManager.stop();
  });
  test('withConnG should create connection', async () => {
    await nodeGraph.setNode(serverNodeId, serverAddress);
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });
    // @ts-ignore: kidnap protected property
    const connectionMap = nodeConnectionManager.connections;

    const gen = nodeConnectionManager.withConnG(
      serverNodeId,
      async function* (): AsyncGenerator {
        expect(connectionMap.size).toBeGreaterThanOrEqual(1);
      },
    );

    for await (const _ of gen) {
      // Do nothing
    }

    await nodeConnectionManager.stop();
  });
  test('should fail to create connection to offline node', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });
    // @ts-ignore: kidnap protected property
    const connectionMap = nodeConnectionManager.connections;
    const randomNodeId = keysUtils.publicKeyToNodeId(
      keysUtils.generateKeyPair().publicKey,
    );
    const gen = nodeConnectionManager.withConnG(
      randomNodeId,
      async function* (): AsyncGenerator {
        expect(connectionMap.size).toBeGreaterThanOrEqual(1);
      },
    );

    const prom = async () => {
      for await (const _ of gen) {
        // Do nothing
      }
    };
    await expect(prom).rejects.toThrow(
      nodesErrors.ErrorNodeGraphNodeIdNotFound,
    );

    await nodeConnectionManager.stop();
  });
  test('connection should persist', async () => {
    await nodeGraph.setNode(serverNodeId, serverAddress);
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });
    await nodeConnectionManager.withConnF(serverNodeId, async () => {
      // Do nothing
    });
    expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();
    expect(nodeConnectionManager.listConnections()).toHaveLength(1);
    await nodeConnectionManager.withConnF(serverNodeId, async () => {
      // Do nothing
    });
    expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();
    expect(nodeConnectionManager.listConnections()).toHaveLength(1);

    await nodeConnectionManager.stop();
  });
  test('should create 1 connection with concurrent creates', async () => {
    await nodeGraph.setNode(serverNodeId, serverAddress);
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });
    const waitProm = promise<void>();
    const tryConnection = () => {
      return nodeConnectionManager.withConnF(serverNodeId, async () => {
        // Do nothing
        await waitProm.p;
      });
    };
    const tryProm = Promise.all([
      tryConnection(),
      tryConnection(),
      tryConnection(),
      tryConnection(),
      tryConnection(),
    ]);
    waitProm.resolveP();
    await tryProm;
    expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();
    expect(nodeConnectionManager.listConnections()).toHaveLength(1);

    await nodeConnectionManager.stop();
  });
  test('should destroy a connection', async () => {
    await nodeGraph.setNode(serverNodeId, serverAddress);
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });
    await nodeConnectionManager.withConnF(serverNodeId, async () => {
      // Do nothing
    });
    expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();
    expect(nodeConnectionManager.listConnections()).toHaveLength(1);

    // @ts-ignore: Kidnap protected property
    const connectionMap = nodeConnectionManager.connections;
    const connection = connectionMap.get(
      serverNodeId.toString() as NodeIdString,
    );
    await connection!.connection.destroy({ force: true });

    // Waiting for connection to clean up from map
    await sleep(100);
    expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeFalse();
    expect(nodeConnectionManager.listConnections()).toHaveLength(0);

    await nodeConnectionManager.stop();
  });
  test('stopping should destroy all connections', async () => {
    await nodeGraph.setNode(serverNodeId, serverAddress);
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });
    await nodeConnectionManager.withConnF(serverNodeId, async () => {
      // Do nothing
    });
    expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();
    expect(nodeConnectionManager.listConnections()).toHaveLength(1);

    // @ts-ignore: Kidnap protected property
    const connectionMap = nodeConnectionManager.connections;
    await nodeConnectionManager.stop();

    // Waiting for connection to clean up from map
    expect(connectionMap.size).toBe(0);
  });
  test('should ping node with address', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });
    const result = await nodeConnectionManager.pingNode(
      serverNodeId,
      localHost as Host,
      nodeConnectionManagerPeer.port,
    );
    expect(result).toBeTrue();
    expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeTrue();

    await nodeConnectionManager.stop();
  });
  test('should fail to ping non existent node', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });
    const result = await nodeConnectionManager.pingNode(
      serverNodeId,
      localHost as Host,
      12345 as Port,
      {timer: 100},
    );
    expect(result).toBeFalse();
    expect(nodeConnectionManager.hasConnection(serverNodeId)).toBeFalse();

    await nodeConnectionManager.stop();
  });
  test('should fail to ping node if NodeId does not match', async () => {
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      logger: logger.getChild(NodeConnectionManager.name),
      nodeGraph,
      tlsConfig: clientTlsConfig,
      seedNodes: undefined,
    });
    await nodeConnectionManager.start({
      host: localHost,
    });
    const result = await nodeConnectionManager.pingNode(
      clientNodeId,
      localHost as Host,
      nodeConnectionManagerPeer.port,
    );
    expect(result).toBeFalse();
    expect(nodeConnectionManager.hasConnection(clientNodeId)).toBeFalse();

    await nodeConnectionManager.stop();
  });
  // TODO: tests for multi connections, needs custom verification
  test.todo(
    'use multi-connection to connect to one node with multiple addresses',
  );
  test.todo(
    'use multi-connection to connect to multiple nodes with multiple addresses',
  );
  test.todo(
    'use multi-connection to connect to multiple nodes with single address',
  );
  test.todo('multi-connection respects locking');
  test.todo('multi-connection ends early when all nodes are connected to');
});
