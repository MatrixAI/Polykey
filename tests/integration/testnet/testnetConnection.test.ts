import type { NodeIdEncoded } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as testUtils from '../../utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';

describe('testnet connection', () => {
  const logger = new Logger('testnet connection test', LogLevel.INFO, [
    new StreamHandler(),
  ]);
  // The testnet node ids/addresses are not fixed
  // These will need to be updated whenever they change
  const seedNodeId1 =
    'vcfi7mgmfn5u82a3obv1gd958ei68ateu4b62i9opm8fc07jvr6dg' as NodeIdEncoded;
  const seedNodeIp1 = 'testnet.polykey.io' as Host;
  const seedNodePort = 1314 as Port;
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
  test('can connect to `testnet.polykey.io` seed node', async () => {
    const password = 'abc123';
    const nodePath = path.join(dataDir, 'polykey');
    // Starting an agent with the testnet as a seed ndoe
    const agentProcess = await testUtils.pkSpawn(
      [
        'agent',
        'start',
        '--seed-nodes',
        `${seedNodeId1}@${seedNodeIp1}:${seedNodePort}`,
        '--format',
        'json',
        '--verbose',
        '--workers',
        '0',
      ],
      {
        env: {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
          PK_ROOT_KEY: globalRootKeyPems[0],
        },
        cwd: dataDir,
      },
      logger,
    );
    try {
      const rlOut = readline.createInterface(agentProcess.stdout!);
      await new Promise<string>((resolve, reject) => {
        rlOut.once('line', resolve);
        rlOut.once('close', reject);
      });

      // Pinging the seed node
      const { exitCode: exitCode1 } = await testUtils.pkStdio(
        ['nodes', 'ping', seedNodeId1, '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(exitCode1).toBe(0);
    } finally {
      await testUtils.processExit(agentProcess);
    }
  });
  test('network expands when connecting to seed node', async () => {
    const password = 'abc123';
    // Starting two nodes with the testnet as the seed node
    const nodePathA = path.join(dataDir, 'polykeyA');
    const nodePathB = path.join(dataDir, 'polykeyB');
    const agentProcessA = await testUtils.pkSpawn(
      [
        'agent',
        'start',
        '--seed-nodes',
        `${seedNodeId1}@${seedNodeIp1}:${seedNodePort}`,
        '--format',
        'json',
        '--verbose',
        '--workers',
        '0',
      ],
      {
        env: {
          PK_NODE_PATH: nodePathA,
          PK_PASSWORD: password,
          PK_ROOT_KEY: globalRootKeyPems[0],
        },
        cwd: dataDir,
      },
      logger,
    );
    const agentProcessB = await testUtils.pkSpawn(
      [
        'agent',
        'start',
        '--seed-nodes',
        `${seedNodeId1}@${seedNodeIp1}:${seedNodePort}`,
        '--format',
        'json',
        '--verbose',
        '--workers',
        '0',
      ],
      {
        env: {
          PK_NODE_PATH: nodePathB,
          PK_PASSWORD: password,
          PK_ROOT_KEY: globalRootKeyPems[1],
        },
        cwd: dataDir,
      },
      logger,
    );

    try {
      const rlOutA = readline.createInterface(agentProcessA.stdout!);
      const stdoutA = await new Promise<string>((resolve, reject) => {
        rlOutA.once('line', resolve);
        rlOutA.once('close', reject);
      });
      const statusLiveDataA = JSON.parse(stdoutA);
      const nodeIdA = statusLiveDataA.nodeId;

      const rlOutB = readline.createInterface(agentProcessB.stdout!);
      const stdoutB = await new Promise<string>((resolve, reject) => {
        rlOutB.once('line', resolve);
        rlOutB.once('close', reject);
      });
      const statusLiveDataB = JSON.parse(stdoutB);
      const nodeIdB = statusLiveDataB.nodeId;

      // NodeA should ping the seed node
      const { exitCode: exitCode1 } = await testUtils.pkStdio(
        ['nodes', 'ping', seedNodeId1, '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: nodePathA,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(exitCode1).toBe(0);

      // NodeB should ping the seed node
      const { exitCode: exitCode2 } = await testUtils.pkStdio(
        ['nodes', 'ping', seedNodeId1, '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: nodePathB,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(exitCode2).toBe(0);

      // NodeA should be able to ping to NodeB
      const { exitCode: exitCode3 } = await testUtils.pkStdio(
        ['nodes', 'ping', nodeIdB, '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: nodePathA,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(exitCode3).toBe(0);

      // NodeB should be able to ping to NodeA
      const { exitCode: exitCode4 } = await testUtils.pkStdio(
        ['nodes', 'ping', nodeIdA, '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: nodePathB,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(exitCode4).toBe(0);
    } finally {
      await testUtils.processExit(agentProcessA);
      await testUtils.processExit(agentProcessB);
    }
  });
});
