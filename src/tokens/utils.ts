import * as multiformats from 'multiformats';
import * as keysUtils from '../keys/utils';

/**
 * SHA256 Multihash
 * Use `sha256.encode` to get plain digest
 * Use `sha256.digest` to get the `MultihashDigest`
 * See: https://github.com/multiformats/multicodec/blob/master/table.csv
 */
const sha256M = multiformats.hasher.from({
  name: 'sha2-256',
  code: 0x12,
  encode: (input: Uint8Array) => {
    return keysUtils.sha256(input);
  }
});

/**
 * SHA512 Multihash
 * Use `sha512.encode` to get plain digest
 * Use `sha512.digest` to get the `MultihashDigest`
 * See: https://github.com/multiformats/multicodec/blob/master/table.csv
 */
const sha512M = multiformats.hasher.from({
  name: 'sha2-512',
  code: 0x13,
  encode: (input: Uint8Array) => {
    return keysUtils.sha512(input);
  }
});

// these hashing functions
// are for multihashing
// so we should really call it properly
// unless we are going to have a general hashing function
// multihashSha512
// mulithashSha256
// and they provide us this ability to do this
// maybe the keys can also provide this
// by providing the M variants
// the remaining multibase encoding can be used later

export {
  sha256M,
  sha512M
};
