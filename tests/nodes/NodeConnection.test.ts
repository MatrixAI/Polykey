import type { Host, Port, TLSConfig } from '@/network/types';
import type * as quicEvents from '@matrixai/quic/dist/events';
import type { NodeId, NodeIdEncoded } from '@/ids';
import type { RPCStream } from '@/rpc/types';
import type { CertificatePEM } from '@/keys/types';
import { QUICServer, QUICSocket } from '@matrixai/quic';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { errors as quicErrors } from '@matrixai/quic';
import { ErrorContextsTimedTimeOut } from '@matrixai/contexts/dist/errors';
import * as nodesUtils from '@/nodes/utils';
import * as nodesEvents from '@/nodes/events';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import NodeConnection from '@/nodes/NodeConnection';
import { never, promise } from '@/utils';
import * as networkUtils from '@/network/utils';
import * as tlsTestUtils from '../utils/tls';

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

  const handleStream = async (event: quicEvents.EventQUICConnectionStream) => {
    // Streams are handled via the RPCServer.
    logger.info('Handling stream');
    const stream = event.detail;
    rpcServer.handleStream(stream);
  };

  const handleConnection = async (
    event: quicEvents.EventQUICServerConnection,
  ) => {
    // Needs to setup stream handler
    const conn = event.detail;
    logger.info('Setting up stream handling for connection');
    conn.addEventListener('connectionStream', handleStream);
    conn.addEventListener(
      'connectionStop',
      () => {
        conn.removeEventListener('connectionStream', handleStream);
      },
      { once: true },
    );
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
    quicServer.addEventListener('serverConnection', handleConnection);
    quicServer.addEventListener(
      'serverStop',
      () => {
        quicServer.removeEventListener('serverConnection', handleConnection);
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
    await rpcServer.destroy(true);
    await quicServer.stop({ force: true }); // Ignore errors due to socket already stopped
    await serverSocket.stop({ force: true });
  });

  test('session readiness', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as Port,
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
      targetPort: quicServer.port as Port,
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
        targetPort: quicServer.port as Port,
        manifest: {},
        connectionKeepAliveTimeoutTime: 100,
        tlsConfig: clientTlsConfig,
        crypto,
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: 100 },
    ).then(extractNodeConnection);
    const destroyProm = promise<void>();
    nodeConnection.addEventListener(
      'destroy',
      () => {
        destroyProm.resolveP();
      },
      { once: true },
    );
    // NodeConnection.
    await serverSocket.stop({ force: true });
    // Wait for destruction, may take 2+ seconds
    await destroyProm.p;
  });
  test('get the root chain cert', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as Port,
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
      targetPort: quicServer.port as Port,
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
    const nodeConnectionProm = NodeConnection.createNodeConnection({
      handleStream: () => {},
      targetNodeIds: [serverNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as Port,
      manifest: {},
      // @ts-ignore: TLS not used for this test
      tlsConfig: {},
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
    await expect(nodeConnectionProm).rejects.toThrow(
      quicErrors.ErrorQUICConnectionInternal,
    );
  });
  test('Should fail due to client rejecting server certificate (missing NodeId)', async () => {
    const nodeConnectionProm = NodeConnection.createNodeConnection({
      targetNodeIds: [clientNodeId],
      targetHost: localHost as Host,
      targetPort: quicServer.port as Port,
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
        targetPort: quicServer.port as Port,
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
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    await serverSocket.stop({ force: true });
    await destroyProm.p;
  });
  test('Should fail and destroy due to connection ending local', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost as Host,
        targetPort: quicServer.port as Port,
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
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    await nodeConnection.quicConnection.stop({
      applicationError: true,
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
        targetPort: quicServer.port as Port,
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
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    // @ts-ignore: kidnap internal property
    const connectionMap = serverSocket.connectionMap;
    connectionMap.forEach((connection) => {
      void connection.stop({
        applicationError: true,
        errorCode: 0,
        force: false,
      });
    });
    await destroyProm.p;
  });
  test('should wrap reverse connection', async () => {
    const nodeConnectionReverseProm = promise<NodeConnection<any>>();
    quicServer.removeEventListener('serverConnection', handleConnection);
    quicServer.addEventListener(
      'serverConnection',
      async (event: quicEvents.EventQUICServerConnection) => {
        const quicConnection = event.detail;
        const certChain = quicConnection.getRemoteCertsChain().map((pem) => {
          const cert = keysUtils.certFromPEM(pem as CertificatePEM);
          if (cert == null) never();
          return cert;
        });
        if (certChain == null) never();
        const nodeId = keysUtils.certNodeId(certChain[0]);
        if (nodeId == null) never();
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
      targetPort: quicServer.port as Port,
      manifest: {},
      tlsConfig: clientTlsConfig,
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
    const nodeConnectionReverse = await nodeConnectionReverseProm.p;
    const nodeConnectionDestroyProm = promise<void>();
    nodeConnection.addEventListener(
      'destroy',
      () => nodeConnectionDestroyProm.resolveP(),
      { once: true },
    );
    await nodeConnectionReverse.destroy({ force: true });
    await nodeConnectionDestroyProm.p;
  });
  test('should handle reverse streams', async () => {
    const nodeConnectionReverseProm = promise<NodeConnection<any>>();
    const reverseStreamProm = promise<RPCStream<Uint8Array, Uint8Array>>();
    quicServer.removeEventListener('serverConnection', handleConnection);
    quicServer.addEventListener(
      'serverConnection',
      async (event: quicEvents.EventQUICServerConnection) => {
        const quicConnection = event.detail;
        const certChain = quicConnection.getRemoteCertsChain().map((pem) => {
          const cert = keysUtils.certFromPEM(pem as CertificatePEM);
          if (cert == null) never();
          return cert;
        });
        if (certChain == null) never();
        const nodeId = keysUtils.certNodeId(certChain[0]);
        if (nodeId == null) never();
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
          nodesEvents.EventNodeStream.name,
          (e: nodesEvents.EventNodeStream) => {
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
      targetPort: quicServer.port as Port,
      manifest: {},
      tlsConfig: clientTlsConfig,
      crypto,
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then(extractNodeConnection);
    nodeConnection.addEventListener(
      nodesEvents.EventNodeStream.name,
      (e: nodesEvents.EventNodeStream) => {
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

    const nodeConnectionDestroyProm = promise<void>();
    nodeConnection.addEventListener(
      'destroy',
      () => nodeConnectionDestroyProm.resolveP(),
      { once: true },
    );
    await nodeConnectionReverse.destroy({ force: true });
    await nodeConnectionDestroyProm.p;
  });
});
