import type { DB, DBTransaction, KeyPath, LevelPath } from '@matrixai/db';
import type { NodeAddress, NodeBucket, NodeId } from './types';
import type KeyManager from '../keys/KeyManager';
import type { Host, Hostname, Port } from '../network/types';
import lexi from 'lexicographic-integer';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import { withF } from '@matrixai/resources';
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

  /**
   * Max number of nodes in each k-bucket (a.k.a. k)
   */
  public readonly maxNodesPerBucket: number = 20;

  protected logger: Logger;
  protected db: DB;
  protected keyManager: KeyManager;
  protected nodeGraphDbPath: LevelPath = [this.constructor.name];
  /**
   * Buckets stores NodeBucketIndex -> NodeBucket
   */
  protected nodeGraphBucketsDbPath: LevelPath = [
    this.constructor.name,
    'buckets',
  ];

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

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}) {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.nodeGraphDbPath);
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.nodeGraphDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async withTransactionF<T>(
    f: (tran: DBTransaction) => Promise<T>,
  ): Promise<T> {
    return withF([this.db.transaction()], ([tran]) => f(tran));
  }

  /**
   * Retrieves the node Address
   * @param nodeId node ID of the target node
   * @param tran
   * @returns Node Address of the target node
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getNode(
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<NodeAddress | undefined> {
    if (tran == null) {
      return this.withTransactionF(async (tran) => this.getNode(nodeId, tran));
    }
    const bucketIndex = this.getBucketIndex(nodeId);
    const bucketPath = [
      ...this.nodeGraphBucketsDbPath,
      bucketIndex,
    ] as unknown as KeyPath;
    const bucket = await tran.get<NodeBucket>(bucketPath);
    if (bucket != null && nodeId in bucket) {
      return bucket[nodeId].address;
    }
    return;
  }

  /**
   * Determines whether a node ID -> node address mapping exists in this node's
   * node table.
   * @param targetNodeId the node ID of the node to find
   * @param tran
   * @returns true if the node exists in the table, false otherwise
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async knowsNode(
    targetNodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<boolean> {
    return !!(await this.getNode(targetNodeId, tran));
  }

  /**
   * Returns the specified bucket if it exists
   * @param bucketIndex
   * @param tran
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getBucket(
    bucketIndex: number,
    tran?: DBTransaction,
  ): Promise<NodeBucket | undefined> {
    if (tran == null) {
      return this.withTransactionF(async (tran) =>
        this.getBucket(bucketIndex, tran),
      );
    }
    const bucketPath = [
      ...this.nodeGraphBucketsDbPath,
      lexi.pack(bucketIndex, 'hex'),
    ] as unknown as KeyPath;
    const bucket = await tran.get<NodeBucket>(bucketPath);
    // Cast the non-primitive types correctly (ensures type safety when using them)
    for (const nodeId in bucket) {
      bucket[nodeId].address.host = bucket[nodeId].address.host as
        | Host
        | Hostname;
      bucket[nodeId].address.port = bucket[nodeId].address.port as Port;
      bucket[nodeId].lastUpdated = new Date(bucket[nodeId].lastUpdated);
    }
    return bucket;
  }

  /**
   * Sets a node to the bucket database
   * This may delete an existing node if the bucket is filled up
   */
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.withTransactionF(async (tran) =>
        this.setNode(nodeId, nodeAddress, tran),
      );
    }
    const bucketIndex = this.getBucketIndex(nodeId);
    const bucketPath = [
      ...this.nodeGraphBucketsDbPath,
      bucketIndex,
    ] as unknown as KeyPath;
    let bucket = await tran.get<NodeBucket>(bucketPath);
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
    await tran.put(bucketPath, bucket);
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
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.withTransactionF(async (tran) =>
        this.updateNode(nodeId, nodeAddress, tran),
      );
    }
    const bucketIndex = this.getBucketIndex(nodeId);
    const bucketPath = [
      ...this.nodeGraphBucketsDbPath,
      bucketIndex,
    ] as unknown as KeyPath;
    const bucket = await tran.get<NodeBucket>(bucketPath);
    if (bucket != null && nodeId in bucket) {
      bucket[nodeId].lastUpdated = new Date();
      if (nodeAddress != null) {
        bucket[nodeId].address = nodeAddress;
      }
      await tran.put(bucketPath, bucket);
    } else {
      throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();
    }
  }

  /**
   * Removes a node from the bucket database
   * @param nodeId
   * @param tran
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async unsetNode(nodeId: NodeId, tran?: DBTransaction): Promise<void> {
    if (tran == null) {
      return this.withTransactionF(async (tran) =>
        this.unsetNode(nodeId, tran),
      );
    }
    const bucketIndex = this.getBucketIndex(nodeId);
    const bucketPath = [
      ...this.nodeGraphBucketsDbPath,
      bucketIndex,
    ] as unknown as KeyPath;
    const bucket = await tran.get<NodeBucket>(bucketPath);
    if (bucket == null) {
      return;
    }
    delete bucket[nodeId];
    if (Object.keys(bucket).length === 0) {
      await tran.del(bucketPath);
    } else {
      await tran.put(bucketPath, bucket);
    }
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
  public async getAllBuckets(tran?: DBTransaction): Promise<Array<NodeBucket>> {
    if (tran == null) {
      return this.withTransactionF(async (tran) => this.getAllBuckets(tran));
    }
    const buckets: Array<NodeBucket> = [];
    for await (const [, bucket] of tran.iterator<NodeBucket>(
      { keys: false, valueAsBuffer: false },
      [...this.nodeGraphBucketsDbPath],
    )) {
      buckets.push(bucket);
    }
    return buckets;
  }

  /**
   * To be called on key renewal. Re-orders all nodes in all buckets with respect
   * to the new node ID.
   * NOTE: original nodes may be lost in this process. If they're redistributed
   * to a newly full bucket, the least active nodes in the newly full bucket
   * will be removed.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async refreshBuckets(tran?: DBTransaction): Promise<void> {
    if (tran == null) {
      return this.withTransactionF(async (tran) => this.refreshBuckets(tran));
    }
    // Get a local copy of all the buckets
    const buckets = await this.getAllBuckets(tran);
    // Wrap as a batch operation. We want to rollback if we encounter any
    // errors (such that we don't clear the DB without re-adding the nodes)
    // 1. Delete every bucket
    for await (const [keyPath] of tran.iterator({ values: false }, [
      ...this.nodeGraphBucketsDbPath,
    ])) {
      const key = keyPath[0].toString();
      const hexBucketPath = [...this.nodeGraphBucketsDbPath, key];
      await tran.del(hexBucketPath);
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
      const bucketPath = [
        ...this.nodeGraphBucketsDbPath,
        bucketIndex,
      ] as unknown as KeyPath;
      await tran.put(bucketPath, tempBuckets[bucketIndex]);
    }
  }
}

export default NodeGraph;
