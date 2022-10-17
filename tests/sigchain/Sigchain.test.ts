import type {
  Key,
} from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import * as keysUtils from '@/keys/utils';
import KeyRing from '@/keys/KeyRing';
import Sigchain from '@/sigchain/Sigchain';
import * as sigchainErrors from '@/sigchain/errors';

describe(Sigchain.name, () => {
  const password = keysUtils.getRandomBytes(10).toString('utf-8');
  const privateKey = keysUtils.generateKeyPair().privateKey;
  const logger = new Logger(`${Sigchain.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let dbPath: string;
  let db: DB;
  let keyRing: KeyRing;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      privateKey,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              Buffer.from(key) as Key,
              Buffer.from(plainText),
            ).buffer;
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              Buffer.from(key) as Key,
              Buffer.from(cipherText),
            )?.buffer;
          },
        },
      },
    });
  });
  afterEach(async () => {
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('Sigchain readiness', async () => {
    const sigchain = await Sigchain.createSigchain({ keyRing, db, logger });
    await expect(async () => {
      await sigchain.destroy();
    }).rejects.toThrow(sigchainErrors.ErrorSigchainRunning);
    // Should be a noop
    await sigchain.start();
    await sigchain.stop();
    await sigchain.destroy();
    await expect(sigchain.start()).rejects.toThrow(
      sigchainErrors.ErrorSigchainDestroyed
    );
    await expect(async () => {
      for await (const _ of sigchain.getClaims()) {
        // NOOP
      }
    }).rejects.toThrow(sigchainErrors.ErrorSigchainNotRunning);
  });

});
