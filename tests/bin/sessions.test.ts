/**
 * There is no command call sessions
 * This is just for testing the CLI Authentication Retry Loop
 * @module
 */
import path from 'path';
import fs from 'fs';
import { mocked } from 'jest-mock';
import prompts from 'prompts';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Session } from '@/sessions';
import { sleep } from '@/utils';
import config from '@/config';
import * as clientErrors from '@/client/errors';
import * as execUtils from '../utils/exec';
import { globalRootKeyPems } from '../fixtures/globalRootKeyPems';
import { testIf } from '../utils';
import { isTestPlatformEmpty } from '../utils/platform';

jest.mock('prompts');
const mockedPrompts = mocked(prompts.prompt);

describe('sessions', () => {
  const logger = new Logger('sessions test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let agentDir;
  let agentPassword;
  let agentClose;
  let dataDir: string;
  beforeEach(async () => {
    ({ agentDir, agentPassword, agentClose } = await execUtils.setupTestAgent(
      globalRootKeyPems[0],
      logger,
    ));
    dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await sleep(1000);
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await agentClose();
  });
  testIf(isTestPlatformEmpty)(
    'serial commands refresh the session token',
    async () => {
      const session = await Session.createSession({
        sessionTokenPath: path.join(agentDir, config.defaults.tokenBase),
        fs,
        logger,
      });
      let exitCode;
      ({ exitCode } = await execUtils.pkStdio(
        ['agent', 'status'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      ));
      expect(exitCode).toBe(0);
      const token1 = await session.readToken();
      // Tokens are not nonces
      // Wait at least 1 second
      // To ensure that the next token has a new expiry
      await sleep(1100);
      ({ exitCode } = await execUtils.pkStdio(
        ['agent', 'status'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: agentPassword,
        },
        agentDir,
      ));
      expect(exitCode).toBe(0);
      const token2 = await session.readToken();
      expect(token1).not.toBe(token2);
      await session.stop();
    },
  );
  testIf(isTestPlatformEmpty)(
    'unattended commands with invalid authentication should fail',
    async () => {
      let exitCode, stderr;
      // Password and Token set
      ({ exitCode, stderr } = await execUtils.pkStdio(
        ['agent', 'status', '--format', 'json'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: 'invalid',
          PK_TOKEN: 'token',
        },
        agentDir,
      ));
      execUtils.expectProcessError(exitCode, stderr, [
        new clientErrors.ErrorClientAuthDenied(),
      ]);
      // Password set
      ({ exitCode, stderr } = await execUtils.pkStdio(
        ['agent', 'status', '--format', 'json'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: 'invalid',
          PK_TOKEN: undefined,
        },
        agentDir,
      ));
      execUtils.expectProcessError(exitCode, stderr, [
        new clientErrors.ErrorClientAuthDenied(),
      ]);
      // Token set
      ({ exitCode, stderr } = await execUtils.pkStdio(
        ['agent', 'status', '--format', 'json'],
        {
          PK_NODE_PATH: agentDir,
          PK_PASSWORD: undefined,
          PK_TOKEN: 'token',
        },
        agentDir,
      ));
      execUtils.expectProcessError(exitCode, stderr, [
        new clientErrors.ErrorClientAuthDenied(),
      ]);
    },
  );
  testIf(isTestPlatformEmpty)(
    'prompt for password to authenticate attended commands',
    async () => {
      const password = agentPassword;
      await execUtils.pkStdio(
        ['agent', 'lock'],
        {
          PK_NODE_PATH: agentDir,
        },
        agentDir,
      );
      mockedPrompts.mockClear();
      mockedPrompts.mockImplementation(async (_opts: any) => {
        return { password };
      });
      const { exitCode } = await execUtils.pkStdio(
        ['agent', 'status'],
        {
          PK_NODE_PATH: agentDir,
        },
        agentDir,
      );
      expect(exitCode).toBe(0);
      // Prompted for password 1 time
      expect(mockedPrompts.mock.calls.length).toBe(1);
      mockedPrompts.mockClear();
    },
  );
  testIf(isTestPlatformEmpty)(
    're-prompts for password if unable to authenticate command',
    async () => {
      await execUtils.pkStdio(
        ['agent', 'lock'],
        {
          PK_NODE_PATH: agentDir,
        },
        agentDir,
      );
      const validPassword = agentPassword;
      const invalidPassword = 'invalid';
      mockedPrompts.mockClear();
      mockedPrompts
        .mockResolvedValueOnce({ password: invalidPassword })
        .mockResolvedValue({ password: validPassword });
      const { exitCode } = await execUtils.pkStdio(
        ['agent', 'status'],
        {
          PK_NODE_PATH: agentDir,
        },
        agentDir,
      );
      expect(exitCode).toBe(0);
      // Prompted for password 2 times
      expect(mockedPrompts.mock.calls.length).toBe(2);
      mockedPrompts.mockClear();
    },
  );
});
