import sodium from 'sodium-native';

function sha256(data: Buffer): Buffer {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha256_BYTES
  );
  sodium.crypto_hash_sha256(digest, data);
  return digest;
}

/**
 * Stream compute a SHA256 hash.
 * Make sure to prime the generator with `g.next()`.
 */
function *sha256G(): Generator<Buffer | undefined, void, Buffer>{
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha256_BYTES
  );
  const state = Buffer.allocUnsafe(
    sodium.crypto_hash_sha256_STATEBYTES
  );
  sodium.crypto_hash_sha256_init(state);
  try {
    while (true) {
      const data = yield;
      sodium.crypto_hash_sha256_update(state, data);
    }
  } finally {
    sodium.crypto_hash_sha256_final(state, digest);
    yield digest;
  }
}

/**
 * Stream compute a SHA256 hash with iterable
 */
function sha256I(data: Iterable<Buffer>): Buffer {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha256_BYTES
  );
  const state = Buffer.allocUnsafe(
    sodium.crypto_hash_sha256_STATEBYTES
  );
  sodium.crypto_hash_sha256_init(state);
  for (const d of data) {
    sodium.crypto_hash_sha256_update(state, d);
  }
  sodium.crypto_hash_sha256_final(state, digest);
  return digest;
}

function sha512(data: Buffer): Buffer {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha512_BYTES
  );
  sodium.crypto_hash_sha512(digest, data);
  return digest;
}

/**
 * Stream compute a SHA512 hash.
 * Make sure to prime the generator with `g.next()`.
 */
function *sha512G(): Generator<Buffer | undefined, void, Buffer>{
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha512_BYTES
  );
  const state = Buffer.allocUnsafe(
    sodium.crypto_hash_sha512_STATEBYTES
  );
  sodium.crypto_hash_sha512_init(state);
  try {
    while (true) {
      const data = yield;
      sodium.crypto_hash_sha512_update(state, data);
    }
  } finally {
    sodium.crypto_hash_sha512_final(state, digest);
    yield digest;
  }
}

/**
 * Stream compute a SHA512 hash with iterable
 */
function sha512I(data: Iterable<Buffer>): Buffer {
  const digest = Buffer.allocUnsafeSlow(
    sodium.crypto_hash_sha512_BYTES
  );
  const state = Buffer.allocUnsafe(
    sodium.crypto_hash_sha512_STATEBYTES
  );
  sodium.crypto_hash_sha512_init(state);
  for (const d of data) {
    sodium.crypto_hash_sha512_update(state, d);
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
