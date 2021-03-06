import type {
  IdentityId,
  ProviderId,
  TokenData,
  IdentityData,
  IdentityClaim,
  IdentityClaimId,
  ProviderAuthenticateRequest,
} from '../../types';
import type { Claim } from '../../../claims/types';
import { fetch, Request, Headers } from 'cross-fetch';
import cheerio from 'cheerio';
import Logger from '@matrixai/logger';
import Provider from '../../Provider';
import * as identitiesErrors from '../../errors';
import * as identitiesUtils from '../../utils';
import { sleep } from '../../../utils';

class GitHubProvider extends Provider {
  public readonly id = 'github.com' as ProviderId;
  public readonly clientId: string;

  protected readonly apiUrl: string = 'https://api.github.com';
  protected readonly gistFilename: string = 'cryptolink.txt';
  protected readonly gistDescription: string =
    'Cryptolink between Polykey Keynode and Github Identity';
  protected readonly scope: string = 'gist user:email read:user';
  protected logger: Logger;

  public constructor({
    clientId,
    logger,
  }: {
    clientId: string;
    logger?: Logger;
  }) {
    super();
    this.logger = logger ?? new Logger(this.constructor.name);
    this.clientId = clientId;
  }

  public async *authenticate(
    timeout: number = 120000,
  ): AsyncGenerator<ProviderAuthenticateRequest, IdentityId> {
    const params = new URLSearchParams();
    params.set('client_id', this.clientId);
    params.set('scope', this.scope);
    const request = new Request(
      `https://github.com/login/device/code?${params.toString()}`,
      {
        method: 'POST',
      },
    );
    this.logger.info('Sending authentication request to GitHub');
    const response = await fetch(request);
    if (!response.ok) {
      throw new identitiesErrors.ErrorProviderAuthentication(
        `Provider device code request responded with: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.text();
    const authParams = new URLSearchParams(data);
    const deviceCode = authParams.get('device_code');
    // Convert seconds to milliseconds
    let pollInterval = parseInt(authParams.get('interval') ?? '1') * 1000;
    const userCode = authParams.get('user_code');
    if (!deviceCode || !userCode) {
      throw new identitiesErrors.ErrorProviderAuthentication(
        `Provider device code request did not return the device_code or the user_code`,
      );
    }
    yield {
      url: 'https://github.com/login/device',
      data: {
        // This code needs to be used by the user to manually enter
        userCode,
      },
    };
    // Promise.race does not cancel unfinished promises
    // the finished condition variable is needed to stop the pollAccessToken process
    // the pollTimer is needed to stop the pollTimerP
    let pollTimedOut = false;
    let pollTimer;
    const pollTimerP = new Promise<void>((r) => {
      pollTimer = setTimeout(() => {
        pollTimedOut = true;
        r();
      }, timeout);
    });
    const that = this;
    const pollAccessToken = async () => {
      const payload = new URLSearchParams();
      payload.set('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
      payload.set('client_id', that.clientId);
      payload.set('device_code', deviceCode);
      const request = new Request(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: payload.toString(),
        },
      );
      while (true) {
        if (pollTimedOut) {
          this.logger.info('Poll has timed out');
          return;
        }
        const response = await fetch(request);
        if (!response.ok) {
          throw new identitiesErrors.ErrorProviderAuthentication(
            `Provider responded with ${response.status} ${response.statusText}`,
          );
        }
        let data;
        try {
          data = await response.json();
        } catch (e) {
          throw new identitiesErrors.ErrorProviderAuthentication(
            'Provider access token response is not valid JSON',
            { cause: e },
          );
        }
        if (data.error) {
          if (data.error === 'authorization_pending') {
            await sleep(pollInterval);
            continue;
          } else if (data.error === 'slow_down') {
            // Convert seconds to milliseconds
            pollInterval = parseInt(data.get('interval') ?? '1') * 1000;
            await sleep(pollInterval);
            continue;
          }
          throw new identitiesErrors.ErrorProviderAuthentication(
            `Provider access token request responded with: ${data.error}`,
          );
        }
        const tokenData = {
          accessToken: data.access_token,
        };
        return tokenData;
      }
    };
    let tokenData;
    try {
      tokenData = await Promise.race([pollAccessToken(), pollTimerP]);
    } finally {
      clearTimeout(pollTimer);
    }
    if (tokenData == null) {
      throw new identitiesErrors.ErrorProviderAuthentication(
        `Provider authentication flow timed out`,
      );
    }
    const identityId = await this.getIdentityId(tokenData);
    await this.putToken(identityId, tokenData);
    this.logger.info('Completed authentication with GitHub');
    return identityId;
  }

  public async refreshToken(): Promise<TokenData> {
    throw new identitiesErrors.ErrorProviderUnimplemented();
  }

  public async getAuthIdentityIds(): Promise<Array<IdentityId>> {
    const providerTokens = await this.getTokens();
    return Object.keys(providerTokens) as Array<IdentityId>;
  }

  /**
   * Gets own identity key.
   * GitHub has user ids, but it is an implementation detail.
   * Usernames on GitHub are changeable.
   */
  public async getIdentityId(tokenData: TokenData): Promise<IdentityId> {
    tokenData = await this.checkToken(tokenData);
    const request = this.createRequest(
      `${this.apiUrl}/user`,
      {
        method: 'GET',
      },
      tokenData,
    );
    const response = await fetch(request);
    if (!response.ok) {
      if (response.status === 401) {
        throw new identitiesErrors.ErrorProviderUnauthenticated(
          `Invalid access token`,
        );
      }
      throw new identitiesErrors.ErrorProviderCall(
        `Provider responded with ${response.status} ${response.statusText}`,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new identitiesErrors.ErrorProviderCall(
        `Provider response body is not valid JSON`,
        { cause: e },
      );
    }
    return data.login;
  }

  /**
   * Get identity data from a username.
   */
  public async getIdentityData(
    authIdentityId: IdentityId,
    identityId: IdentityId,
  ): Promise<IdentityData | undefined> {
    let tokenData = await this.getToken(authIdentityId);
    if (tokenData == null) {
      throw new identitiesErrors.ErrorProviderUnauthenticated(
        `${authIdentityId} has not been authenticated`,
      );
    }
    tokenData = await this.checkToken(tokenData, authIdentityId);
    const request = this.createRequest(
      `${this.apiUrl}/users/${identityId}`,
      {
        method: 'GET',
      },
      tokenData,
    );
    const response = await fetch(request);
    if (!response.ok) {
      if (response.status === 404) {
        return;
      }
      if (response.status === 401) {
        throw new identitiesErrors.ErrorProviderUnauthenticated(
          `Invalid access token`,
        );
      }
      throw new identitiesErrors.ErrorProviderCall(
        `Provider responded with ${response.status} ${response.statusText}`,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new identitiesErrors.ErrorProviderCall(
        `Provider response body is not valid JSON`,
        { cause: e },
      );
    }
    return {
      providerId: this.id,
      identityId: identityId,
      name: data.name ?? undefined,
      email: data.email ?? undefined,
      url: data.html_url ?? undefined,
    };
  }

  /**
   * Gets connected IdentityData from following and follower connections.
   */
  public async *getConnectedIdentityDatas(
    authIdentityId: IdentityId,
    searchTerms: Array<string> = [],
  ): AsyncGenerator<IdentityData> {
    let tokenData = await this.getToken(authIdentityId);
    if (tokenData == null) {
      throw new identitiesErrors.ErrorProviderUnauthenticated(
        `${authIdentityId} has not been authenticated`,
      );
    }
    tokenData = await this.checkToken(tokenData, authIdentityId);
    let pageNum = 1;
    while (true) {
      const request = this.createRequest(
        `${this.apiUrl}/user/following?per_page=100&page=${pageNum}`,
        {
          method: 'GET',
        },
        tokenData,
      );
      const response = await fetch(request);
      if (!response.ok) {
        if (response.status === 401) {
          throw new identitiesErrors.ErrorProviderUnauthenticated(
            `Invalid access token`,
          );
        }
        throw new identitiesErrors.ErrorProviderCall(
          `Provider responded with ${response.status} ${response.statusText}`,
        );
      }
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new identitiesErrors.ErrorProviderCall(
          `Provider response body is not valid JSON`,
          { cause: e },
        );
      }
      for (const item of data) {
        const identityData = await this.getIdentityData(
          authIdentityId,
          item.login,
        );
        if (
          identityData &&
          identitiesUtils.matchIdentityData(identityData, searchTerms)
        ) {
          yield identityData;
        }
      }
      if (data.length === 0) {
        break;
      } else {
        pageNum = pageNum + 1;
      }
    }
    pageNum = 1;
    while (true) {
      const request = this.createRequest(
        `${this.apiUrl}/user/followers?per_page=100&page=${pageNum}`,
        {
          method: 'GET',
        },
        tokenData,
      );
      const response = await fetch(request);
      if (!response.ok) {
        if (response.status === 401) {
          throw new identitiesErrors.ErrorProviderUnauthenticated(
            `Invalid access token`,
          );
        }
        throw new identitiesErrors.ErrorProviderCall(
          `Provider responded with ${response.status} ${response.statusText}`,
        );
      }
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new identitiesErrors.ErrorProviderCall(
          `Provider response body is not valid JSON`,
          { cause: e },
        );
      }
      for (const item of data) {
        const identityData = await this.getIdentityData(
          authIdentityId,
          item.login,
        );
        if (
          identityData &&
          identitiesUtils.matchIdentityData(identityData, searchTerms)
        ) {
          yield identityData;
        }
      }
      if (data.length === 0) {
        break;
      } else {
        pageNum = pageNum + 1;
      }
    }
  }

  /**
   * Publish an identity claim.
   * These are published as gists.
   */
  public async publishClaim(
    authIdentityId: IdentityId,
    identityClaim: Claim, // Give claim we want to publush
  ): Promise<IdentityClaim> {
    let tokenData = await this.getToken(authIdentityId);
    if (tokenData == null) {
      throw new identitiesErrors.ErrorProviderUnauthenticated(
        `${authIdentityId} has not been authenticated`,
      );
    }
    tokenData = await this.checkToken(tokenData, authIdentityId);
    const payload = {
      description: this.gistDescription,
      files: {
        [this.gistFilename]: {
          content: JSON.stringify(identityClaim),
        },
      },
      public: true,
    };
    const request = this.createRequest(
      `${this.apiUrl}/gists`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      tokenData,
    );
    const response = await fetch(request);
    if (!response.ok) {
      if (response.status === 401) {
        throw new identitiesErrors.ErrorProviderUnauthenticated(
          `Invalid access token`,
        );
      }
      throw new identitiesErrors.ErrorProviderCall(
        `Provider responded with ${response.status} ${response.statusText}`,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new identitiesErrors.ErrorProviderCall(
        `Provider response body is not valid JSON`,
        { cause: e },
      );
    }
    return {
      ...identityClaim,
      id: data.id,
      url: data.html_url ?? undefined,
    };
  }

  /**
   * Gets the identity claim.
   * GitHub identity claims are published as gists.
   * The claimId is the gist id
   */
  public async getClaim(
    authIdentityId: IdentityId,
    claimId: IdentityClaimId,
  ): Promise<IdentityClaim | undefined> {
    let tokenData = await this.getToken(authIdentityId);
    if (tokenData == null) {
      throw new identitiesErrors.ErrorProviderUnauthenticated(
        `${authIdentityId} has not been authenticated`,
      );
    }
    tokenData = await this.checkToken(tokenData, authIdentityId);
    const request = this.createRequest(
      `${this.apiUrl}/gists/${claimId}`,
      {
        method: 'GET',
      },
      tokenData,
    );
    const response = await fetch(request);
    if (!response.ok) {
      if (response.status === 404) {
        return;
      }
      if (response.status === 401) {
        throw new identitiesErrors.ErrorProviderUnauthenticated(
          `Invalid access token`,
        );
      }
      throw new identitiesErrors.ErrorProviderCall(
        `Provider responded with ${response.status} ${response.statusText}`,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new identitiesErrors.ErrorProviderCall(
        `Provider response body is not valid JSON`,
        { cause: e },
      );
    }
    const linkClaimData = data.files[this.gistFilename]?.content;
    if (linkClaimData == null) {
      return;
    }
    const linkClaim = this.parseClaim(linkClaimData);
    if (linkClaim == null) {
      return;
    }
    return {
      ...linkClaim,
      id: claimId,
      url: data.html_url ?? undefined,
    };
  }

  /**
   * Gets all IdentityClaims from a given identity.
   */
  public async *getClaims(
    authIdentityId: IdentityId,
    identityId: IdentityId,
  ): AsyncGenerator<IdentityClaim> {
    const gistsSearchUrl = 'https://gist.github.com/search';
    let pageNum = 1;
    while (true) {
      const url = new URL(gistsSearchUrl);
      url.searchParams.set('p', pageNum.toString());
      url.searchParams.set(
        'q',
        `user:${identityId} filename:${this.gistFilename} ${this.gistDescription}`, // Githubidentityclaim
      );
      const request = new Request(url.toString(), { method: 'GET' });
      const response = await fetch(request);
      if (!response.ok) {
        throw new identitiesErrors.ErrorProviderCall(
          `Provider responded with ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.text();
      const claimIds = this.extractClaimIds(data);
      for (const claimId of claimIds) {
        const claim = await this.getClaim(authIdentityId, claimId);
        if (claim != null) {
          yield claim;
        }
      }
      if (claimIds.length === 0) {
        break;
      } else {
        pageNum = pageNum + 1;
      }
    }
  }

  protected createRequest(
    url: string,
    options: any,
    tokenData: TokenData,
  ): Request {
    let headers = options.headers;
    if (headers == null) {
      headers = new Headers();
    }
    headers.set('Accept', 'application/vnd.github.v3+json');
    headers.set('Authorization', `token ${tokenData.accessToken}`);
    return new Request(url, {
      ...options,
      headers,
    }) as Request;
  }

  protected extractClaimIds(html: string): Array<IdentityClaimId> {
    const claimIds: Array<IdentityClaimId> = [];
    const $ = cheerio.load(html);
    $('.gist-snippet > .gist-snippet-meta')
      .children('ul')
      .each((_, ele) => {
        const claim = $('li > a', ele).first().attr('href');
        if (claim != null) {
          const matches = claim.match(/\/.+?\/(.+)/);
          if (matches != null) {
            const claimId = matches[1];
            claimIds.push(claimId as IdentityClaimId);
          }
        }
      });
    return claimIds;
  }
}

export default GitHubProvider;
