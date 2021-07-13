import type { Claim } from '@/sigchain/types';

import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as utils from '@/utils';

import { Session } from '@/session';

describe('Session is', () => {
  const logger = new Logger('SessionManager', LogLevel.WARN, [
    new StreamHandler(),
  ]);

  let dataDir: string;
  let clientPath: string;
  let session: Session;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    clientPath = path.join(dataDir, 'client');

    session = new Session({
      clientPath: clientPath,
      fs: fs,
      logger: logger,
    });
  });

  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('is type correct', async () => {
    expect(session).toBeInstanceOf(Session);
  });
  test('starts and stops', async () => {
    await session.start({ token: 'abc' as Claim });
    expect(session.token).toBe('abc' as Claim);
    await session.stop();
    expect(session.token).toBe('' as Claim);
  });
  test('can read token', async () => {
    await utils.mkdirExists(fs, session.clientPath, { recursive: true });
    await fs.promises.writeFile(session.sessionFile, 'token');
    const token = await session.readToken();
    await session.start({ token: token as Claim });
    expect(session.token).toBe('token' as Claim);
    await session.stop();
  });
  test('can write token', async () => {
    await session.start({ token: '123' as Claim });
    await session.writeToken();
    const token = await fs.promises.readFile(session.sessionFile, {
      encoding: 'utf-8',
    });
    expect(token).toBe('123');
    await session.stop();
  });
});
