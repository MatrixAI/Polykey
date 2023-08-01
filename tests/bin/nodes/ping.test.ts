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

describe('ping', () => {
  const logger = new Logger('ping test', LogLevel.WARN, [new StreamHandler()]);
  const password = 'helloworld';
  let dataDir: string;
  let nodePath: string;
  let polykeyAgent: PolykeyAgent;
  let remoteOnline: PolykeyAgent;
  let remoteOffline: PolykeyAgent;
  let remoteOnlineNodeId: NodeId;
  let remoteOfflineNodeId: NodeId;
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
        connectionTimeoutTime: 1000,
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
    'fails when pinging an offline node',
    async () => {
      const { exitCode, stdout, stderr } = await testUtils.pkStdio(
        [
          'nodes',
          'ping',
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
      expect(exitCode).toBe(sysexits.GENERAL); // Should fail with no response. for automation purposes.
      expect(stderr).toContain('No response received');
      expect(JSON.parse(stdout)).toEqual({
        success: false,
        message: 'No response received',
      });
    },
    globalThis.failedConnectionTimeout,
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'fails if node cannot be found',
    async () => {
      const fakeNodeId = nodesUtils.decodeNodeId(
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
      );
      const { exitCode, stdout } = await testUtils.pkStdio(
        [
          'nodes',
          'ping',
          nodesUtils.encodeNodeId(fakeNodeId!),
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
      expect(exitCode).not.toBe(0); // Should fail if node doesn't exist.
      expect(JSON.parse(stdout)).toEqual({
        success: false,
        message: `No response received`,
      });
    },
    globalThis.failedConnectionTimeout,
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'succeed when pinging a live node',
    async () => {
      const { exitCode, stdout } = await testUtils.pkStdio(
        [
          'nodes',
          'ping',
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
        message: 'Node is Active.',
      });
    },
  );
});
