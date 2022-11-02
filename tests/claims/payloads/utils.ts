import type {
  Claim,
  SignedClaim
} from '@/claims/types';
import type {
  ClaimLinkNode,
  ClaimLinkIdentity
} from '@/claims/payloads';
import fc from 'fast-check';
import * as claimsUtils from '@/claims/utils';
import * as testsClaimsUtils from '../utils';
import * as testsTokensUtils from '../../tokens/utils';
import * as testsIdsUtils from '../../ids/utils';

const claimLinkIdentityArb = testsClaimsUtils.claimArb.chain(
  (claim) => {
    return fc.record({
      iss: testsIdsUtils.nodeIdEncodedArb,
      sub: testsIdsUtils.providerIdentityIdArb
    }).chain(value => {
      return fc.constant({
        ...claim,
        ...value
      });
    });
  }
) as fc.Arbitrary<ClaimLinkIdentity>;

const claimLinkIdentityEncodedArb = claimLinkIdentityArb.map(claimsUtils.generateClaim);

const claimLinkNodeArb = testsClaimsUtils.claimArb.chain(
  (claim) => {
    return fc.record({
      iss: testsIdsUtils.nodeIdEncodedArb,
      sub: testsIdsUtils.nodeIdEncodedArb,
    }).chain(value => {
      return fc.constant({
        ...claim,
        ...value
      });
    });
  }
) as fc.Arbitrary<ClaimLinkNode>;

const claimLinkNodeEncodedArb = claimLinkNodeArb.map(claimsUtils.generateClaim);

const signedClaimArb = <P extends Claim>(
  payloadArb: fc.Arbitrary<P>
): fc.Arbitrary<SignedClaim<P>> => {
  return fc.record({
    payload: payloadArb,
    signatures: fc.array(testsTokensUtils.tokenHeaderSignatureArb)
  });
};

const signedClaimEncodedArb = (payloadArb: fc.Arbitrary<Claim>) => signedClaimArb(payloadArb).map(
  claimsUtils.generateSignedClaim
);

export {
  claimLinkIdentityArb,
  claimLinkIdentityEncodedArb,
  claimLinkNodeArb,
  claimLinkNodeEncodedArb,
  signedClaimArb,
  signedClaimEncodedArb,
};
