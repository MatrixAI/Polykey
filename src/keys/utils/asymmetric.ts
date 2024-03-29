import type {
  PublicKey,
  PrivateKey,
  KeyPair,
  PublicKeyX,
  PrivateKeyX,
  KeyPairX,
  Signature,
  JWK,
  JWKEncrypted,
} from '../types';
import type { NodeId } from '../../ids/types';
import sodium from 'sodium-native';
import canonicalize from 'canonicalize';
import { IdInternal } from '@matrixai/id';
import { getRandomBytes } from './random';
import * as validationErrors from '../../validation/errors';
import * as utils from '../../utils';

/**
 * Use this to make a key pair if you only have public key and private key
 * The returned secret key is guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function makeKeyPair(publicKey: PublicKey, privateKey: PrivateKey): KeyPair {
  // This ensures `secretKey.buffer` is not using the shared internal pool
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

function publicKeyFromData(data: BufferSource): PublicKey | undefined {
  const publicKey = utils.bufferWrap(data);
  if (publicKey.byteLength !== sodium.crypto_sign_PUBLICKEYBYTES) {
    return;
  }
  if (!validatePublicKey(publicKey as PublicKey)) {
    return;
  }
  return publicKey as PublicKey;
}

function privateKeyFromData(data: BufferSource): PrivateKey | undefined {
  const privateKey = utils.bufferWrap(data);
  if (privateKey.byteLength !== sodium.crypto_sign_SEEDBYTES) {
    return;
  }
  return privateKey as PrivateKey;
}

/**
 * Copies PublicKey to NodeId.
 * This copies to prevent mutations like
 * `bufferUnlock` from affecting the output.
 */
function publicKeyToNodeId(publicKey: PublicKey): NodeId {
  return IdInternal.create<NodeId>(publicKey);
}

/**
 * Copies NodeId to PublicKey
 * This copies to prevent mutations like
 * `bufferUnlock` from affecting the input.
 */
function publicKeyFromNodeId(nodeId: NodeId): PublicKey {
  return Buffer.from(nodeId) as PublicKey;
}

/**
 * Extracts Ed25519 Public Key from Ed25519 Private Key
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function publicKeyFromPrivateKeyEd25519(privateKey: PrivateKey): PublicKey {
  const publicKey = Buffer.allocUnsafeSlow(sodium.crypto_sign_PUBLICKEYBYTES);
  sodium.crypto_sign_seed_keypair(
    publicKey,
    Buffer.allocUnsafe(sodium.crypto_sign_SECRETKEYBYTES),
    privateKey,
  );
  return publicKey as PublicKey;
}

/**
 * Extracts X25519 Public Key from X25519 Private Key
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function publicKeyFromPrivateKeyX25519(privateKey: PrivateKeyX): PublicKeyX {
  const publicKey = Buffer.allocUnsafeSlow(sodium.crypto_box_PUBLICKEYBYTES);
  sodium.crypto_box_seed_keypair(
    publicKey,
    Buffer.allocUnsafe(sodium.crypto_box_SECRETKEYBYTES),
    privateKey,
  );
  return publicKey as PublicKeyX;
}

/**
 * Maps Ed25519 public key to X25519 public key
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function publicKeyEd25519ToX25519(publicKey: PublicKey): PublicKeyX {
  const publicKeyX25519 = Buffer.allocUnsafeSlow(
    sodium.crypto_box_PUBLICKEYBYTES,
  );
  sodium.crypto_sign_ed25519_pk_to_curve25519(publicKeyX25519, publicKey);
  return publicKeyX25519 as PublicKeyX;
}

/**
 * Maps Ed25519 private key to X25519 private key
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function privateKeyEd25519ToX25519(privateKey: PrivateKey): PrivateKeyX {
  const publicKey = publicKeyFromPrivateKeyEd25519(privateKey);
  const secretKeyEd25519 = Buffer.concat([privateKey, publicKey]);
  const privateKeyX25519 = Buffer.allocUnsafeSlow(
    sodium.crypto_box_SECRETKEYBYTES,
  );
  sodium.crypto_sign_ed25519_sk_to_curve25519(
    privateKeyX25519,
    secretKeyEd25519,
  );
  return privateKeyX25519 as PrivateKeyX;
}

/**
 * Maps Ed25519 keypair to X25519 keypair
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function keyPairEd25519ToX25519(keyPair: KeyPair): KeyPairX {
  const publicKeyX25519 = publicKeyEd25519ToX25519(keyPair.publicKey);
  const privateKeyX25519 = Buffer.allocUnsafeSlow(
    sodium.crypto_box_SECRETKEYBYTES,
  );
  sodium.crypto_sign_ed25519_sk_to_curve25519(
    privateKeyX25519,
    keyPair.secretKey,
  );
  return {
    publicKey: publicKeyX25519,
    privateKey: privateKeyX25519,
  } as KeyPairX;
}

/**
 * Asymmetric public key encryption also known as ECIES.
 * The sender key pair will be randomly generated if not supplied.
 * If it is randomly generated, then we are using an ephemeral sender.
 *
 * Using a static sender key pair means there is no forward secrecy.
 * If the private key of the sender or receiver is compromised, all messages
 * are compromised.
 *
 * Using an ephemeral sender key pair provides 1-way forward secrecy.
 * Only if the private key of the receiver is compromised, all messages
 * are compromised.
 *
 * Using both ephemeral sender and receiver maintains forward secrecy.
 * However this requires live negotiation between the sender and receiver.
 *
 * This supports:
 *   - ECDH-ES - ephemeral sender, static receiver
 *   - ECDH-SS - static sender, static receiver
 *
 * The static receiver could be ephemeral, but that depends on where you get
 * the sender key pair.
 *
 * More information: https://crypto.stackexchange.com/a/61760/102416
 *
 * Under ECDH-SS, the result will have the following format:
 * `iv<24> || mac<16> || cipherText`
 * Note that the sender public key is not attached in the result.
 * You can do that if you want to.
 *
 * Under ECDH-ES, the result will have the following format:
 * `publicKeyX<32> || mac<16> || cipherText`
 * Where `publicKeyX` is the X25519 public key.
 *
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function encryptWithPublicKey(
  receiverPublicKey: PublicKey,
  plainText: Buffer,
  senderKeyPair?: KeyPair,
): Buffer {
  const recieverPublicKeyX25519 = publicKeyEd25519ToX25519(receiverPublicKey);
  // 24 bytes of nonce
  if (senderKeyPair != null) {
    // ECDH-SS and ECDH-SE
    const senderKeyPairX25519 = keyPairEd25519ToX25519(senderKeyPair);
    const nonce = getRandomBytes(sodium.crypto_box_NONCEBYTES);
    const macAndCipherText = Buffer.allocUnsafe(
      sodium.crypto_box_MACBYTES + plainText.byteLength,
    );
    sodium.crypto_box_easy(
      macAndCipherText,
      plainText,
      nonce,
      recieverPublicKeyX25519,
      senderKeyPairX25519.privateKey,
    );
    const result = Buffer.allocUnsafeSlow(
      nonce.byteLength + macAndCipherText.byteLength,
    );
    nonce.copy(result);
    macAndCipherText.copy(result, nonce.byteLength);
    // Note that no public key is concatenated here
    // If it needs to be done, you must do it yourself
    return result;
  } else {
    // ECDH-ES and ECDH-EE
    // This does not require a nonce
    // The nonce is automatically calculated based on the ephemeral public key
    // The SEALBYTES is 48 bytes
    // The first 32 bytes are the ephemeral public key
    // The next 16 bytes is used by the MAC
    const publicKeyAndMacAndCipherText = Buffer.allocUnsafeSlow(
      sodium.crypto_box_SEALBYTES + plainText.byteLength,
    );
    sodium.crypto_box_seal(
      publicKeyAndMacAndCipherText,
      plainText,
      recieverPublicKeyX25519,
    );
    return publicKeyAndMacAndCipherText;
  }
}

/**
 * Asymmetric public key decryption also known as ECIES.
 *
 * Under ECDH-SS, the cipher text should have the following format:
 * `iv<24> || cipherText || mac<16>`
 *
 * Under ECDH-ES and ECDH-EE, the cipher text should have the following format:
 * `publicKey<32> || cihperText || mac<16>`
 *
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function decryptWithPrivateKey(
  receiverKeyPair: KeyPair,
  cipherText: Buffer,
  senderPublicKey?: PublicKey,
): Buffer | undefined {
  const receiverKeyPairX25519 = keyPairEd25519ToX25519(receiverKeyPair);
  if (senderPublicKey != null) {
    // You know where this message is from
    if (
      cipherText.byteLength <
      sodium.crypto_box_NONCEBYTES + sodium.crypto_box_MACBYTES
    ) {
      return;
    }
    const senderPublicKeyX25519 = publicKeyEd25519ToX25519(senderPublicKey);
    const nonce = cipherText.slice(0, sodium.crypto_box_NONCEBYTES);
    const cipherTextAndMac = cipherText.slice(sodium.crypto_box_NONCEBYTES);
    const plainText = Buffer.allocUnsafeSlow(
      cipherTextAndMac.byteLength - sodium.crypto_box_MACBYTES,
    );
    const decrypted = sodium.crypto_box_open_easy(
      plainText,
      cipherTextAndMac,
      nonce,
      senderPublicKeyX25519,
      receiverKeyPairX25519.privateKey,
    );
    if (!decrypted) {
      return;
    }
    return plainText;
  } else {
    if (cipherText.byteLength < sodium.crypto_box_SEALBYTES) {
      return;
    }
    // ES style, you don't know who it was from
    // you can still do sign-then-encrypt though
    const plainText = Buffer.allocUnsafeSlow(
      cipherText.byteLength - sodium.crypto_box_SEALBYTES,
    );
    const decrypted = sodium.crypto_box_seal_open(
      plainText,
      cipherText,
      receiverKeyPairX25519.publicKey,
      receiverKeyPairX25519.privateKey,
    );
    if (!decrypted) {
      return;
    }
    return plainText;
  }
}

/**
 * Sign with private key.
 * This returns a signature buffer.
 *
 * The returned buffers are guaranteed to unpooled.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function signWithPrivateKey(
  privateKeyOrKeyPair: PrivateKey | KeyPair,
  data: Buffer,
): Signature {
  const signature = Buffer.allocUnsafeSlow(sodium.crypto_sign_BYTES);
  let secretKey;
  if (Buffer.isBuffer(privateKeyOrKeyPair)) {
    const publicKey = publicKeyFromPrivateKeyEd25519(privateKeyOrKeyPair);
    secretKey = Buffer.concat([privateKeyOrKeyPair, publicKey]);
  } else {
    secretKey = privateKeyOrKeyPair.secretKey;
  }
  sodium.crypto_sign_detached(signature, data, secretKey);
  return signature as Signature;
}

/**
 * Verifies signature with public key
 */
function verifyWithPublicKey(
  publicKey: PublicKey,
  data: Buffer,
  signature: Buffer,
): boolean {
  if (signature.byteLength !== sodium.crypto_sign_BYTES) return false;
  return sodium.crypto_sign_verify_detached(signature, data, publicKey);
}

/**
 * Checks if data is a signature
 */
function isSignature(signature: unknown): signature is Signature {
  return (
    Buffer.isBuffer(signature) &&
    signature.byteLength === sodium.crypto_sign_BYTES
  );
}

/**
 * Key Encapsulation Mechanism (KEM).
 * This encapsulates a JWK with a public key and produces a custom JWE.
 * This applies the ECIES protocol in `encryptWithPublicKey` from libsodium to JWE.
 * This JWE uses custom header properties.
 *
 * For ECDH-SS:
 *   - alg: "ECDH-SS-NaCl"
 *   - enc: "XSalsa20-Poly1305"
 *
 * For ECDH-ES:
 *   - alg: "ECDH-ES-NaCl"
 *   - enc: "XSalsa20-Poly1305"
 */
function encapsulateWithPublicKey(
  receiverPublicKey: PublicKey,
  keyJWK: JWK,
  senderKeyPair?: KeyPair,
): JWKEncrypted {
  const recieverPublicKeyX25519 = publicKeyEd25519ToX25519(receiverPublicKey);
  if (senderKeyPair != null) {
    // ECDH-SS and ECDH-SE
    const senderKeyPairX25519 = keyPairEd25519ToX25519(senderKeyPair);
    // This assumes nonce here is used for both generating shared secret
    // and for the symmetric encryption
    // But is this true?
    // in JWE the nonce/iv is supposed to be used by the `enc` algorithm
    // Which does in fact require a nonce, are they re-using the same nonce somehow?
    const nonce = getRandomBytes(sodium.crypto_box_NONCEBYTES);
    const mac = Buffer.allocUnsafe(sodium.crypto_box_MACBYTES);
    const plainText = Buffer.from(canonicalize(keyJWK)!, 'utf-8');
    const cipherText = Buffer.allocUnsafe(plainText.byteLength);
    sodium.crypto_box_detached(
      cipherText,
      mac,
      plainText,
      nonce,
      recieverPublicKeyX25519,
      senderKeyPairX25519.privateKey,
    );
    // Normally in JOSE, the protected header contents is base64url encoded then
    // passed along as the AAD when computing the auth tag during symmetric encryption.
    // This means if the header was tampered with, the AEAD decryption will fail.
    // Note that there is no integrity check of the protected header.
    // However there is no AAD in libsodium's PKAE/ECIES https://crypto.stackexchange.com/q/29311/102416
    // This means the header cannot be used to authenticate the message.
    // This is not a big problem, because the header is public information used to aid
    // the decryption process. Even if the header is tampered with, we still have
    // authenticated encryption with the mac that was computed.
    // All we lose here is the ability to "trust" that the header wasn't tampered with.
    // But this is not relevant to the use case of key encapsulation.
    // So in this situation, we use JWE's shared unprotected header property instead.
    // However this prevents us from ever using compact serialization, which only supports
    // protected headers.
    const sharedUnprotectedHeader = {
      alg: 'ECDH-SS-NaCl' as const,
      enc: 'XSalsa20-Poly1305' as const,
      cty: 'jwk+json' as const,
    };
    const keyJWE = {
      ciphertext: cipherText.toString('base64url'),
      iv: nonce.toString('base64url'),
      tag: mac.toString('base64url'),
      unprotected: sharedUnprotectedHeader,
    };
    return keyJWE;
  } else {
    // ECDH-ES and ECDH-EE
    const plainText = Buffer.from(canonicalize(keyJWK)!, 'utf-8');
    const publicKeyAndMacAndCipherText = Buffer.allocUnsafe(
      sodium.crypto_box_SEALBYTES + plainText.byteLength,
    );
    // Libsodium does not have a detached variant of sealed boxes
    // Here we have to extract out of the resulting buffer
    sodium.crypto_box_seal(
      publicKeyAndMacAndCipherText,
      plainText,
      recieverPublicKeyX25519,
    );
    const senderPublicKeyX25519 = publicKeyAndMacAndCipherText.slice(
      0,
      sodium.crypto_box_PUBLICKEYBYTES,
    ) as PublicKeyX;
    const mac = publicKeyAndMacAndCipherText.slice(
      sodium.crypto_box_PUBLICKEYBYTES,
      sodium.crypto_box_PUBLICKEYBYTES + sodium.crypto_box_MACBYTES,
    );
    const cipherText = publicKeyAndMacAndCipherText.slice(
      sodium.crypto_box_PUBLICKEYBYTES + sodium.crypto_box_MACBYTES,
    );
    const sharedUnprotectedHeader = {
      alg: 'ECDH-ES-NaCl' as const,
      enc: 'XSalsa20-Poly1305' as const,
      cty: 'jwk+json' as const,
      epk: {
        kty: 'OKP' as const,
        crv: 'X25519' as const,
        x: senderPublicKeyX25519.toString('base64url'),
      },
    };
    const keyJWE = {
      ciphertext: cipherText.toString('base64url'),
      tag: mac.toString('base64url'),
      unprotected: sharedUnprotectedHeader,
    };
    return keyJWE;
  }
}

/**
 * Key Decapsulation Mechanism.
 * This decapsulates a JWE with a private key and produces a JWK.
 * This uses the same ECIES scheme as `decryptWithPrivateKey`.
 */
function decapsulateWithPrivateKey(
  receiverKeyPair: KeyPair,
  keyJWE: any,
  senderPublicKey?: PublicKey,
): JWK | undefined {
  if (typeof keyJWE !== 'object' || keyJWE == null) {
    return;
  }
  if (
    typeof keyJWE.unprotected !== 'object' ||
    keyJWE.unprotected == null ||
    typeof keyJWE.ciphertext !== 'string' ||
    typeof keyJWE.tag !== 'string'
  ) {
    return;
  }
  const header = keyJWE.unprotected;
  if (header.enc !== 'XSalsa20-Poly1305' || header.cty !== 'jwk+json') {
    return;
  }
  const receiverKeyPairX25519 = keyPairEd25519ToX25519(receiverKeyPair);
  let plainText;
  if (senderPublicKey != null) {
    if (header.alg !== 'ECDH-SS-NaCl') {
      return;
    }
    if (keyJWE.iv == null) {
      return;
    }
    const senderPublicKeyX25519 = publicKeyEd25519ToX25519(senderPublicKey);
    const cipherText = Buffer.from(keyJWE.ciphertext, 'base64url');
    plainText = Buffer.allocUnsafe(cipherText.byteLength);
    const mac = Buffer.from(keyJWE.tag, 'base64url');
    const nonce = Buffer.from(keyJWE.iv, 'base64url');
    const decrypted = sodium.crypto_box_open_detached(
      plainText,
      cipherText,
      mac,
      nonce,
      senderPublicKeyX25519,
      receiverKeyPairX25519.privateKey,
    );
    if (!decrypted) {
      return;
    }
  } else {
    if (
      header.alg !== 'ECDH-ES-NaCl' ||
      typeof header.epk !== 'object' ||
      header.epk == null
    ) {
      return;
    }
    const senderPublicJWK = header.epk as any;
    if (
      senderPublicJWK.kty !== 'OKP' ||
      senderPublicJWK.crv !== 'X25519' ||
      typeof senderPublicJWK.x !== 'string'
    ) {
      return;
    }
    const senderPublicKeyX25519 = Buffer.from(senderPublicJWK.x, 'base64url');
    const mac = Buffer.from(keyJWE.tag, 'base64url');
    const cipherText = Buffer.from(keyJWE.ciphertext, 'base64url');
    plainText = Buffer.allocUnsafe(cipherText.byteLength);
    const publicKeyAndMacAndCipherText = Buffer.concat([
      senderPublicKeyX25519,
      mac,
      cipherText,
    ]);
    const decrypted = sodium.crypto_box_seal_open(
      plainText,
      publicKeyAndMacAndCipherText,
      receiverKeyPairX25519.publicKey,
      receiverKeyPairX25519.privateKey,
    );
    if (!decrypted) {
      return;
    }
  }
  let keyJWK;
  try {
    keyJWK = JSON.parse(plainText.toString('utf-8'));
  } catch {
    return;
  }
  return keyJWK;
}

/**
 * Checks if the public key is a point on the Ed25519 curve
 */
function validatePublicKey(publicKey: Buffer): publicKey is PublicKey {
  if (publicKey.byteLength !== sodium.crypto_sign_PUBLICKEYBYTES) {
    return false;
  }
  return sodium.crypto_core_ed25519_is_valid_point(publicKey);
}

/**
 * Parses buffer source into a public key
 */
function parsePublicKey(data: any): PublicKey {
  if (!utils.isBufferSource(data)) {
    throw new validationErrors.ErrorParse('Public key must be a BufferSource');
  }
  const publicKey = publicKeyFromData(data);
  if (publicKey == null) {
    throw new validationErrors.ErrorParse(
      'Public key is not a valid Ed25519 public key',
    );
  }
  return publicKey;
}

/**
 * Parses buffer source into a private key
 */
function parsePrivateKey(data: any): PrivateKey {
  if (!utils.isBufferSource(data)) {
    throw new validationErrors.ErrorParse('Private key must be a BufferSource');
  }
  const privateKey = privateKeyFromData(data);
  if (privateKey == null) {
    throw new validationErrors.ErrorParse(
      'Private key is not a valid Ed25519 private key',
    );
  }
  return privateKey;
}

export {
  makeKeyPair,
  publicKeyFromData,
  privateKeyFromData,
  publicKeyToNodeId,
  publicKeyFromNodeId,
  publicKeyFromPrivateKeyEd25519,
  publicKeyFromPrivateKeyX25519,
  publicKeyEd25519ToX25519,
  privateKeyEd25519ToX25519,
  keyPairEd25519ToX25519,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  signWithPrivateKey,
  verifyWithPublicKey,
  isSignature,
  encapsulateWithPublicKey,
  decapsulateWithPrivateKey,
  validatePublicKey,
  parsePublicKey,
  parsePrivateKey,
};
