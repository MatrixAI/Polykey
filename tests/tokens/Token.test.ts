import type {
  TokenHeaderSignatureEncoded,
  TokenPayloadEncoded,
} from '@/tokens/types';
import { test, fc } from '@fast-check/jest';
import Token from '@/tokens/Token';
import * as tokensUtils from '@/tokens/utils';
import * as tokensErrors from '@/tokens/errors';
import * as testsTokensUtils from './utils';
import * as testsKeysUtils from '../keys/utils';

describe(Token.name, () => {
  test.prop([testsTokensUtils.tokenPayloadArb])(
    'creating Token from payload',
    (tokenPayload) => {
      const token = Token.fromPayload(tokenPayload);
      expect(token.payload).toStrictEqual(tokenPayload);
      expect(token.payloadEncoded).toStrictEqual(
        tokensUtils.generateTokenPayload(tokenPayload),
      );
    },
  );
  test.prop([testsTokensUtils.signedTokenArb])(
    'creating Token from signed token',
    (signedToken) => {
      const token = Token.fromSigned(signedToken);
      expect(token.payload).toStrictEqual(signedToken.payload);
      expect(token.payloadEncoded).toStrictEqual(
        tokensUtils.generateTokenPayload(signedToken.payload),
      );
      expect(token.signatures).toStrictEqual(signedToken.signatures);
      expect(token.signaturesEncoded).toStrictEqual(
        signedToken.signatures.map((headerSignature) =>
          tokensUtils.generateTokenHeaderSignature(headerSignature),
        ),
      );
      const signedToken_ = token.toSigned();
      expect(signedToken_).toEqual(signedToken);
    },
  );
  test.prop([testsTokensUtils.signedTokenEncodedArb])(
    'creating Token from signed token encoded',
    (signedTokenEncoded) => {
      const token = Token.fromEncoded(signedTokenEncoded);
      expect(token.payload).toStrictEqual(token.payload);
      expect(token.payloadEncoded).toStrictEqual(
        tokensUtils.generateTokenPayload(token.payload),
      );
      const signedToken = tokensUtils.parseSignedToken(signedTokenEncoded);
      expect(token.signatures).toStrictEqual(signedToken.signatures);
      expect(token.signaturesEncoded).toStrictEqual(
        signedToken.signatures.map((headerSignature) =>
          tokensUtils.generateTokenHeaderSignature(headerSignature),
        ),
      );
      const signedTokenEncoded_ = token.toEncoded();
      expect(signedTokenEncoded_).toStrictEqual(signedTokenEncoded);
    },
  );
  test.prop([
    fc.record({
      payload: fc.string() as fc.Arbitrary<TokenPayloadEncoded>,
      signatures: fc.array(
        fc.record({
          protected: fc.string(),
          signature: fc.string(),
        }) as fc.Arbitrary<TokenHeaderSignatureEncoded>,
      ),
    }),
  ])(
    'creating Token from invalid signed token encoded results in parse error',
    (signedTokenEncodedIncorrect) => {
      expect(() => {
        Token.fromEncoded(signedTokenEncodedIncorrect);
      }).toThrow(tokensErrors.ErrorTokensSignedParse);
    },
  );
  test.prop([
    testsTokensUtils.tokenPayloadArb,
    testsKeysUtils.keyArb,
    testsKeysUtils.keyArb,
    testsKeysUtils.keyPairArb,
    testsKeysUtils.keyPairArb,
  ])(
    'signing and verifying',
    (
      tokenPayload,
      keyCorrect,
      keyIncorrect,
      keyPairCorrect,
      keyPairIncorrect,
    ) => {
      const token = Token.fromPayload(tokenPayload);
      token.signWithKey(keyCorrect);
      token.signWithPrivateKey(keyPairCorrect.privateKey);
      expect(token.verifyWithKey(keyCorrect)).toBe(true);
      expect(token.verifyWithPublicKey(keyPairCorrect.publicKey)).toBe(true);
      expect(token.verifyWithKey(keyIncorrect)).toBe(false);
      expect(token.verifyWithPublicKey(keyPairIncorrect.publicKey)).toBe(false);
      expect(token.signatures).toHaveLength(2);
      expect(token.signaturesEncoded).toHaveLength(2);
    },
  );
  test.prop([
    testsTokensUtils.tokenPayloadArb,
    testsKeysUtils.keyArb,
    testsKeysUtils.keyPairArb,
  ])(
    'signing with the same key results in duplicate signature error',
    (tokenPayload, key, keyPair) => {
      const token = Token.fromPayload(tokenPayload);
      token.signWithKey(key);
      expect(() => {
        token.signWithKey(key);
      }).toThrow(tokensErrors.ErrorTokensDuplicateSignature);
      token.signWithPrivateKey(keyPair);
      expect(() => {
        token.signWithPrivateKey(keyPair);
      }).toThrow(tokensErrors.ErrorTokensDuplicateSignature);
    },
  );
  test.prop([testsTokensUtils.signedTokenArb])(
    'encode and decode',
    (signedToken) => {
      const token = Token.fromSigned(signedToken);
      const signedTokenEncoded = token.toEncoded();
      const token_ = Token.fromEncoded(signedTokenEncoded);
      const signedToken_ = token_.toSigned();
      expect(signedToken_).toEqual(signedToken);
    },
  );
  test.prop([testsTokensUtils.signedTokenEncodedArb])(
    'JSON stringify stringifies the signed token encoded',
    (signedTokenEncoded) => {
      const token = Token.fromEncoded(signedTokenEncoded);
      const signedTokenEncoded_ = JSON.stringify(token);
      expect(signedTokenEncoded_).toEqual(JSON.stringify(signedTokenEncoded));
    },
  );
});
