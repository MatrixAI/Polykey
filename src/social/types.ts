import type { IdentityKey, ProviderKey } from '../types';

type IdentityInfo = {
  key: IdentityKey;
  provider: ProviderKey;
  name?: string;
  email?: string;
  url?: string;
};

type AuthCodeData =
  | {
      status: 'success';
      code: string;
      state?: string;
    }
  | {
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

export { IdentityInfo, AuthCodeData, TokenData };
