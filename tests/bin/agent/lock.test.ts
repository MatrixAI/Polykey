import type { SessionToken } from '@/sessions/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Session } from '@/sessions';
import config from '@/config';
import * as testBinUtils from '../utils';

describe('lock', () => {
  const logger = new Logger('lock test', LogLevel.WARN, [new StreamHandler()]);
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
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('should delete the session file', async () => {
    // Ensure session file exists
    const session = await Session.createSession({
      sessionTokenPath,
      fs,
      logger,
    });
    await session.writeToken('abc' as SessionToken);
    // Run command
    const { exitCode } = await testBinUtils.pkStdio(
      ['agent', 'lock'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    expect(exitCode).toBe(0);
    // Check file does not exist
    await expect(
      fs.promises.readdir(path.join(global.binAgentDir)),
    ).resolves.not.toContain('token');
  });
});
