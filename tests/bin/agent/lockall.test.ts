import os from 'os';
import path from 'path';
import fs from 'fs';
import prompts from 'prompts';
import { mocked } from 'ts-jest/utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Session } from '@/sessions';
import config from '@/config';
import * as clientErrors from '@/client/errors';
import * as testBinUtils from '../utils';

/**
 * Mock prompts module which is used prompt for password
 */
jest.mock('prompts');
const mockedPrompts = mocked(prompts);

describe('lockall', () => {
  const logger = new Logger('lockall test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let pkAgentClose;
  beforeAll(async () => {
    pkAgentClose = await testBinUtils.pkAgent();
  }, global.maxTimeout);
  afterAll(async () => {
    await pkAgentClose();
  });
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
  test('lockall deletes the session token', async () => {
    await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    const { exitCode } = await testBinUtils.pkStdio(
      ['agent', 'lockall'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir,
    );
    expect(exitCode).toBe(0);
    const session = await Session.createSession({
      sessionTokenPath: path.join(
        global.binAgentDir,
        config.defaults.tokenBase,
      ),
      fs,
      logger,
    });
    expect(await session.readToken()).toBeUndefined();
    await session.stop();
  });
  test('lockall ensures reauthentication is required', async () => {
    const password = global.binAgentPassword;
    await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    await testBinUtils.pkStdio(
      ['agent', 'lockall'],
      {
        PK_NODE_PATH: global.binAgentDir
      },
      global.binAgentDir,
    );
    // Token is deleted, reauthentication is required
    mockedPrompts.mockClear();
    mockedPrompts.mockImplementation(async (_opts: any) => {
      return { password };
    });
    await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir,
    );
    // Prompted for password 1 time
    expect(mockedPrompts.mock.calls.length).toBe(1);
    mockedPrompts.mockClear();
  });
  test('lockall causes old session tokens to fail', async () => {
    await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    const session = await Session.createSession({
      sessionTokenPath: path.join(
        global.binAgentDir,
        config.defaults.tokenBase,
      ),
      fs,
      logger,
    });
    const token = await session.readToken();
    await session.stop();
    await testBinUtils.pkStdio(
      ['agent', 'lockall'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    // Old token is invalid
    const { exitCode, stderr } = await testBinUtils.pkStdio(
      ['agent', 'status'],
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
});
