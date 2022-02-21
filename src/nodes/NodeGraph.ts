import type { DB, DBTransaction, LevelPath } from '@matrixai/db';
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
    const nodeGraph = new NodeGraph({
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
    // The BucketIndex can range from 0 to NodeId bitsize minus 1
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
    tran: DBTransaction,
  ): Promise<NodeData | undefined> {
    const [bucketIndex] = this.bucketIndex(nodeId);
    const bucketDomain = [
      ...this.nodeGraphBucketsDbPath,
      nodesUtils.bucketKey(bucketIndex),
      nodesUtils.bucketDbKey(nodeId),
    ];
    return await tran.get<NodeData>(bucketDomain);
  }

  /**
   * Get all nodes
   * Nodes are always sorted by `NodeBucketIndex` first
   * Then secondly by the node IDs
   * The `order` parameter applies to both, for example possible sorts:
   *   NodeBucketIndex asc, NodeID asc
   *   NodeBucketIndex desc, NodeId desc
   */
  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async *getNodes(
    order: 'asc' | 'desc' = 'asc',
    tran: DBTransaction,
  ): AsyncGenerator<[NodeId, NodeData]> {
    for await (const [key, nodeData] of tran.iterator<NodeData>(
      {
        reverse: order !== 'asc',
        valueAsBuffer: false,
      },
      this.nodeGraphBucketsDbPath,
    )) {
      const { nodeId } = nodesUtils.parseBucketsDbKey(key as unknown as Buffer);
      yield [nodeId, nodeData];
    }
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
    tran: DBTransaction,
  ): Promise<void> {
    const [bucketIndex, bucketKey] = this.bucketIndex(nodeId);
    const lastUpdatedPath = [...this.nodeGraphLastUpdatedDbPath, bucketKey];
    const bucketPath = [...this.nodeGraphBucketsDbPath, bucketKey];
    const nodeData = await tran.get<NodeData>([
      ...bucketPath,
      nodesUtils.bucketDbKey(nodeId),
    ]);
    // If this is a new entry, check the bucket limit
    if (nodeData == null) {
      const count = await this.getBucketMetaProp(bucketIndex, 'count', tran);
      if (count < this.nodeBucketLimit) {
        // Increment the bucket count
        await this.setBucketMetaProp(bucketIndex, 'count', count + 1, tran);
      } else {
        // Remove the oldest entry in the bucket
        let oldestLastUpdatedKey: Buffer;
        let oldestNodeId: NodeId;
        for await (const [key] of tran.iterator(
          {
            limit: 1,
            values: false,
          },
          this.nodeGraphLastUpdatedDbPath,
        )) {
          oldestLastUpdatedKey = key as unknown as Buffer;
          ({ nodeId: oldestNodeId } = nodesUtils.parseLastUpdatedBucketDbKey(
            key as unknown as Buffer,
          ));
        }
        await tran.del([...bucketPath, oldestNodeId!.toBuffer()]);
        await tran.del([...lastUpdatedPath, oldestLastUpdatedKey!]);
      }
    } else {
      // This is an existing entry, so the index entry must be reset
      const lastUpdatedKey = nodesUtils.lastUpdatedBucketDbKey(
        nodeData.lastUpdated,
        nodeId,
      );
      await tran.del([...lastUpdatedPath, lastUpdatedKey]);
    }
    const lastUpdated = getUnixtime();
    await tran.put([...bucketPath, nodesUtils.bucketDbKey(nodeId)], {
      address: nodeAddress,
      lastUpdated,
    });
    const lastUpdatedKey = nodesUtils.lastUpdatedBucketDbKey(
      lastUpdated,
      nodeId,
    );
    await tran.put(
      [...lastUpdatedPath, lastUpdatedKey],
      nodesUtils.bucketDbKey(nodeId),
      true,
    );
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async unsetNode(nodeId: NodeId, tran: DBTransaction): Promise<void> {
    const [bucketIndex, bucketKey] = this.bucketIndex(nodeId);
    const bucketPath = [...this.nodeGraphBucketsDbPath, bucketKey];
    const lastUpdatedPath = [...this.nodeGraphLastUpdatedDbPath, bucketKey];
    const nodeData = await tran.get<NodeData>([
      ...bucketPath,
      nodesUtils.bucketDbKey(nodeId),
    ]);
    if (nodeData != null) {
      const count = await this.getBucketMetaProp(bucketIndex, 'count', tran);
      await this.setBucketMetaProp(bucketIndex, 'count', count - 1, tran);
      await tran.del([...bucketPath, nodesUtils.bucketDbKey(nodeId)]);
      const lastUpdatedKey = nodesUtils.lastUpdatedBucketDbKey(
        nodeData.lastUpdated,
        nodeId,
      );
      await tran.del([...lastUpdatedPath, lastUpdatedKey]);
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
    tran: DBTransaction,
  ): Promise<NodeBucket> {
    if (bucketIndex < 0 || bucketIndex >= this.nodeIdBits) {
      throw new nodesErrors.ErrorNodeGraphBucketIndex(
        `bucketIndex must be between 0 and ${this.nodeIdBits - 1} inclusive`,
      );
    }
    const bucketKey = nodesUtils.bucketKey(bucketIndex);
    const bucket: NodeBucket = [];
    if (sort === 'nodeId' || sort === 'distance') {
      for await (const [key, nodeData] of tran.iterator<NodeData>(
        {
          reverse: order !== 'asc',
          valueAsBuffer: false,
        },
        [...this.nodeGraphBucketsDbPath, bucketKey],
      )) {
        const nodeId = nodesUtils.parseBucketDbKey(key as unknown as Buffer);
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
        { valueAsBuffer: false },
        [...this.nodeGraphBucketsDbPath, bucketKey],
      );
      try {
        for await (const [, nodeIdBuffer] of tran.iterator(
          {
            reverse: order !== 'asc',
          },
          [...this.nodeGraphLastUpdatedDbPath, bucketKey],
        )) {
          const nodeId = IdInternal.fromBuffer<NodeId>(nodeIdBuffer);
          bucketDbIterator.seek(nodeIdBuffer);
          // @ts-ignore
          const iteratorResult = await bucketDbIterator.next();
          if (iteratorResult == null) never();
          const [, nodeData] = iteratorResult;
          bucket.push([nodeId, nodeData]);
        }
      } finally {
        // @ts-ignore
        await bucketDbIterator.end();
      }
    }
    return bucket;
  }

  /**
   * Gets all buckets
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
    tran: DBTransaction,
  ): AsyncGenerator<[NodeBucketIndex, NodeBucket]> {
    let bucketIndex: NodeBucketIndex | undefined = undefined;
    let bucket: NodeBucket = [];
    if (sort === 'nodeId' || sort === 'distance') {
      for await (const [key, nodeData] of tran.iterator<NodeData>(
        {
          reverse: order !== 'asc',
          valueAsBuffer: false,
        },
        this.nodeGraphBucketsDbPath,
      )) {
        const { bucketIndex: bucketIndex_, nodeId } =
          nodesUtils.parseBucketsDbKey(key as unknown as Buffer);
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
        { valueAsBuffer: false },
        this.nodeGraphBucketsDbPath,
      );
      try {
        for await (const [key] of tran.iterator(
          {
            reverse: order !== 'asc',
          },
          this.nodeGraphLastUpdatedDbPath,
        )) {
          const { bucketIndex: bucketIndex_, nodeId } =
            nodesUtils.parseLastUpdatedBucketsDbKey(key as unknown as Buffer);
          bucketsDbIterator.seek(nodesUtils.bucketsDbKey(bucketIndex_, nodeId));
          // @ts-ignore
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
        // @ts-ignore
        await bucketsDbIterator.end();
      }
    }
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async resetBuckets(
    nodeIdOwn: NodeId,
    tran: DBTransaction,
  ): Promise<void> {
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
      { valueAsBuffer: false },
      this.nodeGraphBucketsDbPath,
    )) {
      // The key is a combined bucket key and node ID
      const { nodeId } = nodesUtils.parseBucketsDbKey(key as unknown as Buffer);
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
        await tran.put([...metaPathNew, 'count'], countNew + 1);
      } else {
        let oldestIndexKey: Buffer | undefined = undefined;
        let oldestNodeId: NodeId | undefined = undefined;
        for await (const [key] of tran.iterator(
          {
            limit: 1,
          },
          indexPathNew,
        )) {
          oldestIndexKey = key as unknown as Buffer;
          ({ nodeId: oldestNodeId } = nodesUtils.parseLastUpdatedBucketDbKey(
            key as unknown as Buffer,
          ));
        }
        await tran.del([
          ...bucketPathNew,
          nodesUtils.bucketDbKey(oldestNodeId!),
        ]);
        await tran.del([...indexPathNew, oldestIndexKey!]);
      }
      await tran.put(
        [...bucketPathNew, nodesUtils.bucketDbKey(nodeId)],
        nodeData,
      );
      const lastUpdatedKey = nodesUtils.lastUpdatedBucketDbKey(
        nodeData.lastUpdated,
        nodeId,
      );
      await tran.put(
        [...indexPathNew, lastUpdatedKey],
        nodesUtils.bucketDbKey(nodeId),
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
    tran: DBTransaction,
  ): Promise<NodeBucketMeta> {
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
    tran: DBTransaction,
  ): Promise<NodeBucketMeta[Key]> {
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
  protected bucketIndex(nodeId: NodeId): [NodeBucketIndex, string] {
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
