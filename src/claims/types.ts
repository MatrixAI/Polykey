import type { Opaque } from '../types';
import type {
  TokenPayload,
  TokenHeaderSignature,
  SignedToken,
  SignedTokenJSON,
  SignedTokenEncoded,
  TokenPayloadEncoded,
} from '../tokens/types';
import type { ClaimIdEncoded } from '../ids/types';

/**
 * Claim is structured data based on TokenPayload
 * The claim can contain arbitrary data except for the default properties.
 * All claims are stored in the `Sigchain`.
 */
type Claim = TokenPayload & ClaimDefault;

/**
 * The `ClaimIdEncoded` corresponds to the `ClaimId` used
 * in the `Sigchain`.
 * The `iat` and `nbf` corresponds to the unix timestamp
 * where it was created by the `Sigchain`.
 * The `prevDigest` is the multibase multihash digest of
 * the previous claim by the same node that created this claim.
 * The `seq` is the ordinal and cardinal counter of the claim
 * according to the sigchain.
 */
type ClaimDefault = {
  jti: ClaimIdEncoded;
  iat: number;
  nbf: number;
  seq: number;
  prevClaimId: ClaimIdEncoded | null;
  prevDigest: string | null;
};

type ClaimEncoded = TokenPayloadEncoded;

type ClaimHeaderSignature = TokenHeaderSignature;

/**
 * Signed claim is just a signed token of `Claim`
 */
type SignedClaim<P extends Claim = Claim> = SignedToken<P>;

type SignedClaimJSON<P extends Claim = Claim> = SignedTokenJSON<P>;

type SignedClaimEncoded = SignedTokenEncoded;

type SignedClaimDigestEncoded = Opaque<'SignedClaimDigestEncoded', string>;

export type {
  Claim,
  ClaimDefault,
  ClaimEncoded,
  ClaimHeaderSignature,
  SignedClaim,
  SignedClaimJSON,
  SignedClaimEncoded,
  SignedClaimDigestEncoded,
};

export type { ClaimId, ClaimIdString, ClaimIdEncoded } from '../ids/types';
