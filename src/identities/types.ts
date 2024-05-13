import type { POJO } from '../types';
import type {
  ProviderId,
  IdentityId,
  ProviderIdentityClaimId,
} from '../ids/types';
import type { SignedClaim } from '../claims/types';
import type { ClaimLinkIdentity } from '../claims/payloads';
import type { Opaque } from 'encryptedfs';

/**
 * Identity data contains key details about the
 * identity on the identity provider.
 */
type IdentityData = {
  providerId: ProviderId;
  identityId: IdentityId;
  name?: string;
  email?: string;
  url?: string;
};

/**
 * Identity claims wraps `SignedClaim<ClaimLinkIdentity>`.
 * The signed `claim` is what is published and also stored in the `Sigchain`.
 * Additional metadata `id` and `url` is provided by the identity provider.
 * These metadata properties would not be part of the signed claim.
 */
type IdentitySignedClaim = {
  id: ProviderIdentityClaimId;
  url?: string;
  claim: SignedClaim<ClaimLinkIdentity>;
};

/**
 * Authentication tokens to the identity provider
 *
 * If `accessTokenExpiresIn` is set to 0, the `accessToken` will never expire.
 * If `refreshTokenExpiresIn` is set to 0, the `refreshToken` will never expire.
 */
type ProviderToken = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
};

/**
 * Authentication tokens indexed by the `IdentityId`
 */
type ProviderTokens = Record<IdentityId, ProviderToken>;

type ProviderAuthenticateRequest = {
  url: string;
  data: POJO;
};

/**
 * Generic opaque string used to represent a pagination token
 * when making requests using an identity Provider.
 * Do not expect this string to have any particular meaning
 * outside of the Provider subclass it is used for.
 */
type ProviderPaginationToken = Opaque<'ProviderPaginationToken', string>;

export type {
  IdentityData,
  IdentitySignedClaim,
  ProviderToken,
  ProviderTokens,
  ProviderAuthenticateRequest,
  ProviderPaginationToken,
};

export type {
  ProviderId,
  IdentityId,
  ProviderIdentityId,
  ProviderIdentityIdEncoded,
  ProviderIdentityClaimId,
} from '../ids/types';
