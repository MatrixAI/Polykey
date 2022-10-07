import { Crypto } from '@peculiar/webcrypto';
import { sleep } from './src/utils';

const webcrypto = new Crypto();

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

async function main() {
  // const x = getRandomBytesSync(70 * 1024);
  const x = await getRandomBytes(70 * 1024);
  console.log(x.byteLength);
  console.log(x);
}

void main();
