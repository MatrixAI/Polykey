import sodium from 'sodium-native';
import * as utils from '../../utils';

function sha256(data: BufferSource): Buffer {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha256_BYTES
  );
  sodium.crypto_hash_sha256(digest, utils.bufferWrap(data));
  return digest;
}

/**
 * Stream compute a SHA256 hash.
 * This is a pre-primed generator.
 * Use `next(null)` to finish the consumer.
 */
function sha256G(): Iterator<void, Buffer, BufferSource | null>{
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
        return digest;
      }
      sodium.crypto_hash_sha256_update(state, utils.bufferWrap(data));
    }
  })();
  g.next();
  return g;
}

/**
 * Stream compute a SHA256 hash with iterable
 */
function sha256I(data: Iterable<BufferSource>): Buffer {
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
  return digest;
}

function sha512(data: BufferSource): Buffer {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha512_BYTES
  );
  sodium.crypto_hash_sha512(digest, utils.bufferWrap(data));
  return digest;
}

/**
 * Stream compute a SHA512 hash.
 * This is a pre-primed generator.
 * Use `next(null)` to finish the consumer.
 */
function sha512G(): Iterator<void, Buffer, BufferSource | null>{
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
        return digest;
      }
      sodium.crypto_hash_sha512_update(state, utils.bufferWrap(data));
    }
  })();
  g.next();
  return g;
}

/**
 * Stream compute a SHA512 hash with iterable
 */
function sha512I(data: Iterable<BufferSource>): Buffer {
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
  return digest;
}

export {
  sha256,
  sha256G,
  sha256I,
  sha512,
  sha512G,
  sha512I,
};
