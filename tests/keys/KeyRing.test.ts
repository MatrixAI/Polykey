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
  // TestProp(
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
      passwordMemLimit: keysUtils.passwordMemLimits.min,
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
      passwordMemLimit: keysUtils.passwordMemLimits.min,
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
  test.only('start and stop is persistent', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min
    });
    const nodeId = keyRing.getNodeId();
    const keyPair = {
      publicKey: Buffer.from(keyRing.keyPair.publicKey),
      privateKey: Buffer.from(keyRing.keyPair.privateKey),
      secretKey: Buffer.from(keyRing.keyPair.secretKey)
    };
    expect(keyRing.recoveryCode).toBeDefined();
    await keyRing.stop();
    await keyRing.start({
      password
    });
    expect(keyRing.getNodeId()).toStrictEqual(nodeId);
    expect(keyRing.keyPair).toStrictEqual(keyPair);
    expect(keyRing.recoveryCode).toBeUndefined();
    await keyRing.stop();
  });
  test('changed password persists after restart', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min
    });
    await keyRing.changePassword('new password');
    await keyRing.stop();
    await keyRing.start({
      password: 'new password',
    });
    expect(await keyRing.checkPassword('new password')).toBe(true);
    await keyRing.stop();
  });
  test('can check and change the password', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min
    });
    expect(await keyRing.checkPassword(password)).toBe(true);
    await keyRing.changePassword('new password');
    expect(await keyRing.checkPassword('new password')).toBe(true);
    await keyRing.stop();
  });
  test('creates a recovery code and can recover from the same code', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min
    });
    const nodeId = keyRing.getNodeId();
    const recoveryCode = keyRing.recoveryCode!;
    expect(recoveryCode).toBeDefined();
    await keyRing.stop();
    // Oops forgot the password
    // Use the recovery code to recover and set the new password
    await keyRing.start({
      password: 'newpassword',
      recoveryCode,
    });
    expect(await keyRing.checkPassword('newpassword')).toBe(true);
    expect(keyRing.getNodeId()).toStrictEqual(nodeId);
    await keyRing.stop();
  });
});
