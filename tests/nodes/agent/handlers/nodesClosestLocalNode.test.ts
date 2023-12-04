import type { NodeIdEncoded } from '@/ids';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer, events as quicEvents } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import { RPCClient, RPCServer } from '@matrixai/rpc';
import KeyRing from '@/keys/KeyRing';
import * as nodesUtils from '@/nodes/utils';
import { nodesClosestLocalNodesGet } from '@/nodes/agent/callers';
import NodesClosestLocalNodesGet from '@/nodes/agent/handlers/NodesClosestLocalNodesGet';
import NodeGraph from '@/nodes/NodeGraph';
import * as keysUtils from '@/keys/utils';
import * as networkUtils from '@/network/utils';
import * as testNodesUtils from '../../../nodes/utils';
import * as tlsTestsUtils from '../../../utils/tls';

describe('nodesClosestLocalNode', () => {
  const logger = new Logger('nodesClosestLocalNode test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
      nodesClosestLocalNodesGet: new NodesClosestLocalNodesGet({
        db,
        nodeGraph,
      }),
    };
    rpcServer = new RPCServer({
      fromError: networkUtils.fromError,
      logger,
    });
    await rpcServer.start({ manifest: serverManifest });
    const tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
    quicServer = new QUICServer({
      config: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        verifyPeer: false,
      },
      crypto: nodesUtils.quicServerCrypto,
      logger,
    });
    const handleStream = async (
      event: quicEvents.EventQUICConnectionStream,
    ) => {
      // Streams are handled via the RPCServer.
      const stream = event.detail;
      logger.info('!!!!Handling new stream!!!!!');
      rpcServer.handleStream(stream);
    };
    const handleConnection = async (
      event: quicEvents.EventQUICServerConnection,
    ) => {
      // Needs to setup stream handler
      const conn = event.detail;
      logger.info('!!!!Handling new Connection!!!!!');
      conn.addEventListener(
        quicEvents.EventQUICConnectionStream.name,
        handleStream,
      );
      conn.addEventListener(
        quicEvents.EventQUICConnectionStopped.name,
        () => {
          conn.removeEventListener(
            quicEvents.EventQUICConnectionStream.name,
            handleStream,
          );
        },
        { once: true },
      );
    };
    quicServer.addEventListener(
      quicEvents.EventQUICServerConnection.name,
      handleConnection,
    );
    quicServer.addEventListener(
      quicEvents.EventQUICServerStopped.name,
      () => {
        quicServer.removeEventListener(
          quicEvents.EventQUICServerConnection.name,
          handleConnection,
        );
      },
      { once: true },
    );
    await quicServer.start({
      host: localHost,
    });

    // Setting up client
    rpcClient = new RPCClient({
      manifest: clientManifest,
      streamFactory: async () => {
        return quicClient.connection.newStream();
      },
      toError: networkUtils.toError,
      logger,
    });
    quicClient = await QUICClient.createQUICClient({
      crypto: nodesUtils.quicClientCrypto,
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
    await rpcServer.stop({ force: true });
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
      await nodeGraph.setNodeContactAddressData(
        nodeId,
        ['localhost' as Host, 55555 as Port],
        {
          mode: 'direct',
          connectedTime: Date.now(),
          scopes: ['global'],
        },
      );
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
