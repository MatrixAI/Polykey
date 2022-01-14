import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

describe('root', () => {
  const logger = new Logger('root test', LogLevel.WARN, [new StreamHandler()]);
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
  test('root gets the public key', async () => {
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'root', '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('public key:');
  });
  test('root gets the keypair', async () => {
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      ['keys', 'root', '-pk', '--format', 'json'],
      {
        PK_NODE_PATH: globalAgentDir,
        PK_PASSWORD: globalAgentPassword,
      },
      globalAgentDir,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('public key:');
    expect(stdout).toContain('private key:');
  });
});
