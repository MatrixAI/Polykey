import sodium from 'sodium-native';

function getRandomBytes(size: number, seedNumber?: number) {
  const randomBytes = Buffer.allocUnsafe(size);
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
