import type { NodeId } from './types';
import type { Host, Hostname, Port } from '../network/types';
import type { Certificate } from '../keys/types';
import type Proxy from '../network/Proxy';
import type GRPCClient from '../grpc/GRPCClient';
import type { ContextTimed } from '../contexts/types';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import Logger from '@matrixai/logger';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import * as asyncInit from '@matrixai/async-init';
import * as nodesErrors from './errors';
import { context, timedCancellable } from '../contexts/index';
import * as grpcErrors from '../grpc/errors';
import * as networkUtils from '../network/utils';
import { timerStart } from '../utils/index';

/**
 * Encapsulates the unidirectional client-side connection of one node to another.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- False positive for T
interface NodeConnection<T extends GRPCClient> extends CreateDestroy {}
@CreateDestroy()
class NodeConnection<T extends GRPCClient> {
  public readonly host: Host;
  public readonly port: Port;
  /**
   * Hostname is defined if the target's host was resolved from this hostname
   * Undefined if a Host was directly provided
   */
  public readonly hostname?: Hostname;

  protected logger: Logger;
  protected destroyCallback: () => Promise<void>;
  protected proxy: Proxy;
  protected client: T;

  static createNodeConnection<T extends GRPCClient>(
    {
      targetNodeId,
      targetHost,
      targetPort,
      targetHostname,
      proxy,
      clientFactory,
      destroyCallback,
      destroyTimeout,
      logger,
    }: {
      targetNodeId: NodeId;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      proxy: Proxy;
      clientFactory: (...args) => Promise<T>;
      destroyCallback?: () => Promise<void>;
      destroyTimeout?: number;
      logger?: Logger;
    },
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<NodeConnection<T>>;
  @timedCancellable(true, 20000)
  static async createNodeConnection<T extends GRPCClient>(
    {
      targetNodeId,
      targetHost,
      targetPort,
      targetHostname,
      proxy,
      clientFactory,
      destroyCallback = async () => {},
      destroyTimeout = 2000,
      logger = new Logger(this.name),
    }: {
      targetNodeId: NodeId;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      proxy: Proxy;
      clientFactory: (...args) => Promise<T>;
      destroyCallback?: () => Promise<void>;
      destroyTimeout?: number;
      logger?: Logger;
    },
    @context ctx: ContextTimed,
  ): Promise<NodeConnection<T>> {
    logger.info(`Creating ${this.name}`);
    // Checking if attempting to connect to a wildcard IP
    if (networkUtils.isHostWildcard(targetHost)) {
      throw new nodesErrors.ErrorNodeConnectionHostWildcard();
    }
    const proxyConfig = {
      host: proxy.getForwardHost(),
      port: proxy.getForwardPort(),
      authToken: proxy.authToken,
    };
    // 1. Ask fwdProxy for connection to target (the revProxy of other node)
    // 2. Start sending hole-punching packets to the target (via the client start -
    // this establishes a HTTP CONNECT request with the forward proxy)
    // 3. Relay the proxy port to the broker/s (such that they can inform the other node)
    // 4. Start sending hole-punching packets to other node (done in openConnection())
    // Done in parallel
    const nodeConnection = new this<T>({
      host: targetHost,
      port: targetPort,
      hostname: targetHostname,
      proxy: proxy,
      destroyCallback,
      logger,
    });
    let client: T;
    try {
      // TODO: this needs to be updated to take a context,
      //  still uses old timer style.
      const clientLogger = logger.getChild(clientFactory.name);
      client = await clientFactory({
        nodeId: targetNodeId,
        host: targetHost,
        port: targetPort,
        proxyConfig: proxyConfig,
        // Think about this
        logger: clientLogger,
        destroyCallback: async () => {
          clientLogger.debug(`GRPC client triggered destroyedCallback`);
          if (
            nodeConnection[asyncInit.status] !== 'destroying' &&
            !nodeConnection[asyncInit.destroyed]
          ) {
            await nodeConnection.destroy({ timeout: destroyTimeout });
          }
        },
        // FIXME: this needs to be replaced with
        //  the GRPC timerCancellable update
        timer: timerStart(ctx.timer.getTimeout()),
      });
      // 5. When finished, you have a connection to other node
      // The GRPCClient is ready to be used for requests
    } catch (e) {
      await nodeConnection.destroy({ timeout: destroyTimeout });
      // If the connection times out, re-throw this with a higher level nodes exception
      if (e instanceof grpcErrors.ErrorGRPCClientTimeout) {
        throw new nodesErrors.ErrorNodeConnectionTimeout(e.message, {
          cause: e,
        });
      }
      throw e;
    }
    // FIXME: we need a finally block here to do cleanup.
    // TODO: This is due to chicken or egg problem
    //  see if we can move to CreateDestroyStartStop to resolve this
    nodeConnection.client = client;
    logger.info(`Created ${this.name}`);
    return nodeConnection;
  }

  constructor({
    host,
    port,
    hostname,
    proxy,
    destroyCallback,
    logger,
  }: {
    host: Host;
    port: Port;
    hostname?: Hostname;
    proxy: Proxy;
    destroyCallback: () => Promise<void>;
    logger: Logger;
  }) {
    this.logger = logger;
    this.host = host;
    this.port = port;
    this.hostname = hostname;
    this.proxy = proxy;
    this.destroyCallback = destroyCallback;
  }

  public async destroy({
    timeout,
  }: {
    timeout?: number;
  } = {}) {
    this.logger.info(`Destroying ${this.constructor.name}`);
    if (
      this.client != null &&
      this.client[asyncInit.status] !== 'destroying' &&
      !this.client[asyncInit.destroyed]
    ) {
      await this.client.destroy({ timeout });
    }
    this.logger.debug(`${this.constructor.name} triggered destroyedCallback`);
    await this.destroyCallback();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Gets GRPCClient for this node connection
   */
  public getClient(): T {
    return this.client;
  }

  /**
   * Get the root certificate chain (i.e. the entire chain) of the node at the
   * end of this connection.
   * Ordered from newest to oldest.
   */
  @ready(new nodesErrors.ErrorNodeConnectionDestroyed())
  public getRootCertChain(): Array<Certificate> {
    const connInfo = this.proxy.getConnectionInfoByProxy(this.host, this.port);
    if (connInfo == null) {
      throw new nodesErrors.ErrorNodeConnectionInfoNotExist();
    }
    return connInfo.remoteCertificates;
  }
}

export default NodeConnection;
