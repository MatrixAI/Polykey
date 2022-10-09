import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import KeyRing from '../../src/keys/KeyRing';
import * as keysErrors from '@/keys/errors';

describe(KeyRing.name, () => {
  const password = 'password';
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
  test('KeyRing readiness', async () => {
    const keysPath = `${dataDir}/keys`;
    const keyRing = await KeyRing.createKeyRing({
      keysPath,
      password,
      logger,
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
});
