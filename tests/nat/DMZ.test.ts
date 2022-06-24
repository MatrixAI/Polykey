import os from 'os';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import process from 'process';
import shell from 'shelljs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import Status from '@/status/Status';
import config from '@/config';
import * as testNatUtils from './utils';
import { describeIf } from '../utils';
import * as testBinUtils from '../bin/utils';

describeIf(
  process.platform === 'linux' &&
    shell.which('ip') &&
    shell.which('iptables') &&
    shell.which('nsenter') &&
    shell.which('unshare'),
  'DMZ',
  () => {
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
    test(
      'can create an agent in a namespace',
      async () => {
        const password = 'abc123';
        const usrns = testNatUtils.createUserNamespace(logger);
        const netns = testNatUtils.createNetworkNamespace(usrns.pid!, logger);
        const agentProcess = await testNatUtils.pkSpawnNs(
          usrns.pid!,
          netns.pid!,
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
            PK_PASSWORD: password,
          },
          dataDir,
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
          recoveryCode: expect.any(String),
        });
        expect(
          statusLiveData.recoveryCode.split(' ').length === 12 ||
            statusLiveData.recoveryCode.split(' ').length === 24,
        ).toBe(true);
        agentProcess.kill('SIGTERM');
        let exitCode, signal;
        [exitCode, signal] = await testBinUtils.processExit(agentProcess);
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
        [exitCode, signal] = await testBinUtils.processExit(netns);
        expect(exitCode).toBe(null);
        expect(signal).toBe('SIGTERM');
        usrns.kill('SIGTERM');
        [exitCode, signal] = await testBinUtils.processExit(usrns);
        expect(exitCode).toBe(null);
        expect(signal).toBe('SIGTERM');
      },
      global.defaultTimeout * 2,
    );
    test(
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
        // Since neither node is behind a NAT can directly add eachother's
        // details using pk nodes add
        await testNatUtils.pkExecNs(
          userPid!,
          agent1Pid!,
          [
            'nodes',
            'add',
            agent2NodeId,
            agent2Host,
            agent2ProxyPort,
            '--no-ping',
          ],
          {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        );
        await testNatUtils.pkExecNs(
          userPid!,
          agent2Pid!,
          [
            'nodes',
            'add',
            agent1NodeId,
            agent1Host,
            agent1ProxyPort,
            '--no-ping',
          ],
          {
            PK_NODE_PATH: agent2NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        );
        let exitCode, stdout;
        ({ exitCode, stdout } = await testNatUtils.pkExecNs(
          userPid!,
          agent1Pid!,
          ['nodes', 'ping', agent2NodeId, '--format', 'json'],
          {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        ));
        expect(exitCode).toBe(0);
        expect(JSON.parse(stdout)).toEqual({
          success: true,
          message: 'Node is Active.',
        });
        ({ exitCode, stdout } = await testNatUtils.pkExecNs(
          userPid!,
          agent2Pid!,
          ['nodes', 'ping', agent1NodeId, '--format', 'json'],
          {
            PK_NODE_PATH: agent2NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        ));
        expect(exitCode).toBe(0);
        expect(JSON.parse(stdout)).toEqual({
          success: true,
          message: 'Node is Active.',
        });
        await tearDownNAT();
      },
      global.defaultTimeout * 2,
    );
    test(
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
        // Should be able to ping straight away using the details from the
        // seed node
        let exitCode, stdout;
        ({ exitCode, stdout } = await testNatUtils.pkExecNs(
          userPid!,
          agent1Pid!,
          ['nodes', 'ping', agent2NodeId, '--format', 'json'],
          {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        ));
        expect(exitCode).toBe(0);
        expect(JSON.parse(stdout)).toEqual({
          success: true,
          message: 'Node is Active.',
        });
        ({ exitCode, stdout } = await testNatUtils.pkExecNs(
          userPid!,
          agent2Pid!,
          ['nodes', 'ping', agent1NodeId, '--format', 'json'],
          {
            PK_NODE_PATH: agent2NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        ));
        expect(exitCode).toBe(0);
        expect(JSON.parse(stdout)).toEqual({
          success: true,
          message: 'Node is Active.',
        });
        await tearDownNAT();
      },
      global.defaultTimeout * 2,
    );
  },
);
