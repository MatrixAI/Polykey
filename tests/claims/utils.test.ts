import { test, fc } from '@fast-check/jest';
import * as claimsUtils from '@/claims/utils';
import * as validationErrors from '@/validation/errors';
import * as testsClaimsUtils from './utils';

describe('claims/utils', () => {
  test.prop([testsClaimsUtils.claimEncodedArb, fc.string()])(
    'parse claim',
    (claimEncodedCorrect, claimEncodedIncorrect) => {
      expect(() => {
        claimsUtils.parseClaim(claimEncodedCorrect);
      }).not.toThrow();
      expect(() => {
        claimsUtils.parseClaim(claimEncodedIncorrect);
      }).toThrow(validationErrors.ErrorParse);
    },
  );
  test.prop([
    testsClaimsUtils.signedClaimEncodedArb,
    fc.record({
      payload: fc.string(),
      signatures: fc.array(fc.string()),
    }),
  ])(
    'parse signed claim',
    (signedClaimEncodedCorrect, signedClaimEncodedIncorrect) => {
      expect(() => {
        claimsUtils.parseSignedClaim(signedClaimEncodedCorrect);
      }).not.toThrow();
      expect(() => {
        claimsUtils.parseSignedClaim(signedClaimEncodedIncorrect);
      }).toThrow(validationErrors.ErrorParse);
    },
  );
  test.prop([testsClaimsUtils.signedClaimArb])(
    'hashing signed claims',
    (signedClaim) => {
      const signedClaimDigest = claimsUtils.hashSignedClaim(
        signedClaim,
        'blake2b-256',
      );
      const signedClaimEncoded = claimsUtils.generateSignedClaim(signedClaim);
      const signedClaim_ = claimsUtils.parseSignedClaim(signedClaimEncoded);
      const signedClaimDigest_ = claimsUtils.hashSignedClaim(
        signedClaim_,
        'blake2b-256',
      );
      expect(signedClaimDigest_).toEqual(signedClaimDigest);
    },
  );
  test.prop([testsClaimsUtils.signedClaimArb])(
    'encode and decode signed claims digests',
    (signedClaim) => {
      const signedClaimDigest = claimsUtils.hashSignedClaim(
        signedClaim,
        'blake2b-256',
      );
      const signedClaimDigestEncoded = claimsUtils.encodeSignedClaimDigest(
        signedClaimDigest,
        'blake2b-256',
      );
      const result = claimsUtils.decodeSignedClaimDigest(
        signedClaimDigestEncoded,
      );
      expect(result).toBeDefined();
      const [signedClaimDigest_, format] = result!;
      expect(signedClaimDigest_).toStrictEqual(signedClaimDigest);
      expect(format).toBe('blake2b-256');
    },
  );
});
