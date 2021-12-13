import type { SessionToken } from '@/sessions/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import prompts from 'prompts';
import { mocked } from 'ts-jest/utils';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Session } from '@/sessions';
import config from '@/config';
import * as testBinUtils from '../utils';

/**
 * Mock prompts module which is used prompt for password
 */
jest.mock('prompts');
const mockedPrompts = mocked(prompts);

describe('lock', () => {
  const logger = new Logger('lock test', LogLevel.WARN, [new StreamHandler()]);
  const sessionTokenPath = path.join(
    global.binAgentDir,
    config.defaults.tokenBase,
  );
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
  test('lock deletes the session token', async () => {
    const session = await Session.createSession({
      sessionTokenPath,
      fs,
      logger,
    });
    await session.writeToken('abc' as SessionToken);
    const { exitCode } = await testBinUtils.pkStdio(
      ['agent', 'lock'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir,
    );
    expect(exitCode).toBe(0);
    expect(await session.readToken()).toBeUndefined();
  });
  test('lock ensures reauthentication is required', async () => {
    const password = global.binAgentPassword;
    mockedPrompts.mockClear();
    mockedPrompts.mockImplementation(async (_opts: any) => {
      return { password };
    });
    // Session token is set
    await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir
    );
    // Session token is deleted
    await testBinUtils.pkStdio(
      ['agent', 'lock'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir,
    );
    // Will prompt to reauthenticate
    await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir
    );
    // Prompted for password 1 time
    expect(mockedPrompts.mock.calls.length).toBe(1);
    mockedPrompts.mockClear();
  });
});
