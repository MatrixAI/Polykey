import webcrypto from './webcrypto';
import { sleep } from '../../utils';

/**
 * Get random bytes asynchronously.
 * This yields the event loop each 65,536 bytes.
 */
async function getRandomBytes(size: number): Promise<Buffer> {
  const randomBytes = Buffer.allocUnsafe(size);
  let i = 0;
  while (size > 0) {
    // Webcrypto limits a max 65,536 random bytes at a time
    const chunkSize = Math.min(size, 65536);
    const chunk = randomBytes.slice(i, chunkSize);
    webcrypto.getRandomValues(chunk);
    i += chunkSize;
    size -= chunkSize;
    if (size > 0) {
      await sleep(0);
    }
  }
  return randomBytes;
}

/**
 * Get random bytes synchronously.
 * This loops each 65,536 bytes until the buffer is filled.
 */
function getRandomBytesSync(size: number): Buffer {
  const randomBytes = Buffer.allocUnsafe(size);
  let i = 0;
  while (size > 0) {
    const chunkSize = Math.min(size, 65536);
    const chunk = randomBytes.slice(i, chunkSize);
    webcrypto.getRandomValues(chunk);
    i += chunkSize;
    size -= chunkSize;
  }
  return randomBytes;
}

export { getRandomBytes, getRandomBytesSync };
