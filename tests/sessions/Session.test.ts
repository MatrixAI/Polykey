import type { SessionToken } from '@/sessions/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Session from '@/sessions/Session';
import * as sessionErrors from '@/sessions/errors';

describe('Session', () => {
  const logger = new Logger(`${Session.name} Test`, LogLevel.WARN, [
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
  test('session readiness', async () => {
    const session = await Session.createSession({
      sessionTokenPath: path.join(dataDir, 'token'),
      logger,
    });
    await expect(session.destroy()).rejects.toThrow(
      sessionErrors.ErrorSessionRunning,
    );
    // Should be a noop
    await session.start();
    await session.stop();
    await session.destroy();
    await expect(session.start()).rejects.toThrow(
      sessionErrors.ErrorSessionDestroyed,
    );
  });
  test('creating session', async () => {
    const session1 = await Session.createSession({
      sessionTokenPath: path.join(dataDir, 'token'),
      logger,
    });
    expect(await session1.readToken()).toBeUndefined();
    await session1.writeToken('abc' as SessionToken);
    expect(await session1.readToken()).toBe('abc');
    await session1.stop();
    // Can re-read it
    const session2 = await Session.createSession({
      sessionTokenPath: path.join(dataDir, 'token'),
      logger,
    });
    expect(await session2.readToken()).toBe('abc');
    await session2.stop();
  });
  test('creating session with initial token', async () => {
    const session = await Session.createSession({
      sessionTokenPath: path.join(dataDir, 'token'),
      sessionToken: 'abc' as SessionToken,
      logger,
    });
    expect(await session.readToken()).toBe('abc');
    await session.stop();
  });
  test('creating fresh session', async () => {
    const session1 = await Session.createSession({
      sessionTokenPath: path.join(dataDir, 'token'),
      fresh: true,
      logger,
    });
    expect(await session1.readToken()).toBeUndefined();
    await session1.writeToken('abc' as SessionToken);
    await session1.stop();
    const session2 = await Session.createSession({
      sessionTokenPath: path.join(dataDir, 'token'),
      fresh: true,
      logger,
    });
    expect(await session2.readToken()).toBeUndefined();
    await session2.stop();
    // If initial token is specified, then fresh has no effect
    const session3 = await Session.createSession({
      sessionTokenPath: path.join(dataDir, 'token'),
      sessionToken: 'abc' as SessionToken,
      fresh: true,
      logger,
    });
    expect(await session3.readToken()).toBe('abc');
    await session3.stop();
  });
  test('destroying session destroys underlying token state', async () => {
    const session1 = await Session.createSession({
      sessionTokenPath: path.join(dataDir, 'token'),
      logger,
    });
    await session1.writeToken('abc' as SessionToken);
    await session1.stop();
    await session1.destroy();
    const session2 = await Session.createSession({
      sessionTokenPath: path.join(dataDir, 'token'),
      logger,
    });
    expect(await session2.readToken()).toBeUndefined();
  });
  test('concurrent session reads and writes', async () => {
    // Run a hundred times
    for (let i = 0; i < 100; i++) {
      const session = await Session.createSession({
        sessionTokenPath: path.join(dataDir, 'token'),
        sessionToken: 'initial' as SessionToken,
        logger,
      });
      const results = await Promise.all([
        session.readToken(),
        session.writeToken('foo' as SessionToken),
        session.readToken(),
        session.writeToken('bar' as SessionToken),
      ]);
      expect(['initial', 'foo', 'bar']).toContain(results[0]);
      expect(['initial', 'foo', 'bar']).toContain(results[2]);
      expect(['foo', 'bar']).toContain(await session.readToken());
      await session.stop();
    }
  });
  test('simultaneous creation and destruction of session instances', async () => {
    // Run a hundred times
    for (let i = 0; i < 100; i++) {
      const results = await Promise.all([
        Session.createSession({
          sessionTokenPath: path.join(dataDir, 'token'),
          sessionToken: 'initial1' as SessionToken,
          logger,
        }),
        Session.createSession({
          sessionTokenPath: path.join(dataDir, 'token'),
          sessionToken: 'initial2' as SessionToken,
          logger,
        }),
        Session.createSession({
          sessionTokenPath: path.join(dataDir, 'token'),
          sessionToken: 'initial3' as SessionToken,
          logger,
        }),
      ]);
      const token1 = await results[0].readToken();
      const token2 = await results[1].readToken();
      const token3 = await results[2].readToken();
      expect(token1).toBe(token2);
      expect(token2).toBe(token3);
      expect(['initial1', 'initial2', 'initial3']).toContain(token1);
      await Promise.all([
        results[0].stop(),
        results[1].stop(),
        results[2].stop(),
      ]);
      await Promise.all([
        results[0].destroy(),
        results[1].destroy(),
        results[2].destroy(),
      ]);
    }
  });
});
