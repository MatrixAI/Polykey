import type { ResourceAcquire } from '@matrixai/resources';
import type { ContextTimed, ContextTimedInput } from '@matrixai/contexts';
import type { QUICConnection } from '@matrixai/quic';
import type {
  ClientManifest,
  JSONRPCRequest,
  JSONRPCResponse,
  ServerManifest,
} from '@matrixai/rpc';
import type {
  AuthenticateNetworkForwardCallback,
  AuthenticateNetworkReverseCallback,
  NodeId,
  NodeIdString,
} from './types.js';
import type {
  NodesAuthenticateConnectionMessage,
  SuccessMessage,
} from './agent/types.js';
import type { AgentClientManifestNodeConnectionManager } from './agent/callers/index.js';
import type KeyRing from '../keys/KeyRing.js';
import type { CertificatePEM } from '../keys/types.js';
import type {
  ConnectionData,
  Host,
  Hostname,
  Port,
  TLSConfig,
} from '../network/types.js';
import type { JSONValue } from '../types.js';
import { TransformStream } from 'stream/web';
import {
  events as quicEvents,
  QUICServer,
  QUICSocket,
  utils as quicUtils,
} from '@matrixai/quic';
import { withF } from '@matrixai/resources';
import {
  errors as rpcErrors,
  middleware as rpcMiddleware,
  RPCServer,
} from '@matrixai/rpc';
import Logger from '@matrixai/logger';
import { Timer } from '@matrixai/timer';
import { IdInternal } from '@matrixai/id';
import { startStop } from '@matrixai/async-init';
import { AbstractEvent, EventAll } from '@matrixai/events';
import { decorators } from '@matrixai/contexts';
import { Semaphore } from '@matrixai/async-locks';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import NodeConnection from './NodeConnection.js';
import * as nodesUtils from './utils.js';
import * as nodesErrors from './errors.js';
import * as nodesEvents from './events.js';
import * as agentUtils from './agent/utils.js';
import * as keysUtils from '../keys/utils/index.js';
import * as networkUtils from '../network/utils.js';
import * as utils from '../utils/index.js';
import RateLimiter from '../utils/ratelimiter/RateLimiter.js';
import config from '../config.js';

type ConnectionAndTimer<Manifest extends ClientManifest> = {
  connection: NodeConnection<Manifest>;
  timer: Timer | null;
  usageCount: number;
};

enum AuthenticatingState {
  PENDING = 1,
  SUCCESS = 2,
  FAIL = 3,
}

type ConnectionsEntry<Manifest extends ClientManifest> = {
  activeConnection: string;
  connections: Record<string, ConnectionAndTimer<Manifest>>;
  // This tracks the authentication state machine
  authenticatedForward: AuthenticatingState;
  authenticatedReverse: AuthenticatingState;
  authenticateComplete: boolean;
  authenticatedP: Promise<void>;
  authenticatedResolveP: (value: void) => void;
  authenticatedRejectP: (reason?: Error) => void;
};

type ConnectionInfo = {
  host: Host;
  hostName: Hostname | undefined;
  port: Port;
  timeout: number | undefined;
  primary: boolean;
};

type ActiveConnectionsInfo = {
  nodeId: NodeId;
  connections: Record<string, ConnectionInfo>;
};

const abortPendingConnectionsReason = Symbol(
  'abort pending connections reason',
);

const timerCancellationReason = Symbol('timer cancellation reason');

const activePunchCancellationReason = Symbol(
  'active punch cancellation reason',
);

const activeForwardAuthenticateCancellationReason = Symbol(
  'active forward authenticate cancellation reason',
);

const rpcMethodsWhitelist = ['nodesAuthenticateConnection'];

/**
 * NodeConnectionManager is a server that manages all node connections.
 * It manages both initiated and received connections.
 *
 * It acts like a phone call system.
 * It can maintain multiple calls to other nodes.
 * There's no guarantee that we need to make it.
 *
 * Node connections make use of the QUIC protocol.
 * The NodeConnectionManager encapsulates `QUICServer`.
 * While the NodeConnection encapsulates `QUICClient`.
 */
interface NodeConnectionManager<
  // eslint-disable-next-line
  Manifest extends AgentClientManifestNodeConnectionManager,
> extends startStop.StartStop {}
@startStop.StartStop({
  eventStart: nodesEvents.EventNodeConnectionManagerStart,
  eventStarted: nodesEvents.EventNodeConnectionManagerStarted,
  eventStop: nodesEvents.EventNodeConnectionManagerStop,
  eventStopped: nodesEvents.EventNodeConnectionManagerStopped,
})
class NodeConnectionManager<
  Manifest extends AgentClientManifestNodeConnectionManager,
> {
  /**
   * Alpha constant for kademlia
   * The number of the closest nodes to contact initially
   */
  public readonly connectionFindConcurrencyLimit: number;

  /**
   * Default limit used when getting the closest active connections of a node.
   * Defaults to the `nodesGraphBucketLimit`
   */
  public readonly connectionGetClosestLimit: number;

  /**
   * Time used to find a node using `findNodeLocal`.
   */
  public readonly connectionFindLocalTimeoutTime: number;

  /**
   * Minimum time to wait to garbage collect un-used node connections.
   */
  public readonly connectionIdleTimeoutTimeMin: number;

  /**
   * Scaling factor to apply to Idle timeout
   */
  public readonly connectionIdleTimeoutTimeScale: number;

  /**
   * Time used to establish `NodeConnection`
   */
  public readonly connectionConnectTimeoutTime: number;

  /**
   * Time to keep alive node connection.
   */
  public readonly connectionKeepAliveTimeoutTime: number;

  /**
   * Time interval for sending keep alive messages.
   */
  public readonly connectionKeepAliveIntervalTime: number;

  /**
   * Initial delay between punch packets, delay doubles each attempt.
   */
  public readonly connectionHolePunchIntervalTime: number;

  /**
   * Total number of active bidirectional streams that can be created
   */
  public readonly connectionInitialMaxStreamsBidi: number;

  /**
   * Total number of active unidirectional streams that can be created
   */
  public readonly connectionInitialMaxStreamsUni: number;

  /**
   * Max parse buffer size before RPC parser throws a parse error.
   */
  public readonly rpcParserBufferSize: number;

  /**
   * Default timeout for RPC handlers
   */
  public readonly rpcCallTimeoutTime: number;

  /**
   * Used to track active hole punching attempts.
   * Attempts are mapped by a string of `${host}:${port}`.
   * This is used to coalesce attempts to a target host and port.
   * Used to cancel and await punch attempts when stopping to prevent orphaned promises.
   */
  protected activeHolePunchPs = new Map<string, PromiseCancellable<void>>();
  /**
   *  Used to rate limit hole punch attempts per IP Address.
   *  We use a semaphore to track the number of active hole punch attempts to that address.
   *  We Use a semaphore here to allow a limit of 3 attempts per host.
   *  To allow concurrent attempts to the same host while limiting the number of different ports.
   *  This is mainly used to limit requests to a single target host.
   */
  protected activeHolePunchAddresses = new Map<string, Semaphore>();
  /**
   * Used track the active `nodesConnectionSignalFinal` attempts and prevent orphaned promises.
   * Used to cancel and await the active `nodesConnectionSignalFinal` when stopping.
   */
  protected activeSignalFinalPs = new Set<Promise<void>>();
  /**
   * Used to limit signalling requests on a per-requester basis.
   * This is mainly used to limit a single source node making too many requests through a relay.
   */
  protected rateLimiter = new RateLimiter(60000, 20, 10, 1);

  /**
   * Used to track the active authentication RPC calls
   */
  protected activeForwardAuthenticateCalls = new Map<
    string,
    PromiseCancellable<void>
  >();

  /**
   * Callback used to generate authentication data when making the authentication call
   */
  protected authenticateNetworkForwardCallback: AuthenticateNetworkForwardCallback;
  /**
   * Callback used to authenticate the peer when processing an authentication request from the peer
   */
  protected authenticateNetworkReverseCallback: AuthenticateNetworkReverseCallback;

  protected logger: Logger;
  protected keyRing: KeyRing;
  protected tlsConfig: TLSConfig;

  protected quicSocket: QUICSocket;
  protected quicServer: QUICServer;

  /**
   * Data structure to store all NodeConnections. If a connection to a node `N` does
   * not exist, no entry for `N` will exist in the map. Alternatively, if a
   * connection is currently being instantiated by some thread, an entry will
   * exist in the map, but only with the lock (no connection object). Once a
   * connection is instantiated, the entry in the map is updated to include the
   * connection object.
   * A nodeIdString is used for the key here since
   * NodeIds can't be used to properly retrieve a value from the map.
   */
  protected connections: Map<NodeIdString, ConnectionsEntry<Manifest>> =
    new Map();

  protected rpcServer: RPCServer;
  protected rpcClientManifest: Manifest;

  /**
   * Dispatches a `EventNodeConnectionManagerClose` in response to any `NodeConnectionManager`
   * error event. Will trigger stop of the `NodeConnectionManager` via the
   * `EventNodeConnectionManagerError` -> `EventNodeConnectionManagerClose` event path.
   */
  protected handleEventNodeConnectionManagerError = (
    evt: nodesEvents.EventNodeConnectionManagerError,
  ) => {
    this.logger.warn(
      `NodeConnectionManager error caused by ${evt.detail.message}`,
    );
    this.dispatchEvent(new nodesEvents.EventNodeConnectionManagerClose());
  };

  /**
   * Triggers the destruction of the `NodeConnectionManager`. Since this is only in
   * response to an underlying problem or close it will force destroy.
   * Dispatched by the `EventNodeConnectionManagerError` event as the
   * `EventNodeConnectionManagerError` -> `EventNodeConnectionManagerClose` event path.
   */
  protected handleEventNodeConnectionManagerClose = async (
    _evt: nodesEvents.EventNodeConnectionManagerClose,
  ) => {
    this.logger.debug(`close event triggering NodeConnectionManager.stop`);
    if (this[startStop.running] && this[startStop.status] !== 'stopping') {
      await this.stop();
    }
  };

  protected handleEventNodeConnectionStream = (
    evt: nodesEvents.EventNodeConnectionStream,
  ) => {
    if (evt.target == null) utils.never('target should be defined here');
    const nodeConnection = evt.target as NodeConnection<Manifest>;
    const connectionId = nodeConnection.connectionId;
    const nodeId = nodeConnection.validatedNodeId as NodeId;
    const nodeIdString = nodeId.toString() as NodeIdString;
    const stream = evt.detail;
    this.rpcServer.handleStream(stream);
    const connectionsEntry = this.connections.get(nodeIdString);
    if (connectionsEntry == null) utils.never('should have a connection entry');
    const connectionAndTimer = connectionsEntry.connections[connectionId];
    if (connectionAndTimer == null) utils.never('should have a connection');
    connectionAndTimer.usageCount += 1;
    connectionAndTimer.timer?.cancel(timerCancellationReason);
    connectionAndTimer.timer = null;
    void stream.closedP.finally(() => {
      connectionAndTimer.usageCount -= 1;
      if (connectionAndTimer.usageCount <= 0) {
        const delay = this.getStickyTimeoutValue(
          nodeId,
          connectionsEntry.activeConnection ===
            connectionAndTimer.connection.connectionId,
        );
        this.logger.debug(
          `creating TTL for ${nodesUtils.encodeNodeId(nodeId)}`,
        );
        connectionAndTimer.timer = new Timer({
          handler: async () =>
            await this.destroyConnection(nodeId, false, connectionId),
          delay,
        });
        // Prevent unhandled exceptions when cancelling
        connectionAndTimer.timer.catch(() => {});
      }
    });
  };

  protected handleEventNodeConnectionDestroyed = async (
    evt: nodesEvents.EventNodeConnectionDestroyed,
  ) => {
    if (evt.target == null) utils.never('target should be defined here');
    const nodeConnection = evt.target as NodeConnection<Manifest>;
    const nodeId = nodeConnection.validatedNodeId as NodeId;
    const connectionId = nodeConnection.connectionId;
    await this.destroyConnection(nodeId, true, connectionId);
    nodeConnection.removeEventListener(
      nodesEvents.EventNodeConnectionStream.name,
      this.handleEventNodeConnectionStream,
    );
    nodeConnection.removeEventListener(EventAll.name, this.handleEventAll);
  };

  /**
   * Redispatches `QUICSocket` or `QUICServer` error events as `NodeConnectionManager` error events.
   * This should trigger the destruction of the `NodeConnection` through the
   * `EventNodeConnectionError` -> `EventNodeConnectionClose` event path.
   */
  protected handleEventQUICError = (
    evt: quicEvents.EventQUICSocketError,
  ): void => {
    const err = new nodesErrors.ErrorNodeConnectionManagerInternalError(
      undefined,
      { cause: evt.detail },
    );
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionManagerError({ detail: err }),
    );
  };

  /**
   * Handle unexpected stoppage of the QUICSocket. Not expected to happen
   * without error, but we have it just in case.
   */
  protected handleEventQUICSocketStopped = (
    _evt: quicEvents.EventQUICSocketStopped,
  ): void => {
    const err = new nodesErrors.ErrorNodeConnectionManagerInternalError(
      'QUICSocket stopped unexpectedly',
    );
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionManagerError({ detail: err }),
    );
  };

  /**
   * Handle unexpected stoppage of the QUICServer. Not expected to happen
   * without error, but we have it just in case.
   */
  protected handleEventQUICServerStopped = (
    _evt: quicEvents.EventQUICServerStopped,
  ): void => {
    const err = new nodesErrors.ErrorNodeConnectionManagerInternalError(
      'QUICServer stopped unexpectedly',
    );
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionManagerError({ detail: err }),
    );
  };

  /**
   * Handles `EventQUICServerConnection` events. These are reverser or server
   * peer initiated connections that needs to be handled and added to the
   * connection map.
   */
  protected handleEventQUICServerConnection = (
    evt: quicEvents.EventQUICServerConnection,
  ): void => {
    this.handleConnectionReverse(evt.detail);
  };

  /**
   * Handles all events and redispatches them upwards
   */
  protected handleEventAll = (evt: EventAll) => {
    const event = evt.detail;
    if (event instanceof AbstractEvent) {
      this.dispatchEvent(event.clone());
    }
  };

  /**
   * Constructs the `NodeConnectionManager`.
   */
  public constructor({
    keyRing,
    tlsConfig,
    rpcClientManifest,
    connectionFindConcurrencyLimit = config.defaultsSystem
      .nodesConnectionFindConcurrencyLimit,
    connectionGetClosestLimit = config.defaultsSystem.nodesGraphBucketLimit,
    connectionFindLocalTimeoutTime = config.defaultsSystem
      .nodesConnectionFindLocalTimeoutTime,
    connectionIdleTimeoutTimeMin = config.defaultsSystem
      .nodesConnectionIdleTimeoutTimeMin,
    connectionIdleTimeoutTimeScale = config.defaultsSystem
      .nodesConnectionIdleTimeoutTimeScale,
    connectionConnectTimeoutTime = config.defaultsSystem
      .nodesConnectionConnectTimeoutTime,
    connectionKeepAliveTimeoutTime = config.defaultsSystem
      .nodesConnectionKeepAliveTimeoutTime,
    connectionKeepAliveIntervalTime = config.defaultsSystem
      .nodesConnectionKeepAliveIntervalTime,
    connectionHolePunchIntervalTime = config.defaultsSystem
      .nodesConnectionHolePunchIntervalTime,
    connectionInitialMaxStreamsBidi = config.defaultsSystem
      .nodesConnectionInitialMaxStreamsBidi,
    connectionInitialMaxStreamsUni = config.defaultsSystem
      .nodesConnectionInitialMaxStreamsUni,
    rpcParserBufferSize = config.defaultsSystem.rpcParserBufferSize,
    rpcCallTimeoutTime = config.defaultsSystem.rpcCallTimeoutTime,
    authenticateNetworkForwardCallback = nodesUtils.nodesAuthenticateConnectionForwardDefault,
    authenticateNetworkReverseCallback = nodesUtils.nodesAuthenticateConnectionReverseDefault,
    logger,
  }: {
    keyRing: KeyRing;
    tlsConfig: TLSConfig;
    rpcClientManifest: Manifest;
    connectionFindConcurrencyLimit?: number;
    connectionGetClosestLimit?: number;
    connectionFindLocalTimeoutTime?: number;
    connectionIdleTimeoutTimeMin?: number;
    connectionIdleTimeoutTimeScale?: number;
    connectionConnectTimeoutTime?: number;
    connectionKeepAliveTimeoutTime?: number;
    connectionKeepAliveIntervalTime?: number;
    connectionHolePunchIntervalTime?: number;
    connectionInitialMaxStreamsBidi?: number;
    connectionInitialMaxStreamsUni?: number;
    rpcParserBufferSize?: number;
    rpcCallTimeoutTime?: number;
    authenticateNetworkForwardCallback?: AuthenticateNetworkForwardCallback;
    authenticateNetworkReverseCallback?: AuthenticateNetworkReverseCallback;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.keyRing = keyRing;
    this.tlsConfig = tlsConfig;
    this.rpcClientManifest = rpcClientManifest;
    this.connectionFindConcurrencyLimit = connectionFindConcurrencyLimit;
    this.connectionGetClosestLimit = connectionGetClosestLimit;
    this.connectionFindLocalTimeoutTime = connectionFindLocalTimeoutTime;
    this.connectionIdleTimeoutTimeMin = connectionIdleTimeoutTimeMin;
    this.connectionIdleTimeoutTimeScale = connectionIdleTimeoutTimeScale;
    this.connectionConnectTimeoutTime = connectionConnectTimeoutTime;
    this.connectionKeepAliveTimeoutTime = connectionKeepAliveTimeoutTime;
    this.connectionKeepAliveIntervalTime = connectionKeepAliveIntervalTime;
    this.connectionHolePunchIntervalTime = connectionHolePunchIntervalTime;
    this.connectionInitialMaxStreamsBidi = connectionInitialMaxStreamsBidi;
    this.connectionInitialMaxStreamsUni = connectionInitialMaxStreamsUni;
    this.rpcParserBufferSize = rpcParserBufferSize;
    this.rpcCallTimeoutTime = rpcCallTimeoutTime;
    this.authenticateNetworkForwardCallback =
      authenticateNetworkForwardCallback;
    this.authenticateNetworkReverseCallback =
      authenticateNetworkReverseCallback;

    const quicSocket = new QUICSocket({
      resolveHostname: () => {
        utils.never(
          '"NodeConnectionManager" must resolve all hostnames before it reaches "QUICSocket"',
        );
      },
      logger: this.logger.getChild(QUICSocket.name),
    });
    const quicServer = new QUICServer({
      crypto: nodesUtils.quicServerCrypto,
      config: {
        maxIdleTimeout: connectionKeepAliveTimeoutTime,
        keepAliveIntervalTime: connectionKeepAliveIntervalTime,
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        verifyPeer: true,
        verifyCallback: nodesUtils.verifyClientCertificateChain,
        initialMaxStreamsBidi: 1000,
        initialMaxStreamsUni: 0,
      },
      socket: quicSocket,
      reasonToCode: nodesUtils.reasonToCode,
      codeToReason: nodesUtils.codeToReason,
      minIdleTimeout: connectionConnectTimeoutTime,
      logger: this.logger.getChild(QUICServer.name),
    });
    const rpcServer = new RPCServer({
      middlewareFactory: rpcMiddleware.defaultServerMiddlewareWrapper(
        this.authenticationMiddlewareClient,
        this.rpcParserBufferSize,
      ),
      fromError: networkUtils.fromError,
      timeoutTime: this.rpcCallTimeoutTime,
      logger: this.logger.getChild(RPCServer.name),
    });
    this.quicSocket = quicSocket;
    this.quicServer = quicServer;
    this.rpcServer = rpcServer;
  }

  /**
   * Get the host that node connection manager is bound to.
   */
  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public get host(): Host {
    return this.quicSocket.host as unknown as Host;
  }

  /**
   * Get the port that node connection manager is bound to.
   */
  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public get port(): Port {
    return this.quicSocket.port as unknown as Port;
  }

  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public get type(): 'ipv4' | 'ipv6' | 'ipv4&ipv6' {
    return this.quicSocket.type;
  }

  public async start({
    agentService,
    host = '::' as Host,
    port = 0 as Port,
    reuseAddr,
    ipv6Only,
  }: {
    agentService: ServerManifest;
    host?: Host;
    port?: Port;
    reuseAddr?: boolean;
    ipv6Only?: boolean;
  }) {
    const address = networkUtils.buildAddress(host, port);
    this.logger.info(`Start ${this.constructor.name} on ${address}`);

    // We should expect that seed nodes are already in the node manager
    // It should not be managed here!
    await this.rpcServer.start({ manifest: agentService });
    // Setting up QUICSocket
    await this.quicSocket.start({
      host,
      port,
      reuseAddr,
      ipv6Only,
    });

    this.quicSocket.addEventListener(
      quicEvents.EventQUICSocketError.name,
      this.handleEventQUICError,
    );
    this.quicSocket.addEventListener(
      quicEvents.EventQUICSocketStopped.name,
      this.handleEventQUICSocketStopped,
    );
    this.quicSocket.addEventListener(EventAll.name, this.handleEventAll);

    // QUICServer will simply re-use the shared `QUICSocket`
    await this.quicServer.start({
      host,
      port,
      reuseAddr,
      ipv6Only,
    });
    this.quicServer.addEventListener(
      quicEvents.EventQUICServerError.name,
      this.handleEventQUICError,
    );
    this.quicServer.addEventListener(
      quicEvents.EventQUICServerStopped.name,
      this.handleEventQUICServerStopped,
    );
    this.quicServer.addEventListener(
      quicEvents.EventQUICServerConnection.name,
      this.handleEventQUICServerConnection,
    );
    this.quicSocket.addEventListener(EventAll.name, this.handleEventAll);
    this.rateLimiter.startRefillInterval();

    await this.rpcServer.start({ manifest: agentService });

    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop({
    force = false,
  }: {
    force?: boolean;
  } = {}) {
    this.logger.info(`Stop ${this.constructor.name}`);
    this.rateLimiter.stop();

    this.removeEventListener(
      nodesEvents.EventNodeConnectionManagerError.name,
      this.handleEventNodeConnectionManagerError,
    );
    this.removeEventListener(
      nodesEvents.EventNodeConnectionManagerClose.name,
      this.handleEventNodeConnectionManagerClose,
    );
    this.quicSocket.removeEventListener(
      quicEvents.EventQUICSocketError.name,
      this.handleEventQUICError,
    );
    this.quicSocket.removeEventListener(
      quicEvents.EventQUICSocketStopped.name,
      this.handleEventQUICSocketStopped,
    );
    this.quicSocket.removeEventListener(EventAll.name, this.handleEventAll);
    this.quicServer.removeEventListener(
      quicEvents.EventQUICServerError.name,
      this.handleEventQUICError,
    );
    this.quicServer.removeEventListener(
      quicEvents.EventQUICServerStopped.name,
      this.handleEventQUICServerStopped,
    );
    this.quicServer.removeEventListener(
      quicEvents.EventQUICServerConnection.name,
      this.handleEventQUICServerConnection,
    );
    this.quicSocket.removeEventListener(EventAll.name, this.handleEventAll);

    const destroyConnectionPs: Array<Promise<void>> = [];
    const cancelSignallingPs: Array<PromiseCancellable<void> | Promise<void>> =
      [];
    const authenticationCancelPs: Array<Promise<void>> = [];
    const cancelAuthenticationPs: Array<PromiseCancellable<void>> = [];
    const cancelReason = new nodesErrors.ErrorNodeConnectionManagerStopping();
    for (const [nodeIdString] of this.connections) {
      this.authenticateCancel(nodeIdString, cancelReason);
      const destroyP = this.destroyConnection(
        IdInternal.fromString<NodeId>(nodeIdString),
        force,
      );
      destroyConnectionPs.push(destroyP);
    }
    for (const [, activePunch] of this.activeHolePunchPs) {
      cancelSignallingPs.push(activePunch);
      activePunch.cancel(activePunchCancellationReason);
    }
    for (const activeSignal of this.activeSignalFinalPs) {
      cancelSignallingPs.push(activeSignal);
    }
    for (const activeForwardAuthenticateCall of this.activeForwardAuthenticateCalls.values()) {
      cancelAuthenticationPs.push(activeForwardAuthenticateCall);
      activeForwardAuthenticateCall.cancel(
        activeForwardAuthenticateCancellationReason,
      );
    }
    await Promise.all(destroyConnectionPs);
    await Promise.allSettled(cancelSignallingPs);
    await Promise.allSettled(authenticationCancelPs);
    await Promise.allSettled(cancelAuthenticationPs);
    await this.quicServer.stop({ force: true });
    await this.quicSocket.stop({ force: true });
    await this.rpcServer.stop({ force: true });
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * This is the internal acquireConnection for using connections without
   * authentication. For usage with withF, to acquire a connection. To wait for
   * authentication, use {@link acquireConnection}.
   *
   * This unique acquire function structure of returning the ResourceAcquire
   * itself is such that we can pass targetNodeId as a parameter (as opposed to
   * an acquire function with no parameters).
   *
   * @param targetNodeId Id of target node to communicate with
   * @returns ResourceAcquire Resource API for use in with contexts
   */
  protected acquireConnectionInternal(
    targetNodeId: NodeId,
  ): ResourceAcquire<NodeConnection<Manifest>> {
    if (this.keyRing.getNodeId().equals(targetNodeId)) {
      this.logger.warn('Attempting connection to our own NodeId');
    }
    return async () => {
      this.logger.debug(
        `acquiring connection to node ${nodesUtils.encodeNodeId(targetNodeId)}`,
      );
      const targetNodeIdString = targetNodeId.toString() as NodeIdString;
      const connectionsEntry = this.connections.get(targetNodeIdString);
      if (connectionsEntry == null) {
        throw new nodesErrors.ErrorNodeConnectionManagerConnectionNotFound();
      }
      const connectionAndTimer =
        connectionsEntry.connections[connectionsEntry.activeConnection];
      if (connectionAndTimer == null) {
        utils.never('ConnectionAndTimer should exist');
      }

      // Increment usage count, and cancel timer
      connectionAndTimer.usageCount += 1;
      connectionAndTimer.timer?.cancel(timerCancellationReason);
      connectionAndTimer.timer = null;
      // Return tuple of [ResourceRelease, Resource]
      return [
        async () => {
          // Decrement usage count and set up TTL if needed.
          // We're only setting up TTLs for non-seed nodes.
          connectionAndTimer.usageCount -= 1;
          if (connectionAndTimer.usageCount <= 0) {
            this.logger.debug(
              `creating TTL for ${nodesUtils.encodeNodeId(targetNodeId)}`,
            );

            const delay = this.getStickyTimeoutValue(
              targetNodeId,
              connectionsEntry.activeConnection ===
                connectionAndTimer.connection.connectionId,
            );
            connectionAndTimer.timer = new Timer({
              handler: async () => {
                await this.destroyConnection(
                  targetNodeId,
                  false,
                  connectionAndTimer.connection.connectionId,
                );
              },
              delay,
            });
            // Prevent unhandled exceptions when cancelling
            connectionAndTimer.timer.catch(() => {});
          }
        },
        connectionAndTimer.connection,
      ];
    };
  }

  /**
   * This unique acquire function structure of returning the ResourceAcquire
   * itself is such that we can pass targetNodeId as a parameter (as opposed to
   * an acquire function with no parameters). It waits for the connection to be
   * authenticated, otherwise throws an error. See {@link acquireConnectionInternal}
   * to connect to a node without waiting for authentication.
   *
   * If a connection exists but is not authenticated, the authentication is
   * attempted. Authentication is reattempted if it has failed before but
   * another attmept is being made to connect to a node.
   *
   * For usage with withF, to acquire a connection.
   *
   * @param targetNodeId Id of target node to communicate with
   * @param ctx
   * @returns ResourceAcquire Resource API for use in with contexts
   */
  public acquireConnection(
    targetNodeId: NodeId,
    ctx: ContextTimed,
  ): ResourceAcquire<NodeConnection<Manifest>> {
    return async () => {
      await this.isAuthenticatedP(targetNodeId, ctx);
      return await this.acquireConnectionInternal(targetNodeId)();
    };
  }

  /**
   * Perform some function on another node over the network with a connection.
   * Will either retrieve an existing connection, or create a new one if it
   * doesn't exist.
   * for use with normal arrow function
   * @param targetNodeId Id of target node to communicate with
   * @param ctx
   * @param f Function to handle communication
   */
  public async withConnF<T>(
    targetNodeId: NodeId,
    ctx: Partial<ContextTimedInput> | undefined,
    f: (conn: NodeConnection<Manifest>) => Promise<T>,
  ): Promise<T>;
  @decorators.timedCancellable(true)
  public async withConnF<T>(
    targetNodeId: NodeId,
    @decorators.context ctx: ContextTimed,
    f: (conn: NodeConnection<Manifest>) => Promise<T>,
  ): Promise<T> {
    return await withF(
      [this.acquireConnection(targetNodeId, ctx)],
      async ([conn]) => {
        return await f(conn);
      },
    );
  }

  /**
   * Perform some function on another node over the network with a connection.
   * Will either retrieve an existing connection, or create a new one if it
   * doesn't exist.
   * for use with a generator function
   * @param targetNodeId Id of target node to communicate with
   * @param ctx
   * @param g Generator function to handle communication
   */
  public withConnG<T, TReturn, TNext>(
    targetNodeId: NodeId,
    ctx: Partial<ContextTimedInput> | undefined,
    g: (conn: NodeConnection<Manifest>) => AsyncGenerator<T, TReturn, TNext>,
  ): AsyncGenerator<T, TReturn, TNext>;
  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @decorators.timed()
  public async *withConnG<T, TReturn, TNext>(
    targetNodeId: NodeId,
    @decorators.context ctx: ContextTimed,
    g: (conn: NodeConnection<Manifest>) => AsyncGenerator<T, TReturn, TNext>,
  ): AsyncGenerator<T, TReturn, TNext> {
    const acquire = this.acquireConnection(targetNodeId, ctx);
    const [release, conn] = await acquire();
    let caughtError: Error | undefined;
    try {
      if (conn == null) utils.never('NodeConnection should exist');
      return yield* g(conn);
    } catch (e) {
      caughtError = e;
      throw e;
    } finally {
      await release(caughtError);
    }
    // Wait for any destruction to complete after locking is removed
  }

  /**
   * Starts a connection. This step also attemps to authenticate the connection.
   */
  public createConnection(
    nodeIds: Array<NodeId>,
    host: Host,
    port: Port,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<NodeConnection<Manifest>>;
  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @decorators.timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager<Manifest>) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async createConnection(
    nodeIds: Array<NodeId>,
    host: Host,
    port: Port,
    @decorators.context ctx: ContextTimed,
  ): Promise<NodeConnection<Manifest>> {
    const nodeConnection = await NodeConnection.createNodeConnection<Manifest>(
      {
        targetNodeIds: nodeIds,
        manifest: this.rpcClientManifest,
        targetHost: host,
        targetPort: port,
        tlsConfig: this.tlsConfig,
        connectionKeepAliveIntervalTime: this.connectionKeepAliveIntervalTime,
        connectionKeepAliveTimeoutTime: this.connectionKeepAliveTimeoutTime,
        connectionInitialMaxStreamsBidi: this.connectionInitialMaxStreamsBidi,
        connectionInitialMaxStreamsUni: this.connectionInitialMaxStreamsUni,
        quicSocket: this.quicSocket,
        logger: this.logger.getChild(
          `${NodeConnection.name}Forward [${host}:${port}]`,
        ),
      },
      ctx,
    );
    this.addConnection(nodeConnection.validatedNodeId, nodeConnection);
    this.initiateForwardAuthenticate(nodeConnection.nodeId);
    // Dispatch the connection event
    const connectionData: ConnectionData = {
      remoteNodeId: nodeConnection.nodeId,
      remoteHost: nodeConnection.host,
      remotePort: nodeConnection.port,
    };
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionForward({
        detail: connectionData,
      }),
    );
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionManagerConnection({
        detail: connectionData,
      }),
    );
    if (this.isAuthenticated(connectionData.remoteNodeId)) {
      this.dispatchEvent(
        new nodesEvents.EventNodeConnectionManagerConnectionAuthenticated({
          detail: connectionData,
        }),
      );
    }
    return nodeConnection;
  }

  /**
   * Creates multiple connections looking for a single node. Once the connection
   * has been established then all pending connections are cancelled.
   * This will return the first connection made or timeout.
   */
  public createConnectionMultiple(
    nodeIds: Array<NodeId>,
    addresses: Array<[Host, Port]>,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<NodeConnection<Manifest>>;
  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @decorators.timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager<Manifest>) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async createConnectionMultiple(
    nodeIds: Array<NodeId>,
    addresses: Array<[Host, Port]>,
    @decorators.context ctx: ContextTimed,
  ): Promise<NodeConnection<Manifest>> {
    // Setting up intermediate signal
    const abortControllerMultiConn = new AbortController();
    const handleAbort = () => {
      abortControllerMultiConn.abort(ctx.signal.reason);
    };
    if (ctx.signal.aborted) {
      handleAbort();
    } else {
      ctx.signal.addEventListener('abort', handleAbort, {
        once: true,
      });
    }
    const newCtx = {
      timer: ctx.timer,
      signal: abortControllerMultiConn.signal,
    };

    const attempts = addresses.map(([host, port]) => {
      return this.createConnection(nodeIds, host, port, newCtx);
    });

    try {
      // Await first success
      return await Promise.any(attempts).catch((e) => {
        throw new nodesErrors.ErrorNodeConnectionTimeout(undefined, {
          cause: e,
        });
      });
    } finally {
      // Abort and clean up the rest
      abortControllerMultiConn.abort(abortPendingConnectionsReason);
      await Promise.allSettled(attempts);
      ctx.signal.removeEventListener('abort', handleAbort);
    }
  }

  /**
   * This will start a new connection using a signalling node to coordinate hole punching.
   */
  public createConnectionPunch(
    nodeIdTarget: NodeId,
    nodeIdSignaller: NodeId,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<NodeConnection<Manifest>>;
  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @decorators.timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager<Manifest>) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async createConnectionPunch(
    nodeIdTarget: NodeId,
    nodeIdSignaller: NodeId,
    @decorators.context ctx: ContextTimed,
  ): Promise<NodeConnection<Manifest>> {
    // Get the signaller node from the existing connections
    if (!this.hasConnection(nodeIdSignaller)) {
      throw new nodesErrors.ErrorNodeConnectionManagerConnectionNotFound();
    }
    const { host, port } = await this.withConnF(
      nodeIdSignaller,
      ctx,
      async (conn) => {
        const client = conn.getClient();
        const nodeIdSource = this.keyRing.getNodeId();
        // Creating signature verifying request, data is just `<sourceNodeId><targetNodeId>` concatenated.
        const data = Buffer.concat([nodeIdSource, nodeIdTarget]);
        const signature = keysUtils.signWithPrivateKey(
          this.keyRing.keyPair,
          data,
        );
        const addressMessage = await client.methods
          .nodesConnectionSignalInitial(
            {
              targetNodeIdEncoded: nodesUtils.encodeNodeId(nodeIdTarget),
              signature: signature.toString('base64url'),
            },
            ctx,
          )
          .catch((e) => {
            if (e instanceof rpcErrors.ErrorRPCHandlerFailed) {
              throw new nodesErrors.ErrorNodeConnectionManagerSignalFailed(
                'Failed initial signal step triggering `nodesConnectionSignalInitial`',
                { cause: e },
              );
            }
            throw e;
          });
        return {
          host: addressMessage.host as Host,
          port: addressMessage.port as Port,
        };
      },
    );
    return await this.createConnection([nodeIdTarget], host, port, ctx);
  }

  /**
   * Adds connection to the connections map. Preforms some checks and lifecycle
   * hooks. This code sets up the authentication state machine, and must be run
   * before attempting authentication.
   *
   * Multiple connections can be added for a single NodeId, but the connection
   * with the 'lowest' `connectionId` will be used. The remaining
   * connections will be left to timeout gracefully.
   *
   * @param nodeId The target NodeId to connect to
   * @param nodeConnection The object corresponding to the node connection
   */
  protected addConnection(
    nodeId: NodeId,
    nodeConnection: NodeConnection<Manifest>,
  ): ConnectionAndTimer<Manifest> {
    const nodeIdString = nodeId.toString() as NodeIdString;
    const connectionId = nodeConnection.connectionId;
    // Setting up events
    nodeConnection.addEventListener(
      nodesEvents.EventNodeConnectionStream.name,
      this.handleEventNodeConnectionStream,
    );
    nodeConnection.addEventListener(EventAll.name, this.handleEventAll);
    nodeConnection.addEventListener(
      nodesEvents.EventNodeConnectionDestroyed.name,
      this.handleEventNodeConnectionDestroyed,
      { once: true },
    );

    // Creating TTL timeout.
    // Add to map
    const newConnAndTimer: ConnectionAndTimer<Manifest> = {
      connection: nodeConnection,
      timer: null,
      usageCount: 0,
    };

    // Adding the new connection into the connection map

    let entry = this.connections.get(nodeIdString);
    if (entry == null) {
      // Creating a new entry
      newConnAndTimer.timer = new Timer({
        handler: async () =>
          await this.destroyConnection(nodeId, false, connectionId),
        delay: this.getStickyTimeoutValue(nodeId, true),
      });
      // Prevent unhandled exceptions when cancelling
      newConnAndTimer.timer.catch(() => {});
      const {
        p: authenticatedP,
        resolveP: authenticatedResolveP,
        rejectP: authenticatedRejectP,
      } = utils.promise<void>();
      // Prevent unhandled rejections
      authenticatedP.then(
        () => {},
        () => {},
      );
      entry = {
        activeConnection: connectionId,
        connections: {
          [connectionId]: newConnAndTimer,
        },
        authenticatedForward: AuthenticatingState.PENDING,
        authenticatedReverse: AuthenticatingState.PENDING,
        authenticateComplete: false,
        authenticatedP,
        authenticatedResolveP,
        authenticatedRejectP,
      };
      this.connections.set(nodeIdString, entry);
    } else {
      // Adding connection to existing entry
      newConnAndTimer.timer = new Timer({
        handler: async () =>
          await this.destroyConnection(nodeId, false, connectionId),
        delay: this.getStickyTimeoutValue(
          nodeId,
          entry.activeConnection > connectionId,
        ),
      });
      // Prevent unhandled exceptions when cancelling
      newConnAndTimer.timer.catch(() => {});
      // Updating existing entry
      entry.connections[connectionId] = newConnAndTimer;
      // If the new connection ID is less than the old then replace it
      if (entry.activeConnection > connectionId) {
        const existingConnAndTimer = entry.connections[entry.activeConnection];
        const newDelay = this.getStickyTimeoutValue(nodeId, false);
        // If the old primary connection has an existing timeout timer then we need to reset it to the
        // non-primary timeout time.
        if (
          existingConnAndTimer.timer != null &&
          existingConnAndTimer.timer.getTimeout() > newDelay
        ) {
          existingConnAndTimer.timer.reset(newDelay);
        }
        entry.activeConnection = connectionId;
      }
    }
    return newConnAndTimer;
  }

  /**
   * Gets the existing active connection for the target node
   */
  public getConnection(
    nodeId: NodeId,
  ): ConnectionAndTimer<Manifest> | undefined {
    const nodeIdString = nodeId.toString() as NodeIdString;
    const connectionsEntry = this.connections.get(nodeIdString);
    if (connectionsEntry == null) return;
    return connectionsEntry.connections[connectionsEntry.activeConnection];
  }

  /**
   * Removes the connection from the connection map and destroys it.
   * If the connectionId is specified then just that connection is destroyed.
   * If no connectionId is specified then all connections for that node are destroyed.
   *
   * @param targetNodeId Id of node we are destroying connection to
   * @param force - if true force the connection to end with error.
   * @param connectionIdTarget - if specified destroys only the desired connection.
   */
  public async destroyConnection(
    targetNodeId: NodeId,
    force: boolean,
    connectionIdTarget?: string,
  ): Promise<void> {
    const targetNodeIdString = targetNodeId.toString() as NodeIdString;
    const connectionsEntry = this.connections.get(targetNodeIdString);
    // No entry then nothing to destroy
    if (connectionsEntry == null) return;
    const destroyPs: Array<Promise<void>> = [];
    const connections = connectionsEntry.connections;
    const activeConnectionOldTimeout =
      connections[connectionsEntry.activeConnection].timer?.getTimeout() ??
      this.getStickyTimeoutValue(targetNodeId, true);
    for (const connectionId of Object.keys(connections)) {
      // Destroy if target or no target set
      if (connectionIdTarget == null || connectionIdTarget === connectionId) {
        const connAndTimer = connections[connectionId];
        this.logger.debug(
          `Destroying NodeConnection for ${nodesUtils.encodeNodeId(
            targetNodeId,
          )}:${connectionId}`,
        );
        destroyPs.push(connAndTimer.connection.destroy({ force }));
        // Destroying TTL timer
        connAndTimer.timer?.cancel(timerCancellationReason);
        connAndTimer.timer = null;
        delete connections[connectionId];
      }
    }
    // If empty then remove the entry
    const remainingKeys = Object.keys(connectionsEntry.connections);
    if (remainingKeys.length === 0) {
      // Clean up authentication
      this.authenticateCancel(
        targetNodeIdString,
        new nodesErrors.ErrorNodeManagerAuthenticationFailed(
          'Connection destroyed before authentication could complete',
        ),
      );
      this.connections.delete(targetNodeIdString);
      // Wait for promise to complete and clean up
      await Promise.allSettled([connectionsEntry.authenticatedP]);
      this.dispatchEvent(
        new nodesEvents.EventNodeConnectionManagerConnectionDestroyed({
          detail: targetNodeId,
        }),
      );
    } else {
      // Check if the active connection was removed.
      if (connections[connectionsEntry.activeConnection] == null) {
        // Find the new lowest
        connectionsEntry.activeConnection = remainingKeys.sort()[0];
        // And reset its timer to the time left in the old active connection
        const activeConnection = connections[connectionsEntry.activeConnection];
        activeConnection.timer?.reset(activeConnectionOldTimeout);
      }
    }
    // Now that all the mutations are done we await destruction
    await Promise.all(destroyPs);
  }

  /**
   * Will determine how long to keep a node around for.
   *
   * Timeout is scaled linearly from 1 min to 2 hours based on its bucket.
   * The value will be symmetric for two nodes,
   * they will assign the same timeout for each other.
   */
  protected getStickyTimeoutValue(nodeId: NodeId, primary: boolean): number {
    const min = this.connectionIdleTimeoutTimeMin;
    // Non-primary and unauthenticated connections should time out quickly
    if (!primary) return min;
    if (!this.isAuthenticated(nodeId)) return min;
    const max = this.connectionIdleTimeoutTimeScale;
    // Determine the bucket
    const bucketIndex = nodesUtils.bucketIndex(
      this.keyRing.getNodeId(),
      nodeId,
    );
    const factor = 1 - bucketIndex / 255;
    return min + factor * max;
  }

  /**
   * This takes a reverse initiated QUICConnection, wraps it as a
   * NodeConnection and adds it to the connection map.
   */
  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  protected handleConnectionReverse(quicConnection: QUICConnection) {
    // Checking NodeId
    // No specific error here, validation is handled by the QUICServer
    const certChain = quicConnection.getRemoteCertsChain().map((der) => {
      const cert = keysUtils.certFromPEM(
        quicUtils.derToPEM(der) as CertificatePEM,
      );
      if (cert == null) {
        utils.never('failed to parse certificate from connection cert chain');
      }
      return cert;
    });
    if (certChain.length === 0) {
      utils.never('there must be at least 1 certificate in the chain');
    }
    const nodeId = keysUtils.certNodeId(certChain[0]);
    if (nodeId == null) utils.never('failed to get NodeId from certificate');
    const nodeConnectionNew =
      NodeConnection.createNodeConnectionReverse<Manifest>({
        nodeId,
        certChain,
        manifest: this.rpcClientManifest,
        quicConnection: quicConnection,
        logger: this.logger.getChild(
          `${NodeConnection.name}Reverse [${nodesUtils.encodeNodeId(nodeId)}@${
            quicConnection.remoteHost
          }:${quicConnection.remotePort}]`,
        ),
      });
    this.addConnection(nodeId, nodeConnectionNew);
    // Dispatch the connection event
    const connectionData: ConnectionData = {
      remoteNodeId: nodeConnectionNew.nodeId,
      remoteHost: nodeConnectionNew.host,
      remotePort: nodeConnectionNew.port,
    };
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionManagerConnectionReverse({
        detail: connectionData,
      }),
    );
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionManagerConnection({
        detail: connectionData,
      }),
    );
    if (this.isAuthenticated(nodeId)) {
      this.dispatchEvent(
        new nodesEvents.EventNodeConnectionManagerConnectionAuthenticated({
          detail: connectionData,
        }),
      );
    }
  }

  /**
   * Open up a port in the NAT by sending packets to the target address.
   * The packets will be sent in an exponential backoff dialing pattern and
   * contain random data.
   *
   * This is only ever done used in the reverse direction to open up the nat
   * for the connection to establish from the forward direction.
   *
   * This can't know it succeeded, it will continue until timed out or cancelled.
   *
   * @param host host of the target client.
   * @param port port of the target client.
   * @param ctx
   */
  public holePunch(
    host: Host,
    port: Port,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<void>;
  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @decorators.timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager<Manifest>) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async holePunch(
    host: Host,
    port: Port,
    @decorators.context ctx: ContextTimed,
  ): Promise<void> {
    // We need to send a random data packet to the target until the process
    // times out or a connection is established.
    let ended = false;
    const { p: endedP, resolveP: endedResolveP } = utils.promise();
    if (ctx.signal.aborted) {
      endedResolveP();
    }
    const onAbort = () => {
      ended = true;
      endedResolveP();
      ctx.signal.removeEventListener('abort', onAbort);
    };
    ctx.signal.addEventListener('abort', onAbort);
    const timer = ctx.timer.catch(() => {}).finally(() => onAbort());
    let delay = this.connectionHolePunchIntervalTime;
    // Setting up established event checking
    try {
      while (true) {
        const message = keysUtils.getRandomBytes(32);
        // Since the intention is to abstract away the success/failure of the
        // hole-punch operation, we should catch any errors thrown out of this,
        // as the caller does not expect the method to throw.
        await this.quicSocket
          .send(Buffer.from(message), port, host)
          .catch(() => {});
        await Promise.race([utils.sleep(delay), endedP]);
        if (ended) break;
        delay *= 2;
      }
    } finally {
      onAbort();
      await timer;
    }
  }

  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public hasConnection(nodeId: NodeId): boolean {
    return this.connections.has(nodeId.toString() as NodeIdString);
  }

  @startStop.ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public listConnections(): Array<{
    nodeId: NodeId;
    connectionId: string;
    primary: boolean;
    address: { host: Host; port: Port; hostname: Hostname | undefined };
    usageCount: number;
    timeout: number | undefined;
    authenticated: boolean;
  }> {
    const results: Array<{
      nodeId: NodeId;
      connectionId: string;
      primary: boolean;
      address: { host: Host; port: Port; hostname: Hostname | undefined };
      usageCount: number;
      timeout: number | undefined;
      authenticated: boolean;
    }> = [];
    for (const [nodeIdString, connectionsEntry] of this.connections.entries()) {
      const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
      const connections = connectionsEntry.connections;
      for (const connectionId of Object.keys(connections)) {
        const connectionAndTimer = connections[connectionId];
        const connection = connectionAndTimer.connection;
        const forwardAuthenticated =
          connectionsEntry.authenticatedForward === AuthenticatingState.SUCCESS;
        const reverseAuthenticated =
          connectionsEntry.authenticatedReverse === AuthenticatingState.SUCCESS;
        results.push({
          nodeId,
          connectionId: connection.connectionId,
          primary:
            connectionsEntry.activeConnection === connection.connectionId,
          address: {
            host: connection.host,
            port: connection.port,
            hostname: connection.hostname,
          },
          usageCount: connectionAndTimer.usageCount,
          timeout: connectionAndTimer.timer?.getTimeout(),
          authenticated: forwardAuthenticated && reverseAuthenticated,
        });
      }
    }
    return results;
  }

  /**
   * Returns the number of active connections
   */
  public connectionsActive(): number {
    let size = 0;
    for (const [, connectionsEntry] of this.connections) {
      size += Object.keys(connectionsEntry.connections).length;
    }
    return size;
  }

  public updateTlsConfig(tlsConfig: TLSConfig): void {
    this.tlsConfig = tlsConfig;
    this.quicServer.updateConfig({
      key: tlsConfig.keyPrivatePem,
      cert: tlsConfig.certChainPem,
    });
  }

  /**
   * This is used by the `NodesConnectionSignalFinal` to initiate the hole punch
   * procedure.
   *
   * Will validate the message, and initiate hole punching in the background and
   * return immediately.
   * Attempts to the same host and port are coalesced.
   * Attempts to the same host are limited by a semaphore.
   * Active attempts are tracked inside the `activeHolePunchPs` set and are
   * cancelled and awaited when the `NodeConnectionManager` stops.
   */
  @startStop.ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public handleNodesConnectionSignalFinal(host: Host, port: Port) {
    const id = `${host}:${port}`;
    if (this.activeHolePunchPs.has(id)) return;
    // Checking for resource semaphore
    let semaphore: Semaphore | undefined =
      this.activeHolePunchAddresses.get(host);
    if (semaphore == null) {
      semaphore = new Semaphore(3);
      this.activeHolePunchAddresses.set(host, semaphore);
    }
    const holePunchAttempt = new PromiseCancellable<void>(
      async (res, rej, signal) => {
        await semaphore!
          .withF(async () => {
            await this.holePunch(host, port, { signal });
          })
          .finally(() => {
            this.activeHolePunchPs.delete(id);
            if (semaphore!.count === 0) {
              this.activeHolePunchAddresses.delete(host);
            }
          })
          .then(res, rej);
      },
    ).finally(() => {
      this.activeHolePunchPs.delete(id);
    });
    holePunchAttempt.then(
      () => {},
      () => {},
    );
    // Prevent promise rejection leak
    void holePunchAttempt.catch(() => {});
    this.activeHolePunchPs.set(id, holePunchAttempt);
  }

  /**
   * This is used by the `NodesConnectionSignalInitial` to initiate a relay
   * request. Requests can only be relayed to nodes this node is currently
   * connected to.
   *
   * Requests made by the same node are rate limited, when the limit has been
   * exceeded the request throws an `ErrorNodeConnectionManagerRequestRateExceeded`
   * error.
   *
   * Active relay attempts are tracked in `activeSignalFinalPs` and are cancelled
   * and awaited when the `NodeConnectionManager` stops.
   *
   * @param sourceNodeId NodeId of the node making the request. Used for rate limiting.
   * @param targetNodeId NodeId of the node that needs to initiate hole punching.
   * @param address Address the target needs to punch to.
   * @param requestSignature `base64url` encoded signature
   * @param ctx
   */
  public async handleNodesConnectionSignalInitial(
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    address: {
      host: Host;
      port: Port;
    },
    requestSignature: string,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<{
    host: Host;
    port: Port;
  }>;
  @startStop.ready(new nodesErrors.ErrorNodeManagerNotRunning())
  @decorators.timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager<Manifest>) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async handleNodesConnectionSignalInitial(
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    address: {
      host: Host;
      port: Port;
    },
    requestSignature: string,
    @decorators.context ctx: ContextTimed,
  ): Promise<{
    host: Host;
    port: Port;
  }> {
    // Need to get the connection details of the requester and add it to the message.
    // Then send the message to the target.
    // This would only function with existing connections that are authenticated
    const nodeIdString = targetNodeId.toString() as NodeIdString;
    const connectionsEntry = this.connections.get(nodeIdString);
    if (connectionsEntry == null) {
      throw new nodesErrors.ErrorNodeConnectionManagerConnectionNotFound();
    }
    const existingConnection =
      connectionsEntry.connections[connectionsEntry.activeConnection];
    if (existingConnection == null) {
      throw new nodesErrors.ErrorNodeConnectionManagerConnectionNotFound();
    }
    if (connectionsEntry.authenticatedForward !== AuthenticatingState.SUCCESS) {
      throw new nodesErrors.ErrorNodeConnectionManagerConnectionNotFound();
    }
    if (connectionsEntry.authenticatedReverse !== AuthenticatingState.SUCCESS) {
      throw new nodesErrors.ErrorNodeConnectionManagerConnectionNotFound();
    }
    const host = existingConnection.connection.host;
    const port = existingConnection.connection.port;
    // Do other checks.
    const sourceNodeIdString = sourceNodeId.toString();
    if (!this.rateLimiter.consume(sourceNodeIdString)) {
      throw new nodesErrors.ErrorNodeConnectionManagerRequestRateExceeded();
    }
    // Generating relay signature, data is just `<sourceNodeId><targetNodeId><Address><requestSignature>` concatenated
    const data = Buffer.concat([
      sourceNodeId,
      targetNodeId,
      Buffer.from(JSON.stringify(address), 'utf-8'),
      Buffer.from(requestSignature, 'base64url'),
    ]);
    const relaySignature = keysUtils.signWithPrivateKey(
      this.keyRing.keyPair,
      data,
    );
    const connectionSignalP = this.withConnF(
      targetNodeId,
      ctx,
      async (conn) => {
        const client = conn.getClient();
        await client.methods.nodesConnectionSignalFinal({
          sourceNodeIdEncoded: nodesUtils.encodeNodeId(sourceNodeId),
          targetNodeIdEncoded: nodesUtils.encodeNodeId(targetNodeId),
          address: address,
          requestSignature: requestSignature,
          relaySignature: relaySignature.toString('base64url'),
        });
      },
    )
      // Ignore results and failures, then are expected to happen and are allowed
      .then(
        () => {},
        (e) => {
          // If it's a connection error or missing handler then it's a signalling
          // failure, we ignore these since this is a fire and forget. Any
          // unexpected errors should still be thrown.
          if (
            nodesUtils.isConnectionError(e) ||
            e instanceof rpcErrors.ErrorRPCHandlerFailed
          ) {
            return;
          }
          throw e;
        },
      )
      .finally(() => {
        this.activeSignalFinalPs.delete(connectionSignalP);
      });
    // Preventing promise rejection leak.
    connectionSignalP.catch(() => {});
    this.activeSignalFinalPs.add(connectionSignalP);
    return {
      host,
      port,
    };
  }

  /**
   * Returns a list of active connections and their address information.
   */
  @startStop.ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public getClosestConnections(
    targetNodeId: NodeId,
    limit: number = this.connectionGetClosestLimit,
  ): Array<ActiveConnectionsInfo> {
    const nodeIds: Array<NodeId> = [];
    for (const [nodeIdString, connectionsEntry] of this.connections.entries()) {
      if (
        connectionsEntry.authenticatedForward !== AuthenticatingState.SUCCESS
      ) {
        continue;
      }
      if (
        connectionsEntry.authenticatedReverse !== AuthenticatingState.SUCCESS
      ) {
        continue;
      }
      nodeIds.push(IdInternal.fromString<NodeId>(nodeIdString));
    }
    // Sort and draw limit
    nodeIds.sort(nodesUtils.nodeDistanceCmpFactory(targetNodeId));
    const nodesShortList = nodeIds.slice(0, limit);
    // With the desired nodes we can format data
    return nodesShortList.map((nodeId) => {
      const nodeIdString = nodeId.toString() as NodeIdString;
      const entry = this.connections.get(nodeIdString);
      if (entry == null) utils.never('Connection should exist');
      const entryRecord: ActiveConnectionsInfo = {
        nodeId: nodeId,
        connections: {},
      };
      for (const connAndTimer of Object.values(entry.connections)) {
        const connection = connAndTimer.connection;
        entryRecord.connections[connection.connectionId] = {
          host: connection.host,
          hostName: connection.hostname,
          port: connection.port,
          timeout: connAndTimer.timer?.getTimeout(),
          primary: connection.connectionId === entry.activeConnection,
        };
      }
      return entryRecord;
    });
  }

  /**
   * Handles the authentication for two nodes. This is done by triggering a RPC
   * duplex method. The duplex stream writes messages to a writer and awaits the
   * responses from a reader in real-time. The authentication follows a strict
   * protocol.
   *
   * SEND Authentication message
   * RECV Response message (reverse)
   * RECV Authentication message from Node B
   * SEND Response message (reverse)
   * RECV Acknowledgement message
   *
   * @param nodeId The NodeId of the target node
   * @param ctx
   * @see {@link handleAuthentication} for RPC protocol
   */
  public forwardAuthenticate(
    nodeId: NodeId,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<void>;
  @decorators.timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager<Manifest>) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async forwardAuthenticate(
    nodeId: NodeId,
    @decorators.context ctx: ContextTimed,
  ): Promise<void> {
    const targetNodeIdString = nodeId.toString() as NodeIdString;
    const connectionsEntry = this.connections.get(targetNodeIdString);
    if (connectionsEntry == null) {
      throw new nodesErrors.ErrorNodeConnectionManagerConnectionNotFound();
    }
    // Need to make an authenticate request here. Get the connection and RPC.
    let rpcCancel: ((reason?: any) => void) | undefined;
    try {
      const authenticateMessage =
        await this.authenticateNetworkForwardCallback(ctx);
      await withF([this.acquireConnectionInternal(nodeId)], async ([conn]) => {
        const authStream =
          await conn.rpcClient.methods.nodesAuthenticateConnection(ctx);
        const writer = authStream.writable.getWriter();
        const reader = authStream.readable.getReader();
        rpcCancel = (reason?: any) => authStream.cancel(reason);

        // Write the forward authentication message from this node
        await writer.write(authenticateMessage);
        const forwardMessageResultPair = await utils.raceSignal(
          reader.read(),
          ctx.signal,
        );
        if (forwardMessageResultPair.done) {
          throw new nodesErrors.ErrorNodeAuthenticationInvalidProtocol(
            'Stream ended prematurely',
          );
        }
        const forwardMessageResult = forwardMessageResultPair.value;
        if (forwardMessageResult.type !== 'success') {
          throw new nodesErrors.ErrorNodeManagerAuthenticationFailedForward(
            'Expected success message but got authentication message',
          );
        }

        // Read and process the authentication token sent by the connectee
        const reverseMessageInPair = await utils.raceSignal(
          reader.read(),
          ctx.signal,
        );
        if (reverseMessageInPair.done) {
          throw new nodesErrors.ErrorNodeAuthenticationInvalidProtocol(
            'Stream ended prematurely',
          );
        }
        const reverseMessageIn = reverseMessageInPair.value;
        if (reverseMessageIn.type === 'success') {
          throw new nodesErrors.ErrorNodeManagerAuthenticationFailedReverse(
            'Expected authentication message but got success message',
          );
        }
        await this.handleReverseAuthenticate(
          conn.nodeId,
          reverseMessageIn,
          ctx,
        );
        await writer.write({ type: 'success', success: true });

        // Wait for other node to set its state
        const ackPair = await utils.raceSignal(reader.read(), ctx.signal);
        if (ackPair.done) {
          throw new nodesErrors.ErrorNodeAuthenticationInvalidProtocol(
            'Stream ended prematurely',
          );
        }
        const ack = ackPair.value;
        if (ack.type !== 'success') {
          throw new nodesErrors.ErrorNodeManagerAuthenticationFailed(
            'Expected success message but got authentication message',
          );
        }
        rpcCancel();
      });
      connectionsEntry.authenticatedForward = AuthenticatingState.SUCCESS;
    } catch (e) {
      const err = new nodesErrors.ErrorNodeManagerAuthenticationFailed(
        undefined,
        { cause: e },
      );
      rpcCancel?.(err);
      // Make sure any pending authentication is set to FAIL accordingly
      if (
        connectionsEntry.authenticatedForward === AuthenticatingState.PENDING
      ) {
        connectionsEntry.authenticatedForward = AuthenticatingState.FAIL;
      }
      if (
        connectionsEntry.authenticatedReverse === AuthenticatingState.PENDING
      ) {
        connectionsEntry.authenticatedReverse = AuthenticatingState.FAIL;
      }
      this.authenticateFail(targetNodeIdString, err);
    }
    // Check the reverse result
    switch (connectionsEntry.authenticatedReverse) {
      case AuthenticatingState.SUCCESS:
        // Authentication succeeded
        this.authenticateSuccess(targetNodeIdString);
        return;
      case AuthenticatingState.FAIL:
      case AuthenticatingState.PENDING:
        return;
      default:
        utils.never('authenticatedReverse has invalid state');
    }
  }

  public handleReverseAuthenticate(
    nodeId: NodeId,
    message: NodesAuthenticateConnectionMessage,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<void>;
  @decorators.timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager<Manifest>) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async handleReverseAuthenticate(
    nodeId: NodeId,
    message: NodesAuthenticateConnectionMessage,
    @decorators.context ctx: ContextTimed,
  ): Promise<void> {
    const targetNodeIdString = nodeId.toString() as NodeIdString;
    const connectionsEntry = this.connections.get(targetNodeIdString);
    if (connectionsEntry == null) {
      throw new nodesErrors.ErrorNodeConnectionManagerConnectionNotFound();
    }
    try {
      // Should resolve without issue if authentication succeeds.
      await this.authenticateNetworkReverseCallback(message, ctx);
      connectionsEntry.authenticatedReverse = AuthenticatingState.SUCCESS;
    } catch (e) {
      const err = new nodesErrors.ErrorNodeManagerAuthenticationFailedReverse(
        undefined,
        { cause: e },
      );
      connectionsEntry.authenticatedReverse = AuthenticatingState.FAIL;
      this.authenticateFail(targetNodeIdString, err);
      // Throw back up the RPC
      throw err;
    }
    // Check the forward result
    switch (connectionsEntry.authenticatedForward) {
      case AuthenticatingState.SUCCESS:
        // Authentication succeeded
        this.authenticateSuccess(targetNodeIdString);
        return;
      case AuthenticatingState.FAIL:
      case AuthenticatingState.PENDING:
        return;
      default:
        utils.never('authenticatedForward has invalid state');
    }
  }

  /**
   * Will initiate a forward authentication call and coalesce. This method is
   * idempotent.
   */
  public initiateForwardAuthenticate(nodeId: NodeId): void {
    // Needs check the map if one is already running, otherwise it needs to start one and manage it.
    const nodeIdString = nodeId.toString() as NodeIdString;
    const authenticationEntry = this.connections.get(nodeIdString);
    if (authenticationEntry == null) {
      utils.never('authenticationEntry must be defined');
    }
    const existingAuthenticate =
      this.activeForwardAuthenticateCalls.get(nodeIdString);

    // If it exists in the map then we don't need to start one and can just
    // return. However, if the previous attmept failed, we can reattempt
    // authentication.
    if (existingAuthenticate != null) {
      return;
    }
    if (
      authenticationEntry.authenticatedForward ===
        AuthenticatingState.SUCCESS ||
      (authenticationEntry.authenticateComplete &&
        authenticationEntry.authenticatedForward !== AuthenticatingState.FAIL &&
        authenticationEntry.authenticatedReverse !== AuthenticatingState.FAIL)
    ) {
      return;
    }
    // Otherwise we need to start one and add it to the map
    const forwardAuthenticateP = this.forwardAuthenticate(nodeId).finally(() =>
      this.activeForwardAuthenticateCalls.delete(nodeIdString),
    );
    // Prevent unhandled errors
    forwardAuthenticateP.then(
      () => {},
      () => {},
    );
    this.activeForwardAuthenticateCalls.set(nodeIdString, forwardAuthenticateP);
  }

  /**
   * Handles the authentication for two nodes. This is done by yielding messages
   * and awaiting response for the messages in real-time. The messages are
   * yielded by the async generator and the reponse is awaited for via the
   * async iterator. The authentication follows a strict protocol.
   *
   * RECV Authentication message from Node A
   * SEND Response message
   * SEND Authentication message from Node B
   * RECV Response message
   * SEND Acknowledgement message
   *
   * @param requestingNodeId The NodeId of the requesting node
   * @param inputIterator An iterator yielding responses for the sent messages
   * @param ctx
   * @see {@link forwardAuthenticate} for usage example
   */
  public async *handleAuthentication(
    requestingNodeId: NodeId,
    inputIterator: AsyncIterableIterator<
      SuccessMessage | NodesAuthenticateConnectionMessage
    >,
    ctx: ContextTimed,
  ): AsyncGenerator<
    SuccessMessage | NodesAuthenticateConnectionMessage,
    void,
    void
  > {
    const requestingNodeIdString = requestingNodeId.toString() as NodeIdString;
    const connectionEntry = this.connections.get(requestingNodeIdString);
    if (connectionEntry == null) utils.never('Connection should be defined');

    try {
      const reverseMessageInPair = await utils.raceSignal(
        inputIterator.next(),
        ctx.signal,
      );
      if (reverseMessageInPair.done === true) {
        throw new nodesErrors.ErrorNodeAuthenticationInvalidProtocol(
          'Stream ended prematurely',
        );
      }
      const reverseMessageIn = reverseMessageInPair.value;
      if (reverseMessageIn.type === 'success') {
        throw new nodesErrors.ErrorNodeAuthenticationInvalidProtocol(
          'Expected authentication message but got success message',
        );
      }

      // If reverse authentication succeeded without errors, then authentication
      // was successful. The error is not wrapped to ensure a useful stack trace
      // in case of an error.
      await this.handleReverseAuthenticate(
        requestingNodeId,
        reverseMessageIn,
        ctx,
      );

      yield {
        type: 'success',
        success: true,
      };

      // Generate and yield the forward token from this node
      yield await this.authenticateNetworkForwardCallback(ctx);
      const forwardMessageResultPair = await utils.raceSignal(
        inputIterator.next(),
        ctx.signal,
      );
      if (forwardMessageResultPair.done === true) {
        throw new nodesErrors.ErrorNodeAuthenticationInvalidProtocol(
          'Stream ended prematurely',
        );
      }
      const forwardMessageResult = forwardMessageResultPair.value;
      if (forwardMessageResult.type !== 'success') {
        throw new nodesErrors.ErrorNodeAuthenticationInvalidProtocol(
          'Expected success message but got authentication message',
        );
      }

      // Success message should never return { success: false }. If there was an
      // error with authentication, the RPC should be aborted immediately.

      // It is impossible to reach here without having the reverse connection
      // being in a non-success state.
      connectionEntry.authenticatedForward = AuthenticatingState.SUCCESS;
      this.authenticateSuccess(requestingNodeIdString);

      // Yield a final acknowledgement message stating authentication has been
      // completed and the state has been set.
      yield {
        type: 'success',
        success: true,
      };
    } catch (e) {
      // Make sure any pending authentication is set to FAIL accordingly
      if (
        connectionEntry.authenticatedForward === AuthenticatingState.PENDING
      ) {
        connectionEntry.authenticatedForward = AuthenticatingState.FAIL;
      }
      if (
        connectionEntry.authenticatedReverse === AuthenticatingState.PENDING
      ) {
        connectionEntry.authenticatedReverse = AuthenticatingState.FAIL;
      }
      this.authenticateFail(requestingNodeIdString, e);
      throw new nodesErrors.ErrorNodeManagerAuthenticationFailed(undefined, {
        cause: e,
      });
    }
  }

  /**
   * Returns true if the connection has been authenticated
   */
  public isAuthenticated(nodeId: NodeId): boolean {
    const targetNodeIdString = nodeId.toString() as NodeIdString;
    const connectionsEntry = this.connections.get(targetNodeIdString);
    if (connectionsEntry == null) return false;
    const forwardAuthenticated =
      connectionsEntry.authenticatedForward === AuthenticatingState.SUCCESS;
    const reverseAuthenticated =
      connectionsEntry.authenticatedReverse === AuthenticatingState.SUCCESS;
    return forwardAuthenticated && reverseAuthenticated;
  }

  /**
   * Returns a promise that resolves once the connection has authenticated,
   * otherwise it rejects with the authentication failure
   * @param nodeId
   * @param ctx
   */
  public async isAuthenticatedP(
    nodeId: NodeId,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<void>;
  @decorators.timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager<Manifest>) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async isAuthenticatedP(
    nodeId: NodeId,
    @decorators.context ctx: ContextTimed,
  ): Promise<void> {
    const targetNodeIdString = nodeId.toString() as NodeIdString;
    const connectionsEntry = this.connections.get(targetNodeIdString);
    if (connectionsEntry == null) {
      throw new nodesErrors.ErrorNodeConnectionManagerConnectionNotFound();
    }
    const { p: abortP, rejectP: rejectAbortP } = utils.promise<never>();
    const abortHandler = () => {
      rejectAbortP(ctx.signal.reason);
    };
    if (ctx.signal.aborted) {
      abortHandler();
    } else {
      ctx.signal.addEventListener('abort', abortHandler, { once: true });
    }
    // If the connection isn't already authenticated, then try authenticating
    if (
      !connectionsEntry.authenticateComplete ||
      connectionsEntry.authenticatedForward === AuthenticatingState.FAIL ||
      connectionsEntry.authenticatedReverse === AuthenticatingState.FAIL
    ) {
      this.initiateForwardAuthenticate(nodeId);
    }
    try {
      return await Promise.race([connectionsEntry.authenticatedP, abortP]);
    } catch (e) {
      // Capture the stacktrace here since knowing where we're waiting for
      // authentication is more useful.
      Error.captureStackTrace(e);
      throw e;
    } finally {
      ctx.signal.removeEventListener('abort', abortHandler);
    }
  }

  protected authenticateFail(targetNodeIdString: NodeIdString, reason: Error) {
    const connectionsEntry = this.connections.get(targetNodeIdString);
    if (connectionsEntry == null) {
      return;
    }
    // Skip if already completed
    if (connectionsEntry.authenticateComplete) {
      return;
    }
    connectionsEntry.authenticateComplete = true;
    const nodeId = IdInternal.fromString<NodeId>(targetNodeIdString);
    connectionsEntry.connections[
      connectionsEntry.activeConnection
    ]?.timer?.reset(this.getStickyTimeoutValue(nodeId, false));
    // Removing authentication entry
    connectionsEntry.authenticatedRejectP(
      new nodesErrors.ErrorNodeManagerAuthenticationFailed(undefined, {
        cause: reason,
      }),
    );
  }

  protected authenticateSuccess(targetNodeIdString: NodeIdString) {
    const connectionsEntry = this.connections.get(targetNodeIdString);
    if (connectionsEntry == null) {
      utils.never('Target node was missing in the connections map');
    }
    connectionsEntry.authenticatedResolveP();
    connectionsEntry.authenticateComplete = true;
    // Resetting timeout delay for the active connection. The non-active
    // connections would already have the min timeout.
    const connection =
      connectionsEntry.connections[connectionsEntry.activeConnection];
    const nodeId = IdInternal.fromString<NodeId>(targetNodeIdString);
    const delay = this.getStickyTimeoutValue(nodeId, true);
    if (connection.timer != null) connection.timer.reset(delay);

    // Dispatching authenticated events for every active connection
    for (const connAndTimer of Object.values(connectionsEntry.connections)) {
      const connectionData: ConnectionData = {
        remoteNodeId: connAndTimer.connection.nodeId,
        remoteHost: connAndTimer.connection.host,
        remotePort: connAndTimer.connection.port,
      };
      this.dispatchEvent(
        new nodesEvents.EventNodeConnectionManagerConnectionAuthenticated({
          detail: connectionData,
        }),
      );
    }
  }

  protected authenticateCancel(
    targetNodeIdString: NodeIdString,
    reason: Error,
  ) {
    const authenticationEntry = this.connections.get(targetNodeIdString);
    if (
      authenticationEntry == null ||
      authenticationEntry.authenticateComplete
    ) {
      return;
    }
    if (
      authenticationEntry!.authenticatedForward === AuthenticatingState.PENDING
    ) {
      authenticationEntry!.authenticatedForward = AuthenticatingState.FAIL;
    }
    if (
      authenticationEntry!.authenticatedReverse === AuthenticatingState.PENDING
    ) {
      authenticationEntry!.authenticatedReverse = AuthenticatingState.FAIL;
    }
    this.authenticateFail(targetNodeIdString, reason);
  }

  public setAuthenticateNetworkForwardCallback(
    authenticateNetworkForwardCallback: AuthenticateNetworkForwardCallback,
  ) {
    this.authenticateNetworkForwardCallback =
      authenticateNetworkForwardCallback;
  }

  public setAuthenticateNetworkReverseCallback(
    authenticateNetworkReverseCallback: AuthenticateNetworkReverseCallback,
  ) {
    this.authenticateNetworkReverseCallback =
      authenticateNetworkReverseCallback;
  }

  protected authenticationMiddlewareClient = (
    _ctx: ContextTimed,
    _cancel: (reason?: any) => void,
    meta: Record<string, JSONValue> | undefined,
  ) => {
    const nodeId = agentUtils.nodeIdFromMeta(meta);
    if (nodeId == null) utils.never('NodeId should be defined here');
    let isAllowed = this.isAuthenticated(nodeId);
    const {
      p: waitP,
      resolveP: resolveWaitP,
      rejectP: rejectWaitP,
    } = utils.promise();
    return {
      forward: new TransformStream<JSONRPCRequest, JSONRPCRequest>({
        transform: (chunk, controller) => {
          if (isAllowed) {
            controller.enqueue(chunk);
          } else {
            if (rpcMethodsWhitelist.includes(chunk.method)) {
              // Success
              isAllowed = true;
              controller.enqueue(chunk);
              resolveWaitP();
              return;
            } else {
              // Fail
              const e = new nodesErrors.ErrorNodeConnectionManagerRPCDenied();
              controller.error(e);
              rejectWaitP(e);
              return;
            }
          }
        },
      }),
      reverse: new TransformStream<
        JSONRPCResponse<JSONRPCResponse>,
        JSONRPCResponse<JSONRPCResponse>
      >({
        transform: async (chunk, controller) => {
          if (!isAllowed) {
            await waitP.catch((e) => controller.error(e));
            return;
          }
          controller.enqueue(chunk);
        },
      }),
    };
  };
}

export default NodeConnectionManager;
