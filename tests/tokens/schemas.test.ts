import { test, fc } from '@fast-check/jest';
import * as tokensSchemas from '@/tokens/schemas';
import * as testsTokensUtils from './utils';

describe('tokens/schemas', () => {
  test.prop([testsTokensUtils.signedTokenEncodedArb, fc.object()])(
    'validate signed token encoded',
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
