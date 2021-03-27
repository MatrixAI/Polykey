// import type LinkedInConfig from '../../providers/linkedin/LinkedInConfig';
// import type ProviderTokens from '../../ProviderTokens';
// import type ProviderAuthCodeServer from '../../ProviderAuthCodeServer';
// import type { TokenData, ProviderKey, IdentityInfo, LinkClaim, LinkInfo } from '../../types';

// import Provider from '../../Provider';
// import { Searcher } from 'fast-fuzzy';

// type UserURN = string;
// type ShareURN = string;

// class LinkedInProvider extends Provider {
//   public readonly apiUrl: string = 'https://api.linkedin.com/v2';

//   public constructor (
//     config: LinkedInConfig,
//     tokens: ProviderTokens,
//     server: ProviderAuthCodeServer,
//     key: ProviderKey
//   ) {
//     super(config, tokens, server, key);
//   }

//   public getProviderKey () {
//     return this.key;
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

//   public async getIdentityKey(): Promise<UserURN> {
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
//     return `urn:li:person:${data.id}`;
//   }

//   public async getIdentityInfo(identityKey: UserURN): Promise<IdentityInfo|undefined> {
//     throw new Error("LinkedIn has not provided permissions for this functionality.")
//   }

//   public publishLinkClaim(linkClaim: LinkClaim): Promise<LinkInfo> {
//     throw new Error("LinkedIn has not provided permissions for this functionality.")
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

//   public getLinkInfo(linkKey: ShareURN): Promise<any> {
//     throw new Error("LinkedIn does not provide permissions for this functionality.")
//   }

//   public async * getLinkInfos(identityKey: UserURN): AsyncGenerator<any, any, unknown> {
//     throw new Error("LinkedIn does not provide permissions for this functionality.")
//   }

//   protected buildRefreshTokenRequest (redirectUri: string): Request {
//     throw new Error('Unimplemented');
//   }

//   protected async handleRefreshTokenResponse (response: Response): Promise<TokenData> {
//     throw new Error('Unimplemented');
//   }
// }

// export default LinkedInProvider;
