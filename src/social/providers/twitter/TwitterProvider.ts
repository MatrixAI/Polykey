// import type TwitterConfig from '../../providers/twitter/TwitterConfig';
// import type ProviderTokens from '../../ProviderTokens';
// import type ProviderAuthCodeServer from '../../ProviderAuthCodeServer';
// import type { TokenData, AuthCodeData, ProviderKey, LinkClaim, LinkInfo, IdentityInfo } from '../../types';

// import Provider from '../../Provider';
// import { Searcher } from 'fast-fuzzy';

// type UserKey = string;
// type TweetKey = string;

// // TODO: WORK IN PROGRESS
// class TwitterProvider extends Provider<UserKey, TweetKey> {

//   public readonly apiUrl: string = 'https://api.linkedin.com/v2';

//   public constructor (
//     config: TwitterConfig,
//     tokens: ProviderTokens,
//     server: ProviderAuthCodeServer,
//     key: ProviderKey,
//   ) {
//     super(config, tokens, server, key);
//   }

//   // overriding authenticate
//   public async authenticate (timeout: number = 60000): Promise<void> {
//     const p = new Promise<TokenData>(async (resolve, reject) => {
//       const authTimer = setTimeout(() => {
//         this.server.stop();
//         reject('timed out');
//       }, timeout);
//       const handleAuthCodeData = async (
//         authCodeData: AuthCodeData,
//         redirectUri: string
//       ) => {
//         const tokenRequest = this.buildTokenRequest(
//           redirectUri,
//         );
//         const tokenResponse = await fetch(tokenRequest, { 'method': 'POST' });
//         const r = await tokenResponse.json()

//         // stage 2
//         const authorizeLink = this.buildAuthorizeLink(r.oauth_token);
//         const authorizeResponse = await fetch(authorizeLink, { 'method': 'GET'});
//         // gives oauth_token (check that its the same as r.oauth_token)
//         //       oauth_verifier

//         // step 3


//       }
//     })
//   }

//   protected buildTokenRequest (oauthCallback: string): string {
//     const config = this.config as TwitterConfig;
//     const params = new URLSearchParams();
//     params.set("oauth_callback", oauthCallback);
//     params.set("oatuh_consumer_key", config.oauthConsumerKey);
//     return `${config.tokenRequestEndpoint}?${params.toString()}`;
//   } // will give oauth_token

//   protected buildAuthorizeLink (oauthToken: string): string {
//     const config = this.config as TwitterConfig;
//     return `${config.authorizationEndpoint}?oauth_token=${oauthToken}`;
//   } // redirects client?? do we open this in the web browser?

//   protected buildAccessToken (oauthVerifier: string, oauthToken: string): string {
//     return ""
//   }



//   protected createRequest (url: string, options: any, tokenData: TokenData): Request {
//     let headers = options.headers;
//     if (!headers) {
//       headers = new Headers();
//     }
//     headers.set('Authorization', `Bearer ${tokenData.accessToken}`);
//     return new Request(
//       url,
//       {
//         ...options,
//         headers,
//       }
//     );
//   }

//   public async getIdentityKey(): Promise<UserKey> {
//     const tokenData = this.tokens.getToken();
//     if (!tokenData) {
//       throw new Error('Unauthenticated!');
//     }
//     const request = this.createRequest(
//       `${this.apiUrl}/me`,
//       {
//         'method': 'GET',
//       },
//       tokenData
//     )
//     const response = await fetch(request);
//     if (!response.ok) { // not 2xx
//       throw new Error(response.statusText);
//     }
//     const data = await response.json();
//     return `urn:li:person:${data.id}`
//   }

//   public async getIdentityInfo(identityKey: UserKey): Promise<IdentityInfo<UserKey>|undefined> {
//     const tokenData = this.tokens.getToken();
//     if (!tokenData) {
//       throw new Error('Unauthenticated!');
//     }
//     const request = this.createRequest(
//       `${this.apiUrl}/people/${identityKey}`,
//       {
//         'method': 'GET',
//       },
//       tokenData
//     );
//     const response = await fetch(request);
//     if (!response.ok) { // not 2xx
//       // Can give 404
//       console.log(response.status);
//       throw new Error(response.toString())
//     }
//     const data = await response.json();
//     return data;
//   }

//   public publishLinkClaim(linkClaim: LinkClaim<string>): Promise<LinkInfo<string, string>> {
//     throw new Error("Method not implemented.");
//   }

//   public async * getConnectedIdentityInfos(
//     searchTerms: Array<string> = []
//   ): AsyncGenerator<any> {
//     throw new Error("LinkedIn does not provide permissions for this functionality.")
//   }

//   public matchIdentityInfo(
//     identityInfo: any,
//     searchTerms: Array<string>
//   ): boolean {
//     if (searchTerms.length < 1) {
//       return true;
//     }
//     const searcher = new Searcher(
//       [identityInfo],
//       {
//         keySelector: (obj) => [
//           obj.firstName || '',
//           obj.lastName || '',
//           obj.id || '',
//         ],
//         threshold: 0.8
//       }
//     );
//     let matched = false;
//     for (let searchTerm of searchTerms) {
//       if (searcher.search(searchTerm).length > 0) {
//         matched = true;
//         break;
//       }
//     }
//     if (matched) {
//       return true;
//     } else {
//       return false;
//     }
//   }


//   public getLinkInfo(linkKey: TweetKey): Promise<any> {
//     throw new Error("LinkedIn does not provide permissions for this functionality.")
//   }


//   public async * getLinkInfos(identityKey: UserKey): AsyncGenerator<any, any, unknown> {
//     throw new Error("LinkedIn does not provide permissions for this functionality.")
//   }


//   protected buildRefreshTokenRequest (redirectUri: string): Request {
//     throw new Error('Unimplemented');
//   }

//   protected async handleRefreshTokenResponse (response: Response): Promise<TokenData> {
//     throw new Error('Unimplemented');
//   }
// }

// export default TwitterProvider;
