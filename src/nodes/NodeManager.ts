import type { DB, DBTransaction } from '@matrixai/db';
import type { ContextTimed, ContextTimedInput } from '@matrixai/contexts';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type KeyRing from '../keys/KeyRing';
import type Sigchain from '../sigchain/Sigchain';
import type TaskManager from '../tasks/TaskManager';
import type GestaltGraph from '../gestalts/GestaltGraph';
import type { TaskHandler, TaskHandlerId, Task } from '../tasks/types';
import type { SignedTokenEncoded } from '../tokens/types';
import type { Host, Port } from '../network/types';
import type {
  Claim,
  ClaimId,
  ClaimIdEncoded,
  SignedClaim,
} from '../claims/types';
import type { ClaimLinkNode } from '../claims/payloads';
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
  NodeIdString,
  NodeContact,
} from './types';
import type NodeConnectionManager from './NodeConnectionManager';
import type NodeGraph from './NodeGraph';
import type { ResourceAcquire } from '@matrixai/resources';
import type nodeConnection from '@/nodes/NodeConnection';
import type NodeConnection from '@/nodes/NodeConnection';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import { Semaphore, Lock } from '@matrixai/async-locks';
import { IdInternal } from '@matrixai/id';
import { timedCancellable, context } from '@matrixai/contexts/dist/decorators';
import { withF } from '@matrixai/resources';
import * as nodesUtils from './utils';
import * as nodesEvents from './events';
import * as nodesErrors from './errors';
import NodeConnectionQueue from './NodeConnectionQueue';
import Token from '../tokens/Token';
import * as keysUtils from '../keys/utils';
import * as tasksErrors from '../tasks/errors';
import * as claimsUtils from '../claims/utils';
import * as claimsErrors from '../claims/errors';
import * as utils from '../utils/utils';
import config from '../config';

type SomeType =
  | {
      type: 'direct';
      result: {
        nodeId: NodeId;
        host: Host;
        port: Port;
      };
    }
  | {
      type: 'signal';
      result: Array<NodeId>;
    };

const abortEphemeralTaskReason = Symbol('abort ephemeral task reason');
const abortSingletonTaskReason = Symbol('abort singleton task reason');

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

  public readonly refreshBucketDelay: number;
  public readonly refreshBucketDelayJitter: number;
  public readonly retrySeedConnectionsDelay: number;
  public readonly tasksPath = this.constructor.name;

  protected db: DB;
  protected logger: Logger;
  protected keyRing: KeyRing;
  protected sigchain: Sigchain;
  protected gestaltGraph: GestaltGraph;
  protected taskManager: TaskManager;
  protected nodeGraph: NodeGraph;
  protected nodeConnectionManager: NodeConnectionManager;

  protected pendingNodes: Map<number, Map<string, NodeAddress>> = new Map();

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
    const jitter = nodesUtils.refreshBucketsDelayJitter(
      this.refreshBucketDelay,
      this.refreshBucketDelayJitter,
    );
    await this.taskManager.scheduleTask({
      delay: this.refreshBucketDelay + jitter,
      handlerId: this.refreshBucketHandlerId,
      lazy: true,
      parameters: [bucketIndex],
      path: [this.tasksPath, this.refreshBucketHandlerId, `${bucketIndex}`],
      priority: 0,
    });
  };

  public readonly refreshBucketHandlerId =
    `${this.tasksPath}.${this.refreshBucketHandler.name}` as TaskHandlerId;

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
    `${this.tasksPath}.${this.gcBucketHandler.name}` as TaskHandlerId;

  protected pingAndSetNodeHandler: TaskHandler = async (
    ctx,
    _taskInfo,
    nodeIdEncoded: string,
    host: Host,
    port: Port,
  ) => {
    const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
    if (nodeId == null) {
      this.logger.error(
        `pingAndSetNodeHandler received invalid NodeId: ${nodeIdEncoded}`,
      );
      utils.never();
    }
    if (
      await this.pingNode(nodeId, [{ host, port, scopes: ['global'] }], {
        signal: ctx.signal,
      })
    ) {
      await this.setNode(
        nodeId,
        { host, port, scopes: ['global'] },
        false,
        false,
        2000,
        ctx,
      );
    }
  };

  public readonly pingAndSetNodeHandlerId: TaskHandlerId =
    `${this.tasksPath}.${this.pingAndSetNodeHandler.name}` as TaskHandlerId;

  protected checkSeedConnectionsHandler: TaskHandler = async (
    ctx,
    taskInfo,
  ) => {
    this.logger.debug('Checking seed connections');
    // Check for existing seed node connections
    const seedNodes = this.nodeConnectionManager.getSeedNodes();
    const allInactive = !seedNodes
      .map((nodeId) => this.nodeConnectionManager.hasConnection(nodeId))
      .reduce((a, b) => a || b, false);
    try {
      if (allInactive) {
        this.logger.debug(
          'No active seed connections were found, retrying network entry',
        );
        // If no seed node connections exist then we redo syncNodeGraph
        await this.syncNodeGraph(true, undefined, ctx);
      } else {
        // Doing this concurrently, we don't care about the results
        await Promise.allSettled(
          seedNodes.map((nodeId) => {
            // Retry any failed seed node connections
            if (!this.nodeConnectionManager.hasConnection(nodeId)) {
              this.logger.debug(
                `Re-establishing seed connection for ${nodesUtils.encodeNodeId(
                  nodeId,
                )}`,
              );
              return this.pingNode(nodeId, undefined, ctx);
            }
          }),
        );
      }
    } finally {
      this.logger.debug('Checked seed connections');
      // Re-schedule this task
      await this.taskManager.scheduleTask({
        delay: taskInfo.delay,
        deadline: taskInfo.deadline,
        handlerId: this.checkSeedConnectionsHandlerId,
        lazy: true,
        path: [this.tasksPath, this.checkSeedConnectionsHandlerId],
        priority: taskInfo.priority,
      });
    }
  };

  public readonly checkSeedConnectionsHandlerId: TaskHandlerId =
    `${this.tasksPath}.${this.checkSeedConnectionsHandler.name}` as TaskHandlerId;

  protected handleEventNodeConnectionManagerConnectionReverse = async (
    e: nodesEvents.EventNodeConnectionManagerConnectionReverse,
  ) => {
    await this.setNode(
      e.detail.remoteNodeId,
      {
        host: e.detail.remoteHost,
        port: e.detail.remotePort,
        scopes: ['global'],
      },
      false,
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
    connectionConnectTimeoutTime = config.defaultsSystem
      .nodesConnectionConnectTimeoutTime,
    refreshBucketDelay = config.defaultsSystem.nodesRefreshBucketIntervalTime,
    refreshBucketDelayJitter = config.defaultsSystem
      .nodesRefreshBucketIntervalTimeJitter,
    retrySeedConnectionsDelay = 120000, // 2 minutes
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    sigchain: Sigchain;
    gestaltGraph: GestaltGraph;
    taskManager: TaskManager;
    nodeGraph: NodeGraph;
    nodeConnectionManager: NodeConnectionManager;
    connectionConnectTimeoutTime?: number;
    refreshBucketDelay?: number;
    refreshBucketDelayJitter?: number;
    retrySeedConnectionsDelay?: number;
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
    this.connectionConnectTimeoutTime = connectionConnectTimeoutTime;
    this.refreshBucketDelay = refreshBucketDelay;
    this.refreshBucketDelayJitter = Math.max(0, refreshBucketDelayJitter);
    this.retrySeedConnectionsDelay = retrySeedConnectionsDelay;
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
      this.pingAndSetNodeHandlerId,
      this.pingAndSetNodeHandler,
    );
    this.taskManager.registerHandler(
      this.checkSeedConnectionsHandlerId,
      this.checkSeedConnectionsHandler,
    );
    await this.setupRefreshBucketTasks();
    await this.taskManager.scheduleTask({
      delay: this.retrySeedConnectionsDelay,
      handlerId: this.checkSeedConnectionsHandlerId,
      lazy: true,
      path: [this.tasksPath, this.checkSeedConnectionsHandlerId],
    });
    // Add handling for connections
    this.nodeConnectionManager.addEventListener(
      nodesEvents.EventNodeConnectionManagerConnectionReverse.name,
      this.handleEventNodeConnectionManagerConnectionReverse,
    );
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    // Remove handling for connections
    this.nodeConnectionManager.removeEventListener(
      nodesEvents.EventNodeConnectionManagerConnectionReverse.name,
      this.handleEventNodeConnectionManagerConnectionReverse,
    );
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
    this.taskManager.deregisterHandler(this.pingAndSetNodeHandlerId);
    this.taskManager.deregisterHandler(this.checkSeedConnectionsHandlerId);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  // TODO New refactored methods

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
  ): ResourceAcquire<nodeConnection> {
    if (this.keyRing.getNodeId().equals(nodeId)) {
      this.logger.warn('Attempting connection to our own NodeId');
      throw new nodesErrors.ErrorNodeManagerNodeIdOwn();
    }
    return async () => {
      // Checking if connection already exists
      if (!this.nodeConnectionManager.hasConnection(nodeId)) {
        // Establish the connection
        const path = await this.findNode(nodeId, undefined, undefined, ctx);
        if (path == null) {
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
      [await this.acquireConnection(nodeId, ctx)],
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
    const acquire = await this.acquireConnection(nodeId, ctx);
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
   * Will do a Kademlia find node proceedure.
   *
   * Will attempt to fix regardless of existing connection.
   * @param nodeId - NodeId of target to find.
   * @param concurrencyLimit - Limit the number of concurrent connections
   * @param limit
   * @param ctx
   * @returns true if the node was found.
   */
  public findNode(
    nodeId: NodeId,
    concurrencyLimit?: number,
    limit?: number,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<SomeType | undefined>;
  @timedCancellable(true)
  public async findNode(
    nodeId: NodeId,
    concurrencyLimit: number = 3,
    limit: number = this.nodeGraph.nodeBucketLimit,
    @context ctx: ContextTimed,
  ): Promise<SomeType | undefined> {
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
      newCtx,
    ).then((v) => {
      if (v != null) {
        console.log('found by signal');
        return {
          type: 'signal' as const,
          result: v,
        };
      }
      throw 'failed to find by signal';
    });
    const findByDirect = this.findNodeByDirect(
      nodeId,
      connectionsQueue,
      newCtx,
    ).then((v) => {
      if (v != null) {
        console.log('found by direct');
        return {
          type: 'direct' as const,
          result: v,
        };
      }
      throw 'failed to find by direct';
    });

    try {
      return await Promise.any([findBySignal, findByDirect]).then((v) => {
        console.log('anyied');
        return v;
      });
    } catch (e) {
      console.error(e);
      return;
    } finally {
      console.log('cleaning up');
      abortController.abort(Error('TMP IMP cancelling pending connections'));
      await Promise.allSettled([findBySignal, findByDirect]);
      ctx.signal.removeEventListener('abort', handleAbort);
    }
  }

  /**
   * Will try to make a connection to the node using active connections only
   *
   * @param nodeId
   * @param nodeConnectionsQueue
   * @param ctx
   */
  public findNodeBySignal(
    nodeId: NodeId,
    nodeConnectionsQueue: NodeConnectionQueue,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<Array<NodeId> | undefined>;
  @timedCancellable(true)
  public async findNodeBySignal(
    nodeId: NodeId,
    nodeConnectionsQueue: NodeConnectionQueue,
    @context ctx: ContextTimed,
  ): Promise<Array<NodeId> | undefined> {
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

    const chain: Map<string, string | undefined> = new Map();
    let connectionMade = false;

    // Seed the initial queue
    for (const {
      nodeId: nodeIdConnected,
    } of this.nodeConnectionManager.getClosestConnections(nodeId)) {
      nodeConnectionsQueue.queueNodeSignal(nodeIdConnected, undefined);
    }

    while (true) {
      const isDone = await nodeConnectionsQueue.withNodeSignal(
        async (nodeIdTarget, nodeIdSignaller) => {
          if (
            !this.nodeConnectionManager.hasConnection(nodeIdTarget) &&
            nodeIdSignaller != null
          ) {
            this.logger.debug(
              `attempting connection to ${nodesUtils.encodeNodeId(
                nodeIdTarget,
              )} via ${
                nodeIdSignaller != null
                  ? nodesUtils.encodeNodeId(nodeIdSignaller)
                  : 'local'
              }`,
            );
            await this.nodeConnectionManager.createConnectionPunch(
              nodeIdTarget,
              nodeIdSignaller,
              newCtx,
            );
            // If connection succeeds add it to the chain
            chain.set(nodeIdTarget.toString(), nodeIdSignaller?.toString());
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
    // FIXME: this breaks right now? need to look deeper. I get a thrown null from somewhere.
    abortController.abort(Error('TMP IMP cancelling pending connections'));
    ctx.signal.removeEventListener('abort', handleAbort);
    // Wait for pending attempts to finish
    for (const pendingP of nodeConnectionsQueue.nodesRunningSignal) {
      await pendingP.catch((e) => console.error(e));
    }

    // Connection was not made so no path was found
    if (!connectionMade) return undefined;
    // Otherwise return the path
    const path: Array<NodeId> = [];
    let current: string | undefined = nodeId.toString();
    while (current != null) {
      const nodeId = IdInternal.fromString<NodeId>(current);
      path.unshift(nodeId);
      current = chain.get(current);
    }
    return path;
  }

  public findNodeByDirect(
    nodeId: NodeId,
    nodeConnectionsQueue: NodeConnectionQueue,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<
    | {
        nodeId: NodeId;
        host: Host;
        port: Port;
      }
    | undefined
  >;
  @timedCancellable(true)
  public async findNodeByDirect(
    nodeId: NodeId,
    nodeConnectionsQueue: NodeConnectionQueue,
    @context ctx: ContextTimed,
  ): Promise<
    | {
        nodeId: NodeId;
        host: Host;
        port: Port;
      }
    | undefined
  > {
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
            // TODO: Need to work out the following.
            //  1. We get multiple possible addresses to try.
            //  2. What addresses do we want to try connecting to?
            //

            // Setting up intermediate signal
            const abortControllerMultiConn = new AbortController();
            const handleAbort = () => {
              abortControllerMultiConn.abort(newCtx.signal.reason);
            };
            if (newCtx.signal.aborted) {
              handleAbort();
            } else {
              newCtx.signal.addEventListener('abort', handleAbort, {
                once: true,
              });
            }

            // Attempt all direct
            const connectPs: Array<Promise<NodeConnection>> = [];
            let success = false;
            for (const [
              nodeContactAddress,
              nodeContactAddressData,
            ] of Object.entries(nodeContact)) {
              if (nodeContactAddressData.mode === 'direct') {
                const [host, port] =
                  nodesUtils.parseNodeContactAddress(nodeContactAddress);
                // FIXME: handle hostnames by resolving them.
                // FIXME: Once a successful connection is made, abort remaining connections.
                const connectP = this.nodeConnectionManager
                  .createConnection([nodeIdTarget], host as Host, port, {
                    timer: newCtx.timer,
                    signal: abortControllerMultiConn.signal,
                  })
                  .then((v) => {
                    success = true;
                    abortControllerMultiConn.abort(
                      Error('cancelling extra connections'),
                    );
                    return v;
                  });
                connectPs.push(connectP);
              }
            }
            await Promise.allSettled(connectPs);
            ctx.signal.removeEventListener('abort', handleAbort);

            if (!success) return false;
          }
          nodeConnectionsQueue.contactedNode(nodeIdTarget);
          // If connection was our target then we're done
          if (nodeId.toString() === nodeIdTarget.toString()) {
            console.log('FOUND!');
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
    // FIXME: this breaks right now? need to look deeper. I get a thrown null from somewhere.
    abortController.abort(Error('TMP IMP cancelling pending connections'));
    ctx.signal.removeEventListener('abort', handleAbort);
    // Wait for pending attempts to finish
    for (const pendingP of nodeConnectionsQueue.nodesRunningDirect) {
      await pendingP.catch((e) => console.error(e));
    }

    if (!connectionMade) return undefined;
    const conAndTimer = this.nodeConnectionManager.getConnection(nodeId);
    if (conAndTimer == null) {
      utils.never('connection should have been established');
    }
    return {
      nodeId: conAndTimer.connection.nodeId,
      host: conAndTimer.connection.host,
      port: conAndTimer.connection.port,
    };
  }

  /**
   * Will ask the target node about closest nodes to the `node`
   * and add them to the `nodeConnectionsQueue`.
   *
   * @param nodeId - node to find closest nodes to
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

      console.log(
        await Promise.allSettled([
          closestConnectionsRequestP,
          closestNodesRequestP,
        ]),
      );
    });
  }

  /**
   * Will attempt to establish connection using `findNode` or use existing connection.
   * Will return true if connection was established or already exists, false otherwise.
   */
  public pingNode(
    nodeId: NodeId,
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
    @context ctx: ContextTimed,
  ): Promise<boolean> {
    if (this.nodeConnectionManager.hasConnection(nodeId)) return true;
    const path = await this.findNode(
      nodeId,
      3,
      this.nodeGraph.nodeBucketLimit,
      ctx,
    );
    return path != null;
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
    } catch {
      // TODO: stricter error checking
      return false;
    }
  }

  // RPC related methods

  /**
   * Connects to the target node, and retrieves its sigchain data.
   * Verifies and returns the decoded chain as ChainData. Note: this will drop
   * any unverifiable claims.
   * For node1 -> node2 claims, the verification process also involves connecting
   * to node2 to verify the claim (to retrieve its signing public key).
   * @param targetNodeId Id of the node to connect request the chain data of.
   * @param claimId If set then we get the claims newer that this claim Id.
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

  // Node graph wrappers

  // TODO: End new refactored methods

  // As a management system for nodes we should at least for the CRUD layer for this

  /**
   * Gets information about the node that the NodeManager is aware of.
   *
   * This does not perform any side-effects beyond querying local state.
   * This will always return `undefined` for the own node ID.
   */
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public async getNode(
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<NodeInfo | undefined> {
    const nodeData = await this.nodeGraph.getNode(nodeId, tran);
    const [bucketIndex] = this.nodeGraph.bucketIndex(nodeId);
    // Shouldn't this be synchronous?
    const nodeConnection = this.nodeConnectionManager.getConnection(nodeId);
    if (nodeData != null && nodeConnection != null) {
      return {
        id: nodeId,
        graph: {
          data: nodeData,
          bucketIndex,
        },
        connection: nodeConnection,
      };
    } else if (nodeData != null) {
      return {
        id: nodeId,
        graph: {
          data: nodeData,
          bucketIndex,
        },
      };
    } else if (nodeConnection != null) {
      return {
        id: nodeId,
        connection: nodeConnection,
      };
    }
  }

  // Here we are going to add this info
  // high level set node
  // vs low level set node

  /**
   * Adds a new `NodeId` to the nodes system.
   *
   * This will attempt to connect to the node. If the connection is not
   * successful, the node will not be saved in the node graph.
   * If the bucket is full, we will want to check if the oldest last
   * updated node is contacted, and if that fails, it will be replaced
   * with this node. If the las updated node connection is successful,
   * then the new node is dropped.
   *
   * Note that of the set of records in the bucket.
   * We only consider records that are not active connections.
   * If any of the `NodeId` has active connections, then they cannot
   * be dropped.
   *
   * If the `NodeConnection`
   *
   * If `force` is set to true, it will not bother trying to connect.
   * It will just set the node straight into the node graph.
   *
   * @throws {nodesErrors.ErrorNodeConnection} - If the connection fails
   */
  @timedCancellable(true)
  public async addNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    @context ctx: ContextTimed,
    tran?: DBTransaction,
  ) {
    // Remember if the last updated node cannot be an active connection
    // If there is an active connection, they cannot be dropped
    // Therefore if you make more than 20 active connections, do you just fail to do it?
    // No in that case, it's data is just not added to the graph

    if (nodeId.equals(this.keyRing.getNodeId())) {
      throw new nodesErrors.ErrorNodeManagerNodeIdOwn('Cannot set own node ID');
    }
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.addNode(nodeId, nodeAddress, ctx, tran),
      );
    }
    // If we don't have a connection or we cannot make a connection
    // then we will not add this node to the graph
    // Note that the existing connection may be using a different address
    // Until NodeGraph supports multiple addresses, we have to prefer existing addresses
    if (!this.nodeConnectionManager.hasConnection(nodeId)) {
      // Make a connection to the node Id
      // Expect that the NCM would keep track of this
      // And idle out afterwards
      // Note that we also have a ctx for the entire operation!
      await this.nodeConnectionManager.connectTo(nodeId, nodeAddress, ctx);
    }

    // Now we can check the graph

    // If we already have an active connection
    // If it fails to connect, we don't bother adding it
    // We could throw an exception here
    // And that would make sense

    // Serialise operations to the bucket, because this requires updating
    // the bucket count atomically to avoid concurrent thrashing
    const [bucketIndex] = this.nodeGraph.bucketIndex(nodeId);
    await this.nodeGraph.lockBucket(bucketIndex, tran);

    // We should attempting a connection first

    const nodeData = await this.nodeGraph.getNode(nodeId, tran);
    const bucketCount = await this.nodeGraph.getBucketMetaProp(
      bucketIndex,
      'count',
      tran,
    );

    // We must always connect to the thing first
    // Plus if we are making a connection, the connection is managed
    // by the NCM, we just get a reference to it?

    if (bucketCount < this.nodeGraph.nodeBucketLimit) {
      // We need to work this
    }
  }

  /**
   * Adds a node to the node graph. This assumes that you have already authenticated the node
   * Updates the node if the node already exists
   * This operation is blocking by default - set `block` 2qto false to make it non-blocking
   * @param nodeId - Id of the node we wish to add
   * @param nodeAddress - Expected address of the node we want to add
   * @param block - When true it will wait for any garbage collection to finish before returning.
   * @param force - Flag for if we want to add the node without authenticating or if the bucket is full.
   * This will drop the oldest node in favor of the new.
   * @param pingTimeoutTime - Timeout for each ping operation during garbage collection.
   * @param ctx
   * @param tran
   */
  public setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    block?: boolean,
    force?: boolean,
    pingTimeoutTime?: number,
    ctx?: Partial<ContextTimed>,
    tran?: DBTransaction,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  @timedCancellable(true)
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    block: boolean = false,
    force: boolean = false,
    pingTimeoutTime: number = this.connectionConnectTimeoutTime,
    @context ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<void> {
    // Such a complicated function
    // To just set a node into our system
    // We have to basically say we have already authenticated
    // Because we can have a protected version of set Node
    // that just sets the node without doing any authentication
    // so what exactly is this function for?
    // So doing this literally means we have the address
    // To do so is to add a node into graph without connecting to it
    // I'm not sure if that makes sense
    // we can "prefill" some already well known things
    // But I think with the SRV style
    // I would not expose such a feature
    // It seems more like a debug feature

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
          block,
          force,
          pingTimeoutTime,
          ctx,
          tran,
        ),
      );
    }

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

    // WHY - this checks if it already exists
    // What if it doesn't exist?

    const nodeData = await this.nodeGraph.getNode(nodeId, tran);
    // If this is a new entry, check the bucket limit
    const count = await this.nodeGraph.getBucketMetaProp(
      bucketIndex,
      'count',
      tran,
    );

    // Beacause we have to do this one at a time?
    // To avoid a bucket limit problem?
    // Setting a node and now figuring out what to do with the old nodes
    // To GC them somehow
    // Problem is, we have to "force" it
    // It should default to forcing it
    // But you can keep old connections on automatic systems
    // But if it is set, it should default to forcing

    if (nodeData != null || count < this.nodeGraph.nodeBucketLimit) {
      // Either already exists or has room in the bucket
      // We want to add or update the node
      await this.nodeGraph.setNode(nodeId, nodeAddress, undefined, tran);
      // Updating the refreshBucket timer
      await this.updateRefreshBucketDelay(
        bucketIndex,
        this.refreshBucketDelay,
        true,
        tran,
      );
    } else {
      // We want to add a node but the bucket is full
      if (force) {
        // We just add the new node anyway without checking the old one
        const bucket = await this.nodeGraph.getBucket(
          bucketIndex,
          'contacted',
          'asc',
          1,
          tran,
        );
        const oldNodeId = bucket[0]?.[0];
        if (oldNodeId == null) utils.never();
        this.logger.debug(
          `Force was set, removing ${nodesUtils.encodeNodeId(
            oldNodeId,
          )} and adding ${nodesUtils.encodeNodeId(nodeId)}`,
        );
        await this.nodeGraph.unsetNode(oldNodeId, tran);
        await this.nodeGraph.setNode(nodeId, nodeAddress, undefined, tran);
        // Updating the refreshBucket timer
        await this.updateRefreshBucketDelay(
          bucketIndex,
          this.refreshBucketDelay,
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
        block,
        pingTimeoutTime,
        ctx,
        tran,
      );
    }
  }

  /**
   * Removes a node from the NodeGraph
   */
  public async unsetNode(nodeId: NodeId, tran: DBTransaction): Promise<void> {
    return await this.nodeGraph.unsetNode(nodeId, tran);
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
    pingTimeoutTime?: number,
    ctx?: Partial<ContextTimed>,
    tran?: DBTransaction,
  ): PromiseCancellable<void>;
  @timedCancellable(true)
  protected async garbageCollectBucket(
    bucketIndex: number,
    pingTimeoutTime: number = this.connectionConnectTimeoutTime,
    @context ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.garbageCollectBucket(bucketIndex, pingTimeoutTime, ctx, tran),
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
    const semaphore = new Semaphore(3);
    // Iterating over existing nodes
    const bucket = await this.nodeGraph.getBucket(
      bucketIndex,
      'contacted',
      'asc',
      this.nodeGraph.nodeBucketLimit,
      tran,
    );
    if (bucket == null) utils.never();
    let removedNodes = 0;
    const unsetLock = new Lock();
    const pendingPromises: Array<Promise<void>> = [];
    for (const [nodeId] of bucket) {
      // We want to retain seed nodes regardless of state, so skip them
      if (this.nodeConnectionManager.isSeedNode(nodeId)) continue;
      if (removedNodes >= pendingNodes.size) break;
      await semaphore.waitForUnlock();
      if (ctx.signal?.aborted === true) break;
      const [semaphoreReleaser] = await semaphore.lock()();
      pendingPromises.push(
        (async () => {
          // Ping and remove or update node in bucket
          const pingCtx = {
            signal: ctx.signal,
            timer: pingTimeoutTime,
          };
          const nodeAddress = await this.getNodeAddress(nodeId, tran);
          if (nodeAddress == null) utils.never();
          if (await this.pingNode(nodeId, [nodeAddress], pingCtx)) {
            // Succeeded so update
            await this.setNode(
              nodeId,
              nodeAddress,
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
    for (const [nodeIdString, address] of pendingNodes) {
      if (removedNodes <= 0) break;
      const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
      await this.setNode(
        nodeId,
        address,
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
    block: boolean = false,
    pingTimeoutTime: number = this.connectionConnectTimeoutTime,
    ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<void> {
    if (!this.pendingNodes.has(bucketIndex)) {
      this.pendingNodes.set(bucketIndex, new Map());
    }
    const pendingNodes = this.pendingNodes.get(bucketIndex);
    pendingNodes!.set(nodeId.toString(), nodeAddress);
    // No need to re-set it in the map, Maps are by reference

    // If set to blocking we just run the GC operation here
    //  without setting up a new task
    if (block) {
      await this.garbageCollectBucket(bucketIndex, pingTimeoutTime, ctx, tran);
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
    return await this.nodeGraph.resetBuckets(this.keyRing.getNodeId());
  }

  /**
   * Kademlia refresh bucket operation.
   * It generates a random node ID within the range of a bucket and does a
   * lookup for that node in the network. This will cause the network to update
   * its node graph information.
   * @param bucketIndex
   * @param pingTimeoutTime
   * @param ctx
   */
  public refreshBucket(
    bucketIndex: NodeBucketIndex,
    pingTimeoutTime?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void>;
  @timedCancellable(true)
  public async refreshBucket(
    bucketIndex: NodeBucketIndex,
    pingTimeoutTime: number | undefined = this.connectionConnectTimeoutTime,
    @context ctx: ContextTimed,
  ): Promise<void> {
    // We need to generate a random nodeId for this bucket
    const nodeId = this.keyRing.getNodeId();
    const bucketRandomNodeId = nodesUtils.generateRandomNodeIdForBucket(
      nodeId,
      bucketIndex,
    );
    // We then need to start a findNode procedure
    await this.nodeConnectionManager.findNode(
      bucketRandomNodeId,
      pingTimeoutTime,
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
              this.refreshBucketDelay +
              nodesUtils.refreshBucketsDelayJitter(
                this.refreshBucketDelay,
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
      if (!exists) {
        // Create a new task
        this.logger.debug(
          `Creating refreshBucket task for bucket ${bucketIndex}`,
        );
        const jitter = nodesUtils.refreshBucketsDelayJitter(
          this.refreshBucketDelay,
          this.refreshBucketDelayJitter,
        );
        await this.taskManager.scheduleTask({
          handlerId: this.refreshBucketHandlerId,
          delay: this.refreshBucketDelay + jitter,
          lazy: true,
          parameters: [bucketIndex],
          path: [this.tasksPath, this.refreshBucketHandlerId, `${bucketIndex}`],
          priority: 0,
        });
      }
    }
    this.logger.info('Set up refreshBucket tasks');
  }

  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  public async updateRefreshBucketDelay(
    bucketIndex: number,
    delay: number = this.refreshBucketDelay,
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
   * non-blocking
   */
  public syncNodeGraph(
    block?: boolean,
    pingTimeoutTime?: number,
    ctx?: Partial<ContextTimedInput>,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeManagerNotRunning())
  @timedCancellable(true)
  public async syncNodeGraph(
    block: boolean = true,
    pingTimeoutTime: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<void> {
    const logger = this.logger.getChild('syncNodeGraph');
    logger.info('Synchronizing NodeGraph');
    const seedNodes = this.nodeConnectionManager.getSeedNodes();
    if (seedNodes.length === 0) {
      logger.info('Seed nodes list is empty, skipping synchronization');
      return;
    }
    const addresses = await Promise.all(
      await this.db.withTransactionF(async (tran) =>
        seedNodes.map(
          async (seedNode) =>
            (await this.nodeGraph.getNode(seedNode, tran))?.address,
        ),
      ),
    );
    const filteredAddresses = addresses.filter(
      (address) => address != null,
    ) as Array<NodeAddress>;
    logger.debug(
      `establishing multi-connection to the following seed nodes ${seedNodes.map(
        (nodeId) => nodesUtils.encodeNodeId(nodeId),
      )}`,
    );
    logger.debug(
      `and addresses ${filteredAddresses.map(
        (address) => `${address.host}:${address.port}`,
      )}`,
    );
    // Establishing connections to the seed nodes
    let connections: Array<NodeId>;
    try {
      connections = await this.nodeConnectionManager.getMultiConnection(
        seedNodes,
        filteredAddresses,
        { signal: ctx.signal },
      );
    } catch (e) {
      if (
        e instanceof nodesErrors.ErrorNodeConnectionManagerMultiConnectionFailed
      ) {
        // Not explicitly a failure but we do want to stop here
        this.logger.warn(
          'Failed to connect to any seed nodes when syncing node graph',
        );
        return;
      }
      throw e;
    }
    logger.debug(`Multi-connection established for`);
    connections.forEach((nodeId) => {
      logger.debug(`${nodesUtils.encodeNodeId(nodeId)}`);
    });
    // Using a map to avoid duplicates
    const closestNodesAll: Map<NodeId, NodeData> = new Map();
    const localNodeId = this.keyRing.getNodeId();
    let closestNode: NodeId | null = null;
    logger.debug('Getting closest nodes');
    for (const nodeId of connections) {
      const closestNodes =
        await this.nodeConnectionManager.getRemoteNodeClosestNodes(
          nodeId,
          localNodeId,
          { signal: ctx.signal },
        );
      // Setting node information into the map, filtering out local node
      closestNodes.forEach(([nodeId, address]) => {
        if (!localNodeId.equals(nodeId)) closestNodesAll.set(nodeId, address);
      });

      // Getting the closest node
      let closeNodeInfo = closestNodes.pop();
      if (closeNodeInfo != null && localNodeId.equals(closeNodeInfo[0])) {
        closeNodeInfo = closestNodes.pop();
      }
      if (closeNodeInfo == null) continue;
      const [closeNode] = closeNodeInfo;
      if (closestNode == null) closestNode = closeNode;
      const distA = nodesUtils.nodeDistance(localNodeId, closeNode);
      const distB = nodesUtils.nodeDistance(localNodeId, closestNode);
      if (distA < distB) closestNode = closeNode;
    }
    logger.debug('Starting pingsAndSet tasks');
    const pingTasks: Array<Task> = [];
    for (const [nodeId, nodeData] of closestNodesAll) {
      if (!localNodeId.equals(nodeId)) {
        logger.debug(
          `pingAndSetTask for ${nodesUtils.encodeNodeId(nodeId)}@${
            nodeData.address.host
          }:${nodeData.address.port}`,
        );
        const pingAndSetTask = await this.taskManager.scheduleTask({
          delay: 0,
          handlerId: this.pingAndSetNodeHandlerId,
          lazy: !block,
          parameters: [
            nodesUtils.encodeNodeId(nodeId),
            nodeData.address.host,
            nodeData.address.port,
          ],
          path: [this.tasksPath, this.pingAndSetNodeHandlerId],
          // Need to be somewhat active so high priority
          priority: 100,
          deadline: pingTimeoutTime,
        });
        pingTasks.push(pingAndSetTask);
      }
    }
    if (block) {
      // We want to wait for all the tasks
      logger.debug('Awaiting all pingAndSetTasks');
      await Promise.all(
        pingTasks.map((task) => {
          const prom = task.promise();
          // Hook on cancellation
          if (ctx.signal.aborted) {
            prom.cancel(ctx.signal.reason);
          } else {
            ctx.signal.addEventListener('abort', () =>
              prom.cancel(ctx.signal.reason),
            );
          }
          // Ignore errors
          return task.promise().catch(() => {});
        }),
      );
    }
    // Refreshing every bucket above the closest node
    logger.debug(`Triggering refreshBucket tasks`);
    let index = this.nodeGraph.nodeIdBits;
    if (closestNode != null) {
      const [bucketIndex] = this.nodeGraph.bucketIndex(closestNode);
      index = bucketIndex;
    }
    const refreshBuckets: Array<Promise<any>> = [];
    for (let i = index; i < this.nodeGraph.nodeIdBits; i++) {
      const task = await this.updateRefreshBucketDelay(i, 0, !block);
      refreshBuckets.push(task.promise());
    }
    if (block) {
      logger.debug(`Awaiting refreshBucket tasks`);
      await Promise.all(refreshBuckets);
    }
  }
}

export default NodeManager;
