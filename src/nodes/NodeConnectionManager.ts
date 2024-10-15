import type { ResourceAcquire } from '@matrixai/resources';
import type { ContextTimed, ContextTimedInput } from '@matrixai/contexts';
import type { QUICConnection } from '@matrixai/quic';
import type KeyRing from '../keys/KeyRing';
import type { CertificatePEM } from '../keys/types';
import type {
  ConnectionData,
  Host,
  Hostname,
  Port,
  TLSConfig,
} from '../network/types';
import type { AgentServerManifest } from './agent/handlers';
import type { NodeId, NodeIdString } from './types';
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
import {
  ready,
  running,
  StartStop,
  status,
} from '@matrixai/async-init/dist/StartStop';
import { AbstractEvent, EventAll } from '@matrixai/events';
import { context, timedCancellable } from '@matrixai/contexts/dist/decorators';
import { Semaphore } from '@matrixai/async-locks';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import NodeConnection from './NodeConnection';
import agentClientManifest from './agent/callers';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import * as nodesEvents from './events';
import * as keysUtils from '../keys/utils';
import * as networkUtils from '../network/utils';
import * as utils from '../utils';
import RateLimiter from '../utils/ratelimiter/RateLimiter';
import config from '../config';

type ConnectionAndTimer = {
  connection: NodeConnection;
  timer: Timer | null;
  usageCount: number;
};

type ConnectionsEntry = {
  activeConnection: string;
  connections: Record<string, ConnectionAndTimer>;
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

/**
 * NodeConnectionManager is a server that manages all node connections.
 * It manages both initiated and received connections.
 *
 * It acts like a phone call system.
 * It can maintain mulitple calls to other nodes.
 * There's no guarantee that we need to make it.
 *
 * Node connections make use of the QUIC protocol.
 * The NodeConnectionManager encapsulates `QUICServer`.
 * While the NodeConnection encapsulates `QUICClient`.
 */
interface NodeConnectionManager extends StartStop {}
@StartStop({
  eventStart: nodesEvents.EventNodeConnectionManagerStart,
  eventStarted: nodesEvents.EventNodeConnectionManagerStarted,
  eventStop: nodesEvents.EventNodeConnectionManagerStop,
  eventStopped: nodesEvents.EventNodeConnectionManagerStopped,
})
class NodeConnectionManager {
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
   * Max parse buffer size before RPC parser throws an parse error.
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

  protected logger: Logger;
  protected keyRing: KeyRing;
  protected tlsConfig: TLSConfig;

  protected quicSocket: QUICSocket;
  protected quicServer: QUICServer;

  /**
   * Data structure to store all NodeConnections. If a connection to a node n does
   * not exist, no entry for n will exist in the map. Alternatively, if a
   * connection is currently being instantiated by some thread, an entry will
   * exist in the map, but only with the lock (no connection object). Once a
   * connection is instantiated, the entry in the map is updated to include the
   * connection object.
   * A nodeIdString is used for the key here since
   * NodeIds can't be used to properly retrieve a value from the map.
   */
  protected connections: Map<NodeIdString, ConnectionsEntry> = new Map();

  protected rpcServer: RPCServer;

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
    if (this[running] && this[status] !== 'stopping') {
      await this.stop();
    }
  };

  protected handleEventNodeConnectionStream = (
    evt: nodesEvents.EventNodeConnectionStream,
  ) => {
    if (evt.target == null) utils.never('target should be defined here');
    const nodeConnection = evt.target as NodeConnection;
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
    connectionAndTimer.timer?.cancel();
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
      }
    });
  };

  protected handleEventNodeConnectionDestroyed = async (
    evt: nodesEvents.EventNodeConnectionDestroyed,
  ) => {
    if (evt.target == null) utils.never('target should be defined here');
    const nodeConnection = evt.target as NodeConnection;
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
   * Redispatches `QUICSOcket` or `QUICServer` error events as `NodeConnectionManager` error events.
   * This should trigger the destruction of the `NodeConnection` through the
   * `EventNodeConnectionError` -> `EventNodeConnectionClose` event path.
   */
  protected handleEventQUICError = (evt: quicEvents.EventQUICSocketError) => {
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
   * without error but we have it just in case.
   */
  protected handleEventQUICSocketStopped = (
    _evt: quicEvents.EventQUICSocketStopped,
  ) => {
    const err = new nodesErrors.ErrorNodeConnectionManagerInternalError(
      'QUICSocket stopped unexpectedly',
    );
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionManagerError({ detail: err }),
    );
  };

  /**
   * Handle unexpected stoppage of the QUICServer. Not expected to happen
   * without error but we have it just in case.
   */
  protected handleEventQUICServerStopped = (
    _evt: quicEvents.EventQUICServerStopped,
  ) => {
    const err = new nodesErrors.ErrorNodeConnectionManagerInternalError(
      'QUICServer stopped unexpectedly',
    );
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionManagerError({ detail: err }),
    );
  };

  /**
   * Handles `EventQUICServerConnection` events. These are reverser or server
   * peer initated connections that needs to be handled and added to the
   * connectio map.
   */
  protected handleEventQUICServerConnection = (
    evt: quicEvents.EventQUICServerConnection,
  ) => {
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
    rpcParserBufferSize = config.defaultsSystem.rpcParserBufferSize,
    rpcCallTimeoutTime = config.defaultsSystem.rpcCallTimeoutTime,

    logger,
  }: {
    keyRing: KeyRing;
    tlsConfig: TLSConfig;
    connectionFindConcurrencyLimit?: number;
    connectionGetClosestLimit?: number;
    connectionFindLocalTimeoutTime?: number;
    connectionIdleTimeoutTimeMin?: number;
    connectionIdleTimeoutTimeScale?: number;
    connectionConnectTimeoutTime?: number;
    connectionKeepAliveTimeoutTime?: number;
    connectionKeepAliveIntervalTime?: number;
    connectionHolePunchIntervalTime?: number;
    rpcParserBufferSize?: number;
    rpcCallTimeoutTime?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.keyRing = keyRing;
    this.tlsConfig = tlsConfig;
    this.connectionFindConcurrencyLimit = connectionFindConcurrencyLimit;
    this.connectionGetClosestLimit = connectionGetClosestLimit;
    this.connectionFindLocalTimeoutTime = connectionFindLocalTimeoutTime;
    this.connectionIdleTimeoutTimeMin = connectionIdleTimeoutTimeMin;
    this.connectionIdleTimeoutTimeScale = connectionIdleTimeoutTimeScale;
    this.connectionConnectTimeoutTime = connectionConnectTimeoutTime;
    this.connectionKeepAliveTimeoutTime = connectionKeepAliveTimeoutTime;
    this.connectionKeepAliveIntervalTime = connectionKeepAliveIntervalTime;
    this.connectionHolePunchIntervalTime = connectionHolePunchIntervalTime;
    this.rpcParserBufferSize = rpcParserBufferSize;
    this.rpcCallTimeoutTime = rpcCallTimeoutTime;

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
      },
      socket: quicSocket,
      reasonToCode: nodesUtils.reasonToCode,
      codeToReason: nodesUtils.codeToReason,
      minIdleTimeout: connectionConnectTimeoutTime,
      logger: this.logger.getChild(QUICServer.name),
    });
    const rpcServer = new RPCServer({
      middlewareFactory: rpcMiddleware.defaultServerMiddlewareWrapper(
        undefined,
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
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public get host(): Host {
    return this.quicSocket.host as unknown as Host;
  }

  /**
   * Get the port that node connection manager is bound to.
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public get port(): Port {
    return this.quicSocket.port as unknown as Port;
  }

  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
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
    agentService: AgentServerManifest;
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

  /**
   * What doe stop do with force?
   * Figure it out.
   */
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

    const destroyProms: Array<Promise<void>> = [];
    for (const [nodeId] of this.connections) {
      // It exists so we want to destroy it
      const destroyProm = this.destroyConnection(
        IdInternal.fromString<NodeId>(nodeId),
        force,
      );
      destroyProms.push(destroyProm);
    }
    await Promise.all(destroyProms);
    const signallingProms: Array<PromiseCancellable<void> | Promise<void>> = [];
    for (const [, activePunch] of this.activeHolePunchPs) {
      signallingProms.push(activePunch);
      activePunch.cancel();
    }
    for (const activeSignal of this.activeSignalFinalPs) {
      signallingProms.push(activeSignal);
    }
    await Promise.allSettled(signallingProms);
    await this.quicServer.stop({ force: true });
    await this.quicSocket.stop({ force: true });
    await this.rpcServer.stop({ force: true });
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * For usage with withF, to acquire a connection
   * This unique acquire function structure of returning the ResourceAcquire
   * itself is such that we can pass targetNodeId as a parameter (as opposed to
   * an acquire function with no parameters).
   * @param targetNodeId Id of target node to communicate with
   * @returns ResourceAcquire Resource API for use in with contexts
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public acquireConnection(
    targetNodeId: NodeId,
  ): ResourceAcquire<NodeConnection> {
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
      connectionAndTimer.timer?.cancel();
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
              handler: async () =>
                await this.destroyConnection(targetNodeId, false),
              delay,
            });
          }
        },
        connectionAndTimer.connection,
      ];
    };
  }

  /**
   * Perform some function on another node over the network with a connection.
   * Will either retrieve an existing connection, or create a new one if it
   * doesn't exist.
   * for use with normal arrow function
   * @param targetNodeId Id of target node to communicate with
   * @param f Function to handle communication
   */
  public async withConnF<T>(
    targetNodeId: NodeId,
    f: (conn: NodeConnection) => Promise<T>,
  ): Promise<T> {
    return await withF(
      [this.acquireConnection(targetNodeId)],
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
   * @param g Generator function to handle communication
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async *withConnG<T, TReturn, TNext>(
    targetNodeId: NodeId,
    g: (conn: NodeConnection) => AsyncGenerator<T, TReturn, TNext>,
  ): AsyncGenerator<T, TReturn, TNext> {
    const acquire = this.acquireConnection(targetNodeId);
    const [release, conn] = await acquire();
    let caughtError;
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
   * Starts a connection.
   */
  public createConnection(
    nodeIds: Array<NodeId>,
    host: Host,
    port: Port,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<NodeConnection>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async createConnection(
    nodeIds: Array<NodeId>,
    host: Host,
    port: Port,
    @context ctx: ContextTimed,
  ): Promise<NodeConnection> {
    const nodeConnection = await NodeConnection.createNodeConnection(
      {
        targetNodeIds: nodeIds,
        manifest: agentClientManifest,
        targetHost: host,
        targetPort: port,
        tlsConfig: this.tlsConfig,
        connectionKeepAliveIntervalTime: this.connectionKeepAliveIntervalTime,
        connectionKeepAliveTimeoutTime: this.connectionKeepAliveTimeoutTime,
        quicSocket: this.quicSocket,
        logger: this.logger.getChild(
          `${NodeConnection.name}Forward [${host}:${port}]`,
        ),
      },
      ctx,
    );
    this.addConnection(nodeConnection.validatedNodeId, nodeConnection);
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
  ): PromiseCancellable<NodeConnection>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async createConnectionMultiple(
    nodeIds: Array<NodeId>,
    addresses: Array<[Host, Port]>,
    @context ctx: ContextTimed,
  ): Promise<NodeConnection> {
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
  ): PromiseCancellable<NodeConnection>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async createConnectionPunch(
    nodeIdTarget: NodeId,
    nodeIdSignaller: NodeId,
    @context ctx: ContextTimed,
  ): Promise<NodeConnection> {
    // Get the signaller node from the existing connections
    if (!this.hasConnection(nodeIdSignaller)) {
      throw new nodesErrors.ErrorNodeConnectionManagerConnectionNotFound();
    }
    const { host, port } = await this.withConnF(
      nodeIdSignaller,
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
   * Adds connection to the connections map. Preforms some checks and lifecycle hooks.
   * This code is shared between the reverse and forward connection creation.
   *
   * Multiple connections can be added for a single NodeId, but the connection
   * with the 'lowest' `connectionId` will be used. The remaining
   * connections will be left to timeout gracefully.
   */
  protected addConnection(
    nodeId: NodeId,
    nodeConnection: NodeConnection,
  ): ConnectionAndTimer {
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
    const newConnAndTimer: ConnectionAndTimer = {
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
      entry = {
        activeConnection: connectionId,
        connections: {
          [connectionId]: newConnAndTimer,
        },
      };
      this.connections.set(nodeIdString, entry);
    } else {
      newConnAndTimer.timer = new Timer({
        handler: async () =>
          await this.destroyConnection(nodeId, false, connectionId),
        delay: this.getStickyTimeoutValue(
          nodeId,
          entry.activeConnection > connectionId,
        ),
      });
      // Updating existing entry
      entry.connections[connectionId] = newConnAndTimer;
      // If the new connection ID is less than the old then replace it
      if (entry.activeConnection > connectionId) {
        entry.activeConnection = connectionId;
      }
    }
    return newConnAndTimer;
  }

  /**
   * Gets the existing active connection for the target node
   */
  public getConnection(nodeId: NodeId): ConnectionAndTimer | undefined {
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
        if (connAndTimer.timer != null) connAndTimer.timer.cancel();
        delete connections[connectionId];
      }
    }
    // If empty then remove the entry
    const remainingKeys = Object.keys(connectionsEntry.connections);
    if (remainingKeys.length === 0) {
      this.connections.delete(targetNodeIdString);
    } else {
      // Check if the active connection was removed.
      if (connections[connectionsEntry.activeConnection] == null) {
        // Find the new lowest
        connectionsEntry.activeConnection = remainingKeys.sort()[0];
      }
    }
    // Now that all the mutations are done we await destruction
    await Promise.all(destroyPs);
  }

  /**
   * Will determine how long to keep a node around for.
   *
   * Timeout is scaled linearly from 1 min to 2 hours based on it's bucket.
   * The value will be symmetric for two nodes,
   * they will assign the same timeout for each other.
   */
  protected getStickyTimeoutValue(nodeId: NodeId, primary: boolean): number {
    const min = this.connectionIdleTimeoutTimeMin;
    if (!primary) return min;
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
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
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
    const nodeConnectionNew = NodeConnection.createNodeConnectionReverse({
      nodeId,
      certChain,
      manifest: agentClientManifest,
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
  }

  /**
   * Open up a port in the NAT by sending packets to the target address.
   * The packets will be sent in an exponential backoff dialing pattern and contain random data.
   *
   * This is only ever done used in the reverse direction to open up the nat for the connection to establish from the
   * forward direction.
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
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async holePunch(
    host: Host,
    port: Port,
    @context ctx: ContextTimed,
  ): Promise<void> {
    // We need to send a random data packet to the target until the process times out or a connection is established
    let ended = false;
    const endedProm = utils.promise();
    if (ctx.signal.aborted) {
      endedProm.resolveP();
    }
    const onAbort = () => {
      ended = true;
      endedProm.resolveP();
      ctx.signal.removeEventListener('abort', onAbort);
    };
    ctx.signal.addEventListener('abort', onAbort);
    const timer = ctx.timer.catch(() => {}).finally(() => onAbort());
    let delay = this.connectionHolePunchIntervalTime;
    // Setting up established event checking
    try {
      while (true) {
        const message = keysUtils.getRandomBytes(32);
        // Since the intention is to abstract away the success/failure of the holepunch operation,
        // We should catch any errors thrown out of this, as the caller does not expect the method to throw
        await this.quicSocket
          .send(Buffer.from(message), port, host)
          .catch(() => {});
        await Promise.race([utils.sleep(delay), endedProm.p]);
        if (ended) break;
        delay *= 2;
      }
    } finally {
      onAbort();
      await timer;
    }
  }

  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public hasConnection(nodeId: NodeId): boolean {
    return this.connections.has(nodeId.toString() as NodeIdString);
  }

  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public listConnections(): Array<{
    nodeId: NodeId;
    connectionId: string;
    primary: boolean;
    address: { host: Host; port: Port; hostname: Hostname | undefined };
    usageCount: number;
    timeout: number | undefined;
  }> {
    const results: Array<{
      nodeId: NodeId;
      connectionId: string;
      primary: boolean;
      address: { host: Host; port: Port; hostname: Hostname | undefined };
      usageCount: number;
      timeout: number | undefined;
    }> = [];
    for (const [nodeIdString, connectionsEntry] of this.connections.entries()) {
      const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
      const connections = connectionsEntry.connections;
      for (const connectionId of Object.keys(connections)) {
        const connectionAndTimer = connections[connectionId];
        const connection = connectionAndTimer.connection;
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

  public updateTlsConfig(tlsConfig: TLSConfig) {
    this.tlsConfig = tlsConfig;
    this.quicServer.updateConfig({
      key: tlsConfig.keyPrivatePem,
      cert: tlsConfig.certChainPem,
    });
  }

  /**
   * This is used by the `NodesConnectionSignalFinal` to initiate the hole punch procedure.
   *
   * Will validate the message, and initiate hole punching in the background and return immediately.
   * Attempts to the same host and port are coalesced.
   * Attempts to the same host are limited by a semaphore.
   * Active attempts are tracked inside of the `activeHolePunchPs` set and are cancelled and awaited when the
   * `NodeConnectionManager` stops.
   */
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
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
        await semaphore!.withF(async () => {
          this.holePunch(host, port, { signal })
            .finally(() => {
              this.activeHolePunchPs.delete(id);
              if (semaphore!.count === 0) {
                this.activeHolePunchAddresses.delete(host);
              }
            })
            .then(res, rej);
        });
      },
    );
    this.activeHolePunchPs.set(id, holePunchAttempt);
  }

  /**
   * This is used by the `NodesConnectionSignalInitial` to initiate a relay request.
   * Requests can only be relayed to nodes this node is currently connected to.
   *
   * Requests made by the same node are rate limited, when the limit has been exceeded the request
   * throws an `ErrorNodeConnectionManagerRequestRateExceeded` error.
   *
   * Active relay attempts are tracked in `activeSignalFinalPs` and are cancelled and awaited when the
   * `NodeConnectionManager` stops.
   *
   * @param sourceNodeId - NodeId of the node making the request. Used for rate limiting.
   * @param targetNodeId - NodeId of the node that needs to initiate hole punching.
   * @param address - Address the target needs to punch to.
   * @param requestSignature - `base64url` encoded signature
   */
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public async handleNodesConnectionSignalInitial(
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    address: {
      host: Host;
      port: Port;
    },
    requestSignature: string,
  ): Promise<{
    host: Host;
    port: Port;
  }> {
    // Need to get the connection details of the requester and add it to the message.
    // Then send the message to the target.
    // This would only function with existing connections
    const existingConnection = this.getConnection(targetNodeId);
    if (existingConnection == null) {
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
    const connProm = this.withConnF(targetNodeId, async (conn) => {
      const client = conn.getClient();
      await client.methods.nodesConnectionSignalFinal({
        sourceNodeIdEncoded: nodesUtils.encodeNodeId(sourceNodeId),
        targetNodeIdEncoded: nodesUtils.encodeNodeId(targetNodeId),
        address,
        requestSignature: requestSignature,
        relaySignature: relaySignature.toString('base64url'),
      });
    })
      // Ignore results and failures, then are expected to happen and are allowed
      .then(
        () => {},
        (e) => {
          // If it's a connection error or missing handler then it's a signalling failure, we ignore these since this
          // is a fire and forget. Any unexpected errors should still be thrown
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
        this.activeSignalFinalPs.delete(connProm);
      });
    this.activeSignalFinalPs.add(connProm);
    return {
      host,
      port,
    };
  }

  /**
   * Returns a list of active connections and their address information.
   */
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public getClosestConnections(
    targetNodeId: NodeId,
    limit: number = this.connectionGetClosestLimit,
  ): Array<ActiveConnectionsInfo> {
    const nodeIds: Array<NodeId> = [];
    for (const nodeIdString of this.connections.keys()) {
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
}

export default NodeConnectionManager;
