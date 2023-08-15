import * as ids from '@/ids';

describe('ids/index', () => {
  test('node ids', () => {
    const nodeIdGenerator = ids.createNodeIdGenerator();
    for (let i = 0; i < 100; ++i) {
      const nodeId = nodeIdGenerator();
      const nodeIdEncoded = ids.encodeNodeId(nodeId);
      const nodeId1 = ids.decodeNodeId(nodeIdEncoded);
      expect(nodeId1).toBeDefined();
      expect(nodeId.equals(nodeId1!)).toBe(true);
      const nodeIdString = ids.encodeNodeIdString(nodeId);
      const nodeId2 = ids.decodeNodeIdString(nodeIdString);
      expect(nodeId2).toBeDefined();
      expect(nodeId.equals(nodeId2!)).toBe(true);
    }
  });
});
