import type * as quicEvents from '@matrixai/quic/dist/events';
import type { Host as QUICHost } from '@matrixai/quic';
import type GestaltGraph from '../../../src/gestalts/GestaltGraph';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer, QUICSocket } from '@matrixai/quic';
import { DB } from '@matrixai/db';
import RPCClient from '@/rpc/RPCClient';
import RPCServer from '@/rpc/RPCServer';
import { nodesHolePunchMessageSend } from '@/agent/handlers/clientManifest';
import KeyRing from '@/keys/KeyRing';
import * as nodesUtils from '@/nodes/utils';
import NodeGraph from '@/nodes/NodeGraph';
import { NodesHolePunchMessageSendHandler } from '@/agent/handlers/nodesHolePunchMessageSend';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeManager from '@/nodes/NodeManager';
import * as keysUtils from '@/keys/utils/index';
import * as tlsTestsUtils from '../../utils/tls';
import ACL from '../../../src/acl/ACL';
import Sigchain from '../../../src/sigchain/Sigchain';
import TaskManager from '../../../src/tasks/TaskManager';

describe('nodesHolePunchMessage', () => {
  const logger = new Logger('nodesHolePunchMessage test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const crypto = tlsTestsUtils.createCrypto();
  const localHost = '127.0.0.1' as QUICHost;

  let dataDir: string;

  let keyRing: KeyRing;
  let db: DB;
  let acl: ACL;
  let sigchain: Sigchain;
  let taskManager: TaskManager;
  let quicSocket: QUICSocket;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let nodeGraph: NodeGraph;
  let rpcServer: RPCServer;
  let quicServer: QUICServer;

  const clientManifest = {
    nodesHolePunchMessageSend,
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
    acl = await ACL.createACL({
      db,
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    quicSocket = new QUICSocket({
      logger,
    });
    await quicSocket.start({
      host: localHost,
    });
    const tlsConfigClient = await tlsTestsUtils.createTLSConfig(
      keyRing.keyPair,
    );
    nodeConnectionManager = new NodeConnectionManager({
      tlsConfig: tlsConfigClient,
      crypto,
      quicSocket,
      keyRing,
      nodeGraph,
      connectionConnectTime: 2000,
      connectionTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeGraph,
      nodeConnectionManager,
      sigchain,
      taskManager,
      gestaltGraph: {} as GestaltGraph,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({ nodeManager, handleStream: () => {} });
    await taskManager.startProcessing();

    // Setting up server
    const serverManifest = {
      nodesHolePunchMessageSend: new NodesHolePunchMessageSendHandler({
        db,
        keyRing,
        nodeConnectionManager,
        nodeManager: nodeManager,
        logger,
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
        verifyPeer: true,
        verifyAllowFail: true,
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
      'serverStop',
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
        key: tlsConfigClient.keyPrivatePem,
        cert: tlsConfigClient.certChainPem,
        verifyPeer: true,
        verifyAllowFail: true,
      },
      host: localHost,
      port: quicServer.port,
      localHost: localHost,
      logger,
    });
  });
  afterEach(async () => {
    await rpcServer.destroy(true);
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await quicServer.stop({ force: true });
    await nodeGraph.stop();
    await nodeManager.stop();
    await nodeConnectionManager.stop();
    await taskManager.stop();
    await sigchain.stop();
    await acl.stop();
    await db.stop();
    await keyRing.stop();
    await quicSocket.stop({ force: true });
  });

  test('dummy test', async () => {});
  // TODO: holding process open for a short time, subject to change in agent migration stage 2
  test.skip('should send hole punch relay', async () => {
    const nodeId = nodesUtils.encodeNodeId(keyRing.getNodeId());
    await rpcClient.methods.nodesHolePunchMessageSend({
      srcIdEncoded: nodeId,
      dstIdEncoded: nodeId,
      address: {
        host: quicClient.host,
        port: quicClient.port,
      },
    });
    // TODO: check if the ping was sent
  });
});
