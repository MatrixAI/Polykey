import type { POJO } from '../types';
import type { Digest, DigestFormats } from '../keys/types';
import * as multiformats from 'multiformats';
import canonicalize from 'canonicalize';
import * as keysUtils from '../keys/utils';
import * as utils from '../utils';

// After we get a digest
// we can turn it into a multidigest
// then we can turn it into a multibase structure afterwards

function hashToken<F extends DigestFormats>(
  token: Token,
  format: F
): Digest<F> {
  const tokenString = canonicalize(token)!;
  const tokenDigest = keysUtils.hash(
    Buffer.from(tokenString),
    format
  );
  return tokenDigest;
}

export {
  hashToken
};
