import fs from 'fs';
import os from 'os';
import path from 'path';
import { testProp, fc } from '@fast-check/jest';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import * as keysErrors from '@/keys/errors';
import * as testsKeysUtils from './utils';

describe(KeyRing.name, () => {
  const password = keysUtils.getRandomBytes(10).toString('utf-8');
  const logger = new Logger(`${KeyRing.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  // testProp(
  //   'KeyRing readiness',
  //   [ testsKeysUtils.passwordArb, ],
  //   async (password) => {
  //   }
  // );
  test('KeyRing readiness', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min
    });
    await expect(async () => {
      await keyRing.destroy();
    }).rejects.toThrow(keysErrors.ErrorKeyRingRunning);
    // Should be a noop
    await keyRing.start({ password });
    await keyRing.stop();
    await keyRing.destroy();
    await expect(keyRing.start({ password })).rejects.toThrow(
      keysErrors.ErrorKeyRingDestroyed,
    );
    expect(() => {
      keyRing.keyPair;
    }).toThrow(keysErrors.ErrorKeyRingNotRunning);
    await expect(async () => {
      await keyRing.checkPassword(password);
    }).rejects.toThrow(keysErrors.ErrorKeyRingNotRunning);
  });
  test('constructs root key pair, and db key', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min
    });
    const keysPathContents = await fs.promises.readdir(keysPath);
    expect(keysPathContents).toContain('public.jwk');
    expect(keysPathContents).toContain('private.jwk');
    expect(keysPathContents).toContain('db.jwk');
    expect(keyRing.keyPair.publicKey).toBeInstanceOf(Buffer);
    expect(keyRing.keyPair.publicKey.byteLength).toBe(32);
    expect(keyRing.keyPair.privateKey).toBeInstanceOf(Buffer);
    expect(keyRing.keyPair.privateKey.byteLength).toBe(32);
    expect(keyRing.dbKey).toBeInstanceOf(Buffer);
    expect(keyRing.dbKey.byteLength).toBe(32);
    await keyRing.stop();
  });
});
