import { test, fc } from '@fast-check/jest';
import * as symmetric from '@/keys/utils/symmetric';
import * as utils from '@/utils';
import * as testsKeysUtils from '../utils';

describe('keys/utils/symmetric', () => {
  test.prop([
    testsKeysUtils.keyArb,
    testsKeysUtils.bufferArb({ minLength: 0, maxLength: 1024 }),
  ])(
    'encrypt & decrypt with key',

    (key, plainText) => {
      const cipherText = symmetric.encryptWithKey(key, plainText);
      const plainText_ = symmetric.decryptWithKey(key, cipherText);
      expect(plainText_).toStrictEqual(plainText);
    },
  );
  test.prop([
    testsKeysUtils.keyArb,
    fc.uint8Array({ minLength: 0, maxLength: 2048 }).map(utils.bufferWrap),
  ])('decrypt returns `undefined` for random data', (key, cipherText) => {
    const plainText = symmetric.decryptWithKey(key, cipherText);
    expect(plainText).toBeUndefined();
  });
  test.prop([
    testsKeysUtils.keyArb,
    testsKeysUtils.keyArb,
    testsKeysUtils.bufferArb({ minLength: 0, maxLength: 1024 }),
    testsKeysUtils.bufferArb({ minLength: 0, maxLength: 1024 }),
    testsKeysUtils.bufferArb({ minLength: 0, maxLength: 1024 }),
  ])(
    'mac & auth with key',
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
  test.prop([
    testsKeysUtils.keyArb,
    fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 })),
  ])('mac with key generator', (key, datas) => {
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
  });
  test.prop([
    testsKeysUtils.keyArb,
    fc.array(fc.uint8Array({ minLength: 0, maxLength: 1024 })),
  ])('mac & auth with key iterator', (key, datas) => {
    const digest = symmetric.macWithKeyI(key, datas);
    expect(symmetric.authWithKeyI(key, datas, digest)).toBe(true);
    expect(symmetric.macWithKey(key, Buffer.concat(datas))).toStrictEqual(
      digest,
    );
  });
  test.prop([testsKeysUtils.passwordArb, testsKeysUtils.keyJWKArb], {
    // Password based encryption is intended to be slow, so we can't have too many runs
    numRuns: 5,
  })('wrap & unwrap with random password', (password, keyJWK) => {
    const wrappedKey = symmetric.wrapWithPassword(password, keyJWK);
    const keyJWK_ = symmetric.unwrapWithPassword(password, wrappedKey)!;
    expect(keyJWK_).toStrictEqual(keyJWK);
  });
  test.prop([testsKeysUtils.keyArb, testsKeysUtils.keyJWKArb])(
    'wrap & unwrap with random key',
    (key, keyJWK) => {
      const wrappedKey = symmetric.wrapWithKey(key, keyJWK);
      const keyJWK_ = symmetric.unwrapWithKey(key, wrappedKey);
      expect(keyJWK_).toStrictEqual(keyJWK);
    },
  );
});
