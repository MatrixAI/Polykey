import type { POJO } from '@/types';
import type {
  ProviderId,
  IdentityId,
  TokenData,
  IdentityData,
  IdentityClaim,
  IdentityClaimId,
  ProviderAuthenticateRequest,
} from '@/identities/types';
import type { Claim } from '@/claims/types';
import { Provider } from '@/identities';
import * as identitiesUtils from '@/identities/utils';
import * as identitiesErrors from '@/identities/errors';

class TestProvider extends Provider {
  public readonly id: ProviderId;

  public linkIdCounter: number = 0;
  public users: Record<IdentityId | string, POJO>; // FIXME: the string union on VaultId is to prevent some false errors.
  public links: Record<IdentityClaimId | string, string>; // FIXME: the string union on VaultId is to prevent some false errors.
  protected userLinks: Record<
    IdentityId | string,
    Array<IdentityClaimId | string>
  >; // FIXME: the string union on VaultId is to prevent some false errors.
  protected userTokens: Record<string, IdentityId>;

  public constructor(providerId: ProviderId = 'test-provider' as ProviderId) {
    super();
    this.id = providerId;
    this.users = {
      test_user: {
        email: 'test_user@test.com',
        connected: ['connected_identity'],
      },
    };
    this.userTokens = {
      abc123: 'test_user' as IdentityId,
    };
    this.links = {};
    this.userLinks = {
      test_user: ['test_link'],
    };
  }

  public async *authenticate(): AsyncGenerator<
    ProviderAuthenticateRequest,
    IdentityId
  > {
    yield {
      url: 'test.com',
      data: {
        userCode: 'randomtestcode',
      },
    };
    // Always gives back the abc123 token
    const tokenData = { accessToken: 'abc123' };
    const identityId = await this.getIdentityId(tokenData);
    await this.putToken(identityId, tokenData);
    return identityId;
  }

  public async refreshToken(): Promise<TokenData> {
    throw new identitiesErrors.ErrorProviderUnimplemented();
  }

  public async getAuthIdentityIds(): Promise<Array<IdentityId>> {
    const providerTokens = await this.getTokens();
    return Object.keys(providerTokens) as Array<IdentityId>;
  }

  public async getIdentityId(tokenData: TokenData): Promise<IdentityId> {
    tokenData = await this.checkToken(tokenData);
    return this.userTokens[tokenData.accessToken];
  }

  public async getIdentityData(
    authIdentityId: IdentityId,
    identityId: IdentityId,
  ): Promise<IdentityData | undefined> {
    let tokenData = await this.getToken(authIdentityId);
    if (!tokenData) {
      throw new identitiesErrors.ErrorProviderUnauthenticated(
        `${authIdentityId} has not been authenticated`,
      );
    }
    tokenData = await this.checkToken(tokenData, authIdentityId);
    const user = this.users[identityId];
    if (!user) {
      return;
    }
    return {
      providerId: this.id,
      identityId: identityId,
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      url: user.url ?? undefined,
    };
  }

  public async *getConnectedIdentityDatas(
    authIdentityId: IdentityId,
    searchTerms: Array<string> = [],
  ): AsyncGenerator<IdentityData> {
    let tokenData = await this.getToken(authIdentityId);
    if (!tokenData) {
      throw new identitiesErrors.ErrorProviderUnauthenticated(
        `${authIdentityId} has not been authenticated`,
      );
    }
    tokenData = await this.checkToken(tokenData, authIdentityId);
    for (const [k, v] of Object.entries(this.users) as Array<
      [
        IdentityId,
        { name: string; email: string; url: string; connected: Array<string> },
      ]
    >) {
      if (k === authIdentityId) {
        continue;
      }
      if (!this.users[authIdentityId].connected.includes(k)) {
        continue;
      }
      const data: IdentityData = {
        providerId: this.id,
        identityId: k,
        name: v.name ?? undefined,
        email: v.email ?? undefined,
        url: v.url ?? undefined,
      };
      if (identitiesUtils.matchIdentityData(data, searchTerms)) {
        yield data;
      }
    }
    return;
  }

  public async publishClaim(
    authIdentityId: IdentityId,
    identityClaim: Claim,
  ): Promise<IdentityClaim> {
    let tokenData = await this.getToken(authIdentityId);
    if (!tokenData) {
      throw new identitiesErrors.ErrorProviderUnauthenticated(
        `${authIdentityId} has not been authenticated`,
      );
    }
    tokenData = await this.checkToken(tokenData, authIdentityId);
    const linkId = this.linkIdCounter.toString() as IdentityClaimId;
    this.linkIdCounter++;
    this.links[linkId] = JSON.stringify(identityClaim);
    this.userLinks[authIdentityId] = this.userLinks[authIdentityId]
      ? this.userLinks[authIdentityId]
      : [];
    const links = this.userLinks[authIdentityId];
    links.push(linkId);
    return {
      ...identityClaim,
      id: linkId,
      url: 'test.com',
    };
  }

  public async getClaim(
    authIdentityId: IdentityId,
    claimId: IdentityClaimId,
  ): Promise<IdentityClaim | undefined> {
    let tokenData = await this.getToken(authIdentityId);
    if (!tokenData) {
      throw new identitiesErrors.ErrorProviderUnauthenticated(
        `${authIdentityId} has not been authenticated`,
      );
    }
    tokenData = await this.checkToken(tokenData, authIdentityId);
    const linkClaimData = this.links[claimId];
    if (!linkClaimData) {
      return;
    }
    const linkClaim = this.parseClaim(linkClaimData);
    if (!linkClaim) {
      return;
    }
    return {
      ...linkClaim,
      id: claimId,
      url: 'test.com',
    };
  }

  public async *getClaims(
    authIdentityId: IdentityId,
    identityId: IdentityId,
  ): AsyncGenerator<IdentityClaim> {
    let tokenData = await this.getToken(authIdentityId);
    if (!tokenData) {
      throw new identitiesErrors.ErrorProviderUnauthenticated(
        `${authIdentityId} has not been authenticated`,
      );
    }
    tokenData = await this.checkToken(tokenData, authIdentityId);
    const claimIds = this.userLinks[identityId] ?? [];
    for (const claimId of claimIds) {
      const claimInfo = await this.getClaim(
        authIdentityId,
        claimId as IdentityClaimId,
      );
      if (claimInfo) {
        yield claimInfo;
      }
    }
  }
}

export default TestProvider;
