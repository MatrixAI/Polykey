import type { NodeId, NodeAddress } from '@/nodes/types';
import type { Host, Port } from '@/network/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import { NodeGraph, NodeManager } from '@/nodes';
import { KeyManager } from '@/keys';
import { ForwardProxy, ReverseProxy } from '@/network';
import { DB } from '@/db';
import { Sigchain } from '@/sigchain';

describe('NodeGraph', () => {
  const logger = new Logger('NodeGraph Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const fwdProxy = new ForwardProxy({
    authToken: 'auth',
    logger: logger,
  });
  const revProxy = new ReverseProxy({
    logger: logger,
  });
  let dataDir: string;
  let keyManager: KeyManager;
  let keyPairPem, certPem;
  let db: DB;
  let nodeManager: NodeManager;
  let sigchain: Sigchain;
  const nodeId = 'NODEID' as NodeId;

  beforeAll(async () => {
    const keyPair = await keysUtils.generateKeyPair(4096);
    keyPairPem = keysUtils.keyPairToPem(keyPair);
    const cert = keysUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      keyPair.privateKey,
      86400,
    );
    certPem = keysUtils.certToPem(cert);
  });

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem,
        certChainPem: certPem,
      },
    });
    const dbPath = `${dataDir}/db`;
    db = new DB({ dbPath, logger });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
    sigchain = new Sigchain({
      keyManager: keyManager,
      db: db,
      logger: logger,
    });
    await sigchain.start();
    nodeManager = new NodeManager({
      db: db,
      sigchain: sigchain,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      logger: logger,
    });
    await nodeManager.start({
      nodeId: nodeId,
    });
  });
  afterEach(async () => {
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

  test('finds correct node address', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'NODEID1' as NodeId;
    await nodeGraph.start({ nodeId });

    // New node added
    const newNode2Id = 'NODEID2' as NodeId;
    const newNode2Address = { ip: '227.1.1.1', port: 4567 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    // Get node address
    const foundAddress = await nodeGraph.getNode(newNode2Id);
    expect(foundAddress).toEqual({ ip: '227.1.1.1', port: 4567 });
  });
  test('unable to find node address', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'NODEID1' as NodeId;
    await nodeGraph.start({ nodeId });

    // New node added
    const newNode2Id = 'NODEID2' as NodeId;
    const newNode2Address = { ip: '227.1.1.1', port: 4567 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    // Get node address (of non-existent node)
    const foundAddress = await nodeGraph.getNode('NONEXISTING' as NodeId);
    expect(foundAddress).toBeUndefined();
  });
  test('adds a single node into a bucket', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'NODEID1' as NodeId;
    await nodeGraph.start({ nodeId });

    // New node added
    const newNode2Id = 'NODEID2' as NodeId;
    const newNode2Address = { ip: '227.1.1.1', port: 4567 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    // Check new node is in retrieved bucket from database
    // bucketIndex = 1 as "NODEID1" XOR "NODEID2" = 3
    const bucket = await nodeGraph.getBucket(1);
    if (bucket) {
      expect(bucket['NODEID2']).toEqual({
        address: { ip: '227.1.1.1', port: 4567 },
        lastUpdated: expect.any(Date),
      });
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }
    await nodeGraph.stop();
  });
  test('adds multiple nodes into the same bucket', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'NODEID1' as NodeId;
    await nodeGraph.start({ nodeId });

    // Add new nodes 4,5,6
    // "NODEID1" XOR "NODEID4" = 5
    const newNode4Id = 'NODEID4' as NodeId;
    const newNode4Address = { ip: '4.4.4.4', port: 4444 } as NodeAddress;
    await nodeGraph.setNode(newNode4Id, newNode4Address);
    // "NODEID1" XOR "NODEID5" = 4
    const newNode5Id = 'NODEID5' as NodeId;
    const newNode5Address = { ip: '5.5.5.5', port: 5555 } as NodeAddress;
    await nodeGraph.setNode(newNode5Id, newNode5Address);
    // "NODEID1" XOR "NODEID6" = 7
    const newNode6Id = 'NODEID6' as NodeId;
    const newNode6Address = { ip: '6.6.6.6', port: 6666 } as NodeAddress;
    await nodeGraph.setNode(newNode6Id, newNode6Address);
    // Based on XOR values, all 3 nodes should appear in bucket 2.
    const bucket = await nodeGraph.getBucket(2);
    if (bucket) {
      expect(bucket['NODEID4']).toEqual({
        address: { ip: '4.4.4.4', port: 4444 },
        lastUpdated: expect.any(Date),
      });
      expect(bucket['NODEID5']).toEqual({
        address: { ip: '5.5.5.5', port: 5555 },
        lastUpdated: expect.any(Date),
      });
      expect(bucket['NODEID6']).toEqual({
        address: { ip: '6.6.6.6', port: 6666 },
        lastUpdated: expect.any(Date),
      });
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }
    await nodeGraph.stop();
  });
  test('adds a single node into different buckets', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'IY2M0YTI5YzdhMTUzNGFjYWIxNmNiNGNmNTFiYTBjYTg' as NodeId;
    await nodeGraph.start({ nodeId });

    // Add new nodes 4,5,6
    // nodeId XOR newNode1Id = 15 = bucket 3
    const newNode1Id = 'IY2M0YTI5YzdhMTUzNGFjYWIxNmNiNGNmNTFiYTBjYTh' as NodeId;
    const newNode1Address = { ip: '1.1.1.1', port: 1111 } as NodeAddress;
    await nodeGraph.setNode(newNode1Id, newNode1Address);
    // nodeId XOR newNode2Id = 4211085846895002624687970000068745351508688069691
    // 47404969321699674322715705618317159314970018083504143
    // = bucket 337 (lies between 2^337 and 2^338)
    const newNode2Id = 'IZ0PYWTI5YzdhMTUzNGFjYWIxNmNiNGNmNTFiYTBjYTh' as NodeId;
    const newNode2Address = { ip: '2.2.2.2', port: 2222 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    const bucket3 = await nodeGraph.getBucket(3);
    const bucket337 = await nodeGraph.getBucket(337);
    if (bucket3 && bucket337) {
      expect(bucket3['IY2M0YTI5YzdhMTUzNGFjYWIxNmNiNGNmNTFiYTBjYTh']).toEqual({
        address: { ip: '1.1.1.1', port: 1111 },
        lastUpdated: expect.any(Date),
      });
      expect(bucket337['IZ0PYWTI5YzdhMTUzNGFjYWIxNmNiNGNmNTFiYTBjYTh']).toEqual(
        {
          address: { ip: '2.2.2.2', port: 2222 },
          lastUpdated: expect.any(Date),
        },
      );
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }
    await nodeGraph.stop();
  });
  test('deletes a single node (and removes bucket)', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'NODEID1' as NodeId;
    await nodeGraph.start({ nodeId });

    // Add new nodes 4,5,6
    // "NODEID1" XOR "NODEID4" = 5
    const newNode4Id = 'NODEID4' as NodeId;
    const newNode4Address = { ip: '4.4.4.4', port: 4444 } as NodeAddress;
    await nodeGraph.setNode(newNode4Id, newNode4Address);

    // Based on XOR values, the node should appear in bucket 2.
    // Check it's in there first
    const bucket = await nodeGraph.getBucket(2);
    if (bucket) {
      expect(bucket['NODEID4']).toEqual({
        address: { ip: '4.4.4.4', port: 4444 },
        lastUpdated: expect.any(Date),
      });
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }

    // Delete the node
    await nodeGraph.unsetNode(newNode4Id);
    // Check bucket no longer exists
    const newBucket = await nodeGraph.getBucket(2);
    expect(newBucket).toBeUndefined();

    await nodeGraph.stop();
  });
  test('deletes a single node (and retains remainder of bucket)', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'NODEID1' as NodeId;
    await nodeGraph.start({ nodeId });

    // Add new nodes 4,5,6
    // "NODEID1" XOR "NODEID4" = 5
    const newNode4Id = 'NODEID4' as NodeId;
    const newNode4Address = { ip: '4.4.4.4', port: 4444 } as NodeAddress;
    await nodeGraph.setNode(newNode4Id, newNode4Address);
    // "NODEID1" XOR "NODEID5" = 4
    const newNode5Id = 'NODEID5' as NodeId;
    const newNode5Address = { ip: '5.5.5.5', port: 5555 } as NodeAddress;
    await nodeGraph.setNode(newNode5Id, newNode5Address);
    // "NODEID1" XOR "NODEID6" = 7
    const newNode6Id = 'NODEID6' as NodeId;
    const newNode6Address = { ip: '6.6.6.6', port: 6666 } as NodeAddress;
    await nodeGraph.setNode(newNode6Id, newNode6Address);
    // Based on XOR values, all 3 nodes should appear in bucket 2.
    const bucket = await nodeGraph.getBucket(2);
    if (bucket) {
      expect(bucket['NODEID4']).toEqual({
        address: { ip: '4.4.4.4', port: 4444 },
        lastUpdated: expect.any(Date),
      });
      expect(bucket['NODEID5']).toEqual({
        address: { ip: '5.5.5.5', port: 5555 },
        lastUpdated: expect.any(Date),
      });
      expect(bucket['NODEID6']).toEqual({
        address: { ip: '6.6.6.6', port: 6666 },
        lastUpdated: expect.any(Date),
      });
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }

    // Delete the node
    await nodeGraph.unsetNode(newNode4Id);
    // Check node no longer exists in the bucket
    const newBucket = await nodeGraph.getBucket(2);
    if (newBucket) {
      expect(newBucket['NODEID4']).toBeUndefined();
      expect(bucket['NODEID5']).toEqual({
        address: { ip: '5.5.5.5', port: 5555 },
        lastUpdated: expect.any(Date),
      });
      expect(bucket['NODEID6']).toEqual({
        address: { ip: '6.6.6.6', port: 6666 },
        lastUpdated: expect.any(Date),
      });
    } else {
      // Should be unreachable
      fail('New bucket undefined');
    }
    await nodeGraph.stop();
  });
  test('enforces k-bucket size, removing least active node when a new node is discovered', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'A' as NodeId;
    await nodeGraph.start({ nodeId });

    // Add k nodes to the database (importantly, they all go into the same bucket)
    // Assumes that k will not be >= 100
    for (let i = 1; i <= nodeGraph.maxNodesPerBucket; i++) {
      let nodeId;
      if (i < 10) {
        nodeId = ('NODEID0' + i) as NodeId;
      } else if (i < 100) {
        nodeId = ('NODEID' + i) as NodeId;
      }
      const nodeAddress = {
        ip: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await nodeGraph.setNode(nodeId, nodeAddress);
    }
    // All of these nodes are in bucket 59
    const originalBucket = await nodeGraph.getBucket(
      nodesUtils.calculateBucketIndex(
        'A' as NodeId,
        'NODEID01' as NodeId,
        nodeGraph.nodeIdBits,
      ),
    );
    if (originalBucket) {
      expect(Object.keys(originalBucket).length).toBe(
        nodeGraph.maxNodesPerBucket,
      );
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }

    // Attempt to add a new node into this full bucket
    const newNodeId = ('NODEID' + (nodeGraph.maxNodesPerBucket + 1)) as NodeId;
    const newNodeAddress = { ip: '1.1.1.1' as Host, port: 1111 as Port };
    await nodeGraph.setNode(newNodeId, newNodeAddress);

    const finalBucket = await nodeGraph.getBucket(
      nodesUtils.calculateBucketIndex(
        'A' as NodeId,
        'NODEID01' as NodeId,
        nodeGraph.nodeIdBits,
      ),
    );
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
      // In our case, it's simply because it was inserted first.
      expect(finalBucket['NODEID01']).toBeUndefined();
    } else {
      // Should be unreachable
      fail('Bucket undefined');
    }

    await nodeGraph.stop();
  });
  test('retrieves all buckets', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as NodeId;
    await nodeGraph.start({ nodeId });

    // Bucket 0 is expected to never have any nodes (as nodeId XOR 0 = nodeId)
    // Bucket 1 (minimum):
    const node1Id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab' as NodeId;
    const node1Address = { ip: '1.1.1.1', port: 1111 } as NodeAddress;
    await nodeGraph.setNode(node1Id, node1Address);

    // Bucket 2 (multiple nodes in 1 bucket):
    const node21Id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad' as NodeId;
    const node21Address = { ip: '21.21.21.21', port: 2222 } as NodeAddress;
    await nodeGraph.setNode(node21Id, node21Address);
    const node22Id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaae' as NodeId;
    const node22Address = { ip: '22.22.22.22', port: 2222 } as NodeAddress;
    await nodeGraph.setNode(node22Id, node22Address);

    // Bucket 10 (lexicographic ordering - should appear after 2):
    const node10Id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadb' as NodeId;
    const node10Address = { ip: '10.10.10.10', port: 1010 } as NodeAddress;
    await nodeGraph.setNode(node10Id, node10Address);

    // Bucket 351 (maximum):
    const node351Id = 'ÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿ' as NodeId;
    const node351Address = { ip: '351.351.351.351', port: 351 } as NodeAddress;
    await nodeGraph.setNode(node351Id, node351Address);

    const buckets = await nodeGraph.getAllBuckets();
    expect(buckets.length).toBe(4);
    // Bucket 1:
    expect(buckets).toContainEqual({
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab: {
        address: { ip: '1.1.1.1', port: 1111 },
        lastUpdated: expect.any(String),
      },
    });
    // Bucket 2 (multiple nodes in 1 bucket):
    expect(buckets).toContainEqual({
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaad: {
        address: { ip: '21.21.21.21', port: 2222 },
        lastUpdated: expect.any(String),
      },
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaae: {
        address: { ip: '22.22.22.22', port: 2222 },
        lastUpdated: expect.any(String),
      },
    });
    // Bucket 351:
    expect(buckets).toContainEqual({
      ÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿÿ: {
        address: { ip: '351.351.351.351', port: 351 },
        lastUpdated: expect.any(String),
      },
    });

    await nodeGraph.stop();
  });
  test('finds a single closest node', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'NODEID1' as NodeId;
    await nodeGraph.start({ nodeId });

    // New node added
    const newNode2Id = 'NODEID2' as NodeId;
    const newNode2Address = { ip: '227.1.1.1', port: 4567 } as NodeAddress;
    await nodeGraph.setNode(newNode2Id, newNode2Address);

    // Find the closest nodes to some node, NODEID3
    const closest = await nodeGraph.getClosestLocalNodes('NODEID3' as NodeId);
    expect(closest).toContainEqual({
      id: 'NODEID2',
      distance: 1n,
      address: { ip: '227.1.1.1', port: 4567 },
    });

    await nodeGraph.stop();
  });
  test('finds 3 closest nodes', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'NODEID1' as NodeId;
    await nodeGraph.start({ nodeId });

    // Add 3 nodes
    await nodeGraph.setNode(
      'NODEID2' as NodeId,
      { ip: '2.2.2.2', port: 2222 } as NodeAddress,
    );
    await nodeGraph.setNode(
      'NODEID3' as NodeId,
      { ip: '3.3.3.3', port: 3333 } as NodeAddress,
    );
    await nodeGraph.setNode(
      'NODEID4' as NodeId,
      { ip: '4.4.4.4', port: 4444 } as NodeAddress,
    );

    // Find the closest nodes to some node, NODEID4
    const closest = await nodeGraph.getClosestLocalNodes('NODEID4' as NodeId);
    expect(closest.length).toBe(3);
    expect(closest).toContainEqual({
      id: 'NODEID4',
      distance: 0n,
      address: { ip: '4.4.4.4', port: 4444 },
    });
    expect(closest).toContainEqual({
      id: 'NODEID2',
      distance: 6n,
      address: { ip: '2.2.2.2', port: 2222 },
    });
    expect(closest).toContainEqual({
      id: 'NODEID3',
      distance: 7n,
      address: { ip: '3.3.3.3', port: 3333 },
    });

    await nodeGraph.stop();
  });
  test('finds the 20 closest nodes', async () => {
    const nodeGraph = new NodeGraph({ db, nodeManager, logger });
    const nodeId = 'NODEID0' as NodeId;
    await nodeGraph.start({ nodeId });

    // Add 30 nodes to the buckets
    for (let i = 1; i <= 30; i++) {
      const nodeId = ('NODEID' + i) as NodeId;
      const nodeAddress = {
        ip: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await nodeGraph.setNode(nodeId, nodeAddress);
    }

    // Find the closest nodes to some node, NODEID10
    const closest = await nodeGraph.getClosestLocalNodes('NODEID10' as NodeId);
    expect(closest.length).toBe(20);
    // Sufficient to do .toEqual() here because we know the order of the returned
    // nodes will be sorted on the distance
    expect(closest).toEqual([
      {
        id: 'NODEID10',
        address: { ip: '10.10.10.10', port: 10 },
        distance: 0n,
      },
      {
        id: 'NODEID11',
        address: { ip: '11.11.11.11', port: 11 },
        distance: 1n,
      },
      {
        id: 'NODEID12',
        address: { ip: '12.12.12.12', port: 12 },
        distance: 2n,
      },
      {
        id: 'NODEID13',
        address: { ip: '13.13.13.13', port: 13 },
        distance: 3n,
      },
      {
        id: 'NODEID14',
        address: { ip: '14.14.14.14', port: 14 },
        distance: 4n,
      },
      {
        id: 'NODEID15',
        address: { ip: '15.15.15.15', port: 15 },
        distance: 5n,
      },
      {
        id: 'NODEID16',
        address: { ip: '16.16.16.16', port: 16 },
        distance: 6n,
      },
      {
        id: 'NODEID17',
        address: { ip: '17.17.17.17', port: 17 },
        distance: 7n,
      },
      {
        id: 'NODEID18',
        address: { ip: '18.18.18.18', port: 18 },
        distance: 8n,
      },
      {
        id: 'NODEID19',
        address: { ip: '19.19.19.19', port: 19 },
        distance: 9n,
      },
      {
        id: 'NODEID1',
        address: { ip: '1.1.1.1', port: 1 },
        distance: 255n,
      },
      {
        id: 'NODEID30',
        address: { ip: '30.30.30.30', port: 30 },
        distance: 512n,
      },
      {
        id: 'NODEID3',
        address: { ip: '3.3.3.3', port: 3 },
        distance: 767n,
      },
      {
        id: 'NODEID20',
        address: { ip: '20.20.20.20', port: 20 },
        distance: 768n,
      },
      {
        id: 'NODEID21',
        address: { ip: '21.21.21.21', port: 21 },
        distance: 769n,
      },
      {
        id: 'NODEID22',
        address: { ip: '22.22.22.22', port: 22 },
        distance: 770n,
      },
      {
        id: 'NODEID23',
        address: { ip: '23.23.23.23', port: 23 },
        distance: 771n,
      },
      {
        id: 'NODEID24',
        address: { ip: '24.24.24.24', port: 24 },
        distance: 772n,
      },
      {
        id: 'NODEID25',
        address: { ip: '25.25.25.25', port: 25 },
        distance: 773n,
      },
      {
        id: 'NODEID26',
        address: { ip: '26.26.26.26', port: 26 },
        distance: 774n,
      },
    ]);
    await nodeGraph.stop();
  });
});
