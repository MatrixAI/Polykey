import type { CertificatePem, KeyPairPem, PublicKeyPem } from '@/keys/types';
import type { Host, Port } from '@/network/types';
import type { NodeId, NodeAddress } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import UTP from 'utp-native';
import PolykeyAgent from '@/PolykeyAgent';
import KeyManager from '@/keys/KeyManager';
import * as keysUtils from '@/keys/utils';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import Proxy from '@/network/Proxy';
import Sigchain from '@/sigchain/Sigchain';
import * as claimsUtils from '@/claims/utils';
import { promisify, sleep } from '@/utils';
import * as nodesUtils from '@/nodes/utils';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as nodesTestUtils from './utils';

describe(`${NodeManager.name} test`, () => {
  const password = 'password';
  const logger = new Logger(`${NodeManager.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodeGraph: NodeGraph;
  let nodeConnectionManager: NodeConnectionManager;
  let proxy: Proxy;
  let keyManager: KeyManager;
  let keyPairPem: KeyPairPem;
  let certPem: CertificatePem;
  let db: DB;
  let sigchain: Sigchain;
  let utpSocket: UTP;

  const serverHost = '::1' as Host;
  const externalHost = '127.0.0.1' as Host;
  const serverPort = 0 as Port;
  const externalPort = 0 as Port;
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

    const cert = keyManager.getRootCert();
    keyPairPem = keyManager.getRootKeyPairPem();
    certPem = keysUtils.certToPem(cert);

    proxy = new Proxy({
      authToken: 'abc',
      logger: logger,
    });
    utpSocket = new UTP({ allowHalfOpen: true });
    const utpSocketBind = promisify(utpSocket.bind).bind(utpSocket);
    await utpSocketBind(55555, '127.0.0.1');
    await proxy.start({
      serverHost,
      serverPort,
      proxyHost: externalHost,
      proxyPort: externalPort,
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
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
    sigchain = await Sigchain.createSigchain({ keyManager, db, logger });

    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyManager,
      nodeGraph,
      proxy,
      logger,
    });
    await nodeConnectionManager.start();
  });
  afterEach(async () => {
    await nodeConnectionManager.stop();
    await nodeGraph.stop();
    await nodeGraph.destroy();
    await sigchain.stop();
    await sigchain.destroy();
    await db.stop();
    await db.destroy();
    await keyManager.stop();
    await keyManager.destroy();
    await proxy.stop();
    utpSocket.close();
    utpSocket.unref();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test(
    'pings node',
    async () => {
      let server: PolykeyAgent | undefined;
      try {
        server = await PolykeyAgent.createPolykeyAgent({
          password: 'password',
          nodePath: path.join(dataDir, 'server'),
          keysConfig: {
            rootKeyPairBits: 2048,
          },
          networkConfig: {
            proxyHost: '127.0.0.1' as Host,
          },
          logger: logger,
        });
        const serverNodeId = server.keyManager.getNodeId();
        let serverNodeAddress: NodeAddress = {
          host: server.proxy.getProxyHost(),
          port: server.proxy.getProxyPort(),
        };
        await nodeGraph.setNode(serverNodeId, serverNodeAddress);

        const nodeManager = new NodeManager({
          db,
          sigchain,
          keyManager,
          nodeGraph,
          nodeConnectionManager,
          logger,
        });

        // Set server node offline
        await server.stop();
        // Check if active
        // Case 1: cannot establish new connection, so offline
        const active1 = await nodeManager.pingNode(serverNodeId);
        expect(active1).toBe(false);
        // Bring server node online
        await server.start({
          password: 'password',
          networkConfig: {
            proxyHost: '127.0.0.1' as Host,
          },
        });
        // Update the node address (only changes because we start and stop)
        serverNodeAddress = {
          host: server.proxy.getProxyHost(),
          port: server.proxy.getProxyPort(),
        };
        await nodeGraph.setNode(serverNodeId, serverNodeAddress);
        // Check if active
        // Case 2: can establish new connection, so online
        const active2 = await nodeManager.pingNode(serverNodeId);
        expect(active2).toBe(true);
        // Turn server node offline again
        await server.stop();
        await server.destroy();
        // Give time for the ping buffers to send and wait for timeout on
        // existing connection
        await sleep(30000); // FIXME: remove this sleep
        // Check if active
        // Case 3: pre-existing connection no longer active, so offline
        const active3 = await nodeManager.pingNode(serverNodeId);
        expect(active3).toBe(false);
      } finally {
        // Clean up
        await server?.stop();
        await server?.destroy();
      }
    },
    global.failedConnectionTimeout * 2,
  ); // Ping needs to timeout (takes 20 seconds + setup + pulldown)
  test('getPublicKey', async () => {
    let server: PolykeyAgent | undefined;
    try {
      server = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(dataDir, 'server'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger: logger,
      });
      const serverNodeId = server.keyManager.getNodeId();
      const serverNodeAddress: NodeAddress = {
        host: server.proxy.getProxyHost(),
        port: server.proxy.getProxyPort(),
      };
      await nodeGraph.setNode(serverNodeId, serverNodeAddress);

      const nodeManager = new NodeManager({
        db,
        sigchain,
        keyManager,
        nodeGraph,
        nodeConnectionManager,
        logger,
      });

      // We want to get the public key of the server
      const key = await nodeManager.getPublicKey(serverNodeId);
      const expectedKey = server.keyManager.getRootKeyPairPem().publicKey;
      expect(key).toEqual(expectedKey);
    } finally {
      // Clean up
      await server?.stop();
      await server?.destroy();
    }
  });
  describe('Cross signing claims', () => {
    // These tests follow the following process (from the perspective of Y):
    // 1. X -> sends notification (to start cross signing request) -> Y
    // 2. X <- sends its intermediary signed claim <- Y
    // 3. X -> sends doubly signed claim (Y's intermediary) + its own intermediary claim -> Y
    // 4. X <- sends doubly signed claim (X's intermediary) <- Y
    // We're unable to mock the actions of the server, but we can ensure the
    // state on each side is as expected

    let xDataDir: string;
    let x: PolykeyAgent;
    let xNodeId: NodeId;
    let xNodeAddress: NodeAddress;
    let xPublicKey: PublicKeyPem;

    let yDataDir: string;
    let y: PolykeyAgent;
    let yNodeId: NodeId;
    let yNodeAddress: NodeAddress;
    let yPublicKey: PublicKeyPem;

    beforeAll(async () => {
      xDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      x = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: xDataDir,
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger,
      });

      xNodeId = x.keyManager.getNodeId();
      xNodeAddress = {
        host: externalHost,
        port: x.proxy.getProxyPort(),
      };
      xPublicKey = x.keyManager.getRootKeyPairPem().publicKey;

      yDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      y = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: yDataDir,
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        logger,
      });
      yNodeId = y.keyManager.getNodeId();
      yNodeAddress = {
        host: externalHost,
        port: y.proxy.getProxyPort(),
      };
      yPublicKey = y.keyManager.getRootKeyPairPem().publicKey;

      await x.nodeGraph.setNode(yNodeId, yNodeAddress);
      await y.nodeGraph.setNode(xNodeId, xNodeAddress);
    }, global.polykeyStartupTimeout * 2);
    afterAll(async () => {
      await y.stop();
      await x.stop();
      await fs.promises.rm(yDataDir, {
        force: true,
        recursive: true,
      });
      await fs.promises.rm(xDataDir, {
        force: true,
        recursive: true,
      });
    });

    // Make sure to remove any side-effects after each test
    afterEach(async () => {
      await x.sigchain.stop();
      await x.sigchain.start({ fresh: true });
      await y.sigchain.stop();
      await y.sigchain.start({ fresh: true });
    });

    test('can successfully cross sign a claim', async () => {
      // Make the call to initialise the cross-signing process:
      // 2. X <- sends its intermediary signed claim <- Y
      // 3. X -> sends doubly signed claim (Y's intermediary) + its own intermediary claim -> Y
      // 4. X <- sends doubly signed claim (X's intermediary) <- Y
      await y.nodeManager.claimNode(xNodeId);

      // Check X's sigchain state
      const xChain = await x.sigchain.getChainData();
      expect(Object.keys(xChain).length).toBe(1);
      // Iterate just to be safe, but expected to only have this single claim
      for (const claimId of Object.keys(xChain)) {
        const claim = xChain[claimId];
        const decoded = claimsUtils.decodeClaim(claim);
        expect(decoded).toStrictEqual({
          payload: {
            hPrev: null,
            seq: 1,
            data: {
              type: 'node',
              node1: nodesUtils.encodeNodeId(xNodeId),
              node2: nodesUtils.encodeNodeId(yNodeId),
            },
            iat: expect.any(Number),
          },
          signatures: expect.any(Object),
        });
        const signatureNodeIds = Object.keys(decoded.signatures);
        expect(signatureNodeIds.length).toBe(2);
        // Verify the 2 signatures
        expect(signatureNodeIds).toContain(nodesUtils.encodeNodeId(xNodeId));
        expect(await claimsUtils.verifyClaimSignature(claim, xPublicKey)).toBe(
          true,
        );
        expect(signatureNodeIds).toContain(nodesUtils.encodeNodeId(yNodeId));
        expect(await claimsUtils.verifyClaimSignature(claim, yPublicKey)).toBe(
          true,
        );
      }

      // Check Y's sigchain state
      const yChain = await y.sigchain.getChainData();
      expect(Object.keys(yChain).length).toBe(1);
      // Iterate just to be safe, but expected to only have this single claim
      for (const claimId of Object.keys(yChain)) {
        const claim = yChain[claimId];
        const decoded = claimsUtils.decodeClaim(claim);
        expect(decoded).toStrictEqual({
          payload: {
            hPrev: null,
            seq: 1,
            data: {
              type: 'node',
              node1: nodesUtils.encodeNodeId(yNodeId),
              node2: nodesUtils.encodeNodeId(xNodeId),
            },
            iat: expect.any(Number),
          },
          signatures: expect.any(Object),
        });
        const signatureNodeIds = Object.keys(decoded.signatures);
        expect(signatureNodeIds.length).toBe(2);
        // Verify the 2 signatures
        expect(signatureNodeIds).toContain(nodesUtils.encodeNodeId(xNodeId));
        expect(await claimsUtils.verifyClaimSignature(claim, xPublicKey)).toBe(
          true,
        );
        expect(signatureNodeIds).toContain(nodesUtils.encodeNodeId(yNodeId));
        expect(await claimsUtils.verifyClaimSignature(claim, yPublicKey)).toBe(
          true,
        );
      }
    });
    test('can request chain data', async () => {
      // Cross signing claims
      await y.nodeManager.claimNode(xNodeId);

      const nodeManager = new NodeManager({
        db,
        sigchain,
        keyManager,
        nodeGraph,
        nodeConnectionManager,
        logger,
      });

      await nodeGraph.setNode(xNodeId, xNodeAddress);

      // We want to get the public key of the server
      const chainData = JSON.stringify(
        await nodeManager.requestChainData(xNodeId),
      );
      expect(chainData).toContain(nodesUtils.encodeNodeId(xNodeId));
      expect(chainData).toContain(nodesUtils.encodeNodeId(yNodeId));
    });
  });
  test('should add a node when bucket has room', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyManager,
      nodeGraph,
      nodeConnectionManager: {} as NodeConnectionManager,
      logger,
    });
    const localNodeId = keyManager.getNodeId();
    const bucketIndex = 100;
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      localNodeId,
      bucketIndex,
    );
    await nodeManager.setNode(nodeId, {} as NodeAddress);

    // Checking bucket
    const bucket = await nodeManager.getBucket(bucketIndex);
    expect(bucket).toHaveLength(1);
  });
  test('should update a node if node exists', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyManager,
      nodeGraph,
      nodeConnectionManager: {} as NodeConnectionManager,
      logger,
    });
    const localNodeId = keyManager.getNodeId();
    const bucketIndex = 100;
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      localNodeId,
      bucketIndex,
    );
    await nodeManager.setNode(nodeId, {
      host: '' as Host,
      port: 11111 as Port,
    });

    const nodeData = (await nodeGraph.getNode(nodeId))!;
    await sleep(1100);

    // Should update the node
    await nodeManager.setNode(nodeId, {
      host: '' as Host,
      port: 22222 as Port,
    });

    const newNodeData = (await nodeGraph.getNode(nodeId))!;
    expect(newNodeData.address.port).not.toEqual(nodeData.address.port);
    expect(newNodeData.lastUpdated).not.toEqual(nodeData.lastUpdated);
  });
  test('should not add node if bucket is full and old node is alive', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyManager,
      nodeGraph,
      nodeConnectionManager: {} as NodeConnectionManager,
      logger,
    });
    const localNodeId = keyManager.getNodeId();
    const bucketIndex = 100;
    // Creating 20 nodes in bucket
    for (let i = 1; i <= 20; i++) {
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
        i,
      );
      await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
    }
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      localNodeId,
      bucketIndex,
    );
    // Mocking ping
    const nodeManagerPingMock = jest.spyOn(NodeManager.prototype, 'pingNode');
    nodeManagerPingMock.mockResolvedValue(true);
    const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
    const oldestNode = await nodeGraph.getNode(oldestNodeId!);
    // Waiting for a second to tick over
    await sleep(1100);
    // Adding a new node with bucket full
    await nodeManager.setNode(nodeId, { port: 55555 } as NodeAddress);
    // Bucket still contains max nodes
    const bucket = await nodeManager.getBucket(bucketIndex);
    expect(bucket).toHaveLength(nodeGraph.nodeBucketLimit);
    // New node was not added
    const node = await nodeGraph.getNode(nodeId);
    expect(node).toBeUndefined();
    // Oldest node was updated
    const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
    expect(oldestNodeNew!.lastUpdated).not.toEqual(oldestNode!.lastUpdated);
    nodeManagerPingMock.mockRestore();
  });
  test('should add node if bucket is full, old node is alive and force is set', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyManager,
      nodeGraph,
      nodeConnectionManager: {} as NodeConnectionManager,
      logger,
    });
    const localNodeId = keyManager.getNodeId();
    const bucketIndex = 100;
    // Creating 20 nodes in bucket
    for (let i = 1; i <= 20; i++) {
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
        i,
      );
      await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
    }
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      localNodeId,
      bucketIndex,
    );
    // Mocking ping
    const nodeManagerPingMock = jest.spyOn(NodeManager.prototype, 'pingNode');
    nodeManagerPingMock.mockResolvedValue(true);
    const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
    // Adding a new node with bucket full
    await nodeManager.setNode(nodeId, { port: 55555 } as NodeAddress, true);
    // Bucket still contains max nodes
    const bucket = await nodeManager.getBucket(bucketIndex);
    expect(bucket).toHaveLength(nodeGraph.nodeBucketLimit);
    // New node was added
    const node = await nodeGraph.getNode(nodeId);
    expect(node).toBeDefined();
    // Oldest node was removed
    const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
    expect(oldestNodeNew).toBeUndefined();
    nodeManagerPingMock.mockRestore();
  });
  test('should add node if bucket is full and old node is dead', async () => {
    const nodeManager = new NodeManager({
      db,
      sigchain: {} as Sigchain,
      keyManager,
      nodeGraph,
      nodeConnectionManager: {} as NodeConnectionManager,
      logger,
    });
    const localNodeId = keyManager.getNodeId();
    const bucketIndex = 100;
    // Creating 20 nodes in bucket
    for (let i = 1; i <= 20; i++) {
      const nodeId = nodesTestUtils.generateNodeIdForBucket(
        localNodeId,
        bucketIndex,
        i,
      );
      await nodeManager.setNode(nodeId, { port: i } as NodeAddress);
    }
    const nodeId = nodesTestUtils.generateNodeIdForBucket(
      localNodeId,
      bucketIndex,
    );
    // Mocking ping
    const nodeManagerPingMock = jest.spyOn(NodeManager.prototype, 'pingNode');
    nodeManagerPingMock.mockResolvedValue(false);
    const oldestNodeId = (await nodeGraph.getOldestNode(bucketIndex)).pop();
    // Adding a new node with bucket full
    await nodeManager.setNode(nodeId, { port: 55555 } as NodeAddress, true);
    // Bucket still contains max nodes
    const bucket = await nodeManager.getBucket(bucketIndex);
    expect(bucket).toHaveLength(nodeGraph.nodeBucketLimit);
    // New node was added
    const node = await nodeGraph.getNode(nodeId);
    expect(node).toBeDefined();
    // Oldest node was removed
    const oldestNodeNew = await nodeGraph.getNode(oldestNodeId!);
    expect(oldestNodeNew).toBeUndefined();
    nodeManagerPingMock.mockRestore();
  });
  test('should add node when an incoming connection is established', async () => {
    let server: PolykeyAgent | undefined;
    try {
      server = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(dataDir, 'server'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger: logger,
      });
      const serverNodeId = server.keyManager.getNodeId();
      const serverNodeAddress: NodeAddress = {
        host: server.proxy.getProxyHost(),
        port: server.proxy.getProxyPort(),
      };
      await nodeGraph.setNode(serverNodeId, serverNodeAddress);

      const expectedHost = proxy.getProxyHost();
      const expectedPort = proxy.getProxyPort();
      const expectedNodeId = keyManager.getNodeId();

      const nodeData = await server.nodeGraph.getNode(expectedNodeId);
      expect(nodeData).toBeUndefined();

      // Now we want to connect to the server by making an echo request.
      await nodeConnectionManager.withConnF(serverNodeId, async (conn) => {
        const client = conn.getClient();
        await client.echo(new utilsPB.EchoMessage().setChallenge('hello'));
      });

      const nodeData2 = await server.nodeGraph.getNode(expectedNodeId);
      expect(nodeData2).toBeDefined();
      expect(nodeData2?.address.host).toEqual(expectedHost);
      expect(nodeData2?.address.port).toEqual(expectedPort);
    } finally {
      // Clean up
      await server?.stop();
      await server?.destroy();
    }
  });
});
