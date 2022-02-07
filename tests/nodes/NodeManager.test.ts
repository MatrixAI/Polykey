import type { CertificatePem, KeyPairPem, PublicKeyPem } from '@/keys/types';
import type { Host, Port } from '@/network/types';
import type { NodeId, NodeAddress } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import PolykeyAgent from '@/PolykeyAgent';
import KeyManager from '@/keys/KeyManager';
import * as keysUtils from '@/keys/utils';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import ForwardProxy from '@/network/ForwardProxy';
import ReverseProxy from '@/network/ReverseProxy';
import Sigchain from '@/sigchain/Sigchain';
import * as claimsUtils from '@/claims/utils';
import { sleep } from '@/utils';
import * as nodesUtils from '@/nodes/utils';

describe(`${NodeManager.name} test`, () => {
  const password = 'password';
  const logger = new Logger(`${NodeManager.name} test`, LogLevel.ERROR, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodeGraph: NodeGraph;
  let nodeConnectionManager: NodeConnectionManager;
  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;
  let keyManager: KeyManager;
  let keyPairPem: KeyPairPem;
  let certPem: CertificatePem;
  let db: DB;
  let sigchain: Sigchain;

  const serverHost = '::1' as Host;
  const serverPort = 1 as Port;
  ``;
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

    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyManager,
      nodeGraph,
      fwdProxy,
      revProxy,
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
        let serverNodeAddress: NodeAddress = {
          host: server.revProxy.getIngressHost(),
          port: server.revProxy.getIngressPort(),
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
        await server.start({ password: 'password' });
        // Update the node address (only changes because we start and stop)
        serverNodeAddress = {
          host: server.revProxy.getIngressHost(),
          port: server.revProxy.getIngressPort(),
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
        logger: logger,
      });
      const serverNodeId = server.keyManager.getNodeId();
      const serverNodeAddress: NodeAddress = {
        host: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
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
        logger,
      });

      xNodeId = x.keyManager.getNodeId();
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
        nodePath: yDataDir,
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });
      yNodeId = y.keyManager.getNodeId();
      yNodeAddress = {
        host: y.revProxy.getIngressHost(),
        port: y.revProxy.getIngressPort(),
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
});
