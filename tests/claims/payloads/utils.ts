import type { Claim, SignedClaim } from '#claims/types.js';
import type {
  ClaimLinkNode,
  ClaimLinkIdentity,
} from '#claims/payloads/index.js';
import fc from 'fast-check';
import * as testsClaimsUtils from '../utils.js';
import * as testsTokensUtils from '../../tokens/utils.js';
import * as testsIdsUtils from '../../ids/utils.js';
import * as claimsUtils from '#claims/utils.js';

const claimLinkIdentityArb = testsClaimsUtils.claimArb.chain((claim) => {
  return fc
    .record(
      {
        iss: testsIdsUtils.nodeIdEncodedArb,
        sub: testsIdsUtils.providerIdentityIdEncodedArb,
      },
      { noNullPrototype: true },
    )
    .chain((value) => {
      return fc.constant({
        typ: 'ClaimLinkIdentity',
        ...claim,
        ...value,
      });
    });
}) as fc.Arbitrary<ClaimLinkIdentity>;

const claimLinkIdentityEncodedArb = claimLinkIdentityArb.map(
  claimsUtils.generateClaim,
);

const claimLinkNodeArb = testsClaimsUtils.claimArb.chain((claim) => {
  return fc
    .record(
      {
        iss: testsIdsUtils.nodeIdEncodedArb,
        sub: testsIdsUtils.nodeIdEncodedArb,
      },
      { noNullPrototype: true },
    )
    .chain((value) => {
      return fc.constant({
        typ: 'ClaimLinkNode',
        ...claim,
        ...value,
      });
    });
}) as fc.Arbitrary<ClaimLinkNode>;

const claimLinkNodeEncodedArb = claimLinkNodeArb.map(claimsUtils.generateClaim);

const signedClaimArb = <P extends Claim>(
  payloadArb: fc.Arbitrary<P>,
): fc.Arbitrary<SignedClaim<P>> => {
  return fc.record(
    {
      payload: payloadArb,
      signatures: fc.array(testsTokensUtils.tokenHeaderSignatureArb),
    },
    { noNullPrototype: true },
  );
};

const signedClaimEncodedArb = (payloadArb: fc.Arbitrary<Claim>) =>
  signedClaimArb(payloadArb).map(claimsUtils.generateSignedClaim);

export {
  claimLinkIdentityArb,
  claimLinkIdentityEncodedArb,
  claimLinkNodeArb,
  claimLinkNodeEncodedArb,
  signedClaimArb,
  signedClaimEncodedArb,
};
