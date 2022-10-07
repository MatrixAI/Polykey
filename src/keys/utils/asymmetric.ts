import type {
  KeyPair,
  PublicKey,
  PrivateKey,
  PublicKeyJWK,
  PrivateKeyJWK,
  KeyPairJWK,
  PublicKeyPem,
  PrivateKeyPem,
  KeyPairPem,
  JWK,
  JWEFlattened,
} from './types';
import type { NodeId } from '../../ids/types';
import * as jose from 'jose';
import { IdInternal } from '@matrixai/id';
import * as nobleEd25519 from '@noble/ed25519';
import * as nobleHkdf from '@noble/hashes/hkdf';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { sha512 as nobleSha512 } from '@noble/hashes/sha512';
import webcrypto from './webcrypto';
import { generateKeyPair } from './generate';
import { encryptWithKey, decryptWithKey } from './symmetric';
import { bufferWrap, isBufferSource } from '../../utils';

/**
 * Imports Ed25519 public `CryptoKey` from key buffer.
 * If `publicKey` is already `CryptoKey`, then this just returns it.
 */
async function importPublicKey(
  publicKey: BufferSource | CryptoKey,
): Promise<CryptoKey> {
  if (!isBufferSource(publicKey)) {
    return publicKey;
  }
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
async function importPrivateKey(
  privateKey: BufferSource | CryptoKey,
): Promise<CryptoKey> {
  if (!isBufferSource(privateKey)) {
    return privateKey;
  }
  return await webcrypto.subtle.importKey(
    'jwk',
    {
      alg: 'EdDSA',
      kty: 'OKP',
      crv: 'Ed25519',
      d: bufferWrap(privateKey).toString('base64url'),
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
  publicKey: CryptoKey | BufferSource;
  privateKey: CryptoKey | BufferSource;
}): Promise<CryptoKeyPair> {
  return {
    publicKey: isBufferSource(publicKey)
      ? await importPublicKey(publicKey)
      : publicKey,
    privateKey: isBufferSource(privateKey)
      ? await importPrivateKey(privateKey)
      : privateKey,
  };
}

/**
 * Exports Ed25519 public `CryptoKey` to `PublicKey`.
 * If `publicKey` is already `Buffer`, then this just returns it.
 */
async function exportPublicKey(
  publicKey: CryptoKey | BufferSource,
): Promise<PublicKey> {
  if (isBufferSource(publicKey)) {
    return bufferWrap(publicKey) as PublicKey;
  }
  return bufferWrap(
    await webcrypto.subtle.exportKey('raw', publicKey),
  ) as PublicKey;
}

/**
 * Exports Ed25519 private `CryptoKey` to `PrivateKey`
 * If `privateKey` is already `Buffer`, then this just returns it.
 */
async function exportPrivateKey(
  privateKey: CryptoKey | BufferSource,
): Promise<PrivateKey> {
  if (isBufferSource(privateKey)) {
    return bufferWrap(privateKey) as PrivateKey;
  }
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
async function exportKeyPair({
  publicKey,
  privateKey,
}: {
  publicKey: CryptoKey | BufferSource;
  privateKey: CryptoKey | BufferSource;
}): Promise<KeyPair> {
  return {
    publicKey: isBufferSource(publicKey)
      ? (bufferWrap(publicKey) as PublicKey)
      : await exportPublicKey(publicKey),
    privateKey: isBufferSource(privateKey)
      ? (bufferWrap(privateKey) as PrivateKey)
      : await exportPrivateKey(privateKey),
  };
}

function publicKeyToNodeId(publicKey: PublicKey): NodeId {
  return IdInternal.create<NodeId>(publicKey);
}

function publicKeyFromNodeId(nodeId: NodeId): PublicKey {
  const publicKey = bufferWrap(nodeId);
  return publicKey as PublicKey;
}

async function publicKeyToJWK(
  publicKey: BufferSource | CryptoKey,
): Promise<PublicKeyJWK> {
  const publicKey_ = await exportPublicKey(publicKey);
  return {
    alg: 'EdDSA',
    kty: 'OKP',
    crv: 'Ed25519',
    x: publicKey_.toString('base64url'),
    ext: true,
    key_ops: ['verify'],
  };
}

async function publicKeyFromJWK(
  publicKeyJWK: JWK,
): Promise<PublicKey | undefined> {
  if (
    publicKeyJWK.alg !== 'EdDSA' ||
    publicKeyJWK.kty !== 'OKP' ||
    publicKeyJWK.crv !== 'Ed25519' ||
    typeof publicKeyJWK.x !== 'string'
  ) {
    return undefined;
  }
  const publicKey = Buffer.from(publicKeyJWK.x, 'base64url') as PublicKey;
  if (!validatePublicKey(publicKey)) {
    return undefined;
  }
  return publicKey;
}

async function privateKeyToJWK(
  privateKey: BufferSource | CryptoKey,
): Promise<PrivateKeyJWK> {
  const privateKey_ = await exportPrivateKey(privateKey);
  const publicKey = await publicKeyFromPrivateKeyEd25519(privateKey_);
  return {
    alg: 'EdDSA',
    kty: 'OKP',
    crv: 'Ed25519',
    x: publicKey.toString('base64url'),
    d: privateKey_.toString('base64url'),
    ext: true,
    key_ops: ['verify', 'sign'],
  };
}

/**
 * Extracts private key out of JWK.
 * This checks if the public key matches the private key in the JWK.
 */
async function privateKeyFromJWK(
  privateKeyJWK: JWK,
): Promise<PrivateKey | undefined> {
  if (
    privateKeyJWK.alg !== 'EdDSA' ||
    privateKeyJWK.kty !== 'OKP' ||
    privateKeyJWK.crv !== 'Ed25519' ||
    typeof privateKeyJWK.x !== 'string' ||
    typeof privateKeyJWK.d !== 'string'
  ) {
    return undefined;
  }
  const publicKey = Buffer.from(privateKeyJWK.x, 'base64url');
  const privateKey = Buffer.from(privateKeyJWK.d, 'base64url');
  // Any random 32 bytes is a valid private key
  if (privateKey.byteLength !== 32) {
    return undefined;
  }
  // If the public key doesn't match, then the JWK is invalid
  const publicKey_ = await publicKeyFromPrivateKeyEd25519(privateKey);
  if (!publicKey_.equals(publicKey)) {
    return undefined;
  }
  return privateKey as PrivateKey;
}

async function keyPairToJWK(keyPair: {
  publicKey: CryptoKey | BufferSource;
  privateKey: CryptoKey | BufferSource;
}): Promise<KeyPairJWK> {
  return {
    publicKey: await publicKeyToJWK(keyPair.publicKey),
    privateKey: await privateKeyToJWK(keyPair.privateKey),
  };
}

async function keyPairFromJWK(
  keyPair: KeyPairJWK,
): Promise<KeyPair | undefined> {
  const publicKey = await publicKeyFromJWK(keyPair.publicKey);
  const privateKey = await privateKeyFromJWK(keyPair.privateKey);
  if (publicKey == null || privateKey == null) {
    return undefined;
  }
  return {
    publicKey,
    privateKey,
  };
}

async function publicKeyToPem(
  publicKey: BufferSource | CryptoKey,
): Promise<PublicKeyPem> {
  if (isBufferSource(publicKey)) {
    publicKey = await importPublicKey(publicKey);
  }
  const spki = bufferWrap(await webcrypto.subtle.exportKey('spki', publicKey));
  return `-----BEGIN PUBLIC KEY-----\n${spki.toString(
    'base64',
  )}\n-----END PUBLIC KEY-----\n` as PublicKeyPem;
}

async function publicKeyFromPem(
  publicKeyPem: PublicKeyPem,
): Promise<PublicKey | undefined> {
  const match = publicKeyPem.match(
    /-----BEGIN PUBLIC KEY-----\n([A-Za-z0-9+/=]+)\n-----END PUBLIC KEY-----\n/,
  );
  if (match == null) {
    return undefined;
  }
  const spki = Buffer.from(match[1], 'base64');
  let publicKey;
  try {
    publicKey = await webcrypto.subtle.importKey(
      'spki',
      spki,
      {
        name: 'EdDSA',
        namedCurve: 'Ed25519',
      },
      true,
      ['verify'],
    );
  } catch (e) {
    if (e instanceof TypeError) {
      return undefined;
    }
    throw e;
  }
  return exportPublicKey(publicKey);
}

async function privateKeyToPem(
  privateKey: BufferSource | CryptoKey,
): Promise<PrivateKeyPem> {
  if (isBufferSource(privateKey)) {
    privateKey = await importPrivateKey(privateKey);
  }
  const pkcs8 = bufferWrap(
    await webcrypto.subtle.exportKey('pkcs8', privateKey),
  );
  return `-----BEGIN PRIVATE KEY-----\n${pkcs8.toString(
    'base64',
  )}\n-----END PRIVATE KEY-----\n` as PrivateKeyPem;
}

async function privateKeyFromPem(
  privateKeyPem: PrivateKeyPem,
): Promise<PrivateKey | undefined> {
  const match = privateKeyPem.match(
    /-----BEGIN PRIVATE KEY-----\n([A-Za-z0-9+/=]+)\n-----END PRIVATE KEY-----\n/,
  );
  if (match == null) {
    return undefined;
  }
  const pkcs8 = Buffer.from(match[1], 'base64');
  let privateKey;
  try {
    privateKey = await webcrypto.subtle.importKey(
      'pkcs8',
      pkcs8,
      {
        name: 'EdDSA',
        namedCurve: 'Ed25519',
      },
      true,
      ['sign'],
    );
  } catch (e) {
    if (e instanceof TypeError) {
      return undefined;
    }
    throw e;
  }
  return exportPrivateKey(privateKey);
}

async function keyPairToPem(keyPair: {
  publicKey: CryptoKey | BufferSource;
  privateKey: CryptoKey | BufferSource;
}): Promise<KeyPairPem> {
  return {
    publicKey: await publicKeyToPem(keyPair.publicKey),
    privateKey: await privateKeyToPem(keyPair.privateKey),
  };
}

async function keyPairFromPem(
  keyPair: KeyPairPem,
): Promise<KeyPair | undefined> {
  const publicKey = await publicKeyFromPem(keyPair.publicKey);
  const privateKey = await privateKeyFromPem(keyPair.privateKey);
  if (publicKey == null || privateKey == null) {
    return undefined;
  }
  return {
    publicKey,
    privateKey,
  };
}

/**
 * Extracts Ed25519 Public Key from Ed25519 Private Key
 */
async function publicKeyFromPrivateKeyEd25519(
  privateKey: BufferSource,
): Promise<PublicKey> {
  return bufferWrap(
    await nobleEd25519.getPublicKey(bufferWrap(privateKey)),
  ) as PublicKey;
}

/**
 * Extracts X25519 Public Key from X25519 Private Key
 */
function publicKeyFromPrivateKeyX25519(privateKey: BufferSource): Buffer {
  return bufferWrap(
    nobleEd25519.curve25519.scalarMultBase(bufferWrap(privateKey)),
  );
}

/**
 * Maps Ed25519 public key to X25519 public key
 */
function publicKeyEd25519ToX25519(publicKey: BufferSource): Buffer {
  return bufferWrap(
    nobleEd25519.Point.fromHex(bufferWrap(publicKey)).toX25519(),
  );
}

/**
 * Maps Ed25519 private key to X25519 private key
 */
async function privateKeyEd25519ToX25519(
  privateKey: BufferSource,
): Promise<Buffer> {
  return bufferWrap(
    (await nobleEd25519.utils.getExtendedPublicKey(bufferWrap(privateKey)))
      .head,
  );
}

/**
 * Maps Ed25519 keypair to X25519 keypair
 */
async function keyPairEd25519ToX25519(keyPair: {
  publicKey: BufferSource;
  privateKey: BufferSource;
}): Promise<{ publicKey: Buffer; privateKey: Buffer }> {
  return {
    publicKey: publicKeyEd25519ToX25519(keyPair.publicKey),
    privateKey: await privateKeyEd25519ToX25519(keyPair.privateKey),
  };
}

/**
 * Asymmetric public key encryption also known as ECIES.
 * The sender key pair will be randomly generated if not supplied.
 * If it is randomly generated, then we are using an ephemeral sender.
 * This is more secure than using a static sender key pair.
 *
 * This supports:
 *   - ECDH-ES - ephemeral sender, static receiver
 *   - ECDH-SS - static sender, static receiver
 *   - ECDH-EE - ephemeral sender, ephemeral receiver
 * To understand the difference, see:
 * https://crypto.stackexchange.com/a/61760/102416
 *
 * The resulting cipher text will have the following format:
 * `publicKey || iv || cipherText || authTag`
 *
 * This scheme is derives X25519 key pair from Ed25519 key pair to perform ECDH.
 * See: https://eprint.iacr.org/2011/615 and https://eprint.iacr.org/2021/509
 */
async function encryptWithPublicKey(
  receiverPublicKey: BufferSource | CryptoKey,
  plainText: BufferSource,
  senderKeyPair?: {
    publicKey: BufferSource | CryptoKey;
    privateKey: BufferSource | CryptoKey;
  },
): Promise<Buffer> {
  receiverPublicKey = await exportPublicKey(receiverPublicKey);
  let senderKeyPair_: KeyPair;
  // Generate ephemeral key pair if the sender key pair is not set
  if (senderKeyPair == null) {
    senderKeyPair_ = await generateKeyPair();
  } else {
    senderKeyPair_ = {
      publicKey: await exportPublicKey(senderKeyPair.publicKey),
      privateKey: await exportPrivateKey(senderKeyPair.privateKey),
    };
  }
  const receiverPublicKeyX25519 = publicKeyEd25519ToX25519(receiverPublicKey);
  const senderPrivateKeyX25519 = await privateKeyEd25519ToX25519(
    senderKeyPair_.privateKey,
  );
  const senderPublicKeyX25519 = publicKeyFromPrivateKeyX25519(
    senderPrivateKeyX25519,
  );
  const sharedSecret = deriveSharedSecret(
    receiverPublicKeyX25519,
    senderPrivateKeyX25519,
  );
  const pseudoRandomKey = derivePseudoRandomKey(
    sharedSecret,
    senderPublicKeyX25519,
    receiverPublicKeyX25519,
  );
  const encryptionKey = deriveEncryptionKey(pseudoRandomKey);
  // Authenticated symmetric encryption
  // This uses AES-GCM, so the cipher text already has a message authentication code
  const cipherText = await encryptWithKey(encryptionKey, bufferWrap(plainText));
  return Buffer.concat([senderKeyPair_.publicKey, cipherText]);
}

/**
 * Asymmetric public key decryption also known as ECIES.
 *
 * It is expected that the cipher text will have the following format:
 * `publicKey || iv || cipherText || authTag`
 */
async function decryptWithPrivateKey(
  receiverPrivateKey: BufferSource | CryptoKey,
  cipherText: BufferSource,
): Promise<Buffer | undefined> {
  receiverPrivateKey = await exportPrivateKey(receiverPrivateKey);
  const cipherText_ = bufferWrap(cipherText);
  if (cipherText_.byteLength < 32) {
    return;
  }
  const senderPublicKey = cipherText_.slice(0, 32) as PublicKey;
  const data = cipherText_.slice(32);
  const senderPublicKeyX25519 = publicKeyEd25519ToX25519(senderPublicKey);
  const receiverPrivateKeyX25519 = await privateKeyEd25519ToX25519(
    receiverPrivateKey,
  );
  const receiverPublicKeyX25519 = publicKeyFromPrivateKeyX25519(
    receiverPrivateKeyX25519,
  );
  const sharedSecret = deriveSharedSecret(
    senderPublicKeyX25519,
    receiverPrivateKeyX25519,
  );
  const pseudoRandomKey = derivePseudoRandomKey(
    sharedSecret,
    senderPublicKeyX25519,
    receiverPublicKeyX25519,
  );
  const encryptionKey = deriveEncryptionKey(pseudoRandomKey);
  const plainText = await decryptWithKey(encryptionKey, data);
  return plainText;
}

/**
 * Sign with private key.
 * This returns a signature buffer.
 */
async function signWithPrivateKey(
  privateKey: BufferSource | CryptoKey,
  data: BufferSource,
): Promise<Buffer> {
  if (!isBufferSource(privateKey)) {
    privateKey = await exportPrivateKey(privateKey);
  }
  return bufferWrap(
    await nobleEd25519.sign(bufferWrap(data), bufferWrap(privateKey)),
  );
}

/**
 * Verifies signature with public key
 */
async function verifyWithPublicKey(
  publicKey: BufferSource | CryptoKey,
  data: BufferSource,
  signature: BufferSource,
): Promise<boolean> {
  if (!isBufferSource(publicKey)) {
    publicKey = await exportPublicKey(publicKey);
  }
  return nobleEd25519.verify(
    bufferWrap(signature),
    bufferWrap(data),
    bufferWrap(publicKey),
  );
}

/**
 * Key Encapsulation Mechanism (KEM).
 * This encapsulates a JWK with a public key and produces a JWE.
 * This uses the same ECIES scheme as `encryptWithPublicKey`.
 */
async function encapsulateWithPublicKey(
  receiverPublicKey: BufferSource | CryptoKey,
  keyJWK: JWK,
  senderKeyPair?: {
    publicKey: BufferSource | CryptoKey;
    privateKey: BufferSource | CryptoKey;
  },
): Promise<JWEFlattened> {
  receiverPublicKey = await exportPublicKey(receiverPublicKey);
  let senderKeyPair_: KeyPair;
  // Generate ephemeral key pair if the sender key pair is not set
  if (senderKeyPair == null) {
    senderKeyPair_ = await generateKeyPair();
  } else {
    senderKeyPair_ = {
      publicKey: await exportPublicKey(senderKeyPair.publicKey),
      privateKey: await exportPrivateKey(senderKeyPair.privateKey),
    };
  }
  const receiverPublicKeyX25519 = publicKeyEd25519ToX25519(receiverPublicKey);
  const senderPrivateKeyX25519 = await privateKeyEd25519ToX25519(
    senderKeyPair_.privateKey,
  );
  const senderPublicKeyX25519 = publicKeyFromPrivateKeyX25519(
    senderPrivateKeyX25519,
  );
  const sharedSecret = deriveSharedSecret(
    receiverPublicKeyX25519,
    senderPrivateKeyX25519,
  );
  const pseudoRandomKey = derivePseudoRandomKey(
    sharedSecret,
    senderPublicKeyX25519,
    receiverPublicKeyX25519,
  );
  const encryptionKey = deriveEncryptionKey(pseudoRandomKey);
  const keyJWEFactory = new jose.FlattenedEncrypt(
    Buffer.from(JSON.stringify(keyJWK), 'utf-8'),
  );
  // Because this is a custom ECDH-ES
  // we inject the spk manually into the protected header
  keyJWEFactory.setProtectedHeader({
    alg: 'dir',
    enc: 'A256GCM',
    cty: 'jwk+json',
    spk: await publicKeyToJWK(senderKeyPair_.publicKey),
  });
  const keyJWE = await keyJWEFactory.encrypt(encryptionKey);
  return keyJWE;
}

/**
 * Key Decapsulation Mechanism.
 * This decapsulates a JWE with a private key and produces a JWK.
 * This uses the same ECIES scheme as `decryptWithPrivateKey`.
 */
async function decapsulateWithPrivateKey(
  receiverPrivateKey: BufferSource | CryptoKey,
  keyJWE: JWEFlattened,
): Promise<JWK | undefined> {
  receiverPrivateKey = await exportPrivateKey(receiverPrivateKey);
  let header: jose.ProtectedHeaderParameters;
  try {
    header = jose.decodeProtectedHeader(keyJWE);
  } catch {
    return;
  }
  if (header.spk == null) {
    return;
  }
  const senderPublicKey = await publicKeyFromJWK(header.spk as JWK);
  if (senderPublicKey == null) {
    return;
  }
  const senderPublicKeyX25519 = publicKeyEd25519ToX25519(senderPublicKey);
  const receiverPrivateKeyX25519 = await privateKeyEd25519ToX25519(
    receiverPrivateKey,
  );
  const receiverPublicKeyX25519 = publicKeyFromPrivateKeyX25519(
    receiverPrivateKeyX25519,
  );
  const sharedSecret = deriveSharedSecret(
    senderPublicKeyX25519,
    receiverPrivateKeyX25519,
  );
  const pseudoRandomKey = derivePseudoRandomKey(
    sharedSecret,
    senderPublicKeyX25519,
    receiverPublicKeyX25519,
  );
  const encryptionKey = deriveEncryptionKey(pseudoRandomKey);
  let keyJWK: JWK;
  try {
    const result = await jose.flattenedDecrypt(keyJWE, encryptionKey);
    keyJWK = JSON.parse(bufferWrap(result.plaintext).toString('utf-8'));
  } catch {
    return;
  }
  return keyJWK;
}

/**
 * Checks if the public key is a point on the Ed25519 curve
 */
function validatePublicKey(publicKey: PublicKey): boolean {
  try {
    nobleEd25519.Point.fromHex(publicKey);
    return true;
  } catch {
    // If there's an error, it is an invalid public key
    return false;
  }
}

/**
 * Elliptic Curve Diffie Hellman Key Exchange.
 * This takes X25519 keys to perform ECDH.
 * On the sending side, use:
 *   - receiver's public key
 *   - ephemeral private key OR sender's private key
 * On the receiving side, use:
 *   - sender's public key
 *   - receiver's private key
 * It is possible that multiple public keys can produce the same shared secret.
 * Therefore the shared secret must be passed into KDF before being used.
 */
function deriveSharedSecret(
  publicKeyX25519: Buffer,
  privateKeyX25519: Buffer,
): Buffer {
  // Const publicKeyX25519 = publicKeyEd25519ToX25519(publicKey);
  // const privateKeyX25519 = await privateKeyEd25519ToX25519(privateKey);
  const sharedSecret = nobleEd25519.curve25519.scalarMult(
    privateKeyX25519,
    publicKeyX25519,
  );
  return bufferWrap(sharedSecret);
}

/**
 * Derive PRK from concatenated shared secret, sender public key and receiver
 * public key using HKDF. It is possible that multiple public keys can produce
 * the same shared secret. Therefore the sender and receiver public keys are
 * concatenated as an extra layer of security.
 * This should only be done once, and multiple
 * subkeys should be derived from the PRK.
 * The returned size is 64 bytes.
 */
function derivePseudoRandomKey(
  sharedSecret: Buffer,
  senderPublicKeyX25519: Buffer,
  receiverPublicKeyX25519: Buffer,
): Buffer {
  return bufferWrap(
    nobleHkdf.extract(
      nobleSha512,
      Buffer.concat([
        sharedSecret,
        senderPublicKeyX25519,
        receiverPublicKeyX25519,
      ]),
    ),
  );
}

/**
 * Derive encryption key from PRK using HKDF.
 * This key is suitable for AES256GCM encryption/decryption.
 * The returned size is 32 bytes.
 */
function deriveEncryptionKey(pseudoRandomKey: Buffer): Buffer {
  // Use `info` to expand to different keys
  return bufferWrap(
    nobleHkdf.expand(nobleSha256, pseudoRandomKey, 'encryption', 32),
  );
}

export {
  importPublicKey,
  importPrivateKey,
  importKeyPair,
  exportPublicKey,
  exportPrivateKey,
  exportKeyPair,
  publicKeyToNodeId,
  publicKeyFromNodeId,
  publicKeyToJWK,
  publicKeyFromJWK,
  privateKeyToJWK,
  privateKeyFromJWK,
  keyPairToJWK,
  keyPairFromJWK,
  publicKeyToPem,
  publicKeyFromPem,
  privateKeyToPem,
  privateKeyFromPem,
  keyPairToPem,
  keyPairFromPem,
  publicKeyFromPrivateKeyEd25519,
  publicKeyFromPrivateKeyX25519,
  publicKeyEd25519ToX25519,
  privateKeyEd25519ToX25519,
  keyPairEd25519ToX25519,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  signWithPrivateKey,
  verifyWithPublicKey,
  encapsulateWithPublicKey,
  decapsulateWithPrivateKey,
  validatePublicKey,
  deriveSharedSecret,
  derivePseudoRandomKey,
  deriveEncryptionKey,
};
