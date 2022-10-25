import type { Opaque } from '../types';
import type { Digest } from '../keys/types';
import type {
  TokenPayload,
  TokenHeaderSignature,
  SignedToken,
} from '../tokens/types';
import type { ProviderIdentityId } from '../identities/types';
import type {
  ClaimId,
  ClaimIdString,
  ClaimIdEncoded,
  NodeIdEncoded,
} from '../ids/types';
import type { Signature } from '../keys/types';
// import type { GeneralJWS, FlattenedJWSInput } from 'jose';

/**
 * Claim is structured data based on TokenPayload
 * The claim can contain arbitrary data.
 * All claims are stored in the `Sigchain`.
 * The `ClaimIdEncoded` corresponds to the `ClaimId` used
 * in the `Sigchain`.
 * The `iat` and `nbf` corresponds to the unix timestamp
 * where it was created by the `Sigchain`.
 * The `prev` is the multibase multihash digest of
 * the previous claim by the same node that created this claim.
 * The `seq` is the ordinal and cardinal counter of the claim
 * according to the sigchain.
 */
type Claim = TokenPayload & ClaimDefault;

type ClaimDefault = {
  jti: ClaimIdEncoded;
  iat: number;
  nbf: number;
  seq: number;
  prevClaimId: ClaimIdEncoded | null;
  prevDigest: string | null;
};

type ClaimHeaderSignature = TokenHeaderSignature;

type SignedClaim<P extends Claim = Claim> = SignedToken<P>;

type SignedClaimDigest = Digest<'blake2b-256'>;

type SignedClaimDigestEncoded = Opaque<'SignedClaimDigestEncoded', string>;


// Now the sigchain may do a couple different things
// a full token contains signatures
// but we don't need to necessarily store the signatures in the same spot
// we can decompose it in the Sigchain
// it just needs to be presented above
// that's all there is to it

// AJV validation can be applied not to the
// the full package obviously can contain both
// because it is the FULL message that has to be used


// /**
//  * A JSON-ified, decoded version of the ClaimEncoded type.
//  * Assumes the Claim was created through claims.utils::createClaim()
//  * See claims.utils::decodeClaim() for construction.
//  * The signatures field is expected to contain:
//  *   - 1 signature if its a node -> identity claim (only signed by node)
//  *   - 2 signatures if its a node -> node claim (signed by node1 and node2)
//  */
// type Claim = {
//   payload: {
//     hPrev: string | null; // Hash of the previous claim (null if first claim)
//     seq: number; // Sequence number of the claim
//     data: ClaimData; // Our custom payload data
//     iat: number; // Timestamp (initialised at JWS field)
//   };
//   signatures: Record<NodeIdEncoded, SignatureData>; // Signee node ID -> claim signature
// };

/**
 * A dummy type for Claim, using a string as the record key.
 * Ajv is unable to validate the JSON schema with NodeId set as the record key.
 * This is only used in src/claims/schema.ts.
 */
// type ClaimValidation = Omit<Claim, 'signatures'> & {
//   signatures: Record<string, SignatureData>; // Replaces NodeId key with string
// };

// /**
//  * A signature of a claim (signing the header + payload).
//  */
// type SignatureData = {
//   signature: string;
//   header: {
//     alg: string; // Signing algorithm (e.g. RS256 for RSA keys)
//     kid: NodeIdEncoded; // Node ID of the signing keynode
//   };
// };

/**
 * A ClaimEncoded is an encoded version of Claim. It is exactly a JWS using
 * General JSON serialization. For our context, it is a claim (e.g. a cryptolink)
 * made by a node and stored in its append-only sigchain or on an identity
 * platform.
 * See claims.utils::createClaim() for its construction.
 * Its structure is:
 *  - payload: a base64 encoded string the JSON payload
 *  - signatures: an array of objects containing:
 *      - signature: a base64 encoded signature (signed on header + payload)
 *      - protected: a base64 encoded header (for our purpose, of alg + kid)
 */
// type ClaimEncoded = Opaque<'ClaimEncoded', string>;
// type ClaimEncoded = GeneralJWS;

/**
 * An encoded intermediary claim with a single signature.
 * Can be sent across GRPC to be signed by another keynode.
 * Currently used for establishing node to node claims by cross-signing the claim
 * with both nodes.
 */
// type ClaimIntermediary = Omit<GeneralJWS, 'signatures'> & {
//   signature: Omit<FlattenedJWSInput, 'payload'>;
// };

// Claims can currently only be a cryptolink to a node or identity
// type ClaimData = ClaimLinkNode | ClaimLinkIdentity;

// Cryptolink (to either a node or an identity)
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

// TODO: A better way of creating this enum-like type (used in 'type' field of
// all ClaimData types) rather than manually adding the type here.
// type ClaimType = 'node' | 'identity';


// What kind of claims are we talking about here
// we are just saying there is a shared "link" tokens
// between identities and sigchain
// are we also saying there are other kinds of claim tokens here
// if so, this can be more generic
// but then the idea is that they need to be imported somewhere
// neither identities nor sigchain makes sense to keep this separate

// well if that is the case
// then this location is still claims
// but it just has different kinds of claims

export type {
  Claim,
  ClaimDefault,
  // ClaimProtectedHeader,
  // ClaimSignature,
  ClaimHeaderSignature,
  SignedClaim,
  SignedClaimDigest,
  SignedClaimDigestEncoded,



  // Claim,
  // ClaimValidation,
  // ClaimIntermediary,
  // SignatureData,
  // ClaimId,
  // ClaimIdString,
  // ClaimIdEncoded,
  // ClaimEncoded,
  // ClaimData,
  // ClaimLinkNode,
  // ClaimLinkIdentity,
  // ClaimType,
};

export type {
  ClaimId,
  ClaimIdString,
  ClaimIdEncoded,
} from '../ids/types';
