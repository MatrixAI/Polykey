import type {
  ProviderId,
  IdentityId,
  IdentityData,
  IdentitySignedClaim,
  ProviderToken,
  ProviderTokens,
  ProviderAuthenticateRequest,
  ProviderIdentityClaimId,
  ProviderPaginationToken,
} from './types';
import type { SignedClaim } from '../claims/types';
import type { ClaimLinkIdentity } from '../claims/payloads/claimLinkIdentity';
import * as identitiesErrors from './errors';
import * as tokensSchema from '../tokens/schemas';
import * as claimLinkIdentity from '../claims/payloads/claimLinkIdentity';

type GetTokens = () => Promise<ProviderTokens>;
type GetToken = (identityId: IdentityId) => Promise<ProviderToken | undefined>;
type PutToken = (
  identityId: IdentityId,
  providerToken: ProviderToken,
) => Promise<void>;
type DelToken = (identityId: IdentityId) => Promise<void>;

abstract class Provider {
  /**
   * Set to the unique hostname of the provider
   */
  public abstract readonly id: ProviderId;

  /**
   * Set to true if getClaimsPage method should be preferred instead claim iteration operations.
   * This could be useful if the Provider subclass has a getClaimsPage implentation that is able to
   * obtain both Claims and ClaimsIds with a single HTTP request. For example, if the Provider were to
   * supply a GraphQL API, or if the webscraped page were to contain the contents of both.
   */
  public readonly preferGetClaimsPage: boolean = false;

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
   * If either `providerToken.accessTokenExpiresIn` or `providerToken.refreshTokenExpiresIn` is set to 0,
   * their related tokens will be treated as never-expiring.
   */
  public async checkToken(
    providerToken: ProviderToken,
    identityId?: IdentityId,
  ): Promise<ProviderToken> {
    const now = Math.floor(Date.now() / 1000);
    // This will mean that if accessTokenExpiresIn = 0, the token never expires
    if (
      providerToken.accessTokenExpiresIn &&
      providerToken.accessTokenExpiresIn >= now
    ) {
      if (providerToken.refreshToken == null) {
        throw new identitiesErrors.ErrorProviderUnauthenticated(
          'Access token expired',
        );
      }
      // This will mean that refreshTokenExpiresIn = 0 does not throw
      if (
        providerToken.refreshTokenExpiresIn &&
        providerToken.refreshTokenExpiresIn >= now
      ) {
        throw new identitiesErrors.ErrorProviderUnauthenticated(
          'Refresh token expired',
        );
      }
      return await this.refreshToken(providerToken, identityId);
    }
    return providerToken;
  }

  /**
   * This verifies that the claim's JSON data fits our schema
   * This does not verify whether the signature is correct
   */
  public parseClaim(
    signedClaimEncodedJSON: string,
  ): SignedClaim<ClaimLinkIdentity> | undefined {
    let signedClaimEncoded;
    try {
      signedClaimEncoded = JSON.parse(signedClaimEncodedJSON);
    } catch {
      return;
    }
    if (!tokensSchema.validateSignedTokenEncoded(signedClaimEncoded)) {
      return;
    }
    let signedClaim: SignedClaim<ClaimLinkIdentity>;
    try {
      signedClaim =
        claimLinkIdentity.parseSignedClaimLinkIdentity(signedClaimEncoded);
    } catch {
      return;
    }
    return signedClaim;
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
    providerToken: ProviderToken,
    identityId?: IdentityId,
  ): Promise<ProviderToken>;

  /**
   * Gets an array of authenticated identity ids
   */
  public abstract getAuthIdentityIds(): Promise<Array<IdentityId>>;

  /**
   * Gets the corresponding identity ID to a token key
   */
  public abstract getIdentityId(
    providerToken: ProviderToken,
  ): Promise<IdentityId>;

  /**
   * Gets the identity data for a given identity
   */
  public abstract getIdentityData(
    authIdentityId: IdentityId,
    identityId: IdentityId,
    options?: { signal?: AbortSignal },
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
   * Returns an `IdentitySignedClaim`, wrapping the `SignedClaim` itself with extra
   * metadata from the published claim (e.g. URL, claim ID on provider)
   */
  public abstract publishClaim(
    authIdentityId: IdentityId,
    identityClaim: SignedClaim<ClaimLinkIdentity>,
  ): Promise<IdentitySignedClaim>;

  /**
   * Gets the identity claim given the claim's ID on the provider
   */
  public abstract getClaim(
    authIdentityId: IdentityId,
    claimId: ProviderIdentityClaimId,
  ): Promise<IdentitySignedClaim | undefined>;

  /**
   * Stream a page of identity claimIds from an identity
   */
  public abstract getClaimIdsPage(
    authIdentityId: IdentityId,
    identityId: IdentityId,
    paginationToken?: ProviderPaginationToken,
  ): AsyncGenerator<{
    claimId: ProviderIdentityClaimId;
    nextPaginationToken?: ProviderPaginationToken;
  }>;

  /**
   * Stream identity claimIds from an identity
   */
  public async *getClaimIds(
    authIdentityId: IdentityId,
    identityId: IdentityId,
  ): AsyncGenerator<ProviderIdentityClaimId> {
    let nextPaginationToken: ProviderPaginationToken | undefined;
    while (true) {
      const iterator = this.getClaimIdsPage(
        authIdentityId,
        identityId,
        nextPaginationToken,
      );
      nextPaginationToken = undefined;
      for await (const wrapper of iterator) {
        nextPaginationToken = wrapper.nextPaginationToken;
        yield wrapper.claimId;
      }
      if (nextPaginationToken == null) {
        break;
      }
    }
  }

  /**
   * Stream a page of identity claims from an identity
   */
  public async *getClaimsPage(
    authIdentityId: IdentityId,
    identityId: IdentityId,
    paginationToken?: ProviderPaginationToken,
  ): AsyncGenerator<{
    claim: IdentitySignedClaim;
    nextPaginationToken?: ProviderPaginationToken;
  }> {
    const iterator = this.getClaimIdsPage(
      authIdentityId,
      identityId,
      paginationToken,
    );
    for await (const { claimId, nextPaginationToken } of iterator) {
      const claim = await this.getClaim(authIdentityId, claimId);
      if (claim == null) {
        continue;
      }
      yield {
        claim,
        nextPaginationToken,
      };
    }
  }

  /**
   * Stream identity claims from an identity
   */
  public async *getClaims(
    authIdentityId: IdentityId,
    identityId: IdentityId,
  ): AsyncGenerator<IdentitySignedClaim> {
    let nextPaginationToken: ProviderPaginationToken | undefined;
    while (true) {
      const iterator = this.getClaimsPage(
        authIdentityId,
        identityId,
        nextPaginationToken,
      );
      nextPaginationToken = undefined;
      for await (const wrapper of iterator) {
        nextPaginationToken = wrapper.nextPaginationToken;
        yield wrapper.claim;
      }
      if (nextPaginationToken == null) {
        break;
      }
    }
  }
}

export default Provider;
