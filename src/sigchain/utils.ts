import type { Claim, DecodedClaim, ClaimPayload, ClaimData } from './types';
import type { PublicKeyPem } from '../keys/types';

import { utils as keysUtils } from '../keys';
import * as sigchainErrors from './errors';
import { jwtVerify } from 'jose/jwt/verify';
import { createPublicKey } from 'crypto';
import { decode } from 'jose/util/base64url';
import { md } from 'node-forge';

// Assumes the Claim has been constructed through the Sigchain::createClaim()
// function.
function decodeClaim(claim: Claim): DecodedClaim {
  const textDecoder = new TextDecoder();
  const header = JSON.parse(textDecoder.decode(decode(claim.split('.')[0])));
  const payload = JSON.parse(textDecoder.decode(decode(claim.split('.')[1])));

  const claimPayload: ClaimPayload = {
    hashPrevious: payload.hashPrevious,
    sequenceNumber: payload.sequenceNumber as number,
    claimData: payload.claimData as ClaimData,
  };
  const decoded = {
    header: {
      alg: header.alg,
    },
    payload: {
      ...claimPayload,
      iat: payload.iat,
    },
  } as DecodedClaim;
  return decoded;
}

async function verifyClaimSignature(
  claim: Claim,
  publicKey: PublicKeyPem,
): Promise<boolean> {
  const jwkPublicKey = createPublicKey(publicKey);
  try {
    await jwtVerify(claim, jwkPublicKey);
    return true;
  } catch (e) {
    return false;
  }
}

function verifyHashOfClaim(claim: Claim, claimHash: string): boolean {
  let newHash;
  newHash = md.sha256.create();
  newHash.update(claim);
  newHash = newHash.digest().toHex();
  if (newHash === claimHash) {
    return true;
  } else {
    return false;
  }
}

function serializeEncrypt<T>(key: Buffer, value: T): Buffer {
  return keysUtils.encryptWithKey(
    key,
    Buffer.from(JSON.stringify(value), 'utf-8'),
  );
}

function unserializeDecrypt<T>(key: Buffer, data: Buffer): T {
  const value_ = keysUtils.decryptWithKey(key, data);
  if (!value_) {
    throw new sigchainErrors.ErrorSigchainDecrypt();
  }
  let value;
  try {
    value = JSON.parse(value_.toString('utf-8'));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new sigchainErrors.ErrorSigchainParse();
    }
    throw e;
  }
  return value;
}

export {
  decodeClaim,
  verifyClaimSignature,
  verifyHashOfClaim,
  serializeEncrypt,
  unserializeDecrypt,
};
