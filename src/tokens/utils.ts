import type { HashSHA256, HashSHA512 } from '@/keys/types';
import * as multiformats from 'multiformats';
import * as keysUtils from '../keys/utils';
import * as utils from '../utils';

// We don't actually want o do this
// we want to use the multiformats multihash digest
// the idea is that we can use
// or whatever
// then convert it to multihash digest
// keysUtils.sha256(data)
// so this is all we need
// but we can create a appropriate function for this purpose

// This requires knowledge about what code it is

function encodeSha256Multihash(digest: HashSHA256) {
  return multiformats.digest.create(0x12, digest).bytes;
}

function encodeSha512Multihash(digest: HashSHA512) {
  return multiformats.digest.create(0x13, digest).bytes;
}

// ok I get it now
// it's actually sha2-256
// ok so we actually are using sha2 algorithms here
// and sha2-512 are our lower level functions
// then in order to use it here
// we also need to indicate what we are talking about here

/**
 * Decodes multihash into digest
 */
// function decodeMultihash(mHash: unknown): Buffer | undefined {
//   if (!utils.isBufferSource(mHash)) {
//     return;
//   }
//   let digest: Uint8Array;
//   try {
//     digest = multiformats.digest.decode(
//       utils.bufferWrap(mHash)
//     ).digest;
//   } catch {
//     return;
//   }
//   return utils.bufferWrap(digest);
// }



// /**
//  * SHA256 Multihash
//  * Use `sha256.encode` to get plain digest
//  * Use `sha256.digest` to get the `MultihashDigest`
//  * See: https://github.com/multiformats/multicodec/blob/master/table.csv
//  */
// const sha256M = multiformats.hasher.from({
//   name: 'sha2-256',
//   code: 0x12,
//   encode: (input: Uint8Array) => {
//     return keysUtils.sha256(input);
//   }
// });

// /**
//  * SHA512 Multihash
//  * Use `sha512.encode` to get plain digest
//  * Use `sha512.digest` to get the `MultihashDigest`
//  * See: https://github.com/multiformats/multicodec/blob/master/table.csv
//  */
// const sha512M = multiformats.hasher.from({
//   name: 'sha2-512',
//   code: 0x13,
//   encode: (input: Uint8Array) => {
//     return keysUtils.sha512(input);
//   }
// });

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
  decodeMultihash
};
