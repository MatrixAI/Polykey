import { testProp, fc } from '@fast-check/jest';
import * as symmetric from '@/keys/utils/symmetric';
import * as utils from '@/utils';
import * as testsKeysUtils from '../utils';

describe('keys/utils/symmetric', () => {
  testProp(
    'encrypt & decrypt with raw key',
    [
      testsKeysUtils.keyArb,
      testsKeysUtils.bufferArb({ minLength: 0, maxLength: 1024 }),
    ],
    (key, plainText) => {
      const cipherText = symmetric.encryptWithKey(key, plainText);
      const plainText_ = symmetric.decryptWithKey(key, cipherText);
      expect(plainText_).toStrictEqual(plainText);
    },
  );
  testProp(
    'decrypt returns `undefined` for random data',
    [
      testsKeysUtils.keyArb,
      fc.uint8Array({ minLength: 0, maxLength: 2048 }).map(utils.bufferWrap),
    ],
    (key, cipherText) => {
      const plainText = symmetric.decryptWithKey(key, cipherText);
      expect(plainText).toBeUndefined();
    },
  );
  testProp(
    'wrap & unwrap with random password',
    [testsKeysUtils.passwordArb, testsKeysUtils.keyJWKArb],
    (password, keyJWK) => {
      const wrappedKey = symmetric.wrapWithPassword(password, keyJWK);
      const keyJWK_ = symmetric.unwrapWithPassword(password, wrappedKey);
      expect(keyJWK_).toStrictEqual(keyJWK);
    },
    {
      // Password based encryption is intended to be slow
      numRuns: 5,
    },
  );
  testProp(
    'wrap & unwrap with random key',
    [testsKeysUtils.keyArb, testsKeysUtils.keyJWKArb],
    (key, keyJWK) => {
      const wrappedKey = symmetric.wrapWithKey(key, keyJWK);
      const keyJWK_ = symmetric.unwrapWithKey(key, wrappedKey);
      expect(keyJWK_).toStrictEqual(keyJWK);
    },
  );
});
