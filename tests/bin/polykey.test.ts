import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testUtils from '../utils';

describe('polykey', () => {
  testUtils.testIf(
    testUtils.isTestPlatformEmpty ||
      testUtils.isTestPlatformLinux ||
      testUtils.isTestPlatformDocker,
  )('default help display', async () => {
    const result = await testUtils.pkExec([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr.length > 0).toBe(true);
  });
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )('format option affects STDERR', async () => {
    const logger = new Logger('format test', LogLevel.WARN, [
      new StreamHandler(),
    ]);
    const dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
    const password = 'abc123';
    const polykeyPath = path.join(dataDir, 'polykey');
    await fs.promises.mkdir(polykeyPath);
    const agentProcess = await testUtils.pkSpawn(
      [
        'agent',
        'start',
        '--node-path',
        path.join(dataDir, 'polykey'),
        '--root-key-pair-bits',
        '1024',
        '--client-host',
        '127.0.0.1',
        '--proxy-host',
        '127.0.0.1',
        '--workers',
        '0',
        '--verbose',
        '--format',
        'json',
      ],
      {
        env: {
          PK_TEST_DATA_PATH: dataDir,
          PK_PASSWORD: password,
        },
        cwd: dataDir,
        command: globalThis.testCmd,
      },
      logger,
    );
    const rlErr = readline.createInterface(agentProcess.stderr!);
    // Just check the first log
    const stderrStart = await new Promise<string>((resolve, reject) => {
      rlErr.once('line', resolve);
      rlErr.once('close', reject);
    });
    const stderrParsed = JSON.parse(stderrStart);
    expect(stderrParsed).toMatchObject({
      level: expect.stringMatching(/INFO|WARN|ERROR|DEBUG/),
      key: expect.any(String),
      msg: expect.any(String),
    });
    agentProcess.kill('SIGTERM');
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
});
