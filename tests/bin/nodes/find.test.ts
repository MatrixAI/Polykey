import type { NodeId } from '@/ids/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import { sysexits } from '@/errors';
import * as keysUtils from '@/keys/utils/index';
import * as testNodesUtils from '../../nodes/utils';
import * as testUtils from '../../utils';

describe('find', () => {
  const logger = new Logger('find test', LogLevel.WARN, [new StreamHandler()]);
  const password = 'helloworld';
  let dataDir: string;
  let nodePath: string;
  let polykeyAgent: PolykeyAgent;
  let remoteOnline: PolykeyAgent;
  let remoteOffline: PolykeyAgent;
  let remoteOnlineNodeId: NodeId;
  let remoteOfflineNodeId: NodeId;
  let remoteOnlineHost: string;
  let remoteOnlinePort: number;
  let remoteOfflineHost: string;
  let remoteOfflinePort: number;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      networkConfig: {
        agentHost: '127.0.0.1',
        clientHost: '127.0.0.1',
      },
      nodeConnectionManagerConfig: {
        connectionConnectTime: 2000,
        connectionTimeoutTime: 2000,
      },
      seedNodes: {}, // Explicitly no seed nodes on startup
      logger,
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    // Setting up a remote keynode
    remoteOnline = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir, 'remoteOnline'),
      networkConfig: {
        agentHost: '127.0.0.1',
        clientHost: '127.0.0.1',
      },
      logger,
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    remoteOnlineNodeId = remoteOnline.keyRing.getNodeId();
    remoteOnlineHost = remoteOnline.quicServerAgent.host;
    remoteOnlinePort = remoteOnline.quicServerAgent.port;
    await testNodesUtils.nodesConnect(polykeyAgent, remoteOnline);
    // Setting up an offline remote keynode
    remoteOffline = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir, 'remoteOffline'),
      networkConfig: {
        agentHost: '127.0.0.1',
        clientHost: '127.0.0.1',
      },
      logger,
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    remoteOfflineNodeId = remoteOffline.keyRing.getNodeId();
    remoteOfflineHost = remoteOffline.quicServerAgent.host;
    remoteOfflinePort = remoteOffline.quicServerAgent.port;
    await testNodesUtils.nodesConnect(polykeyAgent, remoteOffline);
    await remoteOffline.stop();
  });
  afterEach(async () => {
    await polykeyAgent.stop();
    await remoteOnline.stop();
    await remoteOffline.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'finds an online node',
    async () => {
      const { exitCode, stdout } = await testUtils.pkStdio(
        [
          'nodes',
          'find',
          nodesUtils.encodeNodeId(remoteOnlineNodeId),
          '--format',
          'json',
        ],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        success: true,
        message: `Found node at ${remoteOnlineHost}:${remoteOnlinePort}`,
        id: nodesUtils.encodeNodeId(remoteOnlineNodeId),
        host: remoteOnlineHost,
        port: remoteOnlinePort,
      });
    },
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'finds an offline node',
    async () => {
      const { exitCode, stdout } = await testUtils.pkStdio(
        [
          'nodes',
          'find',
          nodesUtils.encodeNodeId(remoteOfflineNodeId),
          '--format',
          'json',
        ],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        success: true,
        message: `Found node at ${remoteOfflineHost}:${remoteOfflinePort}`,
        id: nodesUtils.encodeNodeId(remoteOfflineNodeId),
        host: remoteOfflineHost,
        port: remoteOfflinePort,
      });
    },
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'fails to find an unknown node',
    async () => {
      const unknownNodeId = nodesUtils.decodeNodeId(
        'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg',
      );
      const { exitCode, stdout } = await testUtils.pkStdio(
        [
          'nodes',
          'find',
          nodesUtils.encodeNodeId(unknownNodeId!),
          '--format',
          'json',
        ],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(exitCode).toBe(sysexits.GENERAL);
      expect(JSON.parse(stdout)).toEqual({
        success: false,
        message: `Failed to find node ${nodesUtils.encodeNodeId(
          unknownNodeId!,
        )}`,
        id: nodesUtils.encodeNodeId(unknownNodeId!),
        host: '',
        port: 0,
      });
    },
    globalThis.failedConnectionTimeout,
  );
});
