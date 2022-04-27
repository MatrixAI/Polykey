import type {
  Certificate,
  CertificateAsn1,
  CertificatePem,
  KeyPair,
  KeyPairAsn1,
  KeyPairPem,
  PrivateKey,
  PrivateKeyAsn1,
  PrivateKeyPem,
  PublicKey,
  PublicKeyAsn1,
  PublicKeyPem,
  RecoveryCode,
} from './types';

import type { NodeId } from '../nodes/types';
import { Buffer } from 'buffer';
import {
  asn1,
  cipher,
  md,
  mgf,
  pkcs5,
  pki,
  pss,
  random,
  util as forgeUtil,
} from 'node-forge';
import * as bip39 from 'bip39';
import { IdInternal } from '@matrixai/id';
import * as keysErrors from './errors';
import * as nodesUtils from '../nodes/utils';
import config from '../config';
import { promisify, getUnixtime, never } from '../utils';

bip39.setDefaultWordlist('english');

const ivSize = 16;
const authTagSize = 16;

async function generateKeyPair(bits: number): Promise<KeyPair> {
  const generateKeyPair = promisify(pki.rsa.generateKeyPair).bind(pki.rsa);
  return await generateKeyPair({ bits });
}

async function generateDeterministicKeyPair(
  bits: number,
  recoveryCode: string,
): Promise<KeyPair> {
  const prng = random.createInstance();
  prng.seedFileSync = (needed: number) => {
    // Using bip39 seed generation parameters
    // no passphrase is considered here
    return pkcs5.pbkdf2(
      recoveryCode,
      'mnemonic',
      2048,
      needed,
      md.sha512.create(),
    );
  };
  const generateKeyPair = promisify(pki.rsa.generateKeyPair).bind(pki.rsa);
  return await generateKeyPair({ bits, prng });
}

function generateRecoveryCode(size: 12 | 24 = 24): RecoveryCode {
  if (size === 12) {
    return bip39.generateMnemonic(128, getRandomBytesSync) as RecoveryCode;
  } else if (size === 24) {
    return bip39.generateMnemonic(256, getRandomBytesSync) as RecoveryCode;
  }
  never();
}

function validateRecoveryCode(recoveryCode: string): boolean {
  return bip39.validateMnemonic(recoveryCode);
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

function publicKeyToNodeId(publicKey: PublicKey): NodeId {
  const fString = pki.getPublicKeyFingerprint(publicKey, {
    type: 'SubjectPublicKeyInfo',
    md: md.sha256.create(),
    encoding: 'binary',
  });
  const fTypedArray = forgeUtil.binary.raw.decode(fString);
  return IdInternal.create<NodeId>(fTypedArray);
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
  // Using the wrong password can return a null
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
  subjectPrivateKey: PrivateKey,
  issuerPrivateKey: PrivateKey,
  duration: number,
  subjectAttrsExtra: Array<{ name: string; value: string }> = [],
  issuerAttrsExtra: Array<{ name: string; value: string }> = [],
): Certificate {
  const now = new Date();
  const cert = pki.createCertificate();
  cert.publicKey = subjectPublicKey;
  cert.serialNumber = getUnixtime(now).toString();
  const notBeforeDate = new Date(now.getTime());
  const notAfterDate = new Date(now.getTime());
  notAfterDate.setSeconds(notAfterDate.getSeconds() + duration);
  cert.validity.notBefore = notBeforeDate;
  cert.validity.notAfter = notAfterDate;
  const subjectAttrs = [
    ...subjectAttrsExtra,
    {
      name: 'commonName',
      value: nodesUtils.encodeNodeId(publicKeyToNodeId(subjectPublicKey)),
    },
  ];
  const issuerAttrs = [
    ...issuerAttrsExtra,
    {
      name: 'commonName',
      value: nodesUtils.encodeNodeId(
        publicKeyToNodeId(publicKeyFromPrivateKey(issuerPrivateKey)),
      ),
    },
  ];
  cert.setSubject(subjectAttrs);
  cert.setIssuer(issuerAttrs);
  const extensions: Array<any> = [
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
      name: 'subjectAltName',
      altNames: [
        {
          type: 2,
          value: nodesUtils.encodeNodeId(publicKeyToNodeId(subjectPublicKey)),
        },
        {
          type: 7,
          ip: '127.0.0.1',
        },
        {
          type: 7,
          ip: '::1',
        },
      ],
    },
    {
      name: 'subjectKeyIdentifier',
    },
    {
      name: 'polykeyVersion',
      id: config.oids.extensions.polykeyVersion,
      critical: true,
      value: asn1.create(
        asn1.Class.APPLICATION,
        asn1.Type.IA5STRING,
        false,
        config.sourceVersion,
      ),
    },
  ];
  cert.setExtensions(extensions);
  cert.sign(subjectPrivateKey, md.sha256.create());
  const nodeSignature = cert.signature;
  extensions.push({
    name: 'nodeSignature',
    id: config.oids.extensions.nodeSignature,
    critical: true,
    value: asn1.create(
      asn1.Class.APPLICATION,
      asn1.Type.OCTETSTRING,
      false,
      nodeSignature,
    ),
  });
  cert.setExtensions(extensions);
  cert.sign(issuerPrivateKey, md.sha256.create());
  return cert;
}

function certParseExtensions(exts: Array<any>): void {
  for (const ext of exts) {
    if (ext.id === config.oids.extensions.polykeyVersion) {
      const parsed = asn1.fromDer(ext.value);
      ext.polykeyVersion = parsed.value;
    } else if (ext.id === config.oids.extensions.nodeSignature) {
      const parsed = asn1.fromDer(ext.value);
      ext.nodeSignature = parsed.value;
    }
  }
}

function certToPem(cert: Certificate): CertificatePem {
  return pki.certificateToPem(cert);
}

function certFromPem(certPem: CertificatePem): Certificate {
  const cert = pki.certificateFromPem(certPem);
  certParseExtensions(cert.extensions);
  return cert;
}

function certToAsn1(cert: Certificate): CertificateAsn1 {
  return pki.certificateToAsn1(cert);
}

function certFromAsn1(certAsn1: CertificateAsn1): Certificate {
  const cert = pki.certificateFromAsn1(certAsn1);
  certParseExtensions(cert.extensions);
  return cert;
}

function certToDer(cert: Certificate): string {
  const certAsn1 = certToAsn1(cert);
  return asn1.toDer(certAsn1).getBytes();
}

function certFromDer(certDer: string): Certificate {
  const certAsn1 = asn1.fromDer(certDer);
  return certFromAsn1(certAsn1);
}

function certCopy(cert: Certificate): Certificate {
  // Ideally we would use
  // certFromAsn1(certToAsn1(cert))
  // however this bugged:
  // https://github.com/digitalbazaar/forge/issues/866
  return certFromPem(certToPem(cert));
}

function certIssued(cert1: Certificate, cert2: Certificate): boolean {
  return cert1.issued(cert2);
}

function certVerified(cert1: Certificate, cert2: Certificate): boolean {
  try {
    return cert1.verify(cert2);
  } catch (e) {
    return false;
  }
}

function certVerifiedNode(cert: Certificate): boolean {
  const certNodeSignatureExt = cert.getExtension({
    // @ts-ignore
    id: config.oids.extensions.nodeSignature,
  }) as any;
  if (certNodeSignatureExt == null) {
    return false;
  }
  const certNodeSignature = certNodeSignatureExt.nodeSignature;
  const extensionsOrig = cert.extensions;
  const extensionsFiltered = extensionsOrig.filter((ext) => {
    if (ext.id === config.oids.extensions.nodeSignature) {
      return false;
    }
    return true;
  });
  // Calculate the certificate digest
  const certDigest = md.sha256.create();
  let verified;
  try {
    cert.setExtensions(extensionsFiltered);
    // @ts-ignore
    const certTBS = pki.getTBSCertificate(cert);
    const certTBSDer = asn1.toDer(certTBS);
    certDigest.update(certTBSDer.getBytes());
    const publicKey = cert.publicKey as PublicKey;
    try {
      verified = publicKey.verify(
        certDigest.digest().getBytes(),
        certNodeSignature,
      );
    } catch (e) {
      return false;
    }
  } finally {
    // Roll back the mutations to the child certificate
    cert.setExtensions(extensionsOrig);
  }
  return verified;
}

/**
 * Acquires the NodeId from a certificate
 */
function certNodeId(cert: Certificate): NodeId | undefined {
  const commonName = cert.subject.getField({ type: '2.5.4.3' });
  if (commonName == null) {
    return;
  }
  return nodesUtils.decodeNodeId(commonName.value);
}

function encryptWithPublicKey(publicKey: PublicKey, plainText: Buffer): Buffer {
  // Sha256 is 256 bits or 32 bytes
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
  // See: https://tools.ietf.org/html/rfc3447#section-7.1
  return keyByteSize - 2 * hashByteSize - 2;
}

function publicKeyBitSize(publicKey: PublicKey): number {
  return publicKey.n.bitLength();
}

async function getRandomBytes(size: number): Promise<Buffer> {
  return Buffer.from(random.getBytes(size), 'binary');
}

function getRandomBytesSync(size: number): Buffer {
  return Buffer.from(random.getBytesSync(size), 'binary');
}

async function generateKey(bits: number = 256): Promise<Buffer> {
  const len = Math.floor(bits / 8);
  const key = await getRandomBytes(len);
  return key;
}

async function encryptWithKey(
  key: ArrayBuffer,
  plainText: ArrayBuffer,
): Promise<ArrayBuffer> {
  const iv = getRandomBytesSync(ivSize);
  const c = cipher.createCipher('AES-GCM', Buffer.from(key).toString('binary'));
  c.start({ iv: iv.toString('binary'), tagLength: authTagSize * 8 });
  c.update(forgeUtil.createBuffer(plainText));
  c.finish();
  const cipherText = Buffer.from(c.output.getBytes(), 'binary');
  const authTag = Buffer.from(c.mode.tag.getBytes(), 'binary');
  const data = Buffer.concat([iv, authTag, cipherText]);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

async function decryptWithKey(
  key: ArrayBuffer,
  cipherText: ArrayBuffer,
): Promise<ArrayBuffer | undefined> {
  const cipherTextBuf = Buffer.from(cipherText);
  if (cipherTextBuf.byteLength <= 32) {
    return;
  }
  const iv = cipherTextBuf.subarray(0, ivSize);
  const authTag = cipherTextBuf.subarray(ivSize, ivSize + authTagSize);
  const cipherText_ = cipherTextBuf.subarray(ivSize + authTagSize);
  const d = cipher.createDecipher(
    'AES-GCM',
    Buffer.from(key).toString('binary'),
  );
  d.start({
    iv: iv.toString('binary'),
    tagLength: authTagSize * 8,
    tag: forgeUtil.createBuffer(authTag),
  });
  d.update(forgeUtil.createBuffer(cipherText_));
  if (!d.finish()) {
    return;
  }
  const data = Buffer.from(d.output.getBytes(), 'binary');
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
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
  generateDeterministicKeyPair,
  generateRecoveryCode,
  validateRecoveryCode,
  keyPairToAsn1,
  keyPairFromAsn1,
  keyPairToPem,
  keyPairFromPem,
  keyPairToPemEncrypted,
  keyPairFromPemEncrypted,
  keyPairCopy,
  publicKeyToNodeId,
  encryptPrivateKey,
  decryptPrivateKey,
  publicKeyFromPrivateKey,
  generateCertificate,
  certToAsn1,
  certFromAsn1,
  certToPem,
  certFromPem,
  certToDer,
  certFromDer,
  certCopy,
  certIssued,
  certVerified,
  certVerifiedNode,
  certNodeId,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  signWithPrivateKey,
  verifyWithPublicKey,
  maxEncryptSize,
  publicKeyBitSize,
  getRandomBytes,
  getRandomBytesSync,
  generateKey,
  encryptWithKey,
  decryptWithKey,
};
