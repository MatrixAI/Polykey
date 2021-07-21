import type { ClaimData } from '@/claims/types';
import type { NodeId } from '@/nodes/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import type { PrivateKeyPem, PublicKeyPem } from '@/keys/types';

import * as claimsUtils from '@/claims/utils';
import * as keysUtils from '@/keys/utils';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { generalVerify, GeneralJWSInput } from 'jose/jws/general/verify';
import { createPublicKey } from 'crypto';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { KeyManager } from '@/keys';
import { sleep } from '@/utils';

describe('utils', () => {
  const logger = new Logger('Claims Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let keyManager: KeyManager;
  let publicKey: PublicKeyPem;
  let privateKey: PrivateKeyPem;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });
    publicKey = keyManager.getRootKeyPairPem().publicKey;
    privateKey = keyManager.getRootKeyPairPem().privateKey;
  });
  afterEach(async () => {
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('creates a claim (both node and identity)', async () => {
    const nodeClaim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: 'node1' as NodeId,
        node2: 'node2' as NodeId,
      } as ClaimData,
      kid: 'node1' as NodeId,
    });
    const identityClaim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'identity',
        node: 'node1' as NodeId,
        provider: 'provider1' as ProviderId,
        identity: 'identity1' as IdentityId,
      } as ClaimData,
      kid: 'node1' as NodeId,
    });

    // Verify the claims with the module itself (to check the fields)
    // i.e. no dependencies on the other utility functions
    // Node:
    const jwkPublicKey = createPublicKey(publicKey);
    const { payload: nodePayload, protectedHeader: nodeProtectedHeader } =
      await generalVerify(nodeClaim as GeneralJWSInput, jwkPublicKey);
    expect(nodeProtectedHeader).toStrictEqual({ alg: 'RS256', kid: 'node1' });
    const textDecoder = new TextDecoder();
    const decodedNodePayload = JSON.parse(textDecoder.decode(nodePayload));
    expect(decodedNodePayload).toStrictEqual({
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: 'node1' as NodeId,
        node2: 'node2' as NodeId,
      } as ClaimData,
      iat: expect.any(Number),
    });
    // Identity:
    const {
      payload: identityPayload,
      protectedHeader: identityProtectedHeader,
    } = await generalVerify(identityClaim as GeneralJWSInput, jwkPublicKey);
    expect(identityProtectedHeader).toStrictEqual({
      alg: 'RS256',
      kid: 'node1',
    });
    const decodedIdentityPayload = JSON.parse(
      textDecoder.decode(identityPayload),
    );
    expect(decodedIdentityPayload).toStrictEqual({
      hPrev: null,
      seq: 1,
      data: {
        type: 'identity',
        node: 'node1' as NodeId,
        provider: 'provider1' as ProviderId,
        identity: 'identity1' as IdentityId,
      } as ClaimData,
      iat: expect.any(Number),
    });
  });
  test('decodes a claim', async () => {
    const claim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: 'node1' as NodeId,
        node2: 'node2' as NodeId,
      } as ClaimData,
      kid: 'node1' as NodeId,
    });
    const decoded = claimsUtils.decodeClaim(claim);
    expect(decoded).toStrictEqual({
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: 'node1' as NodeId,
          node2: 'node2' as NodeId,
        } as ClaimData,
        iat: expect.any(Number),
      },
      signatures: expect.any(Object), // just check for existence right now
    });
    // Check the signatures field
    // Check we only have 1 signature
    expect(Object.keys(decoded.signatures).length).toBe(1);
    // Check signature of 'node1'
    expect(decoded.signatures['node1']).toBeDefined();
    const header = decoded.signatures['node1'].header;
    const signature = decoded.signatures['node1'].signature;
    expect(typeof signature).toBe('string');
    expect(header.alg).toBe('RS256');
    expect(header.kid).toBe('node1');
  });
  test('decodes a claim header', async () => {
    const claim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: 'node1' as NodeId,
        node2: 'node2' as NodeId,
      } as ClaimData,
      kid: 'node1' as NodeId,
    });
    expect(claim.signatures[0].protected).toBeDefined();
    const decodedHeader = claimsUtils.decodeClaimHeader(
      claim.signatures[0].protected as string,
    );
    expect(decodedHeader).toStrictEqual({
      alg: 'RS256',
      kid: 'node1' as NodeId,
    });
  });
  test('re-encodes a claim', async () => {
    const claim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: 'node1' as NodeId,
        node2: 'node2' as NodeId,
      } as ClaimData,
      kid: 'node1' as NodeId,
    });
    const decodedClaim = claimsUtils.decodeClaim(claim);
    const reEncodedClaim = await claimsUtils.encodeClaim(decodedClaim);
    // Check original claim is exactly the same as re-encoded claim
    expect(reEncodedClaim).toStrictEqual(claim);

    // Check the re-encoded claim can be decoded as well
    const reDecodedClaim = claimsUtils.decodeClaim(reEncodedClaim);
    expect(reDecodedClaim).toStrictEqual(decodedClaim);

    // Also check that it can still be verified with the module
    const jwkPublicKey = createPublicKey(publicKey);
    const { payload, protectedHeader } = await generalVerify(
      reEncodedClaim as GeneralJWSInput,
      jwkPublicKey,
    );
    const textDecoder = new TextDecoder();
    const decodedPayload = JSON.parse(textDecoder.decode(payload));
    // Expect the original inserted payload and header
    expect(decodedPayload).toStrictEqual({
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: 'node1' as NodeId,
        node2: 'node2' as NodeId,
      } as ClaimData,
      iat: expect.any(Number),
    });
    expect(protectedHeader).toStrictEqual({ alg: 'RS256', kid: 'node1' });

    // TODO: Check when using multiple signatures
    // Order of signatures array (probably) doesn't matter
  });
  test('verifies a claim signature', async () => {
    const claim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: 'node1' as NodeId,
        node2: 'node2' as NodeId,
      } as ClaimData,
      kid: 'node1' as NodeId,
    });
    expect(await claimsUtils.verifyClaimSignature(claim, publicKey)).toBe(true);

    // Create some dummy public key, and check that this does not verify
    const dummyKeyPair = await keysUtils.generateKeyPair(4096);
    const dummyPublicKey = await keysUtils.publicKeyToPem(
      dummyKeyPair.publicKey,
    );
    expect(await claimsUtils.verifyClaimSignature(claim, dummyPublicKey)).toBe(
      false,
    );
  });
  test('verifies a claim hash', async () => {
    const claim1 = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: 'node1' as NodeId,
        node2: 'node2' as NodeId,
      } as ClaimData,
      kid: 'node1' as NodeId,
    });
    const hash1 = claimsUtils.hashClaim(claim1);
    expect(claimsUtils.verifyHashOfClaim(claim1, hash1)).toBe(true);

    // Sleep so we get a different iat time
    await sleep(1000);
    // Create another claim, and ensure it's hash doesn't match
    const claim2 = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: 'node1' as NodeId,
        node2: 'node2' as NodeId,
      } as ClaimData,
      kid: 'node1' as NodeId,
    });
    const hash2 = claimsUtils.hashClaim(claim2);
    expect(claimsUtils.verifyHashOfClaim(claim2, hash2)).toBe(true);
    expect(hash1).not.toBe(hash2);
    expect(claimsUtils.verifyHashOfClaim(claim1, hash2)).toBe(false);
    expect(claimsUtils.verifyHashOfClaim(claim2, hash1)).toBe(false);
  });
});
