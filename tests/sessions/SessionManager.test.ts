import fs from 'fs';
import os from 'os';
import path from 'path';
import { DB } from '@matrixai/db';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import KeyManager from '@/keys/KeyManager';
import * as keysUtils from '@/keys/utils';
import SessionManager from '@/sessions/SessionManager';
import * as sessionsErrors from '@/sessions/errors';
import { sleep } from '@/utils';
import { globalRootKeyPems } from '../fixtures/globalRootKeyPems';

describe('SessionManager', () => {
  const password = 'password';
  const logger = new Logger(`${SessionManager.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  /**
   * Shared db, keyManager for all tests
   */
  let dataDir: string;
  let db: DB;
  let keyManager: KeyManager;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
      privateKeyPemOverride: globalRootKeyPems[0],
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      // @ts-ignore - version of js-logger is incompatible (remove when DB updates to 5.*)
      logger,
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
  });
  afterEach(async () => {
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('session manager readiness', async () => {
    const sessionManager = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger,
    });
    await expect(sessionManager.destroy()).rejects.toThrow(
      sessionsErrors.ErrorSessionManagerRunning,
    );
    // Should be a noop
    await sessionManager.start();
    await sessionManager.stop();
    await sessionManager.destroy();
    await expect(sessionManager.start()).rejects.toThrow(
      sessionsErrors.ErrorSessionManagerDestroyed,
    );
    await expect(async () => {
      await sessionManager.resetKey();
    }).rejects.toThrow(sessionsErrors.ErrorSessionManagerNotRunning);
    await expect(async () => {
      await sessionManager.createToken();
    }).rejects.toThrow(sessionsErrors.ErrorSessionManagerNotRunning);
  });
  test('creating and verifying session tokens', async () => {
    const sessionManager = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger,
    });
    const token = await sessionManager.createToken();
    expect(typeof token).toBe('string');
    expect(token.length > 0).toBe(true);
    expect(await sessionManager.verifyToken(token)).toBe(true);
    await sessionManager.stop();
  });
  test('checking expired session tokens', async () => {
    const sessionManager = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger,
    });
    const token = await sessionManager.createToken(0);
    expect(typeof token).toBe('string');
    expect(token.length > 0).toBe(true);
    expect(await sessionManager.verifyToken(token)).toBe(true);
    // At least 1 second of delay
    // Expiry time resolution is in seconds
    await sleep(1100);
    expect(await sessionManager.verifyToken(token)).toBe(false);
    await sessionManager.stop();
  });
  test('sessions key is persistent across restarts', async () => {
    const sessionManager1 = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger,
    });
    const token = await sessionManager1.createToken();
    await sessionManager1.stop();
    await sessionManager1.start();
    expect(await sessionManager1.verifyToken(token)).toBe(true);
    await sessionManager1.stop();
    const sessionManager2 = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger,
    });
    expect(await sessionManager2.verifyToken(token)).toBe(true);
    await sessionManager2.stop();
  });
  test('creating fresh session manager', async () => {
    const sessionManager1 = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger,
    });
    const token = await sessionManager1.createToken();
    await sessionManager1.stop();
    const sessionManager2 = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger,
      fresh: true,
    });
    expect(await sessionManager2.verifyToken(token)).toBe(false);
    await sessionManager2.stop();
  });
  test('renewing key invalidates existing tokens', async () => {
    const sessionManager = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger,
    });
    const token1 = await sessionManager.createToken();
    const token2 = await sessionManager.createToken();
    expect(await sessionManager.verifyToken(token1)).toBe(true);
    expect(await sessionManager.verifyToken(token2)).toBe(true);
    await sessionManager.resetKey();
    expect(await sessionManager.verifyToken(token1)).toBe(false);
    expect(await sessionManager.verifyToken(token2)).toBe(false);
    const token3 = await sessionManager.createToken();
    expect(await sessionManager.verifyToken(token3)).toBe(true);
    await sessionManager.stop();
  });
  test('concurrent token generation with key reset', async () => {
    const sessionManager = await SessionManager.createSessionManager({
      db,
      keyManager,
      logger,
    });
    for (let i = 0; i < 100; i++) {
      const [, ...tokens] = await Promise.all([
        sessionManager.resetKey(),
        sessionManager.createToken(),
        sessionManager.createToken(),
        sessionManager.createToken(),
      ]);
      const verified = await Promise.all([
        sessionManager.verifyToken(tokens[0]),
        sessionManager.verifyToken(tokens[1]),
        sessionManager.verifyToken(tokens[2]),
      ]);
      expect([true, false]).toContain(verified[0]);
      expect([true, false]).toContain(verified[1]);
      expect([true, false]).toContain(verified[2]);
    }
    await sessionManager.stop();
  });
});
