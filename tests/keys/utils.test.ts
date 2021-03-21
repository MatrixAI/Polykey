import { pki } from 'node-forge';
import * as keysUtils from '@/keys/utils';

describe('utils', () => {
  test('key pair copy', async () => {
    const keyPair = await keysUtils.generateKeyPair(4096);
    const keyPairPem = keysUtils.keyPairToPem(keyPair);
    const keyPair2 = keysUtils.keyPairCopy(keyPair);
    const keyPairPem2 = keysUtils.keyPairToPem(keyPair2);
    expect(keyPairPem).toStrictEqual(keyPairPem2);
  });
  test('certificate copy', async () => {
    const keyPair = await keysUtils.generateKeyPair(4096);
    const cert = keysUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      1000,
    );
    const certPem = keysUtils.certToPem(cert);
    const cert2 = keysUtils.certCopy(cert);
    const certPem2 = keysUtils.certToPem(cert2);
    expect(certPem).toBe(certPem2);
  });
  test('encryption and decryption of private key', async () => {
    const keyPair = await keysUtils.generateKeyPair(4096);
    // try first password
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
    // change to second password
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
    // wrong password
    const password3 = (await keysUtils.getRandomBytes(10)).toString('base64');
    expect(() => {
      keysUtils.decryptPrivateKey(privateKeyPemEncrypted2, password3);
    }).toThrow(Error);
  });
});
