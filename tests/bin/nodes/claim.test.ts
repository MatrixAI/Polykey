import type { NodeId, NodeIdEncoded } from '@/ids/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils/index';
import * as testNodesUtils from '../../nodes/utils';
import * as testUtils from '../../utils';

describe('claim', () => {
  const logger = new Logger('claim test', LogLevel.WARN, [new StreamHandler()]);
  const password = 'helloworld';
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
  let remoteNode: PolykeyAgent;
  let localId: NodeId;
  let remoteId: NodeId;
  let remoteIdEncoded: NodeIdEncoded;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      networkConfig: {
        agentHost: '127.0.0.1',
        clientHost: '127.0.0.1',
      },
      seedNodes: {}, // Explicitly no seed nodes on startup
      logger,
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    localId = pkAgent.keyRing.getNodeId();
    // Setting up a remote keynode
    remoteNode = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir, 'remoteNode'),
      networkConfig: {
        agentHost: '127.0.0.1',
        clientHost: '127.0.0.1',
      },
      seedNodes: {}, // Explicitly no seed nodes on startup
      logger,
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    remoteId = remoteNode.keyRing.getNodeId();
    remoteIdEncoded = nodesUtils.encodeNodeId(remoteId);
    await testNodesUtils.nodesConnect(pkAgent, remoteNode);
    await pkAgent.acl.setNodePerm(remoteId, {
      gestalt: {
        notify: null,
        claim: null,
      },
      vaults: {},
    });
    await remoteNode.acl.setNodePerm(localId, {
      gestalt: {
        notify: null,
        claim: null,
      },
      vaults: {},
    });
  });
  afterEach(async () => {
    await pkAgent.stop();
    await remoteNode.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'sends a gestalt invite',
    async () => {
      const { exitCode, stdout } = await testUtils.pkStdio(
        ['nodes', 'claim', remoteIdEncoded],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Successfully generated a cryptolink claim');
      expect(stdout).toContain(remoteIdEncoded);
    },
  );
  // TestUtils.testIf(testUtils.isTestPlatformEmpty)
  test('sends a gestalt invite (force invite)', async () => {
    await remoteNode.notificationsManager.sendNotification(localId, {
      type: 'GestaltInvite',
    });
    const { exitCode, stdout } = await testUtils.pkStdio(
      ['nodes', 'claim', remoteIdEncoded, '--force-invite'],
      {
        env: {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        cwd: dataDir,
      },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Successfully generated a cryptolink');
    expect(stdout).toContain(nodesUtils.encodeNodeId(remoteId));
  });
  testUtils.testIf(testUtils.isTestPlatformEmpty)('claims a node', async () => {
    await remoteNode.notificationsManager.sendNotification(localId, {
      type: 'GestaltInvite',
    });
    const { exitCode, stdout } = await testUtils.pkStdio(
      ['nodes', 'claim', remoteIdEncoded],
      {
        env: {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        cwd: dataDir,
      },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('cryptolink claim');
    expect(stdout).toContain(remoteIdEncoded);
  });
});
