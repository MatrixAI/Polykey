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

/**
 * Mock prompts module which is used prompt for password
 */
jest.mock('prompts');
const mockedPrompts = mocked(prompts);

describe('CLI Sessions', () => {
  const logger = new Logger('sessions test', LogLevel.WARN, [
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
  test('processes should refresh the session token', async () => {
    const session = await Session.createSession({
      sessionTokenPath,
      fs,
      logger,
    });
    await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    const token1 = await session.readToken();
    // New command should refresh token
    // Need to wait for 1100ms to ensure refreshed token will be different from previous one
    // Our tokens are not nonces and are expected to be able to be reused
    await sleep(1100);
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json', '--verbose'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ status: 'LIVE' });
    const token2 = await session.readToken();
    expect(token1).not.toBe(token2);
  });
  test('serial processes should both refresh the session token', async () => {
    const session = await Session.createSession({
      sessionTokenPath,
      fs,
      logger,
    });
    // Run first command
    let exitCode, stdout;
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json', '--verbose'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ status: 'LIVE' });
    const token1 = await session.readToken();
    // Run second command
    // Need to wait for 1100ms to ensure refreshed token will be different from previous one
    // Our tokens are not nonces and are expected to be able to be reused
    await sleep(1100);
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json', '--verbose'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ status: 'LIVE' });
    const token2 = await session.readToken();
    // Assert different
    expect(token1).not.toBe(token2);
  });
  test('unattended calls with invalid auth should fail', async () => {
    let exitCode, stderr;
    // Password and Token set
    ({ exitCode, stderr } = await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: 'invalid',
        PK_TOKEN: 'token',
      },
      global.binAgentDir,
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
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: 'invalid',
        PK_TOKEN: undefined,
      },
      global.binAgentDir,
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
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: undefined,
        PK_TOKEN: 'token',
      },
      global.binAgentDir,
    ));
    testBinUtils.expectProcessError(
      exitCode,
      stderr,
      new clientErrors.ErrorClientAuthDenied(),
    );
  });
  test('password can be used to authenticate attended calls', async () => {
    const password = global.binAgentPassword;
    mockedPrompts.mockClear();
    mockedPrompts.mockImplementation(async (_opts: any) => {
      return { password };
    });
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json', '--verbose'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ status: 'LIVE' });
    // Prompted for password 1 time
    expect(mockedPrompts.mock.calls.length).toBe(1);
    mockedPrompts.mockClear();
  });
  test('re-prompt for password if unable to authenticate call', async () => {
    const validPassword = global.binAgentPassword;
    const invalidPassword = 'invalid';
    mockedPrompts.mockClear();
    mockedPrompts
      .mockResolvedValueOnce({ password: invalidPassword })
      .mockResolvedValue({ password: validPassword });
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json', '--verbose'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ status: 'LIVE' });
    // Prompted for password 2 times
    expect(mockedPrompts.mock.calls.length).toBe(2);
    mockedPrompts.mockClear();
  });
  test('will not prompt for password reauthentication on generic error', async () => {
    const validPassword = global.binAgentPassword;
    const invalidPassword = 'invalid';
    mockedPrompts.mockClear();
    mockedPrompts
      .mockResolvedValueOnce({ password: invalidPassword })
      .mockResolvedValue({ password: validPassword });
    const { exitCode } = await testBinUtils.pkStdio(
      ['identities', 'search', 'InvalidProvider'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir,
    );
    expect(exitCode).not.toBe(0);
    // Prompted for password 2 times
    expect(mockedPrompts.mock.calls.length).toBe(2);
    mockedPrompts.mockClear();
  });
});
