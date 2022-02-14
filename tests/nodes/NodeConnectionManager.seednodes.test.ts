import type { NodeId, SeedNodes } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DB } from '@matrixai/db';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import PolykeyAgent from '@/PolykeyAgent';
import KeyManager from '@/keys/KeyManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import ForwardProxy from '@/network/ForwardProxy';
import ReverseProxy from '@/network/ReverseProxy';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as grpcUtils from '@/grpc/utils';

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
  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;
  let nodeGraph: NodeGraph;

  let remoteNode1: PolykeyAgent;
  let remoteNode2: PolykeyAgent;
  let remoteNodeId1: NodeId;
  let remoteNodeId2: NodeId;

  const mockedGenerateDeterministicKeyPair = jest.spyOn(
    keysUtils,
    'generateDeterministicKeyPair',
  );

  beforeAll(async () => {
    mockedGenerateDeterministicKeyPair.mockImplementation((bits, _) => {
      return keysUtils.generateKeyPair(bits);
    });

    dataDir2 = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    // Creating remotes, they just exist to start connections or fail them if needed
    remoteNode1 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir2, 'remoteNode1'),
      logger: logger.getChild('remoteNode1'),
    });
    remoteNodeId1 = remoteNode1.keyManager.getNodeId();
    remoteNode2 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir2, 'remoteNode2'),
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
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger: logger.getChild('NodeGraph'),
    });
    const tlsConfig = {
      keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
      certChainPem: keysUtils.certToPem(keyManager.getRootCert()),
    };
    fwdProxy = new ForwardProxy({
      authToken: 'auth',
      logger: logger.getChild('fwdProxy'),
    });
    await fwdProxy.start({
      tlsConfig,
    });
    revProxy = new ReverseProxy({
      logger: logger.getChild('revProxy'),
    });
    await revProxy.start({
      serverHost,
      serverPort,
      tlsConfig,
    });
    await nodeGraph.setNode(remoteNodeId1, {
      host: remoteNode1.revProxy.getIngressHost(),
      port: remoteNode1.revProxy.getIngressPort(),
    });
    await nodeGraph.setNode(remoteNodeId2, {
      host: remoteNode2.revProxy.getIngressHost(),
      port: remoteNode2.revProxy.getIngressPort(),
    });
  });

  afterEach(async () => {
    await nodeGraph.stop();
    await nodeGraph.destroy();
    await db.stop();
    await db.destroy();
    await keyManager.stop();
    await keyManager.destroy();
    await revProxy.stop();
    await fwdProxy.stop();
  });

  // Seed nodes
  test('starting should add seed nodes to the node graph', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        fwdProxy,
        revProxy,
        seedNodes: dummySeedNodes,
        logger: logger,
      });
      await nodeConnectionManager.start();
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
    }
  });
  test('should get seed nodes', async () => {
    // NodeConnectionManager under test
    const nodeConnectionManager = new NodeConnectionManager({
      keyManager,
      nodeGraph,
      fwdProxy,
      revProxy,
      seedNodes: dummySeedNodes,
      logger: logger,
    });
    await nodeConnectionManager.start();
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
    try {
      const seedNodes: SeedNodes = {};
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId1)] = {
        host: remoteNode1.revProxy.getIngressHost(),
        port: remoteNode1.revProxy.getIngressPort(),
      };
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId2)] = {
        host: remoteNode2.revProxy.getIngressHost(),
        port: remoteNode2.revProxy.getIngressPort(),
      };
      nodeConnectionManager = new NodeConnectionManager({
        keyManager,
        nodeGraph,
        fwdProxy,
        revProxy,
        seedNodes,
        logger: logger,
      });
      await remoteNode1.nodeGraph.setNode(nodeId1, {
        host: serverHost,
        port: serverPort,
      });
      await remoteNode2.nodeGraph.setNode(nodeId2, {
        host: serverHost,
        port: serverPort,
      });
      await nodeConnectionManager.start();
      await nodeConnectionManager.syncNodeGraph();
      expect(await nodeGraph.getNode(nodeId1)).toBeDefined();
      expect(await nodeGraph.getNode(nodeId2)).toBeDefined();
      expect(await nodeGraph.getNode(dummyNodeId)).toBeUndefined();
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
  test('should handle an offline seed node when synchronising nodeGraph', async () => {
    let nodeConnectionManager: NodeConnectionManager | undefined;
    try {
      const seedNodes: SeedNodes = {};
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId1)] = {
        host: remoteNode1.revProxy.getIngressHost(),
        port: remoteNode1.revProxy.getIngressPort(),
      };
      seedNodes[nodesUtils.encodeNodeId(remoteNodeId2)] = {
        host: remoteNode2.revProxy.getIngressHost(),
        port: remoteNode2.revProxy.getIngressPort(),
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
        fwdProxy,
        revProxy,
        seedNodes,
        connConnectTime: 500,
        logger: logger,
      });
      await nodeConnectionManager.start();
      // This should complete without error
      await nodeConnectionManager.syncNodeGraph();
      // Information on remotes are found
      expect(await nodeGraph.getNode(nodeId1)).toBeDefined();
      expect(await nodeGraph.getNode(nodeId2)).toBeDefined();
    } finally {
      await nodeConnectionManager?.stop();
    }
  });
});
