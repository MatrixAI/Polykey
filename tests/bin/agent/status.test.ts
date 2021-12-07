import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Status } from '@/status';
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
  test('status on LIVE agent', async () => {
    const status = new Status({
      statusPath: path.join(
        global.binAgentDir,
        config.defaults.statusBase
      ),
      fs,
      logger
    });
    const statusInfo = (await status.readStatus())!;
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
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'LIVE',
      pid: expect.any(Number),
      nodeId: statusInfo.data.nodeId,
      clientHost: statusInfo.data.clientHost,
      clientPort: statusInfo.data.clientPort,
      ingressHost: statusInfo.data.ingressHost,
      ingressPort: statusInfo.data.ingressPort,
      egressHost: expect.any(String),
      egressPort: expect.any(Number),
      agentHost: expect.any(String),
      agentPort: expect.any(Number),
      proxyHost: expect.any(String),
      proxyPort: expect.any(Number),
      rootPublicKeyPem: expect.any(String),
      rootCertPem: expect.any(String),
      rootCertChainPem: expect.any(String),
    });
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
    const { exitCode, stdout } = await testBinUtils.pkStdio(
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
        '--format',
        'json',
        '--verbose'
      ]
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'LIVE',
      pid: expect.any(Number),
      nodeId: statusInfo.data.nodeId,
      clientHost: statusInfo.data.clientHost,
      clientPort: statusInfo.data.clientPort,
      ingressHost: statusInfo.data.ingressHost,
      ingressPort: statusInfo.data.ingressPort,
      egressHost: expect.any(String),
      egressPort: expect.any(Number),
      agentHost: expect.any(String),
      agentPort: expect.any(Number),
      proxyHost: expect.any(String),
      proxyPort: expect.any(Number),
      rootPublicKeyPem: expect.any(String),
      rootCertPem: expect.any(String),
      rootCertChainPem: expect.any(String),
    });
  });
  test('status on missing agent', async () => {
    const { exitCode, stderr } = await testBinUtils.pkStdio(
      [
        'agent',
        'status',
        '--verbose'
      ],
      {
        PK_NODE_PATH: path.join(dataDir, 'polykey'),
      }
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
