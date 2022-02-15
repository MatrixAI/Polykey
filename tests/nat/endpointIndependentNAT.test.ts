import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testNatUtils from './utils';

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
  test(
    'Node1 behind EIM NAT connects to Node2',
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
      await testNatUtils.pkExecNs(
        userPid,
        agent1Pid,
        ['nodes', 'add', agent2NodeId, agent2Host, agent2ProxyPort],
        {
          PK_NODE_PATH: agent1NodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
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
    'Node1 connects to Node2 behind EIM NAT',
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
      // Since node2 is behind a NAT we need it to contact us first
      await testNatUtils.pkExecNs(
        userPid,
        agent2Pid,
        ['nodes', 'add', agent1NodeId, agent1Host, agent1ProxyPort],
        {
          PK_NODE_PATH: agent2NodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      // This add call can be removed once nodes add connection info of
      // connecting nodes
      await testNatUtils.pkExecNs(
        userPid,
        agent1Pid,
        ['nodes', 'add', agent2NodeId, agent2Host, agent2ProxyPort],
        {
          PK_NODE_PATH: agent1NodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      await testNatUtils.pkExecNs(
        userPid,
        agent2Pid,
        ['nodes', 'ping', agent1NodeId, '--format', 'json'],
        {
          PK_NODE_PATH: agent2NodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      // We should now be able to ping back
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
    'Node1 behind EIM NAT connects to Node2 behind EIM NAT',
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
      // Since node2 is behind a NAT we need it to attempt to contact us first
      // This won't be successfull, but will allow to get past its router with
      // our own ping
      await testNatUtils.pkExecNs(
        userPid,
        agent2Pid,
        ['nodes', 'ping', agent1NodeId, '--format', 'json', '-vv'],
        {
          PK_NODE_PATH: agent2NodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      const { exitCode, stdout } = await testNatUtils.pkExecNs(
        userPid,
        agent1Pid,
        ['nodes', 'ping', agent2NodeId, '--format', 'json', '-vv'],
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
    global.defaultTimeout * 20,
  );
  test.skip(
    'Node1 behind EIM NAT cannot connect to Node2 behind EDM NAT',
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
      } = await testNatUtils.setupNAT('eim', 'edm', logger);
      // Since one of the nodes uses EDM NAT we cannot punch through
      await testNatUtils.pkExecNs(
        userPid,
        agent1Pid,
        ['nodes', 'add', agent2NodeId, agent2Host, agent2ProxyPort],
        {
          PK_NODE_PATH: agent1NodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      await testNatUtils.pkExecNs(
        userPid,
        agent2Pid,
        ['nodes', 'add', agent1NodeId, agent1Host, agent1ProxyPort],
        {
          PK_NODE_PATH: agent2NodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      const [ping12, ping21] = await Promise.all([
        testNatUtils.pkExecNs(
          userPid,
          agent1Pid,
          ['nodes', 'ping', agent2NodeId, '--format', 'json'],
          {
            PK_NODE_PATH: agent1NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        ),
        testNatUtils.pkExecNs(
          userPid,
          agent2Pid,
          ['nodes', 'ping', agent1NodeId, '--format', 'json'],
          {
            PK_NODE_PATH: agent2NodePath,
            PK_PASSWORD: password,
          },
          dataDir,
        ),
      ]);
      expect(ping12.exitCode).toBe(1);
      expect(JSON.parse(ping12.stdout)).toEqual({
        success: false,
        message: 'No response received',
      });
      expect(ping21.exitCode).toBe(1);
      expect(JSON.parse(ping21.stdout)).toEqual({
        success: false,
        message: 'No response received',
      });
      await tearDownNAT();
    },
    global.defaultTimeout * 2,
  );
});
