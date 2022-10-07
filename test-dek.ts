import * as jose from 'jose';
import { hkdf, KeyObject, webcrypto } from 'crypto';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

import * as nobleEd25519 from '@noble/ed25519';
import * as nobleHashesUtils from '@noble/hashes/utils';

import * as base64 from 'multiformats/bases/base64';
import * as noblePbkdf2 from '@noble/hashes/pbkdf2';
import * as nobleHkdf from '@noble/hashes/hkdf';

import { sha512 as nobleSha512 } from '@noble/hashes/sha512';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';

// type Assert = (condition: unknown) => asserts condition;
// const assert: Assert = (condition) => {
//   if (condition == false) throw new Error('Invalid assertion');
// };

/**
 * Opaque types are wrappers of existing types
 * that require smart constructors
 */
type Opaque<K, T> = T & { readonly [brand]: K };
declare const brand: unique symbol;

type RecoveryCode = Opaque<'RecoveryCode', string>;


/**
 * Zero-copy wraps ArrayBuffer-like objects into Buffer
 * This supports ArrayBuffer, TypedArrays and NodeJS Buffer
 */
function bufferWrap(
  array: ArrayBuffer,
  offset?: number,
  length?: number,
): Buffer {
  if (Buffer.isBuffer(array)) {
    return array;
  } else if (ArrayBuffer.isView(array)) {
    return Buffer.from(
      array.buffer,
      offset ?? array.byteOffset,
      length ?? array.byteLength
    );
  } else {
    return Buffer.from(
      array,
      offset,
      length
    );
  }
}


/**
 * This is limited to 65,536 bytes of random data
 * Stream this call, if you want more
 */
function getRandomBytesSync(size: number): Buffer {
  return webcrypto.getRandomValues(
    Buffer.allocUnsafe(size)
  );
}

// @ts-ignore - this overrides the random source used by @noble and @scure libraries
nobleHashesUtils.randomBytes = (size: number = 32) => getRandomBytesSync(size);
nobleEd25519.utils.randomBytes = (size: number = 32) => getRandomBytesSync(size);

async function encryptWithKey(
  key: CryptoKey,
  plainText: ArrayBuffer
): Promise<Buffer> {
  const iv = getRandomBytesSync(16);
  const data = await webcrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    key,
    plainText
  );
  return Buffer.concat([
    iv,
    bufferWrap(data)
  ]);
}

async function decryptWithKey(
  key: CryptoKey,
  cipherText: ArrayBuffer
): Promise<Buffer | undefined> {
  const cipherText_ = bufferWrap(cipherText);
  if (cipherText_.byteLength < 32) {
    return;
  }
  const iv = cipherText_.subarray(0, 16);
  const data = cipherText_.subarray(16);
  let plainText: ArrayBuffer;
  try {
    plainText = await webcrypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128
      },
      key,
      data
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

function generateRecoveryCode(size: 12 | 24 = 24): RecoveryCode {
  if (size === 12) {
    return bip39.generateMnemonic(wordlist, 128) as RecoveryCode;
  } else if (size === 24) {
    return bip39.generateMnemonic(wordlist, 256) as RecoveryCode;
  }
  throw RangeError(size);
}

async function generateDeterministicKeyPair(recoveryCode: string) {
  // This uses BIP39 standard, the result is 64 byte seed
  // This is deterministic, and does not use any random source
  const recoverySeed = await bip39.mnemonicToSeed(recoveryCode);
  // Slice it to 32 bytes, as ed25519 private key is only 32 bytes
  const privateKey = recoverySeed.slice(0, 32);
  const publicKey = await nobleEd25519.getPublicKey(privateKey);
  return {
    publicKey,
    privateKey
  };
}

async function main () {

  const recoveryCode = generateRecoveryCode(24);
  const rootKeyPair = await generateDeterministicKeyPair(recoveryCode);
  const databaseKey = getRandomBytesSync(32);

  const databaseKeyJWK = {
    alg: "A256GCM",
    kty: "oct",
    k: base64.base64url.baseEncode(databaseKey),
    ext: true,
    key_ops: ["encrypt", "decrypt"],
  };

  const databaseCryptoKey = await webcrypto.subtle.importKey(
    'jwk',
    databaseKeyJWK,
    'AES-GCM',
    true,
    databaseKeyJWK.key_ops as Array<webcrypto.KeyUsage>
  );

  const cipherText = await encryptWithKey(
    databaseCryptoKey,
    Buffer.from('hello world')
  );

  // Try with incorrect key
  // const databaseCryptoKey2 = await webcrypto.subtle.importKey(
  //   'raw',
  //   getRandomBytesSync(16),
  //   'AES-GCM',
  //   true,
  //   databaseKeyJWK.key_ops as Array<webcrypto.KeyUsage>
  // );

  const plainText = await decryptWithKey(
    databaseCryptoKey,
    cipherText
  );

  console.log(plainText?.toString());

  // We are going to wrap it
  // Encrypted JWK
  const databaseKeyJWKEncrypted = new jose.FlattenedEncrypt(
    Buffer.from(JSON.stringify(databaseKeyJWK), 'utf-8')
  );

  databaseKeyJWKEncrypted.setProtectedHeader({
    alg: 'dir',
    enc: 'A256GCM',
    cty: 'jwk+JSON'
  });

  const z = await nobleEd25519.getSharedSecret(
    rootKeyPair.privateKey,
    rootKeyPair.publicKey
  );

  const PRK = nobleHkdf.extract(
    nobleSha512,
    z,
  );

  const KEK = nobleHkdf.expand(
    nobleSha512,
    PRK,
    Buffer.from('DB KEY key wrap/key encapsulation mechanism'),
    32
  );

  const jweEncrypted = await databaseKeyJWKEncrypted.encrypt(KEK);

  // We save this as `db_key.jwk`
  // It can now be decrypted in the future with the same KEK
  // This also doesn't bother with an ephemeral static, no need
  const jweEncryptedString = JSON.stringify(jweEncrypted);

  // In the future, use ECDH-ES
  // Ok we are going to use X.509 now

  console.log(jweEncryptedString);

  // We could assume all these libraries actually use node's crypto
  // and node's webcrypto ultimately uses node's crypto anyway

}

void main();
