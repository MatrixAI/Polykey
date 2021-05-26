import type { Opaque } from '../types';
import type { LinkInfoIdentity } from '../links/types';
import type { GestaltKey } from '../gestalts/types';

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

type IdentityData = {
  providerId: ProviderId;
  identityId: IdentityId;
  name?: string;
  email?: string;
  url?: string;
};

type IdentityInfo = IdentityData & {
  links: IdentityLinks;
};

type IdentityLinks = {
  nodes: Record<GestaltKey, LinkInfoIdentity>;
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
  IdentityData,
  IdentityInfo,
  TokenData,
  ProviderTokens,
};
