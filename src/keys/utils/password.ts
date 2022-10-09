import type { PasswordHash, PasswordSalt } from '../types';
import sodium from 'sodium-native';
import { getRandomBytes } from './random';

/**
 * This ensures that deriving a key from a password uses
 * 256 MiB of RAM and 0.7 seconds on a 2.8 GHz Intel Core i7.
 */
const passwordOpsLimit = sodium.crypto_pwhash_OPSLIMIT_MODERATE;
const passwordMemLimit = sodium.crypto_pwhash_MEMLIMIT_MODERATE;

/**
 * Hashes the password and returns a 256-bit hash and 128-bit salt.
 * The 256-bit hash can be used as a key for symmetric encryption/decryption.
 * Pass the salt in case you are trying to get the same hash.
 */
function hashPassword(
  password: string,
  salt?: PasswordSalt
): [PasswordHash, PasswordSalt] {
  const hash = Buffer.allocUnsafe(
    sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
  );
  salt ??= getRandomBytes(sodium.crypto_pwhash_SALTBYTES) as PasswordSalt;
  sodium.crypto_pwhash(
    hash,
    Buffer.from(password, 'utf-8'),
    salt,
    passwordOpsLimit,
    passwordMemLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
  return [hash as PasswordHash, salt];
}

function checkPassword(
  password: string,
  hash: PasswordHash,
  salt: PasswordSalt
): boolean {
  const hash_ = Buffer.allocUnsafe(
    sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
  );
  if (hash.byteLength !== hash_.byteLength) {
    return false;
  }
  sodium.crypto_pwhash(
    hash_,
    Buffer.from(password, 'utf-8'),
    salt,
    passwordOpsLimit,
    passwordMemLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
  return sodium.sodium_memcmp(hash, hash_);
}

export {
  passwordOpsLimit,
  passwordMemLimit,
  hashPassword,
  checkPassword,
};
