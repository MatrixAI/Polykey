import type * as quicEvents from '@matrixai/quic/dist/events';
import type { NodeIdEncoded } from '@/ids';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import RPCClient from '@matrixai/rpc/dist/RPCClient';
import RPCServer from '@matrixai/rpc/dist/RPCServer';
import { nodesClosestLocalNodesGet } from '@/agent/handlers/clientManifest';
import KeyRing from '@/keys/KeyRing';
import * as nodesUtils from '@/nodes/utils';
import { NodesClosestLocalNodesGetHandler } from '@/agent/handlers/nodesClosestLocalNodesGet';
import NodeGraph from '@/nodes/NodeGraph';
import * as keysUtils from '@/keys/utils/index';
import * as testNodesUtils from '../../nodes/utils';
import * as tlsTestsUtils from '../../utils/tls';

describe('nodesClosestLocalNode', () => {
  const logger = new Logger('nodesClosestLocalNode test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const crypto = tlsTestsUtils.createCrypto();
  const localHost = '127.0.0.1';

  let dataDir: string;

  let keyRing: KeyRing;
  let db: DB;
  let nodeGraph: NodeGraph;
  let rpcServer: RPCServer;
  let quicServer: QUICServer;

  const clientManifest = {
    nodesClosestLocalNodesGet,
  };
  type ClientManifest = typeof clientManifest;
  let rpcClient: RPCClient<ClientManifest>;
  let quicClient: QUICClient;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    // Handler dependencies
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
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

    // Setting up server
    const serverManifest = {
      nodesClosestLocalNodesGet: new NodesClosestLocalNodesGetHandler({
        db,
        nodeGraph,
      }),
    };
    rpcServer = await RPCServer.createRPCServer({
      manifest: serverManifest,
      logger,
    });
    const tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
    quicServer = new QUICServer({
      config: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        verifyPeer: false,
      },
      crypto: {
        key: keysUtils.generateKey(),
        ops: crypto,
      },
      logger,
    });
    const handleStream = async (
      event: quicEvents.QUICConnectionStreamEvent,
    ) => {
      // Streams are handled via the RPCServer.
      const stream = event.detail;
      logger.info('!!!!Handling new stream!!!!!');
      rpcServer.handleStream(stream);
    };
    const handleConnection = async (
      event: quicEvents.QUICServerConnectionEvent,
    ) => {
      // Needs to setup stream handler
      const conn = event.detail;
      logger.info('!!!!Handling new Connection!!!!!');
      conn.addEventListener('connectionStream', handleStream);
      conn.addEventListener(
        'connectionStop',
        () => {
          conn.removeEventListener('connectionStream', handleStream);
        },
        { once: true },
      );
    };
    quicServer.addEventListener('serverConnection', handleConnection);
    quicServer.addEventListener(
      'serverStio',
      () => {
        quicServer.removeEventListener('serverConnection', handleConnection);
      },
      { once: true },
    );
    await quicServer.start({
      host: localHost,
    });

    // Setting up client
    rpcClient = await RPCClient.createRPCClient({
      manifest: clientManifest,
      streamFactory: () => {
        return quicClient.connection.streamNew();
      },
      logger,
    });
    quicClient = await QUICClient.createQUICClient({
      crypto: {
        ops: crypto,
      },
      config: {
        verifyPeer: false,
      },
      host: localHost,
      port: quicServer.port,
      localHost: localHost,
      logger,
    });
  });
  afterEach(async () => {
    await rpcServer.destroy(true);
    await quicServer.stop({ force: true });
    await nodeGraph.stop();
    await db.stop();
    await keyRing.stop();
  });

  test('should get closest local nodes', async () => {
    // Adding 10 nodes
    const nodes: Array<NodeIdEncoded> = [];
    for (let i = 0; i < 10; i++) {
      const nodeId = testNodesUtils.generateRandomNodeId();
      await nodeGraph.setNode(nodeId, {
        host: 'localhost' as Host,
        port: 55555 as Port,
      });
      nodes.push(nodesUtils.encodeNodeId(nodeId));
    }
    const nodeIdEncoded = nodesUtils.encodeNodeId(
      testNodesUtils.generateRandomNodeId(),
    );
    const results = await rpcClient.methods.nodesClosestLocalNodesGet({
      nodeIdEncoded,
    });
    const resultNodes: Array<NodeIdEncoded> = [];
    for await (const result of results) {
      resultNodes.push(result.nodeIdEncoded);
    }
    expect(nodes.sort()).toEqual(resultNodes.sort());
  });
});
