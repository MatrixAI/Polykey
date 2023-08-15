import type { ContextTimed } from '@matrixai/contexts';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { NodeId, QuicConfig } from './types';
import type { Host, Hostname, Port, TLSConfig } from '../network/types';
import type { Certificate, CertificatePEM } from '../keys/types';
import type { ClientManifest, RPCStream } from '../rpc/types';
import type {
  QUICSocket,
  ClientCrypto,
  QUICConnection,
  events as quicEvents,
} from '@matrixai/quic';
import type { ContextTimedInput } from '@matrixai/contexts/dist/types';
import type { X509Certificate } from '@peculiar/x509';
import Logger from '@matrixai/logger';
import { CreateDestroy } from '@matrixai/async-init/dist/CreateDestroy';
import { timedCancellable, context } from '@matrixai/contexts/dist/decorators';
import { QUICClient } from '@matrixai/quic';
import * as nodesErrors from './errors';
import * as nodesEvents from './events';
import RPCClient from '../rpc/RPCClient';
import * as networkUtils from '../network/utils';
import * as rpcUtils from '../rpc/utils';
import * as keysUtils from '../keys/utils';
import * as nodesUtils from '../nodes/utils';
import { never } from '../utils';
import * as utils from '../utils';

/**
 * Encapsulates the unidirectional client-side connection of one node to another.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- False positive for M
interface NodeConnection<M extends ClientManifest> extends CreateDestroy {}
@CreateDestroy()
class NodeConnection<M extends ClientManifest> extends EventTarget {
  /**
   * Hostname is defined if the target's host was resolved from this hostname
   * Undefined if a Host was directly provided
   */
  public readonly hostname?: Hostname;
  /**
   * The NodeId that it was validated on when verifying the peer
   */
  public readonly validatedNodeId: NodeId;
  /**
   * The most current NodeId of the peer's cert chain
   */
  public readonly nodeId: NodeId;
  public readonly host: Host;
  public readonly port: Port;
  public readonly localHost: Host;
  public readonly localPort: Port;
  public readonly certChain: Readonly<X509Certificate>[];

  protected logger: Logger;
  public readonly quicClient: QUICClient | undefined;
  public readonly quicConnection: QUICConnection;
  public readonly rpcClient: RPCClient<M>;

  static createNodeConnection<M extends ClientManifest>(
    {
      handleStream,
      targetNodeIds,
      targetHost,
      targetPort,
      targetHostname,
      tlsConfig,
      quicConfig = {},
      quicSocket,
      manifest,
      logger,
    }: {
      handleStream: (stream: RPCStream<Uint8Array, Uint8Array>) => void;
      targetNodeIds: Array<NodeId>;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      crypto: ClientCrypto;
      tlsConfig: TLSConfig;
      quicConfig?: QuicConfig;
      quicSocket?: QUICSocket;
      manifest: M;
      logger?: Logger;
    },
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<NodeConnection<M>>;
  @timedCancellable(true, 20000)
  static async createNodeConnection<M extends ClientManifest>(
    {
      handleStream,
      targetNodeIds,
      targetHost,
      targetPort,
      targetHostname,
      crypto,
      tlsConfig,
      manifest,
      quicConfig = {},
      quicSocket,
      logger = new Logger(this.name),
    }: {
      handleStream: (stream: RPCStream<Uint8Array, Uint8Array>) => void;
      targetNodeIds: Array<NodeId>;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      crypto: ClientCrypto;
      tlsConfig: TLSConfig;
      manifest: M;
      quicConfig?: QuicConfig;
      quicSocket?: QUICSocket;
      logger?: Logger;
    },
    @context ctx: ContextTimed,
  ): Promise<NodeConnection<M>> {
    logger.info(`Creating ${this.name}`);
    // Checking if attempting to connect to a wildcard IP
    if (networkUtils.isHostWildcard(targetHost)) {
      throw new nodesErrors.ErrorNodeConnectionHostWildcard();
    }
    let validatedNodeId: NodeId | undefined;
    const quicClient = await QUICClient.createQUICClient(
      {
        host: targetHost,
        port: targetPort,
        socket: quicSocket,
        config: {
          ...quicConfig,
          verifyPeer: true,
          verifyAllowFail: true,
          ca: undefined,
          key: tlsConfig.keyPrivatePem,
          cert: tlsConfig.certChainPem,
        },
        verifyCallback: async (certPEMs) => {
          validatedNodeId = await networkUtils.verifyServerCertificateChain(
            targetNodeIds,
            certPEMs,
          );
        },
        crypto: {
          ops: crypto,
        },
        reasonToCode: utils.reasonToCode,
        codeToReason: utils.codeToReason,
        logger: logger.getChild(QUICClient.name),
      },
      ctx,
    );
    const quicConnection = quicClient.connection;
    // Setting up stream handling
    const handleConnectionStream = (
      streamEvent: quicEvents.QUICConnectionStreamEvent,
    ) => {
      const stream = streamEvent.detail;
      handleStream(stream);
    };
    quicConnection.addEventListener('connectionStream', handleConnectionStream);
    quicConnection.addEventListener(
      'connectionStop',
      () => {
        quicConnection.removeEventListener(
          'connectionStream',
          handleConnectionStream,
        );
      },
      { once: true },
    );
    const rpcClient = await RPCClient.createRPCClient<M>({
      manifest,
      middlewareFactory: rpcUtils.defaultClientMiddlewareWrapper(),
      streamFactory: () => {
        return quicConnection.streamNew();
      },
      logger: logger.getChild(RPCClient.name),
    });
    if (validatedNodeId == null) never();
    // Obtaining remote node ID from certificate chain. It should always exist in the chain if validated.
    //  This may de different from the NodeId we validated it as if it renewed at some point.
    const connection = quicClient.connection;
    // Remote certificate information should always be available here due to custom verification
    const certChain = connection.getRemoteCertsChain().map((pem) => {
      const cert = keysUtils.certFromPEM(pem as CertificatePEM);
      if (cert == null) never();
      return cert;
    });
    if (certChain == null) never();
    const nodeId = keysUtils.certNodeId(certChain[0]);
    if (nodeId == null) never();
    const newLogger = logger.getParent() ?? new Logger(this.name);
    const nodeConnection = new this<M>({
      validatedNodeId,
      nodeId,
      host: targetHost,
      port: targetPort,
      localHost: connection.localHost as Host,
      localPort: connection.localPort as Port,
      certChain,
      hostname: targetHostname,
      quicClient,
      quicConnection,
      rpcClient,
      logger: newLogger.getChild(
        `${this.name} [${nodesUtils.encodeNodeId(nodeId)}@${
          quicConnection.remoteHost
        }:${quicConnection.remotePort}]`,
      ),
    });
    quicClient.addEventListener(
      'clientDestroy',
      async () => {
        // Trigger the nodeConnection destroying
        await nodeConnection.destroy({ force: false });
      },
      { once: true },
    );
    logger.info(`Created ${this.name}`);
    return nodeConnection;
  }

  static async createNodeConnectionReverse<M extends ClientManifest>({
    handleStream,
    certChain,
    nodeId,
    quicConnection,
    manifest,
    logger = new Logger(this.name),
  }: {
    handleStream: (stream: RPCStream<Uint8Array, Uint8Array>) => void;
    certChain: Array<Certificate>;
    nodeId: NodeId;
    quicConnection: QUICConnection;
    manifest: M;
    logger?: Logger;
  }): Promise<NodeConnection<M>> {
    logger.info(`Creating ${this.name}`);
    // Creating RPCClient
    const rpcClient = await RPCClient.createRPCClient<M>({
      manifest,
      middlewareFactory: rpcUtils.defaultClientMiddlewareWrapper(),
      streamFactory: () => {
        return quicConnection.streamNew();
      },
      logger: logger.getChild(RPCClient.name),
    });
    // Setting up stream handling
    const handleConnectionStream = (
      streamEvent: quicEvents.QUICConnectionStreamEvent,
    ) => {
      const stream = streamEvent.detail;
      handleStream(stream);
    };
    quicConnection.addEventListener('connectionStream', handleConnectionStream);
    quicConnection.addEventListener(
      'connectionStop',
      () => {
        quicConnection.removeEventListener(
          'connectionStream',
          handleConnectionStream,
        );
      },
      { once: true },
    );
    // Creating NodeConnection
    const nodeConnection = new this<M>({
      validatedNodeId: nodeId,
      nodeId: nodeId,
      localHost: quicConnection.localHost as Host,
      localPort: quicConnection.localPort as Port,
      host: quicConnection.remoteHost as Host,
      port: quicConnection.remotePort as Port,
      certChain,
      // Hostname and client are not available on reverse connections
      hostname: undefined,
      quicClient: undefined,
      quicConnection,
      rpcClient,
      logger,
    });
    quicConnection.addEventListener(
      'connectionStop',
      async () => {
        // Trigger the nodeConnection destroying
        await nodeConnection.destroy({ force: false });
      },
      { once: true },
    );
    logger.info(`Created ${this.name}`);
    return nodeConnection;
  }

  constructor({
    validatedNodeId,
    nodeId,
    host,
    port,
    localHost,
    localPort,
    certChain,
    hostname,
    quicClient,
    quicConnection,
    rpcClient,
    logger,
  }: {
    validatedNodeId: NodeId;
    nodeId: NodeId;
    host: Host;
    port: Port;
    localHost: Host;
    localPort: Port;
    certChain: Readonly<X509Certificate>[];
    hostname?: Hostname;
    quicClient?: QUICClient;
    quicConnection: QUICConnection;
    rpcClient: RPCClient<M>;
    logger: Logger;
  }) {
    super();
    this.validatedNodeId = validatedNodeId;
    this.nodeId = nodeId;
    this.host = host;
    this.port = port;
    this.localHost = localHost;
    this.localPort = localPort;
    this.certChain = certChain;
    this.hostname = hostname;
    this.quicClient = quicClient;
    this.quicConnection = quicConnection;
    this.rpcClient = rpcClient;
    this.logger = logger;
  }

  public async destroy({
    force,
  }: {
    force?: boolean;
  } = {}) {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.quicClient?.destroy({ force });
    // This is only needed for reverse connections, otherwise it is handled by the quicClient.
    await this.quicConnection.stop(
      force
        ? {
            applicationError: true,
            errorCode: 0,
            errorMessage: 'NodeConnection is forcing destruction',
            force: true,
          }
        : {},
    );
    await this.rpcClient.destroy();
    this.logger.debug(`${this.constructor.name} triggered destroyed event`);
    this.dispatchEvent(new nodesEvents.NodeConnectionDestroyEvent());
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Gets RPCClient for this node connection
   */
  public getClient(): RPCClient<M> {
    return this.rpcClient;
  }
}

export default NodeConnection;
