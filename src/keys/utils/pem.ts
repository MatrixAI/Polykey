import type {
  PublicKey,
  PrivateKey,
  KeyPair,
  PublicKeyPem,
  PrivateKeyPem,
  KeyPairPem,
  Certificate,
  CertificatePem,
} from '../types';
import * as x509 from '@peculiar/x509';
import * as asn1 from '@peculiar/asn1-schema';
import * as asn1X509 from '@peculiar/asn1-x509';
import * as asn1Pkcs8 from '@peculiar/asn1-pkcs8';
import { validatePublicKey } from './asymmetric';
import * as utils from '../../utils';

/**
 * Converts PublicKey to SPKI PEM format.
 * SPKI is "SubjectPublicKeyInfo" which is used in certificates.
 * This format is based on ASN.1 DER encoding.
 */
function publicKeyToPem(publicKey: PublicKey): PublicKeyPem {
  const spki = new asn1X509.SubjectPublicKeyInfo({
    algorithm: new asn1X509.AlgorithmIdentifier({
      algorithm: x509.idEd25519,
    }),
    subjectPublicKey: publicKey,
  });
  const data = utils.bufferWrap(asn1.AsnSerializer.serialize(spki));
  return `-----BEGIN PUBLIC KEY-----\n${data.toString(
    'base64',
  )}\n-----END PUBLIC KEY-----\n` as PublicKeyPem;
}

function publicKeyFromPem(publicKeyPem: PublicKeyPem): PublicKey | undefined {
  const match = publicKeyPem.match(
    /-----BEGIN PUBLIC KEY-----\n([A-Za-z0-9+/=]+)\n-----END PUBLIC KEY-----\n/,
  );
  if (match == null) {
    return undefined;
  }
  const data = Buffer.from(match[1], 'base64');
  const spki = asn1.AsnConvert.parse(data, asn1X509.SubjectPublicKeyInfo);
  const publicKey = utils.bufferWrap(spki.subjectPublicKey) as PublicKey;
  if (!validatePublicKey(publicKey)) {
    return;
  }
  return publicKey;
}

function privateKeyToPem(privateKey: PrivateKey): PrivateKeyPem {
  const pkcs8 = new asn1Pkcs8.PrivateKeyInfo({
    privateKeyAlgorithm: new asn1X509.AlgorithmIdentifier({
      algorithm: x509.idEd25519,
    }),
    privateKey: new asn1Pkcs8.PrivateKey(
      new asn1.OctetString(privateKey).toASN().toBER(),
    ),
  });
  const data = utils.bufferWrap(asn1.AsnSerializer.serialize(pkcs8));
  return `-----BEGIN PRIVATE KEY-----\n${data.toString(
    'base64',
  )}\n-----END PRIVATE KEY-----\n` as PrivateKeyPem;
}

function privateKeyFromPem(
  privateKeyPem: PrivateKeyPem,
): PrivateKey | undefined {
  const match = privateKeyPem.match(
    /-----BEGIN PRIVATE KEY-----\n([A-Za-z0-9+/=]+)\n-----END PRIVATE KEY-----\n/,
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
  const privateKey = utils.bufferWrap(privateKeyAsn.buffer) as PrivateKey;
  if (privateKey.byteLength !== 32) {
    return;
  }
  return privateKey;
}

function keyPairToPem(keyPair: {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}): KeyPairPem {
  return {
    publicKey: publicKeyToPem(keyPair.publicKey),
    privateKey: privateKeyToPem(keyPair.privateKey),
  };
}

function keyPairFromPem(keyPair: KeyPairPem): KeyPair | undefined {
  const publicKey = publicKeyFromPem(keyPair.publicKey);
  const privateKey = privateKeyFromPem(keyPair.privateKey);
  if (publicKey == null || privateKey == null) {
    return undefined;
  }
  const secretKey = Buffer.concat([privateKey, publicKey]);
  return {
    publicKey,
    privateKey,
    secretKey,
  } as KeyPair;
}

function certToPem(cert: Certificate): CertificatePem {
  return cert.toString('pem') as CertificatePem;
}

function certFromPem(certPem: CertificatePem): Certificate {
  return new x509.X509Certificate(certPem);
}

export {
  publicKeyToPem,
  publicKeyFromPem,
  privateKeyToPem,
  privateKeyFromPem,
  keyPairToPem,
  keyPairFromPem,
  certToPem,
  certFromPem,
};
