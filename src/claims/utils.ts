import type {
  Claim,
  ClaimEncoded,
  ClaimData,
  SignatureData,
  ClaimIntermediary,
} from './types';
import type { NodeId } from '../nodes/types';
import type { PublicKeyPem, PrivateKeyPem } from '../keys/types';
import type { POJO } from '../types';

import { GeneralSign } from 'jose/jws/general/sign';
import { generalVerify, GeneralJWSInput } from 'jose/jws/general/verify';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { decode } from 'jose/util/base64url';
import { createPublicKey, createPrivateKey } from 'crypto';
import { md } from 'node-forge';
import { DefinedError } from 'ajv';
import canonicalize from 'canonicalize';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';

import {
  claimIdentityValidate,
  claimNodeSinglySignedValidate,
  claimNodeDoublySignedValidate,
} from './schema';
import * as claimsErrors from './errors';

/**
 * Helper function to generate a JWS containing the contents of the claim to be
 * added (e.g. to the sigchain). All claims require the following parameters:
 * @param privateKey: private key in PEM format (for signing claim)
 * @param hPrev: hash of the previous claim (null if first claim)
 * @param seq: sequence number (as a lexicographic-integer)
 * @param data: the custom payload data
 * @param kid: the node ID of the signing keynode
 * @param alg: the algorithm used to generate signature (RS256 for RSA keys)
 * @returns the JWS claim itself
 */
async function createClaim({
  privateKey,
  hPrev,
  seq,
  data,
  kid,
  alg = 'RS256',
}: {
  privateKey: PrivateKeyPem;
  hPrev: string | null;
  seq: number;
  data: ClaimData;
  kid: NodeId;
  alg?: string;
}): Promise<ClaimEncoded> {
  const payload = {
    hPrev: hPrev,
    seq: seq,
    data: data,
    iat: Date.now(),
  };
  // Make the payload contents deterministic
  const canonicalizedPayload = canonicalize(payload);
  const byteEncoder = new TextEncoder();
  const claim = new GeneralSign(byteEncoder.encode(canonicalizedPayload));
  claim
    .addSignature(await createPrivateKey(privateKey))
    .setProtectedHeader({ alg: alg, kid: kid });
  const signedClaim = await claim.sign();
  return signedClaim as ClaimEncoded;
}

/**
 * Helper function to deconstruct a created GeneralJWS (ClaimEncoded) object and
 * add a new signature to it.
 */
async function signExistingClaim({
  claim,
  privateKey,
  kid,
  alg = 'RS256',
}: {
  claim: ClaimEncoded;
  privateKey: PrivateKeyPem;
  kid: NodeId;
  alg?: string;
}): Promise<ClaimEncoded> {
  const decodedClaim = await decodeClaim(claim);
  // Reconstruct the claim with our own signature
  // Make the payload contents deterministic
  const canonicalizedPayload = canonicalize(decodedClaim.payload);
  const byteEncoder = new TextEncoder();
  const newClaim = new GeneralSign(byteEncoder.encode(canonicalizedPayload));
  newClaim
    .addSignature(await createPrivateKey(privateKey))
    .setProtectedHeader({ alg: alg, kid: kid });
  const signedClaim = await newClaim.sign();
  // Add our signature to the existing claim
  claim.signatures.push({
    signature: signedClaim.signatures[0].signature,
    protected: signedClaim.signatures[0].protected,
  });
  return claim;
}

/**
 * Signs a received intermediary claim. Used for cross-signing process.
 */
async function signIntermediaryClaim({
  claim,
  privateKey,
  signeeNodeId,
  alg = 'RS256',
}: {
  claim: ClaimIntermediary;
  privateKey: PrivateKeyPem;
  signeeNodeId: NodeId;
  alg?: string;
}): Promise<ClaimEncoded> {
  // Won't ever be undefined (at least in agentService), but for type safety
  if (!claim.payload) {
    throw new claimsErrors.ErrorClaimsUndefinedClaimPayload();
  }
  // Reconstuct the claim as a regular ClaimEncoded
  const reconstructedClaim: ClaimEncoded = {
    payload: claim.payload,
    signatures: [
      {
        signature: claim.signature.signature,
        protected: claim.signature.protected,
      },
    ],
  };
  const doublySignedClaim = await signExistingClaim({
    claim: reconstructedClaim,
    privateKey: privateKey,
    kid: signeeNodeId,
    alg: alg,
  });
  return doublySignedClaim;
}

/**
 * Helper function to hash a provided claim (with SHA256).
 * Canonicalizes the claim (to create a deterministic string) and hashs the
 * entirety of the provided claim.
 */
function hashClaim(claim: ClaimEncoded): string {
  const hash = md.sha256.create();
  // Make the payload contents deterministic
  const canonicalizedClaim = canonicalize(claim);
  // Should never be reached, but just to be type safe (can return undefined)
  if (canonicalizedClaim == null) {
    throw new claimsErrors.ErrorClaimsUndefinedCanonicalizedClaim();
  }
  hash.update(canonicalizedClaim);
  return hash.digest().toHex();
}

/**
 * Decodes a ClaimEncoded, returning a JSON object of decoded JWS fields.
 * Assumes the Claim has been created from claimsUtils.createClaim (we expect
 * certain JSON fields when decoding).
 */
function decodeClaim(claim: ClaimEncoded): Claim {
  const textDecoder = new TextDecoder();
  const signatures: Record<NodeId, SignatureData> = {};
  // Add each of the signatures and their decoded headers
  for (const data of claim.signatures) {
    // Again, should never be reached
    if (!data.protected) {
      throw new claimsErrors.ErrorClaimsUndefinedSignatureHeader();
    }
    const decodedHeader = JSON.parse(
      textDecoder.decode(decode(data.protected)),
    );
    signatures[decodedHeader.kid] = {
      signature: data.signature,
      header: {
        alg: decodedHeader.alg,
        kid: decodedHeader.kid,
      },
    };
  }

  // Should never be reached (a ClaimEncoded type should always have a payload,
  // as it's assumed to be created from claimsUtils::createClaim)
  if (!claim.payload) {
    throw new claimsErrors.ErrorClaimsUndefinedClaimPayload();
  }
  const payload = JSON.parse(textDecoder.decode(decode(claim.payload)));

  const decoded: Claim = {
    payload: {
      hPrev: payload.hPrev,
      seq: payload.seq,
      data: payload.data,
      iat: payload.iat,
    },
    signatures: signatures,
  };

  let validatedDecoded: Claim;
  // Firstly, make sure our data field is defined
  if (decoded.payload.data == null) {
    throw new claimsErrors.ErrorClaimValidationFailed();
  }
  if (Object.keys(signatures).length === 1) {
    if ('identity' in decoded.payload.data) {
      validatedDecoded = validateIdentityClaim(decoded);
    } else {
      validatedDecoded = validateSinglySignedNodeClaim(decoded);
    }
  } else if (Object.keys(signatures).length === 2) {
    validatedDecoded = validateDoublySignedNodeClaim(decoded);
  } else {
    throw new claimsErrors.ErrorClaimValidationFailed();
  }

  return validatedDecoded;
}

/**
 * Decodes the header of a ClaimEncoded.
 * Assumes encoded header is of form { alg: string, kid: NodeId }.
 */
function decodeClaimHeader(header: string): { alg: string; kid: NodeId } {
  const textDecoder = new TextDecoder();
  const decodedHeader = JSON.parse(textDecoder.decode(decode(header)));
  return { alg: decodedHeader.alg, kid: decodedHeader.kid as NodeId };
}

/**
 * Re-encodes a Claim as a ClaimEncoded.
 * As can be determined from the expected Claim type, this function
 * assumes the decoded claim has been created from decodeClaim().
 */
async function encodeClaim(claim: Claim): Promise<ClaimEncoded> {
  const payload = {
    hPrev: claim.payload.hPrev,
    seq: claim.payload.seq,
    data: claim.payload.data,
    iat: claim.payload.iat,
  };
  // Make the payload contents deterministic
  const canonicalizedPayload = canonicalize(payload);
  const byteEncoder = new TextEncoder();
  const unsignedClaim = new GeneralSign(
    byteEncoder.encode(canonicalizedPayload),
  );
  // Sign the new claim with dummy private keys for now
  for (const nodeId in claim.signatures) {
    const signatureData = claim.signatures[nodeId as NodeId];
    const header = signatureData.header;
    // Create a dummy private key for the current alg
    const { privateKey } = await generateKeyPair(header.alg);
    unsignedClaim
      .addSignature(privateKey)
      .setProtectedHeader({ alg: header.alg, kid: header.kid });
  }
  const incorrectClaim = await unsignedClaim.sign();

  // Need to construct the correct 'signatures' array to replace in incorectClaim
  const correctSignatureData: Array<{ signature: string; protected: string }> =
    [];
  const textDecoder = new TextDecoder();
  // Iterate over the signatureData from the incorrectClaim
  for (const data of incorrectClaim.signatures) {
    // Should never be reached
    if (!data.protected) {
      throw new claimsErrors.ErrorClaimsUndefinedSignatureHeader();
    }
    // Decode 'protected' header
    const decodedHeader = JSON.parse(
      textDecoder.decode(decode(data.protected)),
    );
    const nodeId = decodedHeader.kid as NodeId;
    // Get the correct signature from the original passed Claim
    const correctSignature = claim.signatures[nodeId].signature;
    correctSignatureData.push({
      signature: correctSignature,
      protected: data.protected,
    });
  }
  // Create a POJO from the incorrectClaim, and simply replace the signatures
  // field with the constructed signature data
  const correctClaim = incorrectClaim as POJO;
  correctClaim.signatures = correctSignatureData;
  return correctClaim as ClaimEncoded;
}

async function verifyClaimSignature(
  claim: ClaimEncoded,
  publicKey: PublicKeyPem,
): Promise<boolean> {
  const jwkPublicKey = createPublicKey(publicKey);
  try {
    await generalVerify(claim as GeneralJWSInput, jwkPublicKey);
    return true;
  } catch (e) {
    return false;
  }
}

async function verifyIntermediaryClaimSignature(
  claim: ClaimIntermediary,
  publicKey: PublicKeyPem,
): Promise<boolean> {
  // Reconstruct as ClaimEncoded
  const reconstructedClaim: ClaimEncoded = {
    payload: claim.payload,
    signatures: [
      {
        protected: claim.signature.protected,
        signature: claim.signature.signature,
      },
    ],
  };
  const jwkPublicKey = createPublicKey(publicKey);
  try {
    await generalVerify(reconstructedClaim as GeneralJWSInput, jwkPublicKey);
    return true;
  } catch (e) {
    return false;
  }
}

function verifyHashOfClaim(claim: ClaimEncoded, claimHash: string): boolean {
  const newHash = hashClaim(claim);
  if (newHash === claimHash) {
    return true;
  } else {
    return false;
  }
}

/**
 * JSON schema validator for identity claims
 */
function validateIdentityClaim(claim: Record<string, unknown>): Claim {
  if (claimIdentityValidate(claim)) {
    return claim as Claim;
  } else {
    for (const err of claimIdentityValidate.errors as DefinedError[]) {
      if (err.keyword === 'minProperties' || err.keyword === 'maxProperties') {
        throw new claimsErrors.ErrorSinglySignedClaimNumSignatures();
      } else if (err.keyword === 'const') {
        throw new claimsErrors.ErrorIdentitiesClaimType();
      }
    }
    throw new claimsErrors.ErrorSinglySignedClaimValidationFailed();
  }
}

/**
 * JSON schema validator for singly-signed node claims
 */
function validateSinglySignedNodeClaim(claim: Record<string, unknown>): Claim {
  if (claimNodeSinglySignedValidate(claim)) {
    return claim as Claim;
  } else {
    for (const err of claimNodeSinglySignedValidate.errors as DefinedError[]) {
      if (err.keyword === 'minProperties' || err.keyword === 'maxProperties') {
        throw new claimsErrors.ErrorSinglySignedClaimNumSignatures();
      } else if (err.keyword === 'const') {
        throw new claimsErrors.ErrorNodesClaimType();
      }
    }
    throw new claimsErrors.ErrorSinglySignedClaimValidationFailed();
  }
}

/**
 * JSON schema validator for doubly-signed node claims
 */
function validateDoublySignedNodeClaim(claim: Record<string, unknown>): Claim {
  if (claimNodeDoublySignedValidate(claim)) {
    return claim as Claim;
  } else {
    for (const err of claimNodeDoublySignedValidate.errors as DefinedError[]) {
      if (err.keyword === 'minProperties' || err.keyword === 'maxProperties') {
        throw new claimsErrors.ErrorDoublySignedClaimNumSignatures();
      } else if (err.keyword === 'const') {
        throw new claimsErrors.ErrorNodesClaimType();
      }
    }
    throw new claimsErrors.ErrorDoublySignedClaimValidationFailed();
  }
}

/**
 * Constructs a CrossSignMessage (for GRPC transfer) from a singly-signed claim
 * and/or a doubly-signed claim.
 */
function createCrossSignMessage({
  singlySignedClaim = undefined,
  doublySignedClaim = undefined,
}: {
  singlySignedClaim?: ClaimIntermediary;
  doublySignedClaim?: ClaimEncoded;
}): nodesPB.CrossSign {
  const crossSignMessage = new nodesPB.CrossSign();
  // Construct the singly signed claim message
  if (singlySignedClaim != null) {
    // Should never be reached, but for type safety
    if (singlySignedClaim.payload == null) {
      throw new claimsErrors.ErrorClaimsUndefinedClaimPayload();
    }
    const singlyMessage = new nodesPB.ClaimIntermediary();
    singlyMessage.setPayload(singlySignedClaim.payload);
    const singlySignatureMessage = new nodesPB.Signature();
    singlySignatureMessage.setProtected(singlySignedClaim.signature.protected!);
    singlySignatureMessage.setSignature(singlySignedClaim.signature.signature);
    singlyMessage.setSignature(singlySignatureMessage);
    crossSignMessage.setSinglySignedClaim(singlyMessage);
  }
  // Construct the doubly signed claim message
  if (doublySignedClaim != null) {
    // Should never be reached, but for type safety
    if (doublySignedClaim.payload == null) {
      throw new claimsErrors.ErrorClaimsUndefinedClaimPayload();
    }
    const doublyMessage = new nodesPB.AgentClaim();
    doublyMessage.setPayload(doublySignedClaim.payload);
    for (const s of doublySignedClaim.signatures) {
      const signatureMessage = new nodesPB.Signature();
      signatureMessage.setProtected(s.protected!);
      signatureMessage.setSignature(s.signature);
      doublyMessage.getSignaturesList().push(signatureMessage);
    }
    crossSignMessage.setDoublySignedClaim(doublyMessage);
  }
  return crossSignMessage;
}

/**
 * Reconstructs a ClaimIntermediary object from a ClaimIntermediaryMessage (i.e.
 * after GRPC transport).
 */
function reconstructClaimIntermediary(
  intermediaryMsg: nodesPB.ClaimIntermediary,
): ClaimIntermediary {
  const signatureMsg = intermediaryMsg.getSignature();
  if (signatureMsg == null) {
    throw claimsErrors.ErrorUndefinedSignature;
  }
  const claim: ClaimIntermediary = {
    payload: intermediaryMsg.getPayload(),
    signature: {
      protected: signatureMsg.getProtected(),
      signature: signatureMsg.getSignature(),
    },
  };
  return claim;
}

/**
 * Reconstructs a ClaimEncoded object from a ClaimMessage (i.e. after GRPC
 * transport).
 */
function reconstructClaimEncoded(claimMsg: nodesPB.AgentClaim): ClaimEncoded {
  const claim: ClaimEncoded = {
    payload: claimMsg.getPayload(),
    signatures: claimMsg.getSignaturesList().map((signatureMsg) => {
      return {
        protected: signatureMsg.getProtected(),
        signature: signatureMsg.getSignature(),
      };
    }),
  };
  return claim;
}

export {
  createClaim,
  signExistingClaim,
  signIntermediaryClaim,
  hashClaim,
  decodeClaim,
  decodeClaimHeader,
  encodeClaim,
  verifyClaimSignature,
  verifyIntermediaryClaimSignature,
  verifyHashOfClaim,
  validateIdentityClaim,
  validateSinglySignedNodeClaim,
  validateDoublySignedNodeClaim,
  createCrossSignMessage,
  reconstructClaimIntermediary,
  reconstructClaimEncoded,
};
