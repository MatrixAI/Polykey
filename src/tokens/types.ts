import type { Opaque } from '../types';
import type { Signature, MAC } from '../keys/types';
import type { NodeIdEncoded, } from '../ids/types';

/**
 * Token header properties based on JWT specification
 */
type TokenProtectedHeader = {
  alg: 'EdDSA';
  kid: NodeIdEncoded;
  [key: string]: any;
} | {
  alg: 'BLAKE2b';
  [key: string]: any;
};

/**
 * Encoded token header
 * `base64url(json(TokenHeader))`
 */
type TokenProtectedHeaderEncoded = Opaque<'TokenProtectedHeaderEncoded', string>;

/**
 * Token based on JWT specification.
 * All properties are "claims" and they are all optional.
 * The entire POJO is put into the payload for signing.
 */
type TokenPayload = {
  iss?: string;
  sub?: string;
  aud?: string | Array<string>;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: any;
};

/**
 * Encoded token payload
 * `base64url(json(TokenPayload))`
 */
type TokenPayloadEncoded = Opaque<'TokenPayloadEncoded', string>;

/**
 * Signature can either be Ed25519 signature or BLAKE2b MAC code
 */
type TokenSignature = Signature | MAC;

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
 * Token header and signature encoded
 */
type TokenHeaderSignatureEncoded = {
  protected: TokenProtectedHeaderEncoded;
  signature: TokenSignatureEncoded;
};

/**
 * Token that is signed
 */
type TokenSigned = {
  payload: TokenPayload;
  signatures: Array<TokenHeaderSignature>;
};

/**
 * Token as a General JWS JSON
 */
type TokenSignedEncoded = {
  payload: TokenPayloadEncoded;
  signatures: Array<TokenHeaderSignatureEncoded>;
};

// This is a json encoded string containing providerid and identity id
// type ProviderIdentityId = Opaque<'ProviderIdentityId', string>;

// type TokenLinkNode = {
//   jti: ClaimIdEncoded;
//   iat: number;
//   iss: NodeIdEncoded;
//   sub: NodeIdEncoded;
//   nbf: number;
//   prev: string | null;
//   seq: number;
// };

// type TokenLinkIdentity {
//   jti: ClaimIdEncoded;
//   iat: number;
//   iss: NodeIdEncoded;
//   sub: ProviderIdentityId;
//   nbf: number;
//   prev: string | null;
//   seq: number;
// };

// type TokenNotification<T> = {
//   jti: NotificationIdEncoded;
//   iat: number;
//   iss: NodeIdEncoded;
//   sub: NodeIdEncoded;
//   data: T;
// };

// The TokenSigned is always a fully signed token
// But we need an intermediate format for these things
// To avoid having to base64url decode it all the time

// type TokenSigned = {
//   payload: {
//     hPrev: string | null; // Hash of the previous claim (null if first claim)
//     seq: number; // Sequence number of the claim
//     data: ClaimData; // Our custom payload data
//     iat: number; // Timestamp (initialised at JWS field)
//   };
//   signatures: Record<NodeIdEncoded, TokenSignature>; // Signee node ID -> claim signature
// };

// type ClaimData = ClaimLinkNode | ClaimLinkIdentity;
// // Cryptolink (to either a node or an identity)
// type ClaimLinkNode = {
//   type: 'node';
//   node1: NodeIdEncoded;
//   node2: NodeIdEncoded;
// };
// type ClaimLinkIdentity = {
//   type: 'identity';
//   node: NodeIdEncoded;
//   provider: ProviderId;
//   identity: IdentityId;
// };


export type {
  TokenPayload,
  TokenPayloadEncoded,
  TokenProtectedHeader,
  TokenProtectedHeaderEncoded,
  TokenSignature,
  TokenSignatureEncoded,
  TokenHeaderSignature,
  TokenHeaderSignatureEncoded,
  TokenSigned,
  TokenSignedEncoded,
};
