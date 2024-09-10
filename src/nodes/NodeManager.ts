import type { DB, DBTransaction } from '@matrixai/db';
import type { ContextTimed, ContextTimedInput } from '@matrixai/contexts';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { ResourceAcquire } from '@matrixai/resources';
import type KeyRing from '../keys/KeyRing';
import type Sigchain from '../sigchain/Sigchain';
import type TaskManager from '../tasks/TaskManager';
import type GestaltGraph from '../gestalts/GestaltGraph';
import type {
  TaskHandler,
  TaskHandlerId,
  Task,
  TaskInfo,
} from '../tasks/types';
import type { SignedTokenEncoded } from '../tokens/types';
import type { Host, Port } from '../network/types';
import type {
  Claim,
  ClaimId,
  ClaimIdEncoded,
  SignedClaim,
} from '../claims/types';
import type { ClaimLinkNode } from '../claims/payloads';
import type NodeConnection from '../nodes/NodeConnection';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AgentClaimMessage,
} from './agent/types';
import type {
  NodeId,
  NodeAddress,
  NodeBucket,
  NodeBucketIndex,
  NodeContactAddressData,
  NodeIdEncoded,
} from './types';
import type NodeConnectionManager from './NodeConnectionManager';
import type NodeGraph from './NodeGraph';
import type { ServicePOJO } from '@matrixai/mdns';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import { Semaphore, Lock } from '@matrixai/async-locks';
import { IdInternal } from '@matrixai/id';
import { timedCancellable, context } from '@matrixai/contexts/dist/decorators';
import { withF } from '@matrixai/resources';
import { MDNS, events as mdnsEvents, utils as mdnsUtils } from '@matrixai/mdns';
import * as nodesUtils from './utils';
import * as nodesEvents from './events';
import * as nodesErrors from './errors';
import * as agentErrors from './agent/errors';
import NodeConnectionQueue from './NodeConnectionQueue';
import { assertClaimNetworkAuthority } from '../claims/payloads/claimNetworkAuthority';
import { assertClaimNetworkAccess } from '../claims/payloads/claimNetworkAccess';
import Token from '../tokens/Token';
import * as keysUtils from '../keys/utils';
import * as tasksErrors from '../tasks/errors';
import * as claimsUtils from '../claims/utils';
import * as claimsErrors from '../claims/errors';
import * as utils from '../utils/utils';
import config from '../config';
import * as networkUtils from '../network/utils';

const abortEphemeralTaskReason = Symbol('abort ephemeral task reason');
const abortSingletonTaskReason = Symbol('abort singleton task reason');
const abortPendingConnectionsReason = Symbol(
  'abort pending connections reason',
);

/**
 * NodeManager manages all operations involving nodes.
 * It encapsulates mutations to the NodeGraph.
 * It listens to the NodeConnectionManager events.
 */
interface NodeManager extends StartStop {}
@StartStop({
  eventStart: nodesEvents.EventNodeManagerStart,
  eventStarted: nodesEvents.EventNodeManagerStarted,
  eventStop: nodesEvents.EventNodeManagerStop,
  eventStopped: nodesEvents.EventNodeManagerStopped,
})
class NodeManager {
  /**
   * Time used to establish `NodeConnection`
   */
  public readonly connectionConnectTimeoutTime: number;

  public readonly refreshBucketDelayTime: number;
  public readonly refreshBucketDelayJitter: number;
  /**
   * Interval used to reestablish connections to maintain network health.
   * Will trigger a refreshBucket for bucket 255 if it is missing connections.
   * Will always trigger a findNode(this.keyRing.getNodeId()).
   */
  public readonly retryConnectionsDelayTime: number;
  /**
   * Timeout for finding a connection via MDNS
   */
  public readonly connectionFindMDNSTimeoutTime: number;
  public readonly tasksPath = 'NodeManager';

  protected db: DB;
  protected logger: Logger;
  protected keyRing: KeyRing;
  protected sigchain: Sigchain;
  protected gestaltGraph: GestaltGraph;
  protected taskManager: TaskManager;
  protected nodeGraph: NodeGraph;
  protected nodeConnectionManager: NodeConnectionManager;
  protected mdnsOptions:
    | {
        groups: Array<Host>;
        port: Port;
      }
    | undefined;
  protected mdns: MDNS | undefined;

  protected pendingNodes: Map<
    number,
    Map<string, [NodeAddress, NodeContactAddressData]>
  > = new Map();
  protected concurrencyLimit = 3;
  protected dnsServers: Array<string> | undefined = undefined;

  protected refreshBucketHandler: TaskHandler = async (
    ctx,
    _taskInfo,
    bucketIndex: NodeBucketIndex,
  ) => {
    // Don't use defaults like this
    // if a default is to be used
    // provide it directly

    await this.refreshBucket(
      bucketIndex,
      this.connectionConnectTimeoutTime,
      ctx,
    );
    // When completed reschedule the task
    // if refreshBucketDelay is 0 then it's considered disabled
    if (this.refreshBucketDelayTime > 0) {
      const jitter = nodesUtils.refreshBucketsDelayJitter(
        this.refreshBucketDelayTime,
        this.refreshBucketDelayJitter,
      );
      await this.taskManager.scheduleTask({
        delay: this.refreshBucketDelayTime + jitter,
        handlerId: this.refreshBucketHandlerId,
        lazy: true,
        parameters: [bucketIndex],
        path: [this.tasksPath, this.refreshBucketHandlerId, `${bucketIndex}`],
        priority: 0,
      });
    }
  };

  public readonly refreshBucketHandlerId =
    `${this.tasksPath}.refreshBucketHandler` as TaskHandlerId;

  protected gcBucketHandler: TaskHandler = async (
    ctx,
    _taskInfo,
    bucketIndex: number,
  ) => {
    await this.garbageCollectBucket(
      bucketIndex,
      this.connectionConnectTimeoutTime,
      ctx,
    );
    // Checking for any new pending tasks
    const pendingNodesRemaining = this.pendingNodes.get(bucketIndex);
    if (pendingNodesRemaining == null || pendingNodesRemaining.size === 0) {
      return;
    }
    // Re-schedule the task
    await this.setupGCTask(bucketIndex);
  };

  public readonly gcBucketHandlerId =
    `${this.tasksPath}.gcBucketHandler` as TaskHandlerId;

  protected checkConnectionsHandler: TaskHandler = async (ctx, taskInfo) => {
    this.logger.debug('Checking connections');
    let connectionCount = 0;
    for (const connection of this.nodeConnectionManager.listConnections()) {
      if (connection.primary) {
        const [bucketId] = this.nodeGraph.bucketIndex(connection.nodeId);
        if (bucketId === 255) connectionCount++;
      }
    }
    if (connectionCount > 0) {
      this.logger.debug('triggering bucket refresh for bucket 255');
      await this.updateRefreshBucketDelay(255, 0);
    }
    try {
      this.logger.debug(
        'triggering findNode for self to populate closest nodes',
      );
      await this.findNode(
        {
          nodeId: this.keyRing.getNodeId(),
        },
        ctx,
      );
    } finally {
      this.logger.debug('Checked connections');
      // Re-schedule this task
      await this.taskManager.scheduleTask({
        delay: taskInfo.delay,
        deadline: taskInfo.deadline,
        handlerId: this.checkConnectionsHandlerId,
        lazy: true,
        path: [this.tasksPath, this.checkConnectionsHandlerId],
        priority: taskInfo.priority,
      });
    }
  };

  public readonly checkConnectionsHandlerId: TaskHandlerId =
    `${this.tasksPath}.checkConnectionsHandler` as TaskHandlerId;

  protected syncNodeGraphHandler = async (
    ctx: ContextTimed,
    _taskInfo: TaskInfo | undefined,
    initialNodes: Array<[NodeIdEncoded, NodeAddress]>,
    connectionConnectTimeoutTime: number | undefined,
  ) => {
    // Establishing connections to the initial nodes
    const connectionResults = await Promise.allSettled(
      initialNodes.map(async ([nodeIdEncoded, nodeAddress]) => {
        const resolvedHosts = await networkUtils.resolveHostnames(
          [nodeAddress],
          undefined,
          this.dnsServers,
          ctx,
        );
        if (resolvedHosts.length === 0) {
          throw new nodesErrors.ErrorNodeManagerResolveNodeFailed(
            `Failed to resolve '${nodeAddress[0]}'`,
          );
        }
        const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
        if (nodeId == null) utils.never();
        return this.nodeConnectionManager.createConnectionMultiple(
          [nodeId],
          resolvedHosts,
          { timer: connectionConnectTimeoutTime, signal: ctx.signal },
        );
      }),
    );
    const successfulConnections = connectionResults.filter(
      (r) => r.status === 'fulfilled',
    ) as Array<PromiseFulfilledResult<NodeConnection>>;
    if (successfulConnections.length === 0) {
      const failedConnectionErrors = connectionResults
        .filter((r) => r.status === 'rejected')
        .map((v) => {
          if (v.status === 'rejected') return v.reason;
        });
      throw new nodesErrors.ErrorNodeManagerSyncNodeGraphFailed(
        `Failed to establish any connections with the following errors '[${failedConnectionErrors}]'`,
        {
          cause: new AggregateError(failedConnectionErrors),
        },
      );
    }
    if (ctx.signal.aborted) return;

    // Attempt a findNode operation looking for ourselves
    await this.findNode(
      {
        nodeId: this.keyRing.getNodeId(),
      },
      ctx,
    );
    if (ctx.signal.aborted) return;

    // Getting the closest node from the `NodeGraph`
    let bucketIndex: number | undefined;
    for await (const bucket of this.nodeGraph.getBuckets('distance', 'asc')) {
      bucketIndex = bucket[0];
    }
    // If no buckets then end here
    if (bucketIndex == null) return;
    // Trigger refreshBucket operations for all buckets above bucketIndex
    const refreshBuckets: Array<Promise<any>> = [];
    for (let i = bucketIndex; i < this.nodeGraph.nodeIdBits; i++) {
      const task = await this.updateRefreshBucketDelay(i, 0, false);
      refreshBuckets.push(task.promise());
    }
    const signalProm = utils.signalPromise(ctx.signal);
    await Promise.race([Promise.all(refreshBuckets), signalProm]).finally(
      async () => {
        // Clean up signal promise when done
        signalProm.cancel();
        await signalProm;
      },
    );
  };

  public readonly syncNodeGraphHandlerId: TaskHandlerId =
    `${this.tasksPath}.syncNodeGraphHandler` as TaskHandlerId;

  protected handleEventNodeConnectionManagerConnection = async (
    e: nodesEvents.EventNodeConnectionManagerConnection,
  ) => {
    await this.setNode(
      e.detail.remoteNodeId,
      [e.detail.remoteHost, e.detail.remotePort],
      // FIXME: We want to distinguish punched, direct and local connections
      {
        mode: 'direct',
        connectedTime: Date.now(),
        scopes: ['global'],
      },
      true,
      false,
    );
  };

  constructor({
    db,
    keyRing,
    sigchain,
    gestaltGraph,
    taskManager,
    nodeGraph,
    nodeConnectionManager,
    mdnsOptions,
    connectionConnectTimeoutTime = config.defaultsSystem
      .nodesConnectionConnectTimeoutTime,
    refreshBucketDelayTime = config.defaultsSystem
      .nodesRefreshBucketIntervalTime,
    refreshBucketDelayJitter = config.defaultsSystem
      .nodesRefreshBucketIntervalTimeJitter,
    retryConnectionsDelayTime = 45_000, // 45 seconds
    nodesConnectionFindLocalTimeoutTime = config.defaultsSystem
      .nodesConnectionFindLocalTimeoutTime,
    dnsServers,
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    sigchain: Sigchain;
    gestaltGraph: GestaltGraph;
    taskManager: TaskManager;
    nodeGraph: NodeGraph;
    mdnsOptions?: {
      groups: Array<Host>;
      port: Port;
    };
    nodeConnectionManager: NodeConnectionManager;
    connectionConnectTimeoutTime?: number;
    refreshBucketDelayTime?: number;
    refreshBucketDelayJitter?: number;
    retryConnectionsDelayTime?: number;
    nodesConnectionFindLocalTimeoutTime?: number;
    dnsServers?: Array<string>;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.db = db;
    this.keyRing = keyRing;
    this.sigchain = sigchain;
    this.nodeConnectionManager = nodeConnectionManager;
    this.nodeGraph = nodeGraph;
    this.taskManager = taskManager;
    this.gestaltGraph = gestaltGraph;
    this.mdnsOptions = mdnsOptions;
    if (mdnsOptions != null) {
      this.mdns = new MDNS({ logger: this.logger.getChild(MDNS.name) });
    }
    this.connectionConnectTimeoutTime = connectionConnectTimeoutTime;
    this.refreshBucketDelayTime = refreshBucketDelayTime;
    this.refreshBucketDelayJitter = Math.max(0, refreshBucketDelayJitter);
    this.retryConnectionsDelayTime = retryConnectionsDelayTime;
    this.connectionFindMDNSTimeoutTime = nodesConnectionFindLocalTimeoutTime;
    if (dnsServers != null) {
      this.logger.info(
        `Overriding DNS resolution servers with ${JSON.stringify(dnsServers)}`,
      );
    }
    this.dnsServers = dnsServers;
  }

  public async start() {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.taskManager.registerHandler(
      this.refreshBucketHandlerId,
      this.refreshBucketHandler,
    );
    this.taskManager.registerHandler(
      this.gcBucketHandlerId,
      this.gcBucketHandler,
    );
    this.taskManager.registerHandler(
      this.checkConnectionsHandlerId,
      this.checkConnectionsHandler,
    );
    this.taskManager.registerHandler(
      this.syncNodeGraphHandlerId,
      this.syncNodeGraphHandler,
    );
    await this.setupRefreshBucketTasks();
    // Can be disabled with 0 delay, only use for testing
    if (this.retryConnectionsDelayTime > 0) {
      await this.taskManager.scheduleTask({
        delay: this.retryConnectionsDelayTime,
        handlerId: this.checkConnectionsHandlerId,
        lazy: true,
        path: [this.tasksPath, this.checkConnectionsHandlerId],
      });
    }
    // Starting MDNS
    if (this.mdns != null) {
      const nodeId = this.keyRing.getNodeId();
      await this.mdns.start({
        id: nodeId.toBuffer().readUint16BE(),
        hostname: nodesUtils.encodeNodeId(nodeId),
        groups: this.mdnsOptions!.groups,
        port: this.mdnsOptions!.port,
      });
      this.mdns.registerService({
        name: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
        port: this.nodeConnectionManager.port,
        type: 'polykey',
        protocol: 'udp',
      });
    }
    // Add handling for connections
    this.nodeConnectionManager.addEventListener(
      nodesEvents.EventNodeConnectionManagerConnection.name,
      this.handleEventNodeConnectionManagerConnection,
    );
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    // Remove handling for connections
    this.nodeConnectionManager.removeEventListener(
      nodesEvents.EventNodeConnectionManagerConnection.name,
      this.handleEventNodeConnectionManagerConnection,
    );
    await this.mdns?.stop();
    // Cancels all NodeManager tasks
    const taskPs: Array<Promise<any>> = [];
    for await (const task of this.taskManager.getTasks(undefined, false, [
      this.tasksPath,
    ])) {
      taskPs.push(task.promise());
      task.cancel(abortEphemeralTaskReason);
    }
    await Promise.allSettled(taskPs);
    this.taskManager.deregisterHandler(this.refreshBucketHandlerId);
    this.taskManager.deregisterHandler(this.gcBucketHandlerId);
    this.taskManager.deregisterHandler(this.checkConnectionsHandlerId);
    this.taskManager.deregisterHandler(this.syncNodeGraphHandlerId);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * For usage with withF, to acquire a connection
   * This unique acquire function structure of returning the ResourceAcquire
   * itself is such that we can pass targetNodeId as a parameter (as opposed to
   * an acquire function with no parameters).
   * @param nodeId Id of target node to communicate with
   * @param ctx
   * @returns ResourceAcquire Resource API for use in with contexts
   */
  public acquireConnection(
    nodeId: NodeId,
    ctx?: Partial<ContextTimedInput>,
  ): ResourceAcquire<NodeConnection> {
    if (this.keyRing.getNodeId().equals(nodeId)) {
      this.logger.warn('Attempting connection to our own NodeId');
      throw new nodesErrors.ErrorNodeManagerNodeIdOwn();
    }
    return async () => {
      // Checking if connection already exists
      if (!this.nodeConnectionManager.hasConnection(nodeId)) {
        // Establish the connection
        const result = await this.findNode(
          {
            nodeId: nodeId,
          },
          ctx,
        );
        if (result == null) {
          throw new nodesErrors.ErrorNodeManagerConnectionFailed();
        }
      }
      return await this.nodeConnectionManager.acquireConnection(nodeId)();
    };
  }

  /**
   * Perform some function on another node over the network with a connection.
   * Will either retrieve an existing connection, or create a new one if it
   * doesn't exist.
   * for use with normal arrow function
   * @param nodeId Id of target node to communicate with
   * @param f Function to handle communication
   * @param ctx
   */
  public withConnF<T>(
    nodeId: NodeId,
    f: (conn: NodeConnection) => Promise<T>,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<T>;
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public async withConnF<T>(
    nodeId: NodeId,
    f: (conn: NodeConnection) => Promise<T>,
    @context ctx: ContextTimed,
  ) {
    return await withF(
      [this.acquireConnection(nodeId, ctx)],
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
   * @param nodeId Id of target node to communicate with
   * @param g Generator function to handle communication
   * @param ctx
   */
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public async *withConnG<T, TReturn, TNext>(
    nodeId: NodeId,
    g: (conn: NodeConnection) => AsyncGenerator<T, TReturn, TNext>,
    ctx?: Partial<ContextTimedInput>,
  ): AsyncGenerator<T, TReturn, TNext> {
    const acquire = this.acquireConnection(nodeId, ctx);
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
  }

  /**
   * Will attempt to find a node within the network using a hybrid strategy of
   * attempting signalled connections, direct connections and checking MDNS.
   *
   * Will attempt to fix regardless of existing connection.
   * @param nodeId - NodeId of target to find.
   * @param connectionConnectTimeoutTime - timeout time for each individual connection.
   * @param connectionFindLocalTimeoutTime
   * @param concurrencyLimit - Limit the number of concurrent connections.
   * @param limit - Limit the number of total connections to be made before giving up.
   * @param ctx
   */
  public findNode(
    {
      nodeId,
      connectionConnectTimeoutTime,
      connectionFindMDNSTimeoutTime,
      concurrencyLimit,
      limit,
    }: {
      nodeId: NodeId;
      connectionConnectTimeoutTime?: number;
      connectionFindMDNSTimeoutTime?: number;
      concurrencyLimit?: number;
      limit?: number;
    },
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<[NodeAddress, NodeContactAddressData] | undefined>;
  @timedCancellable(true)
  public async findNode(
    {
      nodeId,
      connectionConnectTimeoutTime = this.connectionConnectTimeoutTime,
      connectionFindMDNSTimeoutTime = this.connectionFindMDNSTimeoutTime,
      concurrencyLimit = this.concurrencyLimit,
      limit = this.nodeGraph.nodeBucketLimit,
    }: {
      nodeId: NodeId;
      connectionConnectTimeoutTime: number;
      connectionFindMDNSTimeoutTime: number;
      concurrencyLimit: number;
      limit: number;
    },
    @context ctx: ContextTimed,
  ): Promise<[NodeAddress, NodeContactAddressData] | undefined> {
    // Setting up intermediate signal
    const abortController = new AbortController();
    const newCtx = {
      timer: ctx.timer,
      signal: abortController.signal,
    };
    const handleAbort = () => {
      abortController.abort(ctx.signal.reason);
    };
    if (ctx.signal.aborted) {
      handleAbort();
    } else {
      ctx.signal.addEventListener('abort', handleAbort, { once: true });
    }

    const rateLimit = new Semaphore(concurrencyLimit);
    const connectionsQueue = new NodeConnectionQueue(
      this.keyRing.getNodeId(),
      nodeId,
      limit,
      rateLimit,
      rateLimit,
    );

    // Starting discovery strategies
    const findBySignal = this.findNodeBySignal(
      nodeId,
      connectionsQueue,
      connectionConnectTimeoutTime,
      newCtx,
    );
    const findByDirect = this.findNodeByDirect(
      nodeId,
      connectionsQueue,
      connectionConnectTimeoutTime,
      newCtx,
    );
    const findByMDNS = this.findNodeByMDNS(nodeId, {
      timer: connectionFindMDNSTimeoutTime,
      signal: newCtx.signal,
    });

    try {
      return await Promise.any([findBySignal, findByDirect, findByMDNS]);
    } catch (e) {
      // TODO: definitely fix this while I'm here..
      // FIXME: check error type and throw if not connection related failure
      return;
    } finally {
      abortController.abort(abortPendingConnectionsReason);
      await Promise.allSettled([findBySignal, findByDirect, findByMDNS]);
      ctx.signal.removeEventListener('abort', handleAbort);
    }
  }

  /**
   * Will try to make a connection to the node using hole punched connections only
   *
   * @param nodeId - NodeId of the target to find.
   * @param nodeConnectionsQueue - shared nodeConnectionQueue helper class.
   * @param connectionConnectTimeoutTime - timeout time for each individual connection.
   * @param ctx
   */
  public findNodeBySignal(
    nodeId: NodeId,
    nodeConnectionsQueue: NodeConnectionQueue,
    connectionConnectTimeoutTime?: number,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<[[Host, Port], NodeContactAddressData]>;
  @timedCancellable(true)
  public async findNodeBySignal(
    nodeId: NodeId,
    nodeConnectionsQueue: NodeConnectionQueue,
    connectionConnectTimeoutTime: number = this.connectionConnectTimeoutTime,
    @context ctx: ContextTimed,
  ): Promise<[[Host, Port], NodeContactAddressData]> {
    // Setting up intermediate signal
    const abortController = new AbortController();
    utils.setMaxListeners(abortController.signal);
    const newCtx = {
      timer: ctx.timer,
      signal: abortController.signal,
    };
    const handleAbort = () => {
      abortController.abort(ctx.signal.reason);
    };
    if (ctx.signal.aborted) {
      handleAbort();
    } else {
      ctx.signal.addEventListener('abort', handleAbort, { once: true });
    }

    const chain: Map<string, string | undefined> = new Map();
    let connectionMade: [Host, Port] | undefined;

    // Seed the initial queue
    for (const {
      nodeId: nodeIdConnected,
    } of this.nodeConnectionManager.getClosestConnections(nodeId)) {
      nodeConnectionsQueue.queueNodeSignal(nodeIdConnected, undefined);
    }

    while (true) {
      const isDone = await nodeConnectionsQueue.withNodeSignal(
        async (nodeIdTarget, nodeIdSignaller) => {
          let nodeConnection: NodeConnection | undefined;
          if (
            !this.nodeConnectionManager.hasConnection(nodeIdTarget) &&
            nodeIdSignaller != null
          ) {
            this.logger.debug(
              `attempting connection to ${nodesUtils.encodeNodeId(
                nodeIdTarget,
              )} via ${nodesUtils.encodeNodeId(nodeIdSignaller)}`,
            );
            nodeConnection =
              await this.nodeConnectionManager.createConnectionPunch(
                nodeIdTarget,
                nodeIdSignaller,
                {
                  timer: connectionConnectTimeoutTime,
                  signal: newCtx.signal,
                },
              );
            // If connection succeeds add it to the chain
            chain.set(nodeIdTarget.toString(), nodeIdSignaller?.toString());
          }
          nodeConnectionsQueue.contactedNode(nodeIdTarget);
          // If connection was our target then we're done
          if (nodeId.toString() === nodeIdTarget.toString()) {
            nodeConnection =
              nodeConnection ??
              this.nodeConnectionManager.getConnection(nodeIdTarget)
                ?.connection;
            if (nodeConnection == null) utils.never('connection should exist');
            connectionMade = [nodeConnection.host, nodeConnection.port];
            return true;
          }
          await this.queueDataFromRequest(
            nodeIdTarget,
            nodeId,
            nodeConnectionsQueue,
            newCtx,
          );
          this.logger.debug(
            `connection attempt to ${nodesUtils.encodeNodeId(
              nodeIdTarget,
            )} succeeded`,
          );
          return false;
        },
        newCtx,
      );
      if (isDone) break;
    }
    // After queue is done we want to signal and await clean up
    abortController.abort(abortPendingConnectionsReason);
    ctx.signal.removeEventListener('abort', handleAbort);
    // Wait for pending attempts to finish
    for (const pendingP of nodeConnectionsQueue.nodesRunningSignal) {
      await pendingP.catch((e) => {
        if (e instanceof nodesErrors.ErrorNodeConnectionTimeout) return;
        throw e;
      });
    }

    // Connection was not made
    if (connectionMade == null) {
      throw new nodesErrors.ErrorNodeManagerFindNodeFailed(
        'failed to find node via signal',
      );
    }
    // We can get the path taken with this code
    // const path: Array<NodeId> = [];
    // let current: string | undefined = nodeId.toString();
    // while (current != null) {
    //   const nodeId = IdInternal.fromString<NodeId>(current);
    //   path.unshift(nodeId);
    //   current = chain.get(current);
    // }
    // console.log(path);
    return [
      connectionMade,
      {
        mode: 'signal',
        connectedTime: Date.now(),
        scopes: ['global'],
      },
    ] as [[Host, Port], NodeContactAddressData];
  }

  /**
   * Will try to make a connection to the node using direct connections only
   *
   * @param nodeId - NodeId of the target to find.
   * @param nodeConnectionsQueue - shared nodeConnectionQueue helper class.
   * @param connectionConnectTimeoutTime - timeout time for each individual connection.
   * @param ctx
   */
  public findNodeByDirect(
    nodeId: NodeId,
    nodeConnectionsQueue: NodeConnectionQueue,
    connectionConnectTimeoutTime?: number,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<[[Host, Port], NodeContactAddressData]>;
  @timedCancellable(true)
  public async findNodeByDirect(
    nodeId: NodeId,
    nodeConnectionsQueue: NodeConnectionQueue,
    connectionConnectTimeoutTime: number = this.connectionConnectTimeoutTime,
    @context ctx: ContextTimed,
  ): Promise<[[Host, Port], NodeContactAddressData]> {
    // Setting up intermediate signal
    const abortController = new AbortController();
    utils.setMaxListeners(abortController.signal);
    const newCtx = {
      timer: ctx.timer,
      signal: abortController.signal,
    };
    const handleAbort = () => {
      abortController.abort(ctx.signal.reason);
    };
    if (ctx.signal.aborted) {
      handleAbort();
    } else {
      ctx.signal.addEventListener('abort', handleAbort, { once: true });
    }

    let connectionMade = false;

    // Seed the initial queue
    for (const [
      nodeIdTarget,
      nodeContact,
    ] of await this.nodeGraph.getClosestNodes(
      nodeId,
      this.nodeGraph.nodeBucketLimit,
    )) {
      nodeConnectionsQueue.queueNodeDirect(nodeIdTarget, nodeContact);
    }

    while (true) {
      const isDone = await nodeConnectionsQueue.withNodeDirect(
        async (nodeIdTarget, nodeContact) => {
          if (!this.nodeConnectionManager.hasConnection(nodeIdTarget)) {
            this.logger.debug(
              `attempting connection to ${nodesUtils.encodeNodeId(
                nodeIdTarget,
              )} via direct connection`,
            );

            // Attempt all direct
            const addresses: Array<NodeAddress> = [];
            for (const [
              nodeContactAddress,
              nodeContactAddressData,
            ] of Object.entries(nodeContact)) {
              const [host, port] =
                nodesUtils.parseNodeContactAddress(nodeContactAddress);
              if (nodeContactAddressData.mode === 'direct') {
                addresses.push([host, port]);
              }
            }
            const resolvedHosts = await networkUtils.resolveHostnames(
              addresses,
              undefined,
              this.dnsServers,
              ctx,
            );

            try {
              await this.nodeConnectionManager.createConnectionMultiple(
                [nodeIdTarget],
                resolvedHosts,
                { timer: connectionConnectTimeoutTime, signal: newCtx.signal },
              );
            } catch (e) {
              if (e instanceof nodesErrors.ErrorNodeConnectionTimeout) {
                return false;
              }
              throw e;
            }
          }
          nodeConnectionsQueue.contactedNode(nodeIdTarget);
          // If connection was our target then we're done
          if (nodeId.toString() === nodeIdTarget.toString()) {
            connectionMade = true;
            return true;
          }
          await this.queueDataFromRequest(
            nodeIdTarget,
            nodeId,
            nodeConnectionsQueue,
            newCtx,
          );
          this.logger.debug(
            `connection attempt to ${nodesUtils.encodeNodeId(
              nodeIdTarget,
            )} succeeded`,
          );
          return false;
        },
        newCtx,
      );
      if (isDone) break;
    }
    // After queue is done we want to signal and await clean up
    abortController.abort(abortPendingConnectionsReason);
    ctx.signal.removeEventListener('abort', handleAbort);
    // Wait for pending attempts to finish
    for (const pendingP of nodeConnectionsQueue.nodesRunningDirect) {
      await pendingP.catch((e) => {
        if (e instanceof nodesErrors.ErrorNodeConnectionTimeout) return;
        throw e;
      });
    }

    if (!connectionMade) {
      throw new nodesErrors.ErrorNodeManagerFindNodeFailed(
        'failed to find node via direct',
      );
    }
    const conAndTimer = this.nodeConnectionManager.getConnection(nodeId);
    if (conAndTimer == null) {
      utils.never('connection should have been established');
    }
    return [
      [conAndTimer.connection.host, conAndTimer.connection.port],
      {
        mode: 'direct',
        connectedTime: Date.now(),
        scopes: ['global'],
      },
    ] as [[Host, Port], NodeContactAddressData];
  }

  /**
   * Will query via MDNS for running Polykey nodes with the matching NodeId
   *
   * @param nodeId
   * @param ctx
   */
  public queryMDNS(
    nodeId: NodeId,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<Array<[Host, Port]>>;
  @timedCancellable(
    true,
    (nodeManager: NodeManager) => nodeManager.connectionConnectTimeoutTime,
  )
  public async queryMDNS(
    nodeId: NodeId,
    @context ctx: ContextTimed,
  ): Promise<Array<[Host, Port]>> {
    const addresses: Array<[Host, Port]> = [];
    if (this.mdns == null) return addresses;
    const encodedNodeId = nodesUtils.encodeNodeId(nodeId);
    // First check if we already have an existing MDNS Service
    const mdnsOptions = { type: 'polykey', protocol: 'udp' } as const;
    let service: ServicePOJO | void = this.mdns.networkServices.get(
      mdnsUtils.toFqdn({ name: encodedNodeId, ...mdnsOptions }),
    );
    if (service == null) {
      // Setup promises
      const { p: endedP, resolveP: resolveEndedP } = utils.promise<void>();
      const abortHandler = () => {
        resolveEndedP();
      };
      ctx.signal.addEventListener('abort', abortHandler, { once: true });
      ctx.timer.catch(() => {}).finally(() => abortHandler());
      const { p: serviceP, resolveP: resolveServiceP } =
        utils.promise<ServicePOJO>();
      const handleEventMDNSService = (evt: mdnsEvents.EventMDNSService) => {
        if (evt.detail.name === encodedNodeId) {
          resolveServiceP(evt.detail);
        }
      };
      this.mdns.addEventListener(
        mdnsEvents.EventMDNSService.name,
        handleEventMDNSService,
        { once: true },
      );
      // Abort and restart query in case already running
      this.mdns.stopQuery(mdnsOptions);
      this.mdns.startQuery(mdnsOptions);
      // Race promises to find node or timeout
      service = await Promise.race([serviceP, endedP]);
      this.mdns.removeEventListener(
        mdnsEvents.EventMDNSService.name,
        handleEventMDNSService,
      );
      this.mdns.stopQuery(mdnsOptions);
      ctx.signal.removeEventListener('abort', abortHandler);
    }
    // If the service is not found, just return no addresses
    if (service == null) {
      return addresses;
    }
    for (const host_ of service.hosts) {
      let host: string;
      switch (this.nodeConnectionManager.type) {
        case 'ipv4':
          if (networkUtils.isIPv4(host_)) {
            host = host_;
          } else if (networkUtils.isIPv4MappedIPv6(host_)) {
            host = networkUtils.fromIPv4MappedIPv6(host_);
          } else {
            continue;
          }
          break;
        case 'ipv6':
          if (networkUtils.isIPv6(host_)) host = host_;
          else continue;
          break;
        case 'ipv4&ipv6':
          host = host_;
          break;
        default:
          continue;
      }
      addresses.push([host as Host, service.port as Port]);
      this.logger.debug(
        `found address for ${nodesUtils.encodeNodeId(nodeId)} at ${host}:${
          service.port
        }`,
      );
    }
    return addresses;
  }

  /**
   * Will query MDNS for local nodes and attempt a connection.
   * @param nodeId - NodeId of the target to find.
   * @param ctx
   */
  public findNodeByMDNS(
    nodeId: NodeId,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<[[Host, Port], NodeContactAddressData]>;
  @timedCancellable(
    true,
    (nodeManager: NodeManager) => nodeManager.connectionFindMDNSTimeoutTime,
  )
  public async findNodeByMDNS(
    nodeId: NodeId,
    @context ctx: ContextTimed,
  ): Promise<[[Host, Port], NodeContactAddressData]> {
    try {
      if (this.mdns == null) {
        throw new nodesErrors.ErrorNodeManagerFindNodeFailed(
          'MDNS not running',
        );
      }
      // First get the address data
      const addresses = await this.queryMDNS(nodeId, ctx);
      if (addresses.length === 0) {
        throw new nodesErrors.ErrorNodeManagerFindNodeFailed(
          'query resulted in no addresses found',
        );
      }
      // Then make the connection
      const nodeConnection =
        await this.nodeConnectionManager.createConnectionMultiple(
          [nodeId],
          addresses,
        );
      return [
        [nodeConnection.host, nodeConnection.port],
        {
          mode: 'direct',
          connectedTime: Date.now(),
          scopes: ['local'],
        },
      ] as [[Host, Port], NodeContactAddressData];
    } catch (e) {
      throw new nodesErrors.ErrorNodeManagerFindNodeFailed(
        'failed to find node via MDNS',
        { cause: e },
      );
    }
  }

  /**
   * Will ask the target node about the closest nodes to the `node`
   * and add them to the `nodeConnectionsQueue`.
   *
   * @param nodeId - node to find the closest nodes to
   * @param nodeIdTarget - node to make RPC requests to
   * @param nodeConnectionsQueue
   * @param ctx
   */
  protected async queueDataFromRequest(
    nodeId: NodeId,
    nodeIdTarget: NodeId,
    nodeConnectionsQueue: NodeConnectionQueue,
    ctx: ContextTimed,
  ) {
    await this.nodeConnectionManager.withConnF(nodeId, async (conn) => {
      const nodeIdEncoded = nodesUtils.encodeNodeId(nodeIdTarget);
      const closestConnectionsRequestP = (async () => {
        const resultStream =
          await conn.rpcClient.methods.nodesClosestActiveConnectionsGet(
            {
              nodeIdEncoded: nodeIdEncoded,
            },
            ctx,
          );
        // Collecting results
        for await (const result of resultStream) {
          const nodeIdNew = nodesUtils.decodeNodeId(result.nodeId);
          if (nodeIdNew == null) {
            utils.never('failed to decode nodeId');
          }
          nodeConnectionsQueue.queueNodeSignal(nodeIdNew, nodeId);
        }
      })();
      const closestNodesRequestP = (async () => {
        const resultStream =
          await conn.rpcClient.methods.nodesClosestLocalNodesGet({
            nodeIdEncoded: nodeIdEncoded,
          });
        for await (const { nodeIdEncoded, nodeContact } of resultStream) {
          const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
          if (nodeId == null) utils.never();
          nodeConnectionsQueue.queueNodeDirect(nodeId, nodeContact);
        }
      })();
      await Promise.allSettled([
        closestConnectionsRequestP,
        closestNodesRequestP,
      ]);
    });
  }

  /**
   * Will attempt to establish connection using `findNode` or use existing connection.
   * Will return true if connection was established or already exists, false otherwise.
   */
  public pingNode(
    nodeId: NodeId,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<[NodeAddress, NodeContactAddressData] | undefined>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async pingNode(
    nodeId: NodeId,
    @context ctx: ContextTimed,
  ): Promise<[NodeAddress, NodeContactAddressData] | undefined> {
    return await this.findNode(
      {
        nodeId: nodeId,
      },
      ctx,
    );
  }

  /**
   * Will attempt to make a direct connection without ICE.
   * This will only succeed due to these conditions
   * 1. connection already exists to target.
   * 2. Nat already allows port due to already being punched.
   * 3. Port is publicly accessible due to nat configuration .
   * Will return true if connection was established or already exists, false otherwise.
   */
  public pingNodeAddress(
    nodeId: NodeId,
    host: Host,
    port: Port,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<boolean>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connectionConnectTimeoutTime,
  )
  public async pingNodeAddress(
    nodeId: NodeId,
    host: Host,
    port: Port,
    @context ctx: ContextTimed,
  ): Promise<boolean> {
    if (this.nodeConnectionManager.hasConnection(nodeId)) return true;
    try {
      await this.nodeConnectionManager.createConnection(
        [nodeId],
        host,
        port,
        ctx,
      );
      return true;
    } catch (e) {
      if (!nodesUtils.isConnectionError(e)) throw e;
      return false;
    }
  }

  /**
   * Connects to the target node, and retrieves its sigchain data.
   * Verifies and returns the decoded chain as ChainData. Note: this will drop
   * any unverifiable claims.
   * For node1 -> node2 claims, the verification process also involves connecting
   * to node2 to verify the claim (to retrieve its signing public key).
   * @param targetNodeId Id of the node to connect request the chain data of.
   * @param claimId If set then we get the claims newer that this claim ID.
   * @param ctx
   */
  public requestChainData(
    targetNodeId: NodeId,
    claimId?: ClaimId,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<Record<ClaimId, SignedClaim>>;
  @timedCancellable(true)
  public async requestChainData(
    targetNodeId: NodeId,
    claimId: ClaimId | undefined,
    @context ctx: ContextTimed,
  ): Promise<Record<ClaimId, SignedClaim>> {
    // Verify the node's chain with its own public key
    return await this.withConnF(
      targetNodeId,
      async (connection) => {
        const claims: Record<ClaimId, SignedClaim> = {};
        const client = connection.getClient();
        for await (const agentClaim of await client.methods.nodesClaimsGet({
          claimIdEncoded:
            claimId != null
              ? claimsUtils.encodeClaimId(claimId)
              : ('' as ClaimIdEncoded),
        })) {
          if (ctx.signal.aborted) throw ctx.signal.reason;
          // Need to re-construct each claim
          const claimId: ClaimId = claimsUtils.decodeClaimId(
            agentClaim.claimIdEncoded,
          )!;
          const signedClaimEncoded = agentClaim.signedTokenEncoded;
          const signedClaim = claimsUtils.parseSignedClaim(signedClaimEncoded);
          // Verifying the claim
          const issPublicKey = keysUtils.publicKeyFromNodeId(
            nodesUtils.decodeNodeId(signedClaim.payload.iss)!,
          );
          const subPublicKey =
            signedClaim.payload.typ === 'node'
              ? keysUtils.publicKeyFromNodeId(
                  nodesUtils.decodeNodeId(signedClaim.payload.iss)!,
                )
              : null;
          const token = Token.fromSigned(signedClaim);
          if (!token.verifyWithPublicKey(issPublicKey)) {
            this.logger.warn('Failed to verify issuing node');
            continue;
          }
          if (
            subPublicKey != null &&
            !token.verifyWithPublicKey(subPublicKey)
          ) {
            this.logger.warn('Failed to verify subject node');
            continue;
          }
          claims[claimId] = signedClaim;
        }
        return claims;
      },
      ctx,
    );
  }

  /**
   * Call this function upon receiving a "claim node request" notification from
   * another node.
   */
  public claimNode(
    targetNodeId: NodeId,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public async claimNode(
    targetNodeId: NodeId,
    tran: DBTransaction | undefined,
    @context ctx: ContextTimed,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => {
        return this.claimNode(targetNodeId, tran);
      });
    }
    const [, claim] = await this.sigchain.addClaim(
      {
        typ: 'ClaimLinkNode',
        iss: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
        sub: nodesUtils.encodeNodeId(targetNodeId),
      },
      undefined,
      async (token) => {
        return this.withConnF(
          targetNodeId,
          async (conn) => {
            // 2. create the agentClaim message to send
            const halfSignedClaim = token.toSigned();
            const halfSignedClaimEncoded =
              claimsUtils.generateSignedClaim(halfSignedClaim);
            const client = conn.getClient();
            const stream = await client.methods.nodesCrossSignClaim();
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            let fullySignedToken: Token<Claim>;
            try {
              await writer.write({
                signedTokenEncoded: halfSignedClaimEncoded,
              });
              // 3. We expect to receive the doubly signed claim
              const readStatus = await reader.read();
              if (readStatus.done) {
                throw new claimsErrors.ErrorEmptyStream();
              }
              const receivedClaim = readStatus.value;
              // We need to re-construct the token from the message
              const signedClaim = claimsUtils.parseSignedClaim(
                receivedClaim.signedTokenEncoded,
              );
              fullySignedToken = Token.fromSigned(signedClaim);
              // Check that the signatures are correct
              const targetNodePublicKey =
                keysUtils.publicKeyFromNodeId(targetNodeId);
              if (
                !fullySignedToken.verifyWithPublicKey(
                  this.keyRing.keyPair.publicKey,
                ) ||
                !fullySignedToken.verifyWithPublicKey(targetNodePublicKey)
              ) {
                throw new claimsErrors.ErrorDoublySignedClaimVerificationFailed();
              }

              // Next stage is to process the claim for the other node
              const readStatus2 = await reader.read();
              if (readStatus2.done) {
                throw new claimsErrors.ErrorEmptyStream();
              }
              const receivedClaimRemote = readStatus2.value;
              // We need to re-construct the token from the message
              const signedClaimRemote = claimsUtils.parseSignedClaim(
                receivedClaimRemote.signedTokenEncoded,
              );
              // This is a singly signed claim,
              // we want to verify it before signing and sending back
              const signedTokenRemote = Token.fromSigned(signedClaimRemote);
              if (!signedTokenRemote.verifyWithPublicKey(targetNodePublicKey)) {
                throw new claimsErrors.ErrorSinglySignedClaimVerificationFailed();
              }
              signedTokenRemote.signWithPrivateKey(this.keyRing.keyPair);
              // 4. X <- responds with double signing the X signed claim <- Y
              const agentClaimedMessageRemote = claimsUtils.generateSignedClaim(
                signedTokenRemote.toSigned(),
              );
              await writer.write({
                signedTokenEncoded: agentClaimedMessageRemote,
              });

              // Check the stream is closed (should be closed by other side)
              const finalResponse = await reader.read();
              if (finalResponse.done != null) {
                await writer.close();
              }
            } catch (e) {
              await writer.abort(e);
              throw e;
            }
            return fullySignedToken;
          },
          ctx,
        );
      },
      tran,
    );
    // With the claim created we want to add it to the gestalt graph
    const issNodeInfo = {
      nodeId: this.keyRing.getNodeId(),
    };
    const subNodeInfo = {
      nodeId: targetNodeId,
    };
    await this.gestaltGraph.linkNodeAndNode(issNodeInfo, subNodeInfo, {
      claim: claim as SignedClaim<ClaimLinkNode>,
      meta: {},
    });
  }

  public async *handleClaimNode(
    requestingNodeId: NodeId,
    input: AsyncIterableIterator<AgentRPCRequestParams<AgentClaimMessage>>,
    tran?: DBTransaction,
  ): AsyncGenerator<AgentRPCResponseResult<AgentClaimMessage>> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) =>
        this.handleClaimNode(requestingNodeId, input, tran),
      );
    }
    const readStatus = await input.next();
    // If nothing to read, end and destroy
    if (readStatus.done) {
      throw new claimsErrors.ErrorEmptyStream();
    }
    const receivedMessage = readStatus.value;
    const signedClaim = claimsUtils.parseSignedClaim(
      receivedMessage.signedTokenEncoded,
    );
    const token = Token.fromSigned(signedClaim);
    // Verify if the token is signed
    if (
      !token.verifyWithPublicKey(
        keysUtils.publicKeyFromNodeId(requestingNodeId),
      )
    ) {
      throw new claimsErrors.ErrorSinglySignedClaimVerificationFailed();
    }
    // If verified, add your own signature to the received claim
    token.signWithPrivateKey(this.keyRing.keyPair);
    // Return the signed claim
    const doublySignedClaim = token.toSigned();
    const halfSignedClaimEncoded =
      claimsUtils.generateSignedClaim(doublySignedClaim);
    yield {
      signedTokenEncoded: halfSignedClaimEncoded,
    };

    // Now we want to send our own claim signed
    const halfSignedClaimProm = utils.promise<SignedTokenEncoded>();
    const claimProm = this.sigchain.addClaim(
      {
        typ: 'ClaimLinkNode',
        iss: nodesUtils.encodeNodeId(requestingNodeId),
        sub: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
      },
      undefined,
      async (token) => {
        const halfSignedClaim = token.toSigned();
        const halfSignedClaimEncoded =
          claimsUtils.generateSignedClaim(halfSignedClaim);
        halfSignedClaimProm.resolveP(halfSignedClaimEncoded);
        const readStatus = await input.next();
        if (readStatus.done) {
          throw new claimsErrors.ErrorEmptyStream();
        }
        const receivedClaim = readStatus.value;
        // We need to re-construct the token from the message
        const signedClaim = claimsUtils.parseSignedClaim(
          receivedClaim.signedTokenEncoded,
        );
        const fullySignedToken = Token.fromSigned(signedClaim);
        // Check that the signatures are correct
        const requestingNodePublicKey =
          keysUtils.publicKeyFromNodeId(requestingNodeId);
        if (
          !fullySignedToken.verifyWithPublicKey(
            this.keyRing.keyPair.publicKey,
          ) ||
          !fullySignedToken.verifyWithPublicKey(requestingNodePublicKey)
        ) {
          throw new claimsErrors.ErrorDoublySignedClaimVerificationFailed();
        }
        // Ending the stream
        return fullySignedToken;
      },
    );
    yield {
      signedTokenEncoded: await halfSignedClaimProm.p,
    };
    const [, claim] = await claimProm;
    // With the claim created we want to add it to the gestalt graph
    const issNodeInfo = {
      nodeId: requestingNodeId,
    };
    const subNodeInfo = {
      nodeId: this.keyRing.getNodeId(),
    };
    await this.gestaltGraph.linkNodeAndNode(issNodeInfo, subNodeInfo, {
      claim: claim as SignedClaim<ClaimLinkNode>,
      meta: {},
    });
  }

  public async handleClaimNetwork(
    requestingNodeId: NodeId,
    input: AgentRPCRequestParams<AgentClaimMessage>,
    tran?: DBTransaction,
  ): Promise<AgentRPCResponseResult<AgentClaimMessage>> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.handleClaimNetwork(requestingNodeId, input, tran),
      );
    }
    const signedClaim = claimsUtils.parseSignedClaim(input.signedTokenEncoded);
    const token = Token.fromSigned(signedClaim);
    // Verify if the token is signed
    if (
      !token.verifyWithPublicKey(
        keysUtils.publicKeyFromNodeId(requestingNodeId),
      )
    ) {
      throw new claimsErrors.ErrorSinglySignedClaimVerificationFailed();
    }
    // If verified, add your own signature to the received claim
    token.signWithPrivateKey(this.keyRing.keyPair);
    // Return the signed claim
    const doublySignedClaim = token.toSigned();
    const halfSignedClaimEncoded =
      claimsUtils.generateSignedClaim(doublySignedClaim);
    return {
      signedTokenEncoded: halfSignedClaimEncoded,
    };
  }

  public async handleVerifyClaimNetwork(
    requestingNodeId: NodeId,
    input: AgentRPCRequestParams<AgentClaimMessage>,
    tran?: DBTransaction,
  ): Promise<AgentRPCResponseResult<{ success: true }>> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.handleVerifyClaimNetwork(requestingNodeId, input, tran),
      );
    }
    const signedClaim = claimsUtils.parseSignedClaim(input.signedTokenEncoded);
    const token = Token.fromSigned(signedClaim);
    assertClaimNetworkAccess(token.payload);
    // Verify if the token is signed
    if (
      !token.verifyWithPublicKey(
        keysUtils.publicKeyFromNodeId(requestingNodeId),
      ) ||
      !token.verifyWithPublicKey(
        keysUtils.publicKeyFromNodeId(
          nodesUtils.decodeNodeId(token.payload.iss)!,
        ),
      )
    ) {
      throw new claimsErrors.ErrorDoublySignedClaimVerificationFailed();
    }
    if (
      token.payload.network === 'testnet.polykey.com' ||
      token.payload.network === 'mainnet.polykey.com'
    ) {
      return { success: true };
    }
    if (token.payload.signedClaimNetworkAuthorityEncoded == null) {
      throw new claimsErrors.ErrorDoublySignedClaimVerificationFailed();
    }
    const authorityToken = Token.fromEncoded(
      token.payload.signedClaimNetworkAuthorityEncoded,
    );
    // Verify if the token is signed
    if (
      token.payload.iss !== authorityToken.payload.sub ||
      !authorityToken.verifyWithPublicKey(
        keysUtils.publicKeyFromNodeId(
          nodesUtils.decodeNodeId(authorityToken.payload.sub)!,
        ),
      ) ||
      !authorityToken.verifyWithPublicKey(
        keysUtils.publicKeyFromNodeId(
          nodesUtils.decodeNodeId(authorityToken.payload.iss)!,
        ),
      )
    ) {
      throw new claimsErrors.ErrorDoublySignedClaimVerificationFailed();
    }

    let success = false;
    for await (const [_, claim] of this.sigchain.getSignedClaims({})) {
      try {
        assertClaimNetworkAccess(claim.payload);
      } catch {
        continue;
      }
      if (claim.payload.signedClaimNetworkAuthorityEncoded == null) {
        throw new claimsErrors.ErrorDoublySignedClaimVerificationFailed();
      }
      const tokenNetworkAuthority = Token.fromEncoded(
        claim.payload.signedClaimNetworkAuthorityEncoded,
      );
      try {
        assertClaimNetworkAuthority(tokenNetworkAuthority.payload);
      } catch {
        continue;
      }
      // No need to check if local claims are correctly signed by an Network Authority.
      if (
        authorityToken.verifyWithPublicKey(
          keysUtils.publicKeyFromNodeId(
            nodesUtils.decodeNodeId(claim.payload.iss)!,
          ),
        )
      ) {
        success = true;
        break;
      }
    }

    if (!success) {
      throw new agentErrors.ErrorNodesClaimNetworkVerificationFailed();
    }

    return {
      success: true,
    };
  }

  /**
   * Adds a node to the node graph. This assumes that you have already authenticated the node
   * Updates the node if the node already exists
   * This operation is blocking by default - set `block` to false to make it non-blocking
   * @param nodeId - ID of the node we wish to add
   * @param nodeAddress - Expected address of the node we want to add
   * @param nodeContactAddressData
   * @param block - When true it will wait for any garbage collection to finish before returning.
   * @param force - Flag for if we want to add the node without authenticating or if the bucket is full.
   * This will drop the oldest node in favor of the new.
   * @param connectionConnectTimeoutTime - Timeout for each ping operation during garbage collection.
   * @param ctx
   * @param tran
   */
  public setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    nodeContactAddressData: NodeContactAddressData,
    block?: boolean,
    force?: boolean,
    connectionConnectTimeoutTime?: number,
    ctx?: Partial<ContextTimed>,
    tran?: DBTransaction,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeManagerNotRunning(), true, ['stopping'])
  @timedCancellable(true)
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    nodeContactAddressData: NodeContactAddressData,
    block: boolean = false,
    force: boolean = false,
    connectionConnectTimeoutTime: number = this.connectionConnectTimeoutTime,
    @context ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<void> {
    // We don't want to add our own node
    if (nodeId.equals(this.keyRing.getNodeId())) {
      this.logger.debug('Is own NodeId, skipping');
      return;
    }

    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setNode(
          nodeId,
          nodeAddress,
          nodeContactAddressData,
          block,
          force,
          connectionConnectTimeoutTime,
          ctx,
          tran,
        ),
      );
    }

    // Need to await node connection verification, if fail, need to reject connection.

    // When adding a node we need to handle 3 cases
    // 1. The node already exists. We need to update it's last updated field
    // 2. The node doesn't exist and bucket has room.
    //  We need to add the node to the bucket
    // 3. The node doesn't exist and the bucket is full.
    //  We need to ping the oldest node. If the ping succeeds we need to update
    //  the lastUpdated of the oldest node and drop the new one. If the ping
    //  fails we delete the old node and add in the new one.
    const [bucketIndex] = this.nodeGraph.bucketIndex(nodeId);
    // To avoid conflict we want to lock on the bucket index
    await this.nodeGraph.lockBucket(bucketIndex, tran);

    const nodeContact = await this.nodeGraph.getNodeContact(nodeId, tran);
    // If this is a new entry, check the bucket limit
    const count = await this.nodeGraph.getBucketMetaProp(
      bucketIndex,
      'count',
      tran,
    );

    if (nodeContact != null || count < this.nodeGraph.nodeBucketLimit) {
      // Either already exists or has room in the bucket
      // We want to add or update the node
      await this.nodeGraph.setNodeContactAddressData(
        nodeId,
        nodeAddress,
        nodeContactAddressData,
        tran,
      );
      // Updating the refreshBucket timer
      await this.updateRefreshBucketDelay(
        bucketIndex,
        this.refreshBucketDelayTime,
        true,
        tran,
      );
    } else {
      // We want to add a node but the bucket is full
      if (force) {
        // We just add the new node anyway without checking the old one
        const bucket = await this.nodeGraph.getBucket(
          bucketIndex,
          'connected',
          'asc',
          1,
          tran,
        );
        const oldNodeId = bucket[0]?.[0];
        if (oldNodeId == null) {
          utils.never('bucket should be full in this case');
        }
        this.logger.debug(
          `Force was set, removing ${nodesUtils.encodeNodeId(
            oldNodeId,
          )} and adding ${nodesUtils.encodeNodeId(nodeId)}`,
        );
        await this.nodeGraph.unsetNodeContact(oldNodeId, tran);
        await this.nodeGraph.setNodeContactAddressData(
          nodeId,
          nodeAddress,
          nodeContactAddressData,
          tran,
        );
        // Updating the refreshBucket timer
        await this.updateRefreshBucketDelay(
          bucketIndex,
          this.refreshBucketDelayTime,
          true,
          tran,
        );
        return;
      }
      this.logger.debug(
        `Bucket was full, adding ${nodesUtils.encodeNodeId(
          nodeId,
        )} to pending list`,
      );
      // Add the node to the pending nodes list
      await this.addPendingNode(
        bucketIndex,
        nodeId,
        nodeAddress,
        nodeContactAddressData,
        block,
        connectionConnectTimeoutTime,
        ctx,
        tran,
      );
    }
  }

  /**
   * Removes a node from the NodeGraph
   */
  public async unsetNode(nodeId: NodeId, tran: DBTransaction): Promise<void> {
    return await this.nodeGraph.unsetNodeContact(nodeId, tran);
  }

  /**
   * Gets the specified bucket from the NodeGraph
   */
  public async getBucket(
    bucketIndex: number,
    tran?: DBTransaction,
  ): Promise<NodeBucket | undefined> {
    return await this.nodeGraph.getBucket(
      bucketIndex,
      undefined,
      undefined,
      undefined,
      tran,
    );
  }

  protected garbageCollectBucket(
    bucketIndex: number,
    connectionConnectTimeoutTime?: number,
    ctx?: Partial<ContextTimed>,
    tran?: DBTransaction,
  ): PromiseCancellable<void>;
  @timedCancellable(true)
  protected async garbageCollectBucket(
    bucketIndex: number,
    connectionConnectTimeoutTime: number = this.connectionConnectTimeoutTime,
    @context ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.garbageCollectBucket(
          bucketIndex,
          connectionConnectTimeoutTime,
          ctx,
          tran,
        ),
      );
    }

    // This needs to:
    //  1. Iterate over every node within the bucket pinging K at a time
    //  2. remove any un-responsive nodes until there is room of all pending
    //    or run out of existing nodes
    //  3. fill in the bucket with pending nodes until full
    //  4. throw out remaining pending nodes

    const pendingNodes = this.pendingNodes.get(bucketIndex);
    // No nodes mean nothing to do
    if (pendingNodes == null || pendingNodes.size === 0) return;
    this.pendingNodes.set(bucketIndex, new Map());
    // Locking on bucket
    await this.nodeGraph.lockBucket(bucketIndex, tran);
    const semaphore = new Semaphore(this.concurrencyLimit);
    // Iterating over existing nodes
    const bucket = await this.nodeGraph.getBucket(
      bucketIndex,
      'connected',
      'asc',
      this.nodeGraph.nodeBucketLimit,
      tran,
    );
    if (bucket == null) utils.never();
    let removedNodes = 0;
    const unsetLock = new Lock();
    const pendingPromises: Array<Promise<void>> = [];
    for (const [nodeId] of bucket) {
      if (removedNodes >= pendingNodes.size) break;
      await semaphore.waitForUnlock();
      if (ctx.signal?.aborted === true) break;
      const [semaphoreReleaser] = await semaphore.lock()();
      pendingPromises.push(
        (async () => {
          // Ping and remove or update node in bucket
          const pingCtx = {
            signal: ctx.signal,
            timer: connectionConnectTimeoutTime,
          };
          const pingResult = await this.pingNode(nodeId, pingCtx);
          if (pingResult != null) {
            // Succeeded so update
            const [nodeAddress, nodeContactAddressData] = pingResult;
            await this.setNode(
              nodeId,
              nodeAddress,
              nodeContactAddressData,
              false,
              false,
              undefined,
              undefined,
              tran,
            );
          } else {
            // We don't remove node the ping was aborted
            if (ctx.signal.aborted) return;
            // We need to lock this since it's concurrent
            //  and shares the transaction
            await unsetLock.withF(async () => {
              await this.unsetNode(nodeId, tran);
              removedNodes += 1;
            });
          }
        })()
          // Clean ensure semaphore is released
          .finally(async () => await semaphoreReleaser()),
      );
    }
    // Wait for pending pings to complete
    await Promise.all(pendingPromises);
    // Fill in bucket with pending nodes
    for (const [
      nodeIdString,
      [address, nodeContactAddressData],
    ] of pendingNodes) {
      if (removedNodes <= 0) break;
      const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
      await this.setNode(
        nodeId,
        address,
        nodeContactAddressData,
        false,
        false,
        undefined,
        undefined,
        tran,
      );
      removedNodes -= 1;
    }
  }

  protected async addPendingNode(
    bucketIndex: number,
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    nodeContactAddressData: NodeContactAddressData,
    block: boolean = false,
    connectionConnectTimeoutTime: number = this.connectionConnectTimeoutTime,
    ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<void> {
    if (!this.pendingNodes.has(bucketIndex)) {
      this.pendingNodes.set(bucketIndex, new Map());
    }
    const pendingNodes = this.pendingNodes.get(bucketIndex);
    pendingNodes!.set(nodeId.toString(), [nodeAddress, nodeContactAddressData]);
    // No need to re-set it in the map, Maps are by reference

    // If set to blocking we just run the GC operation here
    //  without setting up a new task
    if (block) {
      await this.garbageCollectBucket(
        bucketIndex,
        connectionConnectTimeoutTime,
        ctx,
        tran,
      );
      return;
    }
    await this.setupGCTask(bucketIndex);
  }

  protected async setupGCTask(bucketIndex: number) {
    // Check and start a 'garbageCollect` bucket task
    let scheduled: boolean = false;
    for await (const task of this.taskManager.getTasks('asc', true, [
      this.tasksPath,
      this.gcBucketHandlerId,
      `${bucketIndex}`,
    ])) {
      switch (task.status) {
        case 'queued':
        case 'active':
          // Ignore active tasks
          break;
        case 'scheduled':
          {
            if (scheduled) {
              // Duplicate scheduled are removed
              task.cancel(abortSingletonTaskReason);
              break;
            }
            scheduled = true;
          }
          break;
        default:
          task.cancel(abortSingletonTaskReason);
          break;
      }
    }
    if (!scheduled) {
      // If none were found, schedule a new one
      await this.taskManager.scheduleTask({
        handlerId: this.gcBucketHandlerId,
        parameters: [bucketIndex],
        path: [this.tasksPath, this.gcBucketHandlerId, `${bucketIndex}`],
        lazy: true,
      });
    }
  }

  /**
   * To be called on key renewal. Re-orders all nodes in all buckets with respect
   * to the new node ID.
   */
  public async resetBuckets(): Promise<void> {
    return await this.nodeGraph.resetBuckets();
  }

  /**
   * Kademlia refresh bucket operation.
   * It generates a random node ID within the range of a bucket and does a
   * lookup for that node in the network. This will cause the network to update
   * its node graph information.
   * @param bucketIndex
   * @param connectionConnectTimeoutTime
   * @param ctx
   */
  public refreshBucket(
    bucketIndex: NodeBucketIndex,
    connectionConnectTimeoutTime?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void>;
  @timedCancellable(true)
  public async refreshBucket(
    bucketIndex: NodeBucketIndex,
    connectionConnectTimeoutTime: number | undefined = this
      .connectionConnectTimeoutTime,
    @context ctx: ContextTimed,
  ): Promise<void> {
    // We need to generate a random nodeId for this bucket
    const nodeId = this.keyRing.getNodeId();
    const bucketRandomNodeId = nodesUtils.generateRandomNodeIdForBucket(
      nodeId,
      bucketIndex,
    );
    // We then need to start a findNode procedure
    await this.findNode(
      {
        nodeId: bucketRandomNodeId,
        connectionConnectTimeoutTime: connectionConnectTimeoutTime,
      },
      ctx,
    );
  }

  protected async setupRefreshBucketTasks(tran?: DBTransaction) {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setupRefreshBucketTasks(tran),
      );
    }

    this.logger.info('Setting up refreshBucket tasks');
    // 1. Iterate over existing tasks and reset the delay
    const existingTasks: Array<boolean> = new Array(this.nodeGraph.nodeIdBits);
    for await (const task of this.taskManager.getTasks(
      'asc',
      true,
      [this.tasksPath, this.refreshBucketHandlerId],
      tran,
    )) {
      const bucketIndex = parseInt(task.path[0]);
      switch (task.status) {
        case 'scheduled':
          {
            // If it's scheduled then reset delay
            existingTasks[bucketIndex] = true;
            // Total delay is refreshBucketDelay + time since task creation
            const delay =
              performance.now() +
              performance.timeOrigin -
              task.created.getTime() +
              this.refreshBucketDelayTime +
              nodesUtils.refreshBucketsDelayJitter(
                this.refreshBucketDelayTime,
                this.refreshBucketDelayJitter,
              );
            await this.taskManager.updateTask(task.id, { delay }, tran);
          }
          break;
        case 'queued':
        case 'active':
          // If it's running then leave it
          existingTasks[bucketIndex] = true;
          break;
        default:
          // Otherwise, ignore it, should be re-created
          existingTasks[bucketIndex] = false;
      }
    }

    // 2. Recreate any missing tasks for buckets
    for (
      let bucketIndex = 0;
      bucketIndex < existingTasks.length;
      bucketIndex++
    ) {
      const exists = existingTasks[bucketIndex];
      // Can be disabled with 0 delay, only use for testing
      if (!exists && this.refreshBucketDelayTime > 0) {
        // Create a new task
        this.logger.debug(
          `Creating refreshBucket task for bucket ${bucketIndex}`,
        );
        const jitter = nodesUtils.refreshBucketsDelayJitter(
          this.refreshBucketDelayTime,
          this.refreshBucketDelayJitter,
        );
        await this.taskManager.scheduleTask({
          handlerId: this.refreshBucketHandlerId,
          delay: this.refreshBucketDelayTime + jitter,
          lazy: true,
          parameters: [bucketIndex],
          path: [this.tasksPath, this.refreshBucketHandlerId, `${bucketIndex}`],
          priority: 0,
        });
      }
    }
    this.logger.info('Set up refreshBucket tasks');
  }

  @ready(new nodesErrors.ErrorNodeManagerNotRunning(), true, ['stopping'])
  public async updateRefreshBucketDelay(
    bucketIndex: number,
    delay: number = this.refreshBucketDelayTime,
    lazy: boolean = true,
    tran?: DBTransaction,
  ): Promise<Task> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.updateRefreshBucketDelay(bucketIndex, delay, lazy, tran),
      );
    }

    const jitter = nodesUtils.refreshBucketsDelayJitter(
      delay,
      this.refreshBucketDelayJitter,
    );
    let foundTask: Task | undefined;
    let existingTask = false;
    for await (const task of this.taskManager.getTasks(
      'asc',
      true,
      [this.tasksPath, this.refreshBucketHandlerId, `${bucketIndex}`],
      tran,
    )) {
      if (!existingTask) {
        foundTask = task;
        // Update the first one
        // total delay is refreshBucketDelay + time since task creation
        // time since task creation = now - creation time;
        const delayNew =
          performance.now() +
          performance.timeOrigin -
          task.created.getTime() +
          delay +
          jitter;
        try {
          await this.taskManager.updateTask(task.id, { delay: delayNew });
          existingTask = true;
        } catch (e) {
          if (e instanceof tasksErrors.ErrorTaskRunning) {
            // Ignore running
            existingTask = true;
          } else if (!(e instanceof tasksErrors.ErrorTaskMissing)) {
            throw e;
          }
        }
        this.logger.debug(
          `Updating refreshBucket task for bucket ${bucketIndex}`,
        );
      } else {
        // These are extra, so we cancel them
        task.cancel(abortSingletonTaskReason);
        this.logger.warn(
          `Duplicate refreshBucket task was found for bucket ${bucketIndex}, cancelling`,
        );
      }
    }
    if (!existingTask) {
      this.logger.debug(
        `No refreshBucket task for bucket ${bucketIndex}, new one was created`,
      );
      foundTask = await this.taskManager.scheduleTask({
        delay: delay + jitter,
        handlerId: this.refreshBucketHandlerId,
        lazy: true,
        parameters: [bucketIndex],
        path: [this.tasksPath, this.refreshBucketHandlerId, `${bucketIndex}`],
        priority: 0,
      });
    }
    if (foundTask == null) utils.never();
    return foundTask;
  }

  /**
   * Perform an initial database synchronisation: get k of the closest nodes
   * from each seed node and add them to this database
   * Establish a connection to each node before adding it
   * By default this operation is blocking, set `block` to `false` to make it
   *
   * From the spec:
   * To join the network, a node u must have a contact to an already participating node w. u inserts w into the
   * appropriate k-bucket. u then performs a node lookup for its own node ID. Finally, u refreshes all kbuckets further
   * away than its closest neighbor. During the refreshes, u both populates its own k-buckets and inserts itself into
   * other nodes’ k-buckets as necessary.
   *
   * So this will do 3 steps
   * 1. Connect to the initial nodes
   * 2. do a find-node operation for itself
   * 3. reschedule refresh bucket operations for every bucket above the closest node we found
   *
   */
  public syncNodeGraph(
    initialNodes: Array<[NodeId, NodeAddress]>,
    connectionConnectTimeoutTime?: number,
    blocking?: boolean,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  @timedCancellable(true)
  public async syncNodeGraph(
    initialNodes: Array<[NodeId, NodeAddress]>,
    connectionConnectTimeoutTime: number = this.connectionConnectTimeoutTime,
    blocking: boolean = false,
    @context ctx: ContextTimed,
  ): Promise<void> {
    const logger = this.logger.getChild('syncNodeGraph');
    logger.info('Synchronizing NodeGraph');
    if (initialNodes.length === 0) {
      throw new nodesErrors.ErrorNodeManagerSyncNodeGraphFailed(
        'must provide at least 1 initial node',
      );
    }
    const initialNodesParameter = initialNodes.map(([nodeId, address]) => {
      return [nodesUtils.encodeNodeId(nodeId), address] as [
        NodeIdEncoded,
        NodeAddress,
      ];
    });
    if (blocking) {
      await this.syncNodeGraphHandler(
        ctx,
        undefined,
        initialNodesParameter,
        connectionConnectTimeoutTime,
      );
    } else {
      // Create task
      await this.taskManager.scheduleTask({
        delay: 0,
        handlerId: this.syncNodeGraphHandlerId,
        lazy: true,
        parameters: [initialNodesParameter, connectionConnectTimeoutTime],
        path: [this.tasksPath, this.syncNodeGraphHandlerId],
        priority: 0,
      });
    }
  }
}

export default NodeManager;
