import sodium from 'sodium-native';
import * as generate from '@/keys/utils/generate';
import * as recoveryCode from '@/keys/utils/recoveryCode';

describe('keys/utils/generate', () => {
  test('generate keys', () => {
    const key1 = generate.generateKey();
    const key2 = generate.generateKey();
    expect(key1).toHaveLength(32);
    expect(key2).toHaveLength(32);
    expect(key1).not.toEqual(key2);
  });
  test('generate key pair', () => {
    const keyPair1 = generate.generateKeyPair();
    const keyPair2 = generate.generateKeyPair();
    expect(keyPair1.publicKey).toHaveLength(32);
    expect(keyPair1.privateKey).toHaveLength(32);
    expect(keyPair1.secretKey).toHaveLength(64);
    expect(keyPair2.publicKey).toHaveLength(32);
    expect(keyPair2.privateKey).toHaveLength(32);
    expect(keyPair2.secretKey).toHaveLength(64);
    expect(keyPair1.publicKey).not.toEqual(keyPair1.privateKey);
    expect(keyPair1.secretKey).toStrictEqual(
      Buffer.concat([keyPair1.privateKey, keyPair1.publicKey]),
    );
    expect(keyPair2.publicKey).not.toEqual(keyPair2.privateKey);
    expect(keyPair2.secretKey).toStrictEqual(
      Buffer.concat([keyPair2.privateKey, keyPair2.publicKey]),
    );
    expect(keyPair1).not.toEqual(keyPair2);
    // Valid Ed25519 public keys
    expect(sodium.crypto_core_ed25519_is_valid_point(keyPair1.publicKey)).toBe(
      true,
    );
    expect(sodium.crypto_core_ed25519_is_valid_point(keyPair2.publicKey)).toBe(
      true,
    );
  });
  test.each([12, 24, undefined])(
    'generate deterministic key pair - length: %s',
    async (length) => {
      for (let i = 0; i < 10; i++) {
        const recoveryCode1 = recoveryCode.generateRecoveryCode(
          length as 12 | 24 | undefined,
        );
        const keyPair1 = await generate.generateDeterministicKeyPair(
          recoveryCode1,
        );
        expect(keyPair1.publicKey).toHaveLength(32);
        expect(keyPair1.privateKey).toHaveLength(32);
        expect(keyPair1.publicKey).not.toEqual(keyPair1.privateKey);
        expect(keyPair1.secretKey).toStrictEqual(
          Buffer.concat([keyPair1.privateKey, keyPair1.publicKey]),
        );
        const keyPair2 = await generate.generateDeterministicKeyPair(
          recoveryCode1,
        );
        expect(keyPair2.publicKey).toHaveLength(32);
        expect(keyPair2.privateKey).toHaveLength(32);
        expect(keyPair2.publicKey).not.toEqual(keyPair2.privateKey);
        expect(keyPair2.secretKey).toStrictEqual(
          Buffer.concat([keyPair2.privateKey, keyPair2.publicKey]),
        );
        expect(keyPair2).toStrictEqual(keyPair1);
        // Valid Ed25519 public keys
        expect(
          sodium.crypto_core_ed25519_is_valid_point(keyPair1.publicKey),
        ).toBe(true);
        expect(
          sodium.crypto_core_ed25519_is_valid_point(keyPair2.publicKey),
        ).toBe(true);
      }
    },
  );
});
