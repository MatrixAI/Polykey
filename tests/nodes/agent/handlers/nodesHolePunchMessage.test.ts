import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { Host } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import {
  QUICClient,
  QUICServer,
  QUICSocket,
  events as quicEvents,
} from '@matrixai/quic';
import { DB } from '@matrixai/db';
import RPCClient from '@matrixai/rpc/dist/RPCClient';
import RPCServer from '@matrixai/rpc/dist/RPCServer';
import KeyRing from '@/keys/KeyRing';
import * as nodesUtils from '@/nodes/utils';
import NodeGraph from '@/nodes/NodeGraph';
import { nodesHolePunchMessageSend } from '@/nodes/agent/callers';
import NodesHolePunchMessageSend from '@/nodes/agent/handlers/NodesHolePunchMessageSend';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeManager from '@/nodes/NodeManager';
import ACL from '@/acl/ACL';
import Sigchain from '@/sigchain/Sigchain';
import TaskManager from '@/tasks/TaskManager';
import * as keysUtils from '@/keys/utils/index';
import * as tlsTestsUtils from '../../../utils/tls';

describe('nodesHolePunchMessage', () => {
  const logger = new Logger('nodesHolePunchMessage test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const crypto = tlsTestsUtils.createCrypto();
  const localHost = '127.0.0.1';

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
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
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
      keyRing,
      nodeGraph,
      options: {
        connectionConnectTimeoutTime: 2000,
        connectionIdleTimeoutTime: 2000,
      },
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
    await nodeConnectionManager.start({ host: localHost as Host });
    await taskManager.startProcessing();

    // Setting up server
    const serverManifest = {
      nodesHolePunchMessageSend: new NodesHolePunchMessageSend({
        db,
        keyRing,
        nodeConnectionManager,
        nodeManager: nodeManager,
        logger,
      }),
    };
    rpcServer = new RPCServer({
      logger,
    });
    await rpcServer.start({ manifest: serverManifest });
    const tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
    quicServer = new QUICServer({
      config: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        verifyPeer: true,
        verifyCallback: async () => {
          return undefined;
        },
      },
      crypto: {
        key: keysUtils.generateKey(),
        ops: crypto,
      },
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
    rpcClient = new RPCClient({
      manifest: clientManifest,
      streamFactory: async () => {
        return quicClient.connection.newStream();
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
        verifyCallback: async () => {
          return undefined;
        },
      },
      host: localHost,
      port: quicServer.port,
      localHost: localHost,
      logger,
    });
  });
  afterEach(async () => {
    await rpcServer.stop({ force: true });
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
