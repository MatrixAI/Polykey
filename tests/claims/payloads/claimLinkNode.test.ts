import { test, fc } from '@fast-check/jest';
import * as testsClaimsPayloadsUtils from './utils.js';
import * as claimsPayloadsClaimLinkNode from '#claims/payloads/claimLinkNode.js';

describe('claims/payloads/claimLinkNode', () => {
  test.prop([testsClaimsPayloadsUtils.claimLinkNodeEncodedArb, fc.string()])(
    'parse claim link node',
    (claimLinkNodeEncodedCorrect, claimLinkNodeEncodedIncorrect) => {
      expect(() => {
        claimsPayloadsClaimLinkNode.parseClaimLinkNode(
          claimLinkNodeEncodedCorrect,
        );
      }).not.toThrow();
      expect(() => {
        claimsPayloadsClaimLinkNode.parseClaimLinkNode(
          claimLinkNodeEncodedIncorrect,
        );
      }).toThrow();
    },
  );
  test.prop([
    testsClaimsPayloadsUtils.signedClaimEncodedArb(
      testsClaimsPayloadsUtils.claimLinkNodeArb,
    ),
    fc.record(
      {
        payload: fc.string(),
        signatures: fc.array(fc.string()),
      },
      { noNullPrototype: true },
    ),
  ])(
    'parse signed claim link node',
    (
      signedClaimLinkNodeEncodedCorrect,
      signedClaimLinkNodeEncodedIncorrect,
    ) => {
      expect(() => {
        claimsPayloadsClaimLinkNode.parseSignedClaimLinkNode(
          signedClaimLinkNodeEncodedCorrect,
        );
      }).not.toThrow();
      expect(() => {
        claimsPayloadsClaimLinkNode.parseSignedClaimLinkNode(
          signedClaimLinkNodeEncodedIncorrect,
        );
      }).toThrow();
    },
  );
});
