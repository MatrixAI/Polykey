import sodium from 'sodium-native';

/**
 * Get random bytes.
 * Use the JS seed number for deterministic randomisation.
 * The seed number will be encoded into a 8 byte buffer.
 * Set `pool` to false to acquire an unpooled buffer.
 * This means the underlying `ArrayBuffer` is safely transferrable.
 */
function getRandomBytes(
  size: number,
  seedNumber?: number,
  pool = true,
): Buffer {
  let randomBytes: Buffer;
  if (pool) {
    randomBytes = Buffer.allocUnsafe(size);
  } else {
    randomBytes = Buffer.allocUnsafeSlow(size);
  }
  if (seedNumber == null) {
    sodium.randombytes_buf(randomBytes);
  } else {
    // Convert JS number to 8 byte buffer
    const seedBytes = Buffer.alloc(8);
    seedBytes.writeDoubleBE(seedNumber);
    // Stretch seed number bytes to seed buffer required for deterministic random bytes
    const seedBuffer = Buffer.allocUnsafe(sodium.randombytes_SEEDBYTES);
    sodium.crypto_generichash(seedBuffer, seedBytes);
    sodium.randombytes_buf_deterministic(randomBytes, seedBuffer);
  }
  return randomBytes;
}

export { getRandomBytes };
