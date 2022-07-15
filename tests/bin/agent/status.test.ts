import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Status from '@/status/Status';
import * as nodesUtils from '@/nodes/utils';
import config from '@/config';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';
import { runTestIfPlatforms } from '../../utils';

describe('status', () => {
  const logger = new Logger('status test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(global.tmpDir, 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  runTestIfPlatforms('linux', 'docker')(
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
      const agentProcess = await testBinUtils.pkSpawnSwitch(global.testCmd)(
        [
          'agent',
          'start',
          '--root-key-pair-bits',
          '1024',
          '--client-host',
          '127.0.0.1',
          '--proxy-host',
          '127.0.0.1',
          '--workers',
          '0',
          '--verbose',
        ],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
        logger,
      );
      await status.waitFor('STARTING');
      let exitCode, stdout;
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['agent', 'status', '--format', 'json'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // If the command was slow, it may have become LIVE already
      expect(JSON.parse(stdout)).toMatchObject({
        status: expect.stringMatching(/STARTING|LIVE/),
        pid: expect.any(Number),
      });
      await status.waitFor('LIVE');
      const agentProcessExit = testBinUtils.processExit(agentProcess);
      agentProcess.kill('SIGTERM');
      // Cannot wait for STOPPING because waitFor polling may miss the transition
      await status.waitFor('DEAD');
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['agent', 'status', '--format', 'json'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // If the command was slow, it may have become DEAD already
      // If it is DEAD, then pid property will be `undefined`
      expect(JSON.parse(stdout)).toMatchObject({
        status: expect.stringMatching(/STOPPING|DEAD/),
      });
      await agentProcessExit;
      ({ exitCode, stdout } = await testBinUtils.pkStdioSwitch(global.testCmd)(
        ['agent', 'status', '--format', 'json'],
        {
          PK_NODE_PATH: path.join(dataDir, 'polykey'),
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toMatchObject({
        status: 'DEAD',
      });
    },
    global.defaultTimeout * 2,
  );
  runTestIfPlatforms('linux', 'docker')('status on missing agent', async () => {
    const { exitCode, stdout } = await testBinUtils.pkStdioSwitch(
      global.testCmd,
    )(['agent', 'status', '--format', 'json'], {
      PK_NODE_PATH: path.join(dataDir, 'polykey'),
    });
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'DEAD',
    });
  });
  describe('status with global agent', () => {
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
    runTestIfPlatforms('linux', 'docker')('status on LIVE agent', async () => {
      const status = new Status({
        statusPath: path.join(globalAgentDir, config.defaults.statusBase),
        statusLockPath: path.join(
          globalAgentDir,
          config.defaults.statusLockBase,
        ),
        fs,
        logger,
      });
      const statusInfo = (await status.readStatus())!;
      const { exitCode, stdout } = await testBinUtils.pkStdioSwitch(
        global.testCmd,
      )(
        ['agent', 'status', '--format', 'json', '--verbose'],
        {
          PK_NODE_PATH: globalAgentDir,
          PK_PASSWORD: globalAgentPassword,
        },
        globalAgentDir,
      );
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toMatchObject({
        status: 'LIVE',
        pid: expect.any(Number),
        nodeId: nodesUtils.encodeNodeId(statusInfo.data.nodeId),
        clientHost: statusInfo.data.clientHost,
        clientPort: statusInfo.data.clientPort,
        proxyHost: statusInfo.data.proxyHost,
        proxyPort: statusInfo.data.proxyPort,
        agentHost: expect.any(String),
        agentPort: expect.any(Number),
        forwardHost: expect.any(String),
        forwardPort: expect.any(Number),
        rootPublicKeyPem: expect.any(String),
        rootCertPem: expect.any(String),
      });
    });
    runTestIfPlatforms('linux', 'docker')(
      'status on remote LIVE agent',
      async () => {
        const passwordPath = path.join(dataDir, 'password');
        await fs.promises.writeFile(passwordPath, globalAgentPassword);
        const status = new Status({
          statusPath: path.join(globalAgentDir, config.defaults.statusBase),
          statusLockPath: path.join(
            globalAgentDir,
            config.defaults.statusLockBase,
          ),
          fs,
          logger,
        });
        const statusInfo = (await status.readStatus())!;
        // This still needs a `nodePath` because of session token path
        const { exitCode, stdout } = await testBinUtils.pkStdioSwitch(
          global.testCmd,
        )(
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
          {},
          dataDir,
        );
        expect(exitCode).toBe(0);
        expect(JSON.parse(stdout)).toMatchObject({
          status: 'LIVE',
          pid: expect.any(Number),
          nodeId: nodesUtils.encodeNodeId(statusInfo.data.nodeId),
          clientHost: statusInfo.data.clientHost,
          clientPort: statusInfo.data.clientPort,
          proxyHost: statusInfo.data.proxyHost,
          proxyPort: statusInfo.data.proxyPort,
          agentHost: expect.any(String),
          agentPort: expect.any(Number),
          forwardHost: expect.any(String),
          forwardPort: expect.any(Number),
          rootPublicKeyPem: expect.any(String),
          rootCertPem: expect.any(String),
        });
      },
    );
  });
});
