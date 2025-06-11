import { test, fc } from '@fast-check/jest';
import * as testsClaimsPayloadsUtils from './utils.js';
import * as claimsPayloadsClaimNetworkAuthority from '#claims/payloads/claimNetworkAuthority.js';

describe('claims/payloads/claimNetworkAccess', () => {
  test.prop([
    testsClaimsPayloadsUtils.claimNetworkAuthorityEncodedArb(),
    fc.noShrink(fc.string()),
  ])(
    'parse claim network access',
    (
      claimNetworkAccessEncodedCorrect,
      signedClaimNetworkAccessEncodedIncorrect,
    ) => {
      expect(() => {
        claimsPayloadsClaimNetworkAuthority.parseClaimNetworkAuthority(
          claimNetworkAccessEncodedCorrect,
        );
      }).not.toThrow();
      expect(() => {
        claimsPayloadsClaimNetworkAuthority.parseClaimNetworkAuthority(
          signedClaimNetworkAccessEncodedIncorrect,
        );
      });
    },
  );
  test.prop([
    testsClaimsPayloadsUtils.signedClaimEncodedArb(
      testsClaimsPayloadsUtils.claimNetworkAuthorityArb(),
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
        claimsPayloadsClaimNetworkAuthority.parseSignedClaimNetworkAuthority(
          signedClaimLinkIdentityEncodedCorrect,
        );
      }).not.toThrow();
      expect(() => {
        claimsPayloadsClaimNetworkAuthority.parseSignedClaimNetworkAuthority(
          signedClaimLinkIdentityEncodedIncorrect,
        );
      }).toThrow();
    },
  );
});
