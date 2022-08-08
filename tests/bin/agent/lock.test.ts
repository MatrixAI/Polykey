import path from 'path';
import fs from 'fs';
import prompts from 'prompts';
import { mocked } from 'jest-mock';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Session from '@/sessions/Session';
import config from '@/config';
import * as execUtils from '../../utils/exec';
import * as testUtils from '../../utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';

jest.mock('prompts');
const mockedPrompts = mocked(prompts.prompt);

describe('lock', () => {
  const logger = new Logger('lock test', LogLevel.WARN, [new StreamHandler()]);
  let agentDir: string;
  let agentPassword: string;
  let agentClose: () => Promise<void>;
  beforeEach(async () => {
    ({ agentDir, agentPassword, agentClose } = await execUtils.setupTestAgent(
      globalRootKeyPems[0],
      logger,
    ));
  });
  afterEach(async () => {
    await agentClose();
  });
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )('lock deletes the session token', async () => {
    await execUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: agentDir,
        PK_PASSWORD: agentPassword,
      },
      agentDir,
    );
    const { exitCode } = await execUtils.pkStdio(
      ['agent', 'lock'],
      {
        PK_NODE_PATH: agentDir,
      },
      agentDir,
    );
    expect(exitCode).toBe(0);
    const session = await Session.createSession({
      sessionTokenPath: path.join(agentDir, config.defaults.tokenBase),
      fs,
      logger,
    });
    expect(await session.readToken()).toBeUndefined();
    await session.stop();
  });
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'lock ensures re-authentication is required',
    async () => {
      const password = agentPassword;
      mockedPrompts.mockClear();
      mockedPrompts.mockImplementation(async (_opts: any) => {
        return { password };
      });
      await execUtils.pkStdio(
        ['agent', 'unlock'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      );
      // Session token is deleted
      await execUtils.pkStdio(
        ['agent', 'lock'],
        {
          PK_NODE_PATH: agentDir,
        },
        agentDir,
      );
      // Will prompt to reauthenticate
      await execUtils.pkStdio(
        ['agent', 'status'],
        {
          PK_NODE_PATH: agentDir,
        },
        agentDir,
      );
      // Prompted for password 1 time
      expect(mockedPrompts.mock.calls.length).toBe(1);
      mockedPrompts.mockClear();
    },
  );
});
