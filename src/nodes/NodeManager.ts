import type { KeyManager } from '../keys';
import type { PublicKeyPem } from '../keys/types';
import type { Sigchain } from '../sigchain';
import type { ChainData, ChainDataEncoded } from '../sigchain/types';
import type { ClaimIdString } from '../claims/types';
import type {
  NodeId,
  NodeAddress,
  NodeData,
  NodeBucket,
  NodeConnectionMap,
} from '../nodes/types';
import type { SignedNotification } from '../notifications/types';
import type { Host, Port } from '../network/types';
import type { FileSystem, Timer } from '../types';
import type { DB } from '@matrixai/db';

import Logger from '@matrixai/logger';
import NodeGraph from './NodeGraph';
import NodeConnection from './NodeConnection';
import * as nodesErrors from './errors';
import { errors as dbErrors } from '@matrixai/db';
import * as networkErrors from '../network/errors';
import * as sigchainUtils from '../sigchain/utils';
import * as claimsUtils from '../claims/utils';
import { GRPCClientAgent } from '../agent';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import { ForwardProxy, ReverseProxy } from '../network';
import { Mutex } from 'async-mutex';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';

interface NodeManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new nodesErrors.ErrorNodeManagerNotStarted(),
  new nodesErrors.ErrorNodeManagerDestroyed(),
)
class NodeManager {
  // LevelDB directory to store all the information for managing nodes
  // public readonly nodesPath: string;

  protected db: DB;
  protected fs: FileSystem;
  protected logger: Logger;
  protected lock: Mutex = new Mutex();

  protected nodeGraph: NodeGraph;
  protected sigchain: Sigchain;
  protected keyManager: KeyManager;
  protected fwdProxy: ForwardProxy;
  protected revProxy: ReverseProxy;

  // Active connections to other nodes
  // protected connections: Map<NodeId, NodeConnection> = new Map();
  protected connections: NodeConnectionMap = new Map();
  // Node ID -> node address mappings for the bootstrap/broker nodes
  protected brokerNodes: NodeBucket = {};
  protected brokerNodeConnections: Map<NodeId, NodeConnection> = new Map();

  static async createNodeManager({
    db,
    sigchain,
    keyManager,
    fwdProxy,
    revProxy,
    fs,
    logger,
  }: {
    db: DB;
    sigchain: Sigchain;
    keyManager: KeyManager;
    fwdProxy: ForwardProxy;
    revProxy: ReverseProxy;
    fs?: FileSystem;
    logger?: Logger;
  }): Promise<NodeManager> {
    const logger_ = logger ?? new Logger('NodeManager');
    const fs_ = fs ?? require('fs');

    return new NodeManager({
      db,
      fs: fs_,
      fwdProxy,
      keyManager,
      logger: logger_,
      revProxy,
      sigchain,
    });
  }

  constructor({
    db,
    sigchain,
    keyManager,
    fwdProxy,
    revProxy,
    fs,
    logger,
  }: {
    db: DB;
    sigchain: Sigchain;
    keyManager: KeyManager;
    fwdProxy: ForwardProxy;
    revProxy: ReverseProxy;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger ?? new Logger('NodeManager');
    this.db = db;
    this.fs = fs;

    this.logger.info('Creating Node Manager');
    // Instantiate the node graph (containing Kademlia implementation)
    this.nodeGraph = new NodeGraph({
      db: db,
      nodeManager: this,
      logger: this.logger,
    });
    this.sigchain = sigchain;
    this.keyManager = keyManager;
    this.fwdProxy = fwdProxy;
    this.revProxy = revProxy;
    this.logger.info('Created Node Manager');
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  public async start({
    brokerNodes = {},
    fresh = false,
  }: {
    brokerNodes?: NodeBucket;
    fresh?: boolean;
  } = {}) {
    this.logger.info('Starting Node Manager');
    if (!this.db.running) {
      throw new dbErrors.ErrorDBNotRunning();
    }
    // Establish and start connections to the brokers
    for (const brokerId in brokerNodes) {
      await this.createConnectionToBroker(
        brokerId as NodeId,
        brokerNodes[brokerId].address,
      );
    }
    await this.nodeGraph.start({ fresh });
    this.logger.info('Started Node Manager');
  }

  public async stop() {
    this.logger.info('Stopping Node Manager');
    for (const [targetNodeId, connLock] of this.connections) {
      if (connLock?.connection != null) {
        await connLock.connection.stop();
      }
      // TODO: Potentially, we could instead re-start any connections in start
      // This assumes that after stopping the proxies, their connections are
      // also still valid on restart though.
      this.connections.delete(targetNodeId);
    }
    for (const [, conn] of this.brokerNodeConnections) {
      await conn.stop();
    }
    await this.nodeGraph.stop();
    this.logger.info('Stopped Node Manager');
  }

  public async destroy() {
    this.logger.info('Destroyed Node Manager');
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(f: (that: this) => Promise<T>): Promise<T> {
    const release = await this.lock.acquire();
    try {
      return await f(this);
    } finally {
      release();
    }
  }

  /**
   * Transaction wrapper that will not lock if the operation was executed
   * within a transaction context
   */
  public async _transaction<T>(f: () => Promise<T>): Promise<T> {
    if (this.lock.isLocked()) {
      return await f();
    } else {
      return await this.transaction(f);
    }
  }

  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async getClosestLocalNodes(
    targetNodeId: NodeId,
  ): Promise<Array<NodeData>> {
    return await this.nodeGraph.getClosestLocalNodes(targetNodeId);
  }

  /**
   * Determines whether a node ID -> node address mapping exists in this node's
   * node table.
   * @param targetNodeId the node ID of the node to find
   * @returns true if the node exists in the table, false otherwise
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async knowsNode(targetNodeId: NodeId): Promise<boolean> {
    if (await this.nodeGraph.getNode(targetNodeId)) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Determines whether a node in the Polykey network is online.
   * @return true if online, false if offline
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async pingNode(targetNodeId: NodeId): Promise<boolean> {
    const targetAddress: NodeAddress = await this.findNode(targetNodeId);
    try {
      // Attempt to open a connection via the forward proxy
      // i.e. no NodeConnection object created (no need for GRPCClient)
      await this.fwdProxy.openConnection(
        targetNodeId,
        targetAddress.ip,
        targetAddress.port,
      );
    } catch (e) {
      // If the connection request times out, then return false
      if (e instanceof networkErrors.ErrorConnectionStart) {
        return false;
      }
      // Throw any other error back up the callstack
      throw e;
    }
    return true;
  }

  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public getNodeId(): NodeId {
    return this.keyManager.getNodeId();
  }

  /**
   * Connects to the target node and retrieves its public key from its root
   * certificate chain (corresponding to the provided public key fingerprint -
   * the node ID).
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async getPublicKey(targetNodeId: NodeId): Promise<PublicKeyPem> {
    const connection = await this.getConnectionToNode(targetNodeId);
    const publicKey = connection.getExpectedPublicKey(
      targetNodeId,
    ) as PublicKeyPem;
    if (!publicKey == null) {
      throw new nodesErrors.ErrorNodeConnectionPublicKeyNotFound();
    }
    return publicKey;
  }

  /**
   * Retrieves the cryptolinks of this node, returning as a collection of
   * records (for storage in the gestalt graph)
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async getChainData(): Promise<ChainDataEncoded> {
    return await this.sigchain.getChainData();
  }

  /**
   * Connects to the target node, and retrieves its sigchain data.
   * Verifies and returns the decoded chain as ChainData. Note: this will drop
   * any unverifiable claims.
   * For node1 -> node2 claims, the verification process also involves connecting
   * to node2 to verify the claim (to retrieve its signing public key).
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async requestChainData(targetNodeId: NodeId): Promise<ChainData> {
    const connection = await this.getConnectionToNode(targetNodeId);
    // Verify the node's chain with its own public key
    const unverifiedChainData = await connection.getChainData();
    const publicKey = connection.getExpectedPublicKey(
      targetNodeId,
    ) as PublicKeyPem;
    if (!publicKey) {
      throw new nodesErrors.ErrorNodeConnectionPublicKeyNotFound();
    }
    const verifiedChainData = await sigchainUtils.verifyChainData(
      unverifiedChainData,
      publicKey,
    );

    // Then, for any node -> node claims, we also need to verify with the
    // node on the other end of the claim
    // e.g. a node claim from A -> B, verify with B's public key
    for (const c in verifiedChainData) {
      const claimId = c as ClaimIdString;
      const payload = verifiedChainData[claimId].payload;
      if (payload.data.type === 'node') {
        const endNodeId = payload.data.node2;
        let endPublicKey: PublicKeyPem;
        // If the claim points back to our own node, don't attempt to connect
        if (endNodeId === this.getNodeId()) {
          endPublicKey = this.keyManager.getRootKeyPairPem().publicKey;
          // Otherwise, get the public key from the root cert chain (by connection)
        } else {
          const endConnection = await this.getConnectionToNode(endNodeId);
          endPublicKey = endConnection.getExpectedPublicKey(
            endNodeId,
          ) as PublicKeyPem;
          if (!endPublicKey) {
            throw new nodesErrors.ErrorNodeConnectionPublicKeyNotFound();
          }
        }
        const verified = await claimsUtils.verifyClaimSignature(
          unverifiedChainData[claimId],
          endPublicKey,
        );
        // If unverifiable, remove the claim from the ChainData to return
        if (!verified) {
          delete verifiedChainData[claimId];
        }
      }
    }
    return verifiedChainData;
  }

  /**
   * Call this function upon receiving a "claim node request" notification from
   * another node.
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async claimNode(targetNodeId: NodeId): Promise<void> {
    const connection: NodeConnection = await this.getConnectionToNode(
      targetNodeId,
    );
    await this.sigchain.transaction(async (sigchain) => {
      // 2. Create your intermediary claim
      const singlySignedClaim = await sigchain.createIntermediaryClaim({
        type: 'node',
        node1: this.getNodeId(),
        node2: targetNodeId,
      });
      // Receive back your verified doubly signed claim.
      const doublySignedClaim = await connection.claimNode(singlySignedClaim);
      await sigchain.addExistingClaim(doublySignedClaim);
    });
  }

  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
  ): Promise<void> {
    await this.nodeGraph.setNode(nodeId, nodeAddress);
  }

  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async getClosestGlobalNodes(
    targetNodeId: NodeId,
  ): Promise<NodeAddress | undefined> {
    return await this.nodeGraph.getClosestGlobalNodes(targetNodeId);
  }

  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async getAllBuckets(): Promise<Array<NodeBucket>> {
    return await this.nodeGraph.getAllBuckets();
  }

  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async refreshBuckets(): Promise<void> {
    return await this.nodeGraph.refreshBuckets();
  }

  /**
   * Forwards a received hole punch message on to the target.
   * If not known, the node ID -> address mapping is attempted to be discovered
   * through Kademlia (note, however, this is currently only called by a 'broker'
   * node).
   * @param message the original relay message (assumed to be created in
   * nodeConnection.start())
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async relayHolePunchMessage(message: nodesPB.Relay): Promise<void> {
    const conn = await this.getConnectionToNode(
      message.getTargetId() as NodeId,
    );
    await conn.sendHolePunchMessage(
      message.getSrcId() as NodeId,
      message.getTargetId() as NodeId,
      message.getEgressAddress(),
      Buffer.from(message.getSignature()),
    );
  }

  /**
   * Sends a notification to a node.
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async sendNotification(
    nodeId: NodeId,
    message: SignedNotification,
  ): Promise<void> {
    const connection: NodeConnection = await this.getConnectionToNode(nodeId);
    await connection.sendNotification(message);
  }

  /**
   * Treat this node as the client, and attempt to create/retrieve an existing
   * undirectional connection to another node (server).
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async getConnectionToNode(
    targetNodeId: NodeId,
  ): Promise<NodeConnection> {
    const connLock = this.connections.get(targetNodeId);
    // If there's already an entry in the map, we have 2 cases:
    // 1. The connection already exists
    // 2. The connection is currently being created by another concurrent thread
    if (connLock != null) {
      // Return the connection if it already exists
      if (connLock.connection != null) {
        return connLock.connection;
      }
      // Otherwise, it's expected to be currently being created by some other thread
      // Wait for the lock to release
      let release;
      try {
        release = await connLock.lock.acquire();
      } finally {
        release();
      }
      // Once the lock is released, then it's sufficient to recursively call the
      // function. It will most likely enter the case where we already have an
      // entry in the map (or, an error occurred, and the entry is removed - in
      // which case, this thread will create the connection).
      return await this.getConnectionToNode(targetNodeId);

      // Otherwise, we need to create an entry
    } else {
      const lock = new Mutex();
      this.connections.set(targetNodeId, { lock });
      let release;
      try {
        release = await lock.acquire();
        const targetAddress = await this.findNode(targetNodeId);
        const connection = await NodeConnection.createNodeConnection({
          targetNodeId: targetNodeId,
          targetHost: targetAddress.ip,
          targetPort: targetAddress.port,
          forwardProxy: this.fwdProxy,
          keyManager: this.keyManager,
          logger: this.logger,
        });
        await connection.start({
          brokerConnections: this.brokerNodeConnections,
        });
        // Add it to the map of active connections
        this.connections.set(targetNodeId, { connection, lock });
        return connection;
      } catch (e) {
        // We need to make sure to delete any added lock if we encounter an error
        // Otherwise, we can enter a state where we have a lock in the map, but
        // no NodeConnection being created
        this.connections.delete(targetNodeId);
        throw e;
      } finally {
        release();
      }
    }
  }

  /**
   * Create and start a connection to a broker node. Assumes that a direct
   * connection to the broker can be established (i.e. no hole punching required).
   *
   * @param brokerNodeId ID of the broker node to connect to
   * @param brokerNodeAddress host and port of the broker node to connect to
   * @returns
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async createConnectionToBroker(
    brokerNodeId: NodeId,
    brokerNodeAddress: NodeAddress,
  ): Promise<NodeConnection> {
    return await this._transaction(async () => {
      // Throw error if trying to connect to self
      if (brokerNodeId === this.getNodeId()) {
        throw new nodesErrors.ErrorNodeGraphSelfConnect();
      }
      // Attempt to get an existing connection
      const existingConnection = this.brokerNodeConnections.get(brokerNodeId);
      if (existingConnection != null) {
        return existingConnection;
      }
      const brokerConnection = await NodeConnection.createNodeConnection({
        targetNodeId: brokerNodeId,
        targetHost: brokerNodeAddress.ip,
        targetPort: brokerNodeAddress.port,
        forwardProxy: this.fwdProxy,
        keyManager: this.keyManager,
        logger: this.logger,
      });
      // TODO: may need to change this start() to some kind of special 'direct
      // connection' mechanism (currently just does the same openConnection() call
      // as any other node, but without hole punching).
      await brokerConnection.start({});
      this.brokerNodeConnections.set(brokerNodeId, brokerConnection);
      return brokerConnection;
    });
  }

  public getBrokerNodeConnections(): Map<NodeId, NodeConnection> {
    return this.brokerNodeConnections;
  }

  /**
   * Treat this node as the server.
   * Instruct the reverse proxy to send hole-punching packets back to the target's
   * forward proxy, in order to open a connection from the client to this server.
   * A connection is established if the client node's forward proxy is sending
   * hole punching packets at the same time as this node (acting as the server)
   * sends hole-punching packets back to the client's forward proxy.
   * @param egressHost host of the client's forward proxy
   * @param egressPort port of the cient's forward proxy
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async openConnection(
    egressHost: Host,
    egressPort: Port,
    timer?: Timer,
  ): Promise<void> {
    await this.revProxy.openConnection(egressHost, egressPort, timer);
  }

  /**
   * Retrieves the GRPC client associated with a connection to a particular node ID
   * @param targetNodeId node ID of the connected node
   * @returns GRPC client of the active connection
   * @throws ErrorNodeConnectionNotExist if a connection to the target does not exist
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async getClient(targetNodeId: NodeId): Promise<GRPCClientAgent> {
    const conn = await this.getConnectionToNode(targetNodeId);
    if (conn != null) {
      return conn.getClient();
    } else {
      throw new nodesErrors.ErrorNodeConnectionNotExist();
    }
  }

  /**
   * Retrieves the node Address
   * @param targetNodeId node ID of the target node
   * @returns Node Address of the target node
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async getNode(targetNodeId: NodeId): Promise<NodeAddress | undefined> {
    return await this.nodeGraph.getNode(targetNodeId);
  }

  /**
   * Retrieves the node address. If an entry doesn't exist in the db, then
   * proceeds to locate it using Kademlia.
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async findNode(targetNodeId: NodeId): Promise<NodeAddress> {
    // First check if we already have an existing ID -> address record
    let address = await this.getNode(targetNodeId);
    // Otherwise, attempt to locate it by contacting network
    if (address == null) {
      address = await this.nodeGraph.getClosestGlobalNodes(targetNodeId);
      // TODO: This currently just does one iteration
      // If not found in this single iteration, we throw an exception
      if (address == null) {
        throw new nodesErrors.ErrorNodeGraphNodeNotFound();
      }
    }
    // We ensure that we always return a NodeAddress (either by lookup, or
    // network search) - if we can't locate it from either, we throw an exception
    return address;
  }

  /**
   * Retrieves all the vaults for a peers node
   */
  @ready(new nodesErrors.ErrorNodeManagerNotStarted())
  public async scanNodeVaults(nodeId: string): Promise<Array<string>> {
    // Create a connection to another node
    const connection = await this.getConnectionToNode(nodeId as NodeId);
    // Scan the vaults of the node over the connection
    return await connection.scanVaults();
  }

  public async clearDB() {
    await this.nodeGraph.clearDB();
  }
}

export default NodeManager;
