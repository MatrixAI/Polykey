import url from 'node:url';
import path from 'node:path';
import b from 'benny';
import { suiteCommon } from './utils/utils.js';

const filename = url.fileURLToPath(new URL(import.meta.url));

async function main() {
  const buf = Buffer.allocUnsafe(64);
  const summary = await b.suite(
    path.basename(filename, path.extname(filename)),
    b.add('JSON stringify and parse buffer', () => {
      const bufJSON = JSON.stringify(buf);
      Buffer.from(JSON.parse(bufJSON));
    }),
    b.add('Base64 encode and decode buffer', () => {
      const bufBase64 = buf.toString('base64');
      Buffer.from(bufBase64, 'base64');
    }),
    b.add('Base64url encode and decode buffer', () => {
      const bufBase64 = buf.toString('base64url');
      Buffer.from(bufBase64, 'base64url');
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
