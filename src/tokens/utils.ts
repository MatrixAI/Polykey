import type { TokenPayload, TokenHeader, TokenSignature } from './types';
import type { PrivateKey, Key, Digest, DigestFormats, KeyPair, PublicKey } from '../keys/types';
import type { POJO } from  '../types';
import canonicalize from 'canonicalize';
import * as keysUtils from '../keys/utils';
import * as ids from '../ids';

// function hashToken<F extends DigestFormats>(
//   token: Token,
//   format: F
// ): Digest<F> {
//   const tokenString = canonicalize(token)!;
//   const tokenDigest = keysUtils.hash(
//     Buffer.from(tokenString, 'utf-8'),
//     format
//   );
//   return tokenDigest;
// }


function signWithPrivateKey(
  privateKeyOrKeyPair: PrivateKey | KeyPair,
  token: TokenPayload,
  additionalProtectedHeader: POJO = {},
): TokenSignature {
  let keyPair: KeyPair;
  if (Buffer.isBuffer(privateKeyOrKeyPair)) {
    const publicKey = keysUtils.publicKeyFromPrivateKeyEd25519(privateKeyOrKeyPair);
    keyPair = keysUtils.makeKeyPair(publicKey, privateKeyOrKeyPair);
  } else {
    keyPair = privateKeyOrKeyPair;
  }
  const protectedHeader = {
    ...additionalProtectedHeader,
    alg: 'EdDSA',
    kid: ids.encodeNodeId(keysUtils.publicKeyToNodeId(keyPair.publicKey))
  };
  const tokenJSON = canonicalize(token)!;
  const protectedHeaderJSON = canonicalize(protectedHeader)!
  const payloadEncoded = Buffer.from(
    tokenJSON,
    'utf-8'
  ).toString('base64url');
  const protectedHeaderEncoded = Buffer.from(
    protectedHeaderJSON,
    'utf-8'
  ).toString('base64url');
  const data = Buffer.from(payloadEncoded + '.' + protectedHeaderEncoded, 'utf-8');
  const signature = keysUtils.signWithPrivateKey(keyPair, data);
  const signatureEncoded = signature.toString('base64url');
  return {
    protected: protectedHeaderEncoded,
    signature: signatureEncoded
  } as TokenSignature;
}

function signWithKey(
  key: Key,
  token: TokenPayload,
  additionalProtectedHeader: POJO = {}
): TokenSignature {
  const protectedHeader = {
    ...additionalProtectedHeader,
    alg: 'BLAKE2b'
  };
  const tokenJSON = canonicalize(token)!;
  const protectedHeaderJSON = canonicalize(protectedHeader)!
  const payloadEncoded = Buffer.from(
    tokenJSON,
    'utf-8'
  ).toString('base64url');
  const protectedHeaderEncoded = Buffer.from(
    protectedHeaderJSON,
    'utf-8'
  ).toString('base64url');
  const data = Buffer.from(payloadEncoded + '.' + protectedHeaderEncoded, 'utf-8');
  const signature = keysUtils.macWithKey(key, data);
  const signatureEncoded = signature.toString('base64url');
  return {
    protected: protectedHeaderEncoded,
    signature: signatureEncoded
  } as TokenSignature;
}

export {
  // hashToken
  signWithPrivateKey,
  signWithKey,
};
