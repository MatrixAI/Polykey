import os from 'os';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Status from '@/status/Status';
import config from '@/config';
import * as testNatUtils from './utils';
import * as testUtils from '../utils';
import {
  isPlatformLinux,
  hasIp,
  hasIptables,
  hasNsenter,
  hasUnshare,
} from '../utils/platform';

const supportsNatTesting =
  isPlatformLinux && hasIp && hasIptables && hasNsenter && hasUnshare;

describe('DMZ', () => {
  const logger = new Logger('DMZ test', LogLevel.WARN, [new StreamHandler()]);
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
  testUtils.testIf(supportsNatTesting)(
    'can create an agent in a namespace',
    async () => {
      const password = 'abc123';
      const usrns = await testNatUtils.createUserNamespace(logger);
      const netns = await testNatUtils.createNetworkNamespace(
        usrns.pid!,
        logger,
      );
      const agentProcess = await testUtils.pkSpawn(
        [
          'agent',
          'start',
          '--node-path',
          path.join(dataDir, 'polykey'),
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
            PK_PASSWORD: password,
            PK_PASSWORD_OPS_LIMIT: 'min',
            PK_PASSWORD_MEM_LIMIT: 'min',
          },
          command: `nsenter ${testNatUtils
            .nsenter(usrns.pid!, netns.pid!)
            .join(' ')} ts-node --project ${testUtils.tsConfigPath} ${
            testUtils.polykeyPath
          }`,
          cwd: dataDir,
        },
        logger.getChild('agentProcess'),
      );
      const rlOut = readline.createInterface(agentProcess.stdout!);
      const stdout = await new Promise<string>((resolve, reject) => {
        rlOut.once('line', resolve);
        rlOut.once('close', reject);
      });
      const statusLiveData = JSON.parse(stdout);
      expect(statusLiveData).toMatchObject({
        pid: agentProcess.pid,
        nodeId: expect.any(String),
        clientHost: expect.any(String),
        clientPort: expect.any(Number),
        agentHost: expect.any(String),
        agentPort: expect.any(Number),
        forwardHost: expect.any(String),
        forwardPort: expect.any(Number),
        proxyHost: expect.any(String),
        proxyPort: expect.any(Number),
      });
      agentProcess.kill('SIGTERM');
      let exitCode, signal;
      [exitCode, signal] = await testUtils.processExit(agentProcess);
      expect(exitCode).toBe(null);
      expect(signal).toBe('SIGTERM');
      // Check for graceful exit
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
      const statusInfo = (await status.readStatus())!;
      expect(statusInfo.status).toBe('DEAD');
      netns.kill('SIGTERM');
      [exitCode, signal] = await testUtils.processExit(netns);
      expect(exitCode).toBe(null);
      expect(signal).toBe('SIGTERM');
      usrns.kill('SIGTERM');
      [exitCode, signal] = await testUtils.processExit(usrns);
      expect(exitCode).toBe(null);
      expect(signal).toBe('SIGTERM');
    },
    globalThis.defaultTimeout * 4,
  );
  testUtils.testIf(supportsNatTesting)(
    'agents in different namespaces can ping each other',
    async () => {
      const {
        userPid,
        agent1Pid,
        agent2Pid,
        password,
        dataDir,
        agent1NodePath,
        agent2NodePath,
        agent1NodeId,
        agent1Host,
        agent1ProxyPort,
        agent2NodeId,
        agent2Host,
        agent2ProxyPort,
        tearDownNAT,
      } = await testNatUtils.setupNAT('dmz', 'dmz', logger);
      //               Namespace1                                Namespace2
      // ┌────────────────────────────────────┐    ┌────────────────────────────────────┐
      // │                                    │    │                                    │
      // │   ┌────────┐        ┌─────────┐    │    │    ┌─────────┐        ┌────────┐   │
      // │   │ Agent1 ├────────┤ Router1 │    │    │    │ Router2 ├────────┤ Agent2 │   │
      // │   └────────┘        └─────────┘    │    │    └─────────┘        └────────┘   │
      // │ 10.0.0.2:55551   192.168.0.1:55555 │    │ 192.168.0.2:55555   10.0.0.2:55552 │
      // │                                    │    │                                    │
      // └────────────────────────────────────┘    └────────────────────────────────────┘
      // Since neither node is behind a NAT can directly add eachother's
      // details using pk nodes add
      await testUtils.pkExec(
        [
          'nodes',
          'add',
          agent2NodeId,
          agent2Host,
          agent2ProxyPort,
          '--no-ping',
        ],
        {
          env: {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          command: `nsenter ${testNatUtils
            .nsenter(userPid!, agent1Pid!)
            .join(' ')} ts-node --project ${testUtils.tsConfigPath} ${
            testUtils.polykeyPath
          }`,
          cwd: dataDir,
        },
      );
      await testUtils.pkExec(
        [
          'nodes',
          'add',
          agent1NodeId,
          agent1Host,
          agent1ProxyPort,
          '--no-ping',
        ],
        {
          env: {
            PK_NODE_PATH: agent2NodePath,
            PK_PASSWORD: password,
          },
          command: `nsenter ${testNatUtils
            .nsenter(userPid!, agent2Pid!)
            .join(' ')} ts-node --project ${testUtils.tsConfigPath} ${
            testUtils.polykeyPath
          }`,
          cwd: dataDir,
        },
      );
      let exitCode, stdout;
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['nodes', 'ping', agent2NodeId, '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          command: `nsenter ${testNatUtils
            .nsenter(userPid!, agent1Pid!)
            .join(' ')} ts-node --project ${testUtils.tsConfigPath} ${
            testUtils.polykeyPath
          }`,
          cwd: dataDir,
        },
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        success: true,
        message: 'Node is Active.',
      });
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['nodes', 'ping', agent1NodeId, '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: agent2NodePath,
            PK_PASSWORD: password,
          },
          command: `nsenter ${testNatUtils
            .nsenter(userPid!, agent2Pid!)
            .join(' ')} ts-node --project ${testUtils.tsConfigPath} ${
            testUtils.polykeyPath
          }`,
          cwd: dataDir,
        },
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        success: true,
        message: 'Node is Active.',
      });
      await tearDownNAT();
    },
    globalThis.defaultTimeout * 4,
  );
  testUtils.testIf(supportsNatTesting)(
    'agents in different namespaces can ping each other via seed node',
    async () => {
      const {
        userPid,
        agent1Pid,
        agent2Pid,
        password,
        dataDir,
        agent1NodePath,
        agent2NodePath,
        agent1NodeId,
        agent2NodeId,
        tearDownNAT,
      } = await testNatUtils.setupNATWithSeedNode('dmz', 'dmz', logger);
      //               Namespace1                    Namespace3                    Namespace2
      // ┌────────────────────────────────────┐ ┌──────────────────┐ ┌────────────────────────────────────┐
      // │                                    │ │                  │ │                                    │
      // │   ┌────────┐        ┌─────────┐    │ │   ┌──────────┐   │ │    ┌─────────┐        ┌────────┐   │
      // │   │ Agent1 ├────────┤ Router1 │    │ │   │ SeedNode │   │ │    │ Router2 ├────────┤ Agent2 │   │
      // │   └────────┘        └─────────┘    │ │   └──────────┘   │ │    └─────────┘        └────────┘   │
      // │ 10.0.0.2:55551   192.168.0.1:55555 │ │ 192.168.0.3:PORT │ │ 192.168.0.2:55555   10.0.0.2:55552 │
      // │                                    │ │                  │ │                                    │
      // └────────────────────────────────────┘ └──────────────────┘ └────────────────────────────────────┘
      // Should be able to ping straight away using the details from the
      // seed node
      let exitCode, stdout;
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['nodes', 'ping', agent2NodeId, '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          command: `nsenter ${testNatUtils
            .nsenter(userPid!, agent1Pid!)
            .join(' ')} ts-node --project ${testUtils.tsConfigPath} ${
            testUtils.polykeyPath
          }`,
          cwd: dataDir,
        },
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        success: true,
        message: 'Node is Active.',
      });
      ({ exitCode, stdout } = await testUtils.pkExec(
        ['nodes', 'ping', agent1NodeId, '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: agent2NodePath,
            PK_PASSWORD: password,
          },
          command: `nsenter ${testNatUtils
            .nsenter(userPid!, agent2Pid!)
            .join(' ')} ts-node --project ${testUtils.tsConfigPath} ${
            testUtils.polykeyPath
          }`,
          cwd: dataDir,
        },
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        success: true,
        message: 'Node is Active.',
      });
      await tearDownNAT();
    },
    globalThis.defaultTimeout * 4,
  );
});
