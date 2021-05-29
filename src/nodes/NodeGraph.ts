import type { LevelDB } from 'level';
import type { AbstractBatch } from 'abstract-leveldown';
import type {
  NodeId,
  NodeAddress,
  NodeBucket,
  NodeData,
  NodeGraphOp,
} from './types';
import type { FileSystem } from '../types';
import type { KeyManager } from '../keys';

import path from 'path';
import level from 'level';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import NodeConnection from './NodeConnection';
import * as nodeUtils from './utils';
import * as nodeErrors from './errors';
import { ForwardProxy } from '../network';
import { utils as keysUtils } from '../keys';
import * as agentPB from '../proto/js/Agent_pb';
import * as utils from '../utils';

// A Kademlia 'node', containing its own set of k-buckets of contacts (other nodes)
class NodeGraph {
  public readonly nodePath: string;
  public readonly bucketsDbPath: string;

  protected fs: FileSystem;
  protected logger: Logger;
  protected _started: boolean = false;

  // Active connections to other nodes
  protected connections: Map<NodeId, NodeConnection> = new Map();
  protected fwdProxy: ForwardProxy;

  // LevelDB database for the k-buckets
  protected bucketsDb: LevelDB<number, Buffer>;
  protected keyManager: KeyManager;
  protected bucketsDbKey: Buffer;
  protected bucketsDbMutex: Mutex = new Mutex();
  // Maximum number of nodes in each k-bucket
  protected maxNodesPerBucket: number;
  // Parallelism constraint (alpha in Kademlia specification)
  protected maxConcurrentNodeConnections: number;

  // Node ID -> node address mappings for the bootstrap/broker nodes
  protected brokerNodes: NodeBucket = {};
  protected brokerNodeConnections: Map<NodeId, NodeConnection> = new Map();

  // Size of the public key fingerprint
  protected nodeIdBits: number;
  protected nodeId: NodeId;

  constructor({
    nodePath,
    keyManager,
    fwdProxy,
    fs,
    logger,
  }: {
    nodePath: string;
    keyManager: KeyManager;
    fwdProxy: ForwardProxy;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger('NodeGraph');
    this.nodePath = nodePath;
    this.fwdProxy = fwdProxy;
    this.fs = fs ?? require('fs');
    this.keyManager = keyManager;
    this.bucketsDbPath = path.join(nodePath, 'buckets_db');

    // 44 characters in public key fingerprint = 352 bits
    this.nodeIdBits = 352;
    // Constant k in the Kademlia spec (maximum number of nodes per bucket)
    this.maxNodesPerBucket = 20;
    // Constant α in the Kademlia spec (concurrency constant)
    this.maxConcurrentNodeConnections = 3;
  }

  // Initialise leveldb database
  // fresh: if true, remove and recreate the
  public async start({
    nodeId,
    bits = 256,
    brokerNodes = {},
    fresh = false,
  }: {
    nodeId: NodeId;
    bits?: number;
    brokerNodes?: NodeBucket;
    fresh?: boolean;
  }) {
    this.logger.info('Starting Node Graph');
    this.logger.info(`Setting node path to ${this.nodePath}`);
    if (fresh) {
      await this.fs.promises.rm(this.nodePath, {
        force: true,
        recursive: true,
      });
    }
    await utils.mkdirExists(this.fs, this.nodePath);
    const bucketsDbKey = await this.setupBucketsDbKey(bits);
    this.bucketsDbKey = bucketsDbKey;
    // Value is { nodeID, IP address, port } (i.e. a JSON)
    // Encoded in binary as it's encrypted in the database
    const bucketsDb = await level(this.bucketsDbPath, {
      valueEncoding: 'binary',
    });
    this.nodeId = nodeId;
    this.bucketsDb = bucketsDb;
    this._started = true;

    this.brokerNodes = brokerNodes;
    // Establish and start connections to the brokers
    for (const brokerId of Object.keys(this.brokerNodes)) {
      await this.createConnectionToBroker(
        brokerId as NodeId,
        this.brokerNodes[brokerId].address,
      );
    }
    await this.calibrateDatabase();

    this.logger.info('Started Node Graph');
  }

  public async stop() {
    this.logger.info('Stopping Node Graph');
    if (this._started) {
      await this.bucketsDb.close();
      for (const [, conn] of this.connections) {
        await conn.stop();
      }
    }
    this._started = false;
    this.logger.info('Stopped Node Graph');
  }

  public getNodeId(): NodeId {
    if (!this._started) {
      throw new nodeErrors.ErrorNodeGraphNotStarted();
    }
    return this.nodeId;
  }

  public getMaxNodesPerBucket(): number {
    return this.maxNodesPerBucket;
  }

  /**
   * Adds a new node (contact) into its appropriate bucket.
   *
   * @param nodeKey public key fingerprint [44 characters; hash of public key] of node
   * @param nodeAddress struct of {IP address, port address} of node
   */
  public async setNode(
    nodeKey: NodeId,
    nodeAddress: NodeAddress,
  ): Promise<void> {
    const release = await this.bucketsDbMutex.acquire();
    // 1. Get bucket
    // 2. Check if number of nodes in bucket >= 20
    // 3. If not, add node to bucket
    // 4. Re-put bucket into database
    const bucketIndex = this.getBucketIndex(this.nodeId, nodeKey);
    try {
      let bucket: NodeBucket | undefined = await this.getBucketsDb(bucketIndex);
      // If bucket does not already exist, simply create it.
      if (bucket === undefined) {
        bucket = {};
        // Otherwise, check if the bucket is at capacity
        // If so, we simply find and remove the 'least' active node
      } else if (Object.keys(bucket).length === this.maxNodesPerBucket) {
        const leastActiveNode = {
          nodeId: '',
          lastUpdated: new Date(),
        };
        for (const [nodeId, nodeInfo] of Object.entries(bucket)) {
          if (nodeInfo.lastUpdated < leastActiveNode.lastUpdated) {
            leastActiveNode.nodeId = nodeId;
            leastActiveNode.lastUpdated = nodeInfo.lastUpdated;
          }
        }
        delete bucket[leastActiveNode.nodeId];
      }
      // Store the nodeID -> nodeAddress mapping in the bucket, and insert into db
      bucket[nodeKey] = {
        address: nodeAddress,
        lastUpdated: new Date(),
      };
      await this.putBucketsDb(bucketIndex, bucket);
    } finally {
      release();
    }
  }

  /**
   * Sets the 'lastUpdated' field of a node to be the current time.
   *
   * @param nodeId ID of the node to be updated
   */
  protected async updateNode(nodeId: NodeId): Promise<void> {
    const release = await this.bucketsDbMutex.acquire();
    const bucketIndex = this.getBucketIndex(this.nodeId, nodeId);
    let bucket: NodeBucket | undefined;
    try {
      // Get the bucket from the database
      bucket = await this.getBucketsDb(bucketIndex);
      // Update the lastUpdated field locally
      if (bucket) {
        // Make sure the node exists before updating
        if (bucket[nodeId]) {
          bucket[nodeId].lastUpdated = new Date();
          // Reinsert the bucket into the database.
          await this.putBucketsDb(bucketIndex, bucket);
        }
      }
    } finally {
      release();
    }
  }

  /**
   * Retrieves a bucket from the database.
   *
   * @param bucketIndex index (key) value of the bucket, where for an index i,
   * the nodes in the bucket adhere to the following distance inequality:
   * 2^i <= distance (from current node) < 2^(i+1)
   * @returns the bucket: essentialy a dictionary of node ID -> node address
   * or undefined if the bucket does not exist
   */
  public async getBucket(bucketIndex: number): Promise<NodeBucket | undefined> {
    const release = await this.bucketsDbMutex.acquire();
    let bucket: NodeBucket | undefined;
    try {
      bucket = await this.getBucketsDb(bucketIndex);
    } finally {
      release();
    }
    return bucket;
  }

  /**
   * Retrieves a target node's IP address and port from this node's bucket DB
   * (given the target node's ID).
   *
   * @param targetNodeId public key fingerprint of node to retrieve
   * @returns the corresponding node address for nodeId, or undefined if the node
   * does not appear in the expected bucket
   */
  public async getNode(targetNodeId: NodeId): Promise<NodeAddress | undefined> {
    const release = await this.bucketsDbMutex.acquire();
    // Find the expected bucket of the node
    const bucketIndex = this.getBucketIndex(this.nodeId, targetNodeId);
    let bucket: NodeBucket | undefined;
    try {
      bucket = await this.getBucketsDb(bucketIndex);
    } finally {
      release();
    }
    // If bucket does exist, then query it for the node (could still return
    // undefined if the node does not exist in the bucket)
    if (bucket && bucket[targetNodeId]) {
      return bucket[targetNodeId].address;
    }
    // Otherwise, the bucket does not exist (and therefore, the node cannot)
    return undefined;
  }

  /**
   * Removes a specific node from its expected bucket in this node's bucket DB.
   *
   * @param nodeId ID of the node to be removed
   */
  public async deleteNode(nodeId: NodeId): Promise<void> {
    const release = await this.bucketsDbMutex.acquire();
    const bucketIndex = this.getBucketIndex(this.nodeId, nodeId);
    try {
      await this.delBucketsDb(bucketIndex, nodeId);
    } finally {
      release();
    }
  }

  /**
   * Used as an initial request to populate this node's bucket database.
   * Requests the k closest nodes from each broker, and adds each of them to the
   * database.
   */
  protected async calibrateDatabase() {
    for (const [, conn] of this.brokerNodeConnections) {
      const nodes = await conn.getClosestNodes(this.nodeId);
      for (const n of nodes) {
        await this.createConnectionToNode(n.id, n.address);
        await this.setNode(n.id, n.address);
      }
    }
  }

  /**
   * Find the correct index of the k-bucket to add a new node to.
   * A node's k-buckets are organised such that for the ith k-bucket where
   * 0 <= i < nodeIdBits, the contacts in this ith bucket are known to adhere to
   * the following inequality:
   * 2^i <= distance (from current node) < 2^(i+1)
   *
   * @param nodeId1 node ID of the source node
   * @param nodeId2 node ID of the node to be added into the source node's buckets
   *
   * NOTE: because XOR is a commutative operation (i.e. a XOR b = b XOR a), the
   * order of the passed parameters is actually irrelevant.
   */
  public getBucketIndex(nodeId1: NodeId, nodeId2: NodeId): number {
    const distance = nodeUtils.calculateDistance(nodeId1, nodeId2);
    // Start at the last bucket: most likely to be here based on relation of
    // bucket index to distance
    let bucketIndex = this.nodeIdBits - 1;
    for (; bucketIndex >= 0; bucketIndex--) {
      const lowerBound = BigInt(2) ** BigInt(bucketIndex);
      const upperBound = BigInt(2) ** BigInt(bucketIndex + 1);
      // If 2^i <= distance (from current node) < 2^(i+1),
      // then break and return current index
      if (lowerBound <= distance && distance < upperBound) {
        break;
      }
    }
    return bucketIndex;
  }

  /**
   * Retrieve all buckets from the database.
   *
   * @returns a list of all buckets, containing node ID -> node address mappings
   */
  public async getAllBuckets(): Promise<Array<NodeBucket>> {
    const release = await this.bucketsDbMutex.acquire();
    const buckets: Array<NodeBucket> = [];
    try {
      for await (const o of this.bucketsDb.createReadStream({
        gte: '0',
        // Cheats a bit here. Because it compares lexicographically, it's not
        // sufficient to simply do "lt: nodeIdBits". An alternative solution
        // would be to pad all bucket IDs with prepended zeroes.
        lte: '9'.repeat(this.nodeIdBits.toString.length),
      })) {
        const data = (o as any).value;
        const bucket = nodeUtils.unserializeGraphValue(this.bucketsDbKey, data);
        buckets.push(bucket);
      }
      return buckets;
    } finally {
      release();
    }
  }

  /**
   * Finds the set of nodes (of size k) known by the current node (i.e. in its
   * buckets database) that have the smallest distance to the target node (i.e.
   * are closest to the target node).
   * i.e. FIND_NODE RPC from Kademlia spec
   *
   * @param targetNodeId the node ID to find other nodes closest to it
   * @param numclosest the number of closest nodes to return (by default, returns
   * according to the maximum number of nodes per bucket)
   * @returns a mapping containing exactly k nodeIds -> nodeAddresses (unless the
   * current node has less than k nodes in all of its buckets, in which case it
   * returns all nodes it has knowledge of)
   */
  public async getClosestLocalNodes(
    targetNodeId: NodeId,
    numClosest: number = this.maxNodesPerBucket,
  ): Promise<Array<NodeData>> {
    // Retrieve all nodes from buckets in database
    const buckets = await this.getAllBuckets();
    // Iterate over all of the nodes in each bucket
    const distanceToNodes: Array<NodeData> = [];
    buckets.forEach(function (bucket) {
      for (const nodeId of Object.keys(bucket) as Array<NodeId>) {
        // Compute the distance from the node, and add it to the array.
        distanceToNodes.push({
          id: nodeId,
          address: bucket[nodeId].address,
          distance: nodeUtils.calculateDistance(nodeId, targetNodeId),
        });
      }
    });
    // Sort the array (based on the distance at index 1)
    distanceToNodes.sort(function (a: NodeData, b: NodeData) {
      if (a.distance > b.distance) {
        return 1;
      } else if (a.distance < b.distance) {
        return -1;
      } else {
        return 0;
      }
    });
    // Return the closest k nodes (i.e. the first k), or all nodes if < k in array
    return distanceToNodes.slice(0, numClosest);
  }

  /**
   * Create and start a connection to a node (either by retrieving a pre-existing
   * one, or by instantiating a new GRPCClientAgent).
   *
   * @param targetNodeId ID of the node wanting to connect to
   * @param targetNodeAddress host and port of the node wanting to connect to
   */
  public async createConnectionToNode(
    targetNodeId: NodeId,
    targetNodeAddress: NodeAddress,
  ): Promise<NodeConnection> {
    // Throw error if trying to connect to self
    if (targetNodeId == this.nodeId) {
      throw new nodeErrors.ErrorNodeGraphSelfConnect();
    }
    // Attempt to get an existing connection
    const existingConnection: NodeConnection | undefined =
      this.connections.get(targetNodeId);
    if (existingConnection) {
      return existingConnection;
    }
    // Otherwise, create a new connection
    const nodeConnection = new NodeConnection({
      sourceNodeId: this.nodeId,
      targetNodeId: targetNodeId,
      targetHost: targetNodeAddress.ip,
      targetPort: targetNodeAddress.port,
      forwardProxy: this.fwdProxy,
      keyManager: this.keyManager,
      logger: this.logger,
    });
    await nodeConnection.start({
      brokerConnections: this.brokerNodeConnections,
    });
    // Add it to the map of active connections
    this.connections.set(targetNodeId, nodeConnection);
    return nodeConnection;
  }

  /**
   * Create and start a connection to a broker node. Assumes that a direct
   * connection to the broker can be established (i.e. no hole punching required).
   *
   * @param brokerNodeId ID of the broker node to connect to
   * @param brokerNodeAddress host and port of the broker node to connect to
   * @returns
   */
  protected async createConnectionToBroker(
    brokerNodeId: NodeId,
    brokerNodeAddress: NodeAddress,
  ): Promise<NodeConnection> {
    // Throw error if trying to connect to self
    if (brokerNodeId == this.nodeId) {
      throw new nodeErrors.ErrorNodeGraphSelfConnect();
    }
    // Attempt to get an existing connection
    const existingConnection = this.brokerNodeConnections.get(brokerNodeId);
    if (existingConnection) {
      return existingConnection;
    }
    const brokerConnection = new NodeConnection({
      sourceNodeId: this.nodeId,
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
  public async getClosestGlobalNodes(targetNodeId: NodeId): Promise<boolean> {
    let foundTarget: boolean = false;
    // Get the closest alpha nodes to the target node (set as shortlist)
    const shortlist: Array<NodeData> = await this.getClosestLocalNodes(
      targetNodeId,
      this.maxConcurrentNodeConnections,
    );
    // If we have no nodes at all in our database (even after synchronising),
    // then we should throw an error. We aren't going to find any others.
    if (shortlist.length == 0) {
      throw new nodeErrors.ErrorNodeGraphEmptyShortlist();
    }
    // Need to keep track of the nodes that have been contacted.
    // Not sufficient to simply check if there's already a pre-existing connection
    // in nodeConnections - what if there's been more than 1 invokation of
    // getClosestGlobalNodes()?
    const contacted: { [nodeId: string]: boolean } = {};
    // Iterate until we've found found and contacted k nodes
    while (Object.keys(contacted).length <= this.maxNodesPerBucket) {
      // while (!foundTarget) {
      // Remove the node from the front of the array
      const nextNode = shortlist.shift();
      // If we have no nodes left in the shortlist, then stop
      if (!nextNode) {
        break;
      }
      // Skip if the node has already been contacted
      if (contacted[nextNode.id]) {
        continue;
      }
      // Connect to the node (check if pre-existing connection exists, otherwise
      // create a new one)
      const nodeConnection =
        this.connections.get(nextNode.id) ??
        (await this.createConnectionToNode(nextNode.id, nextNode.address));
      contacted[nextNode.id] = true;
      // Ask the node to get their own closest nodes to the target.
      const foundClosest = await nodeConnection.getClosestNodes(targetNodeId);
      // Check to see if any of these are the target node. At the same time, add
      // them to the shortlist.
      for (const nodeData of foundClosest) {
        // Ignore any nodes that have been contacted
        if (contacted[nodeData.id]) {
          continue;
        }
        if (nodeData.id == targetNodeId) {
          foundTarget = true;
          // Attempt to create a connection to the node. Will throw an error
          // (ErrorConnectionStart, from ConnectionForward) if the connection
          // cannot be established
          await this.createConnectionToNode(nodeData.id, nodeData.address);
          await this.setNode(nodeData.id, nodeData.address);
          // We have found the target node, so we can stop trying to look for it
          // in the shortlist.
          break;
        }
        shortlist.push(nodeData);
      }
      // To make the number of jumps relatively short, should connect to the node/s
      // closest to the target first, and ask if they know of any closer nodes.
      // Then we can simply unshift the first (closest) element from the shortlist.
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
    return foundTarget;
  }

  public getClient(nodeId: NodeId) {
    const conn = this.connections.get(nodeId);
    if (conn) {
      return conn.getClient();
    } else {
      throw new nodeErrors.ErrorNodeConnectionNotExist();
    }
  }

  /**
   * Relays a received hole punch message to the target.
   * The node is assumed to be known, and a connection to the node is also assumed
   * to have already been established (as right now, this will only be called by
   * a 'broker' node).
   * @param message the original relay message (assumed to be created in
   * nodeConnection.start())
   */
  public async relayHolePunchMessage(
    message: agentPB.RelayMessage,
  ): Promise<void> {
    const conn = this.connections.get(message.getTargetid() as NodeId);
    if (conn === undefined) {
      throw new nodeErrors.ErrorNodeConnectionNotExist();
    }
    await conn.sendHolePunchMessage(
      message.getSrcid() as NodeId,
      message.getTargetid() as NodeId,
      message.getEgressaddress(),
      Buffer.from(message.getSignature()),
    );
  }

  /**
   * Generates symmetric key for database encryption/decryption.
   */
  protected async setupBucketsDbKey(bits: number = 256): Promise<Buffer> {
    let bucketsDbKey = await this.keyManager.getKey(this.constructor.name);
    if (bucketsDbKey != null) {
      return bucketsDbKey;
    }
    this.logger.info('Generating buckets db key');
    bucketsDbKey = await keysUtils.generateKey(bits);
    await this.keyManager.putKey(this.constructor.name, bucketsDbKey);
    return bucketsDbKey;
  }

  /**
   * Database helper: 'get' requests for buckets
   * Handles exceptions (returning undefined if the bucket index is not valid)
   * and decrypts the data before returning.
   *
   * @param bucketIndex ID of the bucket to retrieve from database
   * @returns the node bucket, or undefined (if the bucket doesn't exist in db)
   */
  protected async getBucketsDb(
    bucketIndex: number,
  ): Promise<NodeBucket | undefined> {
    if (!this._started) {
      throw new nodeErrors.ErrorNodeGraphNotStarted();
    }
    let data: Buffer;
    try {
      // Try to retrieve the bucket from the database
      data = await this.bucketsDb.get(bucketIndex);
    } catch (e) {
      if (e.notFound) {
        return undefined;
      }
      throw e;
    }
    return nodeUtils.unserializeGraphValue(this.bucketsDbKey, data);
  }

  /**
   * Database helper: 'put' requests for buckets
   * Ensures bucket index is valid, and encrypts the data before insertion.
   *
   * @param bucketIndex index of the bucket to be added (i.e. the key in db)
   * @param bucket bucket data to be inserted (mappings from nodeId -> nodeAddress)
   */
  protected async putBucketsDb(
    bucketIndex: number,
    bucket: NodeBucket,
  ): Promise<void> {
    if (!this._started) {
      throw new nodeErrors.ErrorNodeGraphNotStarted();
    }
    // Ensure valid bucket (between 0 and nodeIdBits-1)
    if (bucketIndex < 0 || bucketIndex >= this.nodeIdBits) {
      throw new nodeErrors.ErrorNodeGraphInvalidBucketIndex();
    }
    const data = nodeUtils.serializeGraphValue(this.bucketsDbKey, bucket);
    await this.bucketsDb.put(bucketIndex, data);
  }

  /**
   * Database helper: 'del' requests for a specific node in the database
   * Locates and retrieves the expected bucket, and deletes the node from the
   * bucket, reinserting the bucket into the database.
   *
   * @param nodeId node to be removed from the database
   */
  protected async delBucketsDb(
    bucketIndex: number,
    nodeId: NodeId,
  ): Promise<void> {
    if (!this._started) {
      throw new nodeErrors.ErrorNodeGraphNotStarted();
    }
    const bucket: NodeBucket | undefined = await this.getBucketsDb(bucketIndex);
    if (bucket) {
      // Remove the node ID from the expected bucket
      delete bucket[nodeId];
      // If this is the last node in the bucket, remove entire bucket
      if (Object.keys(bucket).length == 0) {
        await this.bucketsDb.del(bucketIndex);
        // Otherwise, reinsert the bucket back into database (without the node)
      } else {
        const data = nodeUtils.serializeGraphValue(this.bucketsDbKey, bucket);
        await this.bucketsDb.put(bucketIndex, data);
      }
    }
  }

  protected async batchBucketsDb(ops: Array<NodeGraphOp>): Promise<void> {
    if (!this._started) {
      throw new nodeErrors.ErrorNodeGraphNotStarted();
    }
    const ops_: Array<AbstractBatch> = [];
    for (const op of ops) {
      if (op.type === 'del') {
        ops_.push({
          type: op.type,
          key: op.key,
        });
      } else if (op.type === 'put') {
        const ngK = op.key;
        const data = nodeUtils.serializeGraphValue(this.bucketsDbKey, op.value);
        ops_.push({
          type: op.type,
          key: ngK,
          value: data,
        });
      }
    }
    await this.bucketsDb.batch(ops_);
  }
}

export default NodeGraph;
