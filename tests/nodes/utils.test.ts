import type { NodeId } from '@/ids/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import lexi from 'lexicographic-integer';
import { IdInternal } from '@matrixai/id';
import { DB } from '@matrixai/db';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as utils from '@/utils';
import * as testNodesUtils from './utils';

describe('nodes/utils', () => {
  const logger = new Logger(`nodes/utils test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let db: DB;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbKey = await keysUtils.generateKey();
    const dbPath = `${dataDir}/db`;
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
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('calculating bucket index from the same node ID', () => {
    const nodeId1 = IdInternal.create<NodeId>([0]);
    const nodeId2 = IdInternal.create<NodeId>([0]);
    const distance = nodesUtils.nodeDistance(nodeId1, nodeId2);
    expect(distance).toBe(0n);
    expect(() => nodesUtils.bucketIndex(nodeId1, nodeId2)).toThrow(RangeError);
  });
  test('calculating bucket index 0', () => {
    // Distance is calculated based on XOR operation
    // 1 ^ 0 == 1
    // Distance of 1 is bucket 0
    const nodeId1 = IdInternal.create<NodeId>([1]);
    const nodeId2 = IdInternal.create<NodeId>([0]);
    const distance = nodesUtils.nodeDistance(nodeId1, nodeId2);
    const bucketIndex = nodesUtils.bucketIndex(nodeId1, nodeId2);
    expect(distance).toBe(1n);
    expect(bucketIndex).toBe(0);
    // Triangle inequality 2^i <= distance < 2^(i + 1)
    expect(2 ** bucketIndex <= distance).toBe(true);
    expect(distance < 2 ** (bucketIndex + 1)).toBe(true);
  });
  test('calculating bucket index 255', () => {
    const nodeId1 = IdInternal.create<NodeId>([
      255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const nodeId2 = IdInternal.create<NodeId>([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
    ]);
    const distance = nodesUtils.nodeDistance(nodeId1, nodeId2);
    const bucketIndex = nodesUtils.bucketIndex(nodeId1, nodeId2);
    expect(bucketIndex).toBe(255);
    // Triangle inequality 2^i <= distance < 2^(i + 1)
    expect(2 ** bucketIndex <= distance).toBe(true);
    expect(distance < 2 ** (bucketIndex + 1)).toBe(true);
  });
  test('calculating bucket index randomly', () => {
    for (let i = 0; i < 1000; i++) {
      const nodeId1 = testNodesUtils.generateRandomNodeId();
      const nodeId2 = testNodesUtils.generateRandomNodeId();
      if (nodeId1.equals(nodeId2)) {
        continue;
      }
      const distance = nodesUtils.nodeDistance(nodeId1, nodeId2);
      const bucketIndex = nodesUtils.bucketIndex(nodeId1, nodeId2);
      // Triangle inequality 2^i <= distance < 2^(i + 1)
      expect(2 ** bucketIndex <= distance).toBe(true);
      expect(distance < 2 ** (bucketIndex + 1)).toBe(true);
    }
  });
  test('parse NodeGraph buckets db key', async () => {
    const bucketsDbPath = ['buckets'];
    const data: Array<{
      bucketIndex: number;
      bucketKey: string;
      nodeId: NodeId;
      key: Buffer;
    }> = [];
    for (let i = 0; i < 1000; i++) {
      const bucketIndex = Math.floor(Math.random() * (255 + 1));
      const bucketKey = nodesUtils.bucketKey(bucketIndex);
      const nodeId = testNodesUtils.generateRandomNodeId();
      data.push({
        bucketIndex,
        bucketKey,
        nodeId,
        key: Buffer.concat([Buffer.from(bucketKey), nodeId]),
      });
      await db.put(
        ['buckets', bucketKey, nodesUtils.bucketDbKey(nodeId)],
        null,
      );
    }
    // LevelDB will store keys in lexicographic order
    // Use the key property as a concatenated buffer of the bucket key and node ID
    data.sort((a, b) => Buffer.compare(a.key, b.key));
    let i = 0;

    for await (const [key] of db.iterator(bucketsDbPath)) {
      const { bucketIndex, bucketKey, nodeId } = nodesUtils.parseBucketsDbKey(
        key as Array<Buffer>,
      );
      expect(bucketIndex).toBe(data[i].bucketIndex);
      expect(bucketKey).toBe(data[i].bucketKey);
      expect(nodeId.equals(data[i].nodeId)).toBe(true);
      i++;
    }
  });
  test('parse NodeGraph lastUpdated buckets db key', async () => {
    const lastUpdatedDbPath = ['lastUpdated'];
    const data: Array<{
      bucketIndex: number;
      bucketKey: string;
      lastUpdated: number;
      nodeId: NodeId;
      key: Buffer;
    }> = [];
    for (let i = 0; i < 1000; i++) {
      const bucketIndex = Math.floor(Math.random() * (255 + 1));
      const bucketKey = lexi.pack(bucketIndex, 'hex');
      const lastUpdated = utils.getUnixtime();
      const nodeId = testNodesUtils.generateRandomNodeId();
      const nodeIdKey = nodesUtils.bucketDbKey(nodeId);
      const lastUpdatedKey = nodesUtils.lastUpdatedKey(lastUpdated);
      data.push({
        bucketIndex,
        bucketKey,
        lastUpdated,
        nodeId,
        key: Buffer.concat([Buffer.from(bucketKey), lastUpdatedKey, nodeIdKey]),
      });
      await db.put(['lastUpdated', bucketKey, lastUpdatedKey, nodeIdKey], null);
    }
    // LevelDB will store keys in lexicographic order
    // Use the key property as a concatenated buffer of
    // the bucket key and last updated and node ID
    data.sort((a, b) => Buffer.compare(a.key, b.key));
    let i = 0;
    for await (const [key] of db.iterator(lastUpdatedDbPath)) {
      const { bucketIndex, bucketKey, lastUpdated, nodeId } =
        nodesUtils.parseLastUpdatedBucketsDbKey(key as Array<Buffer>);
      expect(bucketIndex).toBe(data[i].bucketIndex);
      expect(bucketKey).toBe(data[i].bucketKey);
      expect(lastUpdated).toBe(data[i].lastUpdated);
      expect(nodeId.equals(data[i].nodeId)).toBe(true);
      i++;
    }
  });
  test('should generate random distance for a bucket', async () => {
    // Const baseNodeId = testNodesUtils.generateRandomNodeId();
    const zeroNodeId = IdInternal.fromBuffer<NodeId>(Buffer.alloc(32, 0));
    for (let i = 0; i < 255; i++) {
      const randomDistance = nodesUtils.generateRandomDistanceForBucket(i);
      expect(nodesUtils.bucketIndex(zeroNodeId, randomDistance)).toEqual(i);
    }
  });
  test('should generate random NodeId for a bucket', async () => {
    const baseNodeId = testNodesUtils.generateRandomNodeId();
    for (let i = 0; i < 255; i++) {
      const randomDistance = nodesUtils.generateRandomNodeIdForBucket(
        baseNodeId,
        i,
      );
      expect(nodesUtils.bucketIndex(baseNodeId, randomDistance)).toEqual(i);
    }
  });
});
