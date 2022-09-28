import type { NodeId, NodeIdEncoded } from '@/ids/types';
import type { Host } from '@/network/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import * as testNodesUtils from '../../nodes/utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
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
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
      seedNodes: {}, // Explicitly no seed nodes on startup
      logger,
    });
    localId = pkAgent.keyManager.getNodeId();
    // Setting up a remote keynode
    remoteNode = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir, 'remoteNode'),
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[1],
      },
      seedNodes: {}, // Explicitly no seed nodes on startup
      logger,
    });
    remoteId = remoteNode.keyManager.getNodeId();
    remoteIdEncoded = nodesUtils.encodeNodeId(remoteId);
    await testNodesUtils.nodesConnect(pkAgent, remoteNode);
    await pkAgent.acl.setNodePerm(remoteId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await remoteNode.acl.setNodePerm(localId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
  });
  afterEach(async () => {
    await pkAgent.stop();
    await pkAgent.destroy();
    await remoteNode.stop();
    await remoteNode.destroy();
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
      expect(stdout).toContain('Gestalt Invite');
      expect(stdout).toContain(remoteIdEncoded);
    },
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'sends a gestalt invite (force invite)',
    async () => {
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
      expect(stdout).toContain('Gestalt Invite');
      expect(stdout).toContain(nodesUtils.encodeNodeId(remoteId));
    },
  );
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
