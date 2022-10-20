import type {
  NodeIdEncoded,
  NotificationIdEncoded,
  ClaimIdEncoded
} from '../ids/types';
// import type { ProviderId, IdentityId } from '../identities/types';
import { Opaque, POJO } from 'encryptedfs';



// /**
//  * TokenSigned is like JWS
//  */
// type TokenSigned

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

type TokenSignature = Opaque<'TokenSignature', {
  protected: string;
  signature: string;
}>;

/**
 * Token header properties based on JWT specification
 */
type TokenHeader = {
  alg: 'EdDSA';
  kid: NodeIdEncoded;
  [key: string]: any;
} | {
  alg: 'BLAKE2b';
  [key: string]: any;
};

/**
 * Token serialised as a General JWS JSON
 */
type TokenSigned = {
  payload: string;
  signatures: Array<TokenSignature>;
};


// OK I see it now
// we actually do have a support for blke2b
// blake2b IS a HMAC alternative
// so it can be used instead
// and of course we only have HS512256
// which is kind of funny


// Wait why are we not using the
// the protected header?
// header: {
//   // These are the only algorithms we support (due to libsodium)
//   alg: 'EdDSA' | 'BLAKE2b' | 'HS512256';
//   kid: NodeIdEncoded;
// };


// the above is the "processed token"
// the actual signed structure is a bit different

// i think the above is for HS256
// but the problem is that we don't actually have the hmacsha256 nor hmacsha512
// damn

// i dont think sodium-native exposes the hmac


// not every token here or payload
// will have a relevant jti

// a "sigchain" claim
// remember you have different kinds of claims
// so you can define them willy nilly

// This is a json encoded string containing providerid and identity id
// type ProviderIdentityId = Opaque<'ProviderIdentityId', string>;

// type TokenClaimNode = {
//   jti: ClaimIdEncoded;
//   iat: number;
//   iss: NodeIdEncoded;
//   sub: NodeIdEncoded;
//   nbf: number;
//   prev: string | null;
//   seq: number;
// };

// type TokenClaimIdentity {
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



// // Notification token
// type TokenNotification = Token & {

// };

// // This doesn't necessraily have a sequence
// // primarily because a "token" is posted in 2 places
// // between the idnetity

// // Identity token (used for identities... and posted on third party identities)
// type TokenIdentity = Token & {

// };

// // Claim token (used inside the sighcain)

// // a full token claim
// // has to use the data here
// // we want to allow ANY kind of data right?
// // it's really arbitrary data
// // it literally could be anything
// // but if we allow anything, then anything must check what is available
// // we do have to say it is a "typed" structure
// // and not just any data at all!!

// type TokenClaim = Token & {
//   payload: {
//     hPrev: string | null; // Hash of the previous claim (null if first claim)
//     seq: number; // Sequence number of the claim
//     data: ClaimData; // Our custom payload data
//     iat: number; // Timestamp (initialised at JWS field)
//   };
//   signatures: Record<NodeIdEncoded, TokenSignature>; // Signee node ID -> claim signature
// };


// // signature: 'base64urlencodedstring';
// // header: { alg: 'EdDSA', kid: 'NODEID' };

// type TokenSignature = {
//   signature: string;
//   header: {
//     alg: string; // Signing algorithm (e.g. RS256 for RSA keys)
//     kid: NodeIdEncoded; // Node ID of the signing keynode
//   };
// };

export type {
  TokenPayload,
  TokenHeader,
  TokenSigned,
  // TokenClaim,
  TokenSignature,
};
