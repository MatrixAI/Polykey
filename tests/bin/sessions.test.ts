/**
 * There is no command call sessions
 * This is just for testing the CLI Authentication Retry Loop
 * @module
 */
import os from 'os';
import path from 'path';
import fs from 'fs';
import { mocked } from 'ts-jest/utils';
import prompts from 'prompts';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Session } from '@/sessions';
import { sleep } from '@/utils';
import config from '@/config';
import * as clientErrors from '@/client/errors';
import * as testBinUtils from './utils';
import * as testUtils from '../utils';

jest.mock('prompts');
const mockedPrompts = mocked(prompts);

describe('sessions', () => {
  const logger = new Logger('sessions test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let globalAgentDir;
  let globalAgentPassword;
  let globalAgentClose;
  beforeAll(async () => {
    ({ globalAgentDir, globalAgentPassword, globalAgentClose } =
      await testUtils.setupGlobalAgent(logger));
  }, globalThis.maxTimeout);
  afterAll(async () => {
    await globalAgentClose();
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
  test('serial commands refresh the session token', async () => {
    const session = await Session.createSession({
      sessionTokenPath: path.join(globalAgentDir, config.defaults.tokenBase),
      fs,
      logger,
    });
    let exitCode;
    ({ exitCode } = await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    ));
    expect(exitCode).toBe(0);
    const token1 = await session.readToken();
    // Tokens are not nonces
    // Wait at least 1 second
    // To ensure that the next token has a new expiry
    await sleep(1100);
    ({ exitCode } = await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    ));
    expect(exitCode).toBe(0);
    const token2 = await session.readToken();
    expect(token1).not.toBe(token2);
    await session.stop();
  });
  test('unattended commands with invalid authentication should fail', async () => {
    let exitCode, stderr;
    // Password and Token set
    ({ exitCode, stderr } = await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: 'invalid',
        PK_TOKEN: 'token',
      },
      globalAgentDir,
    ));
    testBinUtils.expectProcessError(
      exitCode,
      stderr,
      new clientErrors.ErrorClientAuthDenied(),
    );
    // Password set
    ({ exitCode, stderr } = await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: 'invalid',
        PK_TOKEN: undefined,
      },
      globalAgentDir,
    ));
    testBinUtils.expectProcessError(
      exitCode,
      stderr,
      new clientErrors.ErrorClientAuthDenied(),
    );
    // Token set
    ({ exitCode, stderr } = await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: undefined,
        PK_TOKEN: 'token',
      },
      globalAgentDir,
    ));
    testBinUtils.expectProcessError(
      exitCode,
      stderr,
      new clientErrors.ErrorClientAuthDenied(),
    );
  });
  test('prompt for password to authenticate attended commands', async () => {
    const password = globalAgentPassword;
    await testBinUtils.pkStdio(
      ['agent', 'lock'],
      {
        PK_NODE_PATH: globalAgentDir,
      },
      globalAgentDir,
    );
    mockedPrompts.mockClear();
    mockedPrompts.mockImplementation(async (_opts: any) => {
      return { password };
    });
    const { exitCode } = await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: globalAgentDir,
      },
      globalAgentDir,
    );
    expect(exitCode).toBe(0);
    // Prompted for password 1 time
    expect(mockedPrompts.mock.calls.length).toBe(1);
    mockedPrompts.mockClear();
  });
  test('re-prompts for password if unable to authenticate command', async () => {
    await testBinUtils.pkStdio(
      ['agent', 'lock'],
      {
        PK_NODE_PATH: globalAgentDir,
      },
      globalAgentDir,
    );
    const validPassword = globalAgentPassword;
    const invalidPassword = 'invalid';
    mockedPrompts.mockClear();
    mockedPrompts
      .mockResolvedValueOnce({ password: invalidPassword })
      .mockResolvedValue({ password: validPassword });
    const { exitCode } = await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: globalAgentDir,
      },
      globalAgentDir,
    );
    expect(exitCode).toBe(0);
    // Prompted for password 2 times
    expect(mockedPrompts.mock.calls.length).toBe(2);
    mockedPrompts.mockClear();
  });
});
