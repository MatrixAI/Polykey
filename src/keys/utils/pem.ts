import type {
  PublicKey,
  PrivateKey,
  KeyPair,
  PublicKeyPEM,
  PrivateKeyPEM,
  KeyPairPEM,
} from '../types';
import * as x509 from '@peculiar/x509';
import * as asn1 from '@peculiar/asn1-schema';
import * as asn1X509 from '@peculiar/asn1-x509';
import * as asn1Pkcs8 from '@peculiar/asn1-pkcs8';
import { validatePublicKey } from './asymmetric';

/**
 * Converts PublicKey to SPKI PEM format.
 * SPKI is "SubjectPublicKeyInfo" which is used in certificates.
 * This format is based on ASN.1 DER encoding.
 */
function publicKeyToPEM(publicKey: PublicKey): PublicKeyPEM {
  const spki = new asn1X509.SubjectPublicKeyInfo({
    algorithm: new asn1X509.AlgorithmIdentifier({
      algorithm: x509.idEd25519,
    }),
    subjectPublicKey: publicKey,
  });
  const data = Buffer.from(asn1.AsnSerializer.serialize(spki));
  const contents =
    data
      .toString('base64')
      .replace(/(.{64})/g, '$1\n')
      .trimEnd() + '\n';
  return `-----BEGIN PUBLIC KEY-----\n${contents}-----END PUBLIC KEY-----\n` as PublicKeyPEM;
}

/**
 * The returned buffers is guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function publicKeyFromPEM(publicKeyPEM: PublicKeyPEM): PublicKey | undefined {
  const match = publicKeyPEM.match(
    /-----BEGIN PUBLIC KEY-----\n([A-Za-z0-9+/=\n]+)-----END PUBLIC KEY-----\n/,
  );
  if (match == null) {
    return undefined;
  }
  const data = Buffer.from(match[1], 'base64');
  const spki = asn1.AsnConvert.parse(data, asn1X509.SubjectPublicKeyInfo);
  const publicKey = Buffer.from(spki.subjectPublicKey);
  if (!validatePublicKey(publicKey)) {
    return;
  }
  return publicKey;
}

function privateKeyToPEM(privateKey: PrivateKey): PrivateKeyPEM {
  const pkcs8 = new asn1Pkcs8.PrivateKeyInfo({
    privateKeyAlgorithm: new asn1X509.AlgorithmIdentifier({
      algorithm: x509.idEd25519,
    }),
    privateKey: new asn1Pkcs8.PrivateKey(
      new asn1.OctetString(privateKey).toASN().toBER(),
    ),
  });
  const data = Buffer.from(asn1.AsnSerializer.serialize(pkcs8));
  const contents =
    data
      .toString('base64')
      .replace(/(.{64})/g, '$1\n')
      .trimEnd() + '\n';
  return `-----BEGIN PRIVATE KEY-----\n${contents}-----END PRIVATE KEY-----\n` as PrivateKeyPEM;
}

/**
 * The returned buffers is guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function privateKeyFromPEM(
  privateKeyPEM: PrivateKeyPEM,
): PrivateKey | undefined {
  const match = privateKeyPEM.match(
    /-----BEGIN PRIVATE KEY-----\n([A-Za-z0-9+/=\n]+)-----END PRIVATE KEY-----\n/,
  );
  if (match == null) {
    return;
  }
  const data = Buffer.from(match[1], 'base64');
  const pkcs8 = asn1.AsnConvert.parse(data, asn1Pkcs8.PrivateKeyInfo);
  const privateKeyAsn = asn1.AsnConvert.parse(
    pkcs8.privateKey,
    asn1Pkcs8.PrivateKey,
  );
  const privateKey = Buffer.from(privateKeyAsn.buffer) as PrivateKey;
  if (privateKey.byteLength !== 32) {
    return;
  }
  return privateKey;
}

function keyPairToPEM(keyPair: {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}): KeyPairPEM {
  return {
    publicKey: publicKeyToPEM(keyPair.publicKey),
    privateKey: privateKeyToPEM(keyPair.privateKey),
  };
}

/**
 * The returned buffers is guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function keyPairFromPEM(keyPair: KeyPairPEM): KeyPair | undefined {
  const publicKey = publicKeyFromPEM(keyPair.publicKey);
  const privateKey = privateKeyFromPEM(keyPair.privateKey);
  if (publicKey == null || privateKey == null) {
    return undefined;
  }
  const secretKey = Buffer.allocUnsafeSlow(
    privateKey.byteLength + publicKey.byteLength,
  );
  privateKey.copy(secretKey);
  publicKey.copy(secretKey, privateKey.byteLength);
  return {
    publicKey,
    privateKey,
    secretKey,
  } as KeyPair;
}

export {
  publicKeyToPEM,
  publicKeyFromPEM,
  privateKeyToPEM,
  privateKeyFromPEM,
  keyPairToPEM,
  keyPairFromPEM,
};
