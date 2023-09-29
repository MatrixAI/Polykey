import type { Host, Port, TLSConfig } from '@/network/types';
import type { NodeId, NodeIdEncoded } from '@/ids';
import type { RPCStream } from '@/rpc/types';
import { QUICServer, QUICSocket, events as quicEvents } from '@matrixai/quic';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { errors as quicErrors } from '@matrixai/quic';
import { ErrorContextsTimedTimeOut } from '@matrixai/contexts/dist/errors';
import * as nodesUtils from '@/nodes/utils';
import * as nodesEvents from '@/nodes/events';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import NodeConnection from '@/nodes/NodeConnection';
import { promise } from '@/utils';
import * as networkUtils from '@/network/utils';
import * as tlsTestUtils from '../utils/tls';
import * as testsUtils from '../utils/utils';

describe(`${NodeConnection.name}`, () => {
  const logger = new Logger(`${NodeConnection.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const localHost = '127.0.0.1';
  const crypto = tlsTestUtils.createCrypto();

  let serverTlsConfig: TLSConfig;
  let clientTlsConfig: TLSConfig;
  let serverNodeId: NodeId;
  let clientNodeId: NodeId;
  let serverNodeIdEncoded: NodeIdEncoded;
  let serverSocket: QUICSocket;
  let quicServer: QUICServer;
  let rpcServer: RPCServer;
  let clientSocket: QUICSocket;

  const nodeConnections: Array<NodeConnection<any>> = [];
  /**
   * Adds created nodeConnections to the `nodeConnections` array for automated cleanup.
   * @param nc
   */
  const extractNodeConnection = (nc: NodeConnection<any>) => {
    nodeConnections.push(nc);
    return nc;
  };

  const handleEventQUICConnectionStream = async (event: quicEvents.EventQUICConnectionStream) => {
    // Streams are handled via the RPCServer.
    logger.info('Handling stream');
    const stream = event.detail;
    rpcServer.handleStream(stream);
  };

  beforeEach(async () => {
    const serverKeyPair = keysUtils.generateKeyPair();
    const clientKeyPair = keysUtils.generateKeyPair();
    serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey);
    clientNodeId = keysUtils.publicKeyToNodeId(clientKeyPair.publicKey);
    serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    serverTlsConfig = await tlsTestUtils.createTLSConfig(serverKeyPair);
    clientTlsConfig = await tlsTestUtils.createTLSConfig(clientKeyPair);
    serverSocket = new QUICSocket({
      logger: logger.getChild('serverSocket'),
    });
    await serverSocket.start({
      host: localHost,
    });
    quicServer = new QUICServer({
      config: {
        key: serverTlsConfig.keyPrivatePem,
        cert: serverTlsConfig.certChainPem,
        verifyPeer: true,
        verifyCallback: networkUtils.verifyClientCertificateChain,
      },
      crypto: {
        key: keysUtils.generateKey(),
        ops: crypto,
      },
      socket: serverSocket,
      logger: logger.getChild(`${QUICServer.name}`),
    });
    rpcServer = await RPCServer.createRPCServer({
      handlerTimeoutGraceTime: 1000,
      handlerTimeoutTime: 5000,
      logger: logger.getChild(`${RPCServer.name}`),
      manifest: {},
      sensitive: false,
    });
    // Setting up handling
    logger.info('Setting up connection handling for server');
    quicServer.addEventListener(quicEvents.EventQUICConnectionStream.name, handleEventQUICConnectionStream);
    quicServer.addEventListener(
      quicEvents.EventQUICServerStopped.name,
      () => {
        quicServer.removeEventListener(quicEvents.EventQUICConnectionStream.name, handleEventQUICConnectionStream);
      },
      { once: true },
    );

    await quicServer.start();
    clientSocket = new QUICSocket({
      logger: logger.getChild('clientSocket'),
    });
    await clientSocket.start({
      host: localHost,
    });
  });

  afterEach(async () => {
    await Promise.all(nodeConnections.map((nc) => nc.destroy({ force: true })));
    await clientSocket.stop({ force: true });
    await rpcServer.destroy({ force: true });
    await quicServer.stop({ force: true }); // Ignore errors due to socket already stopped
    await serverSocket.stop({ force: true });
  });

  test('session readiness', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      tlsConfig: clientTlsConfig,
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
    await nodeConnection.destroy();
    // Should be a noop
    await nodeConnection.destroy();
  });
  test('connects to the target', async () => {
    await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      tlsConfig: clientTlsConfig,
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
  });
  test('connection fails to target (times out)', async () => {
    const nodeConnectionProm = NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost as Host,
        targetPort: 12345 as Port,
        manifest: {},
        connectionKeepAliveTimeoutTime: 1000,
        tlsConfig: clientTlsConfig,
        crypto,
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: 100 },
    ).then(extractNodeConnection);
    await expect(nodeConnectionProm).rejects.toThrow(
      // QuicErrors.ErrorQUICClientCreateTimeOut, // FIXME: this is not throwing the right error
      ErrorContextsTimedTimeOut,
    );
  });
  test('connection drops out (socket stops responding)', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost as Host,
        targetPort: quicServer.port as unknown as Port,
        manifest: {},
        connectionKeepAliveTimeoutTime: 100,
        tlsConfig: clientTlsConfig,
        crypto,
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: 100 },
    ).then(extractNodeConnection);
    const destroyProm = testsUtils.promFromEvent(nodeConnection, nodesEvents.EventNodeConnectionDestroyed);
    await serverSocket.stop({ force: true });
    // Wait for destruction, may take 2+ seconds
    await destroyProm;
  });
  test('get the root chain cert', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      tlsConfig: clientTlsConfig,
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
    const remoteCertPem = keysUtils.certToPEM(nodeConnection.certChain[0]);
    expect(remoteCertPem).toEqual(serverTlsConfig.certChainPem);
  });
  test('get the NodeId', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      tlsConfig: clientTlsConfig,
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
    expect(serverNodeIdEncoded).toEqual(
      nodesUtils.encodeNodeId(nodeConnection.nodeId),
    );
  });

  test('Should fail due to server rejecting client certificate (no certs)', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      handleStream: () => {},
      targetNodeIds: [serverNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      // @ts-ignore: TLS not used for this test
      tlsConfig: {},
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
    const destroyProm = testsUtils.promFromEvent(nodeConnection, nodesEvents.EventNodeConnectionDestroyed);
    const errorProm = testsUtils.promFromEvent(nodeConnection, nodesEvents.EventNodeConnectionError);
    await destroyProm.p;
    const evt = await errorProm.p;
    expect(evt.detail.cause).toBeInstanceOf(quicErrors.ErrorQUICConnectionPeerTLS);
  });
  test('Should fail due to client rejecting server certificate (missing NodeId)', async () => {
    const nodeConnectionProm = NodeConnection.createNodeConnection({
      targetNodeIds: [clientNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      tlsConfig: clientTlsConfig,
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
    await expect(nodeConnectionProm).rejects.toThrow();
  });
  test('Should fail and destroy due to connection failure', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost as Host,
        targetPort: quicServer.port as unknown as Port,
        manifest: {},
        connectionKeepAliveIntervalTime: 100,
        connectionKeepAliveTimeoutTime: 200,
        tlsConfig: clientTlsConfig,
        crypto,
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: 150 },
    ).then(extractNodeConnection);
    const destroyProm = testsUtils.promFromEvent(nodeConnection, nodesEvents.EventNodeConnectionDestroyed);
    await serverSocket.stop({ force: true });
    await destroyProm.p;
  });
  test('Should fail and destroy due to connection ending local', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost as Host,
        targetPort: quicServer.port as unknown as Port,
        manifest: {},
        connectionKeepAliveTimeoutTime: 200,
        connectionKeepAliveIntervalTime: 100,
        tlsConfig: clientTlsConfig,
        crypto,
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: 150 },
    ).then(extractNodeConnection);
    const destroyProm = testsUtils.promFromEvent(nodeConnection, nodesEvents.EventNodeConnectionDestroyed);
    await nodeConnection.quicConnection.stop({
      isApp: true,
      errorCode: 0,
      force: false,
    });
    await destroyProm.p;
  });
  test('Should fail and destroy due to connection ending remote', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost as Host,
        targetPort: quicServer.port as unknown as Port,
        manifest: {},
        connectionKeepAliveTimeoutTime: 200,
        connectionKeepAliveIntervalTime: 100,
        tlsConfig: clientTlsConfig,
        crypto,
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: 150 },
    ).then(extractNodeConnection);
    const destroyProm = testsUtils.promFromEvent(nodeConnection, nodesEvents.EventNodeConnectionDestroyed);
    // @ts-ignore: kidnap internal property
    const connectionMap = serverSocket.connectionMap;
    connectionMap.forEach((connection) => {
      void connection.stop({
        isApp: true,
        errorCode: 0,
        force: false,
      });
    });
    await destroyProm.p;
  });
  test('should wrap reverse connection', async () => {
    const nodeConnectionReverseProm = promise<NodeConnection<any>>();
    quicServer.removeEventListener(quicEvents.EventQUICConnectionStream.name, handleEventQUICConnectionStream);
    quicServer.addEventListener(
      quicEvents.EventQUICServerConnection.name,
      async (event: quicEvents.EventQUICServerConnection) => {
        const quicConnection = event.detail;
        const { nodeId, certChain } = nodesUtils.parseRemoteCertsChain(quicConnection.getRemoteCertsChain());
        const nodeConnection = await NodeConnection.createNodeConnectionReverse(
          {
            nodeId,
            certChain,
            manifest: {},
            quicConnection,
            logger,
          },
        ).then(extractNodeConnection);
        nodeConnectionReverseProm.resolveP(nodeConnection);
      },
      { once: true },
    );
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      tlsConfig: clientTlsConfig,
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
    const destroyProm = testsUtils.promFromEvent(nodeConnection, nodesEvents.EventNodeConnectionDestroyed);
    const nodeConnectionReverse = await nodeConnectionReverseProm.p;
    await nodeConnectionReverse.destroy({ force: true });
    await destroyProm.p;
  });
  test('should handle reverse streams', async () => {
    const nodeConnectionReverseProm = promise<NodeConnection<any>>();
    const reverseStreamProm = promise<RPCStream<Uint8Array, Uint8Array>>();
    quicServer.removeEventListener(quicEvents.EventQUICConnectionStream.name, handleEventQUICConnectionStream);
    quicServer.addEventListener(
      quicEvents.EventQUICServerConnection.name,
      async (event: quicEvents.EventQUICServerConnection) => {
        const quicConnection = event.detail;
        const { nodeId, certChain } = nodesUtils.parseRemoteCertsChain(quicConnection.getRemoteCertsChain());
        const nodeConnection = await NodeConnection.createNodeConnectionReverse(
          {
            nodeId,
            certChain,
            manifest: {},
            quicConnection,
            logger,
          },
        ).then(extractNodeConnection);
        nodeConnection.addEventListener(
          nodesEvents.EventNodeConnectionStream.name,
          (e: nodesEvents.EventNodeConnectionStream) => {
            reverseStreamProm.resolveP(e.detail);
          },
          { once: true },
        );
        nodeConnectionReverseProm.resolveP(nodeConnection);
      },
      { once: true },
    );
    const forwardStreamProm = promise<RPCStream<Uint8Array, Uint8Array>>();
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      tlsConfig: clientTlsConfig,
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
    nodeConnection.addEventListener(
      nodesEvents.EventNodeConnectionStream.name,
      (e: nodesEvents.EventNodeConnectionStream) => {
        forwardStreamProm.resolveP(e.detail);
      },
      { once: true },
    );
    const nodeConnectionReverse = await nodeConnectionReverseProm.p;

    // Checking stream creation
    const forwardStream = await nodeConnection.quicConnection.newStream();
    const writer1 = forwardStream.writable.getWriter();
    await writer1.write(Buffer.from('Hello!'));
    await reverseStreamProm.p;

    const reverseStream =
      await nodeConnectionReverse.quicConnection.newStream();
    const writer2 = reverseStream.writable.getWriter();
    await writer2.write(Buffer.from('Hello!'));
    await forwardStreamProm.p;

    const destroyProm = testsUtils.promFromEvent(nodeConnection, nodesEvents.EventNodeConnectionDestroyed);
    await nodeConnectionReverse.destroy({ force: true });
    await destroyProm.p;
  });
});
