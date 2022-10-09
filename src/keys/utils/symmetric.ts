import type { Key, JWK, JWKEncrypted, PasswordSalt } from '../types';
import sodium from 'sodium-native';
import { getRandomBytes } from './random';
import { passwordOpsLimit, passwordMemLimit, hashPassword } from './password';

const nonceSize = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
const macSize = sodium.crypto_aead_xchacha20poly1305_ietf_ABYTES;

/**
 * Symmetric encryption using XChaCha20-Poly1305-IETF.
 * The key is expected to be 256 bits in size.
 * The nonce is randomly generated.
 * The resulting cipher text will be have the following format:
 * `nonce || mac || cipherText`
 * This is an authenticated form of encryption.
 * The mac provides integrity and authenticity.
 */
function encryptWithKey(
  key: Key,
  plainText: Buffer,
  additionalData: Buffer | null = null,
): Buffer {
  const nonce = getRandomBytes(nonceSize);
  const macAndCipherText = Buffer.allocUnsafe(macSize + plainText.byteLength);
  sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    macAndCipherText,
    plainText,
    additionalData,
    null,
    nonce,
    key,
  );
  return Buffer.concat([nonce, macAndCipherText]);
}

/**
 * Symmetric decryption using XChaCha20-Poly1305-IETF.
 * The key is expected to be 256 bits in size.
 * The nonce extracted from the cipher text.
 * It is expected that the cipher text will have the following format:
 * `nonce || mac || cipherText`
 * This is an authenticated form of decryption.
 * The mac provides integrity and authenticity.
 */
function decryptWithKey(
  key: Key,
  cipherText: Buffer,
  additionalData: Buffer | null = null,
): Buffer | undefined {
  if (cipherText.byteLength < nonceSize + macSize) {
    return;
  }
  const nonce = cipherText.subarray(0, nonceSize);
  const macAndCipherText = cipherText.subarray(nonceSize);
  const plainText = Buffer.allocUnsafe(macAndCipherText.byteLength - macSize);
  // This returns the number of bytes that has been decrypted
  const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    plainText,
    null,
    macAndCipherText,
    additionalData,
    nonce,
    key,
  );
  if (decrypted !== plainText.byteLength) {
    return;
  }
  return plainText;
}

/**
 * Key wrapping with password.
 * This uses `Argon2Id-1.3` to derive a 256-bit key from the password.
 * The key is then used for encryption with `XChaCha20-Poly1305-IETF`.
 * The password can be an empty string.
 */
function wrapWithPassword(password: string, keyJWK: JWK): JWKEncrypted {
  const [key, salt] = hashPassword(password);
  const protectedHeader = {
    alg: 'Argon2id-1.3',
    enc: 'XChaCha20-Poly1305-IETF',
    cty: 'jwk+json',
    ops: passwordOpsLimit,
    mem: passwordMemLimit,
    salt: salt.toString('base64url'),
  };
  const protectedHeaderEncoded = Buffer.from(
    JSON.stringify(protectedHeader),
    'utf-8',
  ).toString('base64url');
  const plainText = Buffer.from(JSON.stringify(keyJWK), 'utf-8');
  const additionalData = Buffer.from(protectedHeaderEncoded, 'utf-8');
  const nonce = getRandomBytes(nonceSize);
  const mac = Buffer.allocUnsafe(macSize);
  const cipherText = Buffer.allocUnsafe(plainText.byteLength);
  sodium.crypto_aead_xchacha20poly1305_ietf_encrypt_detached(
    cipherText,
    mac,
    plainText,
    additionalData,
    null,
    nonce,
    key,
  );
  const keyJWE = {
    ciphertext: cipherText.toString('base64url'),
    iv: nonce.toString('base64url'),
    tag: mac.toString('base64url'),
    protected: protectedHeaderEncoded,
  };
  return keyJWE;
}

/**
 * Key unwrapping with password.
 * The password can be an empty string.
 */
function unwrapWithPassword(password: string, keyJWE: any): JWK | undefined {
  if (typeof keyJWE !== 'object' || keyJWE == null) {
    return;
  }
  if (
    typeof keyJWE.protected !== 'string' ||
    typeof keyJWE.iv !== 'string' ||
    typeof keyJWE.ciphertext !== 'string' ||
    typeof keyJWE.tag !== 'string'
  ) {
    return;
  }
  let header;
  try {
    header = JSON.parse(
      Buffer.from(keyJWE.protected, 'base64url').toString('utf-8'),
    );
  } catch {
    return;
  }
  if (
    typeof header !== 'object' ||
    header == null ||
    header.alg !== 'Argon2id-1.3' ||
    header.enc !== 'XChaCha20-Poly1305-IETF' ||
    header.cty !== 'jwk+json' ||
    typeof header.ops !== 'number' ||
    typeof header.mem !== 'number' ||
    typeof header.salt !== 'string'
  ) {
    return;
  }
  // If the ops and mem setting is greater than the limit
  // then it may be maliciously trying to DOS this agent
  if (header.ops > passwordOpsLimit || header.mem > passwordMemLimit) {
    return;
  }
  const salt = Buffer.from(header.salt, 'base64url') as PasswordSalt;
  const [key] = hashPassword(password, salt);
  const additionalData = Buffer.from(keyJWE.protected, 'utf-8');
  const nonce = Buffer.from(keyJWE.iv, 'base64url');
  const mac = Buffer.from(keyJWE.tag, 'base64url');
  const cipherText = Buffer.from(keyJWE.ciphertext, 'base64url');
  const plainText = Buffer.allocUnsafe(cipherText.byteLength);
  try {
    // This returns `undefined`
    // It will throw if the MAC cannot be authenticated
    sodium.crypto_aead_xchacha20poly1305_ietf_decrypt_detached(
      plainText,
      null,
      cipherText,
      mac,
      additionalData,
      nonce,
      key,
    );
  } catch {
    return;
  }
  let keyJWK;
  try {
    keyJWK = JSON.parse(plainText.toString('utf-8'));
  } catch {
    return;
  }
  if (typeof keyJWK !== 'object' || keyJWK == null) {
    return;
  }
  return keyJWK;
}

function wrapWithKey(key: Key, keyJWK: JWK): JWKEncrypted {
  const protectedHeader = {
    alg: 'dir',
    enc: 'XChaCha20-Poly1305-IETF',
    cty: 'jwk+json',
  };
  const protectedHeaderEncoded = Buffer.from(
    JSON.stringify(protectedHeader),
    'utf-8',
  ).toString('base64url');
  const plainText = Buffer.from(JSON.stringify(keyJWK), 'utf-8');
  const additionalData = Buffer.from(protectedHeaderEncoded, 'utf-8');
  const nonce = getRandomBytes(nonceSize);
  const mac = Buffer.allocUnsafe(macSize);
  const cipherText = Buffer.allocUnsafe(plainText.byteLength);
  sodium.crypto_aead_xchacha20poly1305_ietf_encrypt_detached(
    cipherText,
    mac,
    plainText,
    additionalData,
    null,
    nonce,
    key,
  );
  const keyJWE = {
    ciphertext: cipherText.toString('base64url'),
    iv: nonce.toString('base64url'),
    tag: mac.toString('base64url'),
    protected: protectedHeaderEncoded,
  };
  return keyJWE;
}

function unwrapWithKey(key: Key, keyJWE: any): JWK | undefined {
  if (typeof keyJWE !== 'object' || keyJWE == null) {
    return;
  }
  if (
    typeof keyJWE.protected !== 'string' ||
    typeof keyJWE.iv !== 'string' ||
    typeof keyJWE.ciphertext !== 'string' ||
    typeof keyJWE.tag !== 'string'
  ) {
    return;
  }
  let header;
  try {
    header = JSON.parse(
      Buffer.from(keyJWE.protected, 'base64url').toString('utf-8'),
    );
  } catch {
    return;
  }
  if (
    typeof header !== 'object' ||
    header == null ||
    header.alg !== 'dir' ||
    header.enc !== 'XChaCha20-Poly1305-IETF' ||
    header.cty !== 'jwk+json'
  ) {
    return;
  }
  const additionalData = Buffer.from(keyJWE.protected, 'utf-8');
  const nonce = Buffer.from(keyJWE.iv, 'base64url');
  const mac = Buffer.from(keyJWE.tag, 'base64url');
  const cipherText = Buffer.from(keyJWE.ciphertext, 'base64url');
  const plainText = Buffer.allocUnsafe(cipherText.byteLength);
  try {
    // This returns `undefined`
    // It will throw if the MAC cannot be authenticated
    sodium.crypto_aead_xchacha20poly1305_ietf_decrypt_detached(
      plainText,
      null,
      cipherText,
      mac,
      additionalData,
      nonce,
      key,
    );
  } catch {
    return;
  }
  let keyJWK;
  try {
    keyJWK = JSON.parse(plainText.toString('utf-8'));
  } catch {
    return;
  }
  if (typeof keyJWK !== 'object' || keyJWK == null) {
    return;
  }
  return keyJWK;
}

export {
  nonceSize,
  macSize,
  encryptWithKey,
  decryptWithKey,
  wrapWithPassword,
  unwrapWithPassword,
  wrapWithKey,
  unwrapWithKey,
};
