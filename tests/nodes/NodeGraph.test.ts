import type { NodeGraph } from '@/nodes';
import type { Host, Port } from '@/network/types';
import type { NodeId, NodeAddress, NodeData } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { NodeManager, errors as nodesErrors } from '@/nodes';
import { KeyManager, utils as keysUtils } from '@/keys';
import { ForwardProxy, ReverseProxy } from '@/network';
import * as nodesUtils from '@/nodes/utils';
import { Sigchain } from '@/sigchain';
import { makeNodeId } from '@/nodes/utils';
import * as nodesTestUtils from './utils';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

// FIXME, some of these tests fail randomly.
describe('NodeGraph', () => {
  const password = 'password';
  let nodeGraph: NodeGraph;
  let nodeId: NodeId;

  const nodeId1 = makeNodeId(
    new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 5,
    ]),
  );
  const nodeId2 = makeNodeId(
    new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 8,
    ]),
  );
  const nodeId3 = makeNodeId(
    new Uint8Array([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 124,
    ]),
  );
  // Const nodeId2 = makeNodeId('vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg');
  // const nodeId3 = makeNodeId('v359vgrgmqf1r5g4fvisiddjknjko6bmm4qv7646jr7fi9enbfuug');
  const dummyNode = makeNodeId(
    'vi3et1hrpv2m2lrplcm7cu913kr45v51cak54vm68anlbvuf83ra0',
  );

  const logger = new Logger('NodeGraph Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
  let nodeManager: NodeManager;
  let sigchain: Sigchain;

  const nodeIdGenerator = (number: number) => {
    const idArray = new Uint8Array([
      223,
      24,
      34,
      40,
      46,
      217,
      4,
      71,
      103,
      71,
      59,
      123,
      143,
      187,
      9,
      29,
      157,
      41,
      131,
      44,
      68,
      160,
      79,
      127,
      137,
      154,
      221,
      86,
      157,
      23,
      77,
      number,
    ]);
    return makeNodeId(idArray);
  };

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    fwdProxy = new ForwardProxy({
      authToken: 'auth',
      logger: logger,
    });

    revProxy = new ReverseProxy({
      logger: logger,
    });

    await fwdProxy.start({
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
      }
    });
    sigchain = await Sigchain.createSigchain({
      keyManager: keyManager,
      db: db,
      logger: logger,
    });
    nodeManager = await NodeManager.createNodeManager({
      db: db,
      sigchain: sigchain,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      logger: logger,
    });
    // Retrieve the NodeGraph reference from NodeManager
    // @ts-ignore
    nodeGraph = nodeManager.nodeGraph;
    nodeId = nodeManager.getNodeId();
  });

  afterEach(async () => {
    await nodeManager.clearDB();
  });

  afterAll(async () => {
    await db.stop();
    await sigchain.stop();
    await nodeManager.stop();
    await keyManager.stop();
    await fwdProxy.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('NodeGraph readiness', async () => {
    const nodeManager2 = await NodeManager.createNodeManager({
      db: db,
      sigchain: sigchain,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      logger: logger,
    });
    // @ts-ignore
    const nodeGraph = nodeManager2.nodeGraph;
    await expect(nodeGraph.destroy()).rejects.toThrow(
      nodesErrors.ErrorNodeGraphRunning,
    );
    // Should be a noop
    await nodeGraph.start();
    await nodeGraph.stop();
    await nodeGraph.destroy();
    await expect(async () => {
      await nodeGraph.start();
    }).rejects.toThrow(nodesErrors.ErrorNodeGraphDestroyed);
    expect(() => {
      nodeGraph.getNodeId();
    }).toThrow(nodesErrors.ErrorNodeGraphNotRunning);
    await expect(async () => {
      await nodeGraph.getBucket(0);
    }).rejects.toThrow(nodesErrors.ErrorNodeGraphNotRunning);
    await nodeManager2.stop();
    await nodeManager2.destroy();
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
    const newNode1Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 4);
    const newNode1Address = { host: '4.4.4.4', port: 4444 } as NodeAddress;
    await nodeGraph.setNode(newNode1Id, newNode1Address);

    const newNode2Id = nodesTestUtils.incrementNodeId(newNode1Id);
    const newNode2Address = { host: '5.5.5.5', port: 5555 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    const newNode3Id = nodesTestUtils.incrementNodeId(newNode2Id);
    const newNode3Address = { host: '6.6.6.6', port: 6666 } as NodeAddress;
    await nodeGraph.setNode(newNode3Id, newNode3Address);
    // Based on XOR values, all 3 nodes should appear in bucket 4.
    const bucket = await nodeGraph.getBucket(4);
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

    // Check the bucket is there first.
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
    const newNode1Id = nodesTestUtils.generateNodeIdForBucket(nodeId, 4);
    const newNode1Address = { host: '4.4.4.4', port: 4444 } as NodeAddress;
    await nodeGraph.setNode(newNode1Id, newNode1Address);

    const newNode2Id = nodesTestUtils.incrementNodeId(newNode1Id);
    const newNode2Address = { host: '5.5.5.5', port: 5555 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    const newNode3Id = nodesTestUtils.incrementNodeId(newNode2Id);
    const newNode3Address = { host: '6.6.6.6', port: 6666 } as NodeAddress;
    await nodeGraph.setNode(newNode3Id, newNode3Address);
    // Based on XOR values, all 3 nodes should appear in bucket 4.
    const bucket = await nodeGraph.getBucket(4);
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
    const newBucket = await nodeGraph.getBucket(4);
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
    let currNodeId = nodesTestUtils.generateNodeIdForBucket(nodeId, 59);
    // Keep a record of the first node ID that we added
    const firstNodeId = currNodeId;
    for (let i = 1; i <= nodeGraph.maxNodesPerBucket; i++) {
      // Add the current node ID
      const nodeAddress = {
        host: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await nodeGraph.setNode(currNodeId, nodeAddress);
      // Increment the current node ID
      const incrementedNodeId = nodesTestUtils.incrementNodeId(currNodeId);
      currNodeId = incrementedNodeId;
    }
    // All of these nodes are in bucket 59
    const originalBucket = await nodeGraph.getBucket(59);
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
    const newNodeId = nodesTestUtils.incrementNodeId(currNodeId);
    const newNodeAddress = { host: '0.0.0.1' as Host, port: 1234 as Port };
    await nodeGraph.setNode(newNodeId, newNodeAddress);

    const finalBucket = await nodeGraph.getBucket(59);
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
      // was the least active, purely because it was inserted first).
      expect(finalBucket[firstNodeId]).toBeUndefined();
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }
  });
  test('enforces k-bucket size, retaining all nodes if adding a pre-existing node', async () => {
    // Add k nodes to the database (importantly, they all go into the same bucket)
    let currNodeId = nodesTestUtils.generateNodeIdForBucket(nodeId, 59);
    // Keep a record of the first node ID that we added
    // const firstNodeId = currNodeId;
    for (let i = 1; i <= nodeGraph.maxNodesPerBucket; i++) {
      // Add the current node ID
      const nodeAddress = {
        host: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await nodeGraph.setNode(currNodeId, nodeAddress);
      // Increment the current node ID - skip for the last one to keep currNodeId
      // as the last added node ID
      if (i !== nodeGraph.maxNodesPerBucket) {
        const incrementedNodeId = nodesTestUtils.incrementNodeId(currNodeId);
        currNodeId = incrementedNodeId;
      }
    }
    // All of these nodes are in bucket 59
    const originalBucket = await nodeGraph.getBucket(59);
    if (originalBucket) {
      expect(Object.keys(originalBucket).length).toBe(
        nodeGraph.maxNodesPerBucket,
      );
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }

    // If we tried to re-add the first node, it would simply remove the original
    // first node, as this is the "least active".
    // We instead want to check that we don't mistakenly delete a node if we're
    // updating an existing one.
    // So, re-add the last node
    const newLastAddress: NodeAddress = {
      host: '30.30.30.30' as Host,
      port: 30 as Port,
    };
    await nodeGraph.setNode(currNodeId, newLastAddress);

    const finalBucket = await nodeGraph.getBucket(59);
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
    const node42Id = nodesTestUtils.incrementNodeId(node41Id);
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
          nodeManager.getNodeId(),
          i,
        );
        const nodeAddress = {
          host: (i + '.' + i + '.' + i + '.' + i) as Host,
          port: i as Port,
        };
        await nodeGraph.setNode(newNodeId, nodeAddress);
        initialNodes[newNodeId] = {
          id: newNodeId,
          address: nodeAddress,
          distance: nodesUtils.calculateDistance(
            nodeManager.getNodeId(),
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
          const nodeId = makeNodeId(n);
          // Check that it was a node in the original DB
          expect(initialNodes[nodeId]).toBeDefined();
          // Check it's in the correct bucket
          const expectedIndex = nodesUtils.calculateBucketIndex(
            nodeGraph.getNodeId(),
            nodeId,
            nodeGraph.nodeIdBits,
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
  test('finds a single closest node', async () => {
    // New node added
    const newNode2Id = nodeId1;
    const newNode2Address = { host: '227.1.1.1', port: 4567 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    // Find the closest nodes to some node, NODEID3
    const closest = await nodeGraph.getClosestLocalNodes(nodeId3);
    expect(closest).toContainEqual({
      id: newNode2Id,
      distance: 121n,
      address: { host: '227.1.1.1', port: 4567 },
    });
  });
  test('finds 3 closest nodes', async () => {
    // Add 3 nodes
    await nodeGraph.setNode(nodeId1, {
      host: '2.2.2.2',
      port: 2222,
    } as NodeAddress);
    await nodeGraph.setNode(nodeId2, {
      host: '3.3.3.3',
      port: 3333,
    } as NodeAddress);
    await nodeGraph.setNode(nodeId3, {
      host: '4.4.4.4',
      port: 4444,
    } as NodeAddress);

    // Find the closest nodes to some node, NODEID4
    const closest = await nodeGraph.getClosestLocalNodes(nodeId3);
    expect(closest.length).toBe(3);
    expect(closest).toContainEqual({
      id: nodeId3,
      distance: 0n,
      address: { host: '4.4.4.4', port: 4444 },
    });
    expect(closest).toContainEqual({
      id: nodeId2,
      distance: 116n,
      address: { host: '3.3.3.3', port: 3333 },
    });
    expect(closest).toContainEqual({
      id: nodeId1,
      distance: 121n,
      address: { host: '2.2.2.2', port: 2222 },
    });
  });
  test('finds the 20 closest nodes', async () => {
    // Generate the node ID to find the closest nodes to (in bucket 100)
    const nodeIdToFind = nodesTestUtils.generateNodeIdForBucket(nodeId, 100);
    // Now generate and add 20 nodes that will be close to this node ID
    const addedClosestNodes: NodeData[] = [];
    for (let i = 1; i < 101; i += 5) {
      const closeNodeId = nodesTestUtils.generateNodeIdForBucket(
        nodeIdToFind,
        i,
      );
      const nodeAddress = {
        host: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await nodeGraph.setNode(closeNodeId, nodeAddress);
      addedClosestNodes.push({
        id: closeNodeId,
        address: nodeAddress,
        distance: nodesUtils.calculateDistance(nodeIdToFind, closeNodeId),
      });
    }
    // Now create and add 10 more nodes that are far away from this node
    for (let i = 1; i <= 10; i++) {
      const farNodeId = nodeIdGenerator(i);
      const nodeAddress = {
        host: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await nodeGraph.setNode(farNodeId, nodeAddress);
    }

    // Find the closest nodes to the original generated node ID
    const closest = await nodeGraph.getClosestLocalNodes(nodeIdToFind);
    // We should always only receive k nodes
    expect(closest.length).toBe(nodeGraph.maxNodesPerBucket);
    // Retrieved closest nodes should be exactly the same as the ones we added
    expect(closest).toEqual(addedClosestNodes);
  });
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
