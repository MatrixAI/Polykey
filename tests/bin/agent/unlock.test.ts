import os from 'os';
import path from 'path';
import fs from 'fs';
import * as testBinUtils from '../utils';

describe('unlock', () => {
  let dataDir: string;
  let pkAgentClose;
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
    // Invalidate all active sessions
    await testBinUtils.pkStdio(
      ['agent', 'lock'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('should store session token in session file', async () => {
    // Assert no existing session file
    await expect(
      fs.promises.readdir(path.join(global.binAgentDir)),
    ).resolves.not.toContain('token');
    // Run command to set token
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
    // Run a command without password to check token is valid
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      ['agent', 'status', '--format', 'json', '--verbose'],
      {
        PK_NODE_PATH: global.binAgentDir,
      },
      global.binAgentDir,
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ status: 'LIVE' });
  });
  test('should fail to unlock if agent stopped', async () => {
    // Stop agent
    await testBinUtils.pkStdio(
      ['agent', 'stop'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    // Run unlock command
    const { exitCode } = await testBinUtils.pkStdio(
      ['agent', 'unlock'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
    expect(exitCode).toBe(64);
    // Undo side-effects
    await testBinUtils.pkStdio(
      ['agent', 'start'],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword,
      },
      global.binAgentDir,
    );
  });
});
