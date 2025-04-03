import fs from 'node:fs';
import os from 'node:os';
import url from 'node:url';
import path from 'node:path';
import b from 'benny';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { suiteCommon } from './utils/utils.js';
import KeyRing from '#keys/KeyRing.js';

const filename = url.fileURLToPath(new URL(import.meta.url));

async function main() {
  const summary = await b.suite(
    path.basename(filename, path.extname(filename)),
    b.add('KeyRing fresh creation', async () => {
      const dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-bench-'),
      );
      const logger = new Logger(`keyring_lifecycle bench`, LogLevel.WARN, [
        new StreamHandler(),
      ]);
      return async () => {
        const keyRing = await KeyRing.createKeyRing({
          keysPath: `${dataDir}/keys`,
          password: 'password',
          logger,
          fresh: true,
        });
        await keyRing.stop();
      };
    }),
    b.add('KeyRing start & stop', async () => {
      const dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-bench-'),
      );
      const logger = new Logger(`keyring_lifecycle bench`, LogLevel.WARN, [
        new StreamHandler(),
      ]);
      const keyRing = await KeyRing.createKeyRing({
        keysPath: `${dataDir}/keys`,
        password: 'password',
        logger,
      });
      await keyRing.stop();
      return async () => {
        // Due to password hashing this is intended to be slow
        await keyRing.start({
          password: 'password',
        });
        await keyRing.stop();
      };
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
