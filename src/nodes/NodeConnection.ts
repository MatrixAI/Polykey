import type { ContextTimed } from '@matrixai/contexts';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { NodeId } from './types';
import type { Host, Hostname, Port, TLSConfig } from '../network/types';
import type { Certificate } from '../keys/types';
import type { ClientManifest } from '@matrixai/rpc';
import type {
  QUICSocket,
  ClientCryptoOps,
  QUICConnection,
} from '@matrixai/quic';
import type { ContextTimedInput } from '@matrixai/contexts/dist/types';
import type { X509Certificate } from '@peculiar/x509';
import Logger from '@matrixai/logger';
import { CreateDestroy } from '@matrixai/async-init/dist/CreateDestroy';
import { status } from '@matrixai/async-init';
import { timedCancellable, context } from '@matrixai/contexts/dist/decorators';
import { AbstractEvent, EventAll } from '@matrixai/events';
import {
  QUICClient,
  events as quicEvents,
  errors as quicErrors,
} from '@matrixai/quic';
import { RPCClient } from '@matrixai/rpc';
import { middleware as rpcUtilsMiddleware } from '@matrixai/rpc';
import { errors as contextErrors } from '@matrixai/contexts';
import * as nodesErrors from './errors';
import * as nodesEvents from './events';
import { ConnectionErrorReason, ConnectionErrorCode } from './types';
import * as networkUtils from '../network/utils';
import * as nodesUtils from '../nodes/utils';
import { never } from '../utils';
import config from '../config';

/**
 * Encapsulates the unidirectional client-side connection of one node to another.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- False positive for M
interface NodeConnection<M extends ClientManifest> extends CreateDestroy {}
@CreateDestroy({
  eventDestroy: nodesEvents.EventNodeConnectionDestroy,
  eventDestroyed: nodesEvents.EventNodeConnectionDestroyed,
})
class NodeConnection<M extends ClientManifest> {
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

  /**
   * Dispatches a `EventNodeConnectionClose` in response to any `NodeConnection`
   * error event. Will trigger destruction of the `NodeConnection` via the
   * `EventNodeConnectionError` -> `EventNodeConnectionClose` event path.
   */
  protected handleEventNodeConnectionError = (
    evt: nodesEvents.EventNodeConnectionError,
  ): void => {
    this.logger.debug(`NodeConnection error caused by ${evt.detail.message}`);
    this.dispatchEvent(new nodesEvents.EventNodeConnectionClose());
  };

  /**
   * Triggers the destruction of the `NodeConnection`. Since this is only in
   * response to an underlying problem or close it will force destroy.
   * Dispatched by the `EventNodeConnectionError` event as the
   * `EventNodeConnectionError` -> `EventNodeConnectionClose` event path.
   */
  protected handleEventNodeConnectionClose = async (
    _evt: nodesEvents.EventNodeConnectionClose,
  ): Promise<void> => {
    this.logger.debug(`close event triggering NodeConnection.destroy`);
    // This will trigger the destruction of this NodeConnection.
    if (this[status] !== 'destroying') {
      await this.destroy({ force: true });
    }
  };

  /**
   * Redispatches a `QUICStream` from a `EventQUICConnectionStream` event with
   * a `EventNodeConnectionStream` event. Should bubble upwards through the
   * `NodeConnectionManager`.
   */
  protected handleEventQUICConnectionStream = (
    evt: quicEvents.EventQUICConnectionStream,
  ): void => {
    // Re-dispatches the stream under a `EventNodeConnectionStream` event
    const quicStream = evt.detail;
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionStream({ detail: quicStream }),
    );
  };

  /**
   * Redispatches `QUICConnection` or  `QUICClient` error events as `NodeConnection` error events.
   * This should trigger the destruction of the `NodeConnection` through the
   * `EventNodeConnectionError` -> `EventNodeConnectionClose` event path.
   */
  protected handleEventQUICError = (
    evt: quicEvents.EventQUICConnectionError,
  ): void => {
    const err = new nodesErrors.ErrorNodeConnectionInternalError(
      evt.detail.message,
      {
        cause: evt.detail,
      },
    );
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionError({ detail: err }),
    );
  };

  protected handleEventQUICClientDestroyed = (
    _evt: quicEvents.EventQUICClientDestroyed,
  ) => {
    const err = new nodesErrors.ErrorNodeConnectionInternalError(
      'QUICClient destroyed unexpectedly',
    );
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionError({ detail: err }),
    );
  };

  protected handleEventQUICConnectionStopped = (
    _evt: quicEvents.EventQUICConnectionStopped,
  ) => {
    const err = new nodesErrors.ErrorNodeConnectionInternalError(
      'QUICClient stopped unexpectedly',
    );
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionError({ detail: err }),
    );
  };

  /**
   * Propagates all events from the `QUICClient` or `QUICConnection` upwards.
   * If the `QUICClient` exists then it is just registered to that, otherwise just
   * the `QUICConnection`.
   * Will only re-dispatch the event if it's an `AbstractEvent`.
   */
  protected handleEventAll = (evt: EventAll): void => {
    // This just propagates events upwards
    const event = evt.detail;
    if (event instanceof AbstractEvent) {
      // Clone and dispatch upwards
      this.dispatchEvent(event.clone());
    }
  };

  static createNodeConnection<M extends ClientManifest>(
    {
      targetNodeIds,
      targetHost,
      targetPort,
      targetHostname,
      tlsConfig,
      connectionKeepAliveIntervalTime,
      connectionKeepAliveTimeoutTime = config.defaultsSystem
        .nodesConnectionIdleTimeoutTime,
      quicSocket,
      manifest,
      logger,
    }: {
      targetNodeIds: Array<NodeId>;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      crypto: ClientCryptoOps;
      tlsConfig: TLSConfig;
      connectionKeepAliveIntervalTime?: number;
      connectionKeepAliveTimeoutTime?: number;
      quicSocket?: QUICSocket;
      manifest: M;
      logger?: Logger;
    },
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<NodeConnection<M>>;
  @timedCancellable(
    true,
    config.defaultsSystem.nodesConnectionConnectTimeoutTime,
  )
  static async createNodeConnection<M extends ClientManifest>(
    {
      targetNodeIds,
      targetHost,
      targetPort,
      targetHostname,
      crypto,
      tlsConfig,
      manifest,
      connectionKeepAliveIntervalTime,
      connectionKeepAliveTimeoutTime = config.defaultsSystem
        .nodesConnectionIdleTimeoutTime,
      quicSocket,
      logger = new Logger(this.name),
    }: {
      targetNodeIds: Array<NodeId>;
      targetHost: Host;
      targetPort: Port;
      targetHostname?: Hostname;
      crypto: ClientCryptoOps;
      tlsConfig: TLSConfig;
      manifest: M;
      connectionKeepAliveIntervalTime?: number;
      connectionKeepAliveTimeoutTime?: number;
      quicSocket: QUICSocket;
      logger?: Logger;
    },
    @context ctx: ContextTimed,
  ): Promise<NodeConnection<M>> {
    logger.info(`Creating ${this.name}`);
    // Checking if attempting to connect to a wildcard IP
    if (networkUtils.isHostWildcard(targetHost)) {
      throw new nodesErrors.ErrorNodeConnectionHostWildcard();
    }
    // FIXME: support link-local addresses like `fe80::1cc7:8829:3d67:240d%wlp0s20f3`, QUIC currently hangs main thread when attempting a connection to this targetHost
    if (targetHost.startsWith('fe80') || targetHost.includes('%')) {
      throw new nodesErrors.ErrorNodeConnectionHostLinkLocal();
    }
    let validatedNodeId: NodeId | undefined;
    let quicClient: QUICClient;
    try {
      quicClient = await QUICClient.createQUICClient(
        {
          host: targetHost,
          port: targetPort,
          socket: quicSocket,
          config: {
            keepAliveIntervalTime: connectionKeepAliveIntervalTime,
            maxIdleTimeout: connectionKeepAliveTimeoutTime,
            verifyPeer: true,
            verifyCallback: async (certPEMs) => {
              const result = await networkUtils.verifyServerCertificateChain(
                targetNodeIds,
                certPEMs,
              );
              if (result.result === 'success') {
                validatedNodeId = result.nodeId;
                return;
              } else {
                return result.value;
              }
            },
            ca: undefined,
            key: tlsConfig.keyPrivatePem,
            cert: tlsConfig.certChainPem,
          },
          crypto: {
            ops: crypto,
          },
          reasonToCode: nodesUtils.reasonToCode,
          codeToReason: nodesUtils.codeToReason,
          logger: logger.getChild(QUICClient.name),
        },
        ctx,
      );
    } catch (e) {
      if (
        e instanceof contextErrors.ErrorContextsTimedTimeOut ||
        e instanceof quicErrors.ErrorQUICClientCreateTimeout ||
        e instanceof quicErrors.ErrorQUICConnectionStartTimeout ||
        e instanceof quicErrors.ErrorQUICConnectionIdleTimeout
      ) {
        throw new nodesErrors.ErrorNodeConnectionTimeout(
          `Timed out after ${ctx.timer.delay}ms`,
          { cause: e },
        );
      }
      throw e;
    }
    const quicConnection = quicClient.connection;
    // FIXME: right now I'm not sure it's possible for streams to be emitted while setting up here.
    //  If we get any while setting up they need to be re-emitted after set up. Otherwise cleaned up.
    const throwFunction = () =>
      never('We should never get connections before setting up handling');
    quicConnection.addEventListener(
      quicEvents.EventQUICConnectionStream.name,
      throwFunction,
    );
    const rpcClient = new RPCClient<M>({
      manifest,
      middlewareFactory: rpcUtilsMiddleware.defaultClientMiddlewareWrapper(),
      streamFactory: async () => {
        return quicConnection.newStream();
      },
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
    if (validatedNodeId == null) never();
    // Obtaining remote node ID from certificate chain. It should always exist in the chain if validated.
    //  This may de different from the NodeId we validated it as if it renewed at some point.
    const connection = quicClient.connection;
    // Remote certificate information should always be available here due to custom verification
    const { nodeId, certChain } = nodesUtils.parseRemoteCertsChain(
      connection.getRemoteCertsChain(),
    );

    const newLogger = logger.getParent() ?? new Logger(this.name);
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
      quicConnection,
      rpcClient,
      logger: newLogger.getChild(
        `${this.name} [${nodesUtils.encodeNodeId(nodeId)}@${
          quicConnection.remoteHost
        }:${quicConnection.remotePort}]`,
      ),
    });
    // TODO: remove this later based on testing
    quicConnection.removeEventListener(
      quicEvents.EventQUICConnectionStream.name,
      throwFunction,
    );
    // All events are handled via the `QUICClient`, any underlying `QUICStream`
    // or `QUICConnection` events are expected to be emitted through the
    // `QUICClient`
    nodeConnection.addEventListener(
      nodesEvents.EventNodeConnectionError.name,
      nodeConnection.handleEventNodeConnectionError,
    );
    nodeConnection.addEventListener(
      nodesEvents.EventNodeConnectionClose.name,
      nodeConnection.handleEventNodeConnectionClose,
    );
    quicClient.addEventListener(
      quicEvents.EventQUICConnectionStream.name,
      nodeConnection.handleEventQUICConnectionStream,
    );
    quicClient.addEventListener(
      quicEvents.EventQUICClientError.name,
      nodeConnection.handleEventQUICError,
    );
    quicClient.addEventListener(
      quicEvents.EventQUICClientDestroyed.name,
      nodeConnection.handleEventQUICClientDestroyed,
    );
    quicClient.addEventListener(EventAll.name, nodeConnection.handleEventAll);
    logger.info(`Created ${this.name}`);
    return nodeConnection;
  }

  static createNodeConnectionReverse<M extends ClientManifest>({
    certChain,
    nodeId,
    quicConnection,
    manifest,
    logger = new Logger(this.name),
  }: {
    certChain: Array<Certificate>;
    nodeId: NodeId;
    quicConnection: QUICConnection;
    manifest: M;
    logger?: Logger;
  }): NodeConnection<M> {
    logger.info(`Creating ${this.name}`);
    // Creating RPCClient
    const rpcClient = new RPCClient<M>({
      manifest,
      middlewareFactory: rpcUtilsMiddleware.defaultClientMiddlewareWrapper(),
      streamFactory: async (_ctx) => {
        return quicConnection.newStream();
      },
      toError: networkUtils.toError,
      logger: logger.getChild(RPCClient.name),
    });
    // Creating NodeConnection
    const nodeConnection = new this<M>({
      validatedNodeId: nodeId,
      nodeId: nodeId,
      localHost: quicConnection.localHost as unknown as Host,
      localPort: quicConnection.localPort as unknown as Port,
      host: quicConnection.remoteHost as unknown as Host,
      port: quicConnection.remotePort as unknown as Port,
      certChain,
      // Hostname and client are not available on reverse connections
      hostname: undefined,
      quicClient: undefined,
      quicConnection,
      rpcClient,
      logger,
    });
    // All events are handled via the `QUICConnection`, any underlying
    // `QUICStream` events are expected to be emitted through the `QUICConnection`.
    nodeConnection.addEventListener(
      nodesEvents.EventNodeConnectionError.name,
      nodeConnection.handleEventNodeConnectionError,
    );
    nodeConnection.addEventListener(
      nodesEvents.EventNodeConnectionClose.name,
      nodeConnection.handleEventNodeConnectionClose,
    );
    quicConnection.addEventListener(
      quicEvents.EventQUICConnectionStream.name,
      nodeConnection.handleEventQUICConnectionStream,
    );
    quicConnection.addEventListener(
      quicEvents.EventQUICConnectionError.name,
      nodeConnection.handleEventQUICError,
    );
    quicConnection.addEventListener(
      quicEvents.EventQUICConnectionStopped.name,
      nodeConnection.handleEventQUICConnectionStopped,
    );
    quicConnection.addEventListener(
      EventAll.name,
      nodeConnection.handleEventAll,
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
            isApp: true,
            errorCode: ConnectionErrorCode.ForceClose,
            reason: Buffer.from(ConnectionErrorReason.ForceClose),
            force,
          }
        : {},
    );
    this.logger.debug(`${this.constructor.name} triggered destroyed event`);
    // Removing all event listeners
    this.addEventListener(
      nodesEvents.EventNodeConnectionError.name,
      this.handleEventNodeConnectionError,
    );
    this.addEventListener(
      nodesEvents.EventNodeConnectionClose.name,
      this.handleEventNodeConnectionClose,
    );
    // If the client exists then it was all registered to that,
    // otherwise the connection
    const quicClientOrConnection = this.quicClient ?? this.quicConnection;
    quicClientOrConnection.addEventListener(
      quicEvents.EventQUICConnectionStream.name,
      this.handleEventQUICConnectionStream,
    );
    quicClientOrConnection.addEventListener(
      quicEvents.EventQUICConnectionError.name,
      this.handleEventQUICError,
    );
    quicClientOrConnection.addEventListener(
      quicEvents.EventQUICClientDestroyed.name,
      this.handleEventQUICClientDestroyed,
    );
    quicClientOrConnection.addEventListener(
      quicEvents.EventQUICConnectionStopped.name,
      this.handleEventQUICConnectionStopped,
    );
    quicClientOrConnection.addEventListener(
      quicEvents.EventQUICClientError.name,
      this.handleEventQUICError,
    );
    quicClientOrConnection.addEventListener(EventAll.name, this.handleEventAll);
    this.dispatchEvent(new nodesEvents.EventNodeConnectionDestroy());
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
