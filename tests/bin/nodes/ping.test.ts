import type { NodeId } from '@/nodes/types';
import type { Host } from '@/network/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import { sysexits } from '@/errors';
import * as testBinUtils from '../utils';
import * as testNodesUtils from '../../nodes/utils';
import * as testUtils from '../../utils';

describe('ping', () => {
  const logger = new Logger('ping test', LogLevel.WARN, [new StreamHandler()]);
  const password = 'helloworld';
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let dataDir: string;
  let nodePath: string;
  let polykeyAgent: PolykeyAgent;
  let remoteOnline: PolykeyAgent;
  let remoteOffline: PolykeyAgent;
  let remoteOnlineNodeId: NodeId;
  let remoteOfflineNodeId: NodeId;
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
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      proxyConfig: {
        connConnectTime: 2000,
      },
      nodeConnectionManagerConfig: {
        connConnectTime: 2000,
        connTimeoutTime: 1000,
      },
      seedNodes: {}, // Explicitly no seed nodes on startup
      logger,
    });
    // Setting up a remote keynode
    remoteOnline = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir, 'remoteOnline'),
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        rootKeyPairBits: 1024,
      },
      logger,
    });
    remoteOnlineNodeId = remoteOnline.keyManager.getNodeId();
    await testNodesUtils.nodesConnect(polykeyAgent, remoteOnline);
    // Setting up an offline remote keynode
    remoteOffline = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir, 'remoteOffline'),
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        rootKeyPairBits: 1024,
      },
      logger,
    });
    remoteOfflineNodeId = remoteOffline.keyManager.getNodeId();
    await testNodesUtils.nodesConnect(polykeyAgent, remoteOffline);
    await remoteOffline.stop();
  }, global.defaultTimeout * 3);
  afterAll(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await remoteOnline.stop();
    await remoteOnline.destroy();
    await remoteOffline.stop();
    await remoteOffline.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  test('fails when pinging an offline node', async () => {
    const { exitCode, stdout, stderr } = await testBinUtils.pkStdio(
      [
        'nodes',
        'ping',
        nodesUtils.encodeNodeId(remoteOfflineNodeId),
        '--format',
        'json',
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(sysexits.GENERAL); // Should fail with no response. for automation purposes.
    expect(stderr).toContain('No response received');
    expect(JSON.parse(stdout)).toEqual({
      success: false,
      message: 'No response received',
    });
  });
  test('fails if node cannot be found', async () => {
    const fakeNodeId = nodesUtils.decodeNodeId(
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
    );
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      [
        'nodes',
        'ping',
        nodesUtils.encodeNodeId(fakeNodeId!),
        '--format',
        'json',
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).not.toBe(0); // Should fail if node doesn't exist.
    expect(JSON.parse(stdout)).toEqual({
      success: false,
      message: `Failed to resolve node ID ${nodesUtils.encodeNodeId(
        fakeNodeId!,
      )} to an address.`,
    });
  });
  test('succeed when pinging a live node', async () => {
    const { exitCode, stdout } = await testBinUtils.pkStdio(
      [
        'nodes',
        'ping',
        nodesUtils.encodeNodeId(remoteOnlineNodeId),
        '--format',
        'json',
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      success: true,
      message: 'Node is Active.',
    });
  });
});
