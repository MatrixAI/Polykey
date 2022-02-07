import type {
  ProviderId,
  IdentityId,
  IdentityData,
  TokenData,
  ProviderTokens,
  ProviderAuthenticateRequest,
} from './types';
import type { Claim } from '../claims/types';
import type { IdentityClaim, IdentityClaimId } from '../identities/types';

import * as identitiesErrors from './errors';
import { schema } from '../claims';

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
   * This verifies that the claim's JSON data fits our schema
   * This does not verify whether the signature is correct
   */
  public parseClaim(identityClaimData: string): Claim | undefined {
    let claim;
    try {
      claim = JSON.parse(identityClaimData);
    } catch (e) {
      return;
    }
    // TODO: Add node ID validation here?
    if (!schema.claimIdentityValidate(claim)) {
      return;
    }
    return claim;
  }

  /**
   * Authenticates to an identity id, acquiring the token
   * This token must be stored on the token database.
   * This is a generator that only has 1 step.
   * This is because we require the caller to perform an authorisation action.
   * The final return value is the identity ID.
   */
  public abstract authenticate(
    timeout?: number,
  ): AsyncGenerator<ProviderAuthenticateRequest, IdentityId>;

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
   * Publishes an identity claim on the authenticated identity.
   * Returns an IdentityClaim, wrapping the Claim itself with extra
   * metadata from the published claim (e.g. URL, claim ID on provider)
   */
  public abstract publishClaim(
    authIdentityId: IdentityId,
    identityClaim: Claim,
  ): Promise<IdentityClaim>;

  /**
   * Gets the identity claim given the claim's ID on the provider
   */
  public abstract getClaim(
    authIdentityId: IdentityId,
    claimId: IdentityClaimId,
  ): Promise<IdentityClaim | undefined>;

  /**
   * Stream identity claims from an identity
   */
  public abstract getClaims(
    authIdentityId: IdentityId,
    identityId: IdentityId,
  ): AsyncGenerator<IdentityClaim>;
}

export default Provider;
