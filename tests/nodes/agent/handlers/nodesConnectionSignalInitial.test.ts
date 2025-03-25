import type { KeyPair } from '#keys/types.js';
import type NodeConnectionManager from '#nodes/NodeConnectionManager.js';
import type { Host, Port } from '#network/types.js';
import { jest } from '@jest/globals';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer, events as quicEvents } from '@matrixai/quic';
import { RPCClient, RPCServer } from '@matrixai/rpc';
import * as tlsTestsUtils from '../../../utils/tls.js';
import * as testsNodesUtils from '../../../nodes/utils.js';
import { nodesConnectionSignalInitial } from '#nodes/agent/callers/index.js';
import { NodesConnectionSignalInitial } from '#nodes/agent/handlers/index.js';
import * as keysUtils from '#keys/utils/index.js';
import * as nodesUtils from '#nodes/utils.js';
import * as networkUtils from '#network/utils.js';

describe('nodesHolePunchSignal', () => {
  const logger = new Logger('nodesHolePunchSignal test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const localHost = '127.0.0.1';

  let keyPair: KeyPair;
  let rpcServer: RPCServer;
  let quicServer: QUICServer;

  const clientManifest = {
    nodesConnectionSignalInitial,
  };
  type ClientManifest = typeof clientManifest;
  let rpcClient: RPCClient<ClientManifest>;
  let quicClient: QUICClient;
  const dummyNodeConnectionManager = {
    handleNodesConnectionSignalInitial:
      jest.fn<
        typeof NodeConnectionManager.prototype.handleNodesConnectionSignalInitial
      >(),
  };

  beforeEach(async () => {
    dummyNodeConnectionManager.handleNodesConnectionSignalInitial.mockClear();

    // Handler dependencies
    keyPair = keysUtils.generateKeyPair();
    const tlsConfigClient = await tlsTestsUtils.createTLSConfig(keyPair);

    // Setting up server
    const serverManifest = {
      nodesConnectionSignalInitial: new NodesConnectionSignalInitial({
        nodeConnectionManager: dummyNodeConnectionManager as any,
      }),
    };
    rpcServer = new RPCServer({
      fromError: networkUtils.fromError,
      logger,
    });
    await rpcServer.start({ manifest: serverManifest });
    const tlsConfig = await tlsTestsUtils.createTLSConfig(keyPair);
    quicServer = new QUICServer({
      config: {
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        verifyPeer: true,
        verifyCallback: async () => undefined,
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
        key: tlsConfigClient.keyPrivatePem,
        cert: tlsConfigClient.certChainPem,
        verifyPeer: true,
        verifyCallback: async () => undefined,
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
  });

  test('should send hole punch relay', async () => {
    const targetNodeId = testsNodesUtils.generateRandomNodeId();
    const targetNodeIdEncoded = nodesUtils.encodeNodeId(targetNodeId);
    const sourceNodeId = keysUtils.publicKeyToNodeId(keyPair.publicKey);
    // Data is just `<sourceNodeId><targetNodeId>` concatenated
    const data = Buffer.concat([sourceNodeId, targetNodeId]);
    const signature = keysUtils.signWithPrivateKey(keyPair, data);
    dummyNodeConnectionManager.handleNodesConnectionSignalInitial.mockResolvedValue(
      {
        host: '127.0.0.1' as Host,
        port: 55555 as Port,
      },
    );
    await rpcClient.methods.nodesConnectionSignalInitial({
      targetNodeIdEncoded,
      signature: signature.toString('base64url'),
    });
    expect(
      dummyNodeConnectionManager.handleNodesConnectionSignalInitial,
    ).toHaveBeenCalled();
  });
});
