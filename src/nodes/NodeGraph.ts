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
import type KeyManager from '../keys/KeyManager';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import { getUnixtime, never } from '../utils';

/**
 * NodeGraph is an implementation of Kademlia for maintaining peer to peer information
 * It is a database of fixed-size buckets, where each bucket contains NodeId -> NodeData
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
    nodeIdBits = 256,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    nodeIdBits?: number;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<NodeGraph> {
    logger.info(`Creating ${this.name}`);
    const nodeGraph = new this({
      db,
      keyManager,
      nodeIdBits,
      logger,
    });
    await nodeGraph.start({ fresh });
    logger.info(`Created ${this.name}`);
    return nodeGraph;
  }

  /**
   * Bit size of the NodeIds
   * This equals the number of buckets
   */
  public readonly nodeIdBits: number;
  /**
   * Max number of nodes in each k-bucket
   */
  public readonly nodeBucketLimit: number = 20;

  protected logger: Logger;
  protected db: DB;
  protected keyManager: KeyManager;
  protected space: NodeGraphSpace;
  protected nodeGraphDbPath: LevelPath = [this.constructor.name];
  protected nodeGraphMetaDbPath: LevelPath;
  protected nodeGraphBucketsDbPath: LevelPath;
  protected nodeGraphLastUpdatedDbPath: LevelPath;

  constructor({
    db,
    keyManager,
    nodeIdBits,
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    nodeIdBits: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyManager = keyManager;
    this.nodeIdBits = nodeIdBits;
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
      // when remapping the buckets during `this.refreshBuckets`
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
    // If the DB was stopped, the existing sublevel `this.nodeGraphDb` will not be valid
    // Therefore we recreate the sublevel here
    await this.db.clear(this.nodeGraphDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Sets up the space key
   * The space string is suffixed to the `buckets` and `meta` sublevels
   * This is used to allow swapping of sublevels when remapping buckets
   * during `this.refreshBuckets`
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
   * Get all nodes.
   * Nodes are always sorted by `NodeBucketIndex` first
   * Then secondly by the node IDs
   * The `order` parameter applies to both, for example possible sorts:
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
   * Will add a node to the node graph and increment the bucket count.
   * If the node already existed it will be updated.
   * @param nodeId NodeId to add to the NodeGraph
   * @param nodeAddress Address information to add
   * @param tran
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setNode(nodeId, nodeAddress, tran),
      );
    }

    const [bucketIndex, bucketKey] = this.bucketIndex(nodeId);
    const lastUpdatedPath = [...this.nodeGraphLastUpdatedDbPath, bucketKey];
    const nodeIdKey = nodesUtils.bucketDbKey(nodeId);
    const bucketPath = [...this.nodeGraphBucketsDbPath, bucketKey, nodeIdKey];
    const nodeData = await tran.get<NodeData>(bucketPath);
    if (nodeData != null) {
      this.logger.debug(
        `Updating node ${nodesUtils.encodeNodeId(
          nodeId,
        )} in bucket ${bucketIndex}`,
      );
      // If the node already exists we want to remove the old `lastUpdated`
      const lastUpdatedKey = nodesUtils.lastUpdatedKey(nodeData.lastUpdated);
      await tran.del([...lastUpdatedPath, lastUpdatedKey, nodeIdKey]);
    } else {
      this.logger.debug(
        `Adding node ${nodesUtils.encodeNodeId(
          nodeId,
        )} to bucket ${bucketIndex}`,
      );
      // It didn't exist, so we want to increment the bucket count
      const count = await this.getBucketMetaProp(bucketIndex, 'count', tran);
      await this.setBucketMetaProp(bucketIndex, 'count', count + 1, tran);
    }
    const lastUpdated = getUnixtime();
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

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getOldestNode(
    bucketIndex: number,
    limit: number = 1,
    tran?: DBTransaction,
  ): Promise<Array<NodeId>> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getOldestNode(bucketIndex, limit, tran),
      );
    }
    const bucketKey = nodesUtils.bucketKey(bucketIndex);
    // Remove the oldest entry in the bucket
    const oldestNodeIds: Array<NodeId> = [];
    for await (const [keyPath] of tran.iterator(
      [...this.nodeGraphLastUpdatedDbPath, bucketKey],
      { limit },
    )) {
      const { nodeId } = nodesUtils.parseLastUpdatedBucketDbKey(keyPath);
      oldestNodeIds.push(nodeId);
    }
    return oldestNodeIds;
  }

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
      this.logger.debug(
        `Removing node ${nodesUtils.encodeNodeId(
          nodeId,
        )} from bucket ${bucketIndex}`,
      );
      const count = await this.getBucketMetaProp(bucketIndex, 'count', tran);
      await this.setBucketMetaProp(bucketIndex, 'count', count - 1, tran);
      await tran.del([...bucketPath, nodeIdKey]);
      const lastUpdatedKey = nodesUtils.lastUpdatedKey(nodeData.lastUpdated);
      await tran.del([...lastUpdatedPath, lastUpdatedKey, nodeIdKey]);
    }
  }

  /**
   * Gets a bucket
   * The bucket's node IDs is sorted lexicographically by default
   * Alternatively you can acquire them sorted by lastUpdated timestamp
   * or by distance to the own NodeId
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getBucket(
    bucketIndex: NodeBucketIndex,
    sort: 'nodeId' | 'distance' | 'lastUpdated' = 'nodeId',
    order: 'asc' | 'desc' = 'asc',
    tran?: DBTransaction,
  ): Promise<NodeBucket> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getBucket(bucketIndex, sort, order, tran),
      );
    }

    if (bucketIndex < 0 || bucketIndex >= this.nodeIdBits) {
      throw new nodesErrors.ErrorNodeGraphBucketIndex(
        `bucketIndex must be between 0 and ${this.nodeIdBits - 1} inclusive`,
      );
    }
    const bucketKey = nodesUtils.bucketKey(bucketIndex);
    const bucket: NodeBucket = [];
    if (sort === 'nodeId' || sort === 'distance') {
      for await (const [key, nodeData] of tran.iterator<NodeData>(
        [...this.nodeGraphBucketsDbPath, bucketKey],
        {
          reverse: order !== 'asc',
          valueAsBuffer: false,
        },
      )) {
        const nodeId = nodesUtils.parseBucketDbKey(key[0] as Buffer);
        bucket.push([nodeId, nodeData]);
      }
      if (sort === 'distance') {
        nodesUtils.bucketSortByDistance(
          bucket,
          this.keyManager.getNodeId(),
          order,
        );
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
          },
        )) {
          const nodeId = IdInternal.fromBuffer<NodeId>(nodeIdBuffer);
          bucketDbIterator.seek(nodeIdBuffer);
          // eslint-disable-next-line
          const iteratorResult = await bucketDbIterator.next();
          if (iteratorResult == null) never();
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
            nodesUtils.bucketSortByDistance(
              bucket,
              this.keyManager.getNodeId(),
              order,
            );
          }
          yield [bucketIndex, bucket];
          bucketIndex = bucketIndex_;
          bucket = [[nodeId, nodeData]];
        }
      }
      // Yield the last bucket if it exists
      if (bucketIndex != null) {
        if (sort === 'distance') {
          nodesUtils.bucketSortByDistance(
            bucket,
            this.keyManager.getNodeId(),
            order,
          );
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
          if (iteratorResult == null) never();
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
        await bucketsDbIterator.destroy(); // FIXME: destroy?
      }
    }
  }

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

    const logger = this.logger.getChild('resetBuckets');
    // Setup new space
    const spaceNew = this.space === '0' ? '1' : '0';
    logger.debug('new space: ' + spaceNew);
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
        logger.debug(
          `nodeId ${nodeIdEncoded} from bucket ${bucketIndexOld} was identical to new NodeId and was dropped.`,
        );
        continue;
      }
      const bucketIndexNew = nodesUtils.bucketIndex(nodeIdOwn, nodeId);
      const bucketKeyNew = nodesUtils.bucketKey(bucketIndexNew);
      const metaPathNew = [...nodeGraphMetaDbPathNew, bucketKeyNew];
      const bucketPathNew = [...nodeGraphBucketsDbPathNew, bucketKeyNew];
      const indexPathNew = [...nodeGraphLastUpdatedDbPathNew, bucketKeyNew];
      const countNew = (await tran.get<number>([...metaPathNew, 'count'])) ?? 0;
      if (countNew < this.nodeBucketLimit) {
        await tran.put([...metaPathNew, 'count'], countNew + 1);
      } else {
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
      if (bucketIndexOld !== bucketIndexNew) {
        logger.debug(
          `nodeId ${nodeIdEncoded} moved ${bucketIndexOld}=>${bucketIndexNew}`,
        );
      } else {
        logger.debug(`nodeId ${nodeIdEncoded} unchanged ${bucketIndexOld}`);
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
   * Finds the set of nodes (of size k) known by the current node (i.e. in its
   * buckets' database) that have the smallest distance to the target node (i.e.
   * are closest to the target node).
   * i.e. FIND_NODE RPC from Kademlia spec
   *
   * Used by the RPC service.
   *
   * @param nodeId the node ID to find other nodes closest to it
   * @param limit the number of the closest nodes to return (by default, returns
   * according to the maximum number of nodes per bucket)
   * @param tran
   * @returns a mapping containing exactly k nodeIds -> nodeAddresses (unless the
   * current node has less than k nodes in all of its buckets, in which case it
   * returns all nodes it has knowledge of)
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
    // Need to work out the relevant bucket to start from
    const localNodeId = this.keyManager.getNodeId();
    const startingBucket = localNodeId.equals(nodeId)
      ? 0
      : nodesUtils.bucketIndex(this.keyManager.getNodeId(), nodeId);
    // Getting the whole target's bucket first
    const nodeIds: NodeBucket = await this.getBucket(
      startingBucket,
      undefined,
      undefined,
      tran,
    );
    // We need to iterate over the key stream
    // When streaming we want all nodes in the starting bucket
    // The keys takes the form `!(lexpack bucketId)!(nodeId)`
    // We can just use `!(lexpack bucketId)` to start from
    // Less than `!(bucketId 101)!` gets us buckets 100 and lower
    // greater than `!(bucketId 99)!` gets up buckets 100 and greater
    if (nodeIds.length < limit) {
      // Just before target bucket
      const bucketIdKey = Buffer.from(nodesUtils.bucketKey(startingBucket));
      const remainingLimit = limit - nodeIds.length;
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
        nodeIds.push([info.nodeId, nodeData]);
      }
    }
    if (nodeIds.length < limit) {
      // Just after target bucket
      const bucketId = Buffer.from(nodesUtils.bucketKey(startingBucket + 1));
      const remainingLimit = limit - nodeIds.length;
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
        nodeIds.push([info.nodeId, nodeData]);
      }
    }
    // If no nodes were found, return nothing
    if (nodeIds.length === 0) return [];
    // Need to get the whole of the last bucket
    const lastBucketIndex = nodesUtils.bucketIndex(
      this.keyManager.getNodeId(),
      nodeIds[nodeIds.length - 1][0],
    );
    const lastBucket = await this.getBucket(
      lastBucketIndex,
      undefined,
      undefined,
      tran,
    );
    // Pop off elements of the same bucket to avoid duplicates
    let element = nodeIds.pop();
    while (
      element != null &&
      nodesUtils.bucketIndex(this.keyManager.getNodeId(), element[0]) ===
        lastBucketIndex
    ) {
      element = nodeIds.pop();
    }
    if (element != null) nodeIds.push(element);
    // Adding last bucket to the list
    nodeIds.push(...lastBucket);

    nodesUtils.bucketSortByDistance(nodeIds, nodeId, 'asc');
    return nodeIds.slice(0, limit);
  }

  /**
   * Sets a bucket meta property
   * This is protected because users cannot directly manipulate bucket meta
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
   * Derive the bucket index of the k-buckets from the new `NodeId`
   * The bucket key is the string encoded version of bucket index
   * that preserves lexicographic order
   */
  public bucketIndex(nodeId: NodeId): [NodeBucketIndex, string] {
    const nodeIdOwn = this.keyManager.getNodeId();
    if (nodeId.equals(nodeIdOwn)) {
      throw new nodesErrors.ErrorNodeGraphSameNodeId();
    }
    const bucketIndex = nodesUtils.bucketIndex(nodeIdOwn, nodeId);
    const bucketKey = nodesUtils.bucketKey(bucketIndex);
    return [bucketIndex, bucketKey];
  }
}

export default NodeGraph;
