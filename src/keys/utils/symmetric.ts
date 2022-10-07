import type { Key, KeyJWK, JWK, JWEFlattened } from './types';
import * as jose from 'jose';
import webcrypto from './webcrypto';
import { getRandomBytesSync } from './random';
import { bufferWrap, isBufferSource } from '../../utils';

const ivSize = 16;
const authTagSize = 16;

/**
 * Imports symmetric `CryptoKey` from key buffer.
 * If `key` is already `CryptoKey`, then this just returns it.
 */
async function importKey(key: BufferSource | CryptoKey): Promise<CryptoKey> {
  if (!isBufferSource(key)) {
    return key;
  }
  return await webcrypto.subtle.importKey('raw', key, 'AES-GCM', true, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Exports symmetric `CryptoKey` to `Key`.
 * If `key` is already `Buffer`, then this just returns it.
 */
async function exportKey(key: CryptoKey | BufferSource): Promise<Key> {
  if (isBufferSource(key)) {
    return bufferWrap(key) as Key;
  }
  return bufferWrap(await webcrypto.subtle.exportKey('raw', key)) as Key;
}

async function keyToJWK(key: BufferSource | CryptoKey): Promise<KeyJWK> {
  const key_ = await exportKey(key);
  return {
    alg: 'A256GCM',
    kty: 'oct',
    k: key_.toString('base64url'),
    ext: true,
    key_ops: ['encrypt', 'decrypt'],
  };
}

async function keyFromJWK(keyJWK: JsonWebKey): Promise<Key | undefined> {
  if (
    keyJWK.alg !== 'A256GCM' ||
    keyJWK.kty !== 'oct' ||
    typeof keyJWK.k !== 'string'
  ) {
    return undefined;
  }
  const key = Buffer.from(keyJWK.k, 'base64url') as Key;
  // Any random 32 bytes is a valid key
  if (key.byteLength !== 32) {
    return undefined;
  }
  return key;
}

/**
 * Symmetric encryption using AES-GCM.
 * The key is expected to be 256 bits in size.
 * The initialisation vector is randomly generated.
 * The resulting cipher text will be have the following format:
 * `iv || data || authTag`
 * This is an authenticated form of encryption.
 * The auth tag provides integrity and authenticity.
 */
async function encryptWithKey(
  key: BufferSource | CryptoKey,
  plainText: ArrayBuffer,
): Promise<Buffer> {
  if (isBufferSource(key)) {
    key = await importKey(key);
  }
  const iv = getRandomBytesSync(ivSize);
  const data = await webcrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: authTagSize * 8,
    },
    key,
    plainText,
  );
  return Buffer.concat([iv, bufferWrap(data)]);
}

/**
 * Symmetric decryption using AES-GCM.
 * The key is expected to be 256 bits in size.
 * The initialisation vector is extracted from the cipher text.
 * It is expected that the cipher text will have the following format:
 * `iv || data || authTag`
 * This is an authenticated form of decryption.
 * The auth tag provides integrity and authenticity.
 */
async function decryptWithKey(
  key: BufferSource | CryptoKey,
  cipherText: ArrayBuffer,
): Promise<Buffer | undefined> {
  if (isBufferSource(key)) {
    key = await importKey(key);
  }
  const cipherText_ = bufferWrap(cipherText);
  if (cipherText_.byteLength < ivSize + authTagSize) {
    return;
  }
  const iv = cipherText_.subarray(0, ivSize);
  const data = cipherText_.subarray(ivSize);
  let plainText: ArrayBuffer;
  try {
    plainText = await webcrypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: authTagSize * 8,
      },
      key,
      data,
    );
  } catch (e) {
    // This means algorithm is incorrectly setup
    if (e.name === 'InvalidAccessError') {
      throw e;
    }
    // Otherwise the key is wrong
    // or the data is wrong
    return;
  }
  return bufferWrap(plainText);
}

/**
 * Key wrapping with password
 * This uses `PBES2-HS512+A256KW` algorithm.
 * This is a password-based encryption scheme.
 * A 256-bit content encryption key (CEK) is generated.
 * This CEK encrypts the `keyJWK` contents using symmetric AES-KW.
 * Then the CEK is encrypted with a key derived from PBKDF2
 * using 1000 iterations and random salt and HMAC-SHA256.
 * The encrypted ciphertext, encrypted CEK and PBKDF2 parameters are all stored in the JWE.
 * See: https://www.rfc-editor.org/rfc/rfc7518#section-4.8
 */
async function wrapWithPassword(
  password: string,
  keyJWK: JWK,
): Promise<JWEFlattened> {
  const JWEFactory = new jose.FlattenedEncrypt(
    Buffer.from(JSON.stringify(keyJWK), 'utf-8'),
  );
  JWEFactory.setProtectedHeader({
    alg: 'PBES2-HS512+A256KW',
    enc: 'A256GCM',
    cty: 'jwk+json',
  });
  const keyJWE = await JWEFactory.encrypt(Buffer.from(password, 'utf-8'));
  return keyJWE;
}

/**
 * Key unwrapping with password.
 * This uses `PBES2-HS512+A256KW` algorithm.
 * See: https://www.rfc-editor.org/rfc/rfc7518#section-4.8
 */
async function unwrapWithPassword(
  password: string,
  keyJWE: JWEFlattened,
): Promise<JWK | undefined> {
  let keyJWK: JWK;
  try {
    const result = await jose.flattenedDecrypt(
      keyJWE,
      Buffer.from(password, 'utf-8'),
    );
    keyJWK = JSON.parse(bufferWrap(result.plaintext).toString('utf-8'));
  } catch {
    return;
  }
  return keyJWK;
}

async function wrapWithKey(
  key: BufferSource | CryptoKey,
  keyJWK: JWK,
): Promise<JWEFlattened> {
  const JWEFactory = new jose.FlattenedEncrypt(
    Buffer.from(JSON.stringify(keyJWK), 'utf-8'),
  );
  JWEFactory.setProtectedHeader({
    alg: 'A256KW',
    enc: 'A256GCM',
    cty: 'jwk+json',
  });
  const keyJWE = await JWEFactory.encrypt(await exportKey(key));
  return keyJWE;
}

async function unwrapWithKey(
  key: BufferSource | CryptoKey,
  keyJWE: JWEFlattened,
): Promise<JWK | undefined> {
  let keyJWK: JWK;
  try {
    const result = await jose.flattenedDecrypt(keyJWE, await exportKey(key));
    keyJWK = JSON.parse(bufferWrap(result.plaintext).toString('utf-8'));
  } catch {
    return;
  }
  return keyJWK;
}

export {
  ivSize,
  authTagSize,
  importKey,
  exportKey,
  keyToJWK,
  keyFromJWK,
  encryptWithKey,
  decryptWithKey,
  wrapWithPassword,
  unwrapWithPassword,
  wrapWithKey,
  unwrapWithKey,
};
