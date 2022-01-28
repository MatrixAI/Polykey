import type { ClaimIdString } from '@/claims/types';
import type { CertificatePem, KeyPairPem, PublicKeyPem } from '@/keys/types';
import type { Host, Port } from '@/network/types';
import type { NodeId, NodeAddress } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import { PolykeyAgent } from '@';
import { KeyManager, utils as keysUtils } from '@/keys';
import { NodeManager, errors as nodesErrors } from '@/nodes';
import { ForwardProxy, ReverseProxy } from '@/network';
import { Sigchain } from '@/sigchain';
import { utils as claimsUtils } from '@/claims';
import { sleep } from '@/utils';
import { utils as nodesUtils } from '@/nodes';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('NodeManager', () => {
  const password = 'password';
  const logger = new Logger('NodeManagerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodeManager: NodeManager;

  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;
  let keyManager: KeyManager;
  let keyPairPem: KeyPairPem;
  let certPem: CertificatePem;
  let db: DB;
  let sigchain: Sigchain;

  const serverHost = '::1' as Host;
  const serverPort = 1 as Port;

  const nodeId1 = nodesUtils.decodeNodeId(
    'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
  );
  const nodeId2 = nodesUtils.decodeNodeId(
    'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg',
  );
  const dummyNode = nodesUtils.decodeNodeId(
    'vi3et1hrpv2m2lrplcm7cu913kr45v51cak54vm68anlbvuf83ra0',
  );

  beforeEach(async () => {
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

    fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });
    revProxy = new ReverseProxy({
      logger: logger,
    });

    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    await revProxy.start({
      serverHost,
      serverPort,
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

    nodeManager = await NodeManager.createNodeManager({
      db,
      sigchain,
      keyManager,
      fwdProxy,
      revProxy,
      logger,
    });
    await nodeManager.start();
  });
  afterEach(async () => {
    await nodeManager.stop();
    await nodeManager.destroy();
    await sigchain.stop();
    await sigchain.destroy();
    await db.stop();
    await db.destroy();
    await keyManager.stop();
    await keyManager.destroy();
    await fwdProxy.stop();
    await revProxy.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('NodeManager readiness', async () => {
    await expect(nodeManager.destroy()).rejects.toThrow(
      nodesErrors.ErrorNodeManagerRunning,
    );
    // Should be a noop
    await nodeManager.start();
    await nodeManager.stop();
    await nodeManager.destroy();
    await expect(nodeManager.start()).rejects.toThrow(
      nodesErrors.ErrorNodeManagerDestroyed,
    );
    // Await expect(nodeManager.readToken()).rejects.toThrow(nodesErrors.ErrorNodeManagerNotRunning);
    // await expect(nodeManager.writeToken()).rejects.toThrow(nodesErrors.ErrorNodeManagerNotRunning);
  });
  describe('getConnectionToNode', () => {
    let targetDataDir: string;
    let target: PolykeyAgent;
    let targetNodeId: NodeId;
    let targetNodeAddress: NodeAddress;

    beforeAll(async () => {
      targetDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      target = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: targetDataDir,
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });
    }, global.polykeyStartupTimeout);

    afterAll(async () => {
      await target.stop();
      await fs.promises.rm(targetDataDir, {
        force: true,
        recursive: true,
      });
    });

    beforeEach(async () => {
      await target.start({ password: 'password' });
      targetNodeId = target.keyManager.getNodeId();
      targetNodeAddress = {
        host: target.revProxy.getIngressHost(),
        port: target.revProxy.getIngressPort(),
      };
      await nodeManager.setNode(targetNodeId, targetNodeAddress);
    });

    afterEach(async () => {
      // Delete the created node connection each time.
      await target.stop();
    });

    test('creates new connection to node', async () => {
      // @ts-ignore get connection + lock from protected NodeConnectionMap
      const initialConnLock = nodeManager.connections.get(targetNodeId);
      expect(initialConnLock).toBeUndefined();
      await nodeManager.getConnectionToNode(targetNodeId);
      // @ts-ignore get connection + lock from protected NodeConnectionMap
      const finalConnLock = nodeManager.connections.get(
        targetNodeId.toString(),
      );
      // Check entry is in map and lock is released
      expect(finalConnLock).toBeDefined();
      expect(finalConnLock?.lock.isLocked()).toBeFalsy();
    });
    test('gets existing connection to node', async () => {
      // @ts-ignore accessing protected NodeConnectionMap
      expect(nodeManager.connections.size).toBe(0);
      // @ts-ignore get connection + lock from protected NodeConnectionMap
      const initialConnLock = nodeManager.connections.get(targetNodeId);
      expect(initialConnLock).toBeUndefined();
      await nodeManager.getConnectionToNode(targetNodeId);
      // Check we only have this single connection
      // @ts-ignore accessing protected NodeConnectionMap
      expect(nodeManager.connections.size).toBe(1);
      await nodeManager.getConnectionToNode(targetNodeId);
      // Check we still only have this single connection
      // @ts-ignore accessing protected NodeConnectionMap
      expect(nodeManager.connections.size).toBe(1);
    });
    test('concurrent connection creation to same target results in 1 connection', async () => {
      // @ts-ignore accessing protected NodeConnectionMap
      expect(nodeManager.connections.size).toBe(0);
      // @ts-ignore get connection + lock from protected NodeConnectionMap
      const initialConnLock = nodeManager.connections.get(targetNodeId);
      expect(initialConnLock).toBeUndefined();
      // Concurrently create connection to same target
      await Promise.all([
        nodeManager.getConnectionToNode(targetNodeId),
        nodeManager.getConnectionToNode(targetNodeId),
      ]);
      // Check only 1 connection exists
      // @ts-ignore accessing protected NodeConnectionMap
      expect(nodeManager.connections.size).toBe(1);
      // @ts-ignore get connection + lock from protected NodeConnectionMap
      const finalConnLock = nodeManager.connections.get(
        targetNodeId.toString(),
      );
      // Check entry is in map and lock is released
      expect(finalConnLock).toBeDefined();
      expect(finalConnLock?.lock.isLocked()).toBeFalsy();
    });
    test(
      'unable to create new connection to offline node',
      async () => {
        // Add the dummy node
        await nodeManager.setNode(dummyNode, {
          host: '125.0.0.1' as Host,
          port: 55555 as Port,
        });
        // @ts-ignore accessing protected NodeConnectionMap
        expect(nodeManager.connections.size).toBe(0);

        await expect(() =>
          nodeManager.getConnectionToNode(dummyNode),
        ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
        // @ts-ignore accessing protected NodeConnectionMap
        expect(nodeManager.connections.size).toBe(1);
        // @ts-ignore accessing protected NodeConnectionMap
        const connLock = nodeManager.connections.get(dummyNode);
        // There should still be an entry in the connection map, but it should
        // only contain a lock - no connection.
        expect(connLock).toBeDefined();
        expect(connLock?.lock).toBeDefined();
        expect(connLock?.connection).toBeUndefined();

        // Undo the initial dummy node add
        // @ts-ignore - get the NodeGraph reference
        const nodeGraph = nodeManager.nodeGraph;
        await nodeGraph.unsetNode(dummyNode);
      },
      global.failedConnectionTimeout * 2,
    );
  });
  test(
    'pings node',
    async () => {
      const server = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(dataDir, 'server'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger: logger,
      });
      const serverNodeId = server.nodeManager.getNodeId();
      let serverNodeAddress: NodeAddress = {
        host: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
      };
      await nodeManager.setNode(serverNodeId, serverNodeAddress);

      // Set server node offline
      await server.stop();
      // Check if active
      // Case 1: cannot establish new connection, so offline
      const active1 = await nodeManager.pingNode(serverNodeId);
      expect(active1).toBe(false);
      // Bring server node online
      await server.start({ password: 'password' });
      // Update the node address (only changes because we start and stop)
      serverNodeAddress = {
        host: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
      };
      await nodeManager.setNode(serverNodeId, serverNodeAddress);
      // Check if active
      // Case 2: can establish new connection, so online
      const active2 = await nodeManager.pingNode(serverNodeId);
      expect(active2).toBe(true);
      // Turn server node offline again
      await server.stop();
      await server.destroy();
      // Give time for the ping buffers to send and wait for timeout on
      // existing connection
      await sleep(30000);
      // Check if active
      // Case 3: pre-existing connection no longer active, so offline
      const active3 = await nodeManager.pingNode(serverNodeId);
      expect(active3).toBe(false);
    },
    global.failedConnectionTimeout * 2,
  ); // Ping needs to timeout (takes 20 seconds + setup + pulldown)
  test('finds node (local)', async () => {
    // Case 1: node already exists in the local node graph (no contact required)
    const nodeId = nodeId1;
    const nodeAddress: NodeAddress = {
      host: '127.0.0.1' as Host,
      port: 11111 as Port,
    };
    await nodeManager.setNode(nodeId, nodeAddress);
    // Expect no error thrown
    await expect(nodeManager.findNode(nodeId)).resolves.not.toThrowError();
    const foundAddress1 = await nodeManager.findNode(nodeId);
    expect(foundAddress1).toStrictEqual(nodeAddress);
  });
  test(
    'finds node (contacts remote node)',
    async () => {
      // Case 2: node can be found on the remote node
      const nodeId = nodeId1;
      const nodeAddress: NodeAddress = {
        host: '127.0.0.1' as Host,
        port: 11111 as Port,
      };

      const server = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(dataDir, 'server'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger: logger,
      });

      await nodeManager.setNode(server.nodeManager.getNodeId(), {
        host: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
      } as NodeAddress);
      await server.nodeManager.setNode(nodeId, nodeAddress);
      const foundAddress2 = await nodeManager.findNode(nodeId);
      expect(foundAddress2).toStrictEqual(nodeAddress);

      await server.stop();
    },
    global.polykeyStartupTimeout,
  );
  test(
    'cannot find node (contacts remote node)',
    async () => {
      // Case 3: node exhausts all contacts and cannot find node
      const nodeId = nodeId1;
      const server = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(dataDir, 'server'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });
      await nodeManager.setNode(server.nodeManager.getNodeId(), {
        host: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
      } as NodeAddress);
      // Add a dummy node to the server node graph database
      // Server will not be able to connect to this node (the only node in its
      // database), and will therefore not be able to locate the node.
      await server.nodeManager.setNode(dummyNode, {
        host: '127.0.0.2' as Host,
        port: 22222 as Port,
      } as NodeAddress);
      // So unfindableNode cannot be found
      await expect(() => nodeManager.findNode(nodeId)).rejects.toThrowError(
        nodesErrors.ErrorNodeGraphNodeNotFound,
      );
      await server.stop();
    },
    global.failedConnectionTimeout * 2,
  );
  test('knows node (true and false case)', async () => {
    // Known node
    const nodeAddress1: NodeAddress = {
      host: '127.0.0.1' as Host,
      port: 11111 as Port,
    };
    await nodeManager.setNode(nodeId1, nodeAddress1);
    expect(await nodeManager.knowsNode(nodeId1)).toBeTruthy();

    // Unknown node
    expect(await nodeManager.knowsNode(nodeId2)).not.toBeTruthy();
  });

  describe('Cross signing claims', () => {
    // These tests follow the following process (from the perspective of Y):
    // 1. X -> sends notification (to start cross signing request) -> Y
    // 2. X <- sends its intermediary signed claim <- Y
    // 3. X -> sends doubly signed claim (Y's intermediary) + its own intermediary claim -> Y
    // 4. X <- sends doubly signed claim (X's intermediary) <- Y
    // We're unable to mock the actions of the server, but we can ensure the
    // state on each side is as expected.

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
        logger,
      });

      xNodeId = x.nodeManager.getNodeId();
      xNodeAddress = {
        host: x.revProxy.getIngressHost(),
        port: x.revProxy.getIngressPort(),
      };
      xPublicKey = x.keyManager.getRootKeyPairPem().publicKey;

      yDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      y = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: xDataDir,
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });
      yNodeId = y.nodeManager.getNodeId();
      yNodeAddress = {
        host: y.revProxy.getIngressHost(),
        port: y.revProxy.getIngressPort(),
      };
      yPublicKey = y.keyManager.getRootKeyPairPem().publicKey;

      await x.nodeManager.setNode(yNodeId, yNodeAddress);
      await y.nodeManager.setNode(xNodeId, xNodeAddress);
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
      await x.sigchain.clearDB();
      await y.sigchain.clearDB();
    });

    test('can successfully cross sign a claim', async () => {
      // Make the call to initialise the cross-signing process:
      // 2. X <- sends its intermediary signed claim <- Y
      // 3. X -> sends doubly signed claim (Y's intermediary) + its own intermediary claim -> Y
      // 4. X <- sends doubly signed claim (X's intermediary) <- Y
      await y.nodeManager.claimNode(xNodeId);

      // Check both sigchain locks are released
      expect(x.sigchain.locked).toBe(false);
      expect(y.sigchain.locked).toBe(false);

      // Check X's sigchain state
      const xChain = await x.sigchain.getChainData();
      expect(Object.keys(xChain).length).toBe(1);
      // Iterate just to be safe, but expected to only have this single claim
      for (const c of Object.keys(xChain)) {
        const claimId = c as ClaimIdString;
        const claim = xChain[claimId];
        const decoded = claimsUtils.decodeClaim(claim);
        expect(decoded).toStrictEqual({
          payload: {
            hPrev: null,
            seq: 1,
            data: {
              type: 'node',
              node1: xNodeId,
              node2: yNodeId,
            },
            iat: expect.any(Number),
          },
          signatures: expect.any(Object),
        });
        const signatureNodeIds = Object.keys(decoded.signatures).map(
          (idString) => IdInternal.fromString<NodeId>(idString),
        );
        expect(signatureNodeIds.length).toBe(2);
        // Verify the 2 signatures
        expect(signatureNodeIds).toContain(xNodeId);
        expect(await claimsUtils.verifyClaimSignature(claim, xPublicKey)).toBe(
          true,
        );
        expect(signatureNodeIds).toContain(yNodeId);
        expect(await claimsUtils.verifyClaimSignature(claim, yPublicKey)).toBe(
          true,
        );
      }

      // Check Y's sigchain state
      const yChain = await y.sigchain.getChainData();
      expect(Object.keys(yChain).length).toBe(1);
      // Iterate just to be safe, but expected to only have this single claim
      for (const c of Object.keys(yChain)) {
        const claimId = c as ClaimIdString;
        const claim = yChain[claimId];
        const decoded = claimsUtils.decodeClaim(claim);
        expect(decoded).toStrictEqual({
          payload: {
            hPrev: null,
            seq: 1,
            data: {
              type: 'node',
              node1: yNodeId,
              node2: xNodeId,
            },
            iat: expect.any(Number),
          },
          signatures: expect.any(Object),
        });
        const signatureNodeIds = Object.keys(decoded.signatures).map(
          (idString) => IdInternal.fromString<NodeId>(idString),
        );
        expect(signatureNodeIds.length).toBe(2);
        // Verify the 2 signatures
        expect(signatureNodeIds).toContain(xNodeId);
        expect(await claimsUtils.verifyClaimSignature(claim, xPublicKey)).toBe(
          true,
        );
        expect(signatureNodeIds).toContain(yNodeId);
        expect(await claimsUtils.verifyClaimSignature(claim, yPublicKey)).toBe(
          true,
        );
      }
    });
  });
});
