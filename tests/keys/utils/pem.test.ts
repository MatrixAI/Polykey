import { testProp } from '@fast-check/jest';
import webcrypto, { importKeyPair } from '@/keys/utils/webcrypto';
import * as pem from '@/keys/utils/pem';
import * as ids from '@/ids';
import * as utils from '@/utils';
import * as testsKeysUtils from '../utils';

describe('keys/utils/pem', () => {
  const certIdGenerator = ids.createCertIdGenerator();
  testProp(
    'keypair convert to and from PEM',
    [testsKeysUtils.keyPairArb],
    async (keyPair) => {
      const keyPairPEM = pem.keyPairToPEM(keyPair);
      expect(keyPairPEM.publicKey).toBeString();
      expect(keyPairPEM.privateKey).toBeString();
      expect(keyPairPEM.publicKey).toMatch(/-----BEGIN PUBLIC KEY-----/);
      expect(keyPairPEM.publicKey).toMatch(/-----END PUBLIC KEY-----/);
      expect(keyPairPEM.privateKey).toMatch(/-----BEGIN PRIVATE KEY-----/);
      expect(keyPairPEM.privateKey).toMatch(/-----END PRIVATE KEY-----/);
      const keyPair_ = pem.keyPairFromPEM(keyPairPEM);
      expect(keyPair_).toBeDefined();
      expect(keyPair_!.publicKey).toStrictEqual(keyPair.publicKey);
      expect(keyPair_!.privateKey).toStrictEqual(keyPair.privateKey);
      // Sanity check that this is equal to webcrypto's export
      const cryptoKeyPair = await importKeyPair(keyPair);
      const spki = utils.bufferWrap(
        await webcrypto.subtle.exportKey('spki', cryptoKeyPair.publicKey),
      );
      const spkiContents = spki.toString('base64').replace(/(.{64})/g, '$1\n').trimEnd() + '\n';
      const pkcs8 = utils.bufferWrap(
        await webcrypto.subtle.exportKey('pkcs8', cryptoKeyPair.privateKey),
      );
      const pkcs8Contents = pkcs8.toString('base64').replace(/(.{64})/g, '$1\n').trimEnd() + '\n';
      const spkiPEM = `-----BEGIN PUBLIC KEY-----\n${spkiContents}-----END PUBLIC KEY-----\n`;
      const pkcs8PEM = `-----BEGIN PRIVATE KEY-----\n${pkcs8Contents}-----END PRIVATE KEY-----\n`;
      expect(spkiPEM).toStrictEqual(keyPairPEM.publicKey);
      expect(pkcs8PEM).toStrictEqual(keyPairPEM.privateKey);
    },
  );
});
