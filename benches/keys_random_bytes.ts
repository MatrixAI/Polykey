import path from 'node:path';
import url from 'node:url';
import b from 'benny';
import { suiteCommon } from './utils/utils.js';
import * as random from '#keys/utils/random.js';

const filename = url.fileURLToPath(new URL(import.meta.url));

async function main() {
  const summary = await b.suite(
    path.basename(filename, path.extname(filename)),
    b.add('random 512 B of data', () => {
      random.getRandomBytes(512);
    }),
    b.add('random 1 KiB of data', () => {
      random.getRandomBytes(1024);
    }),
    b.add('random 10 KiB of data', () => {
      random.getRandomBytes(1024 * 10);
    }),
    ...suiteCommon,
  );
  return summary;
}

if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    void main();
  }
}

export default main;
