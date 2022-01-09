import { pki } from 'node-forge';
import * as keysUtils from '@/keys/utils';

describe('utils', () => {
  test('key pair copy', async () => {
    const keyPair = await keysUtils.generateKeyPair(1024);
    const keyPairPem = keysUtils.keyPairToPem(keyPair);
    const keyPair2 = keysUtils.keyPairCopy(keyPair);
    const keyPairPem2 = keysUtils.keyPairToPem(keyPair2);
    expect(keyPairPem).toStrictEqual(keyPairPem2);
  });
  test('to and from der encoding', async () => {
    const keyPair = await keysUtils.generateKeyPair(1024);
    const cert = keysUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      keyPair.privateKey,
      1000,
    );
    const certPem = keysUtils.certToPem(cert);
    const certDer = keysUtils.certToDer(cert);
    const cert_ = keysUtils.certFromDer(certDer);
    const certPem_ = keysUtils.certToPem(cert_);
    expect(certPem).toBe(certPem_);
  });
  test('certificate copy', async () => {
    const keyPair = await keysUtils.generateKeyPair(1024);
    const cert = keysUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      keyPair.privateKey,
      1000,
    );
    const certPem = keysUtils.certToPem(cert);
    const cert2 = keysUtils.certCopy(cert);
    const certPem2 = keysUtils.certToPem(cert2);
    expect(certPem).toBe(certPem2);
  });
  test('encryption and decryption of private key', async () => {
    const keyPair = await keysUtils.generateKeyPair(1024);
    // Try first password
    const password = (await keysUtils.getRandomBytes(10)).toString('base64');
    const privateKeyPemEncrypted = keysUtils.encryptPrivateKey(
      keyPair.privateKey,
      password,
    );
    const privateKey = keysUtils.decryptPrivateKey(
      privateKeyPemEncrypted,
      password,
    );
    expect(pki.privateKeyToPem(privateKey)).toBe(
      pki.privateKeyToPem(keyPair.privateKey),
    );
    // Change to second password
    const password2 = (await keysUtils.getRandomBytes(10)).toString('base64');
    const privateKeyPemEncrypted2 = keysUtils.encryptPrivateKey(
      privateKey,
      password2,
    );
    const privateKey2 = keysUtils.decryptPrivateKey(
      privateKeyPemEncrypted2,
      password2,
    );
    expect(pki.privateKeyToPem(privateKey2)).toBe(
      pki.privateKeyToPem(keyPair.privateKey),
    );
    // Wrong password
    const password3 = (await keysUtils.getRandomBytes(10)).toString('base64');
    expect(() => {
      keysUtils.decryptPrivateKey(privateKeyPemEncrypted2, password3);
    }).toThrow(Error);
  });
  test('generates recovery code', async () => {
    const recoveryCode = keysUtils.generateRecoveryCode();
    expect(recoveryCode.split(' ')).toHaveLength(24);
    const recoveryCode24 = keysUtils.generateRecoveryCode();
    expect(recoveryCode24.split(' ')).toHaveLength(24);
    const recoveryCode12 = keysUtils.generateRecoveryCode(12);
    expect(recoveryCode12.split(' ')).toHaveLength(12);
  });
  test(
    'generating key pair from recovery code is deterministic',
    async () => {
      const recoveryCode = keysUtils.generateRecoveryCode(12);
      // Deterministic key pair generation can take between 4 to 10 seconds
      const keyPair1 = await keysUtils.generateDeterministicKeyPair(
        256,
        recoveryCode,
      );
      const keyPair2 = await keysUtils.generateDeterministicKeyPair(
        256,
        recoveryCode,
      );
      const nodeId1 = keysUtils.publicKeyToFingerprint(keyPair1.publicKey);
      const nodeId2 = keysUtils.publicKeyToFingerprint(keyPair2.publicKey);
      expect(nodeId1).toBe(nodeId2);
    },
    global.defaultTimeout * 2,
  );
});
