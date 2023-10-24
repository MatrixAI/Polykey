import type { KeyPair } from '@/keys/types';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { QUICClient, QUICServer, events as quicEvents } from '@matrixai/quic';
import { RPCClient, RPCServer } from '@matrixai/rpc';
import { nodesConnectionSignalFinal } from '@/nodes/agent/callers';
import { NodesConnectionSignalFinal } from '@/nodes/agent/handlers';
import * as keysUtils from '@/keys/utils/index';
import * as networkUtils from '@/network/utils';
import * as nodesUtils from '@/nodes/utils';
import * as tlsTestsUtils from '../../../utils/tls';
import * as testsNodesUtils from '../../utils';

describe('nodesHolePunchRequest', () => {
  const logger = new Logger('nodesHolePunchRequest test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const crypto = tlsTestsUtils.createCrypto();
  const localHost = '127.0.0.1';

  let keyPair: KeyPair;
  let rpcServer: RPCServer;
  let quicServer: QUICServer;

  const clientManifest = {
    nodesConnectionSignalFinal,
  };
  type ClientManifest = typeof clientManifest;
  let rpcClient: RPCClient<ClientManifest>;
  let quicClient: QUICClient;
  const dummyNodeConnectionManager = {
    handleNodesConnectionSignalFinal: jest.fn(),
  };

  beforeEach(async () => {
    dummyNodeConnectionManager.handleNodesConnectionSignalFinal.mockClear();

    // Handler dependencies
    keyPair = keysUtils.generateKeyPair();
    const tlsConfigClient = await tlsTestsUtils.createTLSConfig(keyPair);

    // Setting up server
    const serverManifest = {
      nodesConnectionSignalFinal: new NodesConnectionSignalFinal({
        nodeConnectionManager: dummyNodeConnectionManager as any,
        logger,
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
      crypto: {
        ops: crypto,
      },
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
    const requestKeyPair = keysUtils.generateKeyPair();
    const targetNodeId = testsNodesUtils.generateRandomNodeId();
    const sourceNodeId = keysUtils.publicKeyToNodeId(requestKeyPair.publicKey);
    // Data is just `<sourceNodeId><targetNodeId>` concatenated
    const requestData = Buffer.concat([sourceNodeId, targetNodeId]);
    const requestSignature = keysUtils.signWithPrivateKey(
      requestKeyPair,
      requestData,
    );

    // Generating relay signature, data is just `<sourceNodeId><targetNodeId><Address><requestSignature>` concatenated
    const address = {
      host: quicClient.host,
      port: quicClient.port,
    };
    const data = Buffer.concat([
      sourceNodeId,
      targetNodeId,
      Buffer.from(JSON.stringify(address), 'utf-8'),
      requestSignature,
    ]);
    const relaySignature = keysUtils.signWithPrivateKey(keyPair, data);

    await rpcClient.methods.nodesConnectionSignalFinal({
      sourceNodeIdEncoded: nodesUtils.encodeNodeId(sourceNodeId),
      targetNodeIdEncoded: nodesUtils.encodeNodeId(targetNodeId),
      address,
      requestSignature: requestSignature.toString('base64url'),
      relaySignature: relaySignature.toString('base64url'),
    });
    expect(
      dummyNodeConnectionManager.handleNodesConnectionSignalFinal,
    ).toHaveBeenCalled();
  });
});
