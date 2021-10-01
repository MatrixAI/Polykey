import type { PolykeyAgent } from '@';
import type { NodeId, NodeAddress } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import type { CertificatePem, KeyPairPem, PublicKeyPem } from '@/keys/types';
import type { ClaimId } from '@/claims/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { DB } from '@matrixai/db';
import { KeyManager, utils as keysUtils } from '@/keys';
import { NodeManager } from '@/nodes';
import { ForwardProxy, ReverseProxy } from '@/network';
import { Sigchain } from '@/sigchain';
import { sleep } from '@/utils';
import * as testUtils from '../utils';
import * as nodesErrors from '@/nodes/errors';
import * as claimsUtils from '@/claims/utils';
import { makeCrypto } from '../utils';

describe('NodeManager', () => {
  const password = 'password';
  const logger = new Logger('NodeManagerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodeManager: NodeManager;

  const fwdProxy = new ForwardProxy({
    authToken: 'abc',
    logger: logger,
  });
  const revProxy = new ReverseProxy({
    logger: logger,
  });
  let keyManager: KeyManager;
  let keyPairPem: KeyPairPem;
  let certPem: CertificatePem;
  let db: DB;
  let sigchain: Sigchain;

  const serverHost = '::1' as Host;
  const serverPort = 1 as Port;

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
    db = await DB.createDB({ dbPath, logger, crypto: makeCrypto(keyManager) });
    await db.start();
    sigchain = new Sigchain({ keyManager, db, logger });
    await sigchain.start();

    nodeManager = new NodeManager({
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
    await sigchain.stop();
    await db.stop();
    await db.destroy();
    await keyManager.stop();
    await fwdProxy.stop();
    await revProxy.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test(
    'pings node',
    async () => {
      const server = await testUtils.setupRemoteKeynode({
        logger: logger,
      });
      const serverNodeId = server.nodes.getNodeId();
      let serverNodeAddress: NodeAddress = {
        ip: server.revProxy.getIngressHost(),
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
      await server.start({});
      // Update the node address (only changes because we start and stop)
      serverNodeAddress = {
        ip: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
      };
      await nodeManager.setNode(serverNodeId, serverNodeAddress);
      // Check if active
      // Case 2: can establish new connection, so online
      const active2 = await nodeManager.pingNode(serverNodeId);
      expect(active2).toBe(true);
      // Turn server node offline again
      await server.stop();
      // Give time for the ping buffers to send and wait for timeout on
      // existing connection
      await sleep(30000);
      // Check if active
      // Case 3: pre-existing connection no longer active, so offline
      const active3 = await nodeManager.pingNode(serverNodeId);
      expect(active3).toBe(false);

      await testUtils.cleanupRemoteKeynode(server);
    },
    global.failedConnectionTimeout * 2,
  ); // Ping needs to timeout (takes 20 seconds + setup + pulldown)
  test('finds node (local)', async () => {
    // Case 1: node already exists in the local node graph (no contact required)
    const nodeId = 'nodeId' as NodeId;
    const nodeAddress: NodeAddress = {
      ip: '127.0.0.1' as Host,
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
      const nodeId = 'nodeId' as NodeId;
      const nodeAddress: NodeAddress = {
        ip: '127.0.0.1' as Host,
        port: 11111 as Port,
      };
      const server = await testUtils.setupRemoteKeynode({ logger: logger });
      await nodeManager.setNode(server.nodes.getNodeId(), {
        ip: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
      } as NodeAddress);
      await server.nodes.setNode(nodeId, nodeAddress);
      const foundAddress2 = await nodeManager.findNode(nodeId);
      expect(foundAddress2).toStrictEqual(nodeAddress);

      await testUtils.cleanupRemoteKeynode(server);
    },
    global.polykeyStartupTimeout,
  );
  test(
    'cannot find node (contacts remote node)',
    async () => {
      // Case 3: node exhausts all contacts and cannot find node
      const nodeId = 'unfindableNode' as NodeId;
      const server = await testUtils.setupRemoteKeynode({ logger: logger });
      await nodeManager.setNode(server.nodes.getNodeId(), {
        ip: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
      } as NodeAddress);
      // Add a dummy node to the server node graph database
      // Server will not be able to connect to this node (the only node in its
      // database), and will therefore not be able to locate the node.
      await server.nodes.setNode(
        'dummyNode' as NodeId,
        {
          ip: '127.0.0.2' as Host,
          port: 22222 as Port,
        } as NodeAddress,
      );
      // So unfindableNode cannot be found
      await expect(() => nodeManager.findNode(nodeId)).rejects.toThrowError(
        nodesErrors.ErrorNodeGraphNodeNotFound,
      );

      await testUtils.cleanupRemoteKeynode(server);
    },
    global.failedConnectionTimeout,
  );
  test('knows node (true and false case)', async () => {
    // Known node
    const nodeId1 = 'nodeId1' as NodeId;
    const nodeAddress1: NodeAddress = {
      ip: '127.0.0.1' as Host,
      port: 11111 as Port,
    };
    await nodeManager.setNode(nodeId1, nodeAddress1);
    expect(await nodeManager.knowsNode(nodeId1)).toBeTruthy();

    // Unknown node
    const nodeId2 = 'nodeId2' as NodeId;
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

    let x: PolykeyAgent;
    let xNodeId: NodeId;
    let xNodeAddress: NodeAddress;
    let xPublicKey: PublicKeyPem;

    let y: PolykeyAgent;
    let yNodeId: NodeId;
    let yNodeAddress: NodeAddress;
    let yPublicKey: PublicKeyPem;

    beforeAll(async () => {
      x = await testUtils.setupRemoteKeynode({
        logger: logger,
      });
      xNodeId = x.nodes.getNodeId();
      xNodeAddress = {
        ip: x.revProxy.getIngressHost(),
        port: x.revProxy.getIngressPort(),
      };
      xPublicKey = x.keys.getRootKeyPairPem().publicKey;

      y = await testUtils.setupRemoteKeynode({
        logger: logger,
      });
      yNodeId = y.nodes.getNodeId();
      yNodeAddress = {
        ip: y.revProxy.getIngressHost(),
        port: y.revProxy.getIngressPort(),
      };
      yPublicKey = y.keys.getRootKeyPairPem().publicKey;

      await x.nodes.setNode(yNodeId, yNodeAddress);
      await y.nodes.setNode(xNodeId, xNodeAddress);
    });
    afterAll(async () => {
      await testUtils.cleanupRemoteKeynode(x);
      await testUtils.cleanupRemoteKeynode(y);
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
      await y.nodes.claimNode(xNodeId);

      // Check both sigchain locks are released
      expect(x.sigchain.locked).toBe(false);
      expect(y.sigchain.locked).toBe(false);

      // Check X's sigchain state
      const xChain = await x.sigchain.getChainData();
      expect(Object.keys(xChain).length).toBe(1);
      // Iterate just to be safe, but expected to only have this single claim
      for (const c of Object.keys(xChain)) {
        const claimId = c as ClaimId;
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
        const signatureNodeIds = Object.keys(decoded.signatures) as NodeId[];
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
        const claimId = c as ClaimId;
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
        const signatureNodeIds = Object.keys(decoded.signatures) as NodeId[];
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
