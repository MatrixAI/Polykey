import path from 'path';
import fs from 'fs';
import prompts from 'prompts';
import { mocked } from 'jest-mock';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Session from '@/sessions/Session';
import config from '@/config';
import * as errors from '@/errors';
import * as testBinUtils from '../utils';
import { runTestIfPlatforms } from '../../utils';
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
    ({ agentDir, agentPassword, agentClose } =
      await testBinUtils.setupTestAgent(globalRootKeyPems[0], logger));
  });
  afterEach(async () => {
    await agentClose();
  });
  runTestIfPlatforms('docker')(
    'lockall deletes the session token',
    async () => {
      await testBinUtils.pkStdio(
        ['agent', 'unlock'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      );
      const { exitCode } = await testBinUtils.pkStdio(
        ['agent', 'lockall'],
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
    },
  );
  runTestIfPlatforms()(
    'lockall ensures reauthentication is required',
    async () => {
      const password = agentPassword;
      await testBinUtils.pkStdio(
        ['agent', 'unlock'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      );
      await testBinUtils.pkStdio(
        ['agent', 'lockall'],
        {
          PK_NODE_PATH: agentDir,
        },
        agentDir,
      );
      // Token is deleted, reauthentication is required
      mockedPrompts.mockClear();
      mockedPrompts.mockImplementation(async (_opts: any) => {
        return { password };
      });
      await testBinUtils.pkStdio(
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
  runTestIfPlatforms('docker')(
    'lockall causes old session tokens to fail',
    async () => {
      await testBinUtils.pkStdio(
        ['agent', 'unlock'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      );
      const session = await Session.createSession({
        sessionTokenPath: path.join(agentDir, config.defaults.tokenBase),
        fs,
        logger,
      });
      const token = await session.readToken();
      await session.stop();
      await testBinUtils.pkStdio(
        ['agent', 'lockall'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      );
      // Old token is invalid
      const { exitCode, stderr } = await testBinUtils.pkStdio(
        ['agent', 'status', '--format', 'json'],
        {
          PK_NODE_PATH: agentDir,
          PK_TOKEN: token,
        },
        agentDir,
      );
      testBinUtils.expectProcessError(exitCode, stderr, [
        new errors.ErrorClientAuthDenied(),
      ]);
    },
  );
});
