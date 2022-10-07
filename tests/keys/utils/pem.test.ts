import { testProp } from '@fast-check/jest';
import webcrypto, { importKeyPair } from '@/keys/utils/webcrypto';
import * as pem from '@/keys/utils/pem';
import * as x509 from '@/keys/utils/x509';
import * as ids from '@/ids';
import * as utils from '@/utils';
import * as testsKeysUtils from '../utils';

describe('keys/utils/pem', () => {
  const certIdGenerator = ids.createCertIdGenerator();
  testProp(
    'keypair convert to and from PEM',
    [testsKeysUtils.keyPairArb],
    async (keyPair) => {
      const keyPairPem = pem.keyPairToPem(keyPair);
      expect(keyPairPem.publicKey).toBeString();
      expect(keyPairPem.privateKey).toBeString();
      expect(keyPairPem.publicKey).toMatch(/-----BEGIN PUBLIC KEY-----/);
      expect(keyPairPem.publicKey).toMatch(/-----END PUBLIC KEY-----/);
      expect(keyPairPem.privateKey).toMatch(/-----BEGIN PRIVATE KEY-----/);
      expect(keyPairPem.privateKey).toMatch(/-----END PRIVATE KEY-----/);
      const keyPair_ = pem.keyPairFromPem(keyPairPem);
      expect(keyPair_).toBeDefined();
      expect(keyPair_!.publicKey).toStrictEqual(keyPair.publicKey);
      expect(keyPair_!.privateKey).toStrictEqual(keyPair.privateKey);
      // Sanity check that this is equal to webcrypto's export
      const cryptoKeyPair = await importKeyPair(keyPair);
      const spki = utils.bufferWrap(
        await webcrypto.subtle.exportKey('spki', cryptoKeyPair.publicKey),
      );
      const pkcs8 = utils.bufferWrap(
        await webcrypto.subtle.exportKey('pkcs8', cryptoKeyPair.privateKey),
      );
      const spkiPEM = `-----BEGIN PUBLIC KEY-----\n${spki.toString(
        'base64',
      )}\n-----END PUBLIC KEY-----\n`;
      const pkcs8PEM = `-----BEGIN PRIVATE KEY-----\n${pkcs8.toString(
        'base64',
      )}\n-----END PRIVATE KEY-----\n`;
      expect(spkiPEM).toStrictEqual(keyPairPem.publicKey);
      expect(pkcs8PEM).toStrictEqual(keyPairPem.privateKey);
    },
  );
  testProp(
    'certificate convert to and from PEM',
    [testsKeysUtils.keyPairArb, testsKeysUtils.keyPairArb],
    async (issuerKeyPair, subjectKeyPair) => {
      const cert = await x509.generateCertificate({
        certId: certIdGenerator(),
        subjectKeyPair: subjectKeyPair,
        issuerPrivateKey: issuerKeyPair.privateKey,
        duration: 1000,
      });
      const certPem = pem.certToPem(cert);
      const cert_ = pem.certFromPem(certPem);
      expect(x509.certEqual(cert, cert_)).toBe(true);
    },
  );
});
