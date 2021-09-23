import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { DB } from '@matrixai/db';
import { KeyManager } from '@/keys';
import { SessionManager } from '@/sessions';

describe('SessionManager', () => {
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
      keysPath,
      fs: fs,
      logger: logger,
    });

    db = await DB.createDB({
      dbPath: dbPath,
      fs: fs,
      logger: logger,
    });

    sessionManager = new SessionManager({
      db: db,
      logger: logger,
    });
    await keyManager.start({ password: 'password' });
    await db.start(); // TODO start with { keyPair: keyManager.getRootKeyPair() }
    await sessionManager.start({ bits: 4096 });
  });

  afterEach(async () => {
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('is type correct', async () => {
    expect(sessionManager).toBeInstanceOf(SessionManager);
  });

  test('starts and stops', async () => {
    await sessionManager.start({ bits: 4096 });
    expect(sessionManager.started).toBe(true);
    await sessionManager.stop();
    expect(sessionManager.started).toBe(false);
  });
  test('can generate and verify JWT Token', async () => {
    await sessionManager.start({ bits: 4096 });
    const claim = await sessionManager.generateToken();
    const result = await sessionManager.verifyToken(claim);
    await sessionManager.stop();
    expect(result.payload.token).toBeTruthy();
  });
});
