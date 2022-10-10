import type {
  PasswordHash,
  PasswordSalt,
  PasswordOpsLimit,
  PasswordMemLimit,
} from '../types';
import sodium from 'sodium-native';
import { getRandomBytes } from './random';

/**
 * Use the `min` limit during testing to improve performance.
 */
const passwordOpsLimits: {
  min: PasswordOpsLimit;
  max: PasswordOpsLimit;
  interactive: PasswordOpsLimit;
  moderate: PasswordOpsLimit;
  sensitive: PasswordOpsLimit;
} = {
  min: sodium.crypto_pwhash_OPSLIMIT_MIN,
  max: sodium.crypto_pwhash_OPSLIMIT_MAX,
  interactive: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
  moderate: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
  sensitive: sodium.crypto_pwhash_OPSLIMIT_SENSITIVE,
};

/**
 * Use the `min` limit during testing to improve performance.
 */
const passwordMemLimits: {
  min: PasswordMemLimit;
  max: PasswordMemLimit;
  interactive: PasswordMemLimit;
  moderate: PasswordMemLimit;
  sensitive: PasswordMemLimit;
} = {
  min: sodium.crypto_pwhash_MEMLIMIT_MIN,
  max: sodium.crypto_pwhash_MEMLIMIT_MAX,
  interactive: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
  moderate: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
  sensitive: sodium.crypto_pwhash_MEMLIMIT_SENSITIVE,
};

/**
 * These are the default computational parameters for password hashing.
 * They can be changed to increase or decrease the computational cost.
 * This ensures that deriving a key from a password uses
 * 256 MiB of RAM and 0.7 seconds on a 2.8 GHz Intel Core i7.
 * These need to be consistent to ensure the same hash is produced.
 */
const passwordOpsLimitDefault = passwordOpsLimits.moderate;
const passwordMemLimitDefault = passwordMemLimits.moderate;

function isPasswordOpsLimit(opsLimit: number): opsLimit is PasswordOpsLimit {
  return opsLimit > passwordOpsLimits.min && opsLimit < passwordOpsLimits.max;
}

function isPasswordMemLimit(memLimit: number): memLimit is PasswordMemLimit {
  return memLimit > passwordMemLimits.min && memLimit < passwordMemLimits.max;
}

/**
 * Hashes the password and returns a 256-bit hash and 128-bit salt.
 * The 256-bit hash can be used as a key for symmetric encryption/decryption.
 * Pass the salt in case you are trying to get the same hash.
 */
function hashPassword(
  password: string,
  salt?: PasswordSalt,
  opsLimit: PasswordOpsLimit = passwordOpsLimitDefault,
  memLimit: PasswordMemLimit = passwordMemLimitDefault,
): [PasswordHash, PasswordSalt] {
  const hash = Buffer.allocUnsafe(
    sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
  );
  salt ??= getRandomBytes(sodium.crypto_pwhash_SALTBYTES) as PasswordSalt;
  sodium.crypto_pwhash(
    hash,
    Buffer.from(password, 'utf-8'),
    salt,
    opsLimit,
    memLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
  return [hash as PasswordHash, salt];
}

function checkPassword(
  password: string,
  hash: PasswordHash,
  salt: PasswordSalt,
  opsLimit: PasswordOpsLimit = passwordOpsLimitDefault,
  memLimit: PasswordMemLimit = passwordMemLimitDefault,
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
    opsLimit,
    memLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
  return sodium.sodium_memcmp(hash, hash_);
}

export {
  passwordOpsLimits,
  passwordMemLimits,
  passwordOpsLimitDefault,
  passwordMemLimitDefault,
  isPasswordOpsLimit,
  isPasswordMemLimit,
  hashPassword,
  checkPassword,
};
