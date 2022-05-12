import type { ProviderId, IdentityId } from '@/identities/types';
import type { NodeIdEncoded } from '@/nodes/types';
import type { Claim, ClaimData } from '@/claims/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyManager from '@/keys/KeyManager';
import Sigchain from '@/sigchain/Sigchain';
import * as claimsUtils from '@/claims/utils';
import * as sigchainErrors from '@/sigchain/errors';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as testUtils from '../utils';

describe('Sigchain', () => {
  const logger = new Logger('Sigchain Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const srcNodeIdEncoded = nodesUtils.encodeNodeId(
    testUtils.generateRandomNodeId(),
  );
  const nodeId2Encoded = nodesUtils.encodeNodeId(
    testUtils.generateRandomNodeId(),
  );
  const nodeId3Encoded = nodesUtils.encodeNodeId(
    testUtils.generateRandomNodeId(),
  );
  const nodeIdAEncoded = nodesUtils.encodeNodeId(
    testUtils.generateRandomNodeId(),
  );
  const nodeIdBEncoded = nodesUtils.encodeNodeId(
    testUtils.generateRandomNodeId(),
  );
  const nodeIdCEncoded = nodesUtils.encodeNodeId(
    testUtils.generateRandomNodeId(),
  );
  const nodeIdDEncoded = nodesUtils.encodeNodeId(
    testUtils.generateRandomNodeId(),
  );

  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
  });
  afterAll(async () => {
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
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
  });
  afterEach(async () => {
    await db.stop();
    await db.destroy();
    await keyManager.stop();
    await keyManager.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('sigchain readiness', async () => {
    const sigchain = await Sigchain.createSigchain({ keyManager, db, logger });
    await expect(async () => {
      await sigchain.destroy();
    }).rejects.toThrow(sigchainErrors.ErrorSigchainRunning);
    // Should be a noop
    await sigchain.start();
    await sigchain.stop();
    await sigchain.destroy();
    await expect(async () => {
      await sigchain.start();
    }).rejects.toThrow(sigchainErrors.ErrorSigchainDestroyed);
    await expect(async () => {
      await sigchain.getSequenceNumber();
    }).rejects.toThrow(sigchainErrors.ErrorSigchainNotRunning);
  });
  test('async start initialises the sequence number', async () => {
    const sigchain = await Sigchain.createSigchain({ keyManager, db, logger });
    const sequenceNumber = await sigchain.getSequenceNumber();
    expect(sequenceNumber).toBe(0);
    await sigchain.stop();
  });
  test('adds and retrieves a cryptolink, verifies signature', async () => {
    const sigchain = await Sigchain.createSigchain({ keyManager, db, logger });
    const cryptolink: ClaimData = {
      type: 'node',
      node1: srcNodeIdEncoded,
      node2: nodeId2Encoded,
    };
    const [claimId] = await sigchain.addClaim(cryptolink);

    expect(claimId).toBeTruthy();
    const claim = await sigchain.getClaim(claimId!);

    // Check the claim is correct
    const decoded = claimsUtils.decodeClaim(claim);
    const expected: Claim = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: srcNodeIdEncoded,
          node2: nodeId2Encoded,
        },
        iat: expect.any(Number),
      },
      signatures: expect.any(Object),
    };
    expect(decoded).toStrictEqual(expected);

    // Check the signature is valid
    expect(Object.keys(decoded.signatures).length).toBe(1);
    expect(decoded.signatures[srcNodeIdEncoded]).toBeDefined;
    expect(decoded.signatures[srcNodeIdEncoded].header).toStrictEqual({
      alg: 'RS256',
      kid: srcNodeIdEncoded,
    });
    const verified = await claimsUtils.verifyClaimSignature(
      claim,
      keyManager.getRootKeyPairPem().publicKey,
    );
    expect(verified).toBe(true);

    await sigchain.stop();
  });
  test('adds and retrieves 2 cryptolinks, verifies signatures and hash', async () => {
    const sigchain = await Sigchain.createSigchain({ keyManager, db, logger });
    const cryptolink: ClaimData = {
      type: 'node',
      node1: srcNodeIdEncoded,
      node2: nodeId2Encoded,
    };
    const [claimId1] = await sigchain.addClaim(cryptolink);

    const cryptolink2: ClaimData = {
      type: 'node',
      node1: srcNodeIdEncoded,
      node2: nodeId3Encoded,
    };
    const [claimId2] = await sigchain.addClaim(cryptolink2);

    const claim1 = await sigchain.getClaim(claimId1!);
    const claim2 = await sigchain.getClaim(claimId2!);

    // Check the claim is correct
    const decoded1 = claimsUtils.decodeClaim(claim1);
    const expected1: Claim = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: srcNodeIdEncoded,
          node2: nodeId2Encoded,
        },
        iat: expect.any(Number),
      },
      signatures: expect.any(Object),
    };
    expect(decoded1).toStrictEqual(expected1);
    const decoded2 = claimsUtils.decodeClaim(claim2);
    const expected2: Claim = {
      payload: {
        hPrev: expect.any(String),
        seq: 2,
        data: {
          type: 'node',
          node1: srcNodeIdEncoded,
          node2: nodeId3Encoded,
        },
        iat: expect.any(Number),
      },
      signatures: expect.any(Object),
    };
    expect(decoded2).toStrictEqual(expected2);

    // Check the signature is valid in each claim
    expect(Object.keys(decoded1.signatures).length).toBe(1);
    expect(decoded1.signatures[srcNodeIdEncoded]).toBeDefined;
    expect(decoded1.signatures[srcNodeIdEncoded].header).toStrictEqual({
      alg: 'RS256',
      kid: srcNodeIdEncoded,
    });
    const verified1 = await claimsUtils.verifyClaimSignature(
      claim1,
      keyManager.getRootKeyPairPem().publicKey,
    );
    expect(verified1).toBe(true);

    expect(Object.keys(decoded2.signatures).length).toBe(1);
    expect(decoded2.signatures[srcNodeIdEncoded]).toBeDefined;
    expect(decoded2.signatures[srcNodeIdEncoded].header).toStrictEqual({
      alg: 'RS256',
      kid: srcNodeIdEncoded,
    });
    const verified2 = await claimsUtils.verifyClaimSignature(
      claim2,
      keyManager.getRootKeyPairPem().publicKey,
    );
    expect(verified2).toBe(true);

    // Check the hash of the previous claim is correct
    const verifiedHash = await claimsUtils.verifyHashOfClaim(
      claim1,
      decoded2.payload.hPrev as string,
    );
    expect(verifiedHash).toBe(true);

    await sigchain.stop();
  });
  test('adds an existing claim', async () => {
    const sigchain = await Sigchain.createSigchain({ keyManager, db, logger });
    // Create a claim
    // Firstly, check that we can add an existing claim if it's the first claim
    // in the sigchain
    const hPrev1 = await sigchain.getHashPrevious();
    const seq1 = await sigchain.getSequenceNumber();
    expect(hPrev1).toBeNull();
    expect(seq1).toBe(0);
    const claim1 = await claimsUtils.createClaim({
      privateKey: keyManager.getRootKeyPairPem().privateKey,
      hPrev: hPrev1,
      seq: seq1 + 1,
      data: {
        type: 'node',
        node1: nodeIdAEncoded,
        node2: nodeIdBEncoded,
      },
      kid: nodeIdAEncoded,
    });
    await sigchain.addExistingClaim(claim1);
    const hPrev2 = await sigchain.getHashPrevious();
    const seq2 = await sigchain.getSequenceNumber();
    expect(hPrev2).not.toBeNull();
    expect(seq2).toBe(1);

    // Now check we can add an additional claim after the first
    const claim2 = await claimsUtils.createClaim({
      privateKey: keyManager.getRootKeyPairPem().privateKey,
      hPrev: hPrev2,
      seq: seq2 + 1,
      data: {
        type: 'node',
        node1: nodeIdAEncoded,
        node2: nodeIdCEncoded,
      },
      kid: nodeIdAEncoded,
    });
    await sigchain.addExistingClaim(claim2);
    const hPrev3 = await sigchain.getHashPrevious();
    const seq3 = await sigchain.getSequenceNumber();
    expect(hPrev3).not.toBeNull();
    expect(seq3).toBe(2);

    // Check a claim with an invalid hash will throw an exception
    const claimInvalidHash = await claimsUtils.createClaim({
      privateKey: keyManager.getRootKeyPairPem().privateKey,
      hPrev: 'invalidHash',
      seq: seq3 + 1,
      data: {
        type: 'node',
        node1: nodeIdAEncoded,
        node2: nodeIdDEncoded,
      },
      kid: nodeIdDEncoded,
    });
    await expect(() =>
      sigchain.addExistingClaim(claimInvalidHash),
    ).rejects.toThrow(sigchainErrors.ErrorSigchainInvalidHash);

    // Check a claim with an invalid sequence number will throw an exception
    const claimInvalidSeqNum = await claimsUtils.createClaim({
      privateKey: keyManager.getRootKeyPairPem().privateKey,
      hPrev: hPrev3,
      seq: 1,
      data: {
        type: 'node',
        node1: nodeIdAEncoded,
        node2: nodeIdDEncoded,
      },
      kid: nodeIdDEncoded,
    });
    await expect(() =>
      sigchain.addExistingClaim(claimInvalidSeqNum),
    ).rejects.toThrow(sigchainErrors.ErrorSigchainInvalidSequenceNum);
  });
  test('retrieves chain data', async () => {
    const sigchain = await Sigchain.createSigchain({ keyManager, db, logger });
    const node2s: NodeIdEncoded[] = [];

    // Add 10 claims
    for (let i = 1; i <= 5; i++) {
      const node2 = nodesUtils.encodeNodeId(testUtils.generateRandomNodeId());
      node2s.push(node2);
      const nodeLink: ClaimData = {
        type: 'node',
        node1: srcNodeIdEncoded,
        node2: node2,
      };
      await sigchain.addClaim(nodeLink);
    }
    for (let i = 6; i <= 10; i++) {
      const identityLink: ClaimData = {
        type: 'identity',
        node: srcNodeIdEncoded,
        provider: ('ProviderId' + i.toString()) as ProviderId,
        identity: ('IdentityId' + i.toString()) as IdentityId,
      };
      await sigchain.addClaim(identityLink);
    }

    const chainData = await sigchain.getChainData();
    const chainDataKeys = Object.keys(chainData).sort();
    for (let i = 1; i <= 10; i++) {
      const claim = chainData[chainDataKeys[i - 1]];
      const decodedClaim = claimsUtils.decodeClaim(claim);
      if (i <= 5) {
        const node2 = node2s[i - 1];
        expect(decodedClaim.payload.data).toEqual({
          type: 'node',
          node1: srcNodeIdEncoded,
          node2: node2,
        });
      } else {
        expect(decodedClaim.payload.data).toEqual({
          type: 'identity',
          node: srcNodeIdEncoded,
          provider: ('ProviderId' + i.toString()) as ProviderId,
          identity: ('IdentityId' + i.toString()) as IdentityId,
        });
      }
    }
  });
  test('retrieves all cryptolinks (nodes and identities) from sigchain (in expected lexicographic order)', async () => {
    const sigchain = await Sigchain.createSigchain({ keyManager, db, logger });
    const nodes: NodeIdEncoded[] = [];

    // Add 30 claims
    for (let i = 1; i <= 30; i++) {
      // If even, add a node link
      if (i % 2 === 0) {
        const node2 = nodesUtils.encodeNodeId(testUtils.generateRandomNodeId());
        nodes[i] = node2;
        const nodeLink: ClaimData = {
          type: 'node',
          node1: srcNodeIdEncoded,
          node2: node2,
        };
        await sigchain.addClaim(nodeLink);
        // If odd, add an identity link
      } else {
        const identityLink: ClaimData = {
          type: 'identity',
          node: srcNodeIdEncoded,
          provider: ('ProviderId' + i.toString()) as ProviderId,
          identity: ('IdentityId' + i.toString()) as IdentityId,
        };
        await sigchain.addClaim(identityLink);
      }
    }

    // Creating a map of seq -> claimId
    const seqMap = await sigchain.getSeqMap();

    // Verify the nodes:
    const nodeLinks = await sigchain.getClaims('node');
    const decodedNodes = nodeLinks.map((n) => {
      return claimsUtils.decodeClaim(n);
    });
    let expectedSeqNum = 2;
    let i = 0;
    for (const d of decodedNodes) {
      // Check they've been returned in numerical order (according to the
      // lexicographic integer num)
      const seqNum = d.payload.seq;
      expect(seqNum).toBe(expectedSeqNum);

      // Verify the structure of claim
      const node2 = nodes[expectedSeqNum];
      const expected: Claim = {
        payload: {
          hPrev: claimsUtils.hashClaim(
            await sigchain.getClaim(seqMap[seqNum - 1]),
          ),
          seq: expectedSeqNum,
          data: {
            type: 'node',
            node1: srcNodeIdEncoded,
            node2: node2,
          },
          iat: expect.any(Number),
        },
        signatures: expect.any(Object),
      };
      expect(d).toEqual(expected);
      // Verify the signature
      expect(Object.keys(d.signatures).length).toBe(1);
      expect(d.signatures[srcNodeIdEncoded]).toBeDefined;
      expect(d.signatures[srcNodeIdEncoded].header).toStrictEqual({
        alg: 'RS256',
        kid: srcNodeIdEncoded,
      });
      const verified = await claimsUtils.verifyClaimSignature(
        nodeLinks[i],
        keyManager.getRootKeyPairPem().publicKey,
      );
      expect(verified).toBe(true);
      // Because every node link was an even number, we can simply add 2 to
      // the current sequence number to get the next expected one.
      expectedSeqNum = seqNum + 2;
      i++;
    }

    // Verify the identities:
    const identityLinks = await sigchain.getClaims('identity');
    const decodedIdentities = identityLinks.map((n) => {
      return claimsUtils.decodeClaim(n);
    });
    // Reset these counts
    expectedSeqNum = 1;
    i = 0;
    for (const id of decodedIdentities) {
      // Check they've been returned in numerical order (according to the
      // lexicographic integer num)
      const seqNum = id.payload.seq;
      expect(seqNum).toBe(expectedSeqNum);

      // Verify the structure of claim
      const expected: Claim = {
        payload: {
          hPrev:
            expectedSeqNum === 1
              ? null
              : claimsUtils.hashClaim(
                  await sigchain.getClaim(seqMap[seqNum - 1]),
                ),
          seq: expectedSeqNum,
          data: {
            type: 'identity',
            node: srcNodeIdEncoded,
            provider: ('ProviderId' + expectedSeqNum.toString()) as ProviderId,
            identity: ('IdentityId' + expectedSeqNum.toString()) as IdentityId,
          },
          iat: expect.any(Number),
        },
        signatures: expect.any(Object),
      };
      expect(id).toEqual(expected);
      // Verify the signature
      expect(Object.keys(id.signatures).length).toBe(1);
      expect(id.signatures[srcNodeIdEncoded]).toBeDefined;
      expect(id.signatures[srcNodeIdEncoded].header).toStrictEqual({
        alg: 'RS256',
        kid: srcNodeIdEncoded,
      });
      const verified = await claimsUtils.verifyClaimSignature(
        nodeLinks[i],
        keyManager.getRootKeyPairPem().publicKey,
      );
      expect(verified).toBe(true);
      // Because every identity link was an odd number, we can simply add 2 to
      // the current sequence number to get the next expected one.
      expectedSeqNum = seqNum + 2;
      i++;
    }

    await sigchain.stop();
  });
});
