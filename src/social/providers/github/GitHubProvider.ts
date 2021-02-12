import type { ProviderKey } from '../../../types';
import type {
  LinkKey,
  LinkClaimIdentity,
  LinkInfoIdentity,
  LinkClaim,
} from '../../../links';
import type { IdentityInfo, TokenData } from '../../types';
import type ProviderTokens from '../../ProviderTokens';

import { fetch, Request, Response, Headers } from 'cross-fetch';
import { Searcher } from 'fast-fuzzy';
import cheerio from 'cheerio';
import Provider from '../../Provider';
import { sleep } from '../../../utils';
import { browser } from '../../utils';
import {
  ErrorProviderCall,
  ErrorProviderUnimplemented,
  ErrorProviderAuthentication,
  ErrorProviderUnauthenticated,
} from '../../errors';

type Username = string;
type GistId = string;

class GitHubProvider extends Provider {
  public readonly clientId: string;

  protected readonly apiUrl: string = 'https://api.github.com';
  protected readonly gistFilename: string = 'cryptolink.txt';
  protected readonly gistDescription: string =
    'Cryptolink between Polykey Keynode and Github Identity';
  protected scope: string = 'gist user:email read:user';

  public constructor(tokens: ProviderTokens, clientId: string) {
    super('github.com', tokens);
    this.clientId = clientId;
  }

  public async *authenticate(
    timeout: number = 120000,
  ): AsyncGenerator<string | undefined, void, void> {
    const params = new URLSearchParams();
    params.set('client_id', this.clientId);
    params.set('scope', this.scope);
    const request = new Request(
      `https://github.com/login/device/code?${params.toString()}`,
      {
        method: 'POST',
      },
    );
    const response = await fetch(request);
    if (!response.ok) {
      throw new ErrorProviderAuthentication(
        `Provider device code request responded with: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.text();
    const authParams = new URLSearchParams(data);
    const deviceCode = authParams.get('device_code');
    // convert seconds to milliseconds
    let pollInterval = parseInt(authParams.get('interval') ?? '1') * 1000;
    const userCode = authParams.get('user_code');
    if (!deviceCode || !userCode) {
      throw new ErrorProviderAuthentication(
        `Provider device code request did not return the device_code or the user_code`,
      );
    }
    // this code needs to be used by the user to manually enter
    yield userCode;
    // Promise.race does not cancel unfinished promises
    // the finished condition variable is needed to stop the pollAccessToken process
    // the pollTimer is needed to stop the pollTimerP
    // must use function instead of arrow functiosn in order to mutate
    // both the pollTimer and pollTimedOut
    let pollTimedOut = false;
    let pollTimer;
    const pollTimerP = new Promise<void>(function (r) {
      pollTimer = setTimeout(() => {
        pollTimedOut = true;
        r();
      }, timeout);
    });
    const that = this;
    const pollAccessToken = async function () {
      browser('https://github.com/login/device');
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
          return;
        }
        const response = await fetch(request);
        if (!response.ok) {
          throw new ErrorProviderAuthentication(
            `Provider responded with ${response.status} ${response.statusText}`,
          );
        }
        let data;
        try {
          data = await response.json();
        } catch (e) {
          throw new ErrorProviderAuthentication(
            'Provider access token response is not valid JSON',
          );
        }
        if (data.error) {
          if (data.error === 'authorization_pending') {
            await sleep(pollInterval);
            continue;
          } else if (data.error === 'slow_down') {
            // convert seconds to milliseconds
            pollInterval = parseInt(data.get('interval') ?? '1') * 1000;
            await sleep(pollInterval);
            continue;
          }
          throw new ErrorProviderAuthentication(
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
    } catch (e) {
      throw e;
    } finally {
      clearTimeout(pollTimer);
    }
    if (!tokenData) {
      throw new ErrorProviderAuthentication(
        `Provider authentication flow timed out`,
      );
    }
    this.tokens.setToken(tokenData as TokenData);
    return;
  }

  /**
   * Gets own identity key.
   * GitHub has user ids, but it is an implementation detail.
   * Usernames on GitHub are changeable.
   */
  public async getIdentityKey(): Promise<Username> {
    const tokenData = this.getTokenData();
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
        throw new ErrorProviderUnauthenticated(`Invalid access token`);
      }
      throw new ErrorProviderCall(
        `Provider responded with ${response.status} ${response.statusText}`,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new ErrorProviderCall(`Provider response body is not valid JSON`);
    }
    return data.login;
  }

  /**
   * Get identity information from an identity key.
   */
  public async getIdentityInfo(
    identityKey: Username,
  ): Promise<IdentityInfo | undefined> {
    const tokenData = this.getTokenData();
    const request = this.createRequest(
      `${this.apiUrl}/users/${identityKey}`,
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
        throw new ErrorProviderUnauthenticated(`Invalid access token`);
      }
      throw new ErrorProviderCall(
        `Provider responded with ${response.status} ${response.statusText}`,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new ErrorProviderCall(`Provider response body is not valid JSON`);
    }
    return {
      key: identityKey,
      provider: this.key,
      name: data.name ?? undefined,
      email: data.email ?? undefined,
      url: data.html_url ?? undefined,
    };
  }

  /**
   * Gets connected IdentityInfo from following and follower connections.
   */
  public async *getConnectedIdentityInfos(
    searchTerms: Array<string> = [],
  ): AsyncGenerator<IdentityInfo> {
    const tokenData = this.getTokenData();
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
          throw new ErrorProviderUnauthenticated(`Invalid access token`);
        }
        throw new ErrorProviderCall(
          `Provider responded with ${response.status} ${response.statusText}`,
        );
      }
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new ErrorProviderCall(`Provider response body is not valid JSON`);
      }
      for (const item of data) {
        const identityInfo = await this.getIdentityInfo(item.login);
        if (identityInfo && this.matchIdentityInfo(identityInfo, searchTerms)) {
          yield identityInfo;
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
          throw new ErrorProviderUnauthenticated(`Invalid access token`);
        }
        throw new ErrorProviderCall(
          `Provider responded with ${response.status} ${response.statusText}`,
        );
      }
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new ErrorProviderCall(`Provider response body is not valid JSON`);
      }
      for (const item of data) {
        const identityInfo = await this.getIdentityInfo(item.login);
        if (identityInfo && this.matchIdentityInfo(identityInfo, searchTerms)) {
          yield identityInfo;
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
   * Gets the LinkInfo.
   * GitHub LinkInfos are published as gists.
   */
  public async getLinkInfo(
    linkKey: GistId,
  ): Promise<LinkInfoIdentity | undefined> {
    const tokenData = this.getTokenData();
    const request = this.createRequest(
      `${this.apiUrl}/gists/${linkKey}`,
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
        throw new ErrorProviderUnauthenticated(`Invalid access token`);
      }
      throw new ErrorProviderCall(
        `Provider responded with ${response.status} ${response.statusText}`,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new ErrorProviderCall(`Provider response body is not valid JSON`);
    }
    const linkClaimData = data.files[this.gistFilename]?.content;
    if (linkClaimData == null) {
      return;
    }
    const linkClaim = this.parseLinkClaim(linkClaimData);
    if (!linkClaim) {
      return;
    }
    return {
      ...linkClaim,
      key: linkKey,
      url: data.html_url ?? undefined,
    };
  }

  /**
   * Gets LinkInfo from a given identity.
   */
  public async *getLinkInfos(
    identityKey: Username,
  ): AsyncGenerator<LinkInfoIdentity> {
    const gistsSearchUrl = 'https://gist.github.com/search';
    let pageNum = 1;
    while (true) {
      const url = new URL(gistsSearchUrl);
      url.searchParams.set('p', pageNum.toString());
      url.searchParams.set(
        'q',
        `user:${identityKey} filename:${this.gistFilename} ${this.gistDescription}`,
      );
      const request = new Request(url.toString(), { method: 'GET' });
      const response = await fetch(request);
      if (!response.ok) {
        throw new ErrorProviderCall(
          `Provider responded with ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.text();
      const linkKeys = await this.extractLinkKeys(data);
      for (const linkKey of linkKeys) {
        const linkInfo = await this.getLinkInfo(linkKey);
        if (linkInfo) {
          yield linkInfo;
        }
      }
      if (linkKeys.length === 0) {
        break;
      } else {
        pageNum = pageNum + 1;
      }
    }
  }

  /**
   * Publish a link claim.
   * These are published as gists.
   */
  public async publishLinkClaim(
    linkClaim: LinkClaimIdentity,
  ): Promise<LinkInfoIdentity> {
    const tokenData = this.getTokenData();
    const payload = {
      description: this.gistDescription,
      files: {
        [this.gistFilename]: {
          content: JSON.stringify(linkClaim),
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
        throw new ErrorProviderUnauthenticated(`Invalid access token`);
      }
      throw new ErrorProviderCall(
        `Provider responded with ${response.status} ${response.statusText}`,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new ErrorProviderCall(`Provider response body is not valid JSON`);
    }
    return {
      ...linkClaim,
      key: data.id,
      url: data.html_url ?? undefined,
    };
  }

  protected createRequest(
    url: string,
    options: any,
    tokenData: TokenData,
  ): Request {
    let headers = options.headers;
    if (!headers) {
      headers = new Headers();
    }
    headers.set('Accept', 'application/vnd.github.v3+json');
    headers.set('Authorization', `token ${tokenData.accessToken}`);
    return new Request(url, {
      ...options,
      headers,
    });
  }

  protected matchIdentityInfo(
    identityInfo: IdentityInfo,
    searchTerms: Array<string>,
  ): boolean {
    if (searchTerms.length < 1) {
      return true;
    }
    const searcher = new Searcher([identityInfo], {
      keySelector: (obj) => [
        obj.key,
        obj.name || '',
        obj.email || '',
        obj.url || '',
      ],
      threshold: 0.8,
    });
    let matched = false;
    for (const searchTerm of searchTerms) {
      if (searcher.search(searchTerm).length > 0) {
        matched = true;
        break;
      }
    }
    if (matched) {
      return true;
    } else {
      return false;
    }
  }

  protected extractLinkKeys(html: string): Array<GistId> {
    const linkKeys: Array<GistId> = [];
    const $ = cheerio.load(html);
    $('.gist-snippet > .gist-snippet-meta')
      .children('ul')
      .each((_, ele) => {
        const link = $('li > a', ele).first().attr('href');
        if (link) {
          const matches = link.match(/\/.+?\/(.+)/);
          if (matches) {
            const linkKey = matches[1];
            linkKeys.push(linkKey);
          }
        }
      });
    return linkKeys;
  }
}

export default GitHubProvider;
