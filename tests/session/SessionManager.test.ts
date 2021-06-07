import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { KeyManager } from '@/keys';
import { SessionManager } from '@/session';
import { sleep } from '@/utils';
import { ErrorPassword } from '@/session/errors';

describe('Session Manager', () => {
  const logger = new Logger('SessionManager', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let keyManager: KeyManager;
  let sessionManager: SessionManager;

  let dataDir: string;
  let keysPath: string;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    keysPath = path.join(dataDir, 'keys');

    keyManager = new KeyManager({
      keysPath: keysPath,
      fs: fs,
      logger: logger,
    });

    sessionManager = new SessionManager({
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });

    await keyManager.start({ password: 'password' });
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
    await sessionManager.start({ sessionDuration: 5000 });
    expect(sessionManager.started).toBe(true);
    expect(sessionManager.sessionStarted).toBe(false);
    await sessionManager.stop();
    expect(sessionManager.started).toBe(false);
    expect(sessionManager.sessionStarted).toBe(false);
  });

  test('can start a session', async () => {
    const duration = 1000;
    await sessionManager.start({ sessionDuration: duration });
    await sessionManager.startSession('password');
    await new Promise<void>((resolve) => {
      expect(sessionManager.sessionStarted).toBe(true);
      setTimeout(() => resolve(), duration);
    });
    await sessionManager.stop();
  });
  test('can let a session expire', async () => {
    const duration = 1000;
    await sessionManager.start({ sessionDuration: duration });
    await sessionManager.startSession('password');
    await new Promise<void>((resolve) => {
      expect(sessionManager.sessionStarted).toBe(true);
      setTimeout(() => resolve(), duration);
    });
    expect(sessionManager.sessionStarted).toBe(false);
    await sessionManager.stop();
  });
  test('can refresh a session', async () => {
    const duration = 1000;
    await sessionManager.start({ sessionDuration: duration });
    await sessionManager.startSession('password');
    await new Promise<void>((resolve) => {
      expect(sessionManager.sessionStarted).toBe(true);
      setTimeout(() => resolve(), 600);
    });
    // If this one doesnt refresh the session,
    // the next assert should fail
    await sessionManager.startSession('password');
    await sleep(600);
    await new Promise<void>((resolve) => {
      expect(sessionManager.sessionStarted).toBe(true);
      setTimeout(() => resolve(), 600);
    });
    expect(sessionManager.sessionStarted).toBe(false);
    await sessionManager.stop();
  });
  test('recognizes an incorrect password', async () => {
    const duration = 1000;
    await sessionManager.start({ sessionDuration: duration });
    await expect(sessionManager.startSession('wrong')).rejects.toThrow(
      ErrorPassword,
    );
    await new Promise<void>((resolve) => {
      expect(sessionManager.sessionStarted).toBe(false);
      setTimeout(() => resolve(), duration);
    });
    await sessionManager.stop();
  });
  test('keeps a session active even if an incorrect password is given', async () => {
    const duration = 1000;
    await sessionManager.start({ sessionDuration: duration });
    await sessionManager.startSession('password');
    await expect(sessionManager.startSession('wrong')).rejects.toThrow(
      ErrorPassword,
    );
    await new Promise<void>((resolve) => {
      expect(sessionManager.sessionStarted).toBe(true);
      setTimeout(() => resolve(), duration);
    });
    await sessionManager.stop();
  });
});
