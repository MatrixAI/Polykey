import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Session } from '@/sessions';
import config from '@/config';
import * as testBinUtils from '../utils';

describe('unlock', () => {
  const logger = new Logger('lock test', LogLevel.WARN, [new StreamHandler()]);
  let pkAgentClose;
  beforeAll(async () => {
    pkAgentClose = await testBinUtils.pkAgent();
  }, global.maxTimeout);
  afterAll(async () => {
    await pkAgentClose();
  });
  let dataDir: string;
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
  test('unlock acquires session token', async () => {
    // Fresh session, to delete the token
    const session = await Session.createSession({
      sessionTokenPath: path.join(
        global.binAgentDir,
        config.defaults.tokenBase,
      ),
      fs,
      logger,
      fresh: true,
    });
    let exitCode, stdout;
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    ));
    expect(exitCode).toBe(0);
    // Run command without password
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ status: 'LIVE' });
    // Run command with PK_TOKEN
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_TOKEN: await session.readToken(),
      },
      global.binAgentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ status: 'LIVE' });
    await session.stop();
  });
});
