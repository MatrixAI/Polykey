import url from 'node:url';
import path from 'node:path';
import b from 'benny';
import { suiteCommon } from './utils/utils.js';
import * as generate from '#keys/utils/generate.js';
import * as recoveryCode from '#keys/utils/recoveryCode.js';

const filename = url.fileURLToPath(new URL(import.meta.url));

async function main() {
  const code = recoveryCode.generateRecoveryCode(24);
  const summary = await b.suite(
    path.basename(filename, path.extname(filename)),
    b.add('generate root asymmetric keypair', () => {
      generate.generateKeyPair();
    }),
    b.add('generate deterministic root keypair', async () => {
      await generate.generateDeterministicKeyPair(code);
    }),
    b.add('generate 256 bit symmetric key', () => {
      generate.generateKey();
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
