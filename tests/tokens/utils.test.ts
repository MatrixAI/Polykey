import { test, fc } from '@fast-check/jest';
import * as keysUtils from '@/keys/utils';
import * as tokensUtils from '@/tokens/utils';
import * as validationErrors from '@/validation/errors';
import * as testsTokensUtils from './utils';

describe('tokens/utils', () => {
  test.prop([testsTokensUtils.tokenSignatureArb])(
    'generate token signature',
    (tokenSignature) => {
      const tokenSignatureEncoded =
        tokensUtils.generateTokenSignature(tokenSignature);
      const tokenSignature_ = tokensUtils.parseTokenSignature(
        tokenSignatureEncoded,
      );
      expect(tokenSignature_).toStrictEqual(tokenSignature);
    },
  );
  test.prop([testsTokensUtils.tokenSignatureEncodedArb, fc.string()])(
    'parse token signature',
    (tokenSignatureEncodedCorrect, tokenSignatureEncodedIncorrect) => {
      const tokenSignatureEncodedIncorrectBuffer = Buffer.from(
        tokenSignatureEncodedIncorrect,
        'base64url',
      );
      fc.pre(
        !keysUtils.isSignature(tokenSignatureEncodedIncorrectBuffer) &&
          !keysUtils.isMAC(tokenSignatureEncodedIncorrectBuffer),
      );
      expect(() => {
        tokensUtils.parseTokenSignature(tokenSignatureEncodedCorrect);
      }).not.toThrow();
      expect(() => {
        tokensUtils.parseTokenSignature(tokenSignatureEncodedIncorrect);
      }).toThrow(validationErrors.ErrorParse);
    },
  );
  test.prop([testsTokensUtils.tokenPayloadArb])(
    'generate token payload',
    (tokenPayload) => {
      const tokenPayloadEncoded =
        tokensUtils.generateTokenPayload(tokenPayload);
      const tokenPayload_ = tokensUtils.parseTokenPayload(tokenPayloadEncoded);
      // Use `toEqual` to avoid matching `undefined` properties
      expect(tokenPayload_).toEqual(tokenPayload);
    },
  );
  test.prop([testsTokensUtils.tokenPayloadEncodedArb, fc.string()])(
    'parse token payload',
    (tokenPayloadEncodedCorrect, tokenPayloadEncodedIncorrect) => {
      expect(() => {
        tokensUtils.parseTokenPayload(tokenPayloadEncodedCorrect);
      }).not.toThrow();
      expect(() => {
        tokensUtils.parseTokenPayload(tokenPayloadEncodedIncorrect);
      }).toThrow(validationErrors.ErrorParse);
    },
  );
  test.prop([testsTokensUtils.tokenProtectedHeaderArb])(
    'generate token protected header',
    (tokenProtectedHeader) => {
      const tokenProtectedHeaderEncoded =
        tokensUtils.generateTokenProtectedHeader(tokenProtectedHeader);
      const tokenProtectedHeader_ = tokensUtils.parseTokenProtectedHeader(
        tokenProtectedHeaderEncoded,
      );
      // Use `toEqual` to avoid matching `undefined` properties
      expect(tokenProtectedHeader_).toEqual(tokenProtectedHeader);
    },
  );
  test.prop([testsTokensUtils.tokenProtectedHeaderEncodedArb, fc.string()])(
    'parse token protected header',
    (
      tokenProtectedHeaderEncodedCorrect,
      tokenProtectedHeaderEncodedIncorrect,
    ) => {
      expect(() => {
        tokensUtils.parseTokenProtectedHeader(
          tokenProtectedHeaderEncodedCorrect,
        );
      }).not.toThrow();
      expect(() => {
        tokensUtils.parseTokenProtectedHeader(
          tokenProtectedHeaderEncodedIncorrect,
        );
      }).toThrow(validationErrors.ErrorParse);
    },
  );
  test.prop([testsTokensUtils.tokenHeaderSignatureArb])(
    'generate token header signature',
    (tokenHeaderSignature) => {
      const tokenHeaderSignatureEncoded =
        tokensUtils.generateTokenHeaderSignature(tokenHeaderSignature);
      const tokenHeaderSignature_ = tokensUtils.parseTokenHeaderSignature(
        tokenHeaderSignatureEncoded,
      );
      // Use `toEqual` to avoid matching `undefined` properties
      expect(tokenHeaderSignature_).toEqual(tokenHeaderSignature);
    },
  );
  test.prop([testsTokensUtils.tokenHeaderSignatureEncodedArb, fc.string()])(
    'parse token header signature',
    (
      tokenHeaderSignatureEncodedCorrect,
      tokenHeaderSignatureEncodedIncorrect,
    ) => {
      expect(() => {
        tokensUtils.parseTokenHeaderSignature(
          tokenHeaderSignatureEncodedCorrect,
        );
      }).not.toThrow();
      expect(() => {
        tokensUtils.parseTokenHeaderSignature(
          tokenHeaderSignatureEncodedIncorrect,
        );
      }).toThrow(validationErrors.ErrorParse);
    },
  );
  test.prop([testsTokensUtils.signedTokenArb])(
    'generate signed token',
    (signedToken) => {
      const signedTokenEncoded = tokensUtils.generateSignedToken(signedToken);
      const signedToken_ = tokensUtils.parseSignedToken(signedTokenEncoded);
      // Use `toEqual` to avoid matching `undefined` properties
      expect(signedToken_).toEqual(signedToken);
    },
  );
  test.prop([
    testsTokensUtils.signedTokenEncodedArb,
    fc.record({
      payload: fc.string(),
      signatures: fc.array(fc.string()),
    }),
  ])(
    'parse signed token',
    (signedTokenEncodedCorrect, signedTokenEncodedIncorrect) => {
      expect(() => {
        tokensUtils.parseSignedToken(signedTokenEncodedCorrect);
      }).not.toThrow();
      expect(() => {
        tokensUtils.parseSignedToken(signedTokenEncodedIncorrect);
      }).toThrow(validationErrors.ErrorParse);
    },
  );
});
