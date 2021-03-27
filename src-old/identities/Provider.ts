import type { ProviderKey, IdentityKey } from '../types';
import type { LinkKey, LinkClaimIdentity, LinkInfoIdentity } from '../links';
import type { IdentityInfo, TokenData } from './types';

import { linkClaimIdentityValidate } from '../links';
import ProviderTokens from './ProviderTokens';
import { ErrorProviderUnauthenticated } from './errors';

abstract class Provider {
  public readonly key: ProviderKey;
  public readonly tokens: ProviderTokens;

  public constructor(key, tokens) {
    this.key = key;
    this.tokens = tokens;
  }

  public abstract authenticate(
    timeout?: number,
  ): AsyncGenerator<string | undefined, void, void>;

  public abstract getIdentityKey(): Promise<IdentityKey>;

  public abstract getIdentityInfo(
    identityKey: IdentityKey,
  ): Promise<IdentityInfo | undefined>;

  public abstract getConnectedIdentityInfos(
    searchTerms?: Array<string>,
  ): AsyncGenerator<IdentityInfo>;

  public abstract getLinkInfo(
    linkKey: LinkKey,
  ): Promise<LinkInfoIdentity | undefined>;

  public abstract getLinkInfos(
    identityKey: IdentityKey,
  ): AsyncGenerator<LinkInfoIdentity>;

  public abstract publishLinkClaim(
    linkClaim: LinkClaimIdentity,
  ): Promise<LinkInfoIdentity>;

  public getTokenData(): TokenData {
    const tokenData = this.tokens.getToken();
    if (!tokenData) {
      throw new ErrorProviderUnauthenticated('No access token available');
    }
    return tokenData;
  }

  public parseLinkClaim(linkClaimData: string): LinkClaimIdentity | undefined {
    let linkClaim;
    try {
      linkClaim = JSON.parse(linkClaimData);
    } catch (e) {
      return;
    }
    if (!linkClaimIdentityValidate(linkClaim)) {
      return;
    }
    return linkClaim;
  }
}

export default Provider;
