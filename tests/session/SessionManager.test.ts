import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { DB } from '@matrixai/db';
import { KeyManager } from '@/keys';
import { SessionManager } from '@/sessions';
import { makeCrypto } from '../utils';

describe('SessionManager', () => {
  const password = 'password';
  const logger = new Logger('SessionManager', LogLevel.WARN, [
    new StreamHandler(),
  ]);

  let dataDir: string;
  let keysPath: string;
  let dbPath: string;
  let db: DB;
  let keyManager: KeyManager;
  let sessionManager: SessionManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    keysPath = path.join(dataDir, 'keys');
    dbPath = path.join(dataDir, 'db');

    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      fs: fs,
      logger: logger,
    });

    db = await DB.createDB({
      dbPath: dbPath,
      fs: fs,
      logger: logger,
      crypto: makeCrypto(keyManager),
    });

    sessionManager = await SessionManager.createSessionManager({
      db: db,
      logger: logger,
      bits: 4096,
    });
    await db.start();
  });

  afterEach(async () => {
    await keyManager.destroy();
    await sessionManager.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('is type correct', async () => {
    expect(sessionManager).toBeInstanceOf(SessionManager);
  });

  test('destroys', async () => {
    expect(sessionManager.destroyed).toBe(false);
    await sessionManager.destroy();
    expect(sessionManager.destroyed).toBe(true);
    await expect(sessionManager.refreshKey()).rejects.toThrow();
  });
  test('can generate and verify JWT Token', async () => {
    const claim = await sessionManager.generateToken();
    const result = await sessionManager.verifyToken(claim);
    expect(result.payload.token).toBeTruthy();
  });
});
