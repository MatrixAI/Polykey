import type {
  NodeId,
  NodeData,
  NodeAddress,
  NodeBucket,
  NodeBucketIndex,
} from '@/nodes/types';
import type { Host, Hostname, Port } from '@/network/types';
import type { Key } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import { testProp, fc } from '@fast-check/jest';
import NodeGraph from '@/nodes/NodeGraph';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as nodesErrors from '@/nodes/errors';
import * as utils from '@/utils';
import * as testNodesUtils from './utils';

describe(`${NodeGraph.name} test`, () => {
  const password = 'password';
  const logger = new Logger(`${NodeGraph.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let keyRing: KeyRing;
  let dbKey: Buffer;
  let dbPath: string;
  let db: DB;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    dbKey = keysUtils.generateKey();
    dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
  });
  afterEach(async () => {
    await db.stop();
    await db.destroy();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('get, set and unset node IDs', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    let nodeId1: NodeId;
    do {
      nodeId1 = testNodesUtils.generateRandomNodeId();
    } while (nodeId1.equals(keyRing.getNodeId()));
    let nodeId2: NodeId;
    do {
      nodeId2 = testNodesUtils.generateRandomNodeId();
    } while (nodeId2.equals(keyRing.getNodeId()));
    const now = utils.getUnixtime();
    await nodeGraph.setNode(
      nodeId1,
      {
        host: '10.0.0.1' as Host,
        port: 1234 as Port,
        scopes: ['local']
      },
      now - 100
    );
    const nodeData1 = await nodeGraph.getNode(nodeId1);
    expect(nodeData1).toStrictEqual({
      address: {
        host: '10.0.0.1',
        port: 1234,
        scopes: ['local']
      },
      lastUpdated: expect.any(Number),
    });
    await nodeGraph.setNode(
      nodeId2,
      {
        host: 'abc.com' as Hostname,
        port: 8978 as Port,
        scopes: ['global']
      },
      now
    );
    const nodeData2 = await nodeGraph.getNode(nodeId2);
    expect(nodeData2).toStrictEqual({
      address: {
        host: 'abc.com',
        port: 8978,
        scopes: ['global']
      },
      lastUpdated: expect.any(Number),
    });
    expect(nodeData2!.lastUpdated > nodeData1!.lastUpdated).toBe(true);
    const nodes = await utils.asyncIterableArray(nodeGraph.getNodes());
    expect(nodes).toHaveLength(2);
    expect(nodes).toContainEqual([
      nodeId1,
      {
        address: {
          host: '10.0.0.1',
          port: 1234,
          scopes: ['local']
        },
        lastUpdated: expect.any(Number),
      },
    ]);
    expect(nodes).toContainEqual([
      nodeId2,
      {
        address: {
          host: 'abc.com',
          port: 8978,
          scopes: ['global']
        },
        lastUpdated: expect.any(Number),
      },
    ]);
    await nodeGraph.unsetNode(nodeId1);
    expect(await nodeGraph.getNode(nodeId1)).toBeUndefined();
    expect(await utils.asyncIterableArray(nodeGraph.getNodes())).toStrictEqual([
      [
        nodeId2,
        {
          address: {
            host: 'abc.com',
            port: 8978,
            scopes: ['global']
          },
          lastUpdated: expect.any(Number),
        },
      ],
    ]);
    await nodeGraph.unsetNode(nodeId2);
    await nodeGraph.stop();
  });
  test('get all nodes', async () => {
    const nodeBucketLimit = 25;
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
      nodeBucketLimit,
    });
    let nodeIds = Array.from({ length: nodeBucketLimit }, () => {
      return testNodesUtils.generateRandomNodeId();
    });
    nodeIds = nodeIds.filter((nodeId) => !nodeId.equals(keyRing.getNodeId()));
    const lastUpdatedNow = utils.getUnixtime();
    const lastUpdatedTimes = Array.from({ length: nodeBucketLimit }, (_, i) => {
      return lastUpdatedNow - i * 100;
    });
    let bucketIndexes: Array<NodeBucketIndex>;
    let nodes: NodeBucket;
    nodes = await utils.asyncIterableArray(nodeGraph.getNodes());
    expect(nodes).toHaveLength(0);
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      const lastUpdated = lastUpdatedTimes[i];
      await nodeGraph.setNode(
        nodeId,
        {
          host: '127.0.0.1' as Host,
          port: 55555 as Port,
          scopes: ['local']
        },
        lastUpdated
      );
    }
    nodes = await utils.asyncIterableArray(nodeGraph.getNodes());
    expect(nodes).toHaveLength(25);
    // Sorted by bucket indexes ascending
    bucketIndexes = nodes.map(([nodeId]) =>
      nodesUtils.bucketIndex(keyRing.getNodeId(), nodeId),
    );
    expect(
      bucketIndexes.slice(1).every((bucketIndex, i) => {
        return bucketIndexes[i] <= bucketIndex;
      }),
    ).toBe(true);
    // Sorted by bucket indexes ascending explicitly
    nodes = await utils.asyncIterableArray(nodeGraph.getNodes('asc'));
    bucketIndexes = nodes.map(([nodeId]) =>
      nodesUtils.bucketIndex(keyRing.getNodeId(), nodeId),
    );
    expect(
      bucketIndexes.slice(1).every((bucketIndex, i) => {
        return bucketIndexes[i] <= bucketIndex;
      }),
    ).toBe(true);
    nodes = await utils.asyncIterableArray(nodeGraph.getNodes('desc'));
    expect(nodes).toHaveLength(25);
    // Sorted by bucket indexes descending
    bucketIndexes = nodes.map(([nodeId]) =>
      nodesUtils.bucketIndex(keyRing.getNodeId(), nodeId),
    );
    expect(
      bucketIndexes.slice(1).every((bucketIndex, i) => {
        return bucketIndexes[i] >= bucketIndex;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
  test('setting same node ID throws error', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    await expect(
      nodeGraph.setNode(keyRing.getNodeId(), {
        host: '127.0.0.1',
        port: 55555,
      } as NodeAddress),
    ).rejects.toThrow(nodesErrors.ErrorNodeGraphSameNodeId);
    await nodeGraph.stop();
  });
  test('get bucket with 1 node', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    let nodeId: NodeId;
    do {
      nodeId = testNodesUtils.generateRandomNodeId();
    } while (nodeId.equals(keyRing.getNodeId()));
    // Set one node
    await nodeGraph.setNode(nodeId, {
      host: '127.0.0.1',
      port: 55555,
    } as NodeAddress);
    const bucketIndex = nodesUtils.bucketIndex(keyRing.getNodeId(), nodeId);
    const bucket = await nodeGraph.getBucket(bucketIndex);
    expect(bucket).toHaveLength(1);
    expect(bucket[0]).toStrictEqual([
      nodeId,
      {
        address: {
          host: '127.0.0.1',
          port: 55555,
        },
        lastUpdated: expect.any(Number),
      },
    ]);
    expect(await nodeGraph.getBucketMeta(bucketIndex)).toStrictEqual({
      count: 1,
    });
    // Adjacent bucket should be empty
    let bucketIndex_: number;
    if (bucketIndex >= nodeId.length * 8 - 1) {
      bucketIndex_ = bucketIndex - 1;
    } else if (bucketIndex === 0) {
      bucketIndex_ = bucketIndex + 1;
    } else {
      bucketIndex_ = bucketIndex + 1;
    }
    expect(await nodeGraph.getBucket(bucketIndex_)).toHaveLength(0);
    expect(await nodeGraph.getBucketMeta(bucketIndex_)).toStrictEqual({
      count: 0,
    });
    await nodeGraph.stop();
  });
  test('get bucket with multiple nodes', async () => {
    const nodeBucketLimit = 25;
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
      nodeBucketLimit
    });
    // Contiguous node IDs starting from 0
    let nodeIds = Array.from({ length: nodeBucketLimit }, (_, i) =>
      IdInternal.create<NodeId>(
        utils.bigInt2Bytes(BigInt(i), keyRing.getNodeId().byteLength),
      ),
    );
    nodeIds = nodeIds.filter((nodeId) => !nodeId.equals(keyRing.getNodeId()));
    const lastUpdatedNow = utils.getUnixtime();
    const lastUpdatedTimes = Array.from({ length: nodeBucketLimit }, (_, i) => {
      return lastUpdatedNow - i * 100;
    });
    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      const lastUpdated = lastUpdatedTimes[i];
      await nodeGraph.setNode(
        nodeId,
        {
          host: '127.0.0.1' as Host,
          port: 55555 as Port,
          scopes: [],
        },
        lastUpdated
      );
    }
    // Setting one more node would trigger the bucket limit error
    const nodeIdExtra = IdInternal.create<NodeId>(
      utils.bigInt2Bytes(BigInt(nodeBucketLimit), keyRing.getNodeId().byteLength),
    );
    await expect(nodeGraph.setNode(
      nodeIdExtra,
      {
        host: '127.0.0.1' as Host,
        port: 55555 as Port,
        scopes: []
      },
    )).rejects.toThrow(nodesErrors.ErrorNodeGraphBucketLimit);
    // Use first and last buckets because node IDs may be split between buckets
    const bucketIndexFirst = nodesUtils.bucketIndex(
      keyRing.getNodeId(),
      nodeIds[0],
    );
    const bucketIndexLast = nodesUtils.bucketIndex(
      keyRing.getNodeId(),
      nodeIds[nodeIds.length - 1],
    );
    const bucketFirst = await nodeGraph.getBucket(bucketIndexFirst);
    const bucketLast = await nodeGraph.getBucket(bucketIndexLast);
    let bucket: NodeBucket;
    let bucketIndex: NodeBucketIndex;
    if (bucketFirst.length >= bucketLast.length) {
      bucket = bucketFirst;
      bucketIndex = bucketIndexFirst;
    } else {
      bucket = bucketLast;
      bucketIndex = bucketIndexLast;
    }
    expect(bucket.length > 1).toBe(true);
    let bucketNodeIds = bucket.map(([nodeId]) => nodeId);
    // The node IDs must be sorted lexicographically
    expect(
      bucketNodeIds.slice(1).every((nodeId, i) => {
        return Buffer.compare(bucketNodeIds[i], nodeId) < 1;
      }),
    ).toBe(true);
    // Sort by node ID asc
    bucket = await nodeGraph.getBucket(bucketIndex, 'nodeId', 'asc');
    bucketNodeIds = bucket.map(([nodeId]) => nodeId);
    expect(
      bucketNodeIds.slice(1).every((nodeId, i) => {
        return Buffer.compare(bucketNodeIds[i], nodeId) < 0;
      }),
    ).toBe(true);
    // Sort by node ID desc
    bucket = await nodeGraph.getBucket(bucketIndex, 'nodeId', 'desc');
    bucketNodeIds = bucket.map(([nodeId]) => nodeId);
    expect(
      bucketNodeIds.slice(1).every((nodeId, i) => {
        return Buffer.compare(bucketNodeIds[i], nodeId) > 0;
      }),
    ).toBe(true);
    // Sort by distance asc
    bucket = await nodeGraph.getBucket(bucketIndex, 'distance', 'asc');
    let bucketDistances = bucket.map(([nodeId]) =>
      nodesUtils.nodeDistance(keyRing.getNodeId(), nodeId),
    );
    expect(
      bucketDistances.slice(1).every((distance, i) => {
        return bucketDistances[i] <= distance;
      }),
    ).toBe(true);
    // Sort by distance desc
    bucket = await nodeGraph.getBucket(bucketIndex, 'distance', 'desc');
    bucketDistances = bucket.map(([nodeId]) =>
      nodesUtils.nodeDistance(keyRing.getNodeId(), nodeId),
    );
    expect(
      bucketDistances.slice(1).every((distance, i) => {
        return bucketDistances[i] >= distance;
      }),
    ).toBe(true);
    // Sort by lastUpdated asc
    bucket = await nodeGraph.getBucket(bucketIndex, 'lastUpdated', 'asc');
    let bucketLastUpdated = bucket.map(([, nodeData]) => nodeData.lastUpdated);
    expect(
      bucketLastUpdated.slice(1).every((lastUpdated, i) => {
        return bucketLastUpdated[i] <= lastUpdated;
      }),
    ).toBe(true);
    bucket = await nodeGraph.getBucket(bucketIndex, 'lastUpdated', 'desc');
    bucketLastUpdated = bucket.map(([, nodeData]) => nodeData.lastUpdated);
    expect(
      bucketLastUpdated.slice(1).every((lastUpdated, i) => {
        return bucketLastUpdated[i] >= lastUpdated;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
  test('get all buckets', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    const now = utils.getUnixtime();
    for (let i = 0; i < 50; i++) {
      try {
        await nodeGraph.setNode(
          testNodesUtils.generateRandomNodeId(),
          {
            host: '127.0.0.1' as Host,
            port: utils.getRandomInt(0, 2 ** 16) as Port,
            scopes: ['local']
          },
          testNodesUtils.generateRandomUnixtime(),
        );
      } catch (e) {
        // 50% of all randomly generate NodeIds will be in the farthest bucket
        // So there is a high chance of this exception, just skip it
        if (e instanceof nodesErrors.ErrorNodeGraphBucketLimit) {
          continue;
        }
        throw e;
      }
    }
    let bucketIndex_ = -1;
    // Ascending order
    for await (const [bucketIndex, bucket] of nodeGraph.getBuckets(
      'nodeId',
      'asc',
    )) {
      expect(bucketIndex > bucketIndex_).toBe(true);
      bucketIndex_ = bucketIndex;
      expect(bucket.length > 0).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyRing.getNodeId(), nodeId)).toBe(
          bucketIndex,
        );
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
      const bucketNodeIds = bucket.map(([nodeId]) => nodeId);
      expect(
        bucketNodeIds.slice(1).every((nodeId, i) => {
          return Buffer.compare(bucketNodeIds[i], nodeId) < 0;
        }),
      ).toBe(true);
    }
    // There must have been at least 1 bucket
    expect(bucketIndex_).not.toBe(-1);
    // Descending order
    bucketIndex_ = keyRing.getNodeId().length * 8;
    for await (const [bucketIndex, bucket] of nodeGraph.getBuckets(
      'nodeId',
      'desc',
    )) {
      expect(bucketIndex < bucketIndex_).toBe(true);
      bucketIndex_ = bucketIndex;
      expect(bucket.length > 0).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyRing.getNodeId(), nodeId)).toBe(
          bucketIndex,
        );
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
      const bucketNodeIds = bucket.map(([nodeId]) => nodeId);
      expect(
        bucketNodeIds.slice(1).every((nodeId, i) => {
          return Buffer.compare(bucketNodeIds[i], nodeId) > 0;
        }),
      ).toBe(true);
    }
    expect(bucketIndex_).not.toBe(keyRing.getNodeId().length * 8);
    // Distance ascending order
    // Lower distance buckets first
    bucketIndex_ = -1;
    for await (const [bucketIndex, bucket] of nodeGraph.getBuckets(
      'distance',
      'asc',
    )) {
      expect(bucketIndex > bucketIndex_).toBe(true);
      bucketIndex_ = bucketIndex;
      expect(bucket.length > 0).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyRing.getNodeId(), nodeId)).toBe(
          bucketIndex,
        );
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
      const bucketDistances = bucket.map(([nodeId]) =>
        nodesUtils.nodeDistance(keyRing.getNodeId(), nodeId),
      );
      // It's the LAST bucket that fails this
      expect(
        bucketDistances.slice(1).every((distance, i) => {
          return bucketDistances[i] <= distance;
        }),
      ).toBe(true);
    }
    // Distance descending order
    // Higher distance buckets first
    bucketIndex_ = keyRing.getNodeId().length * 8;
    for await (const [bucketIndex, bucket] of nodeGraph.getBuckets(
      'distance',
      'desc',
    )) {
      expect(bucketIndex < bucketIndex_).toBe(true);
      bucketIndex_ = bucketIndex;
      expect(bucket.length > 0).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyRing.getNodeId(), nodeId)).toBe(
          bucketIndex,
        );
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
      const bucketDistances = bucket.map(([nodeId]) =>
        nodesUtils.nodeDistance(keyRing.getNodeId(), nodeId),
      );
      expect(
        bucketDistances.slice(1).every((distance, i) => {
          return bucketDistances[i] >= distance;
        }),
      ).toBe(true);
    }
    // Last updated ascending order
    // Bucket index is ascending
    bucketIndex_ = -1;
    for await (const [bucketIndex, bucket] of nodeGraph.getBuckets(
      'lastUpdated',
      'asc',
    )) {
      expect(bucketIndex > bucketIndex_).toBe(true);
      bucketIndex_ = bucketIndex;
      expect(bucket.length > 0).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyRing.getNodeId(), nodeId)).toBe(
          bucketIndex,
        );
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
      const bucketLastUpdated = bucket.map(
        ([, nodeData]) => nodeData.lastUpdated,
      );
      expect(
        bucketLastUpdated.slice(1).every((lastUpdated, i) => {
          return bucketLastUpdated[i] <= lastUpdated;
        }),
      ).toBe(true);
    }
    // Last updated descending order
    // Bucket index is descending
    bucketIndex_ = keyRing.getNodeId().length * 8;
    for await (const [bucketIndex, bucket] of nodeGraph.getBuckets(
      'lastUpdated',
      'desc',
    )) {
      expect(bucketIndex < bucketIndex_).toBe(true);
      bucketIndex_ = bucketIndex;
      expect(bucket.length > 0).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyRing.getNodeId(), nodeId)).toBe(
          bucketIndex,
        );
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
      const bucketLastUpdated = bucket.map(
        ([, nodeData]) => nodeData.lastUpdated,
      );
      expect(
        bucketLastUpdated.slice(1).every((lastUpdated, i) => {
          return bucketLastUpdated[i] >= lastUpdated;
        }),
      ).toBe(true);
    }
    await nodeGraph.stop();
  });
  testProp(
    'reset buckets',
    [testNodesUtils.uniqueNodeIdArb(3), testNodesUtils.nodeIdArrayArb(100)],
    async (nodeIds, initialNodes) => {
      const getNodeIdMock = jest.fn();
      const dummyKeyRing = {
        getNodeId: getNodeIdMock,
      } as unknown as KeyRing;
      getNodeIdMock.mockImplementation(() => nodeIds[0]);
      // If the bucket limit is 100, then even if all the random node IDs
      // are put into 1 bucket, it will still work
      const nodeGraph = await NodeGraph.createNodeGraph({
        db,
        keyRing: dummyKeyRing,
        nodeBucketLimit: 100,
        logger,
      });
      for (const nodeId of initialNodes) {
        await nodeGraph.setNode(
          nodeId,
          {
            host: '127.0.0.1' as Host,
            port: utils.getRandomInt(0, 2 ** 16) as Port,
            scopes: ['local']
          }
        );
      }
      const buckets0 = await utils.asyncIterableArray(nodeGraph.getBuckets());
      // Reset the buckets according to the new node ID
      // Note that this should normally be only executed when the key manager NodeID changes
      // This means methods that use the KeyRing's node ID cannot be used here in this test
      getNodeIdMock.mockImplementation(() => nodeIds[1]);
      const nodeIdNew1 = nodeIds[1];
      await nodeGraph.resetBuckets(nodeIdNew1);
      const buckets1 = await utils.asyncIterableArray(nodeGraph.getBuckets());
      expect(buckets1.length > 0).toBe(true);
      for (const [bucketIndex, bucket] of buckets1) {
        expect(bucket.length > 0).toBe(true);
        for (const [nodeId, nodeData] of bucket) {
          expect(nodeId.byteLength).toBe(32);
          expect(nodesUtils.bucketIndex(nodeIdNew1, nodeId)).toBe(bucketIndex);
          expect(nodeData.address.host).toBe('127.0.0.1');
          // Port of 0 is not allowed
          expect(nodeData.address.port > 0).toBe(true);
          expect(nodeData.address.port < 2 ** 16).toBe(true);
        }
      }
      expect(buckets1).not.toStrictEqual(buckets0);
      // Resetting again should change the space
      getNodeIdMock.mockImplementation(() => nodeIds[2]);
      const nodeIdNew2 = nodeIds[2];
      await nodeGraph.resetBuckets(nodeIdNew2);
      const buckets2 = await utils.asyncIterableArray(nodeGraph.getBuckets());
      expect(buckets2.length > 0).toBe(true);
      for (const [bucketIndex, bucket] of buckets2) {
        expect(bucket.length > 0).toBe(true);
        for (const [nodeId, nodeData] of bucket) {
          expect(nodeId.byteLength).toBe(32);
          expect(nodesUtils.bucketIndex(nodeIdNew2, nodeId)).toBe(bucketIndex);
          expect(nodeData.address.host).toBe('127.0.0.1');
          // Port of 0 is not allowed
          expect(nodeData.address.port > 0).toBe(true);
          expect(nodeData.address.port < 2 ** 16).toBe(true);
        }
      }
      expect(buckets2).not.toStrictEqual(buckets1);
      // Resetting to the same NodeId results in the same bucket structure
      await nodeGraph.resetBuckets(nodeIdNew2);
      const buckets3 = await utils.asyncIterableArray(nodeGraph.getBuckets());
      expect(buckets3).toStrictEqual(buckets2);
      // Resetting to an existing NodeId
      const nodeIdExisting = buckets3[0][1][0][0];
      let nodeIdExistingFound = false;
      await nodeGraph.resetBuckets(nodeIdExisting);
      const buckets4 = await utils.asyncIterableArray(nodeGraph.getBuckets());
      expect(buckets4.length > 0).toBe(true);
      for (const [bucketIndex, bucket] of buckets4) {
        expect(bucket.length > 0).toBe(true);
        for (const [nodeId, nodeData] of bucket) {
          if (nodeId.equals(nodeIdExisting)) {
            nodeIdExistingFound = true;
          }
          expect(nodeId.byteLength).toBe(32);
          expect(nodesUtils.bucketIndex(nodeIdExisting, nodeId)).toBe(
            bucketIndex,
          );
          expect(nodeData.address.host).toBe('127.0.0.1');
          // Port of 0 is not allowed
          expect(nodeData.address.port > 0).toBe(true);
          expect(nodeData.address.port < 2 ** 16).toBe(true);
        }
      }
      expect(buckets4).not.toStrictEqual(buckets3);
      // The existing node ID should not be put into the NodeGraph
      expect(nodeIdExistingFound).toBe(false);
      await nodeGraph.stop();
    },
    { numRuns: 1 },
  );
  testProp(
    'reset buckets should re-order the buckets',
    [testNodesUtils.uniqueNodeIdArb(2)],
    async (nodeIds) => {
      const getNodeIdMock = jest.fn();
      const dummyKeyRing = {
        getNodeId: getNodeIdMock,
      } as unknown as KeyRing;
      getNodeIdMock.mockImplementation(() => nodeIds[0]);
      const nodeGraph = await NodeGraph.createNodeGraph({
        db,
        keyRing: dummyKeyRing,
        fresh: true,
        logger,
      });
      for (let i = 1; i < 255 / 25; i += 50) {
        const nodeId = nodesUtils.generateRandomNodeIdForBucket(nodeIds[0], i);
        await nodeGraph.setNode(nodeId, {
          host: '127.0.0.1',
          port: utils.getRandomInt(0, 2 ** 16),
        } as NodeAddress);
      }
      const buckets0 = await utils.asyncIterableArray(nodeGraph.getBuckets());
      // Reset the buckets according to the new node ID
      // Note that this should normally be only executed when the key manager NodeID changes
      // This means methods that use the KeyRing's node ID cannot be used here in this test
      getNodeIdMock.mockImplementation(() => nodeIds[1]);
      const nodeIdNew1 = nodeIds[1];
      await nodeGraph.resetBuckets(nodeIdNew1);
      const buckets1 = await utils.asyncIterableArray(nodeGraph.getBuckets());
      expect(buckets1).not.toStrictEqual(buckets0);
      await nodeGraph.stop();
    },
    { numRuns: 20 },
  );
  testProp(
    'reset buckets should not corrupt data',
    [testNodesUtils.uniqueNodeIdArb(2), testNodesUtils.nodeIdArrayArb(10)],
    async (nodeIds, initialNodes) => {
      const getNodeIdMock = jest.fn();
      const dummyKeyRing = {
        getNodeId: getNodeIdMock,
      } as unknown as KeyRing;
      getNodeIdMock.mockImplementation(() => nodeIds[0]);
      const nodeGraph = await NodeGraph.createNodeGraph({
        db,
        keyRing: dummyKeyRing,
        fresh: true,
        logger,
      });
      const nodeAddresses: Map<string, NodeAddress> = new Map();
      for (const nodeId of initialNodes) {
        const nodeAddress = {
          host: '127.0.0.1',
          port: utils.getRandomInt(0, 2 ** 16),
        } as NodeAddress;
        await nodeGraph.setNode(nodeId, nodeAddress);
        nodeAddresses.set(nodeId.toString(), nodeAddress);
      }
      // Reset the buckets according to the new node ID
      // Note that this should normally be only executed when the key manager NodeID changes
      // This means methods that use the KeyRing's node ID cannot be used here in this test
      getNodeIdMock.mockImplementation(() => nodeIds[1]);
      const nodeIdNew1 = nodeIds[1];
      await nodeGraph.resetBuckets(nodeIdNew1);
      const buckets1 = await utils.asyncIterableArray(nodeGraph.getBuckets());
      expect(buckets1.length > 0).toBe(true);
      for (const [bucketIndex, bucket] of buckets1) {
        expect(bucket.length > 0).toBe(true);
        for (const [nodeId, nodeData] of bucket) {
          expect(nodeId.byteLength).toBe(32);
          expect(nodesUtils.bucketIndex(nodeIdNew1, nodeId)).toBe(bucketIndex);
          expect(nodeData.address.host).toBe('127.0.0.1');
          expect(nodeAddresses.get(nodeId.toString())).toBeDefined();
          expect(nodeAddresses.get(nodeId.toString())?.port).toBe(
            nodeData.address.port,
          );
        }
      }
      await nodeGraph.stop();
    },
    { numRuns: 20 },
  );
  testProp(
    'reset buckets to an existing node should remove node',
    [
      testNodesUtils.nodeIdArb,
      testNodesUtils.nodeIdArrayArb(20),
      fc.integer({ min: 0, max: 19 }),
    ],
    async (nodeId, initialNodes, nodeIndex) => {
      const getNodeIdMock = jest.fn();
      const dummyKeyRing = {
        getNodeId: getNodeIdMock,
      } as unknown as KeyRing;
      getNodeIdMock.mockImplementation(() => nodeId);
      const nodeGraph = await NodeGraph.createNodeGraph({
        db,
        keyRing: dummyKeyRing,
        nodeBucketLimit: 20,
        logger,
        fresh: true
      });
      for (const nodeId of initialNodes) {
        await nodeGraph.setNode(
          nodeId,
          {
            host: '127.0.0.1' as Host,
            port: utils.getRandomInt(0, 2 ** 16) as Port,
            scopes: ['local']
          },
        );
      }
      // Reset the buckets according to the new node ID
      // Note that this should normally be only executed when the key manager NodeID changes
      // This means methods that use the KeyRing's node ID cannot be used here in this test
      getNodeIdMock.mockImplementation(() => initialNodes[nodeIndex]);
      const nodeIdNew1 = initialNodes[nodeIndex];
      await nodeGraph.resetBuckets(nodeIdNew1);
      const buckets1 = await utils.asyncIterableArray(nodeGraph.getBuckets());
      expect(buckets1.length > 0).toBe(true);
      for (const [, bucket] of buckets1) {
        expect(bucket.length > 0).toBe(true);
        for (const [nodeId] of bucket) {
          // The new node should not be in the graph
          expect(nodeIdNew1.equals(nodeId)).toBeFalse();
        }
      }
      await nodeGraph.stop();
    },
    {
      numRuns: 15,
    },
  );
  test('reset buckets is persistent', async () => {
    const nodeBucketLimit = 100;
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      nodeBucketLimit,
      logger,
    });
    const now = utils.getUnixtime();
    for (let i = 0; i < nodeBucketLimit; i++) {
      await nodeGraph.setNode(testNodesUtils.generateRandomNodeId(), {
        host: '127.0.0.1' as Host,
        port: utils.getRandomInt(0, 2 ** 16) as Port,
        scopes: ['local']
      });
    }
    const nodeIdNew1 = testNodesUtils.generateRandomNodeId();
    await nodeGraph.resetBuckets(nodeIdNew1);
    await nodeGraph.stop();
    await nodeGraph.start();
    const buckets1 = await utils.asyncIterableArray(nodeGraph.getBuckets());
    expect(buckets1.length > 0).toBe(true);
    for (const [bucketIndex, bucket] of buckets1) {
      expect(bucket.length > 0).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(nodeIdNew1, nodeId)).toBe(bucketIndex);
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
    }
    const nodeIdNew2 = testNodesUtils.generateRandomNodeId();
    await nodeGraph.resetBuckets(nodeIdNew2);
    await nodeGraph.stop();
    await nodeGraph.start();
    const buckets2 = await utils.asyncIterableArray(nodeGraph.getBuckets());
    expect(buckets2.length > 0).toBe(true);
    for (const [bucketIndex, bucket] of buckets2) {
      expect(bucket.length > 0).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(nodeIdNew2, nodeId)).toBe(bucketIndex);
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
    }
    expect(buckets2).not.toStrictEqual(buckets1);
    await nodeGraph.stop();
  });
  test('get closest nodes, 40 nodes lower than target, take 20', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    const baseNodeId = keyRing.getNodeId();
    const nodeIds: NodeBucket = [];
    // Add 1 node to each bucket
    for (let i = 0; i < 40; i++) {
      const nodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        50 + i,
        i,
      );
      nodeIds.push([nodeId, {} as NodeData]);
      await nodeGraph.setNode(nodeId, {
        host: '127.0.0.1',
        port: utils.getRandomInt(0, 2 ** 16),
      } as NodeAddress);
    }
    const targetNodeId = testNodesUtils.generateNodeIdForBucket(
      baseNodeId,
      100,
      2,
    );
    const result = await nodeGraph.getClosestNodes(targetNodeId, 20);
    nodesUtils.bucketSortByDistance(nodeIds, targetNodeId);
    const a = nodeIds.map((a) => nodesUtils.encodeNodeId(a[0]));
    const b = result.map((a) => nodesUtils.encodeNodeId(a[0]));
    // Are the closest nodes out of all the nodes
    expect(a.slice(0, b.length)).toEqual(b);

    // Check that the list is strictly ascending
    const closestNodeDistances = result.map(([nodeId]) =>
      nodesUtils.nodeDistance(targetNodeId, nodeId),
    );
    expect(
      closestNodeDistances.slice(1).every((distance, i) => {
        return closestNodeDistances[i] < distance;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
  test('get closest nodes, 15 nodes lower than target, take 20', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    const baseNodeId = keyRing.getNodeId();
    const nodeIds: NodeBucket = [];
    // Add 1 node to each bucket
    for (let i = 0; i < 15; i++) {
      const nodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        50 + i,
        i,
      );
      nodeIds.push([nodeId, {} as NodeData]);
      await nodeGraph.setNode(nodeId, {
        host: '127.0.0.1',
        port: utils.getRandomInt(0, 2 ** 16),
      } as NodeAddress);
    }
    const targetNodeId = testNodesUtils.generateNodeIdForBucket(
      baseNodeId,
      100,
      2,
    );
    const result = await nodeGraph.getClosestNodes(targetNodeId);
    nodesUtils.bucketSortByDistance(nodeIds, targetNodeId);
    const a = nodeIds.map((a) => nodesUtils.encodeNodeId(a[0]));
    const b = result.map((a) => nodesUtils.encodeNodeId(a[0]));
    // Are the closest nodes out of all the nodes
    expect(a.slice(0, b.length)).toEqual(b);

    // Check that the list is strictly ascending
    const closestNodeDistances = result.map(([nodeId]) =>
      nodesUtils.nodeDistance(targetNodeId, nodeId),
    );
    expect(
      closestNodeDistances.slice(1).every((distance, i) => {
        return closestNodeDistances[i] < distance;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
  test('get closest nodes, 10 nodes lower than target, 30 nodes above,  take 20', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    const baseNodeId = keyRing.getNodeId();
    const nodeIds: NodeBucket = [];
    // Add 1 node to each bucket
    for (let i = 0; i < 40; i++) {
      const nodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        90 + i,
        i,
      );
      nodeIds.push([nodeId, {} as NodeData]);
      await nodeGraph.setNode(nodeId, {
        host: '127.0.0.1',
        port: utils.getRandomInt(0, 2 ** 16),
      } as NodeAddress);
    }
    const targetNodeId = testNodesUtils.generateNodeIdForBucket(
      baseNodeId,
      100,
      2,
    );
    const result = await nodeGraph.getClosestNodes(targetNodeId);
    nodesUtils.bucketSortByDistance(nodeIds, targetNodeId);
    const a = nodeIds.map((a) => nodesUtils.encodeNodeId(a[0]));
    const b = result.map((a) => nodesUtils.encodeNodeId(a[0]));
    // Are the closest nodes out of all the nodes
    expect(a.slice(0, b.length)).toEqual(b);

    // Check that the list is strictly ascending
    const closestNodeDistances = result.map(([nodeId]) =>
      nodesUtils.nodeDistance(targetNodeId, nodeId),
    );
    expect(
      closestNodeDistances.slice(1).every((distance, i) => {
        return closestNodeDistances[i] < distance;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
  test('get closest nodes, 10 nodes lower than target, 30 nodes above,  take 5', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    const baseNodeId = keyRing.getNodeId();
    const nodeIds: NodeBucket = [];
    // Add 1 node to each bucket
    for (let i = 0; i < 40; i++) {
      const nodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        90 + i,
        i,
      );
      nodeIds.push([nodeId, {} as NodeData]);
      await nodeGraph.setNode(nodeId, {
        host: '127.0.0.1',
        port: utils.getRandomInt(0, 2 ** 16),
      } as NodeAddress);
    }
    const targetNodeId = testNodesUtils.generateNodeIdForBucket(
      baseNodeId,
      100,
      2,
    );
    const result = await nodeGraph.getClosestNodes(targetNodeId, 5);
    nodesUtils.bucketSortByDistance(nodeIds, targetNodeId);
    const a = nodeIds.map((a) => nodesUtils.encodeNodeId(a[0]));
    const b = result.map((a) => nodesUtils.encodeNodeId(a[0]));
    // Are the closest nodes out of all the nodes
    expect(a.slice(0, b.length)).toEqual(b);

    // Check that the list is strictly ascending
    const closestNodeDistances = result.map(([nodeId]) =>
      nodesUtils.nodeDistance(targetNodeId, nodeId),
    );
    expect(
      closestNodeDistances.slice(1).every((distance, i) => {
        return closestNodeDistances[i] < distance;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
  test('get closest nodes, 5 nodes lower than target, 10 nodes above,  take 20', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    const baseNodeId = keyRing.getNodeId();
    const nodeIds: NodeBucket = [];
    // Add 1 node to each bucket
    for (let i = 0; i < 15; i++) {
      const nodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        95 + i,
        i,
      );
      nodeIds.push([nodeId, {} as NodeData]);
      await nodeGraph.setNode(nodeId, {
        host: '127.0.0.1',
        port: utils.getRandomInt(0, 2 ** 16),
      } as NodeAddress);
    }
    const targetNodeId = testNodesUtils.generateNodeIdForBucket(
      baseNodeId,
      100,
      2,
    );
    const result = await nodeGraph.getClosestNodes(targetNodeId);
    nodesUtils.bucketSortByDistance(nodeIds, targetNodeId);
    const a = nodeIds.map((a) => nodesUtils.encodeNodeId(a[0]));
    const b = result.map((a) => nodesUtils.encodeNodeId(a[0]));
    // Are the closest nodes out of all the nodes
    expect(a.slice(0, b.length)).toEqual(b);

    // Check that the list is strictly ascending
    const closestNodeDistances = result.map(([nodeId]) =>
      nodesUtils.nodeDistance(targetNodeId, nodeId),
    );
    expect(
      closestNodeDistances.slice(1).every((distance, i) => {
        return closestNodeDistances[i] < distance;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
  test('get closest nodes, 40 nodes above target,  take 20', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    const baseNodeId = keyRing.getNodeId();
    const nodeIds: NodeBucket = [];
    // Add 1 node to each bucket
    for (let i = 0; i < 40; i++) {
      const nodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        101 + i,
        i,
      );
      nodeIds.push([nodeId, {} as NodeData]);
      await nodeGraph.setNode(nodeId, {
        host: '127.0.0.1',
        port: utils.getRandomInt(0, 2 ** 16),
      } as NodeAddress);
    }
    const targetNodeId = testNodesUtils.generateNodeIdForBucket(
      baseNodeId,
      100,
      2,
    );
    const result = await nodeGraph.getClosestNodes(targetNodeId);
    nodesUtils.bucketSortByDistance(nodeIds, targetNodeId);
    const a = nodeIds.map((a) => nodesUtils.encodeNodeId(a[0]));
    const b = result.map((a) => nodesUtils.encodeNodeId(a[0]));
    // Are the closest nodes out of all the nodes
    expect(a.slice(0, b.length)).toEqual(b);

    // Check that the list is strictly ascending
    const closestNodeDistances = result.map(([nodeId]) =>
      nodesUtils.nodeDistance(targetNodeId, nodeId),
    );
    expect(
      closestNodeDistances.slice(1).every((distance, i) => {
        return closestNodeDistances[i] < distance;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
  test('get closest nodes, 15 nodes above target,  take 20', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    const baseNodeId = keyRing.getNodeId();
    const nodeIds: NodeBucket = [];
    // Add 1 node to each bucket
    for (let i = 0; i < 15; i++) {
      const nodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        101 + i,
        i,
      );
      nodeIds.push([nodeId, {} as NodeData]);
      await nodeGraph.setNode(nodeId, {
        host: '127.0.0.1',
        port: utils.getRandomInt(0, 2 ** 16),
      } as NodeAddress);
    }
    const targetNodeId = testNodesUtils.generateNodeIdForBucket(
      baseNodeId,
      100,
      2,
    );
    const result = await nodeGraph.getClosestNodes(targetNodeId);
    nodesUtils.bucketSortByDistance(nodeIds, targetNodeId);
    const a = nodeIds.map((a) => nodesUtils.encodeNodeId(a[0]));
    const b = result.map((a) => nodesUtils.encodeNodeId(a[0]));
    // Are the closest nodes out of all the nodes
    expect(a.slice(0, b.length)).toEqual(b);

    // Check that the list is strictly ascending
    const closestNodeDistances = result.map(([nodeId]) =>
      nodesUtils.nodeDistance(targetNodeId, nodeId),
    );
    expect(
      closestNodeDistances.slice(1).every((distance, i) => {
        return closestNodeDistances[i] < distance;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
  test('get closest nodes, no nodes, take 20', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    const baseNodeId = keyRing.getNodeId();
    const nodeIds: NodeBucket = [];
    const targetNodeId = testNodesUtils.generateNodeIdForBucket(
      baseNodeId,
      100,
      2,
    );
    const result = await nodeGraph.getClosestNodes(targetNodeId);
    nodesUtils.bucketSortByDistance(nodeIds, targetNodeId);
    const a = nodeIds.map((a) => nodesUtils.encodeNodeId(a[0]));
    const b = result.map((a) => nodesUtils.encodeNodeId(a[0]));
    // Are the closest nodes out of all the nodes
    expect(a.slice(0, b.length)).toEqual(b);

    // Check that the list is strictly ascending
    const closestNodeDistances = result.map(([nodeId]) =>
      nodesUtils.nodeDistance(targetNodeId, nodeId),
    );
    expect(
      closestNodeDistances.slice(1).every((distance, i) => {
        return closestNodeDistances[i] < distance;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
});
