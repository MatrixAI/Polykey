import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Session from '@/sessions/Session';
import config from '@/config';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';
import { runTestIfPlatforms } from '../../utils';

describe('unlock', () => {
  const logger = new Logger('unlock test', LogLevel.WARN, [
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
  runTestIfPlatforms('linux', 'docker')(
    'unlock acquires session token',
    async () => {
      // Fresh session, to delete the token
      const session = await Session.createSession({
        sessionTokenPath: path.join(globalAgentDir, config.defaults.tokenBase),
        fs,
        logger,
        fresh: true,
      });
      let exitCode, stdout;
      ({ exitCode } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['agent', 'unlock'],
        {
          PK_NODE_PATH: globalAgentDir,
          PK_PASSWORD: globalAgentPassword,
        },
        globalAgentDir,
      ));
      expect(exitCode).toBe(0);
      // Run command without password
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['agent', 'status', '--format', 'json'],
        {
          PK_NODE_PATH: globalAgentDir,
        },
        globalAgentDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toMatchObject({ status: 'LIVE' });
      // Run command with PK_TOKEN
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['agent', 'status', '--format', 'json'],
        {
          PK_NODE_PATH: globalAgentDir,
          PK_TOKEN: await session.readToken(),
        },
        globalAgentDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toMatchObject({ status: 'LIVE' });
      await session.stop();
    },
  );
});
