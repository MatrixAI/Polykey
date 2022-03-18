import type { NodeId, NodeIdEncoded } from '@/nodes/types';
import type { Host } from '@/network/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as testBinUtils from '../utils';
import * as testNodesUtils from '../../nodes/utils';
import * as testUtils from '../../utils';

describe('claim', () => {
  const logger = new Logger('claim test', LogLevel.WARN, [new StreamHandler()]);
  const password = 'helloworld';
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
  let remoteNode: PolykeyAgent;
  let localId: NodeId;
  let remoteId: NodeId;
  let remoteIdEncoded: NodeIdEncoded;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValueOnce(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValueOnce(globalKeyPair);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
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
        rootKeyPairBits: 2048,
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
        rootKeyPairBits: 2048,
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
  }, global.defaultTimeout * 2);
  afterAll(async () => {
    await pkAgent.stop();
    await pkAgent.destroy();
    await remoteNode.stop();
    await remoteNode.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  test('sends a gestalt invite', async () => {
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      ['nodes', 'claim', remoteIdEncoded],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Gestalt Invite');
    expect(stdout).toContain(remoteIdEncoded);
    // Clear side-effects
    await remoteNode.notificationsManager.clearNotifications();
  });
  test('sends a gestalt invite (force invite)', async () => {
    await remoteNode.notificationsManager.sendNotification(localId, {
      type: 'GestaltInvite',
    });
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      ['nodes', 'claim', remoteIdEncoded, '--force-invite'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Gestalt Invite');
    expect(stdout).toContain(nodesUtils.encodeNodeId(remoteId));
    // Clear side effects
    await pkAgent.notificationsManager.clearNotifications();
    await remoteNode.notificationsManager.clearNotifications();
  });
  test('claims a node', async () => {
    await remoteNode.notificationsManager.sendNotification(localId, {
      type: 'GestaltInvite',
    });
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      ['nodes', 'claim', remoteIdEncoded],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('cryptolink claim');
    expect(stdout).toContain(remoteIdEncoded);
    // Clear side effects
    await pkAgent.notificationsManager.clearNotifications();
    await pkAgent.sigchain.stop();
    await pkAgent.sigchain.start({ fresh: true });
  });
});
