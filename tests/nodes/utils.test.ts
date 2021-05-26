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
});
