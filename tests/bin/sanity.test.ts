import { generateRandomNodeId, runTestIfPlatforms } from '../utils';
import * as testBinUtils from './utils';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import fs from 'fs';
import { sleep } from '@/utils/index';
import { globalRootKeyPems } from '../globalRootKeyPems';
import * as nodesUtils from '@/nodes/utils';
import PolykeyAgent from '@/PolykeyAgent';
import { Host } from '@/network/types';
import child_process from 'child_process';
import * as nodeUtils from '@/nodes/utils';
import { Status } from '@/status/index';
import config from '@/config';

describe('sanity', () => {
  const loggerWarn = new Logger('start test', LogLevel.WARN, [new StreamHandler()]);
  const loggerInfo = new Logger('start test', LogLevel.INFO, [new StreamHandler()]);
  const password = 'password';

  let dataDir: string;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(global.tmpDir, 'polykey-test-'),
    );
  })
  afterEach(async () => {
    console.log('ENDING')
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  // runTestIfPlatforms('docker')('pkStdioTarget', async () => {
  //   console.log('pkStdioTarget')
  //   const result = await testBinUtils.pkStdioSwitch(global.testCmd)(
  //     [],
  //     {
  //       PK_PASSWORD: password,
  //     },
  //     dataDir,
  //   );
  //   console.log(result);
  // });
  // runTestIfPlatforms('docker')('pkSpawnTarget', async () => {
  //   console.log('pkSpawnTarget')
  //   const agentProcess = await testBinUtils.pkSpawnSwitch(global.testCmd)(
  //     [],
  //     {
  //       PK_PASSWORD: password,
  //     },
  //     dataDir,
  //     loggerWarn
  //   );
  //   await sleep(10000);
  //   agentProcess.kill();
  // });
  // runTestIfPlatforms('docker')('pkExecTarget', async () => {
  //   console.log('pkExecTarget')
  //   const result = await testBinUtils.pkExecSwitch(global.testCmd)(
  //     [],
  //     {
  //       PK_PASSWORD: password,
  //     },
  //     dataDir,
  //   );
  //   console.log(result);
  // });
  // runTestIfPlatforms('docker')('test agent', async () => {
  //   console.log('test agent')
  //   const testAgent1 =
  //     await testBinUtils.setupTestAgent(
  //       global.testCmd,
  //       globalRootKeyPems[0],
  //       loggerWarn
  //     );
  //   const testAgent2 =
  //     await testBinUtils.setupTestAgent(
  //       global.testCmd,
  //       globalRootKeyPems[1],
  //       loggerWarn
  //     );
  //   console.log(testAgent1.agentStatus);
  //   console.log(testAgent2.agentStatus);
  //   // console.log(child_process.execSync('docker network inspect $(docker network ls -q)').toString())
  //   await testAgent1.agentClose();
  //   await testAgent2.agentClose();
  // });
  // const hosts = ['docker', 'build', '127.0.0.1', 'localhost', undefined];
  const hosts = ['127.0.0.1', undefined];
  // runTestIfPlatforms('docker').each(hosts)('weird problem, %s', async (host) => {
  //   console.log(`weird problem, ${host}`)
  //   const testAgent =
  //     await testBinUtils.setupTestAgent(
  //       global.testCmd,
  //       globalRootKeyPems[0],
  //       loggerWarn
  //     );
  //   const envs = host != null ? {
  //       PK_NODE_ID: nodeUtils.encodeNodeId(testAgent.agentStatus.data.nodeId),
  //       PK_CLIENT_HOST: host,
  //       PK_CLIENT_PORT: `${testAgent.agentStatus.data.clientPort}`,
  //       PK_NODE_PATH: dataDir,
  //     } :
  //     { PK_NODE_PATH: testAgent.agentDir };
  //   // const status = new Status({
  //   //   statusPath: path.join(testAgent.agentDir, config.defaults.statusBase),
  //   //   statusLockPath: path.join(
  //   //     testAgent.agentDir,
  //   //     'polykey',
  //   //     config.defaults.statusLockBase,
  //   //   ),
  //   //   fs,
  //   //   logger: loggerWarn,
  //   // })
  //   // console.log(await status.readStatus());
  //   const nodeId = generateRandomNodeId();
  //   const result1 = await testBinUtils.pkStdioSwitch(global.testCmd)(
  //     [
  //       'nodes',
  //       'add',
  //       '--verbose',
  //       // '--force',
  //       // '--no-ping',
  //       nodesUtils.encodeNodeId(nodeId),
  //       '127.0.0.1',
  //       `55555`,
  //     ],
  //     {
  //       PK_PASSWORD: password,
  //       ...envs,
  //     },
  //     host != null ? dataDir : testAgent.agentDir,
  //   );
  //   console.log(`weird problem, ${host}`, result1);
  //   await testAgent.agentClose();
  // }, 60000);
  runTestIfPlatforms('docker').each(hosts)('weird problem with normal PK, %s', async (host) => {
    console.log(`weird problem with normal PK, ${host}`)
    const nodePath = path.join(dataDir, 'polykey');
    const pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
      logger: loggerWarn
    });
    const envs = host != null ? {
        PK_NODE_ID: nodeUtils.encodeNodeId(pkAgent.keyManager.getNodeId()),
        PK_CLIENT_HOST: host,
        PK_CLIENT_PORT: `${pkAgent.grpcServerClient.getPort()}`,
        PK_NODE_PATH: dataDir
      } :
      { PK_NODE_PATH: nodePath };
    const nodeId = generateRandomNodeId();
    const result1 = await testBinUtils.pkStdioSwitch(global.testCmd)(
      [
        'nodes',
        'add',
        '--verbose',
        // '--force',
        // '--no-ping',
        nodesUtils.encodeNodeId(nodeId),
        '127.0.0.1',
        `55555`,
      ],
      {
        PK_PASSWORD: password,
        ...envs,
      },
      dataDir,
    );
    console.log(host, result1);
    await pkAgent.stop();
    await pkAgent.destroy();
  });
});
