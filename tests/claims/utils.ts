import type { SignedClaim } from '@/claims/types';
import { fc } from '@fast-check/jest';
import * as claimsUtils from '@/claims/utils';
import * as tokensUtils from '@/tokens/utils';
import * as testsTokensUtils from '../tokens/utils';
import * as testsIdsUtils from '../ids/utils';

const claimInitialArb = fc.record({
  jti: testsIdsUtils.claimIdEncodedArb,
  iat: fc.nat(),
  nbf: fc.nat(),
  seq: fc.constant(1),
  prevClaimId: fc.constant(null),
  prevDigest: fc.constant(null),
});

const signedClaimInitialArb = fc.record({
  payload: claimInitialArb,
  signatures: fc.array(testsTokensUtils.tokenHeaderSignatureArb)
}) as fc.Arbitrary<SignedClaim>;

const signedClaimDigestArb = signedClaimInitialArb.map(
  (signedClaimInitial) => {
    return claimsUtils.hashSignedClaim(
      signedClaimInitial,
      'blake2b-256'
    );
  }
);

const signedClaimDigestEncodedArb = signedClaimDigestArb.map(
  (signedClaimDigest) => {
    return claimsUtils.encodeSignedClaimDigest(
      signedClaimDigest,
      'blake2b-256'
    );
  }
);

const claimArb = fc.oneof(
  claimInitialArb,
  fc.record({
    jti: testsIdsUtils.claimIdEncodedArb,
    iat: fc.nat(),
    nbf: fc.nat(),
    seq: fc.nat(),
    prevClaimId: testsIdsUtils.claimIdEncodedArb,
    prevDigest: signedClaimDigestEncodedArb
  })
);

const claimEncodedArb = claimArb.map(tokensUtils.generateTokenPayload);

const signedClaimArb = fc.record({
  payload: claimArb,
  signatures: fc.array(testsTokensUtils.tokenHeaderSignatureArb)
}) as fc.Arbitrary<SignedClaim>;

const signedClaimEncodedArb = signedClaimArb.map(
  tokensUtils.generateSignedToken
);

export {
  claimInitialArb,
  signedClaimInitialArb,
  signedClaimDigestArb,
  signedClaimDigestEncodedArb,
  claimArb,
  claimEncodedArb,
  signedClaimArb,
  signedClaimEncodedArb,
};
