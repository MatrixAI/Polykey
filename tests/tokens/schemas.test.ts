import { testProp, fc } from '@fast-check/jest';
import * as tokensSchemas from '@/tokens/schemas';
import * as testsTokensUtils from './utils';

describe('tokens/schemas', () => {
  testProp(
    'validate signed token encoded',
    [testsTokensUtils.signedTokenEncodedArb, fc.object()],
    (signedTokenEncodedCorrect, signedTokenEncodedIncorrect) => {
      expect(
        tokensSchemas.validateSignedTokenEncoded(signedTokenEncodedCorrect),
      ).toBe(true);
      expect(tokensSchemas.validateSignedTokenEncoded.errors).toBeNull();
      expect(
        tokensSchemas.validateSignedTokenEncoded(signedTokenEncodedIncorrect),
      ).toBe(false);
      expect(tokensSchemas.validateSignedTokenEncoded.errors).not.toBeNull();
      expect(
        tokensSchemas.validateSignedTokenEncoded.errors!.length,
      ).toBeGreaterThan(0);
    },
  );
});
