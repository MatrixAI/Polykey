import type { ResourceAcquire } from '@matrixai/resources';
import type KeyManager from '../keys/KeyManager';
import type Proxy from '../network/Proxy';
import type { Host, Hostname, Port } from '../network/types';
import type { Timer } from '../types';
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
import type { ContextTimed } from 'contexts/types';
import type { PromiseCancellable } from '@matrixai/async-cancellable';
import { withF } from '@matrixai/resources';
import Logger from '@matrixai/logger';
import { ready, StartStop } from '@matrixai/async-init/dist/StartStop';
import { IdInternal } from '@matrixai/id';
import { status } from '@matrixai/async-init';
import { LockBox, RWLockWriter } from '@matrixai/async-locks';
import NodeConnection from './NodeConnection';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import { context, timedCancellable } from '../contexts';
import GRPCClientAgent from '../agent/GRPCClientAgent';
import * as validationUtils from '../validation/utils';
import * as networkUtils from '../network/utils';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import { timerStart, never } from '../utils';

type ConnectionAndTimer = {
  connection: NodeConnection<GRPCClientAgent>;
  timer: NodeJS.Timer;
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
   * Alpha constant for kademlia
   * The number of the closest nodes to contact initially
   */
  public readonly initialClosestNodes: number;

  protected logger: Logger;
  protected nodeGraph: NodeGraph;
  protected keyManager: KeyManager;
  protected proxy: Proxy;
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
  protected connectionLocks: LockBox<RWLockWriter> = new LockBox();
  // Tracks the backoff period for offline nodes
  protected nodesBackoffMap: Map<
    string,
    { lastAttempt: number; delay: number }
  > = new Map();
  protected backoffDefault: number = 300; // 5 min
  protected backoffMultiplier: number = 2; // Doubles every failure

  public constructor({
    keyManager,
    nodeGraph,
    proxy,
    taskManager,
    seedNodes = {},
    initialClosestNodes = 3,
    connConnectTime = 20000,
    connTimeoutTime = 60000,
    logger,
  }: {
    nodeGraph: NodeGraph;
    keyManager: KeyManager;
    proxy: Proxy;
    taskManager: TaskManager;
    seedNodes?: SeedNodes;
    initialClosestNodes?: number;
    connConnectTime?: number;
    connTimeoutTime?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(NodeConnectionManager.name);
    this.keyManager = keyManager;
    this.nodeGraph = nodeGraph;
    this.proxy = proxy;
    this.taskManager = taskManager;
    this.seedNodes = seedNodes;
    this.initialClosestNodes = initialClosestNodes;
    this.connConnectTime = connConnectTime;
    this.connTimeoutTime = connTimeoutTime;
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
   * @param timer Connection timeout timer
   * @returns ResourceAcquire Resource API for use in with contexts
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async acquireConnection(
    targetNodeId: NodeId,
    timer?: Timer,
  ): Promise<ResourceAcquire<NodeConnection<GRPCClientAgent>>> {
    return async () => {
      const { connection, timer: timeToLiveTimer } = await this.getConnection(
        targetNodeId,
        timer,
      );
      // Acquire the read lock and the release function
      const [release] = await this.connectionLocks.lock([
        targetNodeId.toString(),
        RWLockWriter,
        'write',
      ])();
      // Resetting TTL timer
      timeToLiveTimer?.refresh();
      // Return tuple of [ResourceRelease, Resource]
      return [
        async (e) => {
          await release();
          if (nodesUtils.isConnectionError(e)) {
            // Error with connection, shutting connection down
            await this.destroyConnection(targetNodeId);
          }
        },
        connection,
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
   * @param timer Connection timeout timer
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async withConnF<T>(
    targetNodeId: NodeId,
    f: (conn: NodeConnection<GRPCClientAgent>) => Promise<T>,
    timer?: Timer,
  ): Promise<T> {
    return await withF(
      [await this.acquireConnection(targetNodeId, timer)],
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
   * @param timer Connection timeout timer
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async *withConnG<T, TReturn, TNext>(
    targetNodeId: NodeId,
    g: (
      conn: NodeConnection<GRPCClientAgent>,
    ) => AsyncGenerator<T, TReturn, TNext>,
    timer?: Timer,
  ): AsyncGenerator<T, TReturn, TNext> {
    const acquire = await this.acquireConnection(targetNodeId, timer);
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
   * @param targetNodeId Id of node we are creating connection to
   * @param timer Connection timeout timer
   * @returns ConnectionAndLock that was created or exists in the connection map
   */
  protected async getConnection(
    targetNodeId: NodeId,
    timer?: Timer,
  ): Promise<ConnectionAndTimer> {
    const targetNodeIdString = targetNodeId.toString() as NodeIdString;
    return await this.connectionLocks.withF(
      [targetNodeIdString, RWLockWriter, 'write'],
      async () => {
        const connAndTimer = this.connections.get(targetNodeIdString);
        if (connAndTimer != null) return connAndTimer;
        // Creating the connection and set in map
        const targetAddress = await this.findNode(targetNodeId);
        if (targetAddress == null) {
          throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();
        }
        // If the stored host is not a valid host (IP address),
        // then we assume it to be a hostname
        const targetHostname = !networkUtils.isHost(targetAddress.host)
          ? (targetAddress.host as string as Hostname)
          : undefined;
        const targetHost = await networkUtils.resolveHost(targetAddress.host);
        // Creating the destroyCallback
        const destroyCallback = async () => {
          // To avoid deadlock only in the case where this is called
          // we want to check for destroying connection and read lock
          const connAndTimer = this.connections.get(targetNodeIdString);
          // If the connection is calling destroyCallback then it SHOULD
          // exist in the connection map
          if (connAndTimer == null) return;
          // Already locked so already destroying
          if (this.connectionLocks.isLocked(targetNodeIdString)) return;
          // Connection is already destroying
          if (connAndTimer?.connection?.[status] === 'destroying') return;
          await this.destroyConnection(targetNodeId);
        };
        // Creating new connection
        const newConnection = await NodeConnection.createNodeConnection({
          targetNodeId: targetNodeId,
          targetHost: targetHost,
          targetHostname: targetHostname,
          targetPort: targetAddress.port,
          proxy: this.proxy,
          keyManager: this.keyManager,
          nodeConnectionManager: this,
          destroyCallback,
          timer: timer ?? timerStart(this.connConnectTime),
          logger: this.logger.getChild(
            `${NodeConnection.name} ${targetHost}:${targetAddress.port}`,
          ),
          clientFactory: async (args) =>
            GRPCClientAgent.createGRPCClientAgent(args),
        });
        // We can assume connection was established and destination was valid,
        // we can add the target to the nodeGraph
        await this.nodeManager?.setNode(targetNodeId, targetAddress);
        // Creating TTL timeout
        const timeToLiveTimer = setTimeout(async () => {
          await this.destroyConnection(targetNodeId);
        }, this.connTimeoutTime);

        const newConnAndTimer: ConnectionAndTimer = {
          connection: newConnection,
          timer: timeToLiveTimer,
        };
        this.connections.set(targetNodeIdString, newConnAndTimer);
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
      [targetNodeIdString, RWLockWriter, 'write'],
      async () => {
        const connAndTimer = this.connections.get(targetNodeIdString);
        if (connAndTimer?.connection == null) return;
        await connAndTimer.connection.destroy();
        // Destroying TTL timer
        if (connAndTimer.timer != null) clearTimeout(connAndTimer.timer);
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
   * @param timer Connection timeout timer
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async holePunchReverse(
    proxyHost: Host,
    proxyPort: Port,
    timer?: Timer,
  ): Promise<void> {
    await this.proxy.openConnectionReverse(proxyHost, proxyPort, timer);
  }

  /**
   * Treat this node as the client.
   * Instruct the forward proxy to send hole-punching packets back to the target's
   * reverse proxy, in order to open a connection from this client to the server.
   * A connection is established if the client node's reverse proxy is sending
   * hole punching packets at the same time as this node (acting as the client)
   * sends hole-punching packets back to the server's reverse proxy.
   * This is not needed to be called when doing hole punching since the
   * ForwardProxy automatically starts the process.
   * @param nodeId Node ID of the node we are connecting to
   * @param proxyHost Proxy host of the reverse proxy
   * @param proxyPort Proxy port of the reverse proxy
   * @param ctx
   */
  public async holePunchForward(
    nodeId: NodeId,
    proxyHost: Host,
    proxyPort: Port,
    ctx?: ContextTimed,
  ): Promise<void> {
    const timer =
      ctx?.timer.getTimeout() != null
        ? timerStart(ctx.timer.getTimeout())
        : undefined;
    await this.proxy.openConnectionForward(nodeId, proxyHost, proxyPort, timer);
  }

  /**
   * Retrieves the node address. If an entry doesn't exist in the db, then
   * proceeds to locate it using Kademlia.
   * @param targetNodeId Id of the node we are tying to find
   * @param ignoreRecentOffline skips nodes that are within their backoff period
   * @param ctx
   */
  public findNode(
    targetNodeId: NodeId,
    ignoreRecentOffline?: boolean,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<NodeAddress | undefined>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(true, 20000)
  public async findNode(
    targetNodeId: NodeId,
    ignoreRecentOffline: boolean = false,
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
   * @param ctx
   * @returns whether the target node was located in the process
   */
  public getClosestGlobalNodes(
    targetNodeId: NodeId,
    ignoreRecentOffline?: boolean,
    ctx?: Partial<ContextTimed>,
  ): PromiseCancellable<NodeAddress | undefined>;
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  @timedCancellable(true, 20000)
  public async getClosestGlobalNodes(
    targetNodeId: NodeId,
    ignoreRecentOffline: boolean = false,
    @context ctx: ContextTimed,
  ): Promise<NodeAddress | undefined> {
    const localNodeId = this.keyManager.getNodeId();
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
          ctx,
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
          ctx,
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
            ctx,
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
  @timedCancellable(true, 20000)
  public async getRemoteNodeClosestNodes(
    nodeId: NodeId,
    targetNodeId: NodeId,
    @context ctx: ContextTimed,
  ): Promise<Array<[NodeId, NodeData]>> {
    // Construct the message
    const nodeIdMessage = new nodesPB.Node();
    nodeIdMessage.setNodeId(nodesUtils.encodeNodeId(targetNodeId));
    try {
      // Send through client
      const timeout = ctx.timer.getTimeout();
      const response = await this.withConnF(
        nodeId,
        async (connection) => {
          const client = connection.getClient();
          return await client.nodesClosestLocalNodesGet(nodeIdMessage);
        },
        timeout === Infinity ? undefined : timerStart(timeout),
      );
      const nodes: Array<[NodeId, NodeData]> = [];
      // Loop over each map element (from the returned response) and populate nodes
      response.getNodeTableMap().forEach((address, nodeIdString: string) => {
        const nodeId = nodesUtils.decodeNodeId(nodeIdString);
        // If the nodeId is not valid we don't add it to the list of nodes
        if (nodeId != null) {
          nodes.push([
            nodeId,
            {
              address: {
                host: address.getHost() as Host | Hostname,
                port: address.getPort() as Port,
              },
              // Not really needed
              // But if it's needed then we need to add the information to the proto definition
              lastUpdated: 0,
            },
          ]);
        }
      });
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
   * @param proxyAddress string of address in the form `proxyHost:proxyPort`
   * @param signature signature to verify source node is sender (signature based
   * @param timer Connection timeout timer
   * on proxyAddress as message)
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async sendHolePunchMessage(
    relayNodeId: NodeId,
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    proxyAddress: string,
    signature: Buffer,
    timer?: Timer,
  ): Promise<void> {
    const relayMsg = new nodesPB.Relay();
    relayMsg.setSrcId(nodesUtils.encodeNodeId(sourceNodeId));
    relayMsg.setTargetId(nodesUtils.encodeNodeId(targetNodeId));
    relayMsg.setProxyAddress(proxyAddress);
    relayMsg.setSignature(signature.toString());
    await this.withConnF(
      relayNodeId,
      async (connection) => {
        const client = connection.getClient();
        await client.nodesHolePunchMessageSend(relayMsg);
      },
      timer,
    );
  }

  /**
   * Forwards a received hole punch message on to the target.
   * If not known, the node ID -> address mapping is attempted to be discovered
   * through Kademlia (note, however, this is currently only called by a 'broker'
   * node).
   * @param message the original relay message (assumed to be created in
   * nodeConnection.start())
   * @param timer Connection timeout timer
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async relayHolePunchMessage(
    message: nodesPB.Relay,
    timer?: Timer,
  ): Promise<void> {
    // First check if we already have an existing ID -> address record
    // If we're relaying then we trust our own node graph records over
    // what was provided in the message
    const sourceNode = validationUtils.parseNodeId(message.getSrcId());
    const knownAddress = (await this.nodeGraph.getNode(sourceNode))?.address;
    let proxyAddress = message.getProxyAddress();
    if (knownAddress != null) {
      proxyAddress = networkUtils.buildAddress(
        knownAddress.host as Host,
        knownAddress.port,
      );
    }
    await this.sendHolePunchMessage(
      validationUtils.parseNodeId(message.getTargetId()),
      sourceNode,
      validationUtils.parseNodeId(message.getTargetId()),
      proxyAddress,
      Buffer.from(message.getSignature()),
      timer,
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
  @timedCancellable(true, 20000)
  public async pingNode(
    nodeId: NodeId,
    host: Host | Hostname,
    port: Port,
    @context ctx: ContextTimed,
  ): Promise<boolean> {
    host = await networkUtils.resolveHost(host);
    // If we can create a connection then we have punched though the NAT,
    // authenticated and confirmed the nodeId matches
    const proxyAddress = networkUtils.buildAddress(
      this.proxy.getProxyHost(),
      this.proxy.getProxyPort(),
    );
    const signature = await this.keyManager.signWithRootKeyPair(
      Buffer.from(proxyAddress),
    );
    // FIXME: this needs to handle aborting
    const holePunchPromises = Array.from(this.getSeedNodes(), (seedNodeId) => {
      return this.sendHolePunchMessage(
        seedNodeId,
        this.keyManager.getNodeId(),
        nodeId,
        proxyAddress,
        signature,
      );
    });
    const forwardPunchPromise = this.holePunchForward(nodeId, host, port, ctx);

    const abortPromise = new Promise((_resolve, reject) => {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      ctx.signal.addEventListener('abort', () => reject(ctx.signal.reason));
    });

    try {
      await Promise.race([
        Promise.any([forwardPunchPromise, ...holePunchPromises]),
        abortPromise,
      ]);
    } catch (e) {
      return false;
    }
    return true;
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
