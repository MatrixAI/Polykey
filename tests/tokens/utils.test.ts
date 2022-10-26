import { testProp, fc } from '@fast-check/jest';
import * as keysUtils from '@/keys/utils';
import * as tokensUtils from '@/tokens/utils';
import * as validationErrors from '@/validation/errors';
import * as testsTokensUtils from './utils';

describe('tokens/utils', () => {
  testProp(
    'generate token signature',
    [ testsTokensUtils.tokenSignatureArb, ],
    ( tokenSignature) => {
      const tokenSignatureEncoded = tokensUtils.generateTokenSignature(tokenSignature);
      const tokenSignature_ = tokensUtils.parseTokenSignature(tokenSignatureEncoded);
      expect(tokenSignature_).toStrictEqual(tokenSignature);
    }
  );
  testProp(
    'parse token signature',
    [
      testsTokensUtils.tokenSignatureEncodedArb,
      fc.string()
    ],
    (
      tokenSignatureEncodedCorrect,
      tokenSignatureEncodedIncorrect
    ) => {
      const tokenSignatureEncodedIncorrectBuffer = Buffer.from(
        tokenSignatureEncodedIncorrect, 'base64url'
      );
      fc.pre(
        !keysUtils.isSignature(tokenSignatureEncodedIncorrectBuffer) &&
        !keysUtils.isMAC(tokenSignatureEncodedIncorrectBuffer)
      );
      expect(() => {
        tokensUtils.parseTokenSignature(
          tokenSignatureEncodedCorrect
        );
      }).not.toThrow();
      expect(() => {
        tokensUtils.parseTokenSignature(
          tokenSignatureEncodedIncorrect
        );
      }).toThrow(validationErrors.ErrorParse);
    }
  );
  testProp(
    'generate token payload',
    [ testsTokensUtils.tokenPayloadArb, ],
    ( tokenPayload ) => {
      const tokenPayloadEncoded = tokensUtils.generateTokenPayload(tokenPayload);
      const tokenPayload_ = tokensUtils.parseTokenPayload(tokenPayloadEncoded);
      // Use `toEqual` to avoid matching `undefined` properties
      expect(tokenPayload_).toEqual(tokenPayload);
    },
  );
  testProp(
    'parse token payload',
    [
      testsTokensUtils.tokenPayloadEncodedArb,
      fc.string()
    ],
    (tokenPayloadEncodedCorrect, tokenPayloadEncodedIncorrect) => {
      expect(() => {
        tokensUtils.parseTokenPayload(
          tokenPayloadEncodedCorrect
        );
      }).not.toThrow();
      expect(() => {
        tokensUtils.parseTokenPayload(
          tokenPayloadEncodedIncorrect
        );
      }).toThrow(validationErrors.ErrorParse);
    }
  );
  testProp(
    'generate token protected header',
    [ testsTokensUtils.tokenProtectedHeaderArb, ],
    ( tokenProtectedHeader ) => {
      const tokenProtectedHeaderEncoded = tokensUtils.generateTokenProtectedHeader(
        tokenProtectedHeader
      );
      const tokenProtectedHeader_ = tokensUtils.parseTokenProtectedHeader(
        tokenProtectedHeaderEncoded
      );
      // Use `toEqual` to avoid matching `undefined` properties
      expect(tokenProtectedHeader_).toEqual(tokenProtectedHeader);
    },
  );
  testProp(
    'parse token protected header',
    [
      testsTokensUtils.tokenProtectedHeaderEncodedArb,
      fc.string()
    ],
    (tokenProtectedHeaderEncodedCorrect, tokenProtectedHeaderEncodedIncorrect) => {
      expect(() => {
        tokensUtils.parseTokenProtectedHeader(
          tokenProtectedHeaderEncodedCorrect
        );
      }).not.toThrow();
      expect(() => {
        tokensUtils.parseTokenProtectedHeader(
          tokenProtectedHeaderEncodedIncorrect
        );
      }).toThrow(validationErrors.ErrorParse);
    }
  );
  testProp(
    'generate token header signature',
    [
      testsTokensUtils.tokenHeaderSignatureArb,
    ],
    ( tokenHeaderSignature ) => {
      const tokenHeaderSignatureEncoded = tokensUtils.generateTokenHeaderSignature(
        tokenHeaderSignature
      );
      const tokenHeaderSignature_ = tokensUtils.parseTokenHeaderSignature(
        tokenHeaderSignatureEncoded
      );
      // Use `toEqual` to avoid matching `undefined` properties
      expect(tokenHeaderSignature_).toEqual(tokenHeaderSignature);
    }
  );
  testProp(
    'parse token header signature',
    [
      testsTokensUtils.tokenHeaderSignatureEncodedArb,
      fc.string()
    ],
    (
      tokenHeaderSignatureEncodedCorrect,
      tokenHeaderSignatureEncodedIncorrect
    ) => {
      expect(() => {
        tokensUtils.parseTokenHeaderSignature(
          tokenHeaderSignatureEncodedCorrect
        );
      }).not.toThrow();
      expect(() => {
        tokensUtils.parseTokenHeaderSignature(
          tokenHeaderSignatureEncodedIncorrect
        );
      }).toThrow(validationErrors.ErrorParse);
    }
  );
  testProp(
    'generate signed token',
    [ testsTokensUtils.signedTokenArb, ],
    ( signedToken ) => {
      const signedTokenEncoded = tokensUtils.generateSignedToken(signedToken);
      const signedToken_ = tokensUtils.parseSignedToken(signedTokenEncoded);
      // Use `toEqual` to avoid matching `undefined` properties
      expect(signedToken_).toEqual(signedToken);
    }
  );
  testProp(
    'parse signed token',
    [
      testsTokensUtils.signedTokenEncodedArb,
      fc.record({
        payload: fc.string(),
        signatures: fc.array(fc.string())
      })
    ],
    (signedTokenEncodedCorrect, signedTokenEncodedIncorrect) => {
      expect(() => {
        tokensUtils.parseSignedToken(
          signedTokenEncodedCorrect
        );
      }).not.toThrow();
      expect(() => {
        tokensUtils.parseSignedToken(
          signedTokenEncodedIncorrect
        );
      }).toThrow(validationErrors.ErrorParse);
    }
  );
});
