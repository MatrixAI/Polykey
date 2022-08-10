import path from 'path';
import fs from 'fs';
import prompts from 'prompts';
import { mocked } from 'jest-mock';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Session from '@/sessions/Session';
import config from '@/config';
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
    ({ agentDir, agentPassword, agentClose } = await testUtils.setupTestAgent(
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
    await testUtils.pkExec(['agent', 'unlock'], {
      env: {
        PK_NODE_PATH: agentDir,
        PK_PASSWORD: agentPassword,
      },
      cwd: agentDir,
    });
    const { exitCode } = await testUtils.pkExec(['agent', 'lock'], {
      env: {
        PK_NODE_PATH: agentDir,
      },
      cwd: agentDir,
    });
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
      await testUtils.pkStdio(['agent', 'unlock'], {
        env: {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        cwd: agentDir,
      });
      // Session token is deleted
      await testUtils.pkStdio(['agent', 'lock'], {
        env: { PK_NODE_PATH: agentDir },
        cwd: agentDir,
      });
      // Will prompt to reauthenticate
      await testUtils.pkStdio(['agent', 'status'], {
        env: { PK_NODE_PATH: agentDir },
        cwd: agentDir,
      });
      // Prompted for password 1 time
      expect(mockedPrompts.mock.calls.length).toBe(1);
      mockedPrompts.mockClear();
    },
  );
});
