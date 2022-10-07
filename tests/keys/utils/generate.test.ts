import * as generate from '@/keys/utils/generate';
import * as recoveryCode from '@/keys/utils/recoveryCode';

describe('keys/utils/generate', () => {
  test('generate keys', async () => {
    const key = await generate.generateKey();
    expect(key).toHaveLength(32);
  });
  test('generate key pair', async () => {
    const keyPair1 = await generate.generateKeyPair();
    expect(keyPair1.publicKey).toHaveLength(32);
    expect(keyPair1.privateKey).toHaveLength(32);
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
        const keyPair2 = await generate.generateDeterministicKeyPair(
          recoveryCode1,
        );
        expect(keyPair2.publicKey).toHaveLength(32);
        expect(keyPair2.privateKey).toHaveLength(32);
        expect(keyPair2).toStrictEqual(keyPair1);
      }
    },
  );
});
