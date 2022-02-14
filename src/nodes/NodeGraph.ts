import type { DB, DBLevel, DBOp } from '@matrixai/db';
import type { NodeId, NodeAddress, NodeBucket } from './types';
import type KeyManager from '../keys/KeyManager';
import type { Host, Hostname, Port } from '../network/types';
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
  // Max number of nodes in each k-bucket (a.k.a. k)
  public readonly maxNodesPerBucket: number = 20;

  protected logger: Logger;
  protected db: DB;
  protected keyManager: KeyManager;
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
    keyManager,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<NodeGraph> {
    logger.info(`Creating ${this.name}`);
    const nodeGraph = new NodeGraph({
      db,
      keyManager,
      logger,
    });
    await nodeGraph.start({ fresh });
    logger.info(`Created ${this.name}`);
    return nodeGraph;
  }

  constructor({
    db,
    keyManager,
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyManager = keyManager;
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
   * Retrieves the node Address
   * @param nodeId node ID of the target node
   * @returns Node Address of the target node
   */
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

  /**
   * Determines whether a node ID -> node address mapping exists in this node's
   * node table.
   * @param targetNodeId the node ID of the node to find
   * @returns true if the node exists in the table, false otherwise
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async knowsNode(targetNodeId: NodeId): Promise<boolean> {
    return !!(await this.getNode(targetNodeId));
  }

  /**
   * Returns the specified bucket if it exists
   * @param bucketIndex
   */
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

  protected async setNodeOps(
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
    // then we don't need to perform the deletion
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

  protected async updateNodeOps(
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
      throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();
    }
    return ops;
  }

  /**
   * Removes a node from the bucket database
   * @param nodeId
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async unsetNode(nodeId: NodeId): Promise<void> {
    return await this._transaction(async () => {
      const ops = await this.unsetNodeOps(nodeId);
      await this.db.batch(ops);
    });
  }

  protected async unsetNodeOps(nodeId: NodeId): Promise<Array<DBOp>> {
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
      this.keyManager.getNodeId(),
      nodeId,
    );
    return lexi.pack(index, 'hex') as string;
  }

  /**
   * Returns all of the buckets in an array
   */
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
          const nodeId = IdInternal.fromString<NodeId>(n);
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
          // If, with the old node added, we exceed the limit
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
}

export default NodeGraph;
