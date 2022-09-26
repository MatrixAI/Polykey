import path from 'path';
import fs from 'fs';
import prompts from 'prompts';
import { mocked } from 'jest-mock';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Session from '@/sessions/Session';
import config from '@/config';
import * as errors from '@/errors';
import * as testUtils from '../../utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';

/**
 * Mock prompts module which is used prompt for password
 */
jest.mock('prompts');
const mockedPrompts = mocked(prompts.prompt);

describe('lockall', () => {
  const logger = new Logger('lockall test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let agentDir;
  let agentPassword;
  let agentClose;
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
  )('lockall deletes the session token', async () => {
    await testUtils.pkExec(['agent', 'unlock'], {
      env: {
        PK_NODE_PATH: agentDir,
        PK_PASSWORD: agentPassword,
      },
      cwd: agentDir,
      command: globalThis.testCmd,
    });
    const { exitCode } = await testUtils.pkExec(['agent', 'lockall'], {
      env: { PK_NODE_PATH: agentDir },
      cwd: agentDir,
      command: globalThis.testCmd,
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
    'lockall ensures reauthentication is required',
    async () => {
      const password = agentPassword;
      await testUtils.pkStdio(['agent', 'unlock'], {
        env: {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        cwd: agentDir,
      });
      await testUtils.pkStdio(['agent', 'lockall'], {
        env: { PK_NODE_PATH: agentDir },
        cwd: agentDir,
      });
      // Token is deleted, reauthentication is required
      mockedPrompts.mockClear();
      mockedPrompts.mockImplementation(async (_opts: any) => {
        return { password };
      });
      await testUtils.pkStdio(['agent', 'status'], {
        env: { PK_NODE_PATH: agentDir },
        cwd: agentDir,
      });
      // Prompted for password 1 time
      expect(mockedPrompts.mock.calls.length).toBe(1);
      mockedPrompts.mockClear();
    },
  );
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )('lockall causes old session tokens to fail', async () => {
    await testUtils.pkExec(['agent', 'unlock'], {
      env: {
        PK_NODE_PATH: agentDir,
        PK_PASSWORD: agentPassword,
      },
      cwd: agentDir,
      command: globalThis.testCmd,
    });
    const session = await Session.createSession({
      sessionTokenPath: path.join(agentDir, config.defaults.tokenBase),
      fs,
      logger,
    });
    const token = await session.readToken();
    await session.stop();
    await testUtils.pkExec(['agent', 'lockall'], {
      env: {
        PK_NODE_PATH: agentDir,
        PK_PASSWORD: agentPassword,
      },
      cwd: agentDir,
      command: globalThis.testCmd,
    });
    // Old token is invalid
    const { exitCode, stderr } = await testUtils.pkExec(
      ['agent', 'status', '--format', 'json'],
      {
        env: {
          PK_NODE_PATH: agentDir,
          PK_TOKEN: token,
        },
        cwd: agentDir,
        command: globalThis.testCmd,
      },
    );
    testUtils.expectProcessError(exitCode, stderr, [
      new errors.ErrorClientAuthDenied(),
    ]);
  });
});
