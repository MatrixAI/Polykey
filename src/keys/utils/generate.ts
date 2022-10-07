import type { Key, KeyPair, RecoveryCode } from './types';
import './webcrypto';
import * as nobleEd25519 from '@noble/ed25519';
import * as bip39 from '@scure/bip39';
import { getRandomBytesSync } from './random';
import { bufferWrap } from '../../utils';

async function generateKey(): Promise<Key> {
  return getRandomBytesSync(32) as Key;
}

async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = getRandomBytesSync(32);
  const publicKey = await nobleEd25519.getPublicKey(privateKey);
  return {
    publicKey: bufferWrap(publicKey),
    privateKey: bufferWrap(privateKey),
  } as KeyPair;
}

async function generateDeterministicKeyPair(
  recoveryCode: RecoveryCode,
): Promise<KeyPair> {
  // This uses BIP39 standard, the result is 64 byte seed
  // This is deterministic, and does not use any random source
  const recoverySeed = await bip39.mnemonicToSeed(recoveryCode);
  // Slice it to 32 bytes, as ed25519 private key is only 32 bytes
  const privateKey = recoverySeed.slice(0, 32);
  const publicKey = await nobleEd25519.getPublicKey(privateKey);
  return {
    publicKey: bufferWrap(publicKey),
    privateKey: bufferWrap(privateKey),
  } as KeyPair;
}

export { generateKey, generateKeyPair, generateDeterministicKeyPair };
