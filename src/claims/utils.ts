import type { Claim, ClaimEncoded, ClaimData, SignatureData } from './types';
import type { NodeId } from '../nodes/types';
import type { PublicKeyPem, PrivateKeyPem } from '../keys/types';
import type { POJO } from '../types';

import { GeneralSign } from 'jose/jws/general/sign';
import { generalVerify, GeneralJWSInput } from 'jose/jws/general/verify';
import { generateKeyPair } from 'jose/util/generate_key_pair';
import { decode } from 'jose/util/base64url';
import { createPublicKey, createPrivateKey } from 'crypto';
import { md } from 'node-forge';
import lexi from 'lexicographic-integer';
import canonicalize from 'canonicalize';
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

// TODO: Potentially need a createUnsignedClaim function that returns a
// claim = new GeneralSign(payload). This will be needed to sign the claim by
// both nodes, when creating a node -> node claim.

/**
 * Converts a number to a lexicographic hex string (for use in createClaim).
 * These can be used as numerical keys in leveldb. Because leveldb is stored
 * (and retrieved) in lexicographic order, using hex strings allows numbers
 * to be stored in numerical order.
 * e.g. 1 -> '01', 253 -> 'fb02'
 */
function numToLexiString(num: number): string {
  return lexi.pack(num, 'hex');
}

/**
 * Converts a lexicographic string back to its numerical form.
 */
function lexiStringToNum(lexiString: string): number {
  return lexi.unpack(lexiString);
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
  return decoded;
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

function verifyHashOfClaim(claim: ClaimEncoded, claimHash: string): boolean {
  const newHash = hashClaim(claim);
  if (newHash === claimHash) {
    return true;
  } else {
    return false;
  }
}

export {
  createClaim,
  numToLexiString,
  lexiStringToNum,
  hashClaim,
  decodeClaim,
  decodeClaimHeader,
  encodeClaim,
  verifyClaimSignature,
  verifyHashOfClaim,
};
