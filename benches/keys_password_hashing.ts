import url from 'node:url';
import path from 'node:path';
import b from 'benny';
import { suiteCommon } from './utils/utils.js';
import * as password from '#keys/utils/password.js';

const filename = url.fileURLToPath(new URL(import.meta.url));

async function main() {
  const summary = await b.suite(
    path.basename(filename, path.extname(filename)),
    b.add('password hashing - min', () => {
      password.hashPassword(
        'password',
        undefined,
        password.passwordOpsLimits.min,
        password.passwordMemLimits.min,
      );
    }),
    b.add('password hashing - interactive', () => {
      password.hashPassword(
        'password',
        undefined,
        password.passwordOpsLimits.interactive,
        password.passwordMemLimits.interactive,
      );
    }),
    b.add('password hashing - moderate', () => {
      password.hashPassword(
        'password',
        undefined,
        password.passwordOpsLimits.moderate,
        password.passwordMemLimits.moderate,
      );
    }),
    b.add('password hashing - sensitive', () => {
      password.hashPassword(
        'password',
        undefined,
        password.passwordOpsLimits.sensitive,
        password.passwordMemLimits.sensitive,
      );
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
