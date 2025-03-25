import type {
  ClaimIdEncoded,
  SignedClaim,
  SignedClaimDigestEncoded,
} from '#claims/types.js';
import { fc } from '@fast-check/jest';
import * as testsTokensUtils from '../tokens/utils.js';
import * as testsIdsUtils from '../ids/utils.js';
import * as claimsUtils from '#claims/utils.js';

const claimInitialArb: fc.Arbitrary<{
  jti: ClaimIdEncoded;
  iat: number;
  nbf: number;
  seq: 1;
  prevClaimId: null;
  prevDigest: null;
}> = fc.record(
  {
    jti: testsIdsUtils.claimIdEncodedArb,
    iat: fc.nat(),
    nbf: fc.nat(),
    seq: fc.constant(1),
    prevClaimId: fc.constant(null),
    prevDigest: fc.constant(null),
  },
  { noNullPrototype: true },
);

const signedClaimInitialArb = fc.record(
  {
    payload: claimInitialArb,
    signatures: fc.array(testsTokensUtils.tokenHeaderSignatureArb),
  },
  { noNullPrototype: true },
) as fc.Arbitrary<SignedClaim>;

const signedClaimDigestArb = signedClaimInitialArb.map((signedClaimInitial) => {
  return claimsUtils.hashSignedClaim(signedClaimInitial, 'blake2b-256');
});

const signedClaimDigestEncodedArb = signedClaimDigestArb.map(
  (signedClaimDigest) => {
    return claimsUtils.encodeSignedClaimDigest(
      signedClaimDigest,
      'blake2b-256',
    );
  },
);

const claimArb: fc.Arbitrary<
  | {
      jti: ClaimIdEncoded;
      iat: number;
      nbf: number;
      seq: 1;
      prevClaimId: null;
      prevDigest: null;
    }
  | {
      jti: ClaimIdEncoded;
      iat: number;
      nbf: number;
      seq: number;
      prevClaimId: ClaimIdEncoded;
      prevDigest: SignedClaimDigestEncoded;
    }
> = fc.oneof(
  claimInitialArb,
  fc.record(
    {
      jti: testsIdsUtils.claimIdEncodedArb,
      iat: fc.nat(),
      nbf: fc.nat(),
      seq: fc.nat(),
      prevClaimId: testsIdsUtils.claimIdEncodedArb,
      prevDigest: signedClaimDigestEncodedArb,
    },
    { noNullPrototype: true },
  ),
);

const claimEncodedArb = claimArb.map(claimsUtils.generateClaim);

const signedClaimArb = fc.record(
  {
    payload: claimArb,
    signatures: fc.array(testsTokensUtils.tokenHeaderSignatureArb),
  },
  { noNullPrototype: true },
) as fc.Arbitrary<SignedClaim>;

const signedClaimEncodedArb = signedClaimArb.map(
  claimsUtils.generateSignedClaim,
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
