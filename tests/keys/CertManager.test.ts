import type { Key } from '@/keys/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { testProp, fc } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import CertManager from '@/keys/CertManager';
import * as keysUtils from '@/keys/utils';
import * as keysErrors from '@/keys/errors';
import * as utils from '@/utils';
import * as testsKeysUtils from './utils';

describe(CertManager.name, () => {
  const password = keysUtils.getRandomBytes(10).toString('utf-8');
  const privateKey = keysUtils.generateKeyPair().privateKey;
  const logger = new Logger(`${CertManager.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
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
      passwordMemLimit: keysUtils.passwordMemLimits.min
    });
    const dbPath = `${dataDir}/db`;
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText)
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText)
            );
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
  test('CertManager readiness', async () => {
    const certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    });
    await expect(async () => {
      await certManager.destroy();
    }).rejects.toThrow(keysErrors.ErrorCertManagerRunning);
    // Should be a noop
    await certManager.start();
    await certManager.stop();
    await certManager.destroy();
    await expect(certManager.start()).rejects.toThrow(
      keysErrors.ErrorCertManagerDestroyed,
    );
    await expect(async () => {
      await certManager.getCert();
    }).rejects.toThrow(keysErrors.ErrorCertManagerNotRunning);
  });
});
