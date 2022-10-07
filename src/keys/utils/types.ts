import type * as jose from 'jose';
import type { X509Certificate } from '@peculiar/x509';
import type { NodeId } from '../../ids/types';
import type { Opaque } from '../../types';

/**
 * Symmetric Key Buffer
 */
type Key = Opaque<'Key', Buffer>;

/**
 * Symmetric Key JWK
 */
type KeyJWK = {
  alg: 'A256GCM';
  kty: 'oct';
  k: string;
  ext?: true;
  key_ops: ['encrypt', 'decrypt', ...any] | ['decrypt', 'encrypt', ...any];
};

/**
 * Public Key Buffer
 */
type PublicKey = Opaque<'PublicKey', Buffer>;

/**
 * Private Key Buffer
 */
type PrivateKey = Opaque<'PrivateKey', Buffer>;

/**
 * KeyPair Buffers
 */
type KeyPair = {
  publicKey: PublicKey;
  privateKey: PrivateKey;
};

/**
 * Public Key JWK
 */
type PublicKeyJWK = {
  alg: 'EdDSA';
  kty: 'OKP';
  crv: 'Ed25519';
  x: string; // Public key encoded as base64url
  ext?: true;
  key_ops: ['verify', ...any];
};

/**
 * Private Key JWK
 */
type PrivateKeyJWK = {
  alg: 'EdDSA';
  kty: 'OKP';
  crv: 'Ed25519';
  x: string; // Public key encoded as base64url
  d: string; // Private key encoded as base64url
  ext?: true;
  key_ops: ['verify', 'sign', ...any] | ['sign' | 'verify', ...any];
};

/**
 * KeyPair JWK
 */
type KeyPairJWK = {
  publicKey: PublicKeyJWK;
  privateKey: PrivateKeyJWK;
};

/**
 * Public Key SPKI PEM
 */
type PublicKeyPem = Opaque<'PublicKeyPem', string>;

/**
 * Private Key PKCS8 PEM
 */
type PrivateKeyPem = Opaque<'PrivateKeyPem', string>;

/**
 * KeyPair PEMs
 */
type KeyPairPem = {
  publicKey: PublicKeyPem;
  privateKey: PrivateKeyPem;
};

/**
 * Certificate is an X.509 certificate.
 * Upstream `X509Certificate` properties can be mutated,
 * but they do not affect any of the methods on the object.
 * Here we enforce `Readonly` to prevent accidental mutation.
 */
type Certificate = Readonly<X509Certificate>;

/**
 * Certificate PEM
 */
type CertificatePem = Opaque<'CertificatePem', string>;

/**
 * Certificate PEM Chain.
 * The order is from leaf to root.
 */
type CertificatePemChain = Opaque<'CertificatePemChain', string>;

/**
 * BIP39 Recovery Code
 * Can be 12 or 24 words
 */
type RecoveryCode = Opaque<'RecoveryCode', string>;

/**
 * Generic JWK
 */
type JWK = jose.JWK;

/**
 * Generic Flattened JWE
 */
type JWEFlattened = jose.FlattenedJWE;

type KeyManagerChangeData = {
  nodeId: NodeId;
  rootKeyPair: KeyPair;
  rootCert: Certificate;
  recoveryCode?: RecoveryCode;
};

export type {
  Key,
  KeyJWK,
  PublicKey,
  PrivateKey,
  KeyPair,
  PublicKeyJWK,
  PrivateKeyJWK,
  KeyPairJWK,
  PublicKeyPem,
  PrivateKeyPem,
  KeyPairPem,
  Certificate,
  CertificatePem,
  CertificatePemChain,
  JWK,
  JWEFlattened,
  RecoveryCode,
  KeyManagerChangeData,
};

export type {
  CertificateId,
  CertificateIdString,
  CertificateIdEncoded,
} from '../../ids/types';
