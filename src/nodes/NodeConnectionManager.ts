import type KeyManager from '../keys/KeyManager';
import type Proxy from '../network/Proxy';
import type { Host, Hostname, Port } from '../network/types';
import type { ResourceAcquire } from '../utils';
import type { Timer } from '../types';
import type NodeGraph from './NodeGraph';
import type {
  NodeId,
  NodeAddress,
  NodeData,
  SeedNodes,
  NodeIdString,
} from './types';
import Logger from '@matrixai/logger';
import { StartStop, ready } from '@matrixai/async-init/dist/StartStop';
import { IdInternal } from '@matrixai/id';
import { status } from '@matrixai/async-init';
import NodeConnection from './NodeConnection';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import GRPCClientAgent from '../agent/GRPCClientAgent';
import * as validationUtils from '../validation/utils';
import * as networkUtils from '../network/utils';
import * as agentErrors from '../agent/errors';
import * as grpcErrors from '../grpc/errors';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import { RWLock, withF } from '../utils';

type ConnectionAndLock = {
  connection?: NodeConnection<GRPCClientAgent>;
  timer?: NodeJS.Timer;
  lock: RWLock;
};

interface NodeConnectionManager extends StartStop {}
@StartStop()
class NodeConnectionManager {
  /**
   * Time used to estalish `NodeConnection`
   */
  public readonly connConnectTime: number;

  /**
   * Time to live for `NodeConnection`
   */
  public readonly connTimeoutTime: number;
  /**
   * Alpha constant for kademlia
   * The number of closest nodes to contact initially
   */
  public readonly initialClosestNodes: number;

  protected logger: Logger;
  protected nodeGraph: NodeGraph;
  protected keyManager: KeyManager;
  protected proxy: Proxy;
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
  protected connections: Map<NodeIdString, ConnectionAndLock> = new Map();

  public constructor({
    keyManager,
    nodeGraph,
    proxy,
    seedNodes = {},
    initialClosestNodes = 3,
    connConnectTime = 20000,
    connTimeoutTime = 60000,
    logger,
  }: {
    nodeGraph: NodeGraph;
    keyManager: KeyManager;
    proxy: Proxy;
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
    this.seedNodes = seedNodes;
    this.initialClosestNodes = initialClosestNodes;
    this.connConnectTime = connConnectTime;
    this.connTimeoutTime = connTimeoutTime;
  }

  public async start() {
    this.logger.info(`Starting ${this.constructor.name}`);
    for (const nodeIdEncoded in this.seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded)!;
      await this.nodeGraph.setNode(nodeId, this.seedNodes[nodeIdEncoded]);
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    for (const [nodeId, connAndLock] of this.connections) {
      if (connAndLock == null) continue;
      if (connAndLock.connection == null) continue;
      // It exists so we want to destroy it
      await this.destroyConnection(IdInternal.fromString<NodeId>(nodeId));
    }
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * For usage with withF, to acquire a connection in a
   * This unique acquire function structure of returning the ResourceAcquire
   * itself is such that we can pass targetNodeId as a parameter (as opposed to
   * an acquire function with no parameters).
   * @param targetNodeId Id of target node to communicate with
   * @returns ResourceAcquire Resource API for use in with contexts
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async acquireConnection(
    targetNodeId: NodeId,
  ): Promise<ResourceAcquire<NodeConnection<GRPCClientAgent>>> {
    return async () => {
      const connAndLock = await this.createConnection(targetNodeId);
      // Acquire the read lock and the release function
      const release = await connAndLock.lock.acquireRead();
      // Resetting TTL timer
      connAndLock.timer?.refresh();
      // Return tuple of [ResourceRelease, Resource]
      return [
        async () => {
          release();
        },
        connAndLock.connection,
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
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async withConnF<T>(
    targetNodeId: NodeId,
    f: (conn: NodeConnection<GRPCClientAgent>) => Promise<T>,
  ): Promise<T> {
    try {
      return await withF(
        [await this.acquireConnection(targetNodeId)],
        async ([conn]) => {
          return await f(conn);
        },
      );
    } catch (err) {
      if (
        err instanceof nodesErrors.ErrorNodeConnectionDestroyed ||
        err instanceof grpcErrors.ErrorGRPC ||
        err instanceof agentErrors.ErrorAgentClientDestroyed
      ) {
        // Error with connection, shutting connection down
        await this.destroyConnection(targetNodeId);
      }
      throw err;
    }
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
    g: (
      conn: NodeConnection<GRPCClientAgent>,
    ) => AsyncGenerator<T, TReturn, TNext>,
  ): AsyncGenerator<T, TReturn, TNext> {
    const acquire = await this.acquireConnection(targetNodeId);
    const [release, conn] = await acquire();
    try {
      return yield* await g(conn!);
    } catch (err) {
      if (
        err instanceof nodesErrors.ErrorNodeConnectionDestroyed ||
        err instanceof grpcErrors.ErrorGRPC ||
        err instanceof agentErrors.ErrorAgentClientDestroyed
      ) {
        // Error with connection, shutting connection down
        await release();
        await this.destroyConnection(targetNodeId);
      }
      throw err;
    } finally {
      await release();
    }
    // Wait for any destruction to complete after locking is removed
  }

  /**
   * Create a connection to another node (without performing any function).
   * This is a NOOP if a connection already exists.
   * @param targetNodeId Id of node we are creating connection to
   * @returns ConnectionAndLock that was create or exists in the connection map.
   */
  protected async createConnection(
    targetNodeId: NodeId,
  ): Promise<ConnectionAndLock> {
    this.logger.info(
      `Creating connection to ${nodesUtils.encodeNodeId(targetNodeId)}`,
    );
    let connection: NodeConnection<GRPCClientAgent> | undefined;
    let lock: RWLock;
    let connAndLock = this.connections.get(
      targetNodeId.toString() as NodeIdString,
    );
    if (connAndLock != null) {
      ({ connection, lock } = connAndLock);
      // Connection already exists, so return
      if (connection != null) return connAndLock;
      // Acquire the write (creation) lock
      return await lock.withWrite(async () => {
        // Once lock is released, check again if the conn now exists
        connAndLock = this.connections.get(
          targetNodeId.toString() as NodeIdString,
        );
        if (connAndLock != null && connAndLock.connection != null) {
          return connAndLock;
        }
        this.logger.info(
          `existing lock: creating connection to ${nodesUtils.encodeNodeId(
            targetNodeId,
          )}`,
        );
        // Creating the connection and set in map
        return await this.establishNodeConnection(targetNodeId, lock);
      });
    } else {
      lock = new RWLock();
      connAndLock = { lock };
      this.connections.set(
        targetNodeId.toString() as NodeIdString,
        connAndLock,
      );
      return await lock.withWrite(async () => {
        this.logger.info(
          `no existing entry: creating connection to ${nodesUtils.encodeNodeId(
            targetNodeId,
          )}`,
        );
        // Creating the connection and set in map
        return await this.establishNodeConnection(targetNodeId, lock);
      });
    }
  }

  /**
   * Strictly a helper function for this.createConnection. Do not call this
   * function anywhere else.
   * To create a connection to a node, always use createConnection, or
   * withConnection.
   * This only adds the connection to the connection map if the connection was established.
   * @param targetNodeId Id of node we are establishing connection to
   * @param lock Lock associated with connection
   * @returns ConnectionAndLock that was added to the connection map
   */
  protected async establishNodeConnection(
    targetNodeId: NodeId,
    lock: RWLock,
  ): Promise<ConnectionAndLock> {
    const targetAddress = await this.findNode(targetNodeId);
    // If the stored host is not a valid host (IP address), then we assume it to
    // be a hostname
    const targetHostname = !networkUtils.isHost(targetAddress.host)
      ? (targetAddress.host as string as Hostname)
      : undefined;
    const targetHost = await networkUtils.resolveHost(targetAddress.host);
    // Creating the destroyCallback
    const destroyCallback = async () => {
      // To avoid deadlock only in the case where this is called
      // we want to check for destroying connection and read lock
      const connAndLock = this.connections.get(
        targetNodeId.toString() as NodeIdString,
      );
      // If the connection is calling destroyCallback then it SHOULD
      // exist in the connection map
      if (connAndLock == null) throw Error('temp error, bad logic');
      // Already locked so already destroying
      if (connAndLock.lock.readerCount > 0) return;
      const connectionStatus = connAndLock?.connection?.[status];
      // Connection is already destroying
      if (connectionStatus === 'destroying') return;
      await this.destroyConnection(targetNodeId);
    };
    const connection = await NodeConnection.createNodeConnection({
      targetNodeId: targetNodeId,
      targetHost: targetHost,
      targetHostname: targetHostname,
      targetPort: targetAddress.port,
      proxy: this.proxy,
      keyManager: this.keyManager,
      nodeConnectionManager: this,
      destroyCallback,
      connConnectTime: this.connConnectTime,
      logger: this.logger.getChild(`${targetHost}:${targetAddress.port}`),
      clientFactory: async (args) =>
        GRPCClientAgent.createGRPCClientAgent(args),
    });
    // Creating TTL timeout
    const timer = setTimeout(async () => {
      await this.destroyConnection(targetNodeId);
    }, this.connTimeoutTime);
    // Add it to the map of active connections
    const connectionAndLock = { connection, lock, timer };
    this.connections.set(
      targetNodeId.toString() as NodeIdString,
      connectionAndLock,
    );
    return connectionAndLock;
  }

  /**
   * Removes the connection from the connection man and destroys it.
   * @param targetNodeId Id of node we are destroying connection to
   */
  protected async destroyConnection(targetNodeId: NodeId): Promise<void> {
    const connAndLock = this.connections.get(
      targetNodeId.toString() as NodeIdString,
    );
    if (connAndLock == null) return;
    const connection = connAndLock.connection;
    if (connection == null) return;
    const lock = connAndLock.lock;

    // If the connection exists then we lock, destroy and remove it from the map
    await lock.withWrite(async () => {
      // Destroying connection
      await connection.destroy();
      // Destroying TTL timer
      if (connAndLock.timer != null) clearTimeout(connAndLock.timer);
      // Updating the connection map
      this.connections.set(targetNodeId.toString() as NodeIdString, { lock });
    });
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
   * @param nodeId Node Id of the node we are connecting to
   * @param proxyHost Proxy host of the reverse proxy
   * @param proxyPort Proxy port of the reverse proxy
   * @param timer Connection timeout timer
   */
  public async holePunchForward(
    nodeId: NodeId,
    proxyHost: Host,
    proxyPort: Port,
    timer?: Timer,
  ): Promise<void> {
    await this.proxy.openConnectionForward(nodeId, proxyHost, proxyPort, timer);
  }

  /**
   * Retrieves the node address. If an entry doesn't exist in the db, then
   * proceeds to locate it using Kademlia.
   * @param targetNodeId Id of the node we are tying to find
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async findNode(targetNodeId: NodeId): Promise<NodeAddress> {
    // First check if we already have an existing ID -> address record

    let address = await this.nodeGraph.getNode(targetNodeId);
    // Otherwise, attempt to locate it by contacting network
    if (address == null) {
      address = await this.getClosestGlobalNodes(targetNodeId);
      // TODO: This currently just does one iteration
      // If not found in this single iteration, we throw an exception
      if (address == null) {
        throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();
      }
    }
    // We ensure that we always return a NodeAddress (either by lookup, or
    // network search) - if we can't locate it from either, we throw an exception
    return address;
  }

  /**
   * Finds the set of nodes (of size k) known by the current node (i.e. in its
   * buckets database) that have the smallest distance to the target node (i.e.
   * are closest to the target node).
   * i.e. FIND_NODE RPC from Kademlia spec
   *
   * Used by the RPC service.
   *
   * @param targetNodeId the node ID to find other nodes closest to it
   * @param numClosest the number of closest nodes to return (by default, returns
   * according to the maximum number of nodes per bucket)
   * @returns a mapping containing exactly k nodeIds -> nodeAddresses (unless the
   * current node has less than k nodes in all of its buckets, in which case it
   * returns all nodes it has knowledge of)
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async getClosestLocalNodes(
    targetNodeId: NodeId,
    numClosest: number = this.nodeGraph.maxNodesPerBucket,
  ): Promise<Array<NodeData>> {
    // Retrieve all nodes from buckets in database
    const buckets = await this.nodeGraph.getAllBuckets();
    // Iterate over all of the nodes in each bucket
    const distanceToNodes: Array<NodeData> = [];
    buckets.forEach(function (bucket) {
      for (const nodeIdString of Object.keys(bucket)) {
        // Compute the distance from the node, and add it to the array
        const nodeId = IdInternal.fromString<NodeId>(nodeIdString);
        distanceToNodes.push({
          id: nodeId,
          address: bucket[nodeId].address,
          distance: nodesUtils.calculateDistance(nodeId, targetNodeId),
        });
      }
    });
    // Sort the array (based on the distance at index 1)
    distanceToNodes.sort(nodesUtils.sortByDistance);
    // Return the closest k nodes (i.e. the first k), or all nodes if < k in array
    return distanceToNodes.slice(0, numClosest);
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
   * @returns whether the target node was located in the process
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async getClosestGlobalNodes(
    targetNodeId: NodeId,
  ): Promise<NodeAddress | undefined> {
    // Let foundTarget: boolean = false;
    let foundAddress: NodeAddress | undefined = undefined;
    // Get the closest alpha nodes to the target node (set as shortlist)
    const shortlist: Array<NodeData> = await this.getClosestLocalNodes(
      targetNodeId,
      this.initialClosestNodes,
    );
    // If we have no nodes at all in our database (even after synchronising),
    // then we should throw an error. We aren't going to find any others
    if (shortlist.length === 0) {
      throw new nodesErrors.ErrorNodeGraphEmptyDatabase();
    }
    // Need to keep track of the nodes that have been contacted
    // Not sufficient to simply check if there's already a pre-existing connection
    // in nodeConnections - what if there's been more than 1 invocation of
    // getClosestGlobalNodes()?
    const contacted: { [nodeId: string]: boolean } = {};
    // Iterate until we've found found and contacted k nodes
    while (Object.keys(contacted).length <= this.nodeGraph.maxNodesPerBucket) {
      // While (!foundTarget) {
      // Remove the node from the front of the array
      const nextNode = shortlist.shift();
      // If we have no nodes left in the shortlist, then stop
      if (nextNode == null) {
        break;
      }
      // Skip if the node has already been contacted
      if (contacted[nextNode.id]) {
        continue;
      }
      // Connect to the node (check if pre-existing connection exists, otherwise
      // create a new one)
      try {
        // Add the node to the database so that we can find its address in
        // call to getConnectionToNode
        await this.nodeGraph.setNode(nextNode.id, nextNode.address);
        await this.createConnection(nextNode.id);
      } catch (e) {
        // If we can't connect to the node, then skip it
        continue;
      }
      contacted[nextNode.id] = true;
      // Ask the node to get their own closest nodes to the target
      const foundClosest = await this.getRemoteNodeClosestNodes(
        nextNode.id,
        targetNodeId,
      );
      // Check to see if any of these are the target node. At the same time, add
      // them to the shortlist
      for (const nodeData of foundClosest) {
        // Ignore any nodes that have been contacted
        if (contacted[nodeData.id]) {
          continue;
        }
        if (nodeData.id.equals(targetNodeId)) {
          await this.nodeGraph.setNode(nodeData.id, nodeData.address);
          foundAddress = nodeData.address;
          // We have found the target node, so we can stop trying to look for it
          // in the shortlist
          break;
        }
        shortlist.push(nodeData);
      }
      // To make the number of jumps relatively short, should connect to the nodes
      // closest to the target first, and ask if they know of any closer nodes
      // Then we can simply unshift the first (closest) element from the shortlist
      shortlist.sort(function (a: NodeData, b: NodeData) {
        if (a.distance > b.distance) {
          return 1;
        } else if (a.distance < b.distance) {
          return -1;
        } else {
          return 0;
        }
      });
    }
    return foundAddress;
  }

  /**
   * Performs a GRPC request to retrieve the closest nodes relative to the given
   * target node ID.
   * @param nodeId the node ID to search on
   * @param targetNodeId the node ID to find other nodes closest to it
   * @returns list of nodes and their IP/port that are closest to the target
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async getRemoteNodeClosestNodes(
    nodeId: NodeId,
    targetNodeId: NodeId,
  ): Promise<Array<NodeData>> {
    // Construct the message
    const nodeIdMessage = new nodesPB.Node();
    nodeIdMessage.setNodeId(nodesUtils.encodeNodeId(targetNodeId));
    // Send through client
    return this.withConnF(nodeId, async (connection) => {
      const client = await connection.getClient();
      const response = await client.nodesClosestLocalNodesGet(nodeIdMessage);
      const nodes: Array<NodeData> = [];
      // Loop over each map element (from the returned response) and populate nodes
      response.getNodeTableMap().forEach((address, nodeIdString: string) => {
        const nodeId = nodesUtils.decodeNodeId(nodeIdString);
        // If the nodeId is not valid we don't add it to the list of nodes
        if (nodeId != null) {
          nodes.push({
            id: nodeId,
            address: {
              host: address.getHost() as Host | Hostname,
              port: address.getPort() as Port,
            },
            distance: nodesUtils.calculateDistance(targetNodeId, nodeId),
          });
        }
      });
      return nodes;
    });
  }

  /**
   * Perform an initial database synchronisation: get the k closest nodes
   * from each seed node and add them to this database
   * For now, we also attempt to establish a connection to each of them.
   * If these nodes are offline, this will impose a performance penalty,
   * so we should investigate performing this in the background if possible.
   * Alternatively, we can also just add the nodes to our database without
   * establishing connection.
   * This has been removed from start() as there's a chicken-egg scenario
   * where we require the NodeGraph instance to be created in order to get
   * connections.
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async syncNodeGraph() {
    for (const seedNodeId of this.getSeedNodes()) {
      // Check if the connection is viable
      try {
        await this.createConnection(seedNodeId);
      } catch (e) {
        if (e instanceof nodesErrors.ErrorNodeConnectionTimeout) continue;
        throw e;
      }

      const nodes = await this.getRemoteNodeClosestNodes(
        seedNodeId,
        this.keyManager.getNodeId(),
      );
      for (const n of nodes) {
        await this.nodeGraph.setNode(n.id, n.address);
      }
    }
  }

  /**
   * Performs a GRPC request to send a hole-punch message to the target. Used to
   * initially establish the NodeConnection from source to target.
   *
   * @param relayNodeId node ID of the relay node (i.e. the seed node)
   * @param sourceNodeId node ID of the current node (i.e. the sender)
   * @param targetNodeId node ID of the target node to hole punch
   * @param proxyAddress stringified address of `proxyHost:proxyPort`
   * @param signature signature to verify source node is sender (signature based
   * on proxyAddress as message)
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async sendHolePunchMessage(
    relayNodeId: NodeId,
    sourceNodeId: NodeId,
    targetNodeId: NodeId,
    proxyAddress: string,
    signature: Buffer,
  ): Promise<void> {
    const relayMsg = new nodesPB.Relay();
    relayMsg.setSrcId(nodesUtils.encodeNodeId(sourceNodeId));
    relayMsg.setTargetId(nodesUtils.encodeNodeId(targetNodeId));
    relayMsg.setProxyAddress(proxyAddress);
    relayMsg.setSignature(signature.toString());
    await this.withConnF(relayNodeId, async (connection) => {
      const client = connection.getClient();
      await client.nodesHolePunchMessageSend(relayMsg);
    });
  }

  /**
   * Forwards a received hole punch message on to the target.
   * If not known, the node ID -> address mapping is attempted to be discovered
   * through Kademlia (note, however, this is currently only called by a 'broker'
   * node).
   * @param message the original relay message (assumed to be created in
   * nodeConnection.start())
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async relayHolePunchMessage(message: nodesPB.Relay): Promise<void> {
    await this.sendHolePunchMessage(
      validationUtils.parseNodeId(message.getTargetId()),
      validationUtils.parseNodeId(message.getSrcId()),
      validationUtils.parseNodeId(message.getTargetId()),
      message.getProxyAddress(),
      Buffer.from(message.getSignature()),
    );
  }

  /**
   * Returns an array of the seed nodes.
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public getSeedNodes(): Array<NodeId> {
    const nodeIds = Object.keys(this.seedNodes).map(
      (nodeIdEncoded) => nodesUtils.decodeNodeId(nodeIdEncoded)!,
    );
    return nodeIds;
  }
}

export default NodeConnectionManager;
