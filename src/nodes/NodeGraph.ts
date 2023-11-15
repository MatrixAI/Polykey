import type { DB, DBTransaction, KeyPath, LevelPath } from '@matrixai/db';
import type {
  NodeId,
  NodeAddress,
  NodeBucket,
  NodeData,
  NodeBucketMeta,
  NodeBucketIndex,
  NodeGraphSpace,
} from './types';
import type KeyRing from '../keys/KeyRing';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import * as nodesEvents from './events';
import * as utils from '../utils';
import config from '../config';

/**
 * NodeGraph is an implementation of Kademlia for maintaining peer to peer
 * information about Polkey nodes.
 *
 * It is a database of fixed-size buckets, where each bucket
 * contains NodeId -> NodeData. The bucket index is a prefix key.
 * This means the data is ordered in terms of bucket index, and then node ID.
 * From lowest to highest.
 *
 * The NodeGraph is partitioned into 2 spaces. The reason to do this is allow
 * transactional resetting of the buckets if the own node ID changes.
 *
 * When the node ID changes, either due to key renewal or reset, we remap all
 * existing records to the other space, and then we swap the active space key.
 */
interface NodeGraph extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new nodesErrors.ErrorNodeGraphRunning(),
  new nodesErrors.ErrorNodeGraphDestroyed(),
  {
    eventStart: nodesEvents.EventNodeGraphStart,
    eventStarted: nodesEvents.EventNodeGraphStarted,
    eventStop: nodesEvents.EventNodeGraphStop,
    eventStopped: nodesEvents.EventNodeGraphStopped,
    eventDestroy: nodesEvents.EventNodeGraphDestroy,
    eventDestroyed: nodesEvents.EventNodeGraphDestroyed,
  },
)
class NodeGraph {
  public static async createNodeGraph({
    db,
    keyRing,
    nodeIdBits = 256,
    nodeBucketLimit = config.defaultsSystem.nodesGraphBucketLimit,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyRing: KeyRing;
    nodeIdBits?: number;
    nodeBucketLimit?: number;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<NodeGraph> {
    logger.info(`Creating ${this.name}`);
    const nodeGraph = new this({
      db,
      keyRing,
      nodeIdBits,
      nodeBucketLimit,
      logger,
    });
    await nodeGraph.start({ fresh });
    logger.info(`Created ${this.name}`);
    return nodeGraph;
  }

  /**
   * Bit size of the node IDs.
   * This is also the total number of buckets.
   */
  public readonly nodeIdBits: number;

  /**
   * Max number of nodes in each bucket.
   */
  public readonly nodeBucketLimit: number;

  protected logger: Logger;
  protected db: DB;
  protected keyRing: KeyRing;
  protected space: NodeGraphSpace;

  protected nodeGraphDbPath: LevelPath = [this.constructor.name];
  /**
   * Meta stores the `keyof NodeBucketMeta` -> `NodeBucketMeta[keyof NodeBucketMeta]`
   */
  protected nodeGraphMetaDbPath: LevelPath;
  /**
   * Buckets stores `lexi(NodeBucketIndex)/NodeId` -> `NodeData`
   */
  protected nodeGraphBucketsDbPath: LevelPath;
  /**
   * Last updated stores `lexi(NodeBucketIndex)/lexi(lastUpdated)-NodeId` -> `NodeId`
   */
  protected nodeGraphLastUpdatedDbPath: LevelPath;

  constructor({
    db,
    keyRing,
    nodeIdBits,
    nodeBucketLimit,
    logger,
  }: {
    db: DB;
    keyRing: KeyRing;
    nodeIdBits: number;
    nodeBucketLimit: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyRing = keyRing;
    this.nodeIdBits = nodeIdBits;
    this.nodeBucketLimit = nodeBucketLimit;
  }

  public async start({
    fresh = false,
  }: { fresh?: boolean } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    const space = await this.db.withTransactionF(async (tran) => {
      if (fresh) {
        await tran.clear(this.nodeGraphDbPath);
      }
      // Space key is used to create a swappable sublevel
      // when remapping the buckets during `this.resetBuckets`
      return await this.setupSpace(tran);
    });
    // Bucket metadata sublevel: `!meta<space>!<lexi(NodeBucketIndex)>!<key> -> value`
    this.nodeGraphMetaDbPath = [...this.nodeGraphDbPath, 'meta' + space];
    // Bucket sublevel: `!buckets<space>!<lexi(NodeBucketIndex)>!<NodeId> -> NodeData`
    // The BucketIndex can range from 0 to NodeId bit-size minus 1
    // So 256 bits means 256 buckets of 0 to 255
    this.nodeGraphBucketsDbPath = [...this.nodeGraphDbPath, 'buckets' + space];
    // Last updated sublevel: `!lastUpdated<space>!<lexi(NodeBucketIndex)>!<lexi(lastUpdated)>-<NodeId> -> NodeId`
    // This is used as a sorted index of the NodeId by `lastUpdated` timestamp
    // The `NodeId` must be appended in the key in order to disambiguate `NodeId` with same `lastUpdated` timestamp
    this.nodeGraphLastUpdatedDbPath = [
      ...this.nodeGraphDbPath,
      'lastUpdated' + space,
    ];
    this.space = space;
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.nodeGraphDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Sets up the space key
   * The space string is suffixed to the `buckets` and `meta` sublevels
   * This is used to allow swapping of sublevels when remapping buckets
   * during `this.resetBuckets`
   */
  protected async setupSpace(tran: DBTransaction): Promise<NodeGraphSpace> {
    let space = await tran.get<NodeGraphSpace>([
      ...this.nodeGraphDbPath,
      'space',
    ]);
    if (space != null) {
      return space;
    }
    space = '0';
    await tran.put([...this.nodeGraphDbPath, 'space'], space);
    return space;
  }

  /**
   * Derive the bucket index of the k-buckets from the new `NodeId`
   * The bucket key is the string encoded version of bucket index
   * that preserves lexicographic order
   */
  public bucketIndex(nodeId: NodeId): [NodeBucketIndex, string] {
    const nodeIdOwn = this.keyRing.getNodeId();
    if (nodeId.equals(nodeIdOwn)) {
      throw new nodesErrors.ErrorNodeGraphSameNodeId();
    }
    const bucketIndex = nodesUtils.bucketIndex(nodeIdOwn, nodeId);
    const bucketKey = nodesUtils.bucketKey(bucketIndex);
    return [bucketIndex, bucketKey];
  }

  /**
   * Locks the bucket index for exclusive operations.
   * This allows you sequence operations for any bucket.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async lockBucket(bucketIndex: number, tran: DBTransaction) {
    const keyPath = [
      ...this.nodeGraphMetaDbPath,
      nodesUtils.bucketKey(bucketIndex),
    ];
    return await tran.lock(keyPath.join(''));
  }

  /**
   * Gets the `NodeData` given a `NodeId`.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getNode(
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<NodeData | undefined> {
    const tranOrDb = tran ?? this.db;
    const [bucketIndex] = this.bucketIndex(nodeId);
    const bucketDomain = [
      ...this.nodeGraphBucketsDbPath,
      nodesUtils.bucketKey(bucketIndex),
      nodesUtils.bucketDbKey(nodeId),
    ];
    return await tranOrDb.get<NodeData>(bucketDomain);
  }

  /**
   * Get all `NodeData`.
   *
   * Results are sorted by `NodeBucketIndex` then `NodeId`.
   * The `order` parameter applies to both, for example:
   *   NodeBucketIndex asc, NodeID asc
   *   NodeBucketIndex desc, NodeId desc
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async *getNodes(
    order: 'asc' | 'desc' = 'asc',
    tran?: DBTransaction,
  ): AsyncGenerator<[NodeId, NodeData]> {
    if (tran == null) {
      const getNodes = (tran) => this.getNodes(order, tran);
      return yield* this.db.withTransactionG(async function* (tran) {
        return yield* getNodes(tran);
      });
    }
    for await (const [keyPath, nodeData] of tran.iterator<NodeData>(
      this.nodeGraphBucketsDbPath,
      {
        reverse: order !== 'asc',
        valueAsBuffer: false,
      },
    )) {
      const { nodeId } = nodesUtils.parseBucketsDbKey(keyPath);
      yield [nodeId, nodeData];
    }
  }

  /**
   * Sets a `NodeId` and `NodeAddress` to an appropriate bucket.
   * If the `NodeId` already exists, it will be updated.
   * It will increment the bucket count if it is a new record.
   *
   * @throws {nodesErrors.ErrorNodeGraphBucketLimit} If the bucket is full.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    lastUpdated: number = utils.getUnixtime(),
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setNode(nodeId, nodeAddress, lastUpdated, tran),
      );
    }
    const [bucketIndex, bucketKey] = this.bucketIndex(nodeId);
    const lastUpdatedPath = [...this.nodeGraphLastUpdatedDbPath, bucketKey];
    const nodeIdKey = nodesUtils.bucketDbKey(nodeId);
    const bucketPath = [...this.nodeGraphBucketsDbPath, bucketKey, nodeIdKey];
    const nodeData = await tran.get<NodeData>(bucketPath);
    if (nodeData != null) {
      // If the node already exists we want to remove the old `lastUpdated`
      const lastUpdatedKey = nodesUtils.lastUpdatedKey(nodeData.lastUpdated);
      await tran.del([...lastUpdatedPath, lastUpdatedKey, nodeIdKey]);
    } else {
      // It didn't exist, so we want to increment the bucket count
      const count = await this.getBucketMetaProp(bucketIndex, 'count', tran);
      if (count >= this.nodeBucketLimit) {
        throw new nodesErrors.ErrorNodeGraphBucketLimit();
      }
      await this.setBucketMetaProp(bucketIndex, 'count', count + 1, tran);
    }
    await tran.put(bucketPath, {
      address: nodeAddress,
      lastUpdated,
    });
    const newLastUpdatedKey = nodesUtils.lastUpdatedKey(lastUpdated);
    await tran.put(
      [...lastUpdatedPath, newLastUpdatedKey, nodeIdKey],
      nodeIdKey,
      true,
    );
  }

  /**
   * Unsets a `NodeId` record.
   * It will decrement the bucket count if it existed.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async unsetNode(nodeId: NodeId, tran?: DBTransaction): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.unsetNode(nodeId, tran));
    }
    const [bucketIndex, bucketKey] = this.bucketIndex(nodeId);
    const bucketPath = [...this.nodeGraphBucketsDbPath, bucketKey];
    const lastUpdatedPath = [...this.nodeGraphLastUpdatedDbPath, bucketKey];
    const nodeIdKey = nodesUtils.bucketDbKey(nodeId);
    const nodeData = await tran.get<NodeData>([...bucketPath, nodeIdKey]);
    if (nodeData != null) {
      const count = await this.getBucketMetaProp(bucketIndex, 'count', tran);
      // If the bucket is empty, this becomes `0`
      await this.setBucketMetaProp(bucketIndex, 'count', count - 1, tran);
      await tran.del([...bucketPath, nodeIdKey]);
      const lastUpdatedKey = nodesUtils.lastUpdatedKey(nodeData.lastUpdated);
      await tran.del([...lastUpdatedPath, lastUpdatedKey, nodeIdKey]);
    }
  }

  /**
   * Gets a bucket.

   * The bucket's node IDs is sorted lexicographically by default
   * Alternatively you can acquire them sorted by lastUpdated timestamp
   * or by distance to the own NodeId.
   *
   * @param limit Limit the number of nodes returned, note that `-1` means
   *              no limit, but `Infinity` means `0`.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getBucket(
    bucketIndex: NodeBucketIndex,
    sort: 'nodeId' | 'distance' | 'lastUpdated' = 'nodeId',
    order: 'asc' | 'desc' = 'asc',
    limit?: number,
    tran?: DBTransaction,
  ): Promise<NodeBucket> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getBucket(bucketIndex, sort, order, limit, tran),
      );
    }
    if (bucketIndex < 0 || bucketIndex >= this.nodeIdBits) {
      throw new nodesErrors.ErrorNodeGraphBucketIndex(
        `bucketIndex must be between 0 and ${this.nodeIdBits - 1} inclusive`,
      );
    }
    const nodeIdOwn = this.keyRing.getNodeId();
    const bucketKey = nodesUtils.bucketKey(bucketIndex);
    const bucket: NodeBucket = [];
    if (sort === 'nodeId' || sort === 'distance') {
      for await (const [key, nodeData] of tran.iterator<NodeData>(
        [...this.nodeGraphBucketsDbPath, bucketKey],
        {
          reverse: order !== 'asc',
          valueAsBuffer: false,
          limit,
        },
      )) {
        const nodeId = nodesUtils.parseBucketDbKey(key[0] as Buffer);
        bucket.push([nodeId, nodeData]);
      }
      if (sort === 'distance') {
        nodesUtils.bucketSortByDistance(bucket, nodeIdOwn, order);
      }
    } else if (sort === 'lastUpdated') {
      const bucketDbIterator = tran.iterator<NodeData>(
        [...this.nodeGraphBucketsDbPath, bucketKey],
        { valueAsBuffer: false },
      );
      try {
        for await (const [, nodeIdBuffer] of tran.iterator(
          [...this.nodeGraphLastUpdatedDbPath, bucketKey],
          {
            reverse: order !== 'asc',
            limit,
          },
        )) {
          const nodeId = IdInternal.fromBuffer<NodeId>(nodeIdBuffer);
          bucketDbIterator.seek(nodeIdBuffer);
          // eslint-disable-next-line
          const iteratorResult = await bucketDbIterator.next();
          if (iteratorResult == null) utils.never();
          const [, nodeData] = iteratorResult;
          bucket.push([nodeId, nodeData]);
        }
      } finally {
        await bucketDbIterator.destroy();
      }
    }
    return bucket;
  }

  /**
   * Gets all buckets.
   * Buckets are always sorted by `NodeBucketIndex` first
   * Then secondly by the `sort` parameter
   * The `order` parameter applies to both, for example possible sorts:
   *   NodeBucketIndex asc, NodeID asc
   *   NodeBucketIndex desc, NodeId desc
   *   NodeBucketIndex asc, distance asc
   *   NodeBucketIndex desc, distance desc
   *   NodeBucketIndex asc, lastUpdated asc
   *   NodeBucketIndex desc, lastUpdated desc
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async *getBuckets(
    sort: 'nodeId' | 'distance' | 'lastUpdated' = 'nodeId',
    order: 'asc' | 'desc' = 'asc',
    tran?: DBTransaction,
  ): AsyncGenerator<[NodeBucketIndex, NodeBucket]> {
    if (tran == null) {
      const getBuckets = (tran) => this.getBuckets(sort, order, tran);
      return yield* this.db.withTransactionG(async function* (tran) {
        return yield* getBuckets(tran);
      });
    }
    const nodeIdOwn = this.keyRing.getNodeId();
    let bucketIndex: NodeBucketIndex | undefined = undefined;
    let bucket: NodeBucket = [];
    if (sort === 'nodeId' || sort === 'distance') {
      for await (const [key, nodeData] of tran.iterator<NodeData>(
        this.nodeGraphBucketsDbPath,
        {
          reverse: order !== 'asc',
          valueAsBuffer: false,
        },
      )) {
        const { bucketIndex: bucketIndex_, nodeId } =
          nodesUtils.parseBucketsDbKey(key);
        if (bucketIndex == null) {
          // First entry of the first bucket
          bucketIndex = bucketIndex_;
          bucket.push([nodeId, nodeData]);
        } else if (bucketIndex === bucketIndex_) {
          // Subsequent entries of the same bucket
          bucket.push([nodeId, nodeData]);
        } else if (bucketIndex !== bucketIndex_) {
          // New bucket
          if (sort === 'distance') {
            nodesUtils.bucketSortByDistance(bucket, nodeIdOwn, order);
          }
          yield [bucketIndex, bucket];
          bucketIndex = bucketIndex_;
          bucket = [[nodeId, nodeData]];
        }
      }
      // Yield the last bucket if it exists
      if (bucketIndex != null) {
        if (sort === 'distance') {
          nodesUtils.bucketSortByDistance(bucket, nodeIdOwn, order);
        }
        yield [bucketIndex, bucket];
      }
    } else if (sort === 'lastUpdated') {
      const bucketsDbIterator = tran.iterator<NodeData>(
        this.nodeGraphBucketsDbPath,
        { valueAsBuffer: false },
      );
      try {
        for await (const [key] of tran.iterator(
          this.nodeGraphLastUpdatedDbPath,
          {
            reverse: order !== 'asc',
          },
        )) {
          const { bucketIndex: bucketIndex_, nodeId } =
            nodesUtils.parseLastUpdatedBucketsDbKey(key);
          bucketsDbIterator.seek([key[0], key[2]]);
          // eslint-disable-next-line
          const iteratorResult = await bucketsDbIterator.next();
          if (iteratorResult == null) utils.never();
          const [, nodeData] = iteratorResult;
          if (bucketIndex == null) {
            // First entry of the first bucket
            bucketIndex = bucketIndex_;
            bucket.push([nodeId, nodeData]);
          } else if (bucketIndex === bucketIndex_) {
            // Subsequent entries of the same bucket
            bucket.push([nodeId, nodeData]);
          } else if (bucketIndex !== bucketIndex_) {
            // New bucket
            yield [bucketIndex, bucket];
            bucketIndex = bucketIndex_;
            bucket = [[nodeId, nodeData]];
          }
        }
        // Yield the last bucket if it exists
        if (bucketIndex != null) {
          yield [bucketIndex, bucket];
        }
      } finally {
        await bucketsDbIterator.destroy();
      }
    }
  }

  /**
   * Resets the bucket according to the new node ID.
   * Run this after new node ID is generated via renewal or reset.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async resetBuckets(
    nodeIdOwn: NodeId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.resetBuckets(nodeIdOwn, tran),
      );
    }
    // Setup new space
    const spaceNew = this.space === '0' ? '1' : '0';
    const nodeGraphMetaDbPathNew = [...this.nodeGraphDbPath, 'meta' + spaceNew];
    const nodeGraphBucketsDbPathNew = [
      ...this.nodeGraphDbPath,
      'buckets' + spaceNew,
    ];
    const nodeGraphLastUpdatedDbPathNew = [
      ...this.nodeGraphDbPath,
      'index' + spaceNew,
    ];
    // Clear the new space (in case it wasn't cleaned properly last time)
    await tran.clear(nodeGraphMetaDbPathNew);
    await tran.clear(nodeGraphBucketsDbPathNew);
    await tran.clear(nodeGraphLastUpdatedDbPathNew);
    // Iterating over all entries across all buckets
    for await (const [key, nodeData] of tran.iterator<NodeData>(
      this.nodeGraphBucketsDbPath,
      { valueAsBuffer: false },
    )) {
      // The key is a combined bucket key and node ID
      const { bucketIndex: bucketIndexOld, nodeId } =
        nodesUtils.parseBucketsDbKey(key);
      const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
      const nodeIdKey = nodesUtils.bucketDbKey(nodeId);
      // If the new own node ID is one of the existing node IDs, it is just dropped
      // We only map to the new bucket if it isn't one of the existing node IDs
      if (nodeId.equals(nodeIdOwn)) {
        continue;
      }
      const bucketIndexNew = nodesUtils.bucketIndex(nodeIdOwn, nodeId);
      const bucketKeyNew = nodesUtils.bucketKey(bucketIndexNew);
      const metaPathNew = [...nodeGraphMetaDbPathNew, bucketKeyNew];
      const bucketPathNew = [...nodeGraphBucketsDbPathNew, bucketKeyNew];
      const indexPathNew = [...nodeGraphLastUpdatedDbPathNew, bucketKeyNew];
      const countNew = (await tran.get<number>([...metaPathNew, 'count'])) ?? 0;
      if (countNew < this.nodeBucketLimit) {
        // If the new bucket is not filled up, the node is moved to the new bucket
        await tran.put([...metaPathNew, 'count'], countNew + 1);
      } else {
        // If the new bucket is already filled up, the oldest node is dropped
        let oldestIndexKey: KeyPath | undefined = undefined;
        let oldestNodeId: NodeId | undefined = undefined;
        for await (const [key] of tran.iterator(indexPathNew, {
          limit: 1,
        })) {
          oldestIndexKey = key;
          ({ nodeId: oldestNodeId } =
            nodesUtils.parseLastUpdatedBucketDbKey(key));
        }
        await tran.del([
          ...bucketPathNew,
          nodesUtils.bucketDbKey(oldestNodeId!),
        ]);
        await tran.del([...indexPathNew, ...oldestIndexKey!]);
      }
      await tran.put([...bucketPathNew, nodeIdKey], nodeData);
      const lastUpdatedKey = nodesUtils.lastUpdatedKey(nodeData.lastUpdated);
      await tran.put(
        [...indexPathNew, lastUpdatedKey, nodeIdKey],
        nodeIdKey,
        true,
      );
    }
    // Swap to the new space
    await tran.put([...this.nodeGraphDbPath, 'space'], spaceNew);
    // Clear old space
    await tran.clear(this.nodeGraphMetaDbPath);
    await tran.clear(this.nodeGraphBucketsDbPath);
    await tran.clear(this.nodeGraphLastUpdatedDbPath);
    // Swap the spaces
    this.space = spaceNew;
    this.nodeGraphMetaDbPath = nodeGraphMetaDbPathNew;
    this.nodeGraphBucketsDbPath = nodeGraphBucketsDbPathNew;
    this.nodeGraphLastUpdatedDbPath = nodeGraphLastUpdatedDbPathNew;
  }

  /**
   * Get a bucket meta POJO.
   * This will provide default values for missing properties.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getBucketMeta(
    bucketIndex: NodeBucketIndex,
    tran?: DBTransaction,
  ): Promise<NodeBucketMeta> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getBucketMeta(bucketIndex, tran),
      );
    }

    if (bucketIndex < 0 || bucketIndex >= this.nodeIdBits) {
      throw new nodesErrors.ErrorNodeGraphBucketIndex(
        `bucketIndex must be between 0 and ${this.nodeIdBits - 1} inclusive`,
      );
    }
    const metaDomain = [
      ...this.nodeGraphMetaDbPath,
      nodesUtils.bucketKey(bucketIndex),
    ];
    const props = await Promise.all([
      tran.get<number>([...metaDomain, 'count']),
    ]);
    const [count] = props;
    // Bucket meta properties have defaults
    return {
      count: count ?? 0,
    };
  }

  /**
   * Get a single bucket meta property.
   * This will provide default values for missing properties.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getBucketMetaProp<Key extends keyof NodeBucketMeta>(
    bucketIndex: NodeBucketIndex,
    key: Key,
    tran?: DBTransaction,
  ): Promise<NodeBucketMeta[Key]> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getBucketMetaProp(bucketIndex, key, tran),
      );
    }
    if (bucketIndex < 0 || bucketIndex >= this.nodeIdBits) {
      throw new nodesErrors.ErrorNodeGraphBucketIndex(
        `bucketIndex must be between 0 and ${this.nodeIdBits - 1} inclusive`,
      );
    }
    const metaDomain = [
      ...this.nodeGraphMetaDbPath,
      nodesUtils.bucketKey(bucketIndex),
    ];
    // Bucket meta properties have defaults
    let value;
    switch (key) {
      case 'count':
        value = (await tran.get([...metaDomain, key])) ?? 0;
        break;
    }
    return value;
  }

  /**
   * Gets the closest nodes (closest based on Kademlia XOR operator) to a
   * given node ID. The returned results will be sorted by distance in
   * ascending order. If the given node ID already exists in the node graph,
   * then it will be the first result.
   *
   * @param limit - Defaults to the bucket limit.
   * @returns The `NodeBucket` which could have less than `limit` nodes if the
   *          node graph has less than the requested limit.
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getClosestNodes(
    nodeId: NodeId,
    limit: number = this.nodeBucketLimit,
    tran?: DBTransaction,
  ): Promise<NodeBucket> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getClosestNodes(nodeId, limit, tran),
      );
    }
    // Buckets map to the target node in the following way;
    // 1. 0, 1, ..., T-1 -> T
    // 2. T -> 0, 1, ..., T-1
    // 3. T+1, T+2, ..., 255 are unchanged
    // We need to obtain nodes in the following bucket order
    // 1. T
    // 2. iterate over 0 ---> T-1
    // 3. iterate over T+1 ---> K
    // If our own node ID, start at bucket 0
    // Otherwise find the bucket that the given node ID belongs to
    const nodeIdOwn = this.keyRing.getNodeId();
    const bucketIndexFirst = nodeIdOwn.equals(nodeId)
      ? 0
      : nodesUtils.bucketIndex(nodeIdOwn, nodeId);
    // Getting the whole target's bucket first
    const nodes: NodeBucket = await this.getBucket(
      bucketIndexFirst,
      undefined,
      undefined,
      undefined,
      tran,
    );
    // We need to iterate over the key stream
    // When streaming we want all nodes in the starting bucket
    // The keys takes the form `lexi<NodeBucketIndex>/NodeId`
    // We can just use `lexi<NodeBucketIndex>` to start from
    // Less than `lexi<NodeBucketIndex:101>` gets us buckets 100 and lower
    // Greater than `lexi<NodeBucketIndex:99>` gets us buckets 100 and greater
    if (nodes.length < limit) {
      // Just before target bucket
      const bucketIdKey = Buffer.from(nodesUtils.bucketKey(bucketIndexFirst));
      const remainingLimit = limit - nodes.length;
      // Iterate over lower buckets
      for await (const [key, nodeData] of tran.iterator<NodeData>(
        this.nodeGraphBucketsDbPath,
        {
          lt: [bucketIdKey, ''],
          limit: remainingLimit,
          valueAsBuffer: false,
        },
      )) {
        const info = nodesUtils.parseBucketsDbKey(key);
        nodes.push([info.nodeId, nodeData]);
      }
    }
    if (nodes.length < limit) {
      // Just after target bucket
      const bucketId = Buffer.from(nodesUtils.bucketKey(bucketIndexFirst + 1));
      const remainingLimit = limit - nodes.length;
      // Iterate over ids further away
      tran.iterator(this.nodeGraphBucketsDbPath, {
        gt: [bucketId, ''],
        limit: remainingLimit,
      });
      for await (const [key, nodeData] of tran.iterator<NodeData>(
        this.nodeGraphBucketsDbPath,
        {
          gt: [bucketId, ''],
          limit: remainingLimit,
          valueAsBuffer: false,
        },
      )) {
        const info = nodesUtils.parseBucketsDbKey(key);
        nodes.push([info.nodeId, nodeData]);
      }
    }
    // If no nodes were found, return nothing
    if (nodes.length === 0) return [];
    // Need to get the whole of the last bucket
    const bucketIndexLast = nodesUtils.bucketIndex(
      nodeIdOwn,
      nodes[nodes.length - 1][0],
    );
    const lastBucket = await this.getBucket(
      bucketIndexLast,
      undefined,
      undefined,
      undefined,
      tran,
    );
    // Pop off elements of the same bucket to avoid duplicates
    let element = nodes.pop();
    while (
      element != null &&
      nodesUtils.bucketIndex(nodeIdOwn, element[0]) === bucketIndexLast
    ) {
      element = nodes.pop();
    }
    if (element != null) nodes.push(element);
    // Adding last bucket to the list
    nodes.push(...lastBucket);
    nodesUtils.bucketSortByDistance(nodes, nodeId, 'asc');
    return nodes.slice(0, limit);
  }

  /**
   * Sets a single bucket meta property.
   * Bucket meta properties cannot be mutated outside.
   */
  protected async setBucketMetaProp<Key extends keyof NodeBucketMeta>(
    bucketIndex: NodeBucketIndex,
    key: Key,
    value: NodeBucketMeta[Key],
    tran: DBTransaction,
  ): Promise<void> {
    const metaKey = [
      ...this.nodeGraphMetaDbPath,
      nodesUtils.bucketKey(bucketIndex),
      key,
    ];
    await tran.put(metaKey, value);
    return;
  }

  /**
   * Returns to total number of nodes in the `NodeGraph`
   */
  public async nodesTotal(tran?: DBTransaction): Promise<number> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.nodesTotal(tran));
    }
    return await tran.count(this.nodeGraphBucketsDbPath);
  }
}

export default NodeGraph;
