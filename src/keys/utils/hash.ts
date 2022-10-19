import type {
  MultihashDigest
} from 'multiformats/hashes/interface';
import type {
  Digest,
  DigestCode,
  DigestFormats,
} from '../types';
import sodium from 'sodium-native';
import * as multiformats from 'multiformats';
import * as types from '../types';
import * as utils from '../../utils';

function sha2256(data: BufferSource): Digest<'sha2-256'> {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha256_BYTES
  );
  sodium.crypto_hash_sha256(digest, utils.bufferWrap(data));
  return digest as Digest<'sha2-256'>;
}

/**
 * Stream compute a HashSHA256 hash.
 * This is a pre-primed generator.
 * Use `next(null)` to finish the consumer.
 */
function sha2256G(): Iterator<void, Digest<'sha2-256'>, BufferSource | null>{
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
        return digest as Digest<'sha2-256'>;
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
function sha2256I(data: Iterable<BufferSource>): Digest<'sha2-256'> {
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
  return digest as Digest<'sha2-256'>;
}

function sha2512(data: BufferSource): Digest<'sha2-512'> {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha512_BYTES
  );
  sodium.crypto_hash_sha512(digest, utils.bufferWrap(data));
  return digest as Digest<'sha2-512'>;
}

/**
 * Stream compute a HashSHA512 hash.
 * This is a pre-primed generator.
 * Use `next(null)` to finish the consumer.
 */
function sha2512G(): Iterator<void, Digest<'sha2-512'>, BufferSource | null>{
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
        return digest as Digest<'sha2-512'>;
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
function sha2512I(data: Iterable<BufferSource>): Digest<'sha2-512'> {
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
  return digest as Digest<'sha2-512'>;
}

function digestToMultidigest<K extends DigestFormats>(
  digest: Digest<K>,
  code: DigestCode<K>
): MultihashDigest<DigestCode<K>> {
  return multiformats.digest.create(code, digest);
}

function digestFromMultidigest(
  multiDigest: unknown
): MultihashDigest<DigestCode<DigestFormats>> | undefined {
  if (!utils.isBufferSource(multiDigest)) {
    return;
  }
  let digest: MultihashDigest<number>;
  try {
    digest = multiformats.digest.decode(
      utils.bufferWrap(multiDigest)
    );
  } catch {
    // Fails if the length is incorrect
    return;
  }
  if (!(digest.code in types.multihashCodesI)) {
    // Not a supported hash
    return;
  }
  return digest as MultihashDigest<DigestCode<DigestFormats>>;
}

export {
  sha2256,
  sha2256G,
  sha2256I,
  sha2512,
  sha2512G,
  sha2512I,
  digestToMultidigest,
  digestFromMultidigest,
};
