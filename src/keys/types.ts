import type { asn1, pki } from 'node-forge';
import type { Opaque } from '../types';
import type {
  CertificateId,
  CertificateIdString,
  CertificateIdEncoded,
  NodeId,
} from '../ids/types';

type PublicKey = pki.rsa.PublicKey;
type PrivateKey = pki.rsa.PrivateKey;
type PublicKeyAsn1 = asn1.Asn1;
type PrivateKeyAsn1 = asn1.Asn1;
type PublicKeyPem = string;
type PrivateKeyPem = string;
type PublicKeyFingerprintBytes = string;
type PublicKeyFingerprint = string;
type KeyPair = pki.rsa.KeyPair;
type KeyPairAsn1 = {
  publicKey: PublicKeyAsn1;
  privateKey: PrivateKeyAsn1;
};
type KeyPairPem = {
  publicKey: PublicKeyPem;
  privateKey: PrivateKeyPem;
};
type Certificate = pki.Certificate;
type CertificateAsn1 = asn1.Asn1;
type CertificatePem = string;
type CertificatePemChain = string;
type RecoveryCode = Opaque<'RecoveryCode', string>;

type KeyManagerChangeData = {
  nodeId: NodeId;
  rootKeyPair: KeyPair;
  rootCert: Certificate;
  recoveryCode?: RecoveryCode;
};

export type {
  CertificateId,
  CertificateIdString,
  CertificateIdEncoded,
  PublicKey,
  PrivateKey,
  PublicKeyAsn1,
  PrivateKeyAsn1,
  PublicKeyPem,
  PrivateKeyPem,
  PublicKeyFingerprintBytes,
  PublicKeyFingerprint,
  KeyPair,
  KeyPairAsn1,
  KeyPairPem,
  Certificate,
  CertificateAsn1,
  CertificatePem,
  CertificatePemChain,
  RecoveryCode,
  KeyManagerChangeData,
};
