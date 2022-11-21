import fs from 'fs';
import os from 'os';
import path from 'path';
import b from 'benny';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import KeyRing from '@/keys/KeyRing';
import { summaryName, suiteCommon } from '../../utils';

async function main() {
  const summary = await b.suite(
    summaryName(__filename),
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

if (require.main === module) {
  void main();
}

export default main;
