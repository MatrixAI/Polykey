import type { ContextTimed } from '@matrixai/contexts';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { NodeId, QUICClientConfig } from './types';
import type { Host, Hostname, Port } from '../network/types';
import type { CertificatePEM } from '../keys/types';
import type { ClientManifest } from '../rpc/types';
import type {
  Host as QUICHost,
  Port as QUICPort,
  QUICSocket,
  ClientCrypto,
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
import { never } from '../utils';

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
  public readonly quicClient: QUICClient;
  public readonly rpcClient: RPCClient<M>;

  static createNodeConnection<M extends ClientManifest>(
    {
      targetNodeIds,
      targetHost,
      targetPort,
      targetHostname,
      quicClientConfig,
      quicSocket,
      manifest,
      logger,
    }: {
      targetNodeIds: Array<NodeId>;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      quicClientConfig: QUICClientConfig;
      crypto: {
        ops: ClientCrypto;
      };
      quicSocket?: QUICSocket;
      manifest: M;
      logger?: Logger;
    },
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<NodeConnection<M>>;
  @timedCancellable(true, 20000)
  static async createNodeConnection<M extends ClientManifest>(
    {
      targetNodeIds,
      targetHost,
      targetPort,
      targetHostname,
      quicClientConfig,
      crypto,
      quicSocket,
      manifest,
      logger = new Logger(this.name),
    }: {
      targetNodeIds: Array<NodeId>;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      quicClientConfig: QUICClientConfig;
      crypto: {
        ops: ClientCrypto;
      };
      quicSocket?: QUICSocket;
      manifest: M;
      logger?: Logger;
    },
    @context ctx: ContextTimed,
  ): Promise<NodeConnection<M>> {
    logger.info(`Creating ${this.name}`);
    // Checking if attempting to connect to a wildcard IP
    if (networkUtils.isHostWildcard(targetHost)) {
      throw new nodesErrors.ErrorNodeConnectionHostWildcard();
    }
    const clientLogger = logger.getChild(RPCClient.name);
    let validatedNodeId: NodeId | undefined;
    const quicClient = await QUICClient.createQUICClient(
      {
        host: targetHost as unknown as QUICHost,
        port: targetPort as unknown as QUICPort,
        socket: quicSocket,
        config: {
          verifyPeer: true,
          verifyAllowFail: true,
          ca: undefined,
          ...quicClientConfig,
        },
        verifyCallback: async (certPEMs) => {
          validatedNodeId = await networkUtils.verifyServerCertificateChain(
            targetNodeIds,
            certPEMs,
          );
        },
        crypto: crypto,
        logger: logger.getChild(QUICClient.name),
      },
      ctx,
    );
    const rpcClient = await RPCClient.createRPCClient<M>({
      manifest,
      middlewareFactory: rpcUtils.defaultClientMiddlewareWrapper(),
      streamFactory: () => {
        return quicClient.connection.streamNew();
      },
      logger: clientLogger,
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
    const nodeConnection = new this<M>({
      validatedNodeId,
      nodeId,
      host: targetHost,
      port: targetPort,
      localHost: connection.localHost as unknown as Host,
      localPort: connection.localPort as unknown as Port,
      certChain,
      hostname: targetHostname,
      quicClient,
      rpcClient,
      logger,
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
    quicClient: QUICClient;
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
    this.rpcClient = rpcClient;
    this.logger = logger;
  }

  public async destroy({
    force,
  }: {
    force?: boolean;
  } = {}) {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.quicClient.destroy({ force });
    await this.rpcClient.destroy();
    this.logger.debug(`${this.constructor.name} triggered destroyed event`);
    this.dispatchEvent(new nodesEvents.NodeConnectionDestroyEvent());
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Gets GRPCClient for this node connection
   */
  public getClient(): RPCClient<M> {
    return this.rpcClient;
  }
}

export default NodeConnection;
