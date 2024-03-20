import type {
  NodeContactAddress,
  NodeContact,
  NodeContactAddressData,
  NodeId,
  NodeBucket,
} from '@/nodes/types';
import type { Key } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { test, fc } from '@fast-check/jest';
import NodeGraph from '@/nodes/NodeGraph';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import * as nodesErrors from '@/nodes/errors';
import * as nodesUtils from '@/nodes/utils';
import * as utils from '@/utils';
import { encodeNodeId } from '@/ids';
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
  let nodeGraph: NodeGraph;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger: logger.getChild(KeyRing.name),
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    dbKey = keysUtils.generateKey();
    dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger: logger.getChild(DB.name),
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
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild(NodeGraph.name),
    });
  });
  afterEach(async () => {
    await nodeGraph.stop();
    await db.stop();
    await db.destroy();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  describe('setNodeContact', () => {
    test.prop([testNodesUtils.nodeIdArb, testNodesUtils.nodeContactPairArb], {
      numRuns: 20,
    })('should set with single address', async (nodeId, nodeContactPair) => {
      const nodeContact = {
        [nodeContactPair.nodeContactAddress]:
          nodeContactPair.nodeContactAddressData,
      };
      await nodeGraph.setNodeContact(nodeId, nodeContact);
    });
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 20 },
    )(
      'should set with multiple addresses',
      async (nodeId, nodeContactPair1, nodeContactPair2) => {
        const nodeContact = {
          [nodeContactPair1.nodeContactAddress]:
            nodeContactPair1.nodeContactAddressData,
          [nodeContactPair2.nodeContactAddress]:
            nodeContactPair2.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId, nodeContact);
      },
    );
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 10 },
    )(
      'should set with multiple nodes',
      async (nodeId1, nodeId2, nodeContactPair1, nodeContactPair2) => {
        const nodeContact1 = {
          [nodeContactPair1.nodeContactAddress]:
            nodeContactPair1.nodeContactAddressData,
        };
        const nodeContact2 = {
          [nodeContactPair2.nodeContactAddress]:
            nodeContactPair2.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId1, nodeContact1);
        await nodeGraph.setNodeContact(nodeId2, nodeContact2);
      },
    );
    test('should increment bucket count', async () => {
      const nodeContact: NodeContact = {
        ['someAddress' as NodeContactAddress]: {
          mode: 'direct',
          connectedTime: 0,
          scopes: [],
        },
      };
      expect(await nodeGraph.getBucketMetaProp(100, 'count')).toBe(0);
      await nodeGraph.setNodeContact(
        testNodesUtils.generateNodeIdForBucket(keyRing.getNodeId(), 100, 0),
        nodeContact,
      );
      expect(await nodeGraph.getBucketMetaProp(100, 'count')).toBe(1);
      await nodeGraph.setNodeContact(
        testNodesUtils.generateNodeIdForBucket(keyRing.getNodeId(), 100, 1),
        nodeContact,
      );
      expect(await nodeGraph.getBucketMetaProp(100, 'count')).toBe(2);
    });
    test('should throw when bucket limit exceeded', async () => {
      const nodeContact: NodeContact = {
        ['someAddress' as NodeContactAddress]: {
          mode: 'direct',
          connectedTime: 0,
          scopes: [],
        },
      };
      for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
        await nodeGraph.setNodeContact(
          testNodesUtils.generateNodeIdForBucket(keyRing.getNodeId(), 100, i),
          nodeContact,
        );
      }
      await expect(
        nodeGraph.setNodeContact(
          testNodesUtils.generateNodeIdForBucket(
            keyRing.getNodeId(),
            100,
            nodeGraph.nodeBucketLimit,
          ),
          nodeContact,
        ),
      ).rejects.toThrow(nodesErrors.ErrorNodeGraphBucketLimit);
    });
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactAddressArb,
        testNodesUtils.nodeContactAddressDataArb,
        testNodesUtils.nodeContactAddressDataArb,
      ],
      { numRuns: 20 },
    )(
      'should update bucket lastUpdatedTime',
      async (
        nodeId,
        nodeContactAddress,
        nodeContactAddressData1,
        nodeContactAddressData2,
      ) => {
        await nodeGraph.setNodeContact(nodeId, {
          [nodeContactAddress]: nodeContactAddressData1,
        });
        expect(await nodeGraph.getConnectedTime(nodeId)).toBe(
          nodeContactAddressData1.connectedTime,
        );
        await nodeGraph.setNodeContact(nodeId, {
          [nodeContactAddress]: nodeContactAddressData2,
        });
        expect(await nodeGraph.getConnectedTime(nodeId)).toBe(
          nodeContactAddressData2.connectedTime,
        );
      },
    );
  });
  describe('getNodeContact', () => {
    test.prop([testNodesUtils.nodeIdArb, testNodesUtils.nodeContactPairArb], {
      numRuns: 20,
    })('should get with single address', async (nodeId, nodeContactPair1) => {
      const nodeContact = {
        [nodeContactPair1.nodeContactAddress]:
          nodeContactPair1.nodeContactAddressData,
      };
      await nodeGraph.setNodeContact(nodeId, nodeContact);
      expect(await nodeGraph.getNodeContact(nodeId)).toMatchObject(nodeContact);
    });
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 20 },
    )(
      'should get with multiple addresses',
      async (nodeId, nodeContactPair1, nodeContactPair2) => {
        const nodeContact = {
          [nodeContactPair1.nodeContactAddress]:
            nodeContactPair1.nodeContactAddressData,
          [nodeContactPair2.nodeContactAddress]:
            nodeContactPair2.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId, nodeContact);
        expect(await nodeGraph.getNodeContact(nodeId)).toMatchObject(
          nodeContact,
        );
      },
    );
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 10 },
    )(
      'should get with multiple nodes',
      async (nodeId1, nodeId2, nodeContactPair1, nodeContactPair2) => {
        const nodeContact1 = {
          [nodeContactPair1.nodeContactAddress]:
            nodeContactPair1.nodeContactAddressData,
        };
        const nodeContact2 = {
          [nodeContactPair2.nodeContactAddress]:
            nodeContactPair2.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId1, nodeContact1);
        await nodeGraph.setNodeContact(nodeId2, nodeContact2);
        expect(await nodeGraph.getNodeContact(nodeId1)).toMatchObject(
          nodeContact1,
        );
        expect(await nodeGraph.getNodeContact(nodeId2)).toMatchObject(
          nodeContact2,
        );
      },
    );
  });
  describe('getNodeContacts', () => {
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactArb,
        testNodesUtils.nodeContactArb,
      ],
      { numRuns: 1 },
    )(
      'should get all nodeContacts',
      async (nodeId1, nodeId2, nodeContact1, nodeContact2) => {
        await nodeGraph.setNodeContact(nodeId1, nodeContact1);
        await nodeGraph.setNodeContact(nodeId2, nodeContact2);

        const results: Array<[NodeId, NodeContact]> = [];
        for await (const result of nodeGraph.getNodeContacts()) {
          results.push(result);
        }
        expect(results.length).toBe(2);
        for (const [nodeId, nodeContact] of results) {
          if (nodeId1.equals(nodeId)) {
            expect(Object.keys(nodeContact).length).toBe(
              Object.keys(nodeContact1).length,
            );
            expect(nodeContact).toMatchObject(nodeContact1);
          }
          if (nodeId2.equals(nodeId)) {
            expect(Object.keys(nodeContact).length).toBe(
              Object.keys(nodeContact2).length,
            );
            expect(nodeContact).toMatchObject(nodeContact2);
          }
        }
      },
    );
  });
  describe('setNodeContactAddressData', () => {
    test.prop([testNodesUtils.nodeIdArb, testNodesUtils.nodeContactPairArb], {
      numRuns: 20,
    })('should set with single address', async (nodeId, nodeContactPair) => {
      await nodeGraph.setNodeContactAddressData(
        nodeId,
        nodeContactPair.nodeContactAddress,
        nodeContactPair.nodeContactAddressData,
      );
    });
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 20 },
    )(
      'should set  with multiple addresses',
      async (nodeId, nodeContactPair1, nodeContactPair2) => {
        await nodeGraph.setNodeContactAddressData(
          nodeId,
          nodeContactPair1.nodeContactAddress,
          nodeContactPair1.nodeContactAddressData,
        );
        await nodeGraph.setNodeContactAddressData(
          nodeId,
          nodeContactPair2.nodeContactAddress,
          nodeContactPair2.nodeContactAddressData,
        );
      },
    );
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 10 },
    )(
      'should set  with multiple nodes',
      async (nodeId1, nodeId2, nodeContactPair1, nodeContactPair2) => {
        await nodeGraph.setNodeContactAddressData(
          nodeId1,
          nodeContactPair1.nodeContactAddress,
          nodeContactPair1.nodeContactAddressData,
        );
        await nodeGraph.setNodeContactAddressData(
          nodeId2,
          nodeContactPair2.nodeContactAddress,
          nodeContactPair2.nodeContactAddressData,
        );
      },
    );
    test('should increment bucket count', async () => {
      const nodeContactAddress = 'someAddress' as NodeContactAddress;
      const nodeContactAddressData: NodeContactAddressData = {
        mode: 'direct',
        connectedTime: 0,
        scopes: [],
      };
      expect(await nodeGraph.getBucketMetaProp(100, 'count')).toBe(0);
      await nodeGraph.setNodeContactAddressData(
        testNodesUtils.generateNodeIdForBucket(keyRing.getNodeId(), 100, 0),
        nodeContactAddress,
        nodeContactAddressData,
      );
      expect(await nodeGraph.getBucketMetaProp(100, 'count')).toBe(1);
      await nodeGraph.setNodeContactAddressData(
        testNodesUtils.generateNodeIdForBucket(keyRing.getNodeId(), 100, 1),
        nodeContactAddress,
        nodeContactAddressData,
      );
      expect(await nodeGraph.getBucketMetaProp(100, 'count')).toBe(2);
    });
    test('should throw when bucket limit exceeded', async () => {
      const nodeContactAddress = 'someAddress' as NodeContactAddress;
      const nodeContactAddressData: NodeContactAddressData = {
        mode: 'direct',
        connectedTime: 0,
        scopes: [],
      };
      for (let i = 0; i < nodeGraph.nodeBucketLimit; i++) {
        await nodeGraph.setNodeContactAddressData(
          testNodesUtils.generateNodeIdForBucket(keyRing.getNodeId(), 100, i),
          nodeContactAddress,
          nodeContactAddressData,
        );
      }
      await expect(
        nodeGraph.setNodeContactAddressData(
          testNodesUtils.generateNodeIdForBucket(
            keyRing.getNodeId(),
            100,
            nodeGraph.nodeBucketLimit,
          ),
          nodeContactAddress,
          nodeContactAddressData,
        ),
      ).rejects.toThrow(nodesErrors.ErrorNodeGraphBucketLimit);
    });
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactAddressArb,
        testNodesUtils.nodeContactAddressArb,
        testNodesUtils.nodeContactAddressDataArb,
        testNodesUtils.nodeContactAddressDataArb,
      ],
      { numRuns: 20 },
    )(
      'should update bucket lastUpdatedTime',
      async (
        nodeId,
        nodeContactAddress1,
        nodeContactAddress2,
        nodeContactAddressData1,
        nodeContactAddressData2,
      ) => {
        await nodeGraph.setNodeContactAddressData(
          nodeId,
          nodeContactAddress1,
          nodeContactAddressData1,
        );
        expect(await nodeGraph.getConnectedTime(nodeId)).toBe(
          nodeContactAddressData1.connectedTime,
        );
        await nodeGraph.setNodeContactAddressData(
          nodeId,
          nodeContactAddress1,
          nodeContactAddressData2,
        );
        expect(await nodeGraph.getConnectedTime(nodeId)).toBe(
          nodeContactAddressData2.connectedTime,
        );
        await nodeGraph.setNodeContactAddressData(
          nodeId,
          nodeContactAddress2,
          nodeContactAddressData1,
        );
        expect(await nodeGraph.getConnectedTime(nodeId)).toBe(
          nodeContactAddressData1.connectedTime,
        );
      },
    );
  });
  describe('getNodeContactAddressData', () => {
    test.prop([testNodesUtils.nodeIdArb, testNodesUtils.nodeContactPairArb], {
      numRuns: 20,
    })('should get with single address', async (nodeId, nodeContactPair) => {
      const nodeContact = {
        [nodeContactPair.nodeContactAddress]:
          nodeContactPair.nodeContactAddressData,
      };
      await nodeGraph.setNodeContact(nodeId, nodeContact);

      const result = await nodeGraph.getNodeContactAddressData(
        nodeId,
        nodeContactPair.nodeContactAddress,
      );
      expect(result).toBeDefined();
      expect(result!).toMatchObject(nodeContactPair.nodeContactAddressData);
    });
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 20 },
    )(
      'should get with multiple addresses',
      async (nodeId, nodeContactPair1, nodeContactPair2) => {
        const nodeContact = {
          [nodeContactPair1.nodeContactAddress]:
            nodeContactPair1.nodeContactAddressData,
          [nodeContactPair2.nodeContactAddress]:
            nodeContactPair2.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId, nodeContact);

        const result1 = await nodeGraph.getNodeContactAddressData(
          nodeId,
          nodeContactPair1.nodeContactAddress,
        );
        expect(result1).toBeDefined();
        expect(result1!).toMatchObject(nodeContactPair1.nodeContactAddressData);
        const result2 = await nodeGraph.getNodeContactAddressData(
          nodeId,
          nodeContactPair2.nodeContactAddress,
        );
        expect(result2).toBeDefined();
        expect(result2!).toMatchObject(nodeContactPair2.nodeContactAddressData);
      },
    );
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 10 },
    )(
      'should get with multiple nodes',
      async (nodeId1, nodeId2, nodeContactPair1, nodeContactPair2) => {
        const nodeContact1 = {
          [nodeContactPair1.nodeContactAddress]:
            nodeContactPair1.nodeContactAddressData,
        };
        const nodeContact2 = {
          [nodeContactPair2.nodeContactAddress]:
            nodeContactPair2.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId1, nodeContact1);
        await nodeGraph.setNodeContact(nodeId2, nodeContact2);

        const result1 = await nodeGraph.getNodeContactAddressData(
          nodeId1,
          nodeContactPair1.nodeContactAddress,
        );
        expect(result1).toBeDefined();
        expect(result1!).toMatchObject(nodeContactPair1.nodeContactAddressData);
        const result2 = await nodeGraph.getNodeContactAddressData(
          nodeId2,
          nodeContactPair2.nodeContactAddress,
        );
        expect(result2).toBeDefined();
        expect(result2!).toMatchObject(nodeContactPair2.nodeContactAddressData);
      },
    );
  });
  describe('unsetNodeContact', () => {
    test.prop(
      [
        testNodesUtils.nodeIdArb.noShrink(),
        testNodesUtils.nodeContactPairArb.noShrink(),
      ],
      { numRuns: 20 },
    )(
      'can unsetNodeContact with single address',
      async (nodeId, nodeContactPair) => {
        const nodeContact = {
          [nodeContactPair.nodeContactAddress]:
            nodeContactPair.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId, nodeContact);

        await nodeGraph.unsetNodeContact(nodeId);
        expect(await nodeGraph.getNodeContact(nodeId)).toBeUndefined();
        expect(
          await nodeGraph.getBucketMetaProp(
            nodeGraph.bucketIndex(nodeId)[0],
            'count',
          ),
        ).toBe(0);
      },
    );
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 20 },
    )(
      'can unsetNodeContact with multiple addresses',
      async (nodeId, nodeContactPair1, nodeContactPair2) => {
        const nodeContact = {
          [nodeContactPair1.nodeContactAddress]:
            nodeContactPair1.nodeContactAddressData,
          [nodeContactPair2.nodeContactAddress]:
            nodeContactPair2.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId, nodeContact);

        await nodeGraph.unsetNodeContact(nodeId);
        expect(await nodeGraph.getNodeContact(nodeId)).toBeUndefined();
        expect(
          await nodeGraph.getBucketMetaProp(
            nodeGraph.bucketIndex(nodeId)[0],
            'count',
          ),
        ).toBe(0);
      },
    );
    test('should decrement bucket count', async () => {
      const nodeId = keyRing.getNodeId();
      const nodeId1 = testNodesUtils.generateNodeIdForBucket(nodeId, 100, 0);
      const nodeId2 = testNodesUtils.generateNodeIdForBucket(nodeId, 100, 1);
      const nodeContactAddress1 = 'someAddress1' as NodeContactAddress;
      const nodeContactAddressData: NodeContactAddressData = {
        mode: 'direct',
        connectedTime: 0,
        scopes: [],
      };
      await nodeGraph.setNodeContact(nodeId1, {
        [nodeContactAddress1]: nodeContactAddressData,
      });
      await nodeGraph.setNodeContact(nodeId2, {
        [nodeContactAddress1]: nodeContactAddressData,
      });

      expect(await nodeGraph.getBucketMetaProp(100, 'count')).toBe(2);
      await nodeGraph.unsetNodeContact(nodeId1);
      expect(await nodeGraph.getBucketMetaProp(100, 'count')).toBe(1);
      await nodeGraph.unsetNodeContact(nodeId2);
      expect(await nodeGraph.getBucketMetaProp(100, 'count')).toBe(0);
    });
    test.prop(
      [
        testNodesUtils.nodeIdArb.noShrink(),
        testNodesUtils.nodeContactPairArb.noShrink(),
      ],
      { numRuns: 20 },
    )('should delete lastUpdatedTime', async (nodeId, nodeContactPair) => {
      const nodeContact = {
        [nodeContactPair.nodeContactAddress]:
          nodeContactPair.nodeContactAddressData,
      };
      await nodeGraph.setNodeContact(nodeId, nodeContact);

      expect(await nodeGraph.getConnectedTime(nodeId)).toBeDefined();
      await nodeGraph.unsetNodeContact(nodeId);
      expect(await nodeGraph.getConnectedTime(nodeId)).toBeUndefined();
    });
  });
  describe('unsetNodeContactAddress', () => {
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 20 },
    )(
      'should unset with multiple addresses',
      async (nodeId, nodeContactPair1, nodeContactPair2) => {
        const nodeContact = {
          [nodeContactPair1.nodeContactAddress]:
            nodeContactPair1.nodeContactAddressData,
          [nodeContactPair2.nodeContactAddress]:
            nodeContactPair2.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId, nodeContact);

        await nodeGraph.unsetNodeContactAddress(
          nodeId,
          nodeContactPair1.nodeContactAddress,
        );
        expect(
          await nodeGraph.getNodeContactAddressData(
            nodeId,
            nodeContactPair1.nodeContactAddress,
          ),
        ).toBeUndefined();
        expect(
          await nodeGraph.getNodeContactAddressData(
            nodeId,
            nodeContactPair2.nodeContactAddress,
          ),
        ).toBeDefined();
        expect(await nodeGraph.getNodeContact(nodeId)).toBeDefined();
        expect(
          await nodeGraph.getBucketMetaProp(
            nodeGraph.bucketIndex(nodeId)[0],
            'count',
          ),
        ).toBeGreaterThanOrEqual(1);
      },
    );
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 20 },
    )(
      'should remove node when all addresses are removed',
      async (nodeId, nodeContactPair1, nodeContactPair2) => {
        const nodeContact = {
          [nodeContactPair1.nodeContactAddress]:
            nodeContactPair1.nodeContactAddressData,
          [nodeContactPair2.nodeContactAddress]:
            nodeContactPair2.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId, nodeContact);

        await nodeGraph.unsetNodeContactAddress(
          nodeId,
          nodeContactPair1.nodeContactAddress,
        );
        await nodeGraph.unsetNodeContactAddress(
          nodeId,
          nodeContactPair2.nodeContactAddress,
        );
        expect(
          await nodeGraph.getNodeContactAddressData(
            nodeId,
            nodeContactPair1.nodeContactAddress,
          ),
        ).toBeUndefined();
        expect(
          await nodeGraph.getNodeContactAddressData(
            nodeId,
            nodeContactPair2.nodeContactAddress,
          ),
        ).toBeUndefined();
        expect(await nodeGraph.getNodeContact(nodeId)).toBeUndefined();
        expect(
          await nodeGraph.getBucketMetaProp(
            nodeGraph.bucketIndex(nodeId)[0],
            'count',
          ),
        ).toBe(0);
      },
    );
    test('should decrement bucket count', async () => {
      const nodeId = testNodesUtils.generateRandomNodeId();
      const nodeContactAddress1 = 'someAddress1' as NodeContactAddress;
      const nodeContactAddress2 = 'someAddress2' as NodeContactAddress;
      const nodeContactAddressData: NodeContactAddressData = {
        mode: 'direct',
        connectedTime: 0,
        scopes: [],
      };
      const nodeContact: NodeContact = {
        [nodeContactAddress1]: nodeContactAddressData,
        [nodeContactAddress2]: nodeContactAddressData,
      };
      await nodeGraph.setNodeContact(nodeId, nodeContact);

      expect(
        await nodeGraph.getBucketMetaProp(
          nodeGraph.bucketIndex(nodeId)[0],
          'count',
        ),
      ).toBe(1);
      await nodeGraph.unsetNodeContactAddress(nodeId, nodeContactAddress1);
      expect(
        await nodeGraph.getBucketMetaProp(
          nodeGraph.bucketIndex(nodeId)[0],
          'count',
        ),
      ).toBe(1);
      await nodeGraph.unsetNodeContactAddress(nodeId, nodeContactAddress2);
      expect(
        await nodeGraph.getBucketMetaProp(
          nodeGraph.bucketIndex(nodeId)[0],
          'count',
        ),
      ).toBe(0);
    });
    test.prop(
      [
        testNodesUtils.nodeIdArb,
        testNodesUtils.nodeContactPairArb,
        testNodesUtils.nodeContactPairArb,
      ],
      { numRuns: 20 },
    )(
      'should delete lastUpdatedTime',
      async (nodeId, nodeContactPair1, nodeContactPair2) => {
        const nodeContact = {
          [nodeContactPair1.nodeContactAddress]:
            nodeContactPair1.nodeContactAddressData,
          [nodeContactPair2.nodeContactAddress]:
            nodeContactPair2.nodeContactAddressData,
        };
        await nodeGraph.setNodeContact(nodeId, nodeContact);

        expect(await nodeGraph.getConnectedTime(nodeId)).toBeDefined();
        await nodeGraph.unsetNodeContactAddress(
          nodeId,
          nodeContactPair1.nodeContactAddress,
        );
        expect(await nodeGraph.getConnectedTime(nodeId)).toBeDefined();
        await nodeGraph.unsetNodeContactAddress(
          nodeId,
          nodeContactPair2.nodeContactAddress,
        );
        // Only removed after all addresses are removed
        expect(await nodeGraph.getConnectedTime(nodeId)).toBeUndefined();
      },
    );
  });
  describe('getBucket', () => {
    test.prop(
      [
        fc.integer({ min: 20, max: 254 }).noShrink(),
        fc
          .array(testNodesUtils.nodeContactArb, { minLength: 1, maxLength: 20 })
          .noShrink(),
      ],
      { numRuns: 1 },
    )('can get a bucket', async (bucketIndex, nodeContacts) => {
      // Fill a bucket with data
      const nodeIds: Map<string, NodeContact> = new Map();
      for (let i = 0; i < nodeContacts.length; i++) {
        const nodeId = testNodesUtils.generateNodeIdForBucket(
          keyRing.getNodeId(),
          bucketIndex,
          i,
        );
        nodeIds.set(encodeNodeId(nodeId), nodeContacts[i]);
        await nodeGraph.setNodeContact(nodeId, nodeContacts[i]);
      }

      // Getting the bucket
      const bucket = await nodeGraph.getBucket(bucketIndex);
      expect(bucket.length).toBe(nodeContacts.length);
      for (const [nodeId, nodeContact] of bucket) {
        expect(nodeContact).toMatchObject(nodeIds.get(encodeNodeId(nodeId))!);
      }
    });
    test.prop(
      [
        fc.integer({ min: 20, max: 254 }).noShrink(),
        fc
          .array(testNodesUtils.nodeContactArb, { minLength: 1, maxLength: 20 })
          .noShrink(),
      ],
      { numRuns: 1 },
    )(
      'can get a bucket ordered by distance',
      async (bucketIndex, nodeContacts) => {
        // Fill a bucket with data
        const nodeIdsContact: Map<string, NodeContact> = new Map();
        const nodeIds: Array<NodeId> = [];
        for (let i = 0; i < nodeContacts.length; i++) {
          const nodeId = testNodesUtils.generateNodeIdForBucket(
            keyRing.getNodeId(),
            bucketIndex,
            i,
          );
          nodeIds.push(nodeId);
          nodeIdsContact.set(encodeNodeId(nodeId), nodeContacts[i]);
          await nodeGraph.setNodeContact(nodeId, nodeContacts[i]);
        }

        // Getting the bucket
        const bucket = await nodeGraph.getBucket(bucketIndex, 'distance');

        // Checking data
        expect(bucket.length).toBe(nodeContacts.length);
        for (const [nodeId, nodeContact] of bucket) {
          expect(nodeContact).toMatchObject(
            nodeIdsContact.get(encodeNodeId(nodeId))!,
          );
        }

        // Checking order
        const nodeId = keyRing.getNodeId();
        nodeIds.sort((nodeIdA, nodeIdB) => {
          const distA = nodesUtils.nodeDistance(nodeId, nodeIdA);
          const distB = nodesUtils.nodeDistance(nodeId, nodeIdB);
          if (distA < distB) {
            return -1;
          } else if (distA > distB) {
            return 1;
          } else {
            return 0;
          }
        });

        // Should have same sorted order
        for (let i = 0; i < bucket.length; i++) {
          expect(nodeIds[i].equals(bucket[i][0])).toBeTrue();
        }
      },
    );
    test.prop(
      [
        fc.integer({ min: 20, max: 254 }).noShrink(),
        fc
          .array(testNodesUtils.nodeContactArb, { minLength: 1, maxLength: 20 })
          .noShrink(),
      ],
      { numRuns: 1 },
    )(
      'can get a bucket ordered by lastUpdatedTime',
      async (bucketIndex, nodeContacts) => {
        // Fill a bucket with data
        const nodeIdsContact: Map<string, NodeContact> = new Map();
        const nodeIds: Array<{
          nodeId: NodeId;
          lastUpdated: number;
        }> = [];
        for (let i = 0; i < nodeContacts.length; i++) {
          const nodeId = testNodesUtils.generateNodeIdForBucket(
            keyRing.getNodeId(),
            bucketIndex,
            i,
          );
          let lastUpdated = 0;
          const nodeContact = nodeContacts[i];
          for (const addressData of Object.values(nodeContact)) {
            if (lastUpdated < addressData.connectedTime) {
              lastUpdated = addressData.connectedTime;
            }
          }
          nodeIds.push({
            nodeId,
            lastUpdated,
          });
          nodeIdsContact.set(encodeNodeId(nodeId), nodeContacts[i]);
          await nodeGraph.setNodeContact(nodeId, nodeContacts[i]);
        }

        // Getting the bucket
        const bucket = await nodeGraph.getBucket(bucketIndex, 'connected');

        // Checking data
        expect(bucket.length).toBe(nodeContacts.length);
        for (const [nodeId, nodeContact] of bucket) {
          expect(nodeContact).toMatchObject(
            nodeIdsContact.get(encodeNodeId(nodeId))!,
          );
        }

        // Checking order
        nodeIds.sort((nodeA, nodeB) => {
          if (nodeA.lastUpdated < nodeB.lastUpdated) {
            return -1;
          } else if (nodeA.lastUpdated > nodeB.lastUpdated) {
            return 1;
          } else {
            return 0;
          }
        });

        // Should have same sorted order
        for (let i = 0; i < bucket.length; i++) {
          expect(nodeIds[i].nodeId.equals(bucket[i][0])).toBeTrue();
        }
      },
    );
  });
  describe('getBuckets', () => {
    test.prop(
      [
        fc
          .uniqueArray(fc.integer({ min: 0, max: 255 }), { minLength: 1 })
          .noShrink(),
        testNodesUtils.nodeContactArb,
      ],
      { numRuns: 1 },
    )('get all buckets', async (buckets, nodeContact) => {
      const nodeId = keyRing.getNodeId();
      for (const bucket of buckets) {
        await nodeGraph.setNodeContact(
          testNodesUtils.generateNodeIdForBucket(nodeId, bucket, 0),
          nodeContact,
        );
      }

      const results: Array<number> = [];
      for await (const [index, nodeBucket] of nodeGraph.getBuckets()) {
        results.push(index);
        expect(nodeBucket.length).toBe(1);
      }
      expect(results.length).toBe(buckets.length);
      for (const bucketIndex of buckets) {
        expect(results).toContain(bucketIndex);
      }
    });
  });
  describe('resetBuckets', () => {
    let getNodeIdMock: jest.SpyInstance;

    beforeEach(() => {
      getNodeIdMock = jest.spyOn(keyRing, 'getNodeId');
    });
    afterEach(() => {
      getNodeIdMock.mockRestore();
    });

    test('should rearrange buckets', async () => {
      // Fill in buckets
      const nodeContact: NodeContact = {
        ['address1' as NodeContactAddress]: {
          mode: 'signal',
          connectedTime: 100,
          scopes: ['global'],
        },
        ['address2' as NodeContactAddress]: {
          mode: 'direct',
          connectedTime: 200,
          scopes: ['local'],
        },
      };
      const nodeId = keyRing.getNodeId();
      for (let i = 5; i < 255; i += 5) {
        for (let j = 0; j < 5; j++) {
          await nodeGraph.setNodeContact(
            testNodesUtils.generateNodeIdForBucket(nodeId, i, j + 1),
            nodeContact,
          );
        }
      }

      // Re-arrange
      const oldNodeId = keyRing.getNodeId();
      getNodeIdMock.mockReturnValue(
        testNodesUtils.generateNodeIdForBucket(oldNodeId, 100, 0),
      );
      await nodeGraph.resetBuckets();

      const bucketsNew: Array<[number, NodeBucket]> = [];
      for await (const result of nodeGraph.getBuckets()) {
        bucketsNew.push(result);
      }

      // The fist 99 buckets should contain only 20 nodes taken from bucket 100
      let nodesLower = 0;
      let nodesEqual = 0;
      let nodesHigher = 0;
      for (const [bucketIndex, bucket] of bucketsNew) {
        const nodesNum = bucket.length;
        if (bucketIndex < 100) nodesLower += nodesNum;
        if (bucketIndex === 100) nodesEqual += nodesNum;
        if (bucketIndex > 100) nodesHigher += nodesNum;
      }
      // 5 nodes in bucket 100 are shuffled into buckets 0-99
      expect(nodesLower).toBe(5);
      // 95 nodes in buckets 0-99 are moved into bucket 100, limited by 20
      expect(nodesEqual).toBe(20);
      // 150 nodes in higher buckets don't move around
      expect(nodesHigher).toBe(150);

      // When we re-order a bucket we expect the following to happen
      // 1.
    });
  });
  describe('getClosestNodes', () => {
    const nodeContact: NodeContact = {
      ['address1' as NodeContactAddress]: {
        mode: 'signal',
        connectedTime: 0,
        scopes: [],
      },
    };

    test('40 nodes lower than target, take 20', async () => {
      const baseNodeId = keyRing.getNodeId();
      const nodeIds: Array<NodeId> = [];
      // Add 1 node to each bucket
      for (let i = 0; i < 40; i++) {
        const nodeId = testNodesUtils.generateNodeIdForBucket(
          baseNodeId,
          50 + i,
          i,
        );
        nodeIds.push(nodeId);
        await nodeGraph.setNodeContact(nodeId, nodeContact);
      }
      const targetNodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        100,
        2,
      );
      nodeIds.sort(nodesUtils.nodeDistanceCmpFactory(targetNodeId));
      const nodeIdsEncoded = nodeIds.map((a) => nodesUtils.encodeNodeId(a));

      const result = await nodeGraph.getClosestNodes(targetNodeId, 20);

      const closestNodesEncoded = result.map(([nodeId]) =>
        nodesUtils.encodeNodeId(nodeId),
      );
      // Are the closest nodes out of all the nodes
      expect(closestNodesEncoded).toEqual(nodeIdsEncoded.slice(0, 20));
    });
    test('15 nodes lower than target, take 20', async () => {
      const baseNodeId = keyRing.getNodeId();
      const nodeIds: Array<NodeId> = [];
      // Add 1 node to each bucket
      for (let i = 0; i < 15; i++) {
        const nodeId = testNodesUtils.generateNodeIdForBucket(
          baseNodeId,
          50 + i,
          i,
        );
        nodeIds.push(nodeId);
        await nodeGraph.setNodeContact(nodeId, nodeContact);
      }
      const targetNodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        100,
        2,
      );
      nodeIds.sort(nodesUtils.nodeDistanceCmpFactory(targetNodeId));
      const nodeIdsEncoded = nodeIds.map((a) => nodesUtils.encodeNodeId(a));

      const result = await nodeGraph.getClosestNodes(targetNodeId, 20);

      const closestNodesEncoded = result.map(([nodeId]) =>
        nodesUtils.encodeNodeId(nodeId),
      );
      // Are the closest nodes out of all the nodes
      expect(closestNodesEncoded).toEqual(nodeIdsEncoded.slice(0, 20));
    });
    test('10 nodes lower than target, 30 nodes above, take 20', async () => {
      const baseNodeId = keyRing.getNodeId();
      const nodeIds: Array<NodeId> = [];
      // Add 1 node to each bucket
      for (let i = 0; i < 40; i++) {
        const nodeId = testNodesUtils.generateNodeIdForBucket(
          baseNodeId,
          90 + i,
          i,
        );
        nodeIds.push(nodeId);
        await nodeGraph.setNodeContact(nodeId, nodeContact);
      }
      const targetNodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        100,
        2,
      );
      nodeIds.sort(nodesUtils.nodeDistanceCmpFactory(targetNodeId));
      const nodeIdsEncoded = nodeIds.map((a) => nodesUtils.encodeNodeId(a));

      const result = await nodeGraph.getClosestNodes(targetNodeId, 20);

      const closestNodesEncoded = result.map(([nodeId]) =>
        nodesUtils.encodeNodeId(nodeId),
      );
      // Are the closest nodes out of all the nodes
      expect(closestNodesEncoded).toEqual(nodeIdsEncoded.slice(0, 20));
    });
    test('10 nodes lower than target, 30 nodes above, take 5', async () => {
      const baseNodeId = keyRing.getNodeId();
      const nodeIds: Array<NodeId> = [];
      // Add 1 node to each bucket
      for (let i = 0; i < 40; i++) {
        const nodeId = testNodesUtils.generateNodeIdForBucket(
          baseNodeId,
          90 + i,
          i,
        );
        nodeIds.push(nodeId);
        await nodeGraph.setNodeContact(nodeId, nodeContact);
      }
      const targetNodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        100,
        2,
      );
      nodeIds.sort(nodesUtils.nodeDistanceCmpFactory(targetNodeId));
      const nodeIdsEncoded = nodeIds.map((a) => nodesUtils.encodeNodeId(a));

      const result = await nodeGraph.getClosestNodes(targetNodeId, 5);

      const closestNodesEncoded = result.map(([nodeId]) =>
        nodesUtils.encodeNodeId(nodeId),
      );
      // Are the closest nodes out of all the nodes
      expect(closestNodesEncoded).toEqual(nodeIdsEncoded.slice(0, 5));
    });
    test('5 nodes lower than target, 10 nodes above, take 20', async () => {
      const baseNodeId = keyRing.getNodeId();
      const nodeIds: Array<NodeId> = [];
      // Add 1 node to each bucket
      for (let i = 0; i < 15; i++) {
        const nodeId = testNodesUtils.generateNodeIdForBucket(
          baseNodeId,
          95 + i,
          i,
        );
        nodeIds.push(nodeId);
        await nodeGraph.setNodeContact(nodeId, nodeContact);
      }
      const targetNodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        100,
        2,
      );
      nodeIds.sort(nodesUtils.nodeDistanceCmpFactory(targetNodeId));
      const nodeIdsEncoded = nodeIds.map((a) => nodesUtils.encodeNodeId(a));

      const result = await nodeGraph.getClosestNodes(targetNodeId, 20);

      const closestNodesEncoded = result.map(([nodeId]) =>
        nodesUtils.encodeNodeId(nodeId),
      );
      // Are the closest nodes out of all the nodes
      expect(nodeIdsEncoded.slice(0, closestNodesEncoded.length)).toEqual(
        closestNodesEncoded,
      );
    });
    test('40 nodes above target, take 20', async () => {
      const baseNodeId = keyRing.getNodeId();
      const nodeIds: Array<NodeId> = [];
      // Add 1 node to each bucket
      for (let i = 0; i < 40; i++) {
        const nodeId = testNodesUtils.generateNodeIdForBucket(
          baseNodeId,
          101 + i,
          i,
        );
        nodeIds.push(nodeId);
        await nodeGraph.setNodeContact(nodeId, nodeContact);
      }
      const targetNodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        100,
        0,
      );
      nodeIds.sort(nodesUtils.nodeDistanceCmpFactory(targetNodeId));
      const nodeIdsEncoded = nodeIds.map((a) => nodesUtils.encodeNodeId(a));

      const result = await nodeGraph.getClosestNodes(targetNodeId, 20);
      const closestNodesEncoded = result.map(([nodeId]) =>
        nodesUtils.encodeNodeId(nodeId),
      );
      // Are the closest nodes out of all the nodes
      expect(closestNodesEncoded).toEqual(nodeIdsEncoded.slice(0, 20));
    });
    test('15 nodes above target, take 20', async () => {
      const baseNodeId = keyRing.getNodeId();
      const nodeIds: Array<NodeId> = [];
      // Add 1 node to each bucket
      for (let i = 0; i < 15; i++) {
        const nodeId = testNodesUtils.generateNodeIdForBucket(
          baseNodeId,
          101 + i,
          i,
        );
        nodeIds.push(nodeId);
        await nodeGraph.setNodeContact(nodeId, nodeContact);
      }
      const targetNodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        100,
        2,
      );
      nodeIds.sort(nodesUtils.nodeDistanceCmpFactory(targetNodeId));
      const nodeIdsEncoded = nodeIds.map((a) => nodesUtils.encodeNodeId(a));

      const result = await nodeGraph.getClosestNodes(targetNodeId, 20);

      const closestNodesEncoded = result.map(([nodeId]) =>
        nodesUtils.encodeNodeId(nodeId),
      );
      // Are the closest nodes out of all the nodes
      expect(nodeIdsEncoded.slice(0, closestNodesEncoded.length)).toEqual(
        closestNodesEncoded,
      );
      expect(closestNodesEncoded).toEqual(nodeIdsEncoded.slice(0, 20));
    });
    test('no nodes, take 20', async () => {
      const baseNodeId = keyRing.getNodeId();
      const targetNodeId = testNodesUtils.generateNodeIdForBucket(
        baseNodeId,
        100,
        2,
      );

      const result = await nodeGraph.getClosestNodes(targetNodeId, 20);
      expect(result).toHaveLength(0);
    });
  });
  describe('nodesTotal', () => {
    test.prop(
      [
        fc
          .array(testNodesUtils.nodeIdContactPairArb, { maxLength: 20 })
          .noShrink(),
      ],
      {
        numRuns: 1,
      },
    )('should get total nodes', async (nodes) => {
      for (const { nodeId, nodeContact } of nodes) {
        await nodeGraph.setNodeContact(nodeId, nodeContact);
      }

      expect(await nodeGraph.nodesTotal()).toBe(nodes.length);
    });
  });
});
