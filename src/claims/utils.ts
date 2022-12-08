import type {
  Claim,
  ClaimEncoded,
  SignedClaim,
  SignedClaimEncoded,
  SignedClaimDigestEncoded,
} from './types';
import type { Digest, DigestFormats } from '../keys/types';
import canonicalize from 'canonicalize';
import * as ids from '../ids';
import * as tokensUtils from '../tokens/utils';
import * as keysUtils from '../keys/utils';
import * as keysTypes from '../keys/types';
import * as validationErrors from '../validation/errors';
import * as utils from '../utils';

function generateClaim(claim: Claim): ClaimEncoded {
  return tokensUtils.generateTokenPayload(claim);
}

function generateSignedClaim(signedClaim: SignedClaim): SignedClaimEncoded {
  return tokensUtils.generateSignedToken(signedClaim);
}

function assertClaim(claim: unknown): asserts claim is Claim {
  if (!utils.isObject(claim)) {
    throw new validationErrors.ErrorParse('must be POJO');
  }
  if (claim['jti'] == null || ids.decodeClaimId(claim['jti']) == null) {
    throw new validationErrors.ErrorParse(
      '`jti` property must be an encoded claim ID',
    );
  }
  if (claim['iat'] == null) {
    throw new validationErrors.ErrorParse('`iat` property must be integer');
  }
  if (claim['nbf'] == null) {
    throw new validationErrors.ErrorParse('`nbf` property must be integer');
  }
  if (claim['seq'] == null) {
    throw new validationErrors.ErrorParse('`seq` property must be integer');
  }
  if (
    claim['prevClaimId'] !== null &&
    ids.decodeClaimId(claim['prevClaimId']) == null
  ) {
    throw new validationErrors.ErrorParse(
      '`prevClaimId` property must be an encoded claim ID',
    );
  }
  if (claim['prevDigest'] !== null && typeof claim['prevDigest'] !== 'string') {
    throw new validationErrors.ErrorParse(
      '`prevDigest` property must be string or null',
    );
  }
}

function parseClaim<C extends Claim = Claim>(claimEncoded: unknown): C {
  const claim = tokensUtils.parseTokenPayload<Claim>(claimEncoded);
  assertClaim(claim);
  return claim as C;
}

function parseSignedClaim<C extends Claim = Claim>(
  signedClaimEncoded: unknown,
): SignedClaim<C> {
  const signedClaim = tokensUtils.parseSignedToken<C>(signedClaimEncoded);
  assertClaim(signedClaim.payload);
  return signedClaim;
}

/**
 * Hashes claim into a digest
 */
function hashSignedClaim<F extends DigestFormats>(
  claim: SignedClaim<Claim>,
  format: F,
): Digest<F> {
  const claimJSON = canonicalize(claim)!;
  const claimData = Buffer.from(claimJSON, 'utf-8');
  const claimDigest = keysUtils.hash(claimData, format);
  return claimDigest;
}

/**
 * Encodes claim digest into multibase multihash string
 */
function encodeSignedClaimDigest<F extends DigestFormats>(
  claimDigest: Digest<F>,
  format: F,
): SignedClaimDigestEncoded {
  const claimMultiDigest = keysUtils.digestToMultidigest(claimDigest, format);
  const claimDigestEncoded = utils.toMultibase(
    claimMultiDigest.bytes,
    'base58btc',
  );
  return claimDigestEncoded as SignedClaimDigestEncoded;
}

/**
 * Decodes multibase multihash string to claim digest
 */
function decodeSignedClaimDigest<F extends DigestFormats>(
  claimDigestEncoded: any,
): [Digest<F>, F] | undefined {
  if (typeof claimDigestEncoded !== 'string') {
    return;
  }
  const claimMultiDigestData = utils.fromMultibase(claimDigestEncoded);
  if (claimMultiDigestData == null) {
    return;
  }
  const claimMultiDigest =
    keysUtils.digestFromMultidigest(claimMultiDigestData);
  if (claimMultiDigest == null) {
    return;
  }
  const format = keysTypes.multihashCodesI[claimMultiDigest.code];
  return [utils.bufferWrap(claimMultiDigest.digest) as Digest<F>, format as F];
}

export {
  generateClaim,
  generateSignedClaim,
  assertClaim,
  parseClaim,
  parseSignedClaim,
  hashSignedClaim,
  encodeSignedClaimDigest,
  decodeSignedClaimDigest,
};

export { createClaimIdGenerator, encodeClaimId, decodeClaimId } from '../ids';
