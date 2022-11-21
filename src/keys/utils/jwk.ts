import type {
  Key,
  KeyJWK,
  PublicKey,
  PrivateKey,
  KeyPair,
  PublicKeyJWK,
  PrivateKeyJWK,
  KeyPairJWK,
  JWK,
} from '../types';
import sodium from 'sodium-native';
import {
  validatePublicKey,
  publicKeyFromPrivateKeyEd25519,
} from './asymmetric';

function keyToJWK(key: Key): KeyJWK {
  return {
    alg: 'XChaCha20-Poly1305-IETF',
    kty: 'oct',
    k: key.toString('base64url'),
    ext: true,
    key_ops: ['encrypt', 'decrypt'],
  };
}

/**
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function keyFromJWK(keyJWK: JWK): Key | undefined {
  if (
    keyJWK.alg !== 'XChaCha20-Poly1305-IETF' ||
    keyJWK.kty !== 'oct' ||
    typeof keyJWK.k !== 'string'
  ) {
    return;
  }
  const data = Buffer.from(keyJWK.k, 'base64url');
  // Any random 32 bytes is a valid key
  if (data.byteLength !== sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES) {
    return;
  }
  const key = Buffer.allocUnsafeSlow(
    sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
  );
  data.copy(key);
  return key as Key;
}

function publicKeyToJWK(publicKey: PublicKey): PublicKeyJWK {
  return {
    alg: 'EdDSA',
    kty: 'OKP',
    crv: 'Ed25519',
    x: publicKey.toString('base64url'),
    ext: true,
    key_ops: ['verify'],
  };
}

/**
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function publicKeyFromJWK(publicKeyJWK: JWK): PublicKey | undefined {
  if (
    publicKeyJWK.alg !== 'EdDSA' ||
    publicKeyJWK.kty !== 'OKP' ||
    publicKeyJWK.crv !== 'Ed25519' ||
    typeof publicKeyJWK.x !== 'string'
  ) {
    return;
  }
  const data = Buffer.from(publicKeyJWK.x, 'base64url');
  if (!validatePublicKey(data)) {
    return;
  }
  const publicKey = Buffer.allocUnsafeSlow(sodium.crypto_sign_PUBLICKEYBYTES);
  data.copy(publicKey);
  return publicKey as PublicKey;
}

function privateKeyToJWK(privateKey: PrivateKey): PrivateKeyJWK {
  const publicKey = publicKeyFromPrivateKeyEd25519(privateKey);
  return {
    alg: 'EdDSA',
    kty: 'OKP',
    crv: 'Ed25519',
    x: publicKey.toString('base64url'),
    d: privateKey.toString('base64url'),
    ext: true,
    key_ops: ['verify', 'sign'],
  };
}

/**
 * Extracts private key out of JWK.
 * This checks if the public key matches the private key in the JWK.
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function privateKeyFromJWK(privateKeyJWK: JWK): PrivateKey | undefined {
  if (
    privateKeyJWK.alg !== 'EdDSA' ||
    privateKeyJWK.kty !== 'OKP' ||
    privateKeyJWK.crv !== 'Ed25519' ||
    typeof privateKeyJWK.x !== 'string' ||
    typeof privateKeyJWK.d !== 'string'
  ) {
    return;
  }
  const publicKeyData = Buffer.from(privateKeyJWK.x, 'base64url');
  const privateKeyData = Buffer.from(privateKeyJWK.d, 'base64url');
  // Any random 32 bytes is a valid private key
  if (privateKeyData.byteLength !== sodium.crypto_sign_SEEDBYTES) {
    return;
  }
  // If the public key doesn't match, then the JWK is invalid
  const publicKeyData_ = publicKeyFromPrivateKeyEd25519(
    privateKeyData as PrivateKey,
  );
  if (!publicKeyData_.equals(publicKeyData)) {
    return;
  }
  const publicKey = Buffer.allocUnsafeSlow(sodium.crypto_sign_PUBLICKEYBYTES);
  const privateKey = Buffer.allocUnsafeSlow(sodium.crypto_sign_SEEDBYTES);
  publicKeyData.copy(publicKey);
  privateKeyData.copy(privateKey);
  return privateKey as PrivateKey;
}

function keyPairToJWK(keyPair: {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}): KeyPairJWK {
  return {
    publicKey: publicKeyToJWK(keyPair.publicKey),
    privateKey: privateKeyToJWK(keyPair.privateKey),
  };
}

/**
 * The returned buffers is guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function keyPairFromJWK(keyPair: KeyPairJWK): KeyPair | undefined {
  const publicKey = publicKeyFromJWK(keyPair.publicKey);
  const privateKey = privateKeyFromJWK(keyPair.privateKey);
  if (publicKey == null || privateKey == null) {
    return;
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
  keyToJWK,
  keyFromJWK,
  publicKeyToJWK,
  publicKeyFromJWK,
  privateKeyToJWK,
  privateKeyFromJWK,
  keyPairToJWK,
  keyPairFromJWK,
};
