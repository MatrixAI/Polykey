import type { GeneralJWSInput } from 'jose';
import type { PrivateKeyPem, PublicKeyPem } from '@/keys/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import type { Claim } from '@/claims/types';
import { createPublicKey, createPrivateKey } from 'crypto';
import { generalVerify, GeneralSign } from 'jose';
import canonicalize from 'canonicalize';
import { sleep } from '@/utils';
import * as claimsUtils from '@/claims/utils';
import * as claimsErrors from '@/claims/errors';
import { utils as keysUtils } from '@/keys';
import { utils as nodesUtils } from '@/nodes';
import * as testUtils from '../utils';
import * as testNodesUtils from '../nodes/utils';

describe('claims/utils', () => {
  // Node Ids
  const nodeId1 = testNodesUtils.generateRandomNodeId();
  const nodeId1Encoded = nodesUtils.encodeNodeId(nodeId1);
  const nodeId2 = testNodesUtils.generateRandomNodeId();
  const nodeId2Encoded = nodesUtils.encodeNodeId(nodeId2);

  let publicKey: PublicKeyPem;
  let privateKey: PrivateKeyPem;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    const globalKeyPairPem = keysUtils.keyPairToPem(globalKeyPair);
    publicKey = globalKeyPairPem.publicKey;
    privateKey = globalKeyPairPem.privateKey;
  });
  test('creates a claim (both node and identity)', async () => {
    const nodeClaim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: nodeId1Encoded,
        node2: nodeId2Encoded,
      },
      kid: nodeId1Encoded,
    });
    const identityClaim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'identity',
        node: nodeId1Encoded,
        provider: 'provider1' as ProviderId,
        identity: 'identity1' as IdentityId,
      },
      kid: nodeId1Encoded,
    });

    // Verify the claims with the module itself (to check the fields)
    // i.e. no dependencies on the other utility functions
    // Node:
    const jwkPublicKey = createPublicKey(publicKey);
    const { payload: nodePayload, protectedHeader: nodeProtectedHeader } =
      await generalVerify(nodeClaim as GeneralJWSInput, jwkPublicKey);
    expect(nodeProtectedHeader).toStrictEqual({
      alg: 'RS256',
      kid: nodeId1Encoded,
    });
    const textDecoder = new TextDecoder();
    const decodedNodePayload = JSON.parse(textDecoder.decode(nodePayload));
    expect(decodedNodePayload).toStrictEqual({
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: nodeId1Encoded,
        node2: nodeId2Encoded,
      },
      iat: expect.any(Number),
    });
    // Identity:
    const {
      payload: identityPayload,
      protectedHeader: identityProtectedHeader,
    } = await generalVerify(identityClaim as GeneralJWSInput, jwkPublicKey);
    expect(identityProtectedHeader).toStrictEqual({
      alg: 'RS256',
      kid: nodeId1Encoded,
    });
    const decodedIdentityPayload = JSON.parse(
      textDecoder.decode(identityPayload),
    );
    expect(decodedIdentityPayload).toStrictEqual({
      hPrev: null,
      seq: 1,
      data: {
        type: 'identity',
        node: nodeId1Encoded,
        provider: 'provider1' as ProviderId,
        identity: 'identity1' as IdentityId,
      },
      iat: expect.any(Number),
    });
  });
  test('decodes a singly signed node claim', async () => {
    const claim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: nodeId1Encoded,
        node2: nodeId2Encoded,
      },
      kid: nodeId1Encoded,
    });
    const decoded = claimsUtils.decodeClaim(claim);
    expect(decoded).toStrictEqual({
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: nodeId1Encoded,
          node2: nodeId2Encoded,
        },
        iat: expect.any(Number),
      },
      signatures: expect.any(Object), // Just check for existence right now
    });
    // Check the signatures field
    // Check we only have 1 signature
    expect(Object.keys(decoded.signatures).length).toBe(1);
    // Check signature of 'node1'
    expect(decoded.signatures[nodeId1Encoded]).toBeDefined();
    const header = decoded.signatures[nodeId1Encoded].header;
    const signature = decoded.signatures[nodeId1Encoded].signature;
    expect(typeof signature).toBe('string');
    expect(header.alg).toBe('RS256');
    expect(header.kid).toBe(nodeId1Encoded);
  });
  test('decodes a doubly signed node claim', async () => {
    const claim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: nodeId1Encoded,
        node2: nodeId2Encoded,
      },
      kid: nodeId1Encoded,
    });
    // Add another signature to the claim
    const doublySignedClaim = await claimsUtils.signExistingClaim({
      claim,
      privateKey,
      kid: nodeId2Encoded,
    });
    const decoded = claimsUtils.decodeClaim(doublySignedClaim);
    expect(decoded).toStrictEqual({
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: nodeId1Encoded,
          node2: nodeId2Encoded,
        },
        iat: expect.any(Number),
      },
      signatures: expect.any(Object), // Just check for existence right now
    });
    // Check the signatures field
    // Check we have both signatures
    expect(Object.keys(decoded.signatures).length).toBe(2);
    // Check signature of 'node1'
    expect(decoded.signatures[nodeId1Encoded]).toBeDefined();
    const header1 = decoded.signatures[nodeId1Encoded].header;
    const signature1 = decoded.signatures[nodeId1Encoded].signature;
    expect(typeof signature1).toBe('string');
    expect(header1.alg).toBe('RS256');
    expect(header1.kid).toBe(nodeId1Encoded);
    // Check signature of 'node2'
    expect(decoded.signatures[nodeId2Encoded]).toBeDefined();
    const header2 = decoded.signatures[nodeId2Encoded].header;
    const signature2 = decoded.signatures[nodeId2Encoded].signature;
    expect(typeof signature2).toBe('string');
    expect(header2.alg).toBe('RS256');
    expect(header2.kid).toBe(nodeId2Encoded);
  });
  test('decodes an identity claim', async () => {
    const claim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'identity',
        node: nodeId1Encoded,
        provider: 'provider1' as ProviderId,
        identity: 'identity1' as IdentityId,
      },
      kid: nodeId1Encoded,
    });
    const decoded = claimsUtils.decodeClaim(claim);
    expect(decoded).toStrictEqual({
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'identity',
          node: nodeId1Encoded,
          provider: 'provider1' as ProviderId,
          identity: 'identity1' as IdentityId,
        },
        iat: expect.any(Number),
      },
      signatures: expect.any(Object), // Just check for existence right now
    });
    // Check the signatures field
    // Check we only have 1 signature
    expect(Object.keys(decoded.signatures).length).toBe(1);
    // Check signature of 'node1'
    expect(decoded.signatures[nodeId1Encoded]).toBeDefined();
    const header = decoded.signatures[nodeId1Encoded].header;
    const signature = decoded.signatures[nodeId1Encoded].signature;
    expect(typeof signature).toBe('string');
    expect(header.alg).toBe('RS256');
    expect(header.kid).toBe(nodeId1Encoded);
  });
  test('fails to decode an invalid claim', async () => {
    const payload = {
      field1: 'invalid field',
      field2: 'also invalid',
    };
    // Make the payload contents deterministic
    const canonicalizedPayload = canonicalize(payload);
    const byteEncoder = new TextEncoder();
    const claim = new GeneralSign(byteEncoder.encode(canonicalizedPayload));
    claim.addSignature(createPrivateKey(privateKey)).setProtectedHeader({
      alg: 'RS256',
      kid: nodeId1Encoded,
    });
    const signedClaim = await claim.sign();
    expect(() => claimsUtils.decodeClaim(signedClaim)).toThrow(
      claimsErrors.ErrorClaimValidationFailed,
    );
  });
  test('decodes a claim header', async () => {
    const claim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: nodeId1Encoded,
        node2: nodeId2Encoded,
      },
      kid: nodeId1Encoded,
    });
    expect(claim.signatures[0].protected).toBeDefined();
    const decodedHeader = claimsUtils.decodeClaimHeader(
      claim.signatures[0].protected as string,
    );
    expect(decodedHeader).toStrictEqual({
      alg: 'RS256',
      kid: nodeId1Encoded,
    });
  });
  test('re-encodes a claim', async () => {
    const claim = await claimsUtils.createClaim({
      privateKey,
      hPrev: null,
      seq: 1,
      data: {
        type: 'node',
        node1: nodeId1Encoded,
        node2: nodeId2Encoded,
      },
      kid: nodeId1Encoded,
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
        node1: nodeId1Encoded,
        node2: nodeId2Encoded,
      },
      iat: expect.any(Number),
    });
    expect(protectedHeader).toStrictEqual({
      alg: 'RS256',
      kid: nodeId1Encoded,
    });

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
        node1: nodeId1Encoded,
        node2: nodeId2Encoded,
      },
      kid: nodeId1Encoded,
    });
    expect(await claimsUtils.verifyClaimSignature(claim, publicKey)).toBe(true);

    // Create some dummy public key, and check that this does not verify
    const dummyKeyPair = await keysUtils.generateKeyPair(2048);
    const dummyPublicKey = keysUtils.publicKeyToPem(dummyKeyPair.publicKey);
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
        node1: nodeId1Encoded,
        node2: nodeId2Encoded,
      },
      kid: nodeId1Encoded,
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
        node1: nodeId1Encoded,
        node2: nodeId2Encoded,
      },
      kid: nodeId1Encoded,
    });
    const hash2 = claimsUtils.hashClaim(claim2);
    expect(claimsUtils.verifyHashOfClaim(claim2, hash2)).toBe(true);
    expect(hash1).not.toBe(hash2);
    expect(claimsUtils.verifyHashOfClaim(claim1, hash2)).toBe(false);
    expect(claimsUtils.verifyHashOfClaim(claim2, hash1)).toBe(false);
  });
  test('validates valid claims', async () => {
    const singlySignedNodeClaim: Claim = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: nodeId1Encoded,
          node2: nodeId2Encoded,
        },
        iat: Date.now(), // Timestamp (initialised at JWS field)
      },
      signatures: {
        [nodeId1Encoded]: {
          signature: 'signature',
          header: {
            alg: 'RS256',
            kid: nodeId1Encoded,
          },
        },
      }, // Signee node ID -> claim signature
    };
    expect(
      claimsUtils.validateSinglySignedNodeClaim(singlySignedNodeClaim),
    ).toEqual(singlySignedNodeClaim);

    const doublySignedNodeClaim: Claim = {
      payload: {
        hPrev: null,
        seq: 1,
        data: {
          type: 'node',
          node1: nodeId1Encoded,
          node2: nodeId2Encoded,
        },
        iat: Date.now(), // Timestamp (initialised at JWS field)
      },
      signatures: {
        [nodeId1Encoded]: {
          signature: 'signature',
          header: {
            alg: 'RS256',
            kid: nodeId1Encoded,
          },
        },
        [nodeId2Encoded]: {
          signature: 'signature',
          header: {
            alg: 'RS256',
            kid: nodeId2Encoded,
          },
        },
      }, // Signee node ID -> claim signature
    };
    expect(
      claimsUtils.validateDoublySignedNodeClaim(doublySignedNodeClaim),
    ).toEqual(doublySignedNodeClaim);

    const identityClaim: Claim = {
      payload: {
        hPrev: 'somehash',
        seq: 3,
        data: {
          type: 'identity',
          node: nodeId1Encoded,
          identity: 'identity1' as IdentityId,
          provider: 'provider1' as ProviderId,
        },
        iat: Date.now(),
      },
      signatures: {
        [nodeId1Encoded]: {
          signature: 'signature',
          header: {
            alg: 'RS256',
            kid: nodeId1Encoded,
          },
        },
      },
    };
    expect(claimsUtils.validateIdentityClaim(identityClaim)).toEqual(
      identityClaim,
    );
  });
  test('rejects invalid singly signed claims', async () => {
    let claim = {
      payload: {
        hPrev: 0,
        seq: 1,
        data: {
          type: 'node',
          node1: nodeId1Encoded,
          node2: nodeId2Encoded,
        },
        iat: Date.now(), // Timestamp (initialised at JWS field)
      },
      signatures: {
        node1: {
          signature: 'signature',
          header: {
            alg: 'RS256',
            kid: nodeId1Encoded,
          },
        },
      }, // Signee node ID -> claim signature
    } as any;
    // Testing for incorrect data types
    expect(() => claimsUtils.validateSinglySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.hPrev = null;
    claim.payload.seq = 'invalid';
    expect(() => claimsUtils.validateSinglySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.seq = 1;
    claim.payload.data.type = 'invalid';
    expect(() => claimsUtils.validateSinglySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorNodesClaimType,
    );
    claim.payload.data.type = 'node';
    claim.payload.data.node1 = 1;
    expect(() => claimsUtils.validateSinglySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.data.node1 = nodeId1Encoded;
    claim.payload.data.node2 = 2;
    expect(() => claimsUtils.validateSinglySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.data.node2 = nodeId2Encoded;
    claim.payload.iat = 'invalid';
    expect(() => claimsUtils.validateSinglySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.iat = 1;
    claim.signatures = {};
    // Testing for incorrect number of signatures
    expect(() => claimsUtils.validateSinglySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimNumSignatures,
    );
    claim.signatures = {
      node1: {
        signature: 'signature',
        header: {
          alg: 'RS256',
          kid: nodeId1Encoded,
        },
      },
      node2: {
        signature: 'signature',
        header: {
          alg: 'RS256',
          kid: nodeId2Encoded,
        },
      },
    };
    expect(() => claimsUtils.validateSinglySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimNumSignatures,
    );
    claim = {
      notAField: 'invalid',
    };
    // Testing for missing/extra/incorrect fields
    expect(() => claimsUtils.validateSinglySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
  });
  test('rejects invalid doubly signed claims', async () => {
    let claim = {
      payload: {
        hPrev: 0,
        seq: 1,
        data: {
          type: 'node',
          node1: nodeId1Encoded,
          node2: nodeId2Encoded,
        },
        iat: Date.now(), // Timestamp (initialised at JWS field)
      },
      signatures: {
        node1: {
          signature: 'signature',
          header: {
            alg: 'RS256',
            kid: nodeId1Encoded,
          },
        },
        node2: {
          signature: 'signature',
          header: {
            alg: 'RS256',
            kid: nodeId2Encoded,
          },
        },
      }, // Signee node ID -> claim signature
    } as any;
    // Testing for incorrect data types
    expect(() => claimsUtils.validateDoublySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorDoublySignedClaimValidationFailed,
    );
    claim.payload.hPrev = null;
    claim.payload.seq = 'invalid';
    expect(() => claimsUtils.validateDoublySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorDoublySignedClaimValidationFailed,
    );
    claim.payload.seq = 1;
    claim.payload.data.type = 'invalid';
    expect(() => claimsUtils.validateDoublySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorNodesClaimType,
    );
    claim.payload.data.type = 'node';
    claim.payload.data.node1 = 1;
    expect(() => claimsUtils.validateDoublySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorDoublySignedClaimValidationFailed,
    );
    claim.payload.data.node1 = nodeId1Encoded;
    claim.payload.data.node2 = 2;
    expect(() => claimsUtils.validateDoublySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorDoublySignedClaimValidationFailed,
    );
    claim.payload.data.node2 = nodeId2Encoded;
    claim.payload.iat = 'invalid';
    expect(() => claimsUtils.validateDoublySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorDoublySignedClaimValidationFailed,
    );
    claim.payload.iat = 1;
    claim.signatures = {
      node1: {
        signature: 'signature',
        header: {
          alg: 'RS256',
          kid: nodeId1Encoded,
        },
      },
    };
    // Testing for incorrect number of signatures
    expect(() => claimsUtils.validateDoublySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorDoublySignedClaimNumSignatures,
    );
    claim.signatures = {
      node1: {
        signature: 'signature',
        header: {
          alg: 'RS256',
          kid: nodeId1Encoded,
        },
      },
      node2: {
        signature: 'signature',
        header: {
          alg: 'RS256',
          kid: nodeId2Encoded,
        },
      },
      node3: {
        signature: 'signature',
        header: {
          alg: 'RS256',
          kid: 'node3',
        },
      },
    };
    expect(() => claimsUtils.validateDoublySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorDoublySignedClaimNumSignatures,
    );
    claim = {
      notAField: 'invalid',
    };
    // Testing for missing/extra/incorrect fields
    expect(() => claimsUtils.validateDoublySignedNodeClaim(claim)).toThrow(
      claimsErrors.ErrorDoublySignedClaimValidationFailed,
    );
  });
  test('rejects invalid identity claims', async () => {
    let claim = {
      payload: {
        hPrev: 0,
        seq: 1,
        data: {
          type: 'identity',
          node: nodeId1Encoded,
          identity: 'identity1' as IdentityId,
          provider: 'provider1' as ProviderId,
        },
        iat: Date.now(),
      },
      signatures: {
        node1: {
          signature: 'signature',
          header: {
            alg: 'RS256',
            kid: nodeId1Encoded,
          },
        },
      },
    } as any;
    // Testing for incorrect data types
    expect(() => claimsUtils.validateIdentityClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.hPrev = null;
    claim.payload.seq = 'invalid';
    expect(() => claimsUtils.validateIdentityClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.seq = 1;
    claim.payload.data.type = 'invalid';
    expect(() => claimsUtils.validateIdentityClaim(claim)).toThrow(
      claimsErrors.ErrorIdentitiesClaimType,
    );
    claim.payload.data.type = 'identity';
    claim.payload.data.node = 1;
    expect(() => claimsUtils.validateIdentityClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.data.node = nodeId1Encoded;
    claim.payload.data.identity = 2;
    expect(() => claimsUtils.validateIdentityClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.data.identity = 'identity1';
    claim.payload.data.provider = 1;
    expect(() => claimsUtils.validateIdentityClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.data.provider = 'provider1';
    claim.payload.iat = 'invalid';
    expect(() => claimsUtils.validateIdentityClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
    claim.payload.iat = 1;
    // Testing for incorect number of signatures
    claim.signatures = {};
    expect(() => claimsUtils.validateIdentityClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimNumSignatures,
    );
    claim.signatures = {
      node1: {
        signature: 'signature',
        header: {
          alg: 'RS256',
          kid: nodeId1Encoded,
        },
      },
      node2: {
        signature: 'signature',
        header: {
          alg: 'RS256',
          kid: nodeId2Encoded,
        },
      },
    };
    expect(() => claimsUtils.validateIdentityClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimNumSignatures,
    );
    claim.signatures = {
      node1: {
        signature: 'signature',
        header: {
          alg: 'RS256',
          kid: nodeId1Encoded,
        },
      },
    };
    // Testing for missing/extra/incorrect fields
    claim = {
      notAField: 'invalid',
    };
    expect(() => claimsUtils.validateIdentityClaim(claim)).toThrow(
      claimsErrors.ErrorSinglySignedClaimValidationFailed,
    );
  });
});
