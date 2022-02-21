import type {
  DB,
  DBDomain,
  DBLevel,
  DBOp,
  DBTransaction,
  Transaction,
} from '@matrixai/db';
import type {
  NodeId,
  NodeIdString,
  NodeAddress,
  NodeBucket,
  NodeData,
  NodeBucketMeta,
  NodeBucketIndex,
  NodeGraphSpace,
} from './types';
import type KeyManager from '../keys/KeyManager';
import type { ResourceAcquire, ResourceRelease } from '../utils';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import * as nodesUtils from './utils';
import * as nodesErrors from './errors';
import { RWLock, withF, withG, getUnixtime } from '../utils';

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
  protected nodeGraphDbDomain: DBDomain = [this.constructor.name];
  protected nodeGraphMetaDbDomain: DBDomain;
  protected nodeGraphBucketsDbDomain: DBDomain;
  protected nodeGraphLastUpdatedDbDomain: DBDomain;
  protected nodeGraphDb: DBLevel;
  protected nodeGraphMetaDb: DBLevel;
  protected nodeGraphBucketsDb: DBLevel;
  protected nodeGraphLastUpdatedDb: DBLevel;

  // WORK out a way to do re-entrancy properly
  // Otherwise we have restrictions on the way we are developing stuff
  protected lock: RWLock = new RWLock();

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

  get locked(): boolean {
    return this.lock.isLocked();
  }

  public acquireLockRead(lazy: boolean = false): ResourceAcquire<RWLock> {
    return async () => {
      let release: ResourceRelease;
      if (lazy && this.lock.isLocked()) {
        release = async () => {};
      } else {
        const r = await this.lock.acquireRead();
        release = async () => r();
      }
      return [release, this.lock];
    };
  }

  public acquireLockWrite(lazy: boolean = false): ResourceAcquire<RWLock> {
    return async () => {
      let release: ResourceRelease;
      if (lazy && this.lock.isLocked()) {
        release = async () => {};
      } else {
        const r = await this.lock.acquireWrite();
        release = async () => r();
      }
      return [release, this.lock];
    };
  }

  public async start({
    fresh = false,
  }: { fresh?: boolean } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    const nodeGraphDb = await this.db.level(this.nodeGraphDbDomain[0]);
    if (fresh) {
      await nodeGraphDb.clear();
    }
    // Space key is used to create a swappable sublevel
    // when remapping the buckets during `this.refreshBuckets`
    const space = await this.setupSpace();
    const nodeGraphMetaDbDomain = [this.nodeGraphDbDomain[0], 'meta' + space];
    const nodeGraphBucketsDbDomain = [
      this.nodeGraphDbDomain[0],
      'buckets' + space,
    ];
    const nodeGraphLastUpdatedDbDomain = [
      this.nodeGraphDbDomain[0],
      'lastUpdated' + space,
    ];
    // Bucket metadata sublevel: `!meta<space>!<lexi(NodeBucketIndex)>!<key> -> value`
    const nodeGraphMetaDb = await this.db.level(
      nodeGraphMetaDbDomain[1],
      nodeGraphDb,
    );
    // Bucket sublevel: `!buckets<space>!<lexi(NodeBucketIndex)>!<NodeId> -> NodeData`
    // The BucketIndex can range from 0 to NodeId bitsize minus 1
    // So 256 bits means 256 buckets of 0 to 255
    const nodeGraphBucketsDb = await this.db.level(
      nodeGraphBucketsDbDomain[1],
      nodeGraphDb,
    );
    // Last updated sublevel: `!lastUpdated<space>!<lexi(NodeBucketIndex)>!<lexi(lastUpdated)>-<NodeId> -> NodeId`
    // This is used as a sorted index of the NodeId by `lastUpdated` timestamp
    // The `NodeId` must be appended in the key in order to disambiguate `NodeId` with same `lastUpdated` timestamp
    const nodeGraphLastUpdatedDb = await this.db.level(
      nodeGraphLastUpdatedDbDomain[1],
      nodeGraphDb,
    );
    this.space = space;
    this.nodeGraphMetaDbDomain = nodeGraphMetaDbDomain;
    this.nodeGraphBucketsDbDomain = nodeGraphBucketsDbDomain;
    this.nodeGraphLastUpdatedDbDomain = nodeGraphLastUpdatedDbDomain;
    this.nodeGraphDb = nodeGraphDb;
    this.nodeGraphMetaDb = nodeGraphMetaDb;
    this.nodeGraphBucketsDb = nodeGraphBucketsDb;
    this.nodeGraphLastUpdatedDb = nodeGraphLastUpdatedDb;
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
    const nodeGraphDb = await this.db.level(this.nodeGraphDbDomain[0]);
    await nodeGraphDb.clear();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Sets up the space key
   * The space string is suffixed to the `buckets` and `meta` sublevels
   * This is used to allow swapping of sublevels when remapping buckets
   * during `this.refreshBuckets`
   */
  protected async setupSpace(): Promise<NodeGraphSpace> {
    let space = await this.db.get<NodeGraphSpace>(
      this.nodeGraphDbDomain,
      'space',
    );
    if (space != null) {
      return space;
    }
    space = '0';
    await this.db.put(this.nodeGraphDbDomain, 'space', space);
    return space;
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getNode(nodeId: NodeId): Promise<NodeData | undefined> {
    const [bucketIndex] = this.bucketIndex(nodeId);
    const bucketDomain = [
      ...this.nodeGraphBucketsDbDomain,
      nodesUtils.bucketKey(bucketIndex),
    ];
    return await this.db.get<NodeData>(
      bucketDomain,
      nodesUtils.bucketDbKey(nodeId),
    );
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
  ): AsyncGenerator<[NodeId, NodeData]> {
    for await (const o of this.nodeGraphBucketsDb.createReadStream({
      reverse: order === 'asc' ? false : true,
    })) {
      const { nodeId, bucketIndex } = nodesUtils.parseBucketsDbKey(
        (o as any).key as Buffer,
      );
      const data = (o as any).value as Buffer;
      const nodeData = await this.db.deserializeDecrypt<NodeData>(data, false);
      yield [nodeId, nodeData];
    }
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async setNode(
    nodeId: NodeId,
    nodeAddress: NodeAddress,
  ): Promise<void> {
    const [bucketIndex, bucketKey] = this.bucketIndex(nodeId);
    const bucketDomain = [...this.nodeGraphBucketsDbDomain, bucketKey];
    const lastUpdatedDomain = [...this.nodeGraphLastUpdatedDbDomain, bucketKey];
    const nodeData = await this.db.get<NodeData>(
      bucketDomain,
      nodesUtils.bucketDbKey(nodeId),
    );
    // If this is a new entry, check the bucket limit
    if (nodeData == null) {
      const count = await this.getBucketMetaProp(bucketIndex, 'count');
      if (count < this.nodeBucketLimit) {
        // Increment the bucket count
        this.setBucketMetaProp(bucketIndex, 'count', count + 1);
      } else {
        // Remove the oldest entry in the bucket
        const lastUpdatedBucketDb = await this.db.level(
          bucketKey,
          this.nodeGraphLastUpdatedDb,
        );
        let oldestLastUpdatedKey: Buffer;
        let oldestNodeId: NodeId;
        for await (const key of lastUpdatedBucketDb.createKeyStream({
          limit: 1,
        })) {
          oldestLastUpdatedKey = key as Buffer;
          ({ nodeId: oldestNodeId } = nodesUtils.parseLastUpdatedBucketDbKey(
            key as Buffer,
          ));
        }
        await this.db.del(bucketDomain, oldestNodeId!.toBuffer());
        await this.db.del(lastUpdatedDomain, oldestLastUpdatedKey!);
      }
    } else {
      // This is an existing entry, so the index entry must be reset
      const lastUpdatedKey = nodesUtils.lastUpdatedBucketDbKey(
        nodeData.lastUpdated,
        nodeId,
      );
      await this.db.del(lastUpdatedDomain, lastUpdatedKey);
    }
    const lastUpdated = getUnixtime();
    await this.db.put(bucketDomain, nodesUtils.bucketDbKey(nodeId), {
      address: nodeAddress,
      lastUpdated,
    });
    const lastUpdatedKey = nodesUtils.lastUpdatedBucketDbKey(
      lastUpdated,
      nodeId,
    );
    await this.db.put(
      lastUpdatedDomain,
      lastUpdatedKey,
      nodesUtils.bucketDbKey(nodeId),
      true,
    );
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async unsetNode(nodeId: NodeId): Promise<void> {
    const [bucketIndex, bucketKey] = this.bucketIndex(nodeId);
    const bucketDomain = [...this.nodeGraphBucketsDbDomain, bucketKey];
    const lastUpdatedDomain = [...this.nodeGraphLastUpdatedDbDomain, bucketKey];
    const nodeData = await this.db.get<NodeData>(
      bucketDomain,
      nodesUtils.bucketDbKey(nodeId),
    );
    if (nodeData != null) {
      const count = await this.getBucketMetaProp(bucketIndex, 'count');
      this.setBucketMetaProp(bucketIndex, 'count', count - 1);
      await this.db.del(bucketDomain, nodesUtils.bucketDbKey(nodeId));
      const lastUpdatedKey = nodesUtils.lastUpdatedBucketDbKey(
        nodeData.lastUpdated,
        nodeId,
      );
      await this.db.del(lastUpdatedDomain, lastUpdatedKey);
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
  ): Promise<NodeBucket> {
    if (bucketIndex < 0 || bucketIndex >= this.nodeIdBits) {
      throw new nodesErrors.ErrorNodeGraphBucketIndex(
        `bucketIndex must be between 0 and ${this.nodeIdBits - 1} inclusive`,
      );
    }
    const bucketKey = nodesUtils.bucketKey(bucketIndex);
    const bucket: NodeBucket = [];
    if (sort === 'nodeId' || sort === 'distance') {
      const bucketDb = await this.db.level(bucketKey, this.nodeGraphBucketsDb);
      for await (const o of bucketDb.createReadStream({
        reverse: order === 'asc' ? false : true,
      })) {
        const nodeId = nodesUtils.parseBucketDbKey((o as any).key as Buffer);
        const data = (o as any).value as Buffer;
        const nodeData = await this.db.deserializeDecrypt<NodeData>(
          data,
          false,
        );
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
      const bucketDb = await this.db.level(bucketKey, this.nodeGraphBucketsDb);
      const lastUpdatedBucketDb = await this.db.level(
        bucketKey,
        this.nodeGraphLastUpdatedDb,
      );
      const bucketDbIterator = bucketDb.iterator();
      try {
        for await (const indexData of lastUpdatedBucketDb.createValueStream({
          reverse: order === 'asc' ? false : true,
        })) {
          const nodeIdBuffer = await this.db.deserializeDecrypt(
            indexData as Buffer,
            true,
          );
          const nodeId = IdInternal.fromBuffer<NodeId>(nodeIdBuffer);
          bucketDbIterator.seek(nodeIdBuffer);
          // @ts-ignore
          const [, bucketData] = await bucketDbIterator.next();
          const nodeData = await this.db.deserializeDecrypt<NodeData>(
            bucketData,
            false,
          );
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
  ): AsyncGenerator<[NodeBucketIndex, NodeBucket]> {
    let bucketIndex: NodeBucketIndex | undefined;
    let bucket: NodeBucket = [];
    if (sort === 'nodeId' || sort === 'distance') {
      for await (const o of this.nodeGraphBucketsDb.createReadStream({
        reverse: order === 'asc' ? false : true,
      })) {
        const { bucketIndex: bucketIndex_, nodeId } =
          nodesUtils.parseBucketsDbKey((o as any).key);
        const data = (o as any).value;
        const nodeData = await this.db.deserializeDecrypt<NodeData>(
          data,
          false,
        );
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
      const bucketsDbIterator = this.nodeGraphBucketsDb.iterator();
      try {
        for await (const key of this.nodeGraphLastUpdatedDb.createKeyStream({
          reverse: order === 'asc' ? false : true,
        })) {
          const { bucketIndex: bucketIndex_, nodeId } =
            nodesUtils.parseLastUpdatedBucketsDbKey(key as Buffer);
          bucketsDbIterator.seek(nodesUtils.bucketsDbKey(bucketIndex_, nodeId));
          // @ts-ignore
          const [, bucketData] = await bucketsDbIterator.next();
          const nodeData = await this.db.deserializeDecrypt<NodeData>(
            bucketData,
            false,
          );
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
  public async resetBuckets(nodeIdOwn: NodeId): Promise<void> {
    // Setup new space
    const spaceNew = this.space === '0' ? '1' : '0';
    const nodeGraphMetaDbDomainNew = [
      this.nodeGraphDbDomain[0],
      'meta' + spaceNew,
    ];
    const nodeGraphBucketsDbDomainNew = [
      this.nodeGraphDbDomain[0],
      'buckets' + spaceNew,
    ];
    const nodeGraphLastUpdatedDbDomainNew = [
      this.nodeGraphDbDomain[0],
      'index' + spaceNew,
    ];
    // Clear the new space (in case it wasn't cleaned properly last time)
    const nodeGraphMetaDbNew = await this.db.level(
      nodeGraphMetaDbDomainNew[1],
      this.nodeGraphDb,
    );
    const nodeGraphBucketsDbNew = await this.db.level(
      nodeGraphBucketsDbDomainNew[1],
      this.nodeGraphDb,
    );
    const nodeGraphLastUpdatedDbNew = await this.db.level(
      nodeGraphLastUpdatedDbDomainNew[1],
      this.nodeGraphDb,
    );
    await nodeGraphMetaDbNew.clear();
    await nodeGraphBucketsDbNew.clear();
    await nodeGraphLastUpdatedDbNew.clear();
    // Iterating over all entries across all buckets
    for await (const o of this.nodeGraphBucketsDb.createReadStream()) {
      // The key is a combined bucket key and node ID
      const { nodeId } = nodesUtils.parseBucketsDbKey((o as any).key as Buffer);
      // If the new own node ID is one of the existing node IDs, it is just dropped
      // We only map to the new bucket if it isn't one of the existing node IDs
      if (nodeId.equals(nodeIdOwn)) {
        continue;
      }
      const bucketIndexNew = nodesUtils.bucketIndex(nodeIdOwn, nodeId);
      const bucketKeyNew = nodesUtils.bucketKey(bucketIndexNew);
      const metaDomainNew = [...nodeGraphMetaDbDomainNew, bucketKeyNew];
      const bucketDomainNew = [...nodeGraphBucketsDbDomainNew, bucketKeyNew];
      const indexDomainNew = [...nodeGraphLastUpdatedDbDomainNew, bucketKeyNew];
      const countNew = (await this.db.get<number>(metaDomainNew, 'count')) ?? 0;
      if (countNew < this.nodeBucketLimit) {
        await this.db.put(metaDomainNew, 'count', countNew + 1);
      } else {
        const lastUpdatedBucketDbNew = await this.db.level(
          bucketKeyNew,
          nodeGraphLastUpdatedDbNew,
        );
        let oldestIndexKey: Buffer;
        let oldestNodeId: NodeId;
        for await (const key of lastUpdatedBucketDbNew.createKeyStream({
          limit: 1,
        })) {
          oldestIndexKey = key as Buffer;
          ({ nodeId: oldestNodeId } = nodesUtils.parseLastUpdatedBucketDbKey(
            key as Buffer,
          ));
        }
        await this.db.del(
          bucketDomainNew,
          nodesUtils.bucketDbKey(oldestNodeId!),
        );
        await this.db.del(indexDomainNew, oldestIndexKey!);
      }
      const data = (o as any).value as Buffer;
      const nodeData = await this.db.deserializeDecrypt<NodeData>(data, false);
      await this.db.put(
        bucketDomainNew,
        nodesUtils.bucketDbKey(nodeId),
        nodeData,
      );
      const lastUpdatedKey = nodesUtils.lastUpdatedBucketDbKey(
        nodeData.lastUpdated,
        nodeId,
      );
      await this.db.put(
        indexDomainNew,
        lastUpdatedKey,
        nodesUtils.bucketDbKey(nodeId),
        true,
      );
    }
    // Swap to the new space
    await this.db.put(this.nodeGraphDbDomain, 'space', spaceNew);
    // Clear old space
    this.nodeGraphMetaDb.clear();
    this.nodeGraphBucketsDb.clear();
    this.nodeGraphLastUpdatedDb.clear();
    // Swap the spaces
    this.space = spaceNew;
    this.nodeGraphMetaDbDomain = nodeGraphMetaDbDomainNew;
    this.nodeGraphBucketsDbDomain = nodeGraphBucketsDbDomainNew;
    this.nodeGraphLastUpdatedDbDomain = nodeGraphLastUpdatedDbDomainNew;
    this.nodeGraphMetaDb = nodeGraphMetaDbNew;
    this.nodeGraphBucketsDb = nodeGraphBucketsDbNew;
    this.nodeGraphLastUpdatedDb = nodeGraphLastUpdatedDbNew;
  }

  @ready(new nodesErrors.ErrorNodeGraphNotRunning())
  public async getBucketMeta(
    bucketIndex: NodeBucketIndex,
  ): Promise<NodeBucketMeta> {
    if (bucketIndex < 0 || bucketIndex >= this.nodeIdBits) {
      throw new nodesErrors.ErrorNodeGraphBucketIndex(
        `bucketIndex must be between 0 and ${this.nodeIdBits - 1} inclusive`,
      );
    }
    const metaDomain = [
      ...this.nodeGraphMetaDbDomain,
      nodesUtils.bucketKey(bucketIndex),
    ];
    const props = await Promise.all([this.db.get<number>(metaDomain, 'count')]);
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
  ): Promise<NodeBucketMeta[Key]> {
    if (bucketIndex < 0 || bucketIndex >= this.nodeIdBits) {
      throw new nodesErrors.ErrorNodeGraphBucketIndex(
        `bucketIndex must be between 0 and ${this.nodeIdBits - 1} inclusive`,
      );
    }
    const metaDomain = [
      ...this.nodeGraphMetaDbDomain,
      nodesUtils.bucketKey(bucketIndex),
    ];
    // Bucket meta properties have defaults
    let value;
    switch (key) {
      case 'count':
        value = (await this.db.get(metaDomain, key)) ?? 0;
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
  ): Promise<void> {
    const metaDomain = [
      ...this.nodeGraphMetaDbDomain,
      nodesUtils.bucketKey(bucketIndex),
    ];
    await this.db.put(metaDomain, key, value);
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
