import type { Key, KeyPair, RecoveryCode } from '../types';
import sodium from 'sodium-native';
import * as bip39 from '@scure/bip39';
import * as utils from '../../utils';

/**
 * Generates a Key.
 * These symmetric keys are always 32 bytes/256 bits long.
 * This will work for all symmetric algos being used in PK.
 */
function generateKey(): Key {
  const key = Buffer.allocUnsafe(
    sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
  );
  sodium.crypto_aead_xchacha20poly1305_ietf_keygen(key);
  return key as Key;
}

/**
 * Generates KeyPair.
 * These are Ed25519 keypairs.
 */
function generateKeyPair(): KeyPair {
  const publicKey = Buffer.allocUnsafe(sodium.crypto_sign_PUBLICKEYBYTES);
  const secretKey = Buffer.allocUnsafe(sodium.crypto_sign_SECRETKEYBYTES);
  sodium.crypto_sign_keypair(publicKey, secretKey);
  // Libsodium's secret key concatenates the
  // 32-byte secret seed (private key) and 32-byte public key.
  // We already have the public key, so we slice out just the private key.
  // This makes it easier to use with other libraries.
  const privateKey = secretKey.slice(0, sodium.crypto_sign_SEEDBYTES);
  return {
    publicKey,
    privateKey,
    secretKey,
  } as KeyPair;
}

/**
 * Generates KeyPair deterministically from a seed.
 * The seed has to be a 12 or 24 word BIP39 mnemonic.
 */
async function generateDeterministicKeyPair(
  recoveryCode: RecoveryCode,
): Promise<KeyPair> {
  // This uses BIP39 standard, the result is 64 byte seed
  // This is deterministic, and does not use any random source
  const recoverySeed = utils.bufferWrap(
    await bip39.mnemonicToSeed(recoveryCode),
  );
  // The seed is used as the prvate key
  // Slice it to 32 bytes, as ed25519 private key is only 32 bytes
  const privateKey = recoverySeed.slice(0, sodium.crypto_sign_SEEDBYTES);
  const publicKey = Buffer.allocUnsafe(sodium.crypto_sign_PUBLICKEYBYTES);
  const secretKey = Buffer.allocUnsafe(sodium.crypto_sign_SECRETKEYBYTES);
  sodium.crypto_sign_seed_keypair(publicKey, secretKey, privateKey);
  return {
    publicKey,
    privateKey,
    secretKey,
  } as KeyPair;
}

export { generateKey, generateKeyPair, generateDeterministicKeyPair };
