import type { NodeId } from '@/nodes/types';
import { IdInternal } from '@matrixai/id';
import * as nodesUtils from '@/nodes/utils';

describe('Nodes utils', () => {
  test('basic distance calculation', async () => {
    const nodeId1 = IdInternal.create<NodeId>([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 5,
    ]);
    const nodeId2 = IdInternal.create<NodeId>([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 23, 0,
      0, 0, 0, 0, 0, 0, 0, 1,
    ]);

    const distance = nodesUtils.calculateDistance(nodeId1, nodeId2);
    expect(distance).toEqual(316912758671486456376015716356n);
  });
  test('calculates correct first bucket (bucket 0)', async () => {
    // "1" XOR "0" = distance of 1
    // Therefore, bucket 0
    const nodeId1 = IdInternal.create<NodeId>([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1,
    ]);
    const nodeId2 = IdInternal.create<NodeId>([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
    ]);
    const bucketIndex = nodesUtils.calculateBucketIndex(nodeId1, nodeId2);
    expect(bucketIndex).toBe(0);
  });
  test('calculates correct arbitrary bucket (bucket 63)', async () => {
    const nodeId1 = IdInternal.create<NodeId>([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      255, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const nodeId2 = IdInternal.create<NodeId>([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
    ]);
    const bucketIndex = nodesUtils.calculateBucketIndex(nodeId1, nodeId2);
    expect(bucketIndex).toBe(63);
  });
  test('calculates correct last bucket (bucket 255)', async () => {
    const nodeId1 = IdInternal.create<NodeId>([
      255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const nodeId2 = IdInternal.create<NodeId>([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
    ]);
    const bucketIndex = nodesUtils.calculateBucketIndex(nodeId1, nodeId2);
    expect(bucketIndex).toBe(255);
  });
});
