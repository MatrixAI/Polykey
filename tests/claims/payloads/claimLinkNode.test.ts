import { testProp, fc } from '@fast-check/jest';
import * as claimsPayloadsClaimLinkNode from '@/claims/payloads/claimLinkNode';
import * as testsClaimsPayloadsUtils from './utils';

describe('claims/payloads/claimLinkNode', () => {
  testProp(
    'parse claim link node',
    [
      testsClaimsPayloadsUtils.claimLinkNodeEncodedArb,
      fc.string()
    ],
    (claimLinkNodeEncodedCorrect, claimLinkNodeEncodedIncorrect) => {
      expect(() => {
        claimsPayloadsClaimLinkNode.parseClaimLinkNode(
          claimLinkNodeEncodedCorrect
        );
      }).not.toThrow();
      expect(() => {
        claimsPayloadsClaimLinkNode.parseClaimLinkNode(
          claimLinkNodeEncodedIncorrect
        );
      }).toThrow();
    }
  );
  testProp(
    'parse signed claim link node',
    [
      testsClaimsPayloadsUtils.signedClaimEncodedArb(
        testsClaimsPayloadsUtils.claimLinkNodeArb
      ),
      fc.record({
        payload: fc.string(),
        signatures: fc.array(fc.string())
      })
    ],
    (
      signedClaimLinkNodeEncodedCorrect,
      signedClaimLinkNodeEncodedIncorrect
    ) => {
      expect(() => {
        claimsPayloadsClaimLinkNode.parseSignedClaimLinkNode(
          signedClaimLinkNodeEncodedCorrect
        );
      }).not.toThrow();
      expect(() => {
        claimsPayloadsClaimLinkNode.parseSignedClaimLinkNode(
          signedClaimLinkNodeEncodedIncorrect
        );
      }).toThrow();
    }
  );
});
