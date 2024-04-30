import { test, fc } from '@fast-check/jest';
import * as claimsPayloadsClaimLinkIdentity from '@/claims/payloads/claimLinkIdentity';
import * as testsClaimsPayloadsUtils from './utils';

describe('claims/payloads/claimLinkIdentity', () => {
  test.prop([
    testsClaimsPayloadsUtils.claimLinkIdentityEncodedArb,
    fc.string(),
  ])(
    'parse claim link identity',
    (claimLinkIdentityEncodedCorrect, claimLinkIdentityEncodedIncorrect) => {
      expect(() => {
        claimsPayloadsClaimLinkIdentity.parseClaimLinkIdentity(
          claimLinkIdentityEncodedCorrect,
        );
      }).not.toThrow();
      expect(() => {
        claimsPayloadsClaimLinkIdentity.parseClaimLinkIdentity(
          claimLinkIdentityEncodedIncorrect,
        );
      }).toThrow();
    },
  );
  test.prop([
    testsClaimsPayloadsUtils.signedClaimEncodedArb(
      testsClaimsPayloadsUtils.claimLinkIdentityArb,
    ),
    fc.record({
      payload: fc.string(),
      signatures: fc.array(fc.string()),
    }),
  ])(
    'parse signed claim link identity',
    (
      signedClaimLinkIdentityEncodedCorrect,
      signedClaimLinkIdentityEncodedIncorrect,
    ) => {
      expect(() => {
        claimsPayloadsClaimLinkIdentity.parseSignedClaimLinkIdentity(
          signedClaimLinkIdentityEncodedCorrect,
        );
      }).not.toThrow();
      expect(() => {
        claimsPayloadsClaimLinkIdentity.parseSignedClaimLinkIdentity(
          signedClaimLinkIdentityEncodedIncorrect,
        );
      }).toThrow();
    },
  );
});
