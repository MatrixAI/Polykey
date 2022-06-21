import os from 'os';
import path from 'path';
import fs from 'fs';
import process from 'process';
import shell from 'shelljs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testNatUtils from './utils';
import { describeIf } from '../utils';

describeIf(
  process.platform === 'linux' &&
    shell.which('ip') &&
    shell.which('iptables') &&
    shell.which('nsenter') &&
    shell.which('unshare'),
  'endpoint dependent NAT traversal',
  () => {
    const logger = new Logger('EDM NAT test', LogLevel.WARN, [
      new StreamHandler(),
    ]);
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
      'Node1 behind EDM NAT connects to Node2',
      async () => {
        const {
          userPid,
          agent1Pid,
          password,
          dataDir,
          agent1NodePath,
          agent2NodeId,
          agent2Host,
          agent2ProxyPort,
          tearDownNAT,
        } = await testNatUtils.setupNAT('edm', 'dmz', logger);
        // Since node2 is not behind a NAT can directly add its details
        await testNatUtils.pkExecNs(
          userPid!,
          agent1Pid!,
          ['nodes', 'add', agent2NodeId, agent2Host, agent2ProxyPort],
          {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        );
        const { exitCode, stdout } = await testNatUtils.pkExecNs(
          userPid!,
          agent1Pid!,
          ['nodes', 'ping', agent2NodeId, '--format', 'json'],
          {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        );
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
      'Node1 connects to Node2 behind EDM NAT',
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
        } = await testNatUtils.setupNAT('dmz', 'edmSimple', logger);
        await testNatUtils.pkExecNs(
          userPid!,
          agent2Pid!,
          ['nodes', 'add', agent1NodeId, agent1Host, agent1ProxyPort],
          {
            PK_NODE_PATH: agent2NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        );
        await testNatUtils.pkExecNs(
          userPid!,
          agent1Pid!,
          ['nodes', 'add', agent2NodeId, agent2Host, agent2ProxyPort],
          {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        );
        // If we try to ping Agent 2 it will fail
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
        expect(exitCode).toBe(1);
        expect(JSON.parse(stdout)).toEqual({
          success: false,
          message: 'No response received',
        });
        // But Agent 2 can ping Agent 1 because Agent 1 is not behind a NAT
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
        // Can now ping Agent 2 (it will be expecting a response)
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
        await tearDownNAT();
      },
      global.defaultTimeout * 2,
    );
    test(
      'Node1 behind EDM NAT cannot connect to Node2 behind EDM NAT',
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
        } = await testNatUtils.setupNATWithSeedNode(
          'edmSimple',
          'edmSimple',
          logger,
        );
        // Contact details are retrieved from the seed node, but cannot be used
        // since port mapping changes between targets in EDM mapping
        // Node 2 -> Node 1 ping should fail (Node 1 behind NAT)
        let exitCode, stdout;
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
        expect(exitCode).toBe(1);
        expect(JSON.parse(stdout)).toEqual({
          success: false,
          message: 'No response received',
        });
        // Node 1 -> Node 2 ping should also fail
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
        expect(exitCode).toBe(1);
        expect(JSON.parse(stdout)).toEqual({
          success: false,
          message: 'No response received',
        });
        await tearDownNAT();
      },
      global.defaultTimeout * 2,
    );
    test(
      'Node1 behind EDM NAT cannot connect to Node2 behind EIM NAT',
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
        } = await testNatUtils.setupNATWithSeedNode('edmSimple', 'eim', logger);
        // Since one of the nodes uses EDM NAT we cannot punch through
        let exitCode, stdout;
        ({ exitCode, stdout } = await testNatUtils.pkExecNs(
          userPid!,
          agent2Pid!,
          ['nodes', 'ping', agent1NodeId, '--format', 'json', '-vv'],
          {
            PK_NODE_PATH: agent2NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        ));
        expect(exitCode).toBe(1);
        expect(JSON.parse(stdout)).toEqual({
          success: false,
          message: 'No response received',
        });
        ({ exitCode, stdout } = await testNatUtils.pkExecNs(
          userPid!,
          agent1Pid!,
          ['nodes', 'ping', agent2NodeId, '--format', 'json', '-vv'],
          {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        ));
        expect(exitCode).toBe(1);
        expect(JSON.parse(stdout)).toEqual({
          success: false,
          message: 'No response received',
        });
        await tearDownNAT();
      },
      global.defaultTimeout * 2,
    );
  },
);