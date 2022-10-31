import type { NodeIdEncoded, SeedNodes } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import Logger, { LogLevel, StreamHandler, formatting } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as testUtils from '../../utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import { sleep } from '../../../src/utils/index';

describe('testnet connection', () => {
  const logger = new Logger('TCT', LogLevel.INFO, [new StreamHandler()]);
  const format = formatting.format`${formatting.keys}:${formatting.msg}`;
  logger.handlers.forEach((handler) => handler.setFormatter(format));
  // The testnet node ids/addresses are not fixed
  // These will need to be updated whenever they change
  const seedNodeId1 =
    'vdrn5ok1cdrghve4r72dufhk5si9m42665eutias61sgavjusar60' as NodeIdEncoded;
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
  // This test is known to fail, two nodes on the same network can't hole punch
  test('testing hole punching', async () => {
    // Const nodePathS = path.join(dataDir, 'seed');
    const nodePath1 = path.join(dataDir, 'node1');
    const nodePath2 = path.join(dataDir, 'node2');
    const password = 'password';
    const localhost = '127.0.0.1' as Host;
    logger.setLevel(LogLevel.WARN);
    // Console.log('Starting Seed');
    // const seed = await PolykeyAgent.createPolykeyAgent({
    //   password,
    //   nodePath: nodePathS,
    //   networkConfig: {
    //     proxyHost: localhost,
    //     agentHost: localhost,
    //     clientHost: localhost,
    //     forwardHost: localhost,
    //     proxyPort: 55550 as Port,
    //   },
    //   keysConfig: {
    //     privateKeyPemOverride: globalRootKeyPems[0],
    //   },
    //   logger: logger.getChild('S'),
    // });
    // const seedNodes: SeedNodes = {
    //   [nodesUtils.encodeNodeId(seed.keyManager.getNodeId())]: {
    //     host: seed.proxy.getProxyHost(),
    //     port: seed.proxy.getProxyPort(),
    //   },
    // };
    const seedNodes: SeedNodes = {
      [seedNodeId1]: {
        host: seedNodeIp1,
        port: seedNodePort,
      },
    };
    // Console.log('Starting Agent1');
    const agent1 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: nodePath1,
      seedNodes,
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[1],
      },
      networkConfig: {
        // ProxyHost: localhost,
        agentHost: localhost,
        clientHost: localhost,
        forwardHost: localhost,
        proxyPort: 55551 as Port,
      },

      logger: logger.getChild('A1'),
    });
    // Console.log('Starting Agent2');
    logger.setLevel(LogLevel.INFO);
    const agent2 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: nodePath2,
      seedNodes,
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[2],
      },
      networkConfig: {
        // ProxyHost: localhost,
        agentHost: localhost,
        clientHost: localhost,
        forwardHost: localhost,
        proxyPort: 55552 as Port,
      },
      logger: logger.getChild('A2'),
    });

    try {
      logger.setLevel(LogLevel.INFO);
      // Console.log('syncing 1');
      // await agent1.nodeManager.syncNodeGraph(true);
      // console.log('syncing 2');
      // await agent2.nodeManager.syncNodeGraph(true);

      // seed   hun0
      // agent1 ijtg
      // agent2 fhmg

      // Ping the node
      await sleep(5000);
      // Console.log(
      //   nodesUtils.encodeNodeId(agent1.keyManager.getNodeId()),
      //   agent1.proxy.getProxyHost(),
      //   agent1.proxy.getProxyPort(),
      // );
      // console.log(
      //   nodesUtils.encodeNodeId(agent2.keyManager.getNodeId()),
      //   agent2.proxy.getProxyHost(),
      //   agent2.proxy.getProxyPort(),
      // );
      // console.log('Attempting ping');
      const pingResult = await agent2.nodeManager.pingNode(
        agent1.keyManager.getNodeId(),
      );
      // Console.log(pingResult);
      expect(pingResult).toBe(true);
    } finally {
      logger.setLevel(LogLevel.WARN);
      // Console.log('cleaning up');
      // Await seed.stop();
      await agent1.stop();
      await agent2.stop();
    }
  });

  // We want to ping each other
});
