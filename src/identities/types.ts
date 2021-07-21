import type { Opaque } from '../types';
import type { Claim } from '../claims/types';

/**
 * Provider Id should be the domain of the identity provider
 */
type ProviderId = Opaque<'ProviderId', string>;

/**
 * Identity Id must uniquely identify the identity on the identity provider.
 * It must be the key that is used to look up the identity.
 * If the provider uses a non-string type, make the necessary conversions.
 */
type IdentityId = Opaque<'IdentityId', string>;

/**
 * A unique identifier for the claim itself, found on the identity provider.
 * e.g. the gist ID on GitHub
 * TODO: REMOVE: This is the new LinkId (but only for IdentityClaim - NodeClaims
 * will not have a NodeClaimId?)
 */
type IdentityClaimId = Opaque<'IdentityClaimId', string>;

/**
 * A wrapper for the Claim itself, used for our own internal usage of a cryptolink
 * to an identity (i.e. contains extra internal metadata: id and url).
 * It wouldn't make sense for the ClaimLinkIdentity within claims domain to
 * contain the id and URL of the claim, as this shouldn't be published with the
 * claim.
 * TODO: REMOVE: this is the new LinkInfoIdentity
 */
type IdentityClaim = Claim & {
  id: IdentityClaimId;
  url?: string;
};

/**
 * A map of claims from an identity to a keynode.
 */
type IdentityClaims = Record<IdentityClaimId, IdentityClaim>;

type IdentityData = {
  providerId: ProviderId;
  identityId: IdentityId;
  name?: string;
  email?: string;
  url?: string;
};

/**
 * Data related to a particular identity on an identity provider.
 * claims: a map of IdentityClaimId to an (identity -> keynode) claim
 */
type IdentityInfo = IdentityData & {
  claims: IdentityClaims;
};

type ProviderTokens = Record<IdentityId, TokenData>;

type TokenData = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
};

export type {
  ProviderId,
  IdentityId,
  IdentityClaimId,
  IdentityClaim,
  IdentityClaims,
  IdentityData,
  IdentityInfo,
  TokenData,
  ProviderTokens,
};
