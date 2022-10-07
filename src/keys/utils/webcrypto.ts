import type { PublicKey, PrivateKey, KeyPair } from '../types';
import { Crypto } from '@peculiar/webcrypto';
import * as utils from '../../utils';

/**
 * WebCrypto polyfill from @peculiar/webcrypto
 * This behaves differently with respect to Ed25519 keys
 * See: https://github.com/PeculiarVentures/webcrypto/issues/55
 */
const webcrypto = new Crypto();

/**
 * Monkey patches the global crypto object polyfill
 */
globalThis.crypto = webcrypto;

/**
 * Imports Ed25519 public `CryptoKey` from key buffer.
 * If `publicKey` is already `CryptoKey`, then this just returns it.
 */
async function importPublicKey(publicKey: BufferSource): Promise<CryptoKey> {
  return webcrypto.subtle.importKey(
    'raw',
    publicKey,
    {
      name: 'EdDSA',
      namedCurve: 'Ed25519',
    },
    true,
    ['verify'],
  );
}

/**
 * Imports Ed25519 private `CryptoKey` from key buffer.
 * If `privateKey` is already `CryptoKey`, then this just returns it.
 */
async function importPrivateKey(privateKey: BufferSource): Promise<CryptoKey> {
  return await webcrypto.subtle.importKey(
    'jwk',
    {
      alg: 'EdDSA',
      kty: 'OKP',
      crv: 'Ed25519',
      d: utils.bufferWrap(privateKey).toString('base64url'),
    },
    {
      name: 'EdDSA',
      namedCurve: 'Ed25519',
    },
    true,
    ['sign'],
  );
}

/**
 * Imports Ed25519 `CryptoKeyPair` from key pair buffer.
 * If any of the keys are already `CryptoKey`, then this will return them.
 */
async function importKeyPair({
  publicKey,
  privateKey,
}: {
  publicKey: BufferSource;
  privateKey: BufferSource;
}): Promise<CryptoKeyPair> {
  return {
    publicKey: await importPublicKey(publicKey),
    privateKey: await importPrivateKey(privateKey),
  };
}

/**
 * Exports Ed25519 public `CryptoKey` to `PublicKey`.
 * If `publicKey` is already `Buffer`, then this just returns it.
 */
async function exportPublicKey(publicKey: CryptoKey): Promise<PublicKey> {
  return utils.bufferWrap(
    await webcrypto.subtle.exportKey('raw', publicKey),
  ) as PublicKey;
}

/**
 * Exports Ed25519 private `CryptoKey` to `PrivateKey`
 * If `privateKey` is already `Buffer`, then this just returns it.
 */
async function exportPrivateKey(privateKey: CryptoKey): Promise<PrivateKey> {
  const privateJWK = await webcrypto.subtle.exportKey('jwk', privateKey);
  if (privateJWK.d == null) {
    throw new TypeError('Private key is not an Ed25519 private key');
  }
  return Buffer.from(privateJWK.d, 'base64url') as PrivateKey;
}

/**
 * Exports Ed25519 `CryptoKeyPair` to `KeyPair`
 * If any of the keys are already `Buffer`, then this will return them.
 */
async function exportKeyPair(keyPair: {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}): Promise<KeyPair> {
  const publicKey = await exportPublicKey(keyPair.publicKey);
  const privateKey = await exportPrivateKey(keyPair.privateKey);
  const secretKey = Buffer.concat([privateKey, publicKey]);
  return {
    publicKey,
    privateKey,
    secretKey,
  } as KeyPair;
}

export default webcrypto;

export {
  importPublicKey,
  importPrivateKey,
  importKeyPair,
  exportPublicKey,
  exportPrivateKey,
  exportKeyPair,
};
