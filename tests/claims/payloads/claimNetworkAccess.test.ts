import { test, fc } from '@fast-check/jest';
import * as testsClaimsPayloadsUtils from './utils.js';
import * as claimsPayloadsClaimNetworkAccess from '#claims/payloads/claimNetworkAccess.js';

describe('claims/payloads/claimNetworkAccess', () => {
  test.prop([
    testsClaimsPayloadsUtils.claimNetworkAccessEncodedArb(),
    fc.noShrink(fc.string()),
  ])(
    'parse claim network access',
    (
      claimNetworkAccessEncodedCorrect,
      signedClaimNetworkAccessEncodedIncorrect,
    ) => {
      expect(() => {
        claimsPayloadsClaimNetworkAccess.parseClaimNetworkAccess(
          claimNetworkAccessEncodedCorrect,
        );
      }).not.toThrow();
      expect(() => {
        claimsPayloadsClaimNetworkAccess.parseClaimNetworkAccess(
          signedClaimNetworkAccessEncodedIncorrect,
        );
      });
    },
  );
  test.prop([
    testsClaimsPayloadsUtils.signedClaimEncodedArb(
      testsClaimsPayloadsUtils.claimNetworkAccessArb(),
    ),
    fc.record(
      {
        payload: fc.string(),
        signatures: fc.array(fc.string()),
      },
      { noNullPrototype: true },
    ),
  ])(
    'parse signed claim network access',
    (
      signedClaimLinkIdentityEncodedCorrect,
      signedClaimLinkIdentityEncodedIncorrect,
    ) => {
      expect(() => {
        claimsPayloadsClaimNetworkAccess.parseSignedClaimNetworkAccess(
          signedClaimLinkIdentityEncodedCorrect,
        );
      }).not.toThrow();
      expect(() => {
        claimsPayloadsClaimNetworkAccess.parseSignedClaimNetworkAccess(
          signedClaimLinkIdentityEncodedIncorrect,
        );
      }).toThrow();
    },
  );
});
