import type { Host, Port } from '@/network/types';
import type { NodeAddress, NodeData, NodeId } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import * as nodesErrors from '@/nodes/errors';
import KeyManager from '@/keys/KeyManager';
import * as keysUtils from '@/keys/utils';
import Proxy from '@/network/Proxy';

import * as nodesUtils from '@/nodes/utils';
import Sigchain from '@/sigchain/Sigchain';
import * as nodesTestUtils from './utils';

describe(`${NodeGraph.name} test`, () => {
  const localHost = '127.0.0.1' as Host;
  const port = 0 as Port;
  const password = 'password';
  let nodeGraph: NodeGraph;
  let nodeId: NodeId;

  const nodeId1 = IdInternal.create<NodeId>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 5,
  ]);
  const dummyNode = nodesUtils.decodeNodeId(
    'vi3et1hrpv2m2lrplcm7cu913kr45v51cak54vm68anlbvuf83ra0',
  )!;

  const logger = new Logger(`${NodeGraph.name} test`, LogLevel.ERROR, [
    new StreamHandler(),
  ]);
  let proxy: Proxy;
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
  let nodeConnectionManager: NodeConnectionManager;
  let sigchain: Sigchain;

  const hostGen = (i: number) => `${i}.${i}.${i}.${i}` as Host;

  const mockedGenerateDeterministicKeyPair = jest.spyOn(
    keysUtils,
    'generateDeterministicKeyPair',
  );

  beforeEach(async () => {
    mockedGenerateDeterministicKeyPair.mockImplementation((bits, _) => {
      return keysUtils.generateKeyPair(bits);
    });

    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    proxy = new Proxy({
      authToken: 'auth',
      logger: logger,
    });
    await proxy.start({
      serverHost: localHost,
      serverPort: port,
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
    });
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    sigchain = await Sigchain.createSigchain({
      keyManager: keyManager,
      db: db,
      logger: logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyManager: keyManager,
      nodeGraph: nodeGraph,
      proxy: proxy,
      logger: logger,
    });
    await nodeConnectionManager.start();
    // Retrieve the NodeGraph reference from NodeManager
    nodeId = keyManager.getNodeId();
  });

  afterEach(async () => {
    await db.stop();
    await sigchain.stop();
    await nodeConnectionManager.stop();
    await nodeGraph.stop();
    await keyManager.stop();
    await proxy.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('NodeGraph readiness', async () => {
    const nodeGraph2 = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    // @ts-ignore
    await expect(nodeGraph2.destroy()).rejects.toThrow(
      nodesErrors.ErrorNodeGraphRunning,
    );
    // Should be a noop
    await nodeGraph2.start();
    await nodeGraph2.stop();
    await nodeGraph2.destroy();
    await expect(async () => {
      await nodeGraph2.start();
    }).rejects.toThrow(nodesErrors.ErrorNodeGraphDestroyed);
    await expect(async () => {
      await nodeGraph2.getBucket(0);
    }).rejects.toThrow(nodesErrors.ErrorNodeGraphNotRunning);
    await expect(async () => {
      await nodeGraph2.getBucket(0);
    }).rejects.toThrow(nodesErrors.ErrorNodeGraphNotRunning);
  });
  test('knows node (true and false case)', async () => {
    // Known node
    const nodeAddress1: NodeAddress = {
      host: '127.0.0.1' as Host,
      port: 11111 as Port,
    };
    await nodeGraph.setNode(nodeId1, nodeAddress1);
    expect(await nodeGraph.knowsNode(nodeId1)).toBeTruthy();

    // Unknown node
    expect(await nodeGraph.knowsNode(dummyNode)).toBeFalsy();
  });
  test('finds correct node address', async () => {
    // New node added
    const newNode2Id = nodeId1;
    const newNode2Address = { host: '227.1.1.1', port: 4567 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    // Get node address
    const foundAddress = await nodeGraph.getNode(newNode2Id);
    expect(foundAddress).toEqual({ host: '227.1.1.1', port: 4567 });
  });
  test('unable to find node address', async () => {
    // New node added
    const newNode2Id = nodeId1;
    const newNode2Address = { host: '227.1.1.1', port: 4567 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    // Get node address (of non-existent node)
    const foundAddress = await nodeGraph.getNode(dummyNode);
    expect(foundAddress).toBeUndefined();
  });
  test('adds a single node into a bucket', async () => {
    // New node added
    const newNode2Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 1);
    const newNode2Address = { host: '227.1.1.1', port: 4567 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    // Check new node is in retrieved bucket from database
    // bucketIndex = 1 as "NODEID1" XOR "NODEID2" = 3
    const bucket = await nodeGraph.getBucket(1);
    expect(bucket).toBeDefined();
    expect(bucket![newNode2Id]).toEqual({
      address: { host: '227.1.1.1', port: 4567 },
      lastUpdated: expect.any(Date),
    });
  });
  test('adds multiple nodes into the same bucket', async () => {
    // Add 3 new nodes into bucket 4
    const bucketIndex = 4;
    const newNode1Id = nodesTestUtils.generateNodeIdForBucket(
      nodeId,
      bucketIndex,
      0,
    );
    const newNode1Address = { host: '4.4.4.4', port: 4444 } as NodeAddress;
    await nodeGraph.setNode(newNode1Id, newNode1Address);

    const newNode2Id = nodesTestUtils.generateNodeIdForBucket(
      nodeId,
      bucketIndex,
      1,
    );
    const newNode2Address = { host: '5.5.5.5', port: 5555 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    const newNode3Id = nodesTestUtils.generateNodeIdForBucket(
      nodeId,
      bucketIndex,
      2,
    );
    const newNode3Address = { host: '6.6.6.6', port: 6666 } as NodeAddress;
    await nodeGraph.setNode(newNode3Id, newNode3Address);
    // Based on XOR values, all 3 nodes should appear in bucket 4
    const bucket = await nodeGraph.getBucket(4);
    expect(bucket).toBeDefined();
    if (!bucket) fail('bucket should be defined, letting TS know');
    expect(bucket[newNode1Id]).toEqual({
      address: { host: '4.4.4.4', port: 4444 },
      lastUpdated: expect.any(Date),
    });
    expect(bucket[newNode2Id]).toEqual({
      address: { host: '5.5.5.5', port: 5555 },
      lastUpdated: expect.any(Date),
    });
    expect(bucket[newNode3Id]).toEqual({
      address: { host: '6.6.6.6', port: 6666 },
      lastUpdated: expect.any(Date),
    });
  });
  test('adds a single node into different buckets', async () => {
    // New node for bucket 3
    const newNode1Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 3);
    const newNode1Address = { host: '1.1.1.1', port: 1111 } as NodeAddress;
    await nodeGraph.setNode(newNode1Id, newNode1Address);
    // New node for bucket 255 (the highest possible bucket)
    const newNode2Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 255);
    const newNode2Address = { host: '2.2.2.2', port: 2222 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    const bucket3 = await nodeGraph.getBucket(3);
    const bucket351 = await nodeGraph.getBucket(255);
    if (bucket3 && bucket351) {
      expect(bucket3[newNode1Id]).toEqual({
        address: { host: '1.1.1.1', port: 1111 },
        lastUpdated: expect.any(Date),
      });
      expect(bucket351[newNode2Id]).toEqual({
        address: { host: '2.2.2.2', port: 2222 },
        lastUpdated: expect.any(Date),
      });
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }
  });
  test('deletes a single node (and removes bucket)', async () => {
    // New node for bucket 2
    const newNode1Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 2);
    const newNode1Address = { host: '4.4.4.4', port: 4444 } as NodeAddress;
    await nodeGraph.setNode(newNode1Id, newNode1Address);

    // Check the bucket is there first
    const bucket = await nodeGraph.getBucket(2);
    if (bucket) {
      expect(bucket[newNode1Id]).toEqual({
        address: { host: '4.4.4.4', port: 4444 },
        lastUpdated: expect.any(Date),
      });
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }

    // Delete the node
    await nodeGraph.unsetNode(newNode1Id);
    // Check bucket no longer exists
    const newBucket = await nodeGraph.getBucket(2);
    expect(newBucket).toBeUndefined();
  });
  test('deletes a single node (and retains remainder of bucket)', async () => {
    // Add 3 new nodes into bucket 4
    const bucketIndex = 4;
    const newNode1Id = nodesTestUtils.generateNodeIdForBucket(
      nodeId,
      bucketIndex,
      0,
    );
    const newNode1Address = { host: '4.4.4.4', port: 4444 } as NodeAddress;
    await nodeGraph.setNode(newNode1Id, newNode1Address);

    const newNode2Id = nodesTestUtils.generateNodeIdForBucket(
      nodeId,
      bucketIndex,
      1,
    );
    const newNode2Address = { host: '5.5.5.5', port: 5555 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    const newNode3Id = nodesTestUtils.generateNodeIdForBucket(
      nodeId,
      bucketIndex,
      2,
    );
    const newNode3Address = { host: '6.6.6.6', port: 6666 } as NodeAddress;
    await nodeGraph.setNode(newNode3Id, newNode3Address);
    // Based on XOR values, all 3 nodes should appear in bucket 4
    const bucket = await nodeGraph.getBucket(bucketIndex);
    if (bucket) {
      expect(bucket[newNode1Id]).toEqual({
        address: { host: '4.4.4.4', port: 4444 },
        lastUpdated: expect.any(Date),
      });
      expect(bucket[newNode2Id]).toEqual({
        address: { host: '5.5.5.5', port: 5555 },
        lastUpdated: expect.any(Date),
      });
      expect(bucket[newNode3Id]).toEqual({
        address: { host: '6.6.6.6', port: 6666 },
        lastUpdated: expect.any(Date),
      });
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }

    // Delete the node
    await nodeGraph.unsetNode(newNode1Id);
    // Check node no longer exists in the bucket
    const newBucket = await nodeGraph.getBucket(bucketIndex);
    if (newBucket) {
      expect(newBucket[newNode1Id]).toBeUndefined();
      expect(bucket[newNode2Id]).toEqual({
        address: { host: '5.5.5.5', port: 5555 },
        lastUpdated: expect.any(Date),
      });
      expect(bucket[newNode3Id]).toEqual({
        address: { host: '6.6.6.6', port: 6666 },
        lastUpdated: expect.any(Date),
      });
    } else {
      // Should be unreachable
      fail('New bucket undefined');
    }
  });
  test('enforces k-bucket size, removing least active node when a new node is discovered', async () => {
    // Add k nodes to the database (importantly, they all go into the same bucket)
    const bucketIndex = 59;
    // Keep a record of the first node ID that we added
    const firstNodeId = nodesTestUtils.generateNodeIdForBucket(
      nodeId,
      bucketIndex,
    );
    for (let i = 1; i <= nodeGraph.maxNodesPerBucket; i++) {
      // Add the current node ID
      const nodeAddress = {
        host: hostGen(i),
        port: i as Port,
      };
      await nodeGraph.setNode(
        nodesTestUtils.generateNodeIdForBucket(nodeId, bucketIndex, i),
        nodeAddress,
      );
      // Increment the current node ID
    }
    // All of these nodes are in bucket 59
    const originalBucket = await nodeGraph.getBucket(bucketIndex);
    if (originalBucket) {
      expect(Object.keys(originalBucket).length).toBe(
        nodeGraph.maxNodesPerBucket,
      );
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }

    // Attempt to add a new node into this full bucket (increment the last node
    // ID that was added)
    const newNodeId = nodesTestUtils.generateNodeIdForBucket(
      nodeId,
      bucketIndex,
      nodeGraph.maxNodesPerBucket + 1,
    );
    const newNodeAddress = { host: '0.0.0.1' as Host, port: 1234 as Port };
    await nodeGraph.setNode(newNodeId, newNodeAddress);

    const finalBucket = await nodeGraph.getBucket(bucketIndex);
    if (finalBucket) {
      // We should still have a full bucket (but no more)
      expect(Object.keys(finalBucket).length).toEqual(
        nodeGraph.maxNodesPerBucket,
      );
      // Ensure that this new node is in the bucket
      expect(finalBucket[newNodeId]).toEqual({
        address: newNodeAddress,
        lastUpdated: expect.any(Date),
      });
      // NODEID1 should have been removed from this bucket (as this was the least active)
      // The first node added should have been removed from this bucket (as this
      // was the least active, purely because it was inserted first)
      expect(finalBucket[firstNodeId]).toBeUndefined();
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }
  });
  test('enforces k-bucket size, retaining all nodes if adding a pre-existing node', async () => {
    // Add k nodes to the database (importantly, they all go into the same bucket)
    const bucketIndex = 59;
    const currNodeId = nodesTestUtils.generateNodeIdForBucket(
      nodeId,
      bucketIndex,
    );
    // Keep a record of the first node ID that we added
    // const firstNodeId = currNodeId;
    let increment = 1;
    for (let i = 1; i <= nodeGraph.maxNodesPerBucket; i++) {
      // Add the current node ID
      const nodeAddress = {
        host: hostGen(i),
        port: i as Port,
      };
      await nodeGraph.setNode(
        nodesTestUtils.generateNodeIdForBucket(nodeId, bucketIndex, increment),
        nodeAddress,
      );
      // Increment the current node ID - skip for the last one to keep currNodeId
      // as the last added node ID
      if (i !== nodeGraph.maxNodesPerBucket) {
        increment++;
      }
    }
    // All of these nodes are in bucket 59
    const originalBucket = await nodeGraph.getBucket(bucketIndex);
    if (originalBucket) {
      expect(Object.keys(originalBucket).length).toBe(
        nodeGraph.maxNodesPerBucket,
      );
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }

    // If we tried to re-add the first node, it would simply remove the original
    // first node, as this is the "least active"
    // We instead want to check that we don't mistakenly delete a node if we're
    // updating an existing one
    // So, re-add the last node
    const newLastAddress: NodeAddress = {
      host: '30.30.30.30' as Host,
      port: 30 as Port,
    };
    await nodeGraph.setNode(currNodeId, newLastAddress);

    const finalBucket = await nodeGraph.getBucket(bucketIndex);
    if (finalBucket) {
      // We should still have a full bucket
      expect(Object.keys(finalBucket).length).toEqual(
        nodeGraph.maxNodesPerBucket,
      );
      // Ensure that this new node is in the bucket
      expect(finalBucket[currNodeId]).toEqual({
        address: newLastAddress,
        lastUpdated: expect.any(Date),
      });
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }
  });
  test('retrieves all buckets (in expected lexicographic order)', async () => {
    // Bucket 0 is expected to never have any nodes (as nodeId XOR 0 = nodeId)
    // Bucket 1 (minimum):

    const node1Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 1);
    const node1Address = { host: '1.1.1.1', port: 1111 } as NodeAddress;
    await nodeGraph.setNode(node1Id, node1Address);

    // Bucket 4 (multiple nodes in 1 bucket):
    const node41Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 4);
    const node41Address = { host: '41.41.41.41', port: 4141 } as NodeAddress;
    await nodeGraph.setNode(node41Id, node41Address);
    const node42Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 4, 1);
    const node42Address = { host: '42.42.42.42', port: 4242 } as NodeAddress;
    await nodeGraph.setNode(node42Id, node42Address);

    // Bucket 10 (lexicographic ordering - should appear after 2):
    const node10Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 10);
    const node10Address = { host: '10.10.10.10', port: 1010 } as NodeAddress;
    await nodeGraph.setNode(node10Id, node10Address);

    // Bucket 255 (maximum):
    const node255Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 255);
    const node255Address = {
      host: '255.255.255.255',
      port: 255,
    } as NodeAddress;
    await nodeGraph.setNode(node255Id, node255Address);

    const buckets = await nodeGraph.getAllBuckets();
    expect(buckets.length).toBe(4);
    // Buckets should be returned in lexicographic ordering (using hex keys to
    // ensure the bucket indexes are in numberical order)
    expect(buckets).toEqual([
      {
        [node1Id]: {
          address: { host: '1.1.1.1', port: 1111 },
          lastUpdated: expect.any(String),
        },
      },
      {
        [node41Id]: {
          address: { host: '41.41.41.41', port: 4141 },
          lastUpdated: expect.any(String),
        },
        [node42Id]: {
          address: { host: '42.42.42.42', port: 4242 },
          lastUpdated: expect.any(String),
        },
      },
      {
        [node10Id]: {
          address: { host: '10.10.10.10', port: 1010 },
          lastUpdated: expect.any(String),
        },
      },
      {
        [node255Id]: {
          address: { host: '255.255.255.255', port: 255 },
          lastUpdated: expect.any(String),
        },
      },
    ]);
  });
  test(
    'refreshes buckets',
    async () => {
      const initialNodes: Record<NodeId, NodeData> = {};
      // Generate and add some nodes
      for (let i = 1; i < 255; i += 20) {
        const newNodeId = nodesTestUtils.generateNodeIdForBucket(
          keyManager.getNodeId(),
          i,
        );
        const nodeAddress = {
          host: hostGen(i),
          port: i as Port,
        };
        await nodeGraph.setNode(newNodeId, nodeAddress);
        initialNodes[newNodeId] = {
          id: newNodeId,
          address: nodeAddress,
          distance: nodesUtils.calculateDistance(
            keyManager.getNodeId(),
            newNodeId,
          ),
        };
      }

      // Renew the keypair
      await keyManager.renewRootKeyPair('newPassword');
      // Reset the test's node ID state
      nodeId = keyManager.getNodeId();
      // Refresh the buckets
      await nodeGraph.refreshBuckets();

      // Get all the new buckets, and expect that each node is in the correct bucket
      const newBuckets = await nodeGraph.getAllBuckets();
      let nodeCount = 0;
      for (const b of newBuckets) {
        for (const n of Object.keys(b)) {
          const nodeId = IdInternal.fromString<NodeId>(n);
          // Check that it was a node in the original DB
          expect(initialNodes[nodeId]).toBeDefined();
          // Check it's in the correct bucket
          const expectedIndex = nodesUtils.calculateBucketIndex(
            keyManager.getNodeId(),
            nodeId,
          );
          const expectedBucket = await nodeGraph.getBucket(expectedIndex);
          expect(expectedBucket).toBeDefined();
          expect(expectedBucket![nodeId]).toBeDefined();
          // Check it has the correct address
          expect(b[nodeId].address).toEqual(initialNodes[nodeId].address);
          nodeCount++;
        }
      }
      // We had less than k (20) nodes, so we expect that all nodes will be re-added
      // If we had more than k nodes, we may lose some of them (because the nodes
      // may be re-added to newly full buckets)
      expect(Object.keys(initialNodes).length).toEqual(nodeCount);
    },
    global.defaultTimeout * 4,
  );
  test('updates node', async () => {
    // New node added
    const node1Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 2);
    const node1Address = { host: '1.1.1.1', port: 1 } as NodeAddress;
    await nodeGraph.setNode(node1Id, node1Address);

    // Check new node is in retrieved bucket from database
    const bucket = await nodeGraph.getBucket(2);
    const time1 = bucket![node1Id].lastUpdated;

    // Update node and check that time is later
    const newNode1Address = { host: '2.2.2.2', port: 2 } as NodeAddress;
    await nodeGraph.updateNode(node1Id, newNode1Address);

    const bucket2 = await nodeGraph.getBucket(2);
    const time2 = bucket2![node1Id].lastUpdated;
    expect(bucket2![node1Id].address).toEqual(newNode1Address);
    expect(time1 < time2).toBeTruthy();
  });
});
