import path from 'node:path';
import url from 'node:url';
import b from 'benny';
import { suiteCommon } from './utils/utils.js';
import * as recoveryCode from '#keys/utils/recoveryCode.js';

const filename = url.fileURLToPath(new URL(import.meta.url));

async function main() {
  const summary = await b.suite(
    path.basename(filename, path.extname(filename)),
    b.add('generate 24 word recovery code', async () => {
      recoveryCode.generateRecoveryCode(24);
    }),
    b.add('generate 12 word recovery code', async () => {
      recoveryCode.generateRecoveryCode(12);
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
