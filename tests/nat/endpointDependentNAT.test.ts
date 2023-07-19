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
  testUtils.testIf(supportsNatTesting)(
    'node1 behind EDM NAT connects to node2',
    async () => {
      const {
        userPid,
        agent1Pid,
        password,
        dataDir,
        agent1NodePath,
        agent2NodeId,
        agent2Host,
        agent2AgentPort,
        tearDownNAT,
      } = await testNatUtils.setupNAT('edm', 'dmz', logger);
      //                       Namespace1
      // ┌────────────────────────────────────────────────────┐
      // │                                                    │                  Namespace2
      // │                  55551<->PORT1   192.168.0.1:PORT1 │    ┌────────────────────────────────────┐
      // │   ┌────────┐        ┌─────┐         ┌─────────┐    │    │                                    │
      // │   │        │        │     ├─────────┤         │    │    │    ┌─────────┐        ┌────────┐   │
      // │   │ Agent1 ├────────┤ NAT │         │ Router1 │    │    │    │ Router2 ├────────┤ Agent2 │   │
      // │   │        │        │     │         │         │    │    │    └─────────┘        └────────┘   │
      // │   └────────┘        └─────┘         └─────────┘    │    │ 192.168.0.2:55555   10.0.0.2:55552 │
      // │ 10.0.0.2:55551                                     │    │                                    │
      // │                                                    │    └────────────────────────────────────┘
      // └────────────────────────────────────────────────────┘
      // Since node2 is not behind a NAT can directly add its details
      await testUtils.pkExec(
        [
          'nodes',
          'add',
          agent2NodeId,
          agent2Host,
          agent2AgentPort,
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
    'node1 connects to node2 behind EDM NAT',
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
        agent1AgentPort,
        agent2NodeId,
        tearDownNAT,
      } = await testNatUtils.setupNAT('dmz', 'edm', logger);
      //                                                                   Namespace2
      //                                           ┌────────────────────────────────────────────────────┐
      //               Namespace1                  │                                                    │
      // ┌────────────────────────────────────┐    │ 192.168.0.2:PORT1   PORT1<->55552                  │
      // │                                    │    │    ┌─────────┐         ┌─────┐        ┌────────┐   │
      // │   ┌────────┐        ┌─────────┐    │    │    │         ├─────────┤     │        │        │   │
      // │   │ Agent1 ├────────┤ Router1 │    │    │    │ Router2 │         │ NAT ├────────┤ Agent2 │   │
      // │   └────────┘        └─────────┘    │    │    │         │         │     │        │        │   │
      // │ 10.0.0.2:55551   192.168.0.1:55555 │    │    └─────────┘         └─────┘        └────────┘   │
      // │                                    │    │                                     10.0.0.2:55552 │
      // └────────────────────────────────────┘    │                                                    │
      //                                           └────────────────────────────────────────────────────┘
      // Agent 2 must ping Agent 1 first, since Agent 2 is behind a NAT
      await testUtils.pkExec(
        [
          'nodes',
          'add',
          agent1NodeId,
          agent1Host,
          agent1AgentPort,
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
    'node1 behind EDM NAT cannot connect to node2 behind EDM NAT',
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
      } = await testNatUtils.setupNATWithSeedNode('edm', 'edm', logger);
      //                       Namespace1                            Namespace3                             Namespace2
      // ┌────────────────────────────────────────────────────┐ ┌──────────────────┐ ┌────────────────────────────────────────────────────┐
      // │                                                    │ │                  │ │                                                    │
      // │                  55551<->PORT1   192.168.0.1:PORT1 │ │   ┌──────────┐   │ │ 192.168.0.2:PORT1   PORT1<->55552                  │
      // │   ┌────────┐        ┌─────┐         ┌─────────┐    │ │   │ SeedNode │   │ │    ┌─────────┐         ┌─────┐        ┌────────┐   │
      // │   │        │        │     ├─────────┤         │    │ │   └──────────┘   │ │    │         ├─────────┤     │        │        │   │
      // │   │ Agent1 ├────────┤ NAT │         │ Router1 │    │ │ 192.168.0.3:PORT │ │    │ Router2 │         │ NAT ├────────┤ Agent2 │   │
      // │   │        │        │     ├─────────┤         │    │ │                  │ │    │         ├─────────┤     │        │        │   │
      // │   └────────┘        └─────┘         └─────────┘    │ └──────────────────┘ │    └─────────┘         └─────┘        └────────┘   │
      // │ 10.0.0.2:55551   55551<->PORT2   192.168.0.1:PORT2 │                      │ 192.168.0.2:PORT2   PORT2<->55552   10.0.0.2:55552 │
      // │                                                    │                      │                                                    │
      // └────────────────────────────────────────────────────┘                      └────────────────────────────────────────────────────┘
      // Contact details are retrieved from the seed node, but cannot be used
      // since port mapping changes between targets in EDM mapping
      // Node 2 -> Node 1 ping should fail (Node 1 behind NAT)
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
        message: expect.any(String),
      });
      // Node 1 -> Node 2 ping should also fail for the same reason
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
        message: expect.any(String),
      });
      await tearDownNAT();
    },
    globalThis.defaultTimeout * 4,
  );
  testUtils.testIf(supportsNatTesting)(
    'node1 behind EDM NAT cannot connect to node2 behind EIM NAT',
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
      } = await testNatUtils.setupNATWithSeedNode('edm', 'eim', logger);
      //                                                                 Namespace3
      //                                                           ┌──────────────────┐
      //                                                           │                  │
      //                       Namespace1                          │   ┌──────────┐   │
      // ┌────────────────────────────────────────────────────┐    │   │ SeedNode │   │
      // │                                                    │    │   └──────────┘   │
      // │                  55551<->PORT1   192.168.0.1:PORT1 │    │ 192.168.0.3:PORT │
      // │   ┌────────┐        ┌─────┐         ┌─────────┐    │    │                  │
      // │   │        │        │     ├─────────┤         │    │    └──────────────────┘
      // │   │ Agent1 ├────────┤ NAT │         │ Router1 │    │                          Namespace2
      // │   │        │        │     ├─────────┤         │    │    ┌──────────────────────────────────────────────────┐
      // │   └────────┘        └─────┘         └─────────┘    │    │                                                  │
      // │ 10.0.0.2:55551   55551<->PORT2   192.168.0.1:PORT2 │    │    ┌─────────┐       ┌─────┐        ┌────────┐   │
      // │                                                    │    │    │ Router2 ├───────┤ NAT ├────────┤ Agent2 │   │
      // └────────────────────────────────────────────────────┘    │    └─────────┘       └─────┘        └────────┘   │
      //                                                           │ 192.168.0.2:PORT   PORT<->55552   10.0.0.2:55552 │
      //                                                           │                                                  │
      //                                                           └──────────────────────────────────────────────────┘
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
        message: expect.any(String),
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
        message: expect.any(String),
      });
      await tearDownNAT();
    },
    globalThis.defaultTimeout * 4,
  );
});
