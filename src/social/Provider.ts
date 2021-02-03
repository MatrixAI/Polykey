import type {
  ProviderKey,
  IdentityKey,
  LinkKey,
  IdentityInfo,
  LinkClaim,
  LinkInfo,
  AuthCodeData,
  TokenData,
} from './types';

import http from 'http';
import Ajv, { JSONSchemaType } from 'ajv';
import { fetch, Request, Response } from 'cross-fetch';

import ProviderTokens from './ProviderTokens';
import LinkClaimSchema from './schemas/LinkClaim.json';
import { browser } from './utils';
import {
  ErrorProviderUnauthenticated
} from './errors';
import { randomString } from '../utils';

abstract class Provider {

  public readonly key: ProviderKey;
  public readonly tokens: ProviderTokens;

  protected linkClaimValidate;

  public constructor (key, tokens) {
    this.key = key;
    this.tokens = tokens;
    const ajv = new Ajv();
    const linkClaimSchema = LinkClaimSchema as JSONSchemaType<LinkClaim>;
    this.linkClaimValidate = ajv.compile(linkClaimSchema);
  }

  public abstract authenticate (timeout?: number): AsyncGenerator<string|undefined, void, void>;

  public abstract getIdentityKey (): Promise<IdentityKey>;

  public abstract getIdentityInfo (identityKey: IdentityKey): Promise<IdentityInfo|undefined>;

  public abstract getConnectedIdentityInfos (searchTerms?: Array<string>): AsyncGenerator<IdentityInfo>;

  public abstract getLinkInfo (linkKey: LinkKey): Promise<LinkInfo|undefined>;

  public abstract getLinkInfos (identityKey: IdentityKey): AsyncGenerator<LinkInfo>;

  public abstract publishLinkClaim (linkClaim: LinkClaim): Promise<LinkInfo>;

  public getTokenData (): TokenData {
    const tokenData = this.tokens.getToken();
    if (!tokenData) {
      throw new ErrorProviderUnauthenticated('No access token available');
    }
    return tokenData;
  }

  public parseLinkClaim (linkClaimData: string): LinkClaim|undefined {
    let linkClaim;
    try {
      linkClaim = JSON.parse(linkClaimData);
    } catch (e) {
      return;
    }
    if (!this.linkClaimValidate(linkClaim)) {
      return;
    }
    return linkClaim;
  }

}

export default Provider;
