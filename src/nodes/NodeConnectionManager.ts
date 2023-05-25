import type { ResourceAcquire } from '@matrixai/resources';
import type { ContextTimed } from '@matrixai/contexts';
import type KeyRing from '../keys/KeyRing';
import type { Host, Hostname, Port } from '../network/types';
import type NodeGraph from './NodeGraph';
import type TaskManager from '../tasks/TaskManager';
import type {
  NodeAddress,
  NodeData,
  NodeId,
  NodeIdString,
  SeedNodes,
} from './types';
import type NodeManager from './NodeManager';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import { withF } from '@matrixai/resources';
import Logger from '@matrixai/logger';
import {ready, StartStop} from '@matrixai/async-init/dist/StartStop';
import {IdInternal} from '@matrixai/id';
import {status} from '@matrixai/async-init';
import {Lock, LockBox, Semaphore} from '@matrixai/async-locks';
import {Timer} from '@matrixai/timer';
import { timedCancellable, context } from '@matrixai/contexts/dist/decorators';
import NodeConnection from './NodeConnection';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import * as validationUtils from '../validation/utils';
import * as networkUtils from '../network/utils';
import {resolveHostnames} from '../network/utils';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import {never} from '../utils';
import {clientManifest as agentClientManifest} from '../agent/handlers/clientManifest';

// TODO: check all locking and add cancellation for it.

type AgentClientManifest = typeof agentClientManifest;

type ConnectionAndTimer = {
  connection: NodeConnection<AgentClientManifest>;
  timer: Timer | null;
  usageCount: number;
};

interface NodeConnectionManager extends StartStop {}
@StartStop()
class NodeConnectionManager {
  /**
   * Time used to establish `NodeConnection`
   */
  public readonly connConnectTime: number;

  /**
   * Time to live for `NodeConnection`
   */
  public readonly connTimeoutTime: number;

  /**
   * Default timeout for pinging nodes
   */
  public readonly pingTimeout: number;

  /**
   * Alpha constant for kademlia
   * The number of the closest nodes to contact initially
   */
  public readonly initialClosestNodes: number;

  protected logger: Logger;
  protected nodeGraph: NodeGraph;
  protected keyRing: KeyRing;
  protected taskManager: TaskManager;
  // NodeManager has to be passed in during start to allow co-dependency
  protected nodeManager: NodeManager | undefined;
  protected seedNodes: SeedNodes;
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
  // Tracks the backoff period for offline nodes
  protected nodesBackoffMap: Map<
    string,
    { lastAttempt: number; delay: number }
  > = new Map();
  protected backoffDefault: number = 300; // 5 min
  protected backoffMultiplier: number = 2; // Doubles every failure

  public constructor({
    keyRing,
    nodeGraph,
    taskManager,
    seedNodes = {},
    initialClosestNodes = 3,
    connConnectTime = 2000,
    connTimeoutTime = 60000,
    pingTimeout = 2000,
    logger,
  }: {
    nodeGraph: NodeGraph;
    keyRing: KeyRing;
    taskManager: TaskManager;
    seedNodes?: SeedNodes;
    initialClosestNodes?: number;
    connConnectTime?: number;
    connTimeoutTime?: number;
    pingTimeout?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(NodeConnectionManager.name);
    this.keyRing = keyRing;
    this.nodeGraph = nodeGraph;
    this.taskManager = taskManager;
    const localNodeIdEncoded = nodesUtils.encodeNodeId(keyRing.getNodeId());
    delete seedNodes[localNodeIdEncoded];
    this.seedNodes = seedNodes;
    this.initialClosestNodes = initialClosestNodes;
    this.connConnectTime = connConnectTime;
    this.connTimeoutTime = connTimeoutTime;
    this.pingTimeout = pingTimeout;
  }

  public async start({ nodeManager }: { nodeManager: NodeManager }) {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.nodeManager = nodeManager;
    // Adding seed nodes
    for (const nodeIdEncoded in this.seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded);
      if (nodeId == null) never();
      await this.nodeManager.setNode(
        nodeId,
        this.seedNodes[nodeIdEncoded],
        true,
      );
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.nodeManager = undefined;
    for (const [nodeId, connAndLock] of this.connections) {
      if (connAndLock == null) continue;
      if (connAndLock.connection == null) continue;
      // It exists so we want to destroy it
      await this.destroyConnection(IdInternal.fromString<NodeId>(nodeId));
    }
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
  ): Promise<ResourceAcquire<NodeConnection<AgentClientManifest>>> {
    if (this.keyRing.getNodeId().equals(targetNodeId)) {
      this.logger.warn('Attempting connection to our own NodeId');
    }
    return async () => {
      const connectionAndTimer = await this.getConnection(targetNodeId, undefined, ctx);
      // Increment usage count, and cancel timer
      connectionAndTimer.usageCount += 1;
      connectionAndTimer.timer?.cancel();
      connectionAndTimer.timer = null;
      // Return tuple of [ResourceRelease, Resource]
      return [
        async (e) => {
          if (nodesUtils.isConnectionError(e)) {
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
            connectionAndTimer.timer = new Timer({
              handler: async () => await this.destroyConnection(targetNodeId),
              delay: this.connTimeoutTime,
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
    f: (conn: NodeConnection<AgentClientManifest>) => Promise<T>,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<T>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connConnectTime,
  )
  public async withConnF<T>(
    targetNodeId: NodeId,
    f: (conn: NodeConnection<AgentClientManifest>) => Promise<T>,
    @context ctx: ContextTimed,
  ): Promise<T> {
    return await withF(
      [await this.acquireConnection(targetNodeId, ctx)],
      async ([conn]) => await f(conn),
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
      conn: NodeConnection<AgentClientManifest>,
    ) => AsyncGenerator<T, TReturn, TNext>,
    ctx?: Partial<ContextTimed>,
  ): AsyncGenerator<T, TReturn, TNext> {
    const acquire = await this.acquireConnection(targetNodeId, ctx);
    const [release, conn] = await acquire();
    let caughtError;
    try {
      if (conn == null) never();
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
   * Create a connection to another node (without performing any function).
   * This is a NOOP if a connection already exists.
   * @param targetNodeId Id of node we are creating connection to.
   * @param address - The address to connect on if specified. If not provided we attempt a kademlia search.
   * @param ctx
   * @returns ConnectionAndLock that was created or exists in the connection map
   */
  protected getConnection(
    targetNodeId: NodeId,
    address?: NodeAddress,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<ConnectionAndTimer>;
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connConnectTime,
  )
  protected async getConnection(
    targetNodeId: NodeId,
    address: NodeAddress | undefined,
    @context ctx: ContextTimed,
  ): Promise<ConnectionAndTimer> {
    const targetNodeIdString = targetNodeId.toString() as NodeIdString;
    const targetNodeIdEncoded = nodesUtils.encodeNodeId(targetNodeId);
    this.logger.debug(`Getting NodeConnection for ${targetNodeIdEncoded}`);
    return await this.connectionLocks.withF(
      [targetNodeIdString, Lock],
      async () => {
        const connAndTimer = this.connections.get(targetNodeIdString);
        if (connAndTimer != null) {
          this.logger.debug(
            `Found existing NodeConnection for ${targetNodeIdEncoded}`,
          );
          return connAndTimer;
        }
        // Creating the connection and set in map
        this.logger.debug(`Finding address for ${targetNodeIdEncoded}`);
        const targetAddress = address ?? await this.findNode(targetNodeId);
        if (targetAddress == null) {
          throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();
        }
        this.logger.debug(
          `Found address for ${targetNodeIdEncoded} at ${targetAddress.host}:${targetAddress.port}`,
        );
        // If the stored host is not a valid host (IP address),
        // then we assume it to be a hostname
        const targetHostname = !networkUtils.isHost(targetAddress.host)
          ? (targetAddress.host as string as Hostname)
          : undefined;
        const targetAddresses = await networkUtils.resolveHostnames([
          targetAddress,
        ]);
        this.logger.debug(`Creating NodeConnection for ${targetNodeIdEncoded}`);
        // Start the hole punching only if we are not connecting to seed nodes
        const seedNodes = this.getSeedNodes();
        let holePunchProms: Array<PromiseCancellable<void>> | undefined;
        if (this.isSeedNode(targetNodeId)) {
          holePunchProms = Array.from(seedNodes, (seedNodeId) => {
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
        }
        const nodeConnectionProms = targetAddresses.map((address) => {
          return NodeConnection.createNodeConnection({
            destroyCallback(): Promise<void> {
              return Promise.resolve(undefined);
            },
            destroyTimeout: 0,
            manifest: agentClientManifest,
            quicClientConfig: {},
            targetHost: address.host,
            targetPort: address.port,
            targetHostname: targetHostname,
            targetNodeId: targetNodeId,
            logger: this.logger.getChild(
              `${NodeConnection.name} [${nodesUtils.encodeNodeId(
                targetNodeId,
              )}@${address.host}:${address.port}]`,
            ),
          });
        });
        let newConnection: NodeConnection<AgentClientManifest>;
        try {
          newConnection = await Promise.any(nodeConnectionProms);
        } catch (e) {
          // All connections failed to establish
          this.logger.debug(
            `Failed NodeConnection for ${targetNodeIdEncoded} with ${e}`,
          );
          if (e.errors.length === 1) {
            throw e.errors[0];
          } else {
            throw e;
          }
        } finally {
          const cleanUpReason = Symbol('cleanUpReason');
          // cleaning up hole punching
          if (holePunchProms != null) {
            await Promise.allSettled(holePunchProms.map(prom => {
              prom.cancel(cleanUpReason);
              return prom;
            }))
          }
          // Cleaning up other connections
          await Promise.allSettled(
            nodeConnectionProms.map(async (nodeConnectionProm) => {
              nodeConnectionProm.cancel(cleanUpReason);
              // If any extra connections established then clean them up.
              return nodeConnectionProm.then(async (nodeConnection) => {
                if (nodeConnection !== newConnection) await nodeConnection.destroy({force: true});
              });
            }),
          );
        }

        // Final set up
        const handleDestroy = async () => {
          this.logger.debug('stream destroyed event');
          // To avoid deadlock only in the case where this is called
          // we want to check for destroying connection and read lock
          const connAndTimer = this.connections.get(targetNodeIdString);
          // If the connection is calling destroyCallback then it SHOULD
          // exist in the connection map
          if (connAndTimer == null) return;
          // Already locked so already destroying
          if (this.connectionLocks.isLocked(targetNodeIdString)) return;
          await this.destroyConnection(targetNodeId);
        }
        newConnection.addEventListener('destroy', handleDestroy, {once: true});
        // We can assume connection was established and destination was valid,
        // we can add the target to the nodeGraph
        await this.nodeManager?.setNode(targetNodeId, targetAddress);
        // Creating TTL timeout.
        // We don't create a TTL for seed nodes.
        const timeToLiveTimer = !this.isSeedNode(targetNodeId)
          ? new Timer({
              handler: async () => await this.destroyConnection(targetNodeId),
              delay: this.connTimeoutTime,
            })
          : null;
        const newConnAndTimer: ConnectionAndTimer = {
          connection: newConnection!,
          timer: timeToLiveTimer,
          usageCount: 0,
        };
        this.connections.set(targetNodeIdString, newConnAndTimer);
        // Enable destroyCallback clean up
        this.logger.debug(`Created NodeConnection for ${targetNodeIdEncoded}`);
        return newConnAndTimer;
      },
    );
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
        await connAndTimer.connection.destroy({force: true});
        // Destroying TTL timer
        if (connAndTimer.timer != null) connAndTimer.timer.cancel();
        // Updating the connection map
        this.connections.delete(targetNodeIdString);
      },
    );
  }

  /**
   * Treat this node as the server.
   * Instruct the reverse proxy to send hole-punching packets back to the target's
   * forward proxy, in order to open a connection from the client to this server.
   * A connection is established if the client node's forward proxy is sending
   * hole punching packets at the same time as this node (acting as the server)
   * sends hole-punching packets back to the client's forward proxy.
   * @param proxyHost host of the client's forward proxy
   * @param proxyPort port of the client's forward proxy
   * @param ctx
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public holePunchReverse(
    proxyHost: Host,
    proxyPort: Port,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void> {
    // TODO: tell the server to hole punch reverse
    throw Error('TMP IMP');
  }

  /**
   * Retrieves the node address. If an entry doesn't exist in the db, then
   * proceeds to locate it using Kademlia.
   * @param targetNodeId Id of the node we are tying to find
   * @param ignoreRecentOffline skips nodes that are within their backoff period
   * @param pingTimeout timeout for any ping attempts
   * @param ctx
   */
  public findNode(
    targetNodeId: NodeId,
    ignoreRecentOffline?: boolean,
    pingTimeout?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<NodeAddress | undefined>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(true)
  public async findNode(
    targetNodeId: NodeId,
    ignoreRecentOffline: boolean = false,
    pingTimeout: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<NodeAddress | undefined> {
    // First check if we already have an existing ID -> address record
    let address = (await this.nodeGraph.getNode(targetNodeId))?.address;
    // Otherwise, attempt to locate it by contacting network
    address =
      address ??
      (await this.getClosestGlobalNodes(
        targetNodeId,
        ignoreRecentOffline,
        pingTimeout ?? this.pingTimeout,
        ctx,
      ));
    // TODO: This currently just does one iteration
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
   * @param ignoreRecentOffline skips nodes that are within their backoff period
   * @param pingTimeout
   * @param ctx
   * @returns whether the target node was located in the process
   */
  public getClosestGlobalNodes(
    targetNodeId: NodeId,
    ignoreRecentOffline?: boolean,
    pingTimeout?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<NodeAddress | undefined>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(true)
  public async getClosestGlobalNodes(
    targetNodeId: NodeId,
    ignoreRecentOffline: boolean = false,
    pingTimeout: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<NodeAddress | undefined> {
    const localNodeId = this.keyRing.getNodeId();
    // Let foundTarget: boolean = false;
    let foundAddress: NodeAddress | undefined = undefined;
    // Get the closest alpha nodes to the target node (set as shortlist)
    const shortlist = await this.nodeGraph.getClosestNodes(
      targetNodeId,
      this.initialClosestNodes,
    );
    // If we have no nodes at all in our database (even after synchronising),
    // then we should return nothing. We aren't going to find any others
    if (shortlist.length === 0) {
      this.logger.warn('Node graph was empty, No nodes to query');
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
      // Skip if the node has already been contacted
      if (contacted.has(nextNodeId.toString())) continue;
      if (ignoreRecentOffline && this.hasBackoff(nextNodeId)) continue;
      // Connect to the node (check if pre-existing connection exists, otherwise
      // create a new one)
      if (
        await this.pingNode(
          nextNodeId,
          nextNodeAddress.address.host,
          nextNodeAddress.address.port,
          {
            signal: ctx.signal,
            timer: new Timer({ delay: pingTimeout ?? this.pingTimeout }),
          },
        )
      ) {
        await this.nodeManager!.setNode(nextNodeId, nextNodeAddress.address);
        this.removeBackoff(nextNodeId);
      } else {
        this.increaseBackoff(nextNodeId);
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
              timer: new Timer({ delay: pingTimeout ?? this.pingTimeout }),
            },
          ))
        ) {
          await this.nodeManager!.setNode(nodeId, nodeData.address);
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
    // If the found nodes are less than nodeBucketLimit then
    //  we expect that refresh buckets won't find anything new
    if (Object.keys(contacted).length < this.nodeGraph.nodeBucketLimit) {
      // Reset the delay on all refresh bucket tasks
      for (
        let bucketIndex = 0;
        bucketIndex < this.nodeGraph.nodeIdBits;
        bucketIndex++
      ) {
        await this.nodeManager?.updateRefreshBucketDelay(
          bucketIndex,
          undefined,
          true,
        );
      }
    }
    return foundAddress;
  }

  /**
   * Performs a GRPC request to retrieve the closest nodes relative to the given
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
      nodeConnectionManager.connConnectTime,
  )
  public async getRemoteNodeClosestNodes(
    nodeId: NodeId,
    targetNodeId: NodeId,
    @context ctx: ContextTimed,
  ): Promise<Array<[NodeId, NodeData]>> {
    try {
      // Send through client
      const response = await this.withConnF(
        nodeId,
        async (connection) => {
          const client = connection.getClient();
          return await client.methods.nodesClosestLocalNodesGet(
            { nodeIdEncoded: nodesUtils.encodeNodeId(targetNodeId) },
            ctx,
          );
        },
        ctx,
      );
      const localNodeId = this.keyRing.getNodeId();
      const nodes: Array<[NodeId, NodeData]> = [];
      for await (const result of response) {
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
    } catch (e) {
      if (nodesUtils.isConnectionError(e)) {
        return [];
      }
      throw e;
    }
  }

  /**
   * Performs a GRPC request to send a hole-punch message to the target. Used to
   * initially establish the NodeConnection from source to target.
   *
   * @param relayNodeId node ID of the relay node (i.e. the seed node)
   * @param sourceNodeId node ID of the current node (i.e. the sender)
   * @param targetNodeId node ID of the target node to hole punch
   * @param address string of address in the form `proxyHost:proxyPort`
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
      nodeConnectionManager.connConnectTime,
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
      this.logger.warn('Attempted to send signaling message to our own NodeId');
      return;
    }
    const rlyNode = nodesUtils.encodeNodeId(relayNodeId);
    const srcNode = nodesUtils.encodeNodeId(sourceNodeId);
    const tgtNode = nodesUtils.encodeNodeId(targetNodeId);
    const addressString = address != null ? `, address: ${address.host}:${address.port}` : '';
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
    message: nodesPB.Relay,
    sourceAddress: NodeAddress,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<void>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.connConnectTime,
  )
  public async relaySignalingMessage(
    message: nodesPB.Relay,
    sourceAddress: NodeAddress,
    @context ctx: ContextTimed,
  ): Promise<void> {
    // First check if we already have an existing ID -> address record
    // If we're relaying then we trust our own node graph records over
    // what was provided in the message
    const sourceNode = validationUtils.parseNodeId(message.getSrcId());
    await this.sendSignalingMessage(
      validationUtils.parseNodeId(message.getTargetId()),
      sourceNode,
      validationUtils.parseNodeId(message.getTargetId()),
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
      if (nodeId == null) never();
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

  // FIXME: How do we handle pinging now? Previously this was done on the proxy level.
  //  Now I think we need to actually establish a connection. Pinging should just be establishing a connection now.
  //  I'll keep this but have it wrap normal connection establishment.
  /**
   * Checks if a connection can be made to the target. Returns true if the
   * connection can be authenticated, it's certificate matches the nodeId and
   * the addresses match if provided. Otherwise returns false.
   * @param nodeId - NodeId of the target
   * @param host - Host of the target node
   * @param port - Port of the target node
   * @param ctx
   */
  public pingNode(
    nodeId: NodeId,
    host: Host | Hostname,
    port: Port,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<boolean>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(
    true,
    (nodeConnectionManager: NodeConnectionManager) =>
      nodeConnectionManager.pingTimeout,
  )
  public async pingNode(
    nodeId: NodeId,
    host: Host,
    port: Port,
    @context ctx: ContextTimed,
  ): Promise<boolean> {
    try {
      await this.getConnection(
        nodeId,
        {
          host,
          port,
        })
    } catch {
      return false;
    }
    return true;
  }

  //FIXME
  public establishMultiConnection(
    nodeIds: Array<NodeId>,
    addresses: Array<NodeAddress>,
    connectionTimeout?: number,
    limit?: number,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<Map<NodeId, { host: Host; port: Port }>>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(true)
  public async establishMultiConnection(
    nodeIds: Array<NodeId>,
    addresses: Array<NodeAddress>,
    connectionTimeout: number = 2000,
    limit: number | undefined,
    @context ctx: ContextTimed,
  ): Promise<Map<NodeId, { host: Host; port: Port }>> {
    // Get the full list of addresses by flattening results
    const addresses_ = await resolveHostnames(addresses);
    // We want to establish forward connections to each address
    const pendingConnectionProms: Array<Promise<void>> = [];
    const semaphore = limit != null ? new Semaphore(limit) : null;
    const establishedMap: Map<NodeId, { host: Host; port: Port }> = new Map();
    const cleanUpReason = Symbol('CleanUp');
    const abortController = new AbortController();
    const abort = () => abortController.abort(ctx.signal.reason);
    ctx.signal.addEventListener('abort', abort);
    const signal = abortController.signal;
    for (const address of addresses_) {
      if (semaphore != null) await semaphore.waitForUnlock();
      if (signal.aborted) break;
      const [semaphoreReleaser] =
        semaphore != null ? await semaphore.lock()() : [() => {}];
      const timer = new Timer({ delay: connectionTimeout });
      // TODO: this should be establishing the connections now.
      const connectionProm = this.getConnection(
        targetNodeIds,
        address,
        {
          signal,
          timer,
        },
      )
        .then(
          (connAndTimer) => {
            const nodeId = connAndTimer.connection.getNodeId();
            // Connection established, add it to the map
            establishedMap.set(nodeId, address);
            // Check if all nodes are established and trigger clean up
            if (establishedMap.size >= nodeIds.length) {
              abortController.abort(cleanUpReason);
            }
          },
          () => {
            // Connection failed, ignore error
          },
        )
        .finally(async () => {
          // Clean up
          await semaphoreReleaser();
          timer.cancel(cleanUpReason);
        });
      pendingConnectionProms.push(connectionProm);
    }
    await Promise.all(pendingConnectionProms);
    ctx.signal.removeEventListener('abort', abort);
    return establishedMap;
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

  protected hasBackoff(nodeId: NodeId): boolean {
    const backoff = this.nodesBackoffMap.get(nodeId.toString());
    if (backoff == null) return false;
    const currentTime = performance.now() + performance.timeOrigin;
    const backOffDeadline = backoff.lastAttempt + backoff.delay;
    return currentTime < backOffDeadline;
  }

  protected increaseBackoff(nodeId: NodeId): void {
    const backoff = this.nodesBackoffMap.get(nodeId.toString());
    const currentTime = performance.now() + performance.timeOrigin;
    if (backoff == null) {
      this.nodesBackoffMap.set(nodeId.toString(), {
        lastAttempt: currentTime,
        delay: this.backoffDefault,
      });
    } else {
      this.nodesBackoffMap.set(nodeId.toString(), {
        lastAttempt: currentTime,
        delay: backoff.delay * this.backoffMultiplier,
      });
    }
  }

  protected removeBackoff(nodeId: NodeId): void {
    this.nodesBackoffMap.delete(nodeId.toString());
  }
}

export default NodeConnectionManager;
