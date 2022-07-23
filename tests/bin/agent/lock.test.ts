import path from 'path';
import fs from 'fs';
import prompts from 'prompts';
import { mocked } from 'jest-mock';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Session from '@/sessions/Session';
import config from '@/config';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

jest.mock('prompts');
const mockedPrompts = mocked(prompts.prompt);

describe('lock', () => {
  const logger = new Logger('lock test', LogLevel.WARN, [new StreamHandler()]);
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
  test('lock deletes the session token', async () => {
    await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    const { exitCode } = await testBinUtils.pkStdio(
      ['agent', 'lock'],
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
  test('lock ensures re-authentication is required', async () => {
    const password = globalAgentPassword;
    mockedPrompts.mockClear();
    mockedPrompts.mockImplementation(async (_opts: any) => {
      return { password };
    });
    await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    // Session token is deleted
    await testBinUtils.pkStdio(
      ['agent', 'lock'],
      {
        PK_NODE_PATH: globalAgentDir,
      },
      globalAgentDir,
    );
    // Will prompt to reauthenticate
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
});
