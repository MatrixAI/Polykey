import { testProp, fc } from '@fast-check/jest';
import * as claimsPayloadsClaimLinkIdentity from '@/claims/payloads/claimLinkIdentity';
import * as testsClaimsPayloadsUtils from './utils';

describe('claims/payloads/claimLinkIdentity', () => {
  testProp(
    'parse claim link identity',
    [testsClaimsPayloadsUtils.claimLinkIdentityEncodedArb, fc.string()],
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
  testProp(
    'parse signed claim link identity',
    [
      testsClaimsPayloadsUtils.signedClaimEncodedArb(
        testsClaimsPayloadsUtils.claimLinkIdentityArb,
      ),
      fc.record({
        payload: fc.string(),
        signatures: fc.array(fc.string()),
      }),
    ],
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
