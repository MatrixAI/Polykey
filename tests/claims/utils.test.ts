import { testProp, fc } from '@fast-check/jest';
import * as claimsUtils from '@/claims/utils';
import * as validationErrors from '@/validation/errors';
import * as testsClaimsUtils from './utils';

describe('claims/utils', () => {
  testProp(
    'parse claim',
    [
      testsClaimsUtils.claimEncodedArb,
      fc.string()
    ],
    (claimEncodedCorrect, claimEncodedIncorrect) => {
      expect(() => {
        claimsUtils.parseClaim(
          claimEncodedCorrect
        );
      }).not.toThrow();
      expect(() => {
        claimsUtils.parseClaim(
          claimEncodedIncorrect
        );
      }).toThrow(validationErrors.ErrorParse);
    }
  );
  testProp(
    'parse signed claim',
    [
      testsClaimsUtils.signedClaimEncodedArb,
      fc.record({
        payload: fc.string(),
        signatures: fc.array(fc.string())
      })
    ],
    (signedClaimEncodedCorrect, signedClaimEncodedIncorrect) => {
      expect(() => {
        claimsUtils.parseSignedClaim(
          signedClaimEncodedCorrect
        );
      }).not.toThrow();
      expect(() => {
        claimsUtils.parseSignedClaim(
          signedClaimEncodedIncorrect
        );
      }).toThrow(validationErrors.ErrorParse);
    },
  );
  testProp(
    'hashing signed claims',
    [
      testsClaimsUtils.signedClaimArb
    ],
    (signedClaim) => {
      const signedClaimDigest = claimsUtils.hashSignedClaim(
        signedClaim,
        'blake2b-256'
      );
      const signedClaimEncoded = claimsUtils.generateSignedClaim(signedClaim);
      const signedClaim_ = claimsUtils.parseSignedClaim(signedClaimEncoded);
      const signedClaimDigest_ = claimsUtils.hashSignedClaim(
        signedClaim_,
        'blake2b-256'
      );
      expect(signedClaimDigest_).toEqual(signedClaimDigest);
    }
  );
  testProp(
    'encode and decode signed claims digests',
    [
      testsClaimsUtils.signedClaimArb
    ],
    (signedClaim) => {
      const signedClaimDigest = claimsUtils.hashSignedClaim(
        signedClaim,
        'blake2b-256'
      );
      const signedClaimDigestEncoded = claimsUtils.encodeSignedClaimDigest(
        signedClaimDigest,
        'blake2b-256'
      );
      const result = claimsUtils.decodeSignedClaimDigest(
        signedClaimDigestEncoded
      );
      expect(result).toBeDefined();
      const [signedClaimDigest_, format] = result!;
      expect(signedClaimDigest_).toStrictEqual(signedClaimDigest);
      expect(format).toBe('blake2b-256');
    }
  );
});
