import type { Token } from './types';
import type { Digest, DigestFormats } from '../keys/types';
import canonicalize from 'canonicalize';
import * as keysUtils from '../keys/utils';


// function hashToken<F extends DigestFormats>(
//   token: Token,
//   format: F
// ): Digest<F> {
//   const tokenString = canonicalize(token)!;
//   const tokenDigest = keysUtils.hash(
//     Buffer.from(tokenString, 'utf-8'),
//     format
//   );
//   return tokenDigest;
// }

// here we are signign a token
// ah shit I don't have a Blake2b algorithm at all
// i only have HS512256

function signWithPrivateKey(token: Token): TokenSigned {

}

// here we authenticating a token
// what do we mean by this
// when we sign with public key
// sign with hash

function signWithKey(token: Token): TokenSigned {

}




export {
  hashToken
};
