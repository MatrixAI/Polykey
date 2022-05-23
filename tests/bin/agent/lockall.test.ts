import path from 'path';
import fs from 'fs';
import prompts from 'prompts';
import { mocked } from 'jest-mock';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Session from '@/sessions/Session';
import config from '@/config';
import * as errors from '@/errors';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

/**
 * Mock prompts module which is used prompt for password
 */
jest.mock('prompts');
const mockedPrompts = mocked(prompts);

describe.skip('lockall', () => {
  const logger = new Logger('lockall test', LogLevel.WARN, [
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
  test('lockall deletes the session token', async () => {
    await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    const { exitCode } = await testBinUtils.pkStdio(
      ['agent', 'lockall'],
      {
        PK_NODE_PATH: globalAgentDir,
      },
      globalAgentDir,
    );
    expect(exitCode).toBe(0);
    const session = await Session.createSession({
      sessionTokenPath: path.join(globalAgentDir, config.defaults.tokenBase),
      fs,
      logger,
    });
    expect(await session.readToken()).toBeUndefined();
    await session.stop();
  });
  test('lockall ensures reauthentication is required', async () => {
    const password = globalAgentPassword;
    await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    await testBinUtils.pkStdio(
      ['agent', 'lockall'],
      {
        PK_NODE_PATH: globalAgentDir,
      },
      globalAgentDir,
    );
    // Token is deleted, reauthentication is required
    mockedPrompts.mockClear();
    mockedPrompts.mockImplementation(async (_opts: any) => {
      return { password };
    });
    await testBinUtils.pkStdio(
      ['agent', 'status'],
      {
        PK_NODE_PATH: globalAgentDir,
      },
      globalAgentDir,
    );
    // Prompted for password 1 time
    expect(mockedPrompts.mock.calls.length).toBe(1);
    mockedPrompts.mockClear();
  });
  test('lockall causes old session tokens to fail', async () => {
    await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    const session = await Session.createSession({
      sessionTokenPath: path.join(globalAgentDir, config.defaults.tokenBase),
      fs,
      logger,
    });
    const token = await session.readToken();
    await session.stop();
    await testBinUtils.pkStdio(
      ['agent', 'lockall'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    // Old token is invalid
    const { exitCode, stderr } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_TOKEN: token,
      },
      globalAgentDir,
    );
    testBinUtils.expectProcessError(exitCode, stderr, [
      new errors.ErrorClientAuthDenied(),
    ]);
  });
});
