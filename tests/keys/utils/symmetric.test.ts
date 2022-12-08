import { testProp, fc } from '@fast-check/jest';
import * as symmetric from '@/keys/utils/symmetric';
import * as utils from '@/utils';
import * as testsKeysUtils from '../utils';

describe('keys/utils/symmetric', () => {
  testProp(
    'encrypt & decrypt with key',
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
    'mac & auth with key',
    [
      testsKeysUtils.keyArb,
      testsKeysUtils.keyArb,
      testsKeysUtils.bufferArb({ minLength: 0, maxLength: 1024 }),
      testsKeysUtils.bufferArb({ minLength: 0, maxLength: 1024 }),
      testsKeysUtils.bufferArb({ minLength: 0, maxLength: 1024 }),
    ],
    (keyCorrect, keyWrong, dataCorrect, dataWrong, macWrong) => {
      fc.pre(!keyCorrect.equals(keyWrong));
      fc.pre(!dataCorrect.equals(dataWrong));
      const macCorrect = symmetric.macWithKey(keyCorrect, dataCorrect);
      expect(macCorrect).toHaveLength(32);
      expect(symmetric.authWithKey(keyCorrect, dataCorrect, macCorrect)).toBe(
        true,
      );
      expect(symmetric.authWithKey(keyCorrect, dataWrong, macWrong)).toBe(
        false,
      );
      expect(symmetric.authWithKey(keyCorrect, dataWrong, macCorrect)).toBe(
        false,
      );
      expect(symmetric.authWithKey(keyCorrect, dataCorrect, macWrong)).toBe(
        false,
      );
      expect(symmetric.authWithKey(keyWrong, dataCorrect, macCorrect)).toBe(
        false,
      );
      expect(symmetric.authWithKey(keyWrong, dataWrong, macCorrect)).toBe(
        false,
      );
      expect(symmetric.authWithKey(keyWrong, dataWrong, macWrong)).toBe(false);
      expect(symmetric.authWithKey(keyWrong, dataCorrect, macWrong)).toBe(
        false,
      );
    },
  );
  testProp(
    'mac with key generator',
    [
      testsKeysUtils.keyArb,
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 })),
    ],
    (key, datas) => {
      const maccer = symmetric.macWithKeyG(key);
      maccer.next();
      for (const data of datas) {
        maccer.next(data);
      }
      const result1 = maccer.next(null);
      expect(result1.done).toBe(true);
      expect(result1.value).toHaveLength(32);
      const auther = symmetric.authWithKeyG(key, result1.value!);
      auther.next();
      for (const data of datas) {
        auther.next(data);
      }
      const result2 = auther.next(null);
      expect(result2.done).toBe(true);
      expect(result2.value).toBe(true);
      expect(symmetric.macWithKey(key, Buffer.concat(datas))).toStrictEqual(
        result1.value,
      );
    },
  );
  testProp(
    'mac & auth with key iterator',
    [
      testsKeysUtils.keyArb,
      fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 })),
    ],
    (key, datas) => {
      const digest = symmetric.macWithKeyI(key, datas);
      expect(symmetric.authWithKeyI(key, datas, digest)).toBe(true);
      expect(symmetric.macWithKey(key, Buffer.concat(datas))).toStrictEqual(
        digest,
      );
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
