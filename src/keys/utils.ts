import type {
  KeyPair,
  KeyPairAsn1,
  KeyPairPem,
  PublicKey,
  PrivateKey,
  PrivateKeyPem,
  Certificate,
  PublicKeyFingerprint,
  CertificateAsn1,
  CertificatePem,
  PublicKeyAsn1,
  PrivateKeyAsn1,
  PublicKeyPem,
} from './types';

import { Buffer } from 'buffer';
import { pki, md, pss, random, util as forgeUtil, mgf } from 'node-forge';
import * as utils from '../utils';
import * as keysErrors from './errors';

async function generateKeyPair(bits: number): Promise<KeyPair> {
  return await pki.rsa.generateKeyPair({ bits });
}

function publicKeyToPem(publicKey: PublicKey): PublicKeyPem {
  return pki.publicKeyToPem(publicKey);
}

function publicKeyFromPem(publicKeyPem: PublicKeyPem): PublicKey {
  return pki.publicKeyFromPem(publicKeyPem);
}

function publicKeyToAsn1(publicKey: PublicKey): PublicKeyAsn1 {
  return pki.publicKeyToAsn1(publicKey);
}

function publicKeyFromAsn1(publicKeyAsn1: PublicKeyAsn1): PublicKey {
  return pki.publicKeyFromAsn1(publicKeyAsn1) as PublicKey;
}

function privateKeyToPem(privateKey: PrivateKey): PrivateKeyPem {
  return pki.privateKeyToPem(privateKey);
}

function privateKeyFromPem(privateKeyPem: PrivateKeyPem): PrivateKey {
  return pki.privateKeyFromPem(privateKeyPem);
}

function privateKeyToAsn1(privateKey: PrivateKey): PrivateKeyAsn1 {
  return pki.privateKeyToAsn1(privateKey);
}

function privateKeyFromAsn1(privateKeyAsn1: PrivateKeyAsn1): PrivateKey {
  return pki.privateKeyFromAsn1(privateKeyAsn1) as PrivateKey;
}

function keyPairFromAsn1(keyPair: KeyPairAsn1): KeyPair {
  return {
    publicKey: publicKeyFromAsn1(keyPair.publicKey),
    privateKey: privateKeyFromAsn1(keyPair.privateKey),
  };
}

function keyPairToAsn1(keyPair: KeyPair): KeyPairAsn1 {
  return {
    publicKey: publicKeyToAsn1(keyPair.publicKey),
    privateKey: privateKeyToAsn1(keyPair.privateKey),
  };
}

function keyPairToPem(keyPair: KeyPair): KeyPairPem {
  return {
    publicKey: publicKeyToPem(keyPair.publicKey),
    privateKey: privateKeyToPem(keyPair.privateKey),
  };
}

function keyPairFromPem(keyPair: KeyPairPem): KeyPair {
  return {
    publicKey: publicKeyFromPem(keyPair.publicKey),
    privateKey: privateKeyFromPem(keyPair.privateKey),
  };
}

function keyPairToPemEncrypted(keyPair: KeyPair, password: string): KeyPairPem {
  return {
    publicKey: publicKeyToPem(keyPair.publicKey),
    privateKey: encryptPrivateKey(keyPair.privateKey, password),
  };
}

function keyPairFromPemEncrypted(
  keyPair: KeyPairPem,
  password: string,
): KeyPair {
  return {
    publicKey: publicKeyFromPem(keyPair.publicKey),
    privateKey: decryptPrivateKey(keyPair.privateKey, password),
  };
}

function keyPairCopy(keyPair: KeyPair): KeyPair {
  return keyPairFromAsn1(keyPairToAsn1(keyPair));
}

function publicKeyToFingerprint(publicKey: PublicKey): PublicKeyFingerprint {
  const fString = pki.getPublicKeyFingerprint(publicKey, {
    type: 'SubjectPublicKeyInfo',
    md: md.sha256.create(),
    encoding: 'binary',
  });
  const fTypedArray = forgeUtil.binary.raw.decode(fString);
  const f = forgeUtil.binary.base64.encode(fTypedArray);
  return f;
}

function encryptPrivateKey(
  privateKey: PrivateKey,
  password: string,
): PrivateKeyPem {
  return pki.encryptRsaPrivateKey(privateKey, password, {
    algorithm: 'aes256',
    saltSize: 8,
    count: 10000,
  });
}

/**
 * Decrypting the private key
 */
function decryptPrivateKey(
  privateKeyEncryptedPem: PrivateKeyPem,
  password: string,
): PrivateKey {
  // using the wrong password can return a null
  // or it could throw an exception
  // the exact exception can be different
  const privateKeyDecrypted = pki.decryptRsaPrivateKey(
    privateKeyEncryptedPem,
    password,
  );
  if (privateKeyDecrypted == null) {
    throw new Error('Incorrect private key password');
  }
  return privateKeyDecrypted;
}

function publicKeyFromPrivateKey(privateKey: PrivateKey): PublicKey {
  return pki.rsa.setPublicKey(privateKey.n, privateKey.e);
}

function generateCertificate(
  subjectPublicKey: PublicKey,
  issuerPrivateKey: PrivateKey,
  duration: number,
  subjectAttrsExtra: Array<{ name: string; value: string }> = [],
  issuerAttrsExtra: Array<{ name: string; value: string }> = [],
): Certificate {
  const now = new Date();
  const cert = pki.createCertificate();
  cert.publicKey = subjectPublicKey;
  cert.serialNumber = utils.getUnixtime(now).toString();
  const notBeforeDate = new Date(now.getTime());
  const notAfterDate = new Date(now.getTime());
  notAfterDate.setSeconds(notAfterDate.getSeconds() + duration);
  cert.validity.notBefore = notBeforeDate;
  cert.validity.notAfter = notAfterDate;
  const subjectAttrs = [
    ...subjectAttrsExtra,
    {
      name: 'commonName',
      value: publicKeyToFingerprint(subjectPublicKey),
    },
  ];
  const issuerAttrs = [
    ...issuerAttrsExtra,
    {
      name: 'commonName',
      value: publicKeyToFingerprint(publicKeyFromPrivateKey(issuerPrivateKey)),
    },
  ];
  cert.setSubject(subjectAttrs);
  cert.setIssuer(issuerAttrs);
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true,
    },
    {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true,
    },
    {
      name: 'subjectKeyIdentifier',
    },
  ]);
  cert.sign(issuerPrivateKey, md.sha256.create());
  return cert;
}

function certToPem(cert: Certificate): CertificatePem {
  return pki.certificateToPem(cert);
}

function certFromPem(certPem: CertificatePem): Certificate {
  return pki.certificateFromPem(certPem);
}

function certToAsn1(cert: Certificate): CertificateAsn1 {
  return pki.certificateToAsn1(cert);
}

function certFromAsn1(certAsn1: CertificateAsn1): Certificate {
  return pki.certificateFromAsn1(certAsn1);
}

function certCopy(cert: Certificate): Certificate {
  // ideally we would use
  // certFromAsn1(certToAsn1(cert))
  // however this bugged:
  // https://github.com/digitalbazaar/forge/issues/866
  return certFromPem(certToPem(cert));
}

function certIssued(cert1: Certificate, cert2: Certificate): boolean {
  return cert1.issued(cert2);
}

function certVerified(cert1: Certificate, cert2: Certificate): boolean {
  return cert1.verify(cert2);
}

function encryptWithPublicKey(publicKey: PublicKey, plainText: Buffer): Buffer {
  // sha256 is 256 bits or 32 bytes
  const maxSize = maxEncryptSize(publicKeyBitSize(publicKey) / 8, 32);
  if (plainText.byteLength > maxSize) {
    throw new keysErrors.ErrorEncryptSize(
      `Maximum plain text byte size is ${maxSize}`,
    );
  }
  return Buffer.from(
    publicKey.encrypt(plainText.toString('binary'), 'RSA-OAEP', {
      md: md.sha256.create(),
      mgf1: {
        md: md.sha256.create(),
      },
    }),
    'binary',
  );
}

function decryptWithPrivateKey(
  privateKey: PrivateKey,
  cipherText: Buffer,
): Buffer {
  return Buffer.from(
    privateKey.decrypt(cipherText.toString('binary'), 'RSA-OAEP', {
      md: md.sha256.create(),
      mgf1: {
        md: md.sha256.create(),
      },
    }),
    'binary',
  );
}

function signWithPrivateKey(privateKey: PrivateKey, data: Buffer): Buffer {
  const dataDigest = md.sha256.create();
  dataDigest.update(data.toString('binary'), 'raw');
  const pssScheme = pss.create({
    md: md.sha256.create(),
    mgf: mgf.mgf1.create(md.sha256.create()),
    saltLength: 20,
  });
  return Buffer.from(privateKey.sign(dataDigest, pssScheme), 'binary');
}

function verifyWithPublicKey(
  publicKey: PublicKey,
  data: Buffer,
  signature: Buffer,
): boolean {
  const dataDigest = md.sha256.create();
  dataDigest.update(data.toString('binary'), 'raw');
  const pssScheme = pss.create({
    md: md.sha256.create(),
    mgf: mgf.mgf1.create(md.sha256.create()),
    saltLength: 20,
  });
  return publicKey.verify(
    dataDigest.digest().getBytes(),
    signature.toString('binary'),
    pssScheme,
  );
}

function maxEncryptSize(keyByteSize: number, hashByteSize: number) {
  // see: https://tools.ietf.org/html/rfc3447#section-7.1
  return keyByteSize - 2 * hashByteSize - 2;
}

function publicKeyBitSize(publicKey: PublicKey): number {
  return publicKey.n.bitLength();
}

async function getRandomBytes(size: number): Promise<Buffer> {
  return Buffer.from(await random.getBytes(size), 'binary');
}

function getRandomBytesSync(size: number): Buffer {
  return Buffer.from(random.getBytesSync(size), 'binary');
}

export {
  publicKeyToPem,
  publicKeyFromPem,
  publicKeyToAsn1,
  publicKeyFromAsn1,
  privateKeyToPem,
  privateKeyFromPem,
  privateKeyToAsn1,
  privateKeyFromAsn1,
  generateKeyPair,
  keyPairToAsn1,
  keyPairFromAsn1,
  keyPairToPem,
  keyPairFromPem,
  keyPairToPemEncrypted,
  keyPairFromPemEncrypted,
  keyPairCopy,
  publicKeyToFingerprint,
  encryptPrivateKey,
  decryptPrivateKey,
  generateCertificate,
  certToAsn1,
  certFromAsn1,
  certToPem,
  certFromPem,
  certCopy,
  certIssued,
  certVerified,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  signWithPrivateKey,
  verifyWithPublicKey,
  maxEncryptSize,
  publicKeyBitSize,
  getRandomBytes,
  getRandomBytesSync,
};
