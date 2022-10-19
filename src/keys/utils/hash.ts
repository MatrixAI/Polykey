import type {
  MultihashDigest
} from 'multiformats/hashes/interface';
import type {
  SHA2256,
  SHA2512,
  Digest,
} from '../types';
import sodium from 'sodium-native';
import * as multiformats from 'multiformats';
import * as utils from '../../utils';

function sha2256(data: BufferSource): Digest<SHA2256> {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha256_BYTES
  );
  sodium.crypto_hash_sha256(digest, utils.bufferWrap(data));
  return digest as Digest<SHA2256>;
}

/**
 * Stream compute a HashSHA256 hash.
 * This is a pre-primed generator.
 * Use `next(null)` to finish the consumer.
 */
function sha2256G(): Iterator<void, Digest<SHA2256>, BufferSource | null>{
  const g = (function *() {
    const digest = Buffer.allocUnsafeSlow(
      sodium.crypto_hash_sha256_BYTES
    );
    const state = Buffer.allocUnsafe(
      sodium.crypto_hash_sha256_STATEBYTES
    );
    sodium.crypto_hash_sha256_init(state);
    while (true) {
      const data = yield;
      if (data === null) {
        sodium.crypto_hash_sha256_final(state, digest);
        return digest as Digest<SHA2256>;
      }
      sodium.crypto_hash_sha256_update(state, utils.bufferWrap(data));
    }
  })();
  g.next();
  return g;
}

/**
 * Stream compute a HashSHA256 hash with iterable
 */
function sha2256I(data: Iterable<BufferSource>): Digest<SHA2256> {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha256_BYTES
  );
  const state = Buffer.allocUnsafe(
    sodium.crypto_hash_sha256_STATEBYTES
  );
  sodium.crypto_hash_sha256_init(state);
  for (const d of data) {
    sodium.crypto_hash_sha256_update(state, utils.bufferWrap(d));
  }
  sodium.crypto_hash_sha256_final(state, digest);
  return digest as Digest<SHA2256>;
}

function sha2512(data: BufferSource): Digest<SHA2512> {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha512_BYTES
  );
  sodium.crypto_hash_sha512(digest, utils.bufferWrap(data));
  return digest as Digest<SHA2512>;
}

/**
 * Stream compute a HashSHA512 hash.
 * This is a pre-primed generator.
 * Use `next(null)` to finish the consumer.
 */
function sha2512G(): Iterator<void, Digest<SHA2512>, BufferSource | null>{
  const g = (function *() {
    const digest = Buffer.allocUnsafeSlow(
      sodium.crypto_hash_sha512_BYTES
    );
    const state = Buffer.allocUnsafe(
      sodium.crypto_hash_sha512_STATEBYTES
    );
    sodium.crypto_hash_sha512_init(state);
    while (true) {
      const data = yield;
      if (data === null) {
        sodium.crypto_hash_sha512_final(state, digest);
        return digest as Digest<SHA2512>;
      }
      sodium.crypto_hash_sha512_update(state, utils.bufferWrap(data));
    }
  })();
  g.next();
  return g;
}

/**
 * Stream compute a HashSHA512 hash with iterable
 */
function sha2512I(data: Iterable<BufferSource>): Digest<SHA2512> {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha512_BYTES
  );
  const state = Buffer.allocUnsafe(
    sodium.crypto_hash_sha512_STATEBYTES
  );
  sodium.crypto_hash_sha512_init(state);
  for (const d of data) {
    sodium.crypto_hash_sha512_update(state, utils.bufferWrap(d));
  }
  sodium.crypto_hash_sha512_final(state, digest);
  return digest as Digest<SHA2512>;
}

function encodeSHA2256Digest(
  digest: Digest<SHA2256>
): MultihashDigest<0x12> {
  return multiformats.digest.create(
    0x12,
    digest
  );
}

function encodeSHA2512Digest(
  digest: Digest<SHA2512>
): MultihashDigest<0x13> {
  return multiformats.digest.create(
    0x13,
    digest
  );
}

/**
 * Decodes multihash digest.
 * The resulting digest could have any digest type.
 * Verify the supported digests by checking the `code` property.
 */
function decodeMultiDigest(
  multiDigest: unknown
): MultihashDigest<number> | undefined {
  if (!utils.isBufferSource(multiDigest)) {
    return;
  }
  try {
    return multiformats.digest.decode(
      utils.bufferWrap(multiDigest)
    );
  } catch {
    return;
  }
}

export {
  sha2256,
  sha2256G,
  sha2256I,
  sha2512,
  sha2512G,
  sha2512I,
  encodeSHA2256Digest,
  encodeSHA2512Digest,
  decodeMultiDigest,
};
