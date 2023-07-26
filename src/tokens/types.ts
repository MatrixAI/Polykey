import type { Opaque, JSONValue } from '../types';
import type { Signature, MAC } from '../keys/types';
import type { NodeIdEncoded } from '../ids/types';

/**
 * Token based on JWT specification.
 * All properties are "claims" and they are all optional.
 * Note that the properties here have to be strict JSON values.
 * This is because tokens are going to be JSON encoded.
 * It avoids confusion if input types are not allowed to be rich.
 */
type TokenPayload = {
  jti?: string;
  iat?: number;
  nbf?: number;
  exp?: number;
  iss?: string;
  sub?: string;
  aud?: string | Array<string>;
  // The `undefined` is a hack to include the optional reserved properties
  [key: string]: JSONValue | undefined;
};

/**
 * Encoded token payload
 * `base64url(json(TokenPayload))`
 */
type TokenPayloadEncoded = Opaque<'TokenPayloadEncoded', string>;

/**
 * Token header properties based on JWT specification
 */
type TokenProtectedHeader =
  | {
      alg: 'EdDSA';
      kid: NodeIdEncoded;
      [key: string]: JSONValue;
    }
  | {
      alg: 'BLAKE2b';
      [key: string]: JSONValue;
    };

/**
 * Encoded token header
 * `base64url(json(TokenHeader))`
 */
type TokenProtectedHeaderEncoded = Opaque<
  'TokenProtectedHeaderEncoded',
  string
>;

/**
 * Signature can either be Ed25519 signature or BLAKE2b MAC code
 */
type TokenSignature = Signature | MAC;

/**
 * Token signature in JSON
 */
type TokenSignatureJSON = {
  type: 'Buffer';
  data: Array<number>;
};

/**
 * Encoded token signature
 * `base64url(TokenSignature)`
 */
type TokenSignatureEncoded = Opaque<'TokenSignatureEncoded', string>;

/**
 * Token header and signature put together as a composite record.
 */
type TokenHeaderSignature = {
  protected: TokenProtectedHeader;
  signature: TokenSignature;
};

/**
 * Token header and signature in JSON
 */
type TokenHeaderSignatureJSON = Omit<TokenHeaderSignature, 'signature'> & {
  signature: TokenSignatureJSON;
};

/**
 * Token header and signature encoded
 */
type TokenHeaderSignatureEncoded = {
  protected: TokenProtectedHeaderEncoded;
  signature: TokenSignatureEncoded;
};

/**
 * Token that is signed
 */
type SignedToken<P extends TokenPayload = TokenPayload> = {
  payload: P;
  signatures: Array<TokenHeaderSignature>;
};

/**
 * Token that is signed in JSON
 */
type SignedTokenJSON<P extends TokenPayload = TokenPayload> = Omit<
  SignedToken<P>,
  'signatures'
> & {
  signatures: Array<TokenHeaderSignatureJSON>;
};

/**
 * Token as a General JWS JSON
 */
type SignedTokenEncoded = {
  payload: TokenPayloadEncoded;
  signatures: Array<TokenHeaderSignatureEncoded>;
};

export type {
  TokenPayload,
  TokenPayloadEncoded,
  TokenProtectedHeader,
  TokenProtectedHeaderEncoded,
  TokenSignature,
  TokenSignatureJSON,
  TokenSignatureEncoded,
  TokenHeaderSignature,
  TokenHeaderSignatureJSON,
  TokenHeaderSignatureEncoded,
  SignedToken,
  SignedTokenJSON,
  SignedTokenEncoded,
};
