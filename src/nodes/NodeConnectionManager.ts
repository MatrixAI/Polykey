import type { LockRequest } from '@matrixai/async-locks';
import type { ResourceAcquire } from '@matrixai/resources';
import type { ContextTimedInput, ContextTimed } from '@matrixai/contexts';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { ClientCryptoOps, QUICConnection } from '@matrixai/quic';
import type NodeGraph from './NodeGraph';
import type {
  NodeAddress,
  NodeData,
  NodeId,
  NodeIdString,
  SeedNodes,
} from './types';
import type KeyRing from '../keys/KeyRing';
import type { Key, CertificatePEM } from '../keys/types';
import type {
  ConnectionData,
  Host,
  Hostname,
  Port,
  TLSConfig,
} from '../network/types';
import type { ServerManifest } from '@matrixai/rpc';
import type { HolePunchRelayMessage } from './agent/types';
import Logger from '@matrixai/logger';
import { withF } from '@matrixai/resources';
import { ready, StartStop } from '@matrixai/async-init/dist/StartStop';
import { IdInternal } from '@matrixai/id';
import { Lock, LockBox } from '@matrixai/async-locks';
import { Timer } from '@matrixai/timer';
import { timedCancellable, context } from '@matrixai/contexts/dist/decorators';
import { AbstractEvent, EventAll } from '@matrixai/events';
import {
  QUICSocket,
  QUICServer,
  events as quicEvents,
  utils as quicUtils,
} from '@matrixai/quic';
import { running, status } from '@matrixai/async-init';
import { RPCServer, middleware as rpcUtilsMiddleware } from '@matrixai/rpc';
import NodeConnection from './NodeConnection';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import * as nodesEvents from './events';
import manifestClientAgent from './agent/callers';
import * as ids from '../ids';
import * as keysUtils from '../keys/utils';
import * as networkUtils from '../network/utils';
import * as utils from '../utils';
import config from '../config';

type ManifestClientAgent = typeof manifestClientAgent;

type ConnectionAndTimer = {
  connection: NodeConnection<ManifestClientAgent>;
  timer: Timer | null;
  usageCount: number;
};

/**
 * NodeConnectionManager is a server that manages all node connections.
 * It manages both initiated and received connections
 *
 * It's an event target that emits events for new connections.
 *
 * We will need to fully encapsulate all the errors in NCM if we can.
 * Otherwise, it goes all the way to PolykeyAgent.
 *
 * That means the QUICSocket, QUICServer and QUICClient
 * As well as the QUICConnection and QUICStream.
 * The NCM basically encapsulates it.
 *
 * The NCM and NC both must encapsulate all the QUIC transport.
 *
 * Events:
 *
 * - connectionManagerStop
 * - connectionManagerError
 * - nodeConnection
 * - nodeConnectionError
 * - nodeConnectionStream
 * - nodeConnectionDestroy
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
   * Time to wait to garbage collect un-used node connections.
   */
  public readonly connectionIdleTimeoutTime: number;

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

  protected logger: Logger;
  protected keyRing: KeyRing;
  protected nodeGraph: NodeGraph;
  protected tlsConfig: TLSConfig;
  protected seedNodes: SeedNodes;

  protected quicSocket: QUICSocket;
  protected quicServer: QUICServer;

  protected quicClientCrypto: ClientCryptoOps;

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
  protected connections: Map<NodeIdString, ConnectionAndTimer> = new Map();

  protected connectionLocks: LockBox<Lock> = new LockBox();

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
    this.dispatchEvent(new nodesEvents.EventNodeConnectionClose());
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
    this.logger.warn(`close event triggering NodeConnectionManager.stop`);
    if (this[running] && this[status] !== 'stopping') {
      await this.stop();
    }
  };

  protected handleEventNodeConnectionStream = async (
    e: nodesEvents.EventNodeConnectionStream,
  ) => {
    const stream = e.detail;
    this.rpcServer.handleStream(stream);
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
  protected handleEventQUICServerConnection = async (
    evt: quicEvents.EventQUICServerConnection,
  ) => {
    await this.handleConnectionReverse(evt.detail);
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

  public constructor({
    keyRing,
    nodeGraph,
    tlsConfig,
    seedNodes = {},
    connectionFindConcurrencyLimit = config.defaultsSystem
      .nodesConnectionFindConcurrencyLimit,
    connectionIdleTimeoutTime = config.defaultsSystem
      .nodesConnectionIdleTimeoutTime,
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
    nodeGraph: NodeGraph;
    tlsConfig: TLSConfig;
    seedNodes?: SeedNodes;
    connectionFindConcurrencyLimit?: number;
    connectionIdleTimeoutTime?: number;
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
    this.nodeGraph = nodeGraph;
    this.tlsConfig = tlsConfig;
    // Filter out own node ID
    const nodeIdEncodedOwn = nodesUtils.encodeNodeId(keyRing.getNodeId());
    this.seedNodes = utils.filterObject(seedNodes, ([k]) => {
      return k !== nodeIdEncodedOwn;
    }) as SeedNodes;
    this.connectionFindConcurrencyLimit = connectionFindConcurrencyLimit;
    this.connectionIdleTimeoutTime = connectionIdleTimeoutTime;
    this.connectionConnectTimeoutTime = connectionConnectTimeoutTime;
    this.connectionKeepAliveTimeoutTime = connectionKeepAliveTimeoutTime;
    this.connectionKeepAliveIntervalTime = connectionKeepAliveIntervalTime;
    this.connectionHolePunchIntervalTime = connectionHolePunchIntervalTime;
    this.rpcParserBufferSize = rpcParserBufferSize;
    this.rpcCallTimeoutTime = rpcCallTimeoutTime;
    // Note that all buffers allocated for crypto operations is using
    // `allocUnsafeSlow`. Which ensures that the underlying `ArrayBuffer`
    // is not shared. Also, all node buffers satisfy the `ArrayBuffer` interface.
    const quicClientCrypto = {
      async randomBytes(data: ArrayBuffer): Promise<void> {
        const randomBytes = keysUtils.getRandomBytes(data.byteLength);
        randomBytes.copy(utils.bufferWrap(data));
      },
    };
    const quicServerCrypto = {
      key: keysUtils.generateKey(),
      ops: {
        async sign(key: ArrayBuffer, data: ArrayBuffer): Promise<ArrayBuffer> {
          const sig = keysUtils.macWithKey(
            utils.bufferWrap(key) as Key,
            utils.bufferWrap(data),
          );
          // Convert the MAC to an ArrayBuffer
          return sig.slice().buffer;
        },
        async verify(
          key: ArrayBuffer,
          data: ArrayBuffer,
          sig: ArrayBuffer,
        ): Promise<boolean> {
          return keysUtils.authWithKey(
            utils.bufferWrap(key) as Key,
            utils.bufferWrap(data),
            utils.bufferWrap(sig),
          );
        },
      },
    };
    const quicSocket = new QUICSocket({
      logger: this.logger.getChild(QUICSocket.name),
    });
    // By the time we get to using QUIC server, all hostnames would have been
    // resolved, we would not resolve hostnames inside the QUIC server.
    // This is because node connections require special hostname resolution
    // procedures.
    const quicServer = new QUICServer({
      config: {
        maxIdleTimeout: connectionKeepAliveTimeoutTime,
        keepAliveIntervalTime: connectionKeepAliveIntervalTime,
        key: tlsConfig.keyPrivatePem,
        cert: tlsConfig.certChainPem,
        verifyPeer: true,
        verifyCallback: networkUtils.verifyClientCertificateChain,
      },
      crypto: quicServerCrypto,
      socket: quicSocket,
      reasonToCode: nodesUtils.reasonToCode,
      codeToReason: nodesUtils.codeToReason,
      minIdleTimeout: connectionConnectTimeoutTime,
      logger: this.logger.getChild(QUICServer.name),
    });
    // Setting up RPCServer
    const rpcServer = new RPCServer({
      middlewareFactory: rpcUtilsMiddleware.defaultServerMiddlewareWrapper(
        undefined,
        this.rpcParserBufferSize,
      ),
      fromError: networkUtils.fromError,
      handlerTimeoutTime: this.rpcCallTimeoutTime,
      logger: this.logger.getChild(RPCServer.name),
    });

    this.quicClientCrypto = quicClientCrypto;
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

  public async start({
    host = '::' as Host,
    port = 0 as Port,
    reuseAddr = false,
    ipv6Only = false,
    manifest = {},
  }: {
    host?: Host;
    port?: Port;
    reuseAddr?: boolean;
    ipv6Only?: boolean;
    manifest?: ServerManifest;
  }) {
    const address = networkUtils.buildAddress(host, port);
    this.logger.info(`Start ${this.constructor.name} on ${address}`);

    // We should expect that seed nodes are already in the node manager
    // It should not be managed here!
    await this.rpcServer.start({ manifest });
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
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stop ${this.constructor.name}`);

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
    for (const [nodeId, connAndTimer] of this.connections) {
      if (connAndTimer.connection == null) continue;
      // It exists so we want to destroy it
      const destroyProm = this.destroyConnection(
        IdInternal.fromString<NodeId>(nodeId),
      );
      destroyProms.push(destroyProm);
    }
    await Promise.all(destroyProms);
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
   * @param ctx
   * @returns ResourceAcquire Resource API for use in with contexts
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async acquireConnection(
    targetNodeId: NodeId,
    ctx?: Partial<ContextTimed>,
  ): Promise<ResourceAcquire<NodeConnection<ManifestClientAgent>>> {
    if (this.keyRing.getNodeId().equals(targetNodeId)) {
      this.logger.warn('Attempting connection to our own NodeId');
    }
    return async () => {
      this.logger.debug(
        `acquiring connection to node ${nodesUtils.encodeNodeId(targetNodeId)}`,
      );
      const connectionAndTimer = await this.getConnection(
        targetNodeId,
        undefined,
        ctx,
      );
      // Increment usage count, and cancel timer
      connectionAndTimer.usageCount += 1;
      connectionAndTimer.timer?.cancel();
      connectionAndTimer.timer = null;
      // Return tuple of [ResourceRelease, Resource]
      return [
        async (e) => {
          if (nodesUtils.isConnectionError(e)) {
            this.logger.debug(`acquiring errored with ${e?.message}`);
            // Error with connection, shutting connection down
            await this.destroyConnection(targetNodeId);
          }
          // Decrement usage count and set up TTL if needed.
          // We're only setting up TTLs for non-seed nodes.
          connectionAndTimer.usageCount -= 1;
          if (
            connectionAndTimer.usageCount <= 0 &&
            !this.isSeedNode(targetNodeId)
          ) {
            this.logger.debug(
              `creating TTL for ${nodesUtils.encodeNodeId(targetNodeId)}`,
            );
            connectionAndTimer.timer = new Timer({
              handler: async () => await this.destroyConnection(targetNodeId),
              delay: this.connectionIdleTimeoutTime,
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
   * @param ctx
   */
  public withConnF<T>(
    targetNodeId: NodeId,
    f: (conn: NodeConnection<ManifestClientAgent>) => Promise<T>,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<T>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async withConnF<T>(
    targetNodeId: NodeId,
    f: (conn: NodeConnection<ManifestClientAgent>) => Promise<T>,
    @context ctx: ContextTimed,
  ): Promise<T> {
    return await withF(
      [await this.acquireConnection(targetNodeId, ctx)],
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
   * @param ctx
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async *withConnG<T, TReturn, TNext>(
    targetNodeId: NodeId,
    g: (
      conn: NodeConnection<ManifestClientAgent>,
    ) => AsyncGenerator<T, TReturn, TNext>,
    ctx?: Partial<ContextTimed>,
  ): AsyncGenerator<T, TReturn, TNext> {
    const acquire = await this.acquireConnection(targetNodeId, ctx);
    const [release, conn] = await acquire();
    let caughtError;
    try {
      if (conn == null) utils.never();
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
   * This will return an existing connection or establish a new one as needed.
   * If no address is provided it will preform a kademlia search for the node.
   */
  protected getConnection(
    targetNodeId: NodeId,
    address?: NodeAddress,
    ctx?: Partial<ContextTimed>,
  );
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  protected async getConnection(
    targetNodeId: NodeId,
    address: NodeAddress | undefined,
    @context ctx: ContextTimed,
  ): Promise<ConnectionAndTimer> {
    // If the connection already exists then we need to return it.
    const existingConnection = await this.getExistingConnection(targetNodeId);
    if (existingConnection != null) return existingConnection;

    // If there was no address provided then we need to find it.
    if (address == null) {
      // Find the node
      address = await this.findNode(targetNodeId, undefined, ctx);
      if (address == null) throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();
    }
    // Then we just get the connection, it should already exist.
    return this.getConnectionWithAddress(targetNodeId, address, ctx);
  }

  protected async getExistingConnection(
    targetNodeId: NodeId,
  ): Promise<ConnectionAndTimer | undefined> {
    const targetNodeIdString = targetNodeId.toString() as NodeIdString;
    return await this.connectionLocks.withF(
      [targetNodeIdString, Lock],
      async () => {
        const connAndTimer = this.connections.get(targetNodeIdString);
        if (connAndTimer != null) {
          this.logger.debug(
            `Found existing NodeConnection for ${nodesUtils.encodeNodeId(
              targetNodeId,
            )}`,
          );
          return connAndTimer;
        }
        this.logger.debug(
          `no existing NodeConnection for ${nodesUtils.encodeNodeId(
            targetNodeId,
          )}`,
        );
      },
    );
  }

  /**
   * This gets a connection with a known address.
   * @param targetNodeId Id of node we are creating connection to.
   * @param address - The address to connect on if specified. If not provided we attempt a kademlia search.
   * @param ctx
   * @returns ConnectionAndLock that was created or exists in the connection map
   */
  protected getConnectionWithAddress(
    targetNodeId: NodeId,
    address: NodeAddress,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<ConnectionAndTimer>;
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  protected async getConnectionWithAddress(
    targetNodeId: NodeId,
    address: NodeAddress,
    @context ctx: ContextTimed,
  ): Promise<ConnectionAndTimer> {
    const targetNodeIdString = targetNodeId.toString() as NodeIdString;
    const existingConnection = await this.getExistingConnection(targetNodeId);
    if (existingConnection != null) return existingConnection;
    const targetNodeIdEncoded = nodesUtils.encodeNodeId(targetNodeId);
    this.logger.debug(`Getting NodeConnection for ${targetNodeIdEncoded}`);
    return await this.connectionLocks
      .withF([targetNodeIdString, Lock, ctx], async () => {
        this.logger.debug(`acquired lock for ${targetNodeIdEncoded}`);
        // Attempting a multi-connection for the target node
        const results = await this.establishMultiConnection(
          [targetNodeId],
          [address],
          ctx,
        );
        // Should be a single result.
        for (const [, connAndTimer] of results) {
          return connAndTimer;
        }
        // Should throw before reaching here
        utils.never();
      })
      .finally(() => {
        this.logger.debug(`lock finished for ${targetNodeIdEncoded}`);
      });
  }

  /**
   * This will connect to the provided address looking for any of the listed nodes.
   * Locking is not handled at this level, it must be handled by the caller.
   * @param nodeIds
   * @param addresses
   * @param ctx
   * @protected
   */
  protected async establishMultiConnection(
    nodeIds: Array<NodeId>,
    addresses: Array<NodeAddress>,
    ctx: ContextTimed,
  ): Promise<Map<NodeIdString, ConnectionAndTimer>> {
    const nodesEncoded = nodeIds.map((v) => nodesUtils.encodeNodeId(v));
    this.logger.debug(`getting multi-connection for ${nodesEncoded}`);
    if (nodeIds.length === 0) {
      throw new nodesErrors.ErrorNodeConnectionManagerNodeIdRequired();
    }
    const connectionsResults: Map<NodeIdString, ConnectionAndTimer> = new Map();
    // 1. short circuit any existing connections
    const nodesShortlist: Set<NodeIdString> = new Set();
    for (const nodeId of nodeIds) {
      const nodeIdString = nodeId.toString() as NodeIdString;
      const connAndTimer = this.connections.get(nodeIdString);
      if (connAndTimer == null) {
        nodesShortlist.add(nodeIdString);
        continue;
      }
      this.logger.debug(
        `found existing connection for ${nodesUtils.encodeNodeId(nodeId)}`,
      );
      connectionsResults.set(nodeIdString, connAndTimer);
    }
    // 2. resolve the addresses into a full list. Any host names need to be resolved.
    // If we have existing nodes then we have existing addresses
    const existingAddresses: Set<string> = new Set();
    for (const [, connAndTimer] of connectionsResults) {
      const address = `${connAndTimer.connection.host}|${connAndTimer.connection.port}`;
      existingAddresses.add(address);
    }
    const resolvedAddresses = await networkUtils.resolveHostnames(
      addresses,
      existingAddresses,
    );
    if (ctx.signal.aborted) return connectionsResults;
    // 3. Concurrently attempt connections
    // Abort signal for cleaning up
    const abortController = new AbortController();
    const signal = abortController.signal;

    ctx.signal.addEventListener(
      'abort',
      () => {
        abortController.abort(ctx.signal.reason);
      },
      { once: true },
    );

    const nodesShortlistArray: Array<NodeId> = [];
    for (const nodeIdString of nodesShortlist) {
      nodesShortlistArray.push(IdInternal.fromString<NodeId>(nodeIdString));
    }
    const cleanUpReason = Symbol('CleanUpReason');
    this.logger.debug(
      `attempting connections for ${nodesShortlistArray.map((v) =>
        nodesUtils.encodeNodeId(v),
      )}`,
    );
    const connProms = resolvedAddresses.map((address) =>
      this.establishSingleConnection(
        nodesShortlistArray,
        address,
        connectionsResults,
        { timer: ctx.timer, signal },
      ).finally(() => {
        if (connectionsResults.size === nodeIds.length) {
          // We have found all nodes, clean up remaining connections
          abortController.abort(cleanUpReason);
        }
      }),
    );
    // We race the connections with timeout
    try {
      this.logger.debug(`awaiting connections`);
      await Promise.allSettled(connProms);
      this.logger.debug(`awaiting connections resolved`);
    } finally {
      // Cleaning up
      this.logger.debug(`cleaning up`);
      abortController.abort(cleanUpReason);
      await Promise.allSettled(connProms);
    }
    if (connectionsResults.size === 0) {
      throw new nodesErrors.ErrorNodeConnectionManagerMultiConnectionFailed(
        undefined,
        {
          cause: new AggregateError(await Promise.allSettled(connProms)),
        },
      );
    }
    return connectionsResults;
  }

  /**
   * Used internally by getMultiConnection to attempt a single connection.
   * Locking is not done at this stage, it must be done at a higher level.
   * This will do the following...
   * 1. Attempt the connection
   * 2. On success, do final setup and add connection to result and connection map.
   * 3. If already in the map it will clean up connection.
   */
  protected async establishSingleConnection(
    nodeIds: Array<NodeId>,
    address: {
      host: Host;
      port: Port;
    },
    connectionsResults: Map<NodeIdString, ConnectionAndTimer>,
    ctx: ContextTimed,
  ): Promise<void> {
    // TODO: do we bother with a concurrency limit for now? It's simple to use a semaphore.
    // TODO: if all connections fail then this needs to throw. Or does it? Do we just report the allSettled result?
    // 1. attempt connection to an address
    this.logger.debug(
      `establishing single connection for address ${address.host}:${address.port}`,
    );
    const iceProm = this.initiateHolePunch(nodeIds, ctx);
    const connection =
      await NodeConnection.createNodeConnection<ManifestClientAgent>(
        {
          targetNodeIds: nodeIds,
          manifest: manifestClientAgent,
          crypto: this.quicClientCrypto,
          targetHost: address.host,
          targetPort: address.port,
          tlsConfig: this.tlsConfig,
          connectionKeepAliveIntervalTime: this.connectionKeepAliveIntervalTime,
          connectionKeepAliveTimeoutTime: this.connectionKeepAliveTimeoutTime,
          quicSocket: this.quicSocket,
          logger: this.logger.getChild(
            `${NodeConnection.name} [${address.host}:${address.port}]`,
          ),
        },
        ctx,
      )
        .catch((e) => {
          this.logger.debug(
            `establish single connection failed for ${address.host}:${address.port} with ${e.message}`,
          );
          throw e;
        })
        .finally(async () => {
          iceProm.cancel('Connection was established');
          await iceProm;
        });
    // 2. if established then add to result map
    const nodeId = connection.nodeId;
    const nodeIdString = nodeId.toString() as NodeIdString;
    if (connectionsResults.has(nodeIdString)) {
      this.logger.debug(
        `single connection already existed, cleaning up ${address.host}:${address.port}`,
      );
      // 3. if already exists then clean up
      await connection.destroy({ force: true });
      // I can only see this happening as a race condition with creating a forward connection and receiving a reverse.
      // FIXME: only here to see if this condition happens.
      //  this NEEDS to be removed, but I want to know if this branch happens at all.
      throw Error(
        'TMP IMP, This should be exceedingly rare, lets see if it happens',
      );
      // Return;
    }
    // Final setup
    const newConnAndTimer = this.addConnection(nodeId, connection);
    // We can assume connection was established and destination was valid, we can add the target to the nodeGraph
    connectionsResults.set(nodeIdString, newConnAndTimer);
    this.logger.debug(
      `Created NodeConnection for ${nodesUtils.encodeNodeId(
        nodeId,
      )} on ${address}`,
    );
  }

  /**
   * This will take a `QUICConnection` emitted by the `QUICServer` and handle adding it to the connection map
   * This will also set up some event handling for the connection.
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  protected async handleConnectionReverse(quicConnection: QUICConnection) {
    // Checking NodeId
    // No specific error here, validation is handled by the QUICServer
    const certChain = quicConnection.getRemoteCertsChain().map((der) => {
      const cert = keysUtils.certFromPEM(
        quicUtils.derToPEM(der) as CertificatePEM,
      );
      if (cert == null) utils.never();
      return cert;
    });
    if (certChain == null) utils.never();
    const nodeId = keysUtils.certNodeId(certChain[0]);
    if (nodeId == null) utils.never();
    const nodeIdString = nodeId.toString() as NodeIdString;
    // TODO: A connection can fail while awaiting lock. We should abort early in this case.
    return await this.connectionLocks.withF(
      [nodeIdString, Lock],
      async (): Promise<void> => {
        // Check if the connection already exists under that nodeId and reject the connection if so
        if (this.connections.has(nodeIdString)) {
          // Reject and return early.
          await quicConnection.stop({
            isApp: true,
            errorCode: 42, // TODO: use an actual code
            reason: Buffer.from('Connection already exists, forcing close'),
            force: true,
          });
          return;
        }
        const nodeConnection =
          await NodeConnection.createNodeConnectionReverse<ManifestClientAgent>(
            {
              nodeId,
              certChain,
              manifest: manifestClientAgent,
              quicConnection: quicConnection,
              logger: this.logger.getChild(
                `${NodeConnection.name} [${nodesUtils.encodeNodeId(nodeId)}@${
                  quicConnection.remoteHost
                }:${quicConnection.remotePort}]`,
              ),
            },
          );
        // Final setup
        this.addConnection(nodeId, nodeConnection);
      },
    );
  }

  /**
   * Adds connection to the connections map. Preforms some checks and lifecycle hooks.
   * This code is shared between the reverse and forward connection creation.
   */
  protected addConnection(
    nodeId: NodeId,
    nodeConnection: NodeConnection<ManifestClientAgent>,
  ): ConnectionAndTimer {
    const nodeIdString = nodeId.toString() as NodeIdString;
    // Check if exists in map, this should never happen but better safe than sorry.
    if (this.connections.has(nodeIdString)) utils.never();
    // Setting up events
    nodeConnection.addEventListener(
      nodesEvents.EventNodeConnectionStream.name,
      this.handleEventNodeConnectionStream,
    );
    nodeConnection.addEventListener(EventAll.name, this.handleEventAll);
    nodeConnection.addEventListener(
      nodesEvents.EventNodeConnectionDestroyed.name,
      async () => {
        // To avoid deadlock only in the case where this is called
        // we want to check for destroying connection and read lock
        // If the connection is calling destroyCallback then it SHOULD exist in the connection map.
        // Already locked so already destroying
        if (this.connectionLocks.isLocked(nodeIdString)) return;
        await this.destroyConnection(nodeId);
        nodeConnection.removeEventListener(
          nodesEvents.EventNodeConnectionStream.name,
          this.handleEventNodeConnectionStream,
        );
        nodeConnection.removeEventListener(EventAll.name, this.handleEventAll);
      },
      { once: true },
    );

    // Creating TTL timeout.
    // We don't create a TTL for seed nodes.
    const timeToLiveTimer = !this.isSeedNode(nodeId)
      ? new Timer({
          handler: async () => await this.destroyConnection(nodeId),
          delay: this.connectionIdleTimeoutTime,
        })
      : null;
    // Add to map
    const newConnAndTimer: ConnectionAndTimer = {
      connection: nodeConnection,
      timer: timeToLiveTimer,
      usageCount: 0,
    };
    this.connections.set(nodeIdString, newConnAndTimer);
    const connectionData: ConnectionData = {
      remoteNodeId: nodeConnection.nodeId,
      remoteHost: nodeConnection.host,
      remotePort: nodeConnection.port,
    };
    this.dispatchEvent(
      new nodesEvents.EventNodeConnectionManagerConnection({
        detail: connectionData,
      }),
    );
    return newConnAndTimer;
  }

  /**
   * Removes the connection from the connection man and destroys it.
   * @param targetNodeId Id of node we are destroying connection to
   */
  protected async destroyConnection(targetNodeId: NodeId): Promise<void> {
    const targetNodeIdString = targetNodeId.toString() as NodeIdString;
    return await this.connectionLocks.withF(
      [targetNodeIdString, Lock],
      async () => {
        const connAndTimer = this.connections.get(targetNodeIdString);
        if (connAndTimer?.connection == null) return;
        this.logger.debug(
          `Destroying NodeConnection for ${nodesUtils.encodeNodeId(
            targetNodeId,
          )}`,
        );
        await connAndTimer.connection.destroy({ force: true });
        // Destroying TTL timer
        if (connAndTimer.timer != null) connAndTimer.timer.cancel();
        // Updating the connection map
        this.connections.delete(targetNodeIdString);
      },
    );
  }

  /**
   * Open up a port in the NAT by sending packets to the target address.
   * The packets will be sent in an exponential backoff dialing pattern and contain random data.
   *
   * This can't know it succeeded, it will continue until timed out or cancelled.
   *
   * @param host host of the target client.
   * @param port port of the target client.
   * @param ctx
   */
  public async holePunchReverse(
    host: Host,
    port: Port,
    ctx?: Partial<ContextTimed>,
  ): Promise<void>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async holePunchReverse(
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
        await this.quicSocket.send(Buffer.from(message), port, host);
        await Promise.race([utils.sleep(delay), endedProm.p]);
        if (ended) break;
        delay *= 2;
      }
    } finally {
      onAbort();
      await timer;
    }
  }

  /**
   * Will attempt to find a connection via a Kademlia search.
   * The connection will be established in the process.
   * @param targetNodeId Id of the node we are tying to find
   * @param pingTimeoutTime timeout for any ping attempts
   * @param ctx
   */
  public findNode(
    targetNodeId: NodeId,
    pingTimeoutTime?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<NodeAddress | undefined>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(true)
  public async findNode(
    targetNodeId: NodeId,
    pingTimeoutTime: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<NodeAddress | undefined> {
    this.logger.debug(
      `Finding address for ${nodesUtils.encodeNodeId(targetNodeId)}`,
    );
    // First check if we already have an existing ID -> address record
    let address = (await this.nodeGraph.getNode(targetNodeId))?.address;
    if (address != null) {
      this.logger.debug(
        `found address for ${nodesUtils.encodeNodeId(targetNodeId)} at ${
          address.host
        }:${address.port}`,
      );
      return address;
    } else {
      this.logger.debug(`attempting to find in the network`);
    }
    // Otherwise, attempt to locate it by contacting network
    address = await this.getClosestGlobalNodes(
      targetNodeId,
      pingTimeoutTime ?? this.connectionConnectTimeoutTime,
      ctx,
    );
    if (address != null) {
      this.logger.debug(
        `found address for ${nodesUtils.encodeNodeId(targetNodeId)} at ${
          address.host
        }:${address.port}`,
      );
    } else {
      this.logger.debug(`no address found`);
    }
    return address;
  }

  /**
   * Attempts to locate a target node in the network (using Kademlia).
   * Adds all discovered, active nodes to the current node's database (up to k
   * discovered nodes).
   * Once the target node is found, the method returns and stops trying to locate
   * other nodes.
   *
   * Ultimately, attempts to perform a "DNS resolution" on the given target node
   * ID (i.e. given a node ID, retrieves the node address, containing its IP and
   * port).
   * @param targetNodeId ID of the node attempting to be found (i.e. attempting
   * to find its IP address and port)
   * @param pingTimeoutTime
   * @param ctx
   * @returns whether the target node was located in the process
   */
  public getClosestGlobalNodes(
    targetNodeId: NodeId,
    pingTimeoutTime?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<NodeAddress | undefined>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(true)
  public async getClosestGlobalNodes(
    targetNodeId: NodeId,
    pingTimeoutTime: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<NodeAddress | undefined> {
    const localNodeId = this.keyRing.getNodeId();
    // Let foundTarget: boolean = false;
    let foundAddress: NodeAddress | undefined = undefined;
    // Get the closest alpha nodes to the target node (set as shortlist)
    const shortlist = await this.nodeGraph.getClosestNodes(
      targetNodeId,
      this.connectionFindConcurrencyLimit,
    );
    // If we have no nodes at all in our database (even after synchronising),
    // then we should return nothing. We aren't going to find any others
    if (shortlist.length === 0) {
      this.logger.debug('Node graph was empty, No nodes to query');
      return;
    }
    // Need to keep track of the nodes that have been contacted
    // Not sufficient to simply check if there's already a pre-existing connection
    // in nodeConnections - what if there's been more than 1 invocation of
    // getClosestGlobalNodes()?
    const contacted: Set<string> = new Set();
    // Iterate until we've found and contacted k nodes
    while (contacted.size <= this.nodeGraph.nodeBucketLimit) {
      if (ctx.signal?.aborted) return;
      // Remove the node from the front of the array
      const nextNode = shortlist.shift();
      // If we have no nodes left in the shortlist, then stop
      if (nextNode == null) {
        break;
      }
      const [nextNodeId, nextNodeAddress] = nextNode;
      this.logger.debug(
        `asking ${nodesUtils.encodeNodeId(
          nextNodeId,
        )} for closes nodes to ${nodesUtils.encodeNodeId(targetNodeId)}`,
      );
      // Skip if the node has already been contacted
      if (contacted.has(nextNodeId.toString())) continue;
      // Connect to the node (check if pre-existing connection exists, otherwise
      // create a new one)
      if (
        !(await this.pingNode(
          nextNodeId,
          nextNodeAddress.address.host,
          nextNodeAddress.address.port,
          {
            signal: ctx.signal,
            timer: pingTimeoutTime ?? this.connectionConnectTimeoutTime,
          },
        ))
      ) {
        continue;
      }
      contacted[nextNodeId] = true;
      // Ask the node to get their own closest nodes to the target
      let foundClosest: Array<[NodeId, NodeData]>;
      try {
        foundClosest = await this.getRemoteNodeClosestNodes(
          nextNodeId,
          targetNodeId,
          { signal: ctx.signal },
        );
      } catch (e) {
        if (e instanceof nodesErrors.ErrorNodeConnectionTimeout) return;
        throw e;
      }
      if (foundClosest.length === 0) continue;
      // Check to see if any of these are the target node. At the same time, add
      // them to the shortlist
      for (const [nodeId, nodeData] of foundClosest) {
        if (ctx.signal?.aborted) return;
        // Ignore any nodes that have been contacted or our own node
        if (contacted[nodeId] || localNodeId.equals(nodeId)) {
          continue;
        }
        if (
          nodeId.equals(targetNodeId) &&
          (await this.pingNode(
            nodeId,
            nodeData.address.host,
            nodeData.address.port,
            {
              signal: ctx.signal,
              timer: pingTimeoutTime ?? this.connectionConnectTimeoutTime,
            },
          ))
        ) {
          foundAddress = nodeData.address;
          // We have found the target node, so we can stop trying to look for it
          // in the shortlist
          break;
        }
        shortlist.push([nodeId, nodeData]);
      }
      // To make the number of jumps relatively short, should connect to the nodes
      // closest to the target first, and ask if they know of any closer nodes
      // than we can simply unshift the first (closest) element from the shortlist
      const distance = (nodeId: NodeId) =>
        nodesUtils.nodeDistance(targetNodeId, nodeId);
      shortlist.sort(function ([nodeIdA], [nodeIdB]) {
        const distanceA = distance(nodeIdA);
        const distanceB = distance(nodeIdB);
        if (distanceA > distanceB) {
          return 1;
        } else if (distanceA < distanceB) {
          return -1;
        } else {
          return 0;
        }
      });
    }
    return foundAddress;
  }

  /**
   * Performs an RPC request to retrieve the closest nodes relative to the given
   * target node ID.
   * @param nodeId the node ID to search on
   * @param targetNodeId the node ID to find other nodes closest to it
   * @param ctx
   */
  public getRemoteNodeClosestNodes(
    nodeId: NodeId,
    targetNodeId: NodeId,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<Array<[NodeId, NodeData]>>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async getRemoteNodeClosestNodes(
    nodeId: NodeId,
    targetNodeId: NodeId,
    @context ctx: ContextTimed,
  ): Promise<Array<[NodeId, NodeData]>> {
    try {
      // Send through client
      return await this.withConnF(
        nodeId,
        async (connection) => {
          const client = connection.getClient();
          const closestNodes = await client.methods.nodesClosestLocalNodesGet(
            { nodeIdEncoded: nodesUtils.encodeNodeId(targetNodeId) },
            ctx,
          );
          const localNodeId = this.keyRing.getNodeId();
          const nodes: Array<[NodeId, NodeData]> = [];
          for await (const result of closestNodes) {
            const nodeId = nodesUtils.decodeNodeId(result.nodeIdEncoded);
            // If the nodeId is not valid we don't add it to the list of nodes
            // Our own nodeId is considered not valid here
            if (nodeId != null && !localNodeId.equals(nodeId)) {
              nodes.push([
                nodeId,
                {
                  address: {
                    host: result.host as Host | Hostname,
                    port: result.port as Port,
                  },
                  // Not really needed
                  // But if it's needed then we need to add the information to the proto definition
                  lastUpdated: 0,
                },
              ]);
            }
          }
          return nodes;
        },
        ctx,
      );
    } catch (e) {
      if (nodesUtils.isConnectionError(e)) {
        return [];
      }
      throw e;
    }
  }

  /**
   * Performs an RPC request to send a hole-punch message to the target. Used to
   * initially establish the NodeConnection from source to target.
   *
   * @param relayNodeId node ID of the relay node (i.e. the seed node)
   * @param sourceNodeId node ID of the current node (i.e. the sender)
   * @param targetNodeId node ID of the target node to hole punch
   * @param address
   * @param ctx
   */
  public sendSignalingMessage(
    relayNodeId: NodeId,
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    address?: NodeAddress,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async sendSignalingMessage(
    relayNodeId: NodeId,
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    address: NodeAddress | undefined,
    @context ctx: ContextTimed,
  ): Promise<void> {
    if (
      this.keyRing.getNodeId().equals(relayNodeId) ||
      this.keyRing.getNodeId().equals(targetNodeId)
    ) {
      // Logging and silently dropping operation
      this.logger.debug(
        'Attempted to send signaling message to our own NodeId',
      );
      return;
    }
    const rlyNode = nodesUtils.encodeNodeId(relayNodeId);
    const srcNode = nodesUtils.encodeNodeId(sourceNodeId);
    const tgtNode = nodesUtils.encodeNodeId(targetNodeId);
    const addressString =
      address != null ? `, address: ${address.host}:${address.port}` : '';
    this.logger.debug(
      `sendSignalingMessage sending Signaling message relay: ${rlyNode}, source: ${srcNode}, target: ${tgtNode}${addressString}`,
    );
    // Send message and ignore any error
    await this.withConnF(
      relayNodeId,
      async (connection) => {
        const client = connection.getClient();
        await client.methods.nodesHolePunchMessageSend(
          {
            srcIdEncoded: srcNode,
            dstIdEncoded: tgtNode,
            address,
          },
          ctx,
        );
      },
      ctx,
    ).catch(() => {});
  }

  /**
   * Forwards a received hole punch message on to the target.
   * If not known, the node ID -> address mapping is attempted to be discovered
   * through Kademlia (note, however, this is currently only called by a 'broker'
   * node).
   * @param message the original relay message (assumed to be created in
   * nodeConnection.start())
   * @param sourceAddress
   * @param ctx
   */
  public relaySignalingMessage(
    message: HolePunchRelayMessage,
    sourceAddress: NodeAddress,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async relaySignalingMessage(
    message: HolePunchRelayMessage,
    sourceAddress: NodeAddress,
    @context ctx: ContextTimed,
  ): Promise<void> {
    // First check if we already have an existing ID -> address record
    // If we're relaying then we trust our own node graph records over
    // what was provided in the message
    const sourceNode = ids.parseNodeId(message.srcIdEncoded);
    await this.sendSignalingMessage(
      ids.parseNodeId(message.dstIdEncoded),
      sourceNode,
      ids.parseNodeId(message.dstIdEncoded),
      sourceAddress,
      ctx,
    );
  }

  /**
   * Returns an array of the seed nodes.
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public getSeedNodes(): Array<NodeId> {
    return Object.keys(this.seedNodes).map((nodeIdEncoded) => {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      if (nodeId == null) utils.never();
      return nodeId;
    });
  }

  /**
   * Returns true if the given node is a seed node.
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public isSeedNode(nodeId: NodeId): boolean {
    const seedNodes = this.getSeedNodes();
    return !!seedNodes.find((seedNode) => {
      return nodeId.equals(seedNode);
    });
  }

  /**
   * Checks if a connection can be made to the target. Returns true if the
   * connection can be authenticated, it's certificate matches the nodeId and
   * the addresses match if provided. Otherwise, returns false.
   * @param nodeId - NodeId of the target
   * @param host - Host of the target node
   * @param port - Port of the target node
   * @param ctx
   */
  public pingNode(
    nodeId: NodeId,
    host: Host | Hostname,
    port: Port,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<boolean>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async pingNode(
    nodeId: NodeId,
    host: Host,
    port: Port,
    @context ctx: ContextTimed,
  ): Promise<boolean> {
    try {
      await this.getConnectionWithAddress(
        nodeId,
        {
          host,
          port,
        },
        ctx,
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Used to start connections to multiple nodes and hosts at the same time.
   * The main use-case is to connect to multiple seed nodes on the same hostname.
   * @param nodeIds
   * @param addresses
   * @param ctx
   */
  public getMultiConnection(
    nodeIds: Array<NodeId>,
    addresses: Array<NodeAddress>,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<Array<NodeId>>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async getMultiConnection(
    nodeIds: Array<NodeId>,
    addresses: Array<NodeAddress>,
    @context ctx: ContextTimed,
  ): Promise<Array<NodeId>> {
    const locks: Array<LockRequest<Lock>> = nodeIds.map((nodeId) => {
      return [nodeId.toString(), Lock, ctx];
    });
    return await this.connectionLocks.withF(...locks, async () => {
      const results = await this.establishMultiConnection(
        nodeIds,
        addresses,
        ctx,
      );
      const resultsArray: Array<NodeId> = [];
      for (const [nodeIdString] of results) {
        resultsArray.push(IdInternal.fromString<NodeId>(nodeIdString));
      }
      return resultsArray;
    });
  }

  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public hasConnection(nodeId: NodeId): boolean {
    return this.connections.has(nodeId.toString() as NodeIdString);
  }

  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public listConnections(): Array<{
    nodeId: NodeId;
    address: { host: Host; port: Port; hostname: Hostname | undefined };
    usageCount: number;
    timeout: number | undefined;
  }> {
    const results: Array<{
      nodeId: NodeId;
      address: { host: Host; port: Port; hostname: Hostname | undefined };
      usageCount: number;
      timeout: number | undefined;
    }> = [];
    for (const [
      nodeIdString,
      connectionAndTimer,
    ] of this.connections.entries()) {
      const connection = connectionAndTimer.connection;
      const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
      results.push({
        nodeId,
        address: {
          host: connection.host,
          port: connection.port,
          hostname: connection.hostname,
        },
        usageCount: connectionAndTimer.usageCount,
        timeout: connectionAndTimer.timer?.getTimeout(),
      });
    }
    return results;
  }

  public updateTlsConfig(tlsConfig: TLSConfig) {
    this.tlsConfig = tlsConfig;
    this.quicServer.updateConfig({
      key: tlsConfig.keyPrivatePem,
      cert: tlsConfig.certChainPem,
    });
  }

  /**
   * This attempts the NAT hole punch procedure. It will return a
   * `PromiseCancellable` that will resolve once the procedure times out, is
   * cancelled or the other end responds.
   *
   * This is pretty simple, it will contact all known seed nodes and get them to
   * relay a punch signal message.
   *
   * Note: Avoid using a large set of target nodes, It could trigger a large
   * amount of pings to a single target.
   */
  protected initiateHolePunch(
    targetNodeIds: Array<NodeId>,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<void>;
  @timedCancellable(true)
  protected async initiateHolePunch(
    targetNodeIds: Array<NodeId>,
    @context ctx: ContextTimed,
  ): Promise<void> {
    const seedNodes = this.getSeedNodes();
    const allProms: Array<Promise<Array<void>>> = [];
    for (const targetNodeId of targetNodeIds) {
      if (!this.isSeedNode(targetNodeId)) {
        const holePunchProms = seedNodes.map((seedNodeId) => {
          return (
            this.sendSignalingMessage(
              seedNodeId,
              this.keyRing.getNodeId(),
              targetNodeId,
              undefined,
              ctx,
            )
              // Ignore results
              .then(
                () => {},
                () => {},
              )
          );
        });
        allProms.push(Promise.all(holePunchProms));
      }
    }
    await Promise.all(allProms).catch();
  }
}

export default NodeConnectionManager;
