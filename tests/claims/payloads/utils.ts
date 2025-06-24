import type { Claim, SignedClaim } from '#claims/types.js';
import type {
  ClaimLinkNode,
  ClaimLinkIdentity,
  ClaimNetworkAccess,
} from '#claims/payloads/index.js';
import type { SignedTokenEncoded } from '#tokens/types.js';
import type { ClaimNetworkAuthority } from '#claims/payloads/claimNetworkAuthority.js';
import type { NodeIdEncoded } from '#ids/index.js';
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

const claimNetworkAuthorityArb = (
  iss: fc.Arbitrary<NodeIdEncoded> = testsIdsUtils.nodeIdEncodedArb,
  sub: fc.Arbitrary<NodeIdEncoded> = testsIdsUtils.nodeIdEncodedArb,
) =>
  fc.noShrink(
    testsClaimsUtils.claimArb.chain((claim) => {
      return fc
        .record(
          {
            iss,
            sub,
            network: fc.webUrl(),
            isPrivate: fc.boolean(),
          },
          { noNullPrototype: true },
        )
        .chain((value) => {
          return fc.constant({
            typ: 'ClaimNetworkAuthority',
            ...claim,
            ...value,
          });
        });
    }) as fc.Arbitrary<ClaimNetworkAuthority>,
  );

const claimNetworkAuthorityEncodedArb = (
  iss: fc.Arbitrary<NodeIdEncoded> = testsIdsUtils.nodeIdEncodedArb,
  sub: fc.Arbitrary<NodeIdEncoded> = testsIdsUtils.nodeIdEncodedArb,
) => claimNetworkAuthorityArb(iss, sub).map(claimsUtils.generateClaim);

const claimNetworkAccessArb = (
  iss: fc.Arbitrary<NodeIdEncoded> = testsIdsUtils.nodeIdEncodedArb,
  sub: fc.Arbitrary<NodeIdEncoded> = testsIdsUtils.nodeIdEncodedArb,
  network: fc.Arbitrary<string> = fc.string(),
  signedClaimNetworkAuthorityEncoded: fc.Arbitrary<SignedTokenEncoded> = signedClaimEncodedArb(
    claimNetworkAuthorityArb(
      testsIdsUtils.nodeIdEncodedArb,
      testsIdsUtils.nodeIdEncodedArb,
    ),
  ),
) =>
  fc.noShrink(
    testsClaimsUtils.claimArb.chain((claim) => {
      return fc
        .record(
          {
            iss,
            sub,
            network,
            signedClaimNetworkAuthorityEncoded,
            isPrivate: fc.boolean(),
          },
          { noNullPrototype: true },
        )
        .chain((value) => {
          return fc.constant({
            typ: 'ClaimNetworkAccess',
            ...claim,
            ...value,
          });
        });
    }) as fc.Arbitrary<ClaimNetworkAccess>,
  );

const claimNetworkAccessEncodedArb = (
  iss: fc.Arbitrary<NodeIdEncoded> = testsIdsUtils.nodeIdEncodedArb,
  sub: fc.Arbitrary<NodeIdEncoded> = testsIdsUtils.nodeIdEncodedArb,
  network: fc.Arbitrary<string> = fc.string(),
) => claimNetworkAccessArb(iss, sub, network).map(claimsUtils.generateClaim);

export {
  claimLinkIdentityArb,
  claimLinkIdentityEncodedArb,
  claimLinkNodeArb,
  claimLinkNodeEncodedArb,
  signedClaimArb,
  signedClaimEncodedArb,
  claimNetworkAccessArb,
  claimNetworkAccessEncodedArb,
  claimNetworkAuthorityArb,
  claimNetworkAuthorityEncodedArb,
};
