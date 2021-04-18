import type {
  ProviderId,
  IdentityId,
  IdentityData,
  ProviderTokens,
  TokenData,
} from './types';
import type {
  LinkId,
  LinkClaimIdentity,
  LinkInfoIdentity,
} from '../links/types';

import * as identitiesErrors from './errors';
import { schema } from '../links';

type GetTokens = () => Promise<ProviderTokens>;
type GetToken = (identityId: IdentityId) => Promise<TokenData | undefined>;
type PutToken = (
  identityId: IdentityId,
  tokenValue: TokenData,
) => Promise<void>;
type DelToken = (identityId: IdentityId) => Promise<void>;

abstract class Provider {
  /**
   * Set to the unique hostname of the provider
   */
  public abstract readonly id: ProviderId;

  public getTokens: GetTokens;
  public getToken: GetToken;
  public putToken: PutToken;
  public delToken: DelToken;

  /**
   * Setting up token database functions
   * This must be called before the provider starts to be used
   */
  public setTokenDb(
    getTokens: GetTokens,
    getToken: GetToken,
    putToken: PutToken,
    delToken: DelToken,
  ) {
    this.getTokens = getTokens;
    this.getToken = getToken;
    this.putToken = putToken;
    this.delToken = delToken;
  }

  /**
   * Checks that the token is still valid
   * If the access token has expired, and there is no refresh token then this
   * will throw the ErrorProviderUnauthenticated exception
   * If the refresh token exists but has expired then this will throw the
   * ErrorProviderUnauthenticated exception
   * If the refresh token exists, and is still valid, then it will attempt to
   * refresh the token.
   * If you pass in identityId, expect that the new token will be persisted.
   */
  public async checkToken(
    tokenData: TokenData,
    identityId?: IdentityId,
  ): Promise<TokenData> {
    const now = Math.floor(Date.now() / 1000);
    if (
      tokenData.accessTokenExpiresIn &&
      tokenData.accessTokenExpiresIn >= now
    ) {
      if (!tokenData.refreshToken) {
        throw new identitiesErrors.ErrorProviderUnauthenticated(
          'Access token expired',
        );
      }
      if (
        tokenData.refreshTokenExpiresIn &&
        tokenData.refreshTokenExpiresIn >= now
      ) {
        throw new identitiesErrors.ErrorProviderUnauthenticated(
          'Refresh token expired',
        );
      }
      return await this.refreshToken(tokenData, identityId);
    }
    return tokenData;
  }

  /**
   * This verifies that the link claim JSON data fits our schema
   * This does not verify whether the signature is correct
   */
  public parseLinkClaim(linkClaimData: string): LinkClaimIdentity | undefined {
    let linkClaim;
    try {
      linkClaim = JSON.parse(linkClaimData);
    } catch (e) {
      return;
    }
    if (!schema.linkClaimIdentityValidate(linkClaim)) {
      return;
    }
    return linkClaim;
  }

  /**
   * Authenticates to an identity id, acquiring the token
   * This token must be stored on the token database.
   * This is a generator that only has 1 step.
   * This is because we require the caller to perform an authorisation action.
   * The return value is the token value.
   */
  public abstract authenticate(
    timeout?: number,
  ): AsyncGenerator<string | undefined, IdentityId>;

  /**
   * Refreshes the token
   * If identity is passed in, this function should update the token db
   */
  public abstract refreshToken(
    tokenData: TokenData,
    identityId?: IdentityId,
  ): Promise<TokenData>;

  /**
   * Gets an array of authenticated identity ids
   */
  public abstract getAuthIdentityIds(): Promise<Array<IdentityId>>;

  /**
   * Gets the corresponding identity ID to a token key
   */
  public abstract getIdentityId(tokenData: TokenData): Promise<IdentityId>;

  /**
   * Gets the identity data for a given identity
   */
  public abstract getIdentityData(
    authIdentityId: IdentityId,
    identityId: IdentityId,
  ): Promise<IdentityData | undefined>;

  /**
   * Stream connected identity infos to a particular identity
   * This is intended to find "friends", "followers", "contacts"... etc
   * Some social providers do not have this concept
   * In such a case, one stream other random identities that exist on the network
   * Search terms are provider-implementation specific
   */
  public abstract getConnectedIdentityDatas(
    authIdentityId: IdentityId,
    searchTerms?: Array<string>,
  ): AsyncGenerator<IdentityData>;

  /**
   * Publishes a link claim on the authenticated identity
   */
  public abstract publishLinkClaim(
    authIdentityId: IdentityId,
    linkClaim: LinkClaimIdentity,
  ): Promise<LinkInfoIdentity>;

  /**
   * Gets the link info given a linkid
   */
  public abstract getLinkInfo(
    authIdentityId: IdentityId,
    linkId: LinkId,
  ): Promise<LinkInfoIdentity | undefined>;

  /**
   * Stream link infos from an identity
   */
  public abstract getLinkInfos(
    authIdentityId: IdentityId,
    identityId: IdentityId,
  ): AsyncGenerator<LinkInfoIdentity>;
}

export default Provider;
