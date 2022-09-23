import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testNatUtils from './utils';
import * as testUtils from '../utils';

const supportsNatTesting =
  testUtils.isPlatformLinux &&
  testUtils.hasIp &&
  testUtils.hasIptables &&
  testUtils.hasNsenter &&
  testUtils.hasUnshare;

const disabled = false;

describe('endpoint independent NAT traversal', () => {
  const logger = new Logger('EIM NAT test', LogLevel.WARN, [
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
  testUtils.testIf(supportsNatTesting)(
    'node1 behind EIM NAT connects to node2',
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
      } = await testNatUtils.setupNAT('eim', 'dmz', logger);
      // Since node2 is not behind a NAT can directly add its details
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
      const { exitCode, stdout } = await testUtils.pkExec(
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
      );
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
    'node1 connects to node2 behind EIM NAT',
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
      } = await testNatUtils.setupNAT('dmz', 'eim', logger);
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
      // If we try to ping Agent 2 it will fail
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
      expect(exitCode).toBe(1);
      expect(JSON.parse(stdout)).toEqual({
        success: false,
        message: 'No response received',
      });
      // But Agent 2 can ping Agent 1 because Agent 1 is not behind a NAT
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
      // Can now ping Agent 2 (it will be expecting a response)
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
      await tearDownNAT();
    },
    globalThis.defaultTimeout * 4,
  );
  testUtils.testIf(supportsNatTesting)(
    'node1 behind EIM NAT connects to node2 behind EIM NAT',
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
      } = await testNatUtils.setupNAT('dmz', 'eim', logger);
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
      // If we try to ping Agent 2 it will fail
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
      expect(exitCode).toBe(1);
      expect(JSON.parse(stdout)).toEqual({
        success: false,
        message: 'No response received',
      });
      // But Agent 2 can ping Agent 1 because it's expecting a response now
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
      // Can now ping Agent 2 (it will be expecting a response too)
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
      await tearDownNAT();
    },
    globalThis.defaultTimeout * 4,
  );
  // FIXME: known issue, disabled for now
  testUtils.testIf(disabled && supportsNatTesting)(
    'node1 behind EIM NAT connects to node2 behind EIM NAT via seed node',
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
      } = await testNatUtils.setupNATWithSeedNode('eim', 'eim', logger);
      // Should be able to ping straight away using the seed node as a
      // signaller
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
    'node1 behind EIM NAT cannot connect to node2 behind EDM NAT',
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
      } = await testNatUtils.setupNATWithSeedNode('eim', 'edm', logger);
      // Since one of the nodes uses EDM NAT we cannot punch through
      let exitCode, stdout;
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
      expect(exitCode).toBe(1);
      expect(JSON.parse(stdout)).toEqual({
        success: false,
        message: `Failed to resolve node ID ${agent1NodeId} to an address.`,
      });
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
      expect(exitCode).toBe(1);
      expect(JSON.parse(stdout)).toEqual({
        success: false,
        message: `Failed to resolve node ID ${agent2NodeId} to an address.`,
      });
      await tearDownNAT();
    },
    globalThis.defaultTimeout * 4,
  );
});
