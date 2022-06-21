import type { ResourceAcquire } from '@matrixai/resources';
import type KeyManager from '../keys/KeyManager';
import type Proxy from '../network/Proxy';
import type { Host, Hostname, Port } from '../network/types';
import type { Timer } from '../types';
import type NodeGraph from './NodeGraph';
import type Queue from './Queue';
import type {
  NodeAddress,
  NodeData,
  NodeId,
  NodeIdString,
  SeedNodes,
} from './types';
import type NodeManager from './NodeManager';
import { withF } from '@matrixai/resources';
import Logger from '@matrixai/logger';
import { ready, StartStop } from '@matrixai/async-init/dist/StartStop';
import { IdInternal } from '@matrixai/id';
import { status } from '@matrixai/async-init';
import { LockBox, RWLockWriter } from '@matrixai/async-locks';
import NodeConnection from './NodeConnection';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import GRPCClientAgent from '../agent/GRPCClientAgent';
import * as validationUtils from '../validation/utils';
import * as networkUtils from '../network/utils';
import * as agentErrors from '../agent/errors';
import * as grpcErrors from '../grpc/errors';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import { timerStart } from '../utils';

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
  protected queue: Queue;
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

  public constructor({
    keyManager,
    nodeGraph,
    proxy,
    queue,
    seedNodes = {},
    initialClosestNodes = 3,
    connConnectTime = 20000,
    connTimeoutTime = 60000,
    logger,
  }: {
    nodeGraph: NodeGraph;
    keyManager: KeyManager;
    proxy: Proxy;
    queue: Queue;
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
    this.queue = queue;
    this.seedNodes = seedNodes;
    this.initialClosestNodes = initialClosestNodes;
    this.connConnectTime = connConnectTime;
    this.connTimeoutTime = connTimeoutTime;
  }

  public async start({ nodeManager }: { nodeManager: NodeManager }) {
    this.logger.info(`Starting ${this.constructor.name}`);
    this.nodeManager = nodeManager;
    for (const nodeIdEncoded in this.seedNodes) {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded)!;
      await this.nodeManager.setNode(
        nodeId,
        this.seedNodes[nodeIdEncoded],
        true,
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
          if (
            e instanceof nodesErrors.ErrorNodeConnectionDestroyed ||
            e instanceof grpcErrors.ErrorGRPC ||
            e instanceof agentErrors.ErrorAgentClientDestroyed
          ) {
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
      async ([conn]) => {
        this.logger.info(
          `withConnF calling function with connection to ${nodesUtils.encodeNodeId(
            targetNodeId,
          )}`,
        );
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
      return yield* g(conn!);
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
    this.logger.info(
      `Getting connection to ${nodesUtils.encodeNodeId(targetNodeId)}`,
    );
    const targetNodeIdString = targetNodeId.toString() as NodeIdString;
    return await this.connectionLocks.withF(
      [targetNodeIdString, RWLockWriter, 'write'],
      async () => {
        const connAndTimer = this.connections.get(targetNodeIdString);
        if (connAndTimer != null) {
          this.logger.info(
            `existing entry found for ${nodesUtils.encodeNodeId(targetNodeId)}`,
          );
          return connAndTimer;
        }
        this.logger.info(
          `no existing entry, creating connection to ${nodesUtils.encodeNodeId(
            targetNodeId,
          )}`,
        );
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
        await this.nodeManager?.setNode(targetNodeId, targetAddress, false);
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
   * @param options
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async findNode(
    targetNodeId: NodeId,
    options: { signal?: AbortSignal } = {},
  ): Promise<NodeAddress | undefined> {
    const { signal } = { ...options };
    // First check if we already have an existing ID -> address record
    let address = (await this.nodeGraph.getNode(targetNodeId))?.address;
    // Otherwise, attempt to locate it by contacting network
    address =
      address ??
      (await this.getClosestGlobalNodes(targetNodeId, undefined, {
        signal,
      }));
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
   * @param timer Connection timeout timer
   * @param options
   * @returns whether the target node was located in the process
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async getClosestGlobalNodes(
    targetNodeId: NodeId,
    timer?: Timer,
    options: { signal?: AbortSignal } = {},
  ): Promise<NodeAddress | undefined> {
    const localNodeId = this.keyManager.getNodeId();
    const { signal } = { ...options };
    // Let foundTarget: boolean = false;
    let foundAddress: NodeAddress | undefined = undefined;
    // Get the closest alpha nodes to the target node (set as shortlist)
    // FIXME? this is an array. Shouldn't it be a set?
    //  It's possible for this to grow faster than we can consume it,
    //  doubly so if we allow duplicates
    const shortlist = await this.nodeGraph.getClosestNodes(
      targetNodeId,
      this.initialClosestNodes,
    );
    // If we have no nodes at all in our database (even after synchronising),
    // then we should throw an eor. We aren't going to find any others
    if (shortlist.length === 0) {
      throw new nodesErrors.ErrorNodeGraphEmptyDatabase();
    }
    // Need to keep track of the nodes that have been contacted
    // Not sufficient to simply check if there's already a pre-existing connection
    // in nodeConnections - what if there's been more than 1 invocation of
    // getClosestGlobalNodes()?
    const contacted: { [nodeId: string]: boolean } = {};
    // Iterate until we've found and contacted k nodes
    while (Object.keys(contacted).length <= this.nodeGraph.nodeBucketLimit) {
      if (signal?.aborted) throw new nodesErrors.ErrorNodeAborted();
      // While (!foundTarget) {
      // Remove the node from the front of the array
      const nextNode = shortlist.shift();
      // If we have no nodes left in the shortlist, then stop
      if (nextNode == null) {
        break;
      }
      const [nextNodeId, nextNodeAddress] = nextNode;
      // Skip if the node has already been contacted
      if (contacted[nextNodeId]) {
        continue;
      }
      // Connect to the node (check if pre-existing connection exists, otherwise
      // create a new one)
      if (
        await this.pingNode(
          nextNodeId,
          nextNodeAddress.address.host,
          nextNodeAddress.address.port,
        )
      ) {
        await this.nodeManager!.setNode(nextNodeId, nextNodeAddress.address);
      } else {
        continue;
      }
      contacted[nextNodeId] = true;
      // Ask the node to get their own closest nodes to the target
      const foundClosest = await this.getRemoteNodeClosestNodes(
        nextNodeId,
        targetNodeId,
        timer,
      );
      // Check to see if any of these are the target node. At the same time, add
      // them to the shortlist
      for (const [nodeId, nodeData] of foundClosest) {
        if (signal?.aborted) throw new nodesErrors.ErrorNodeAborted();
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
    return foundAddress;
  }

  /**
   * Performs a GRPC request to retrieve the closest nodes relative to the given
   * target node ID.
   * @param nodeId the node ID to search on
   * @param targetNodeId the node ID to find other nodes closest to it
   * @param timer Connection timeout timer
   * @returns list of nodes and their IP/port that are closest to the target
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async getRemoteNodeClosestNodes(
    nodeId: NodeId,
    targetNodeId: NodeId,
    timer?: Timer,
  ): Promise<Array<[NodeId, NodeData]>> {
    // Construct the message
    const nodeIdMessage = new nodesPB.Node();
    nodeIdMessage.setNodeId(nodesUtils.encodeNodeId(targetNodeId));
    // Send through client
    return this.withConnF(
      nodeId,
      async (connection) => {
        const client = connection.getClient();
        const response = await client.nodesClosestLocalNodesGet(nodeIdMessage);
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
      },
      timer,
    );
  }

  /**
   * Perform an initial database synchronisation: get k of the closest nodes
   * from each seed node and add them to this database
   * Establish a proxy connection to each node before adding it
   * By default this operation is blocking, set `block` to false to make it
   * non-blocking
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async syncNodeGraph(block: boolean = true, timer?: Timer) {
    this.logger.info('Syncing nodeGraph');
    for (const seedNodeId of this.getSeedNodes()) {
      // Check if the connection is viable
      try {
        await this.getConnection(seedNodeId, timer);
      } catch (e) {
        if (e instanceof nodesErrors.ErrorNodeConnectionTimeout) continue;
        throw e;
      }
      const nodes = await this.getRemoteNodeClosestNodes(
        seedNodeId,
        this.keyManager.getNodeId(),
        timer,
      );
      for (const [nodeId, nodeData] of nodes) {
        if (!nodeId.equals(this.keyManager.getNodeId())) {
          const pingAndAddNode = async () => {
            const port = nodeData.address.port;
            const host = await networkUtils.resolveHost(nodeData.address.host);
            if (await this.pingNode(nodeId, host, port)) {
              await this.nodeManager!.setNode(nodeId, nodeData.address, true);
            }
          };

          if (!block) {
            this.queue.push(pingAndAddNode);
          } else {
            try {
              await pingAndAddNode();
            } catch (e) {
              if (!(e instanceof nodesErrors.ErrorNodeGraphSameNodeId)) throw e;
            }
          }
        }
      }
      // Refreshing every bucket above the closest node
      const refreshBuckets = async () => {
        const [closestNode] = (
          await this.nodeGraph.getClosestNodes(this.keyManager.getNodeId(), 1)
        ).pop()!;
        const [bucketIndex] = this.nodeGraph.bucketIndex(closestNode);
        for (let i = bucketIndex; i < this.nodeGraph.nodeIdBits; i++) {
          this.nodeManager?.refreshBucketQueueAdd(i);
        }
      };
      if (!block) {
        this.queue.push(refreshBuckets);
      } else {
        await refreshBuckets();
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
    await this.sendHolePunchMessage(
      validationUtils.parseNodeId(message.getTargetId()),
      validationUtils.parseNodeId(message.getSrcId()),
      validationUtils.parseNodeId(message.getTargetId()),
      message.getProxyAddress(),
      Buffer.from(message.getSignature()),
      timer,
    );
  }

  /**
   * Returns an array of the seed nodes.
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public getSeedNodes(): Array<NodeId> {
    return Object.keys(this.seedNodes).map(
      (nodeIdEncoded) => nodesUtils.decodeNodeId(nodeIdEncoded)!,
    );
  }

  /**
   * Checks if a connection can be made to the target. Returns true if the
   * connection can be authenticated, it's certificate matches the nodeId and
   * the addresses match if provided. Otherwise returns false.
   * @param nodeId - NodeId of the target
   * @param host - Host of the target node
   * @param port - Port of the target node
   * @param timer Connection timeout timer
   */
  @ready(new nodesErrors.ErrorNodeConnectionManagerNotRunning())
  public async pingNode(
    nodeId: NodeId,
    host: Host | Hostname,
    port: Port,
    timer?: Timer,
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
    const holePunchPromises = Array.from(this.getSeedNodes(), (seedNodeId) => {
      return this.sendHolePunchMessage(
        seedNodeId,
        this.keyManager.getNodeId(),
        nodeId,
        proxyAddress,
        signature,
      );
    });
    const forwardPunchPromise = this.holePunchForward(
      nodeId,
      host,
      port,
      timer,
    );

    try {
      await Promise.any([forwardPunchPromise, ...holePunchPromises]);
    } catch (e) {
      return false;
    }
    return true;
  }
}

export default NodeConnectionManager;
