import type { Claim, ClaimId, ClaimData } from '@/claims/types';
import type { NodeId } from '@/nodes/types';
import type { ProviderId, IdentityId } from '@/identities/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { KeyManager } from '@/keys';
import { DB } from '@/db';
import { Sigchain } from '@/sigchain';
import * as claimsUtils from '@/claims/utils';
import * as sigchainErrors from '@/sigchain/errors';

describe('Sigchain', () => {
  const logger = new Logger('Sigchain Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
  const srcNodeId = 'NodeId1' as NodeId;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = await KeyManager.createKeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({ dbPath, logger });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
  });
  afterEach(async () => {
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('async start initialises the sequence number', async () => {
    const sigchain = new Sigchain({ keyManager, db, logger });
    await sigchain.start();
    const sequenceNumber = await sigchain.getSequenceNumber();
    expect(sequenceNumber).toBe(0);
    await sigchain.stop();
  });
  test('adds and retrieves a cryptolink, verifies signature', async () => {
    const sigchain = new Sigchain({ keyManager, db, logger });
    await sigchain.start();
    const cryptolink: ClaimData = {
      type: 'node',
      node1: srcNodeId,
      node2: 'NodeId2' as NodeId,
    };
    await sigchain.addClaim(cryptolink);
    const claim = await sigchain.getClaim(1);

    // Check the claim is correct
    const decoded = claimsUtils.decodeClaim(claim);
    const expected: Claim = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: srcNodeId,
          node2: 'NodeId2' as NodeId,
        },
        iat: expect.any(Number),
      },
      signatures: expect.any(Object),
    };
    expect(decoded).toStrictEqual(expected);

    // Check the signature is valid
    expect(Object.keys(decoded.signatures).length).toBe(1);
    expect(decoded.signatures[srcNodeId]).toBeDefined;
    expect(decoded.signatures[srcNodeId].header).toStrictEqual({
      alg: 'RS256',
      kid: srcNodeId,
    });
    const verified = await claimsUtils.verifyClaimSignature(
      claim,
      keyManager.getRootKeyPairPem().publicKey,
    );
    expect(verified).toBe(true);

    await sigchain.stop();
  });
  test('adds and retrieves 2 cryptolinks, verifies signatures and hash', async () => {
    const sigchain = new Sigchain({ keyManager, db, logger });
    await sigchain.start();
    const cryptolink: ClaimData = {
      type: 'node',
      node1: srcNodeId,
      node2: 'NodeId2' as NodeId,
    };
    await sigchain.addClaim(cryptolink);

    const cryptolink2: ClaimData = {
      type: 'node',
      node1: srcNodeId,
      node2: 'NodeId3' as NodeId,
    };
    await sigchain.addClaim(cryptolink2);

    const claim1 = await sigchain.getClaim(1);
    const claim2 = await sigchain.getClaim(2);

    // Check the claim is correct
    const decoded1 = claimsUtils.decodeClaim(claim1);
    const expected1: Claim = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: srcNodeId,
          node2: 'NodeId2' as NodeId,
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
          node1: srcNodeId,
          node2: 'NodeId3' as NodeId,
        },
        iat: expect.any(Number),
      },
      signatures: expect.any(Object),
    };
    expect(decoded2).toStrictEqual(expected2);

    // Check the signature is valid in each claim
    expect(Object.keys(decoded1.signatures).length).toBe(1);
    expect(decoded1.signatures[srcNodeId]).toBeDefined;
    expect(decoded1.signatures[srcNodeId].header).toStrictEqual({
      alg: 'RS256',
      kid: srcNodeId,
    });
    const verified1 = await claimsUtils.verifyClaimSignature(
      claim1,
      keyManager.getRootKeyPairPem().publicKey,
    );
    expect(verified1).toBe(true);

    expect(Object.keys(decoded2.signatures).length).toBe(1);
    expect(decoded2.signatures[srcNodeId]).toBeDefined;
    expect(decoded2.signatures[srcNodeId].header).toStrictEqual({
      alg: 'RS256',
      kid: srcNodeId,
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
    const sigchain = new Sigchain({ keyManager, db, logger });
    await sigchain.start();
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
        node1: 'A' as NodeId,
        node2: 'B' as NodeId,
      },
      kid: 'A' as NodeId,
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
        node1: 'A' as NodeId,
        node2: 'C' as NodeId,
      },
      kid: 'A' as NodeId,
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
        node1: 'A' as NodeId,
        node2: 'D' as NodeId,
      },
      kid: 'D' as NodeId,
    });
    await expect(sigchain.addExistingClaim(claimInvalidHash)).rejects.toThrow(
      sigchainErrors.ErrorSigchainInvalidHash,
    );

    // Check a claim with an invalid sequence number will throw an exception
    const claimInvalidSeqNum = await claimsUtils.createClaim({
      privateKey: keyManager.getRootKeyPairPem().privateKey,
      hPrev: hPrev3,
      seq: 1,
      data: {
        type: 'node',
        node1: 'A' as NodeId,
        node2: 'D' as NodeId,
      },
      kid: 'D' as NodeId,
    });
    await expect(sigchain.addExistingClaim(claimInvalidSeqNum)).rejects.toThrow(
      sigchainErrors.ErrorSigchainInvalidSequenceNum,
    );
  });
  test('retrieves chain data', async () => {
    const sigchain = new Sigchain({ keyManager, db, logger });
    await sigchain.start();

    // Add 10 claims
    for (let i = 1; i <= 5; i++) {
      const nodeLink: ClaimData = {
        type: 'node',
        node1: srcNodeId,
        node2: ('NodeId' + i.toString()) as NodeId,
      };
      await sigchain.addClaim(nodeLink);
    }
    for (let i = 6; i <= 10; i++) {
      const identityLink: ClaimData = {
        type: 'identity',
        node: srcNodeId,
        provider: ('ProviderId' + i.toString()) as ProviderId,
        identity: ('IdentityId' + i.toString()) as IdentityId,
      };
      await sigchain.addClaim(identityLink);
    }

    const chainData = await sigchain.getChainData();
    for (let i = 1; i <= 10; i++) {
      const claimId = claimsUtils.numToLexiString(i) as ClaimId;
      const claim = chainData[claimId];
      const decodedClaim = claimsUtils.decodeClaim(claim);
      if (i <= 5) {
        expect(decodedClaim.payload.data).toEqual({
          type: 'node',
          node1: srcNodeId,
          node2: ('NodeId' + i.toString()) as NodeId,
        });
      } else {
        expect(decodedClaim.payload.data).toEqual({
          type: 'identity',
          node: srcNodeId,
          provider: ('ProviderId' + i.toString()) as ProviderId,
          identity: ('IdentityId' + i.toString()) as IdentityId,
        });
      }
    }
  });
  test('retrieves all cryptolinks (nodes and identities) from sigchain (in expected lexicographic order)', async () => {
    const sigchain = new Sigchain({ keyManager, db, logger });
    await sigchain.start();

    // Add 30 claims
    for (let i = 1; i <= 30; i++) {
      // If even, add a node link
      if (i % 2 === 0) {
        const nodeLink: ClaimData = {
          type: 'node',
          node1: srcNodeId,
          node2: ('NodeId' + i.toString()) as NodeId,
        };
        await sigchain.addClaim(nodeLink);
        // If odd, add an identity link
      } else {
        const identityLink: ClaimData = {
          type: 'identity',
          node: srcNodeId,
          provider: ('ProviderId' + i.toString()) as ProviderId,
          identity: ('IdentityId' + i.toString()) as IdentityId,
        };
        await sigchain.addClaim(identityLink);
      }
    }

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
      const expected: Claim = {
        payload: {
          hPrev: claimsUtils.hashClaim(await sigchain.getClaim(seqNum - 1)),
          seq: expectedSeqNum,
          data: {
            type: 'node',
            node1: srcNodeId,
            node2: ('NodeId' + expectedSeqNum.toString()) as NodeId,
          },
          iat: expect.any(Number),
        },
        signatures: expect.any(Object),
      };
      expect(d).toEqual(expected);
      // Verify the signature
      expect(Object.keys(d.signatures).length).toBe(1);
      expect(d.signatures[srcNodeId]).toBeDefined;
      expect(d.signatures[srcNodeId].header).toStrictEqual({
        alg: 'RS256',
        kid: srcNodeId,
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
              : claimsUtils.hashClaim(await sigchain.getClaim(seqNum - 1)),
          seq: expectedSeqNum,
          data: {
            type: 'identity',
            node: srcNodeId,
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
      expect(id.signatures[srcNodeId]).toBeDefined;
      expect(id.signatures[srcNodeId].header).toStrictEqual({
        alg: 'RS256',
        kid: srcNodeId,
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
