import type { NodeId, NodeAddress, NodeBucket, NodeData } from './types';
import type { Host, Hostname, Port } from '../network/types';
import type { DB, DBLevel, DBOp } from '@matrixai/db';
import type { NodeConnection } from '../nodes';

import type NodeManager from './NodeManager';
import { Mutex } from 'async-mutex';
import lexi from 'lexicographic-integer';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';

/**
 * NodeGraph is an implementation of Kademlia for maintaining peer to peer information
 * We maintain a map of buckets. Where each bucket has k number of node infos
 */
interface NodeGraph extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new nodesErrors.ErrorNodeGraphRunning(),
  new nodesErrors.ErrorNodeGraphDestroyed(),
)
class NodeGraph {
  // Internally, node ID is a 32 byte array
  public readonly nodeIdBits: number = 256;
  // Max number of nodes in each k-bucket (a.k.a. k)
  public readonly maxNodesPerBucket: number = 20;
  // Max parallel connections (a.k.a. alpha)
  public readonly maxConcurrentNodeConnections: number = 3;

  protected logger: Logger;
  protected db: DB;
  protected nodeManager: NodeManager;
  protected nodeGraphDbDomain: string = this.constructor.name;
  protected nodeGraphBucketsDbDomain: Array<string> = [
    this.nodeGraphDbDomain,
    'buckets',
  ];
  protected nodeGraphDb: DBLevel;
  protected nodeGraphBucketsDb: DBLevel;
  protected lock: Mutex = new Mutex();

  public static async createNodeGraph({
    db,
    nodeManager,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    nodeManager: NodeManager;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<NodeGraph> {
    logger.info(`Creating ${this.name}`);
    const nodeGraph = new NodeGraph({
      db,
      nodeManager,
      logger,
    });
    await nodeGraph.start({ fresh });
    logger.info(`Created ${this.name}`);
    return nodeGraph;
  }

  constructor({
    db,
    nodeManager,
    logger,
  }: {
    db: DB;
    nodeManager: NodeManager;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.nodeManager = nodeManager;
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}) {
    this.logger.info(`Starting ${this.constructor.name}`);
    const nodeGraphDb = await this.db.level(this.nodeGraphDbDomain);
    // Buckets stores NodeBucketIndex -> NodeBucket
    const nodeGraphBucketsDb = await this.db.level(
      this.nodeGraphBucketsDbDomain[1],
      nodeGraphDb,
    );
    if (fresh) {
      await nodeGraphDb.clear();
    }
    this.nodeGraphDb = nodeGraphDb;
    this.nodeGraphBucketsDb = nodeGraphBucketsDb;
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    const nodeGraphDb = await this.db.level(this.nodeGraphDbDomain);
    await nodeGraphDb.clear();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(
    f: (nodeGraph: NodeGraph) => Promise<T>,
  ): Promise<T> {
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
  public async syncNodeGraph() {
    for (const [, conn] of await this.nodeManager.getConnectionsToSeedNodes()) {
      const nodes = await conn.getClosestNodes(this.nodeManager.getNodeId());
      for (const n of nodes) {
        await this.setNode(n.id, n.address);
        try {
          await this.nodeManager.getConnectionToNode(n.id);
        } catch (e) {
          if (e instanceof nodesErrors.ErrorNodeConnectionTimeout) {
            continue;
          } else {
            throw e;
          }
        }
      }
    }
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public getNodeId(): NodeId {
    return this.nodeManager.getNodeId();
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getNode(nodeId: NodeId): Promise<NodeAddress | undefined> {
    return await this._transaction(async () => {
      const bucketIndex = this.getBucketIndex(nodeId);
      const bucket = await this.db.get<NodeBucket>(
        this.nodeGraphBucketsDbDomain,
        bucketIndex,
      );
      if (bucket != null && nodeId in bucket) {
        return bucket[nodeId].address;
      }
      return;
    });
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getBucket(bucketIndex: number): Promise<NodeBucket | undefined> {
    return await this._transaction(async () => {
      const bucket = await this.db.get<NodeBucket>(
        this.nodeGraphBucketsDbDomain,
        lexi.pack(bucketIndex, 'hex'),
      );
      // Cast the non-primitive types correctly (ensures type safety when using them)
      for (const nodeId in bucket) {
        bucket[nodeId].address.host = bucket[nodeId].address.host as
          | Host
          | Hostname;
        bucket[nodeId].address.port = bucket[nodeId].address.port as Port;
        bucket[nodeId].lastUpdated = new Date(bucket[nodeId].lastUpdated);
      }
      return bucket;
    });
  }

  /**
   * Sets a node to the bucket database
   * This may delete an existing node if the bucket is filled up
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
  ): Promise<void> {
    return await this._transaction(async () => {
      const ops = await this.setNodeOps(nodeId, nodeAddress);
      await this.db.batch(ops);
    });
  }

  public async setNodeOps(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
  ): Promise<Array<DBOp>> {
    const bucketIndex = this.getBucketIndex(nodeId);
    let bucket = await this.db.get<NodeBucket>(
      this.nodeGraphBucketsDbDomain,
      bucketIndex,
    );
    if (bucket == null) {
      bucket = {};
    }
    bucket[nodeId] = {
      address: nodeAddress,
      lastUpdated: new Date(),
    };
    // Perform the check on size after we add/update the node. If it's an update,
    // then we don't need to perform the deletion.
    let bucketEntries = Object.entries(bucket);
    if (bucketEntries.length > this.maxNodesPerBucket) {
      const leastActive = bucketEntries.reduce((prev, curr) => {
        return new Date(prev[1].lastUpdated) < new Date(curr[1].lastUpdated)
          ? prev
          : curr;
      });
      delete bucket[leastActive[0]];
      bucketEntries = Object.entries(bucket);
      // For safety, make sure that the bucket is actually at maxNodesPerBucket
      if (bucketEntries.length !== this.maxNodesPerBucket) {
        throw new nodesErrors.ErrorNodeGraphOversizedBucket();
      }
    }
    return [
      {
        type: 'put',
        domain: this.nodeGraphBucketsDbDomain,
        key: bucketIndex,
        value: bucket,
      },
    ];
  }

  /**
   * Updates an existing node
   * It will update the lastUpdated time
   * Optionally it can replace the NodeAddress
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async updateNode(
    nodeId: NodeId,
    nodeAddress?: NodeAddress,
  ): Promise<void> {
    return await this._transaction(async () => {
      const ops = await this.updateNodeOps(nodeId, nodeAddress);
      await this.db.batch(ops);
    });
  }

  public async updateNodeOps(
    nodeId: NodeId,
    nodeAddress?: NodeAddress,
  ): Promise<Array<DBOp>> {
    const bucketIndex = this.getBucketIndex(nodeId);
    const bucket = await this.db.get<NodeBucket>(
      this.nodeGraphBucketsDbDomain,
      bucketIndex,
    );
    const ops: Array<DBOp> = [];
    if (bucket != null && nodeId in bucket) {
      bucket[nodeId].lastUpdated = new Date();
      if (nodeAddress != null) {
        bucket[nodeId].address = nodeAddress;
      }
      ops.push({
        type: 'put',
        domain: this.nodeGraphBucketsDbDomain,
        key: bucketIndex,
        value: bucket,
      });
    } else {
      throw new nodesErrors.ErrorNodeGraphNodeIdMissing();
    }
    return ops;
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async unsetNode(nodeId: NodeId): Promise<void> {
    return await this._transaction(async () => {
      const ops = await this.unsetNodeOps(nodeId);
      await this.db.batch(ops);
    });
  }

  public async unsetNodeOps(nodeId: NodeId): Promise<Array<DBOp>> {
    const bucketIndex = this.getBucketIndex(nodeId);
    const bucket = await this.db.get<NodeBucket>(
      this.nodeGraphBucketsDbDomain,
      bucketIndex,
    );
    const ops: Array<DBOp> = [];
    if (bucket == null) {
      return ops;
    }
    delete bucket[nodeId];
    if (Object.keys(bucket).length === 0) {
      ops.push({
        type: 'del',
        domain: this.nodeGraphBucketsDbDomain,
        key: bucketIndex,
      });
    } else {
      ops.push({
        type: 'put',
        domain: this.nodeGraphBucketsDbDomain,
        key: bucketIndex,
        value: bucket,
      });
    }
    return ops;
  }

  /**
   * Find the correct index of the k-bucket to add a new node to (for this node's
   * bucket database). Packs it as a lexicographic integer, such that the order
   * of buckets in leveldb is numerical order.
   */
  protected getBucketIndex(nodeId: NodeId): string {
    const index = nodesUtils.calculateBucketIndex(
      this.getNodeId(),
      nodeId,
      this.nodeIdBits,
    );
    return lexi.pack(index, 'hex') as string;
  }

  // Ok so here is where we must start refactoring this

  // this might be better to stream this directly to where it is being used
  // cause the subsequent functions are using this
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getAllBuckets(): Promise<Array<NodeBucket>> {
    return await this._transaction(async () => {
      const buckets: Array<NodeBucket> = [];
      for await (const o of this.nodeGraphBucketsDb.createReadStream()) {
        const data = (o as any).value as Buffer;
        const bucket = await this.db.deserializeDecrypt<NodeBucket>(
          data,
          false,
        );
        buckets.push(bucket);
      }
      return buckets;
    });
  }

  /**
   * To be called on key renewal. Re-orders all nodes in all buckets with respect
   * to the new node ID.
   * NOTE: original nodes may be lost in this process. If they're redistributed
   * to a newly full bucket, the least active nodes in the newly full bucket
   * will be removed.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async refreshBuckets(): Promise<void> {
    return await this._transaction(async () => {
      const ops: Array<DBOp> = [];
      // Get a local copy of all the buckets
      const buckets = await this.getAllBuckets();
      // Wrap as a batch operation. We want to rollback if we encounter any
      // errors (such that we don't clear the DB without re-adding the nodes)
      // 1. Delete every bucket
      for await (const k of this.nodeGraphBucketsDb.createKeyStream()) {
        const hexBucketIndex = k as string;
        ops.push({
          type: 'del',
          domain: this.nodeGraphBucketsDbDomain,
          key: hexBucketIndex,
        });
      }
      const tempBuckets: Record<string, NodeBucket> = {};
      // 2. Re-add all the nodes from all buckets
      for (const b of buckets) {
        for (const n of Object.keys(b)) {
          const nodeId: NodeId = IdInternal.fromString(n);
          const newIndex = this.getBucketIndex(nodeId);
          let expectedBucket = tempBuckets[newIndex];
          // The following is more or less copied from setNodeOps
          if (expectedBucket == null) {
            expectedBucket = {};
          }
          const bucketEntries = Object.entries(expectedBucket);
          // Add the old node
          expectedBucket[nodeId] = {
            address: b[nodeId].address,
            lastUpdated: b[nodeId].lastUpdated,
          };
          // If, with the old node added, we exceed the limit...
          if (bucketEntries.length > this.maxNodesPerBucket) {
            // Then, with the old node added, find the least active and remove
            const leastActive = bucketEntries.reduce((prev, curr) => {
              return prev[1].lastUpdated < curr[1].lastUpdated ? prev : curr;
            });
            delete expectedBucket[leastActive[0]];
          }
          // Add this reconstructed bucket (with old node) into the temp storage
          tempBuckets[newIndex] = expectedBucket;
        }
      }
      // Now that we've reconstructed all the buckets, perform batch operations
      // on a bucket level (i.e. per bucket, instead of per node)
      for (const bucketIndex in tempBuckets) {
        ops.push({
          type: 'put',
          domain: this.nodeGraphBucketsDbDomain,
          key: bucketIndex,
          value: tempBuckets[bucketIndex],
        });
      }
      await this.db.batch(ops);
    });
  }

  /**
   * Finds the set of nodes (of size k) known by the current node (i.e. in its
   * buckets database) that have the smallest distance to the target node (i.e.
   * are closest to the target node).
   * i.e. FIND_NODE RPC from Kademlia spec
   *
   * @param targetNodeId the node ID to find other nodes closest to it
   * @param numClosest the number of closest nodes to return (by default, returns
   * according to the maximum number of nodes per bucket)
   * @returns a mapping containing exactly k nodeIds -> nodeAddresses (unless the
   * current node has less than k nodes in all of its buckets, in which case it
   * returns all nodes it has knowledge of)
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getClosestLocalNodes(
    targetNodeId: NodeId,
    numClosest: number = this.maxNodesPerBucket,
  ): Promise<Array<NodeData>> {
    // Retrieve all nodes from buckets in database
    const buckets = await this.getAllBuckets();
    // Iterate over all of the nodes in each bucket
    const distanceToNodes: Array<NodeData> = [];
    buckets.forEach(function (bucket) {
      for (const nodeIdString of Object.keys(bucket)) {
        const nodeId: NodeId = IdInternal.fromString(nodeIdString);
        // Compute the distance from the node, and add it to the array.
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
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getClosestGlobalNodes(
    targetNodeId: NodeId,
  ): Promise<NodeAddress | undefined> {
    // Let foundTarget: boolean = false;
    let foundAddress: NodeAddress | undefined = undefined;
    // Get the closest alpha nodes to the target node (set as shortlist)
    const shortlist: Array<NodeData> = await this.getClosestLocalNodes(
      targetNodeId,
      this.maxConcurrentNodeConnections,
    );
    // If we have no nodes at all in our database (even after synchronising),
    // then we should throw an error. We aren't going to find any others.
    if (shortlist.length === 0) {
      throw new nodesErrors.ErrorNodeGraphEmptyDatabase();
    }
    // Need to keep track of the nodes that have been contacted.
    // Not sufficient to simply check if there's already a pre-existing connection
    // in nodeConnections - what if there's been more than 1 invocation of
    // getClosestGlobalNodes()?
    const contacted: { [nodeId: string]: boolean } = {};
    // Iterate until we've found found and contacted k nodes
    while (Object.keys(contacted).length <= this.maxNodesPerBucket) {
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
      let nodeConnection: NodeConnection;
      try {
        // Add the node to the database so that we can find its address in
        // call to getConnectionToNode
        await this.setNode(nextNode.id, nextNode.address);
        nodeConnection = await this.nodeManager.getConnectionToNode(
          nextNode.id,
        );
      } catch (e) {
        // If we can't connect to the node, then skip it.
        continue;
      }
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
        if (nodeData.id.equals(targetNodeId)) {
          // FoundTarget = true;
          // Attempt to create a connection to the node. Will throw an error
          // (ErrorConnectionStart, from ConnectionForward) if the connection
          // cannot be established

          // TODO: For now, will simply add this target node without creating a
          // connection to it.
          // await this.nodeManager.createConnectionToNode(
          //   nodeData.id,
          //   nodeData.address,
          // );
          await this.setNode(nodeData.id, nodeData.address);
          foundAddress = nodeData.address;
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
    return foundAddress;
  }

  public async clearDB() {
    await this.nodeGraphDb.clear();
  }
}

export default NodeGraph;
