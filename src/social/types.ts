/**
 * Provider key should be the domain of the identity provider
 */
type ProviderKey = string;

/**
 * Identity key must uniquely identify the identity on the identity provider.
 * It must be the key that is used to look up the identity.
 * If the provider uses a non-string type, make the necessary conversions.
 */
type IdentityKey = string;

/**
 * Link key must uniquely identify the cryptolink on the identity provider.
 * The provider may not support creating multiple links.
 * In some cases the link is also the same as the identity key
 * if the identity also stores the cryptolink.
 */
type LinkKey = string;

type IdentityInfo = {
  key: IdentityKey;
  provider: ProviderKey;
  name?: string;
  email?: string;
  url?: string;
};

type LinkClaim = {
  keynode: string;
  identity: IdentityKey;
  provider: ProviderKey;
  dateIssued: string;
  signature: string;
};

type LinkInfo = LinkClaim & {
  key: LinkKey;
  url?: string;
};

type AuthCodeData = {
  status: 'success';
  code: string;
  state?: string;
} | {
  status: 'failure';
  error: string;
  errorDescription?: string;
};

type TokenData = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresIn?: string;
  refreshTokenExpiresIn?: string;
};

export {
  ProviderKey,
  IdentityKey,
  LinkKey,
  IdentityInfo,
  LinkClaim,
  LinkInfo,
  AuthCodeData,
  TokenData
};
