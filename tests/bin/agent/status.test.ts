import type { RecoveryCode } from '@/keys/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Status, errors as statusErrors } from '@/status';
import * as binUtils from '@/bin/utils';
import * as binErrors from '@/bin/errors';
import config from '@/config';
import * as testBinUtils from '../utils';

describe('status', () => {
  const logger = new Logger('status test', LogLevel.WARN, [new StreamHandler()]);
  let pkAgentClose;
  let dataDir: string;
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
  test.only('status on LIVE agent', async () => {
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      [
        'agent',
        'status',
        '--format',
        'json',
        '--verbose'
      ],
      {
        PK_NODE_PATH: global.binAgentDir,
        PK_PASSWORD: global.binAgentPassword
      },
      global.binAgentDir
    );
    expect(exitCode).toBe(0);
  });
  test('status on remote LIVE agent', async () => {
    const passwordPath = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordPath, global.binAgentPassword);
    const status = new Status({
      statusPath: path.join(
        global.binAgentDir,
        config.defaults.statusBase
      ),
      fs,
      logger
    });
    const statusInfo = (await status.readStatus())!;
    const { exitCode, stdout, stderr } = await testBinUtils.pkStdio(
      [
        'agent',
        'status',
        '--password-file',
        passwordPath,
        '--node-id',
        statusInfo.data.nodeId,
        '--client-host',
        statusInfo.data.clientHost,
        '--client-port',
        statusInfo.data.clientPort.toString(),
        '--verbose'
      ]
    );
    expect(exitCode).toBe(0);
  });
  test('status on missing agent', async () => {
    const { exitCode, stderr } = await testBinUtils.pkStdio(
      [
        'agent',
        'status',
        '--verbose'
      ],
    );
    testBinUtils.expectProcessError(
      exitCode,
      stderr,
      new binErrors.ErrorCLIStatusMissing()
    );
  });
  test('status on STARTING, STOPPING, DEAD agent', async () => {
    // This test must create its own agent process
    const password = 'abc123';
    const status = new Status({
      statusPath: path.join(dataDir, 'polykey', config.defaults.statusBase),
      fs,
      logger,
    });
    const agentProcess = await testBinUtils.pkSpawn(
      [
        'agent',
        'start',
        '--root-key-pair-bits',
        '1024',
        '--verbose'
      ],
      {
        PK_NODE_PATH: path.join(dataDir, 'polykey'),
        PK_PASSWORD: password,
      },
      dataDir,
      logger
    );
    await status.waitFor('STARTING');
    let exitCode, stdout;
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      [
        'agent',
        'status',
        '--format',
        'json',
      ],
      {
        PK_NODE_PATH: path.join(dataDir, 'polykey'),
        PK_PASSWORD: password
      },
      dataDir
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'STARTING',
      pid: agentProcess.pid
    });
    await status.waitFor('LIVE');
    agentProcess.kill('SIGTERM');
    await status.waitFor('STOPPING');
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      [
        'agent',
        'status',
        '--format',
        'json',
      ],
      {
        PK_NODE_PATH: path.join(dataDir, 'polykey'),
        PK_PASSWORD: password
      },
      dataDir
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'STOPPING',
      pid: agentProcess.pid
    });
    await testBinUtils.processExit(agentProcess);
    ({ exitCode, stdout } = await testBinUtils.pkStdio(
      [
        'agent',
        'status',
        '--format',
        'json',
      ],
      {
        PK_NODE_PATH: path.join(dataDir, 'polykey'),
        PK_PASSWORD: password
      },
      dataDir
    ));
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'DEAD'
    });
  }, global.defaultTimeout * 2);
});
