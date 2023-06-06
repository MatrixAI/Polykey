import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Status from '@/status/Status';
import * as nodesUtils from '@/nodes/utils';
import config from '@/config';
import * as testUtils from '../../utils';

describe('status', () => {
  const logger = new Logger('status test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )(
    'status on STARTING, STOPPING, DEAD agent',
    async () => {
      // This test must create its own agent process
      const password = 'abc123';
      const status = new Status({
        statusPath: path.join(dataDir, 'polykey', config.defaults.statusBase),
        statusLockPath: path.join(
          dataDir,
          'polykey',
          config.defaults.statusLockBase,
        ),
        fs,
        logger,
      });
      const agentProcess = await testUtils.pkSpawn(
        [
          'agent',
          'start',
          '--client-host',
          '127.0.0.1',
          '--proxy-host',
          '127.0.0.1',
          '--workers',
          'none',
          '--verbose',
        ],
        {
          env: {
            PK_NODE_PATH: path.join(dataDir, 'polykey'),
            PK_PASSWORD: password,
            PK_PASSWORD_OPS_LIMIT: 'min',
            PK_PASSWORD_MEM_LIMIT: 'min',
          },
          cwd: dataDir,
          command: globalThis.testCmd,
        },
        logger,
      );
      await status.waitFor('STARTING');
      let exitCode, stdout;
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['agent', 'status', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: path.join(dataDir, 'polykey'),
            PK_PASSWORD: password,
          },
          cwd: dataDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      // If the command was slow, it may have become LIVE already
      expect(JSON.parse(stdout)).toMatchObject({
        status: expect.stringMatching(/STARTING|LIVE/),
        pid: expect.any(Number),
      });
      await status.waitFor('LIVE');
      const agentProcessExit = testUtils.processExit(agentProcess);
      agentProcess.kill('SIGTERM');
      // Cannot wait for STOPPING because waitFor polling may miss the transition
      await status.waitFor('DEAD');
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['agent', 'status', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: path.join(dataDir, 'polykey'),
            PK_PASSWORD: password,
          },
          cwd: dataDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      // If the command was slow, it may have become DEAD already
      // If it is DEAD, then pid property will be `undefined`
      expect(JSON.parse(stdout)).toMatchObject({
        status: expect.stringMatching(/STOPPING|DEAD/),
      });
      await agentProcessExit;
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['agent', 'status', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: path.join(dataDir, 'polykey'),
            PK_PASSWORD: password,
          },
          cwd: dataDir,
          command: globalThis.testCmd,
        },
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toMatchObject({
        status: 'DEAD',
      });
    },
    globalThis.defaultTimeout * 2,
  );
  testUtils.testIf(
    testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
  )('status on missing agent', async () => {
    const { exitCode, stdout } = await testUtils.pkExec(
      ['agent', 'status', '--format', 'json'],
      {
        env: { PK_NODE_PATH: path.join(dataDir, 'polykey') },
        command: globalThis.testCmd,
      },
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'DEAD',
    });
  });
  describe('status with global agent', () => {
    let agentDir;
    let agentPassword;
    let agentClose;
    beforeEach(async () => {
      ({ agentDir, agentPassword, agentClose } = await testUtils.setupTestAgent(
        logger,
      ));
    });
    afterEach(async () => {
      await agentClose();
    });
    testUtils.testIf(
      testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
    )('status on LIVE agent', async () => {
      const status = new Status({
        statusPath: path.join(agentDir, config.defaults.statusBase),
        statusLockPath: path.join(agentDir, config.defaults.statusLockBase),
        fs,
        logger,
      });
      const statusInfo = (await status.readStatus())!;
      const { exitCode, stdout } = await testUtils.pkExec(
        ['agent', 'status', '--format', 'json', '--verbose'],
        {
          env: {
            PK_NODE_PATH: agentDir,
            PK_PASSWORD: agentPassword,
          },
          cwd: agentDir,
          command: globalThis.testCmd,
        },
      );
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toMatchObject({
        status: 'LIVE',
        pid: expect.any(Number),
        nodeId: nodesUtils.encodeNodeId(statusInfo.data.nodeId),
        clientHost: statusInfo.data.clientHost,
        clientPort: statusInfo.data.clientPort,
        agentHost: statusInfo.data.agentHost,
        agentPort: statusInfo.data.agentPort,
        publicKeyJWK: expect.any(Object),
        certChainPEM: expect.any(String),
      });
    });
    testUtils.testIf(
      testUtils.isTestPlatformEmpty || testUtils.isTestPlatformDocker,
    )('status on remote LIVE agent', async () => {
      const passwordPath = path.join(dataDir, 'password');
      await fs.promises.writeFile(passwordPath, agentPassword);
      const status = new Status({
        statusPath: path.join(agentDir, config.defaults.statusBase),
        statusLockPath: path.join(agentDir, config.defaults.statusLockBase),
        fs,
        logger,
      });
      const statusInfo = (await status.readStatus())!;
      // This still needs a `nodePath` because of session token path
      const { exitCode, stdout } = await testUtils.pkExec(
        [
          'agent',
          'status',
          '--node-path',
          dataDir,
          '--password-file',
          passwordPath,
          '--node-id',
          nodesUtils.encodeNodeId(statusInfo.data.nodeId),
          '--client-host',
          statusInfo.data.clientHost,
          '--client-port',
          statusInfo.data.clientPort.toString(),
          '--format',
          'json',
          '--verbose',
        ],
        {
          env: {},
          cwd: dataDir,
          command: globalThis.testCmd,
        },
      );
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toMatchObject({
        status: 'LIVE',
        pid: expect.any(Number),
        nodeId: nodesUtils.encodeNodeId(statusInfo.data.nodeId),
        clientHost: statusInfo.data.clientHost,
        clientPort: statusInfo.data.clientPort,
        agentHost: statusInfo.data.agentHost,
        agentPort: statusInfo.data.agentPort,
        publicKeyJWK: expect.any(Object),
        certChainPEM: expect.any(String),
      });
    });
  });
});
