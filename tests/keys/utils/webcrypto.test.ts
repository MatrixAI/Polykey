import { testProp } from '@fast-check/jest';
import webcrypto, {
  importKeyPair,
  exportKeyPair,
} from '@/keys/utils/webcrypto';
import * as testsKeysUtils from '../utils';

describe('keys/utils/webcrypto', () => {
  test('webcrypto polyfill is monkey patched globally', async () => {
    expect(globalThis.crypto).toBe(webcrypto);
  });
  testProp(
    'import and export ed25519 keypair',
    [testsKeysUtils.keyPairArb],
    async (keyPair) => {
      const cryptoKeyPair = await importKeyPair(keyPair);
      expect(cryptoKeyPair.publicKey.type).toBe('public');
      expect(cryptoKeyPair.publicKey.extractable).toBe(true);
      expect(cryptoKeyPair.privateKey.type).toBe('private');
      expect(cryptoKeyPair.privateKey.extractable).toBe(true);
      const keyPair_ = await exportKeyPair(cryptoKeyPair);
      expect(keyPair_.publicKey).toStrictEqual(keyPair.publicKey);
      expect(keyPair_.privateKey).toStrictEqual(keyPair.privateKey);
    },
  );
});
