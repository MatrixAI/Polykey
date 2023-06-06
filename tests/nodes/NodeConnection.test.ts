import type { Host, Port, TLSConfig } from '@/network/types';
import type * as quicEvents from '@matrixai/quic/dist/events';
import type { NodeId, NodeIdEncoded } from '@/ids';
import type { Host as QUICHost } from '@matrixai/quic';
import { QUICServer, QUICSocket } from '@matrixai/quic';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { errors as quicErrors } from '@matrixai/quic';
import { sleep } from 'ix/asynciterable/_sleep';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import * as nodesErrors from '@/nodes/errors';
import NodeConnection from '@/nodes/NodeConnection';
import { promise } from '@/utils';
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
  let _clientNodeId: NodeId;
  let serverNodeIdEncoded: NodeIdEncoded;
  let serverSocket: QUICSocket;
  let quicServer: QUICServer;
  let rpcServer: RPCServer;
  let clientSocket: QUICSocket;

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
    conn.addEventListener('stream', handleStream);
    conn.addEventListener(
      'destroy',
      () => {
        conn.removeEventListener('stream', handleStream);
      },
      { once: true },
    );
  };

  beforeEach(async () => {
    const serverKeyPair = keysUtils.generateKeyPair();
    const clientKeyPair = keysUtils.generateKeyPair();
    serverNodeId = keysUtils.publicKeyToNodeId(serverKeyPair.publicKey);
    _clientNodeId = keysUtils.publicKeyToNodeId(clientKeyPair.publicKey);
    serverNodeIdEncoded = nodesUtils.encodeNodeId(serverNodeId);
    serverTlsConfig = await tlsTestUtils.createTLSConfig(serverKeyPair);
    clientTlsConfig = await tlsTestUtils.createTLSConfig(clientKeyPair);
    serverSocket = new QUICSocket({
      crypto,
      logger: logger.getChild('serverSocket'),
    });
    await serverSocket.start({
      host: localHost as unknown as QUICHost,
    });
    quicServer = new QUICServer({
      config: {
        tlsConfig: {
          privKeyPem: serverTlsConfig.keyPrivatePem,
          certChainPem: serverTlsConfig.certChainPem,
        },
      },
      crypto,
      socket: serverSocket,
      logger: logger.getChild(`${QUICServer.name}`),
    });
    rpcServer = await RPCServer.createRPCServer({
      handlerTimeoutGraceTime: 1000,
      handlerTimeoutTime: 5000,
      logger: logger.getChild(`${RPCServer.name}`),
      manifest: {}, // TODO: test server manifest
      sensitive: false,
    });
    // Setting up handling
    logger.info('Setting up connection handling for server');
    quicServer.addEventListener('connection', handleConnection);
    quicServer.addEventListener(
      'stop',
      () => {
        quicServer.removeEventListener('connection', handleConnection);
      },
      { once: true },
    );

    await quicServer.start();
    clientSocket = new QUICSocket({
      crypto,
      logger: logger.getChild('clientSocket'),
    });
    await clientSocket.start({
      host: localHost as unknown as QUICHost,
    });
  });

  afterEach(async () => {
    await clientSocket.stop(true);
    await rpcServer.destroy(true);
    await quicServer.stop({ force: true }).catch(() => {}); // Ignore errors due to socket already stopped
    await serverSocket.stop(true);
  });

  test('session readiness', async () => {
    logger.debug('session readiness start');
    const nodeConnection = await NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
        },
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
    await nodeConnection.destroy();
    // Should be a noop
    await nodeConnection.destroy();
    expect(() => {
      nodeConnection.getRootCertChain();
    }).toThrow(nodesErrors.ErrorNodeConnectionDestroyed);
  });
  test('connects to the target', async () => {
    await NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
        },
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
  });
  test('connection fails to target (times out)', async () => {
    const nodeConnectionProm = NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: 12345 as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
          maxIdleTimeout: 100,
        },
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
    await expect(nodeConnectionProm).rejects.toThrow(
      quicErrors.ErrorQUICConnectionTimeout,
    );
  });
  test('connection drops out (socket stops responding)', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
          maxIdleTimeout: 100,
        },
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
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
    await serverSocket.stop(true);
    await Promise.race([
      destroyProm.p,
      sleep(500).then(() => {
        throw Error('Destroying timed out');
      }),
    ]);
  });
  test('get the root chain cert', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
        },
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
    const remoteCertPem = keysUtils.certToPEM(
      nodeConnection.getRootCertChain()[0],
    );
    expect(remoteCertPem).toEqual(serverTlsConfig.certChainPem);
  });
  test('get the NodeId', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
        },
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
    expect(serverNodeIdEncoded).toEqual(
      nodesUtils.encodeNodeId(nodeConnection.getNodeId()),
    );
  });
  // TODO: verification not supported yet.
  test.todo('custom TLS verification succeeds for server');
  test.todo('custom TLS verification succeeds for client');
  test('Should fail due to tls failure server', async () => {
    const nodeConnectionProm = NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: true,
        },
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
    await expect(nodeConnectionProm).rejects.toThrow(
      quicErrors.ErrorQUICConnectionTLSFailure,
    );
  });
  test('Should fail due to tls failure client', async () => {
    // TODO: Subject to change, `createNodeConnection` and by extension `QUICClient`creation should throw a TLS fail.
    // Check client cert
    quicServer.updateConfig({
      verifyPeer: true,
    });
    const nodeConnection = await NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
          tlsConfig: {
            privKeyPem: clientTlsConfig.keyPrivatePem,
            certChainPem: clientTlsConfig.certChainPem,
          },
        },
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    await Promise.race([
      destroyProm.p,
      sleep(500).then(() => {
        throw Error('Destroying timed out');
      }),
    ]);
  });
  test('Should fail and destroy due to tls failure client no cert', async () => {
    // TODO: Subject to change, `createNodeConnection` and by extension `QUICClient`creation should throw a TLS fail.
    // Check client cert
    quicServer.updateConfig({
      verifyPeer: true,
    });
    const nodeConnection = await NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
        },
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    await Promise.race([
      destroyProm.p,
      sleep(500).then(() => {
        throw Error('Destroying timed out');
      }),
    ]);
  });
  test('Should fail and destroy due to connection failure', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
          maxIdleTimeout: 200,
        },
        keepaliveIntervalTime: 100,
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    await serverSocket.stop(true);
    await Promise.race([
      destroyProm.p,
      sleep(1000).then(() => {
        throw Error('Destroying timed out');
      }),
    ]);
  });
  test('Should fail and destroy due to connection ending local', async () => {
    const nodeConnection = await NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
          maxIdleTimeout: 200,
        },
        keepaliveIntervalTime: 100,
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    await nodeConnection.quicClient.connection.destroy({
      appError: true,
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
    const nodeConnection = await NodeConnection.createNodeConnection({
      _targetNodeIds: [serverNodeId],
      targetHost: localHost,
      targetPort: quicServer.port as unknown as Port,
      manifest: {},
      quicClientConfig: {
        crypto,
        localHost: localHost as unknown as QUICHost,
        config: {
          verifyPeer: false,
          maxIdleTimeout: 200,
        },
        keepaliveIntervalTime: 100,
      },
      quicSocket: clientSocket,
      logger: logger.getChild(`${NodeConnection.name}`),
    });
    const destroyProm = promise<void>();
    nodeConnection.addEventListener('destroy', () => {
      destroyProm.resolveP();
    });
    serverSocket.connectionMap.forEach((connection) => {
      void connection.destroy({
        appError: true,
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
