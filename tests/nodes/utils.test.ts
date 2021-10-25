import type { NodeId } from '@/nodes/types';
import * as nodesUtils from '@/nodes/utils';
import { isNodeId, makeNodeId } from '@/nodes/utils';
import { toMultibase } from '@/GenericIdTypes';

describe('Nodes utils', () => {
  test('basic distance calculation', async () => {
    const nodeId1 = makeNodeId(new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 5
    ]));
    const nodeId2 = makeNodeId(new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 4, 0, 0, 23, 0,
      0, 0, 0, 0, 0, 0, 0, 1
    ]));
    const distance = nodesUtils.calculateDistance(nodeId1, nodeId2);
    expect(distance).toEqual(316912758671486456376015716356n);
  });
  test('calculates correct first bucket (bucket 0)', async () => {
    // "1" XOR "0" = distance of 1
    // Therefore, bucket 0
    const nodeId1 = makeNodeId(new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 1
    ]));
    const nodeId2 = makeNodeId(new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0
    ]));
    const bucketIndex = nodesUtils.calculateBucketIndex(nodeId1, nodeId2, 256);
    expect(bucketIndex).toBe(0);
  });
  test('calculates correct arbitrary bucket (bucket 63)', async () => {
    const nodeId1 = makeNodeId(new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      255, 0, 0, 0, 0, 0, 0, 0
    ]));
    const nodeId2 = makeNodeId(new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0
    ]));
    const bucketIndex = nodesUtils.calculateBucketIndex(nodeId1, nodeId2, 256);
    expect(bucketIndex).toBe(63);
  });
  test('calculates correct last bucket (bucket 255)', async () => {
    const nodeId1 = makeNodeId(new Uint8Array([
      255, 255, 255, 255, 255, 255, 255, 255,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0
    ]));
    const nodeId2 = makeNodeId(new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0
    ]));
    const bucketIndex = nodesUtils.calculateBucketIndex(nodeId1, nodeId2, 256);
    expect(bucketIndex).toBe(255);
  });
  test('testing type guard.', async () => {
    const invalidNodeId = 'invalid!!';
    const validNodeIdString = 'vh3jik6l5ntqj9er9t3n1330e46pmh27btroh3b8hsc5i9qt71di0';
    const validNodeId = validNodeIdString as NodeId;
    expect(isNodeId(validNodeIdString)).toBeTruthy();
    expect(isNodeId(makeNodeId(validNodeIdString))).toBeTruthy();
    expect(isNodeId(validNodeId)).toBeTruthy();
    expect(isNodeId(invalidNodeId)).toBeFalsy();
    expect(isNodeId(invalidNodeId as NodeId)).toBeFalsy();
    // Expect(makeNodeId(invalidNodeId)).toThrow();
  });
});
