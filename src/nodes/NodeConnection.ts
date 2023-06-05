import type { ContextTimed } from '@matrixai/contexts';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { NodeId } from './types';
import type { ConnectionInfo, Host, Hostname, Port } from '../network/types';
import type { Certificate, CertificatePEM } from '../keys/types';
import type { ClientManifest } from '../rpc/types';
import type {
  Host as QUICHost,
  Port as QUICPort,
  QUICSocket,
} from '@matrixai/quic';
import type { QUICClientConfig } from './types';
import Logger from '@matrixai/logger';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
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
  public readonly host: Host;
  public readonly port: Port;
  /**
   * Hostname is defined if the target's host was resolved from this hostname
   * Undefined if a Host was directly provided
   */
  public readonly hostname?: Hostname;

  protected logger: Logger;
  public readonly quicClient: QUICClient;
  public readonly rpcClient: RPCClient<M>;

  static createNodeConnection<M extends ClientManifest>(
    {
      _targetNodeIds,
      targetHost,
      targetPort,
      targetHostname,
      quicClientConfig,
      quicSocket,
      manifest,
      logger,
    }: {
      _targetNodeIds: Array<NodeId>;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      quicClientConfig: QUICClientConfig;
      quicSocket?: QUICSocket;
      manifest: M;
      logger?: Logger;
    },
    _ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<NodeConnection<M>>;
  @timedCancellable(true, 20000)
  static async createNodeConnection<M extends ClientManifest>(
    {
      _targetNodeIds,
      targetHost,
      targetPort,
      targetHostname,
      quicClientConfig,
      quicSocket,
      manifest,
      logger = new Logger(this.name),
    }: {
      _targetNodeIds: Array<NodeId>;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      quicClientConfig: QUICClientConfig;
      quicSocket?: QUICSocket;
      manifest: M;
      logger?: Logger;
    },
    @context _ctx: ContextTimed,
  ): Promise<NodeConnection<M>> {
    logger.info(`Creating ${this.name}`);
    // Checking if attempting to connect to a wildcard IP
    if (networkUtils.isHostWildcard(targetHost)) {
      throw new nodesErrors.ErrorNodeConnectionHostWildcard();
    }
    const clientLogger = logger.getChild(RPCClient.name);
    // TODO: Custom TLS validation with NodeId
    // TODO: Idle timeout and connection timeout is the same thing from the `quic` perspective.
    //  This means we need to race our timeout timer
    const quicClient = await QUICClient.createQUICClient({
      host: targetHost as unknown as QUICHost,
      port: targetPort as unknown as QUICPort,
      socket: quicSocket,
      ...quicClientConfig,
      logger: logger.getChild(QUICClient.name),
    }).catch((e) => {
      logger.debug(`Failed ${this.name} creation with ${e}`);
      throw e;
    });
    quicClient.connection.addEventListener(
      'destroy',
      async () => {
        // Trigger the client destroying.
        // TODO: remove this later, may be handled by the `QUICClient` when fixed.
        // FIXME: ignoring errors with destroying for now.
        //  Problems with the socket being stopped before destroy.
        await quicClient.destroy({ force: false }).catch(() => {});
      },
      { once: true },
    );
    const rpcClient = await RPCClient.createRPCClient<M>({
      manifest,
      middlewareFactory: rpcUtils.defaultClientMiddlewareWrapper(),
      streamFactory: () => {
        return quicClient.connection.streamNew();
      },
      logger: clientLogger,
    });
    const nodeConnection = new this<M>({
      host: targetHost,
      port: targetPort,
      hostname: targetHostname,
      quicClient,
      rpcClient,
      logger,
    });
    quicClient.addEventListener(
      'destroy',
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
    host,
    port,
    hostname,
    quicClient,
    rpcClient,
    logger,
  }: {
    host: Host;
    port: Port;
    hostname?: Hostname;
    quicClient: QUICClient;
    rpcClient: RPCClient<M>;
    logger: Logger;
  }) {
    super();
    this.logger = logger;
    this.host = host;
    this.port = port;
    this.hostname = hostname;
    this.quicClient = quicClient;
    this.rpcClient = rpcClient;
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

  /**
   * Get the root certificate chain (i.e. the entire chain) of the node at the
   * end of this connection.
   * Ordered from newest to oldest.
   */
  @ready(new nodesErrors.ErrorNodeConnectionDestroyed())
  public getRootCertChain(): Array<Certificate> {
    return this.getConnectionInfo().remoteCertificates;
  }

  @ready(new nodesErrors.ErrorNodeConnectionDestroyed())
  public getConnectionInfo(): ConnectionInfo {
    const remoteInfo = this.quicClient.connection.remoteInfo;
    const remoteCertificates = remoteInfo.remoteCertificates?.map((pem) => {
      const cert = keysUtils.certFromPEM(pem as CertificatePEM);
      if (cert == null) never();
      return cert;
    });
    // FIXME: This LIKELY will fail, tls handshake completes after quic handshake.
    if (remoteCertificates == null) never();
    const remoteNodeId = keysUtils.certNodeId(remoteCertificates[0]);
    if (remoteNodeId == null) never();
    return {
      remoteNodeId,
      remoteCertificates,
      remoteHost: remoteInfo.remoteHost as unknown as Host,
      remotePort: remoteInfo.remotePort as unknown as Port,
      localHost: remoteInfo.localHost as unknown as Host,
      localPort: remoteInfo.localPort as unknown as Port,
    };
  }

  @ready(new nodesErrors.ErrorNodeConnectionDestroyed())
  public getNodeId(): NodeId {
    return this.getConnectionInfo().remoteNodeId;
  }
}

export default NodeConnection;
