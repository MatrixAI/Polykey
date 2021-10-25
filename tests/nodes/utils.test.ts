import type { NodeId } from '@/nodes/types';
import * as nodesUtils from '@/nodes/utils';
import { isNodeId, makeNodeId } from '@/nodes/utils';

describe('Nodes utils', () => {
  test('basic distance calculation', async () => {
    const nodeId1 = 'ABC' as NodeId;
    const nodeId2 = 'xyz' as NodeId;
    const distance = nodesUtils.calculateDistance(nodeId1, nodeId2);
    expect(distance).toEqual(BigInt(3750713));
  });
  test('distance calculation for 44-character IDs', async () => {
    const nodeId1 = 'IY2M0YTI5YzdhMTUzNGFjYWIxNmNiNGNmNTFiYTBjYTg' as NodeId;
    const nodeId2 = 'YmY3NWM1ZThlZGE4YzlkYWFmN2NiMDNmY2RhYmFlMjEw' as NodeId;
    const distance = nodesUtils.calculateDistance(nodeId1, nodeId2);
    expect(distance).toStrictEqual(
      580712603552615871254922938026366898746236474117994508453962323311549813305031406163541800824496528232720n,
    );
  });
  test('distance calculation with ASCII character', async () => {
    const nodeId1 = 'KCquL2Z/nAr15YGloJe4nP6qKtcLnQiIBkU9GQVDZE8=' as NodeId;
    const nodeId2 = 'ËCquL2Z/nAr15YGloJe4nP6qKtcLnQiIBkU9GQVDZE8=' as NodeId;
    const distance = nodesUtils.calculateDistance(nodeId1, nodeId2);
    expect(distance).toStrictEqual(
      4586997231980143023221641790604173881593129978336562247475177678773845752176969616140037106220251373109248n,
    );
  });
  test('calculates correct first bucket (bucket 0)', async () => {
    // "1" XOR "0" = distance of 1
    // Therefore, bucket 0
    const nodeId1 = '1' as NodeId;
    const nodeId2 = '0' as NodeId;
    const bucketIndex = nodesUtils.calculateBucketIndex(nodeId1, nodeId2, 352);
    expect(bucketIndex).toBe(0);
  });
  test('calculates correct arbitrary bucket (bucket 59)', async () => {
    // "1" XOR "0" = distance of 1
    // Therefore, bucket 0
    const nodeId1 = 'A' as NodeId;
    const nodeId2 = 'NODEID01' as NodeId;
    const bucketIndex = nodesUtils.calculateBucketIndex(nodeId1, nodeId2, 352);
    expect(bucketIndex).toBe(59);
  });
  test('calculates correct last bucket (bucket 351)', async () => {
    // NodeId1 XOR nodeID2 = distance between 2^351 and 2^352
    // Therefore, bucket 351 (last possible bucket)
    const nodeId1 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as NodeId;
    const nodeId2 = 'ÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿ' as NodeId;
    const bucketIndex = nodesUtils.calculateBucketIndex(nodeId1, nodeId2, 352);
    expect(bucketIndex).toBe(351);
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
