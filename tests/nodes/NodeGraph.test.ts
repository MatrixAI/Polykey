import type {
  NodeId,
  NodeData,
  NodeAddress,
  NodeBucket,
  NodeBucketIndex,
} from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import NodeGraph from '@/nodes/NodeGraph';
import KeyManager from '@/keys/KeyManager';
import * as keysUtils from '@/keys/utils';

import * as nodesUtils from '@/nodes/utils';
import * as nodesErrors from '@/nodes/errors';
import * as utils from '@/utils';
import * as testNodesUtils from './utils';
import * as testUtils from '../utils';

describe(`${NodeGraph.name} test`, () => {
  const password = 'password';
  const logger = new Logger(`${NodeGraph.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let dataDir: string;
  let keyManager: KeyManager;
  let dbKey: Buffer;
  let dbPath: string;
  let db: DB;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    dbKey = await keysUtils.generateKey();
    dbPath = `${dataDir}/db`;
  });
  afterAll(async () => {
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  beforeEach(async () => {
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
  });
  afterEach(async () => {
    await db.stop();
    await db.destroy();
  });
  test('get, set and unset node IDs', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    let nodeId1: NodeId;
    do {
      nodeId1 = testNodesUtils.generateRandomNodeId();
    } while (nodeId1.equals(keyManager.getNodeId()));
    let nodeId2: NodeId;
    do {
      nodeId2 = testNodesUtils.generateRandomNodeId();
    } while (nodeId2.equals(keyManager.getNodeId()));

    await nodeGraph.setNode(nodeId1, {
      host: '10.0.0.1',
      port: 1234,
    } as NodeAddress);
    const nodeData1 = await nodeGraph.getNode(nodeId1);
    expect(nodeData1).toStrictEqual({
      address: {
        host: '10.0.0.1',
        port: 1234,
      },
      lastUpdated: expect.any(Number),
    });
    await utils.sleep(1000);
    await nodeGraph.setNode(nodeId2, {
      host: 'abc.com',
      port: 8978,
    } as NodeAddress);
    const nodeData2 = await nodeGraph.getNode(nodeId2);
    expect(nodeData2).toStrictEqual({
      address: {
        host: 'abc.com',
        port: 8978,
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
          },
          lastUpdated: expect.any(Number),
        },
      ],
    ]);
    await nodeGraph.unsetNode(nodeId2);
    await nodeGraph.stop();
  });
  test('get all nodes', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    let nodeIds = Array.from({ length: 25 }, () => {
      return testNodesUtils.generateRandomNodeId();
    });
    nodeIds = nodeIds.filter(
      (nodeId) => !nodeId.equals(keyManager.getNodeId()),
    );
    let bucketIndexes: Array<NodeBucketIndex>;
    let nodes: Array<[NodeId, NodeData]>;
    nodes = await utils.asyncIterableArray(nodeGraph.getNodes());
    expect(nodes).toHaveLength(0);
    for (const nodeId of nodeIds) {
      await utils.sleep(100);
      await nodeGraph.setNode(nodeId, {
        host: '127.0.0.1',
        port: 55555,
      } as NodeAddress);
    }
    nodes = await utils.asyncIterableArray(nodeGraph.getNodes());
    expect(nodes).toHaveLength(25);
    // Sorted by bucket indexes ascending
    bucketIndexes = nodes.map(([nodeId]) =>
      nodesUtils.bucketIndex(keyManager.getNodeId(), nodeId),
    );
    expect(
      bucketIndexes.slice(1).every((bucketIndex, i) => {
        return bucketIndexes[i] <= bucketIndex;
      }),
    ).toBe(true);
    // Sorted by bucket indexes ascending explicitly
    nodes = await utils.asyncIterableArray(nodeGraph.getNodes('asc'));
    bucketIndexes = nodes.map(([nodeId]) =>
      nodesUtils.bucketIndex(keyManager.getNodeId(), nodeId),
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
      nodesUtils.bucketIndex(keyManager.getNodeId(), nodeId),
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
      keyManager,
      logger,
    });
    await expect(
      nodeGraph.setNode(keyManager.getNodeId(), {
        host: '127.0.0.1',
        port: 55555,
      } as NodeAddress),
    ).rejects.toThrow(nodesErrors.ErrorNodeGraphSameNodeId);
    await nodeGraph.stop();
  });
  test('get bucket with 1 node', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    let nodeId: NodeId;
    do {
      nodeId = testNodesUtils.generateRandomNodeId();
    } while (nodeId.equals(keyManager.getNodeId()));
    // Set one node
    await nodeGraph.setNode(nodeId, {
      host: '127.0.0.1',
      port: 55555,
    } as NodeAddress);
    const bucketIndex = nodesUtils.bucketIndex(keyManager.getNodeId(), nodeId);
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
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    // Contiguous node IDs starting from 0
    let nodeIds = Array.from({ length: 25 }, (_, i) =>
      IdInternal.create<NodeId>(
        utils.bigInt2Bytes(BigInt(i), keyManager.getNodeId().byteLength),
      ),
    );
    nodeIds = nodeIds.filter(
      (nodeId) => !nodeId.equals(keyManager.getNodeId()),
    );
    for (const nodeId of nodeIds) {
      await utils.sleep(100);
      await nodeGraph.setNode(nodeId, {
        host: '127.0.0.1',
        port: 55555,
      } as NodeAddress);
    }
    // Use first and last buckets because node IDs may be split between buckets
    const bucketIndexFirst = nodesUtils.bucketIndex(
      keyManager.getNodeId(),
      nodeIds[0],
    );
    const bucketIndexLast = nodesUtils.bucketIndex(
      keyManager.getNodeId(),
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
      nodesUtils.nodeDistance(keyManager.getNodeId(), nodeId),
    );
    expect(
      bucketDistances.slice(1).every((distance, i) => {
        return bucketDistances[i] <= distance;
      }),
    ).toBe(true);
    // Sort by distance desc
    bucket = await nodeGraph.getBucket(bucketIndex, 'distance', 'desc');
    bucketDistances = bucket.map(([nodeId]) =>
      nodesUtils.nodeDistance(keyManager.getNodeId(), nodeId),
    );
    expect(
      bucketDistances.slice(1).every((distance, i) => {
        return bucketDistances[i] >= distance;
      }),
    ).toBe(true);
    // Sort by lastUpdated asc
    bucket = await nodeGraph.getBucket(bucketIndex, 'lastUpdated', 'asc');
    let bucketLastUpdateds = bucket.map(([, nodeData]) => nodeData.lastUpdated);
    expect(
      bucketLastUpdateds.slice(1).every((lastUpdated, i) => {
        return bucketLastUpdateds[i] <= lastUpdated;
      }),
    ).toBe(true);
    bucket = await nodeGraph.getBucket(bucketIndex, 'lastUpdated', 'desc');
    bucketLastUpdateds = bucket.map(([, nodeData]) => nodeData.lastUpdated);
    expect(
      bucketLastUpdateds.slice(1).every((lastUpdated, i) => {
        return bucketLastUpdateds[i] >= lastUpdated;
      }),
    ).toBe(true);
    await nodeGraph.stop();
  });
  test('get all buckets', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    const now = utils.getUnixtime();
    for (let i = 0; i < 50; i++) {
      await utils.sleep(50);
      await nodeGraph.setNode(testNodesUtils.generateRandomNodeId(), {
        host: '127.0.0.1',
        port: utils.getRandomInt(0, 2 ** 16),
      } as NodeAddress);
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
      expect(bucket.length <= nodeGraph.nodeBucketLimit).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyManager.getNodeId(), nodeId)).toBe(
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
    bucketIndex_ = keyManager.getNodeId().length * 8;
    for await (const [bucketIndex, bucket] of nodeGraph.getBuckets(
      'nodeId',
      'desc',
    )) {
      expect(bucketIndex < bucketIndex_).toBe(true);
      bucketIndex_ = bucketIndex;
      expect(bucket.length > 0).toBe(true);
      expect(bucket.length <= nodeGraph.nodeBucketLimit).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyManager.getNodeId(), nodeId)).toBe(
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
    expect(bucketIndex_).not.toBe(keyManager.getNodeId().length * 8);
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
      expect(bucket.length <= nodeGraph.nodeBucketLimit).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyManager.getNodeId(), nodeId)).toBe(
          bucketIndex,
        );
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
      const bucketDistances = bucket.map(([nodeId]) =>
        nodesUtils.nodeDistance(keyManager.getNodeId(), nodeId),
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
    bucketIndex_ = keyManager.getNodeId().length * 8;
    for await (const [bucketIndex, bucket] of nodeGraph.getBuckets(
      'distance',
      'desc',
    )) {
      expect(bucketIndex < bucketIndex_).toBe(true);
      bucketIndex_ = bucketIndex;
      expect(bucket.length > 0).toBe(true);
      expect(bucket.length <= nodeGraph.nodeBucketLimit).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyManager.getNodeId(), nodeId)).toBe(
          bucketIndex,
        );
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
      const bucketDistances = bucket.map(([nodeId]) =>
        nodesUtils.nodeDistance(keyManager.getNodeId(), nodeId),
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
      expect(bucket.length <= nodeGraph.nodeBucketLimit).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyManager.getNodeId(), nodeId)).toBe(
          bucketIndex,
        );
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
      const bucketLastUpdateds = bucket.map(
        ([, nodeData]) => nodeData.lastUpdated,
      );
      expect(
        bucketLastUpdateds.slice(1).every((lastUpdated, i) => {
          return bucketLastUpdateds[i] <= lastUpdated;
        }),
      ).toBe(true);
    }
    // Last updated descending order
    // Bucket index is descending
    bucketIndex_ = keyManager.getNodeId().length * 8;
    for await (const [bucketIndex, bucket] of nodeGraph.getBuckets(
      'lastUpdated',
      'desc',
    )) {
      expect(bucketIndex < bucketIndex_).toBe(true);
      bucketIndex_ = bucketIndex;
      expect(bucket.length > 0).toBe(true);
      expect(bucket.length <= nodeGraph.nodeBucketLimit).toBe(true);
      for (const [nodeId, nodeData] of bucket) {
        expect(nodeId.byteLength).toBe(32);
        expect(nodesUtils.bucketIndex(keyManager.getNodeId(), nodeId)).toBe(
          bucketIndex,
        );
        expect(nodeData.address.host).toBe('127.0.0.1');
        // Port of 0 is not allowed
        expect(nodeData.address.port > 0).toBe(true);
        expect(nodeData.address.port < 2 ** 16).toBe(true);
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
      const bucketLastUpdateds = bucket.map(
        ([, nodeData]) => nodeData.lastUpdated,
      );
      expect(
        bucketLastUpdateds.slice(1).every((lastUpdated, i) => {
          return bucketLastUpdateds[i] >= lastUpdated;
        }),
      ).toBe(true);
    }
    await nodeGraph.stop();
  });
  test('reset buckets', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    const now = utils.getUnixtime();
    for (let i = 0; i < 100; i++) {
      await nodeGraph.setNode(testNodesUtils.generateRandomNodeId(), {
        host: '127.0.0.1',
        port: utils.getRandomInt(0, 2 ** 16),
      } as NodeAddress);
    }
    const buckets0 = await utils.asyncIterableArray(nodeGraph.getBuckets());
    // Reset the buckets according to the new node ID
    // Note that this should normally be only executed when the key manager NodeID changes
    // This means methods that use the KeyManager's node ID cannot be used here in this test
    const nodeIdNew1 = testNodesUtils.generateRandomNodeId();
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
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
    }
    expect(buckets1).not.toStrictEqual(buckets0);
    // Resetting again should change the space
    const nodeIdNew2 = testNodesUtils.generateRandomNodeId();
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
        expect(nodeData.lastUpdated >= now).toBe(true);
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
        expect(nodeData.lastUpdated >= now).toBe(true);
      }
    }
    expect(buckets4).not.toStrictEqual(buckets3);
    // The existing node ID should not be put into the NodeGraph
    expect(nodeIdExistingFound).toBe(false);
    await nodeGraph.stop();
  });
  test('reset buckets is persistent', async () => {
    const nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    const now = utils.getUnixtime();
    for (let i = 0; i < 100; i++) {
      await nodeGraph.setNode(testNodesUtils.generateRandomNodeId(), {
        host: '127.0.0.1',
        port: utils.getRandomInt(0, 2 ** 16),
      } as NodeAddress);
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
});
