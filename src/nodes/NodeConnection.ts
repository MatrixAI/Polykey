import type { ContextTimed } from '@matrixai/contexts';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { NodeId } from './types';
import type { Host, Hostname, Port } from '../network/types';
import type { Certificate } from '../keys/types';
import type { ClientManifest } from '@/rpc/types';
import type { Host as QUICHost, Port as QUICPort } from '@matrixai/quic';
import type { QUICClientConfig } from './types';
import Logger from '@matrixai/logger';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import * as asyncInit from '@matrixai/async-init';
import { timedCancellable, context } from '@matrixai/contexts/dist/decorators';
import { QUICClient } from '@matrixai/quic';
import RPCClient from '@/rpc/RPCClient';import * as nodesErrors from './errors';
import * as networkUtils from '../network/utils';
import * as rpcUtils from '../rpc/utils';

// TODO: extend an event system, use events for cleaning up.
/**
 * Encapsulates the unidirectional client-side connection of one node to another.
 */
interface NodeConnection<M extends ClientManifest> extends CreateDestroy {}
@CreateDestroy()
class NodeConnection<M extends ClientManifest> {
  public readonly host: Host;
  public readonly port: Port;
  /**
   * Hostname is defined if the target's host was resolved from this hostname
   * Undefined if a Host was directly provided
   */
  public readonly hostname?: Hostname;

  protected logger: Logger;
  protected quicClient: QUICClient;
  protected rpcClient: RPCClient<M>;

  static createNodeConnection<M extends ClientManifest>(
    {
      targetNodeId,
      targetHost,
      targetPort,
      targetHostname,
      quicClientConfig,
      manifest,
      logger,
    }: {
      targetNodeId: NodeId;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      quicClientConfig: QUICClientConfig;
      manifest: M;
      logger?: Logger;
    },
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<NodeConnection<M>>;
  @timedCancellable(true, 20000)
  static async createNodeConnection<M extends ClientManifest>(
    {
      targetNodeId,
      targetHost,
      targetPort,
      targetHostname,
      quicClientConfig,
      manifest,
      logger = new Logger(this.name),
    }: {
      targetNodeId: NodeId;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      quicClientConfig: QUICClientConfig;
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
    // TODO: this needs to be updated to take a context,
    //  still uses old timer style.
    const clientLogger = logger.getChild(RPCClient.name);
    // TODO: Custom TLS validation with NodeId
    // TODO: Idle timeout and connection timeout is the same thing from the `quic` perspective.
    //  THis means we need to race our timeout timer
    const quicClient = await QUICClient.createQUICClient({
      host: targetHost as unknown as QUICHost, // FIXME: better type conversion?
      port: targetPort as unknown as QUICPort, // FIXME: better type conversion?
      ...quicClientConfig,
      logger: logger.getChild(QUICClient.name),
    });
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
    nodeConnection.rpcClient = rpcClient;
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
    // TODO: trigger destroy event
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
    const connInfo = this.quicClient.connection.remoteInfo;
    // TODO:
    throw Error('TMP IMP');
    // Return connInfo.remoteCertificates;
  }
}

export default NodeConnection;
