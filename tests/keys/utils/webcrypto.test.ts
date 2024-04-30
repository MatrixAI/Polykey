import { test } from '@fast-check/jest';
import { importKeyPair, exportKeyPair } from '@/keys/utils/webcrypto';
import * as testsKeysUtils from '../utils';

describe('keys/utils/webcrypto', () => {
  test.prop([testsKeysUtils.keyPairArb])(
    'import and export ed25519 keypair',
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
