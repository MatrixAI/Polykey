import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Session } from '@/sessions';
import config from '@/config';
import * as clientErrors from '@/client/errors';
import * as testBinUtils from '../utils';

describe('lockall', () => {
  const logger = new Logger('lockall test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let pkAgentClose;
  const sessionTokenPath = path.join(
    global.binAgentDir,
    config.defaults.tokenBase,
  );
  beforeAll(async () => {
    pkAgentClose = await testBinUtils.pkAgent();
  }, global.maxTimeout);
  afterAll(async () => {
    await pkAgentClose();
  });
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    // Invalidate all active sessions
    await testBinUtils.pkStdio(
      ['agent', 'lock'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('cause old sessions to fail when locking all sessions', async () => {
    // Generate new token
    await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    // Read token
    const session = await Session.createSession({
      sessionTokenPath,
      fs,
      logger,
    });
    const token = await session.readToken();
    // Run command
    await testBinUtils.pkStdio(
      ['agent', 'lockall'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    // Call should fail because token is invalidated
    const { exitCode, stderr } = await testBinUtils.pkStdio(
      ['agent', 'status', '--verbose'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_TOKEN: token,
      },
      global.binAgentDir,
    );
    testBinUtils.expectProcessError(
      exitCode,
      stderr,
      new clientErrors.ErrorClientAuthDenied(),
    );
  });
  test('should fail to lock all sessions if agent stopped', async () => {
    // Stop agent
    await testBinUtils.pkStdio(
      ['agent', 'stop'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    // Run unlock command
    const { exitCode } = await testBinUtils.pkStdio(
      ['agent', 'lockall'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    expect(exitCode).toBe(64);
    // Undo side-effects
    await testBinUtils.pkStdio(
      ['agent', 'start'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
  });
});
