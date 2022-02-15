import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testNatUtils from './utils';

describe('endpoint dependent NAT traversal', () => {
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
        tearDownNAT,
      } = await testNatUtils.setupNAT('edm', 'dmz', logger);
      const { exitCode, stdout } = await testNatUtils.pkExecNs(
        userPid,
        agent1Pid,
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
        password,
        dataDir,
        agent1NodePath,
        agent2NodeId,
        tearDownNAT,
      } = await testNatUtils.setupNAT('dmz', 'edm', logger);
      const { exitCode, stdout } = await testNatUtils.pkExecNs(
        userPid,
        agent1Pid,
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
    'Node1 behind EDM NAT cannot connect to Node2 behind EDM NAT',
    async () => {
      const {
        userPid,
        agent1Pid,
        password,
        dataDir,
        agent1NodePath,
        agent2NodeId,
        tearDownNAT,
      } = await testNatUtils.setupNAT('edm', 'edm', logger);
      const { exitCode, stdout } = await testNatUtils.pkExecNs(
        userPid,
        agent1Pid,
        ['nodes', 'ping', agent2NodeId, '--format', 'json'],
        {
          PK_NODE_PATH: agent1NodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      expect(exitCode).not.toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        success: false,
        message: `No response received`,
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
        password,
        dataDir,
        agent1NodePath,
        agent2NodeId,
        tearDownNAT,
      } = await testNatUtils.setupNAT('edm', 'eim', logger);
      const { exitCode, stdout } = await testNatUtils.pkExecNs(
        userPid,
        agent1Pid,
        ['nodes', 'ping', agent2NodeId, '--format', 'json'],
        {
          PK_NODE_PATH: agent1NodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      expect(exitCode).not.toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        success: false,
        message: `No response received`,
      });
      await tearDownNAT();
    },
    global.defaultTimeout * 2,
  );
});
