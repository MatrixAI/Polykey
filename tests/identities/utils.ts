import type { IdentityId, ProviderId } from '@/ids';
import type { ProviderToken } from '@/identities/types';
import { fc } from '@fast-check/jest';

const providerTokenArb = fc
  .record({
    accessToken: fc.string({ minLength: 10, maxLength: 32 }),
    refreshToken: fc.string({ minLength: 0, maxLength: 32 }),
    accessTokenExpiresIn: fc.integer(),
    refreshTokenExpiresIn: fc.integer(),
  })
  .map((item) => item as ProviderToken);

const identitiyIdArb = fc.string().map((item) => item as IdentityId);

const providerIdArb = fc.string().map((item) => item as ProviderId);

export { providerTokenArb, identitiyIdArb, providerIdArb };
