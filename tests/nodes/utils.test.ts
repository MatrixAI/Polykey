import type { NodeId } from '@/nodes/types';
import * as nodesUtils from '@/nodes/utils';

describe('utils', () => {
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
    // nodeId1 XOR nodeID2 = distance between 2^348 and 2^349
    // Therefore, bucket 351 (last possible bucket)
    const nodeId1 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as NodeId;
    const nodeId2 = 'ÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿ' as NodeId;
    const bucketIndex = nodesUtils.calculateBucketIndex(nodeId1, nodeId2, 352);
    expect(bucketIndex).toBe(351);
  });
});
