import type { X509Certificate } from '@peculiar/x509';
import type { NodeId } from '../ids/types';
import type { Opaque } from '../types';

/**
 * Locked buffer wrapper type for sensitive in-memory data.
 */
type BufferLocked<T extends Buffer> = T & { readonly [locked]: true };
declare const locked: unique symbol;

/**
 * Symmetric Key Buffer
 */
type Key = Opaque<'Key', Readonly<Buffer>>;

/**
 * Symmetric Key JWK
 */
type KeyJWK = {
  alg: 'XChaCha20-Poly1305-IETF';
  kty: 'oct';
  k: string;
  ext: true;
  key_ops:
    | ['encrypt', 'decrypt', ...Array<string>]
    | ['decrypt', 'encrypt', ...Array<string>];
};

/**
 * Public Key Buffer
 */
type PublicKey = Opaque<'PublicKey', Readonly<Buffer>>;

/**
 * X25519 version of the public key
 */
type PublicKeyX = Opaque<'PublicKeyX', Readonly<Buffer>>;

/**
 * Private Key Buffer
 */
type PrivateKey = Opaque<'PrivateKey', Readonly<Buffer>>;

/**
 * X25519 version of the private key
 */
type PrivateKeyX = Opaque<'PrivateKeyX', Readonly<Buffer>>;

/**
 * Secret Key Buffer.
 * This is a concatenation of `PrivateKey || PublicKey`.
 * It is used by libsodium to avoid us having to concatenate on the fly.
 */
type SecretKey = Opaque<'SecretKey', Readonly<Buffer>>;

/**
 * X25519 version of the secret key
 */
type SecretKeyX = Opaque<'SecretKeyX', Readonly<Buffer>>;

/**
 * KeyPair buffers
 */
type KeyPair = Readonly<{
  publicKey: PublicKey;
  privateKey: PrivateKey;
  secretKey: SecretKey;
}>;

/**
 * KeyPair buffers that are locked
 */
type KeyPairLocked = Readonly<{
  publicKey: BufferLocked<PublicKey>;
  privateKey: BufferLocked<PrivateKey>;
  secretKey: BufferLocked<SecretKey>;
}>;

/**
 * X25519 version of key pair
 */
type KeyPairX = Readonly<{
  publicKey: PublicKeyX;
  privateKey: PrivateKeyX;
  secretKey: SecretKeyX;
}>;

/**
 * Public Key JWK
 */
type PublicKeyJWK = {
  alg: 'EdDSA';
  kty: 'OKP';
  crv: 'Ed25519';
  x: string; // Public key encoded as base64url
  ext: true;
  key_ops: ['verify', ...Array<string>];
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
  ext: true;
  key_ops:
    | ['verify', 'sign', ...Array<string>]
    | ['sign', 'verify', ...Array<string>];
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
 * Ed25519 Signature
 * Will always be 64 bytes
 */
type Signature = Opaque<'Signature', Buffer>;

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
 * Generic JWK
 */
type JWK = JsonWebKey;

/**
 * JWK that is encrypted as a JWE
 * We only use these kinds of JWE for encryption
 */
type JWKEncrypted =
  | {
      ciphertext: string;
      tag: string;
      iv: string;
      unprotected: {
        alg: 'ECDH-SS-NaCl';
        enc: 'XSalsa20-Poly1305';
        cty: 'jwk+json';
      };
    }
  | {
      ciphertext: string;
      tag: string;
      unprotected: {
        alg: 'ECDH-ES-NaCl';
        enc: 'XSalsa20-Poly1305';
        cty: 'jwk+json';
        epk: {
          kty: 'OKP';
          crv: 'X25519';
          x: string;
        };
      };
    }
  | {
      ciphertext: string;
      tag: string;
      iv: string;
      protected: string;
    };

type PasswordHash = Opaque<'PasswordHash', Buffer>;

type PasswordSalt = Opaque<'PasswordSalt', Buffer>;

type PasswordOpsLimit = Opaque<'PasswordOpsLimit', number>;

type PasswordMemLimit = Opaque<'PasswordMemLimit', number>;

/**
 * BIP39 Recovery Code
 * Can be 12 or 24 words
 */
type RecoveryCode = Opaque<'RecoveryCode', string>;

/**
 * Recovery code in a locked buffer
 */
type RecoveryCodeLocked = Opaque<'RecoverCodeLocked', BufferLocked<Buffer>>;

/**
 * Change data for KeyRing
 */
type CertificateManagerChangeData = {
  nodeId: NodeId;
  rootKeyPair: KeyPair;
  rootCert: Certificate;
  recoveryCode?: RecoveryCode;
};

export type {
  BufferLocked,
  Key,
  KeyJWK,
  PublicKey,
  PublicKeyX,
  PrivateKey,
  PrivateKeyX,
  SecretKey,
  SecretKeyX,
  KeyPair,
  KeyPairLocked,
  KeyPairX,
  PublicKeyJWK,
  PrivateKeyJWK,
  KeyPairJWK,
  PublicKeyPem,
  PrivateKeyPem,
  KeyPairPem,
  Signature,
  Certificate,
  CertificatePem,
  CertificatePemChain,
  JWK,
  JWKEncrypted,
  PasswordHash,
  PasswordSalt,
  PasswordOpsLimit,
  PasswordMemLimit,
  RecoveryCode,
  RecoveryCodeLocked,
  CertificateManagerChangeData,
};

export type {
  CertificateId,
  CertificateIdString,
  CertificateIdEncoded,
} from '../ids/types';
