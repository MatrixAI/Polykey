import { testProp } from '@fast-check/jest';
import * as symmetric from '@/keys/utils/symmetric';
import * as testsKeysUtils from '../utils';

describe('keys/utils/symmetric', () => {
  testProp('import and export key', [testsKeysUtils.keyArb], async (key) => {
    const cryptoKey = await symmetric.importKey(key);
    const key_ = await symmetric.exportKey(cryptoKey);
    expect(key_).toStrictEqual(key);
  });
  testProp(
    'encrypt & decrypt with raw key',
    [
      testsKeysUtils.keyArb,
      testsKeysUtils.bufferArb({ minLength: 1, maxLength: 1024 }),
    ],
    async (key, plainText) => {
      const cipherText = await symmetric.encryptWithKey(key, plainText);
      const plainText_ = await symmetric.decryptWithKey(key, cipherText);
      expect(plainText_).toStrictEqual(plainText);
    },
  );
  testProp(
    'encrypt & decrypt with imported key',
    [
      testsKeysUtils.keyArb,
      testsKeysUtils.bufferArb({ minLength: 1, maxLength: 1024 }),
    ],
    async (key, plainText) => {
      const key_ = await symmetric.importKey(key);
      const cipherText = await symmetric.encryptWithKey(key_, plainText);
      const plainText_ = await symmetric.decryptWithKey(key_, cipherText);
      expect(plainText_).toStrictEqual(plainText);
    },
  );
});
