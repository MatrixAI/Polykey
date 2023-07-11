import type { Host, Port, TLSConfig } from '@/network/types';
import type * as quicEvents from '@matrixai/quic/dist/events';
import type { NodeId, NodeIdEncoded } from '@/ids';
import type { Host as QUICHost } from '@matrixai/quic';
import { QUICServer, QUICSocket } from '@matrixai/quic';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { errors as quicErrors } from '@matrixai/quic';
import { sleep } from 'ix/asynciterable/_sleep';
import { Timer } from '@matrixai/timer';
import { ErrorContextsTimedTimeOut } from '@matrixai/contexts/dist/errors';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import NodeConnection from '@/nodes/NodeConnection';
import { promise } from '@/utils';
import * as networkUtils from '@/network/utils';
import * as tlsTestUtils from '../utils/tls';

describe(`${NodeConnection.name}`, () => {
  const logger = new Logger(`${NodeConnection.name} test`, LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const localHost = '127.0.0.1' as Host;
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

  let nodeConnection_: NodeConnection<any>;

  const handleStream = async (event: quicEvents.QUICConnectionStreamEvent) => {
    // Streams are handled via the RPCServer.
    logger.info('Handling stream');
    const stream = event.detail;
    rpcServer.handleStream(stream);
  };

  const handleConnection = async (
    event: quicEvents.QUICServerConnectionEvent,
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
      host: localHost as unknown as QUICHost,
    });
    quicServer = new QUICServer({
      config: {
        key: serverTlsConfig.keyPrivatePem,
        cert: serverTlsConfig.certChainPem,
        verifyPeer: true,
        verifyAllowFail: true,
      },
      verifyCallback: networkUtils.verifyClientCertificateChain,
      crypto,
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
      host: localHost as unknown as QUICHost,
    });
  });

  afterEach(async () => {
    await nodeConnection_?.destroy({ force: true });
    await clientSocket.stop({ force: true });
    await rpcServer.destroy(true);
    await quicServer.stop({ force: true }); // Ignore errors due to socket already stopped
    await serverSocket.stop({ force: true });
  });

  test('session readiness', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        key: clientTlsConfig.keyPrivatePem,
        cert: clientTlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then((n) => {
      nodeConnection_ = n;
      return n;
    });
    await nodeConnection.destroy();
    // Should be a noop
    await nodeConnection.destroy();
  });
  test('connects to the target', async () => {
    await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        key: clientTlsConfig.keyPrivatePem,
        cert: clientTlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then((n) => {
      nodeConnection_ = n;
      return n;
    });
  });
  test('connection fails to target (times out)', async () => {
    const nodeConnectionProm = NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost,
        targetPort: 12345 as Port,
        manifest: {},
        quicClientConfig: {
          key: clientTlsConfig.keyPrivatePem,
          cert: clientTlsConfig.certChainPem,
          maxIdleTimeout: 1000,
          crypto,
        },
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: new Timer({ delay: 100 }) },
    ).then((n) => {
      nodeConnection_ = n;
      return n;
    });
    await expect(nodeConnectionProm).rejects.toThrow(
      // QuicErrors.ErrorQUICClientCreateTimeOut, // FIXME: this is not throwing the right error
      ErrorContextsTimedTimeOut,
    );
  });
  test('connection drops out (socket stops responding)', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost,
        targetPort: quicServer.port as unknown as Port,
        manifest: {},
        quicClientConfig: {
          key: clientTlsConfig.keyPrivatePem,
          cert: clientTlsConfig.certChainPem,
          maxIdleTimeout: 100,
          crypto,
        },
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: 100 },
    ).then((n) => {
      nodeConnection_ = n;
      return n;
    });
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
    await Promise.race([
      destroyProm.p,
      sleep(5000).then(() => {
        throw Error('Destroying timed out');
      }),
    ]);
  });
  test('get the root chain cert', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        key: clientTlsConfig.keyPrivatePem,
        cert: clientTlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then((n) => {
      nodeConnection_ = n;
      return n;
    });
    const remoteCertPem = keysUtils.certToPEM(nodeConnection.certChain[0]);
    expect(remoteCertPem).toEqual(serverTlsConfig.certChainPem);
  });
  test('get the NodeId', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        key: clientTlsConfig.keyPrivatePem,
        cert: clientTlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then((n) => {
      nodeConnection_ = n;
      return n;
    });
    expect(serverNodeIdEncoded).toEqual(
      nodesUtils.encodeNodeId(nodeConnection.nodeId),
    );
  });
  test('Should fail due to server rejecting client certificate (no certs)', async () => {
    const nodeConnectionProm = NodeConnection.createNodeConnection({
      targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        // @ts-ignore: no certs provided
        key: undefined,
        // @ts-ignore: no certs provided
        cert: undefined,
        crypto,
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then((n) => {
      nodeConnection_ = n;
      return n;
    });
    await expect(nodeConnectionProm).rejects.toThrow(
      quicErrors.ErrorQUICConnectionInternal,
    );
  });
  test('Should fail due to client rejecting server certificate (missing NodeId)', async () => {
    const nodeConnectionProm = NodeConnection.createNodeConnection({
      targetNodeIds: [clientNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        key: clientTlsConfig.keyPrivatePem,
        cert: clientTlsConfig.certChainPem,
        crypto,
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    }).then((n) => {
      nodeConnection_ = n;
      return n;
    });
    await expect(nodeConnectionProm).rejects.toThrow();
  });
  test('Should fail and destroy due to connection failure', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost,
        targetPort: quicServer.port as unknown as Port,
        manifest: {},
        quicClientConfig: {
          key: clientTlsConfig.keyPrivatePem,
          cert: clientTlsConfig.certChainPem,
          keepaliveIntervalTime: 100,
          maxIdleTimeout: 200,
          crypto,
        },
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: 150 },
    ).then((n) => {
      nodeConnection_ = n;
      return n;
    });
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    await serverSocket.stop({ force: true });
    await Promise.race([
      destroyProm.p,
      sleep(5000).then(() => {
        throw Error('Destroying timed out');
      }),
    ]);
  });
  test('Should fail and destroy due to connection ending local', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost,
        targetPort: quicServer.port as unknown as Port,
        manifest: {},
        quicClientConfig: {
          key: clientTlsConfig.keyPrivatePem,
          cert: clientTlsConfig.certChainPem,
          maxIdleTimeout: 200,
          keepaliveIntervalTime: 100,
          crypto,
        },
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: 150 },
    ).then((n) => {
      nodeConnection_ = n;
      return n;
    });
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    await nodeConnection.quicClient.connection.stop({
      applicationError: true,
      errorCode: 0,
      force: false,
    });
    await Promise.race([
      destroyProm.p,
      sleep(1000).then(() => {
        throw Error('Destroying timed out');
      }),
    ]);
  });
  test('Should fail and destroy due to connection ending remote', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection(
      {
        targetNodeIds: [serverNodeId],
        targetHost: localHost,
        targetPort: quicServer.port as unknown as Port,
        manifest: {},
        quicClientConfig: {
          key: clientTlsConfig.keyPrivatePem,
          cert: clientTlsConfig.certChainPem,
          maxIdleTimeout: 200,
          keepaliveIntervalTime: 100,
          crypto,
        },
        quicSocket: clientSocket,
        logger: logger.getChild(`${NodeConnection.name}`),
      },
      { timer: 150 },
    ).then((n) => {
      nodeConnection_ = n;
      return n;
    });
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    serverSocket.connectionMap.forEach((connection) => {
      void connection.stop({
        applicationError: true,
        errorCode: 0,
        force: false,
      });
    });
    await Promise.race([
      destroyProm.p,
      sleep(1000).then(() => {
        throw Error('Destroying timed out');
      }),
    ]);
  });
});
