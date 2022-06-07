import type { NodeId } from '@/nodes/types';
import type { Host } from '@/network/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { sysexits } from '@/utils';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import NodeManager from '@/nodes/NodeManager';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';
import * as testNodesUtils from '../../nodes/utils';

describe('add', () => {
  const logger = new Logger('add test', LogLevel.WARN, [new StreamHandler()]);
  const password = 'helloworld';
  const validNodeId = testNodesUtils.generateRandomNodeId();
  const invalidNodeId = IdInternal.fromString<NodeId>('INVALIDID');
  const validHost = '0.0.0.0';
  const invalidHost = 'INVALIDHOST';
  const port = 55555;
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let mockedPingNode: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'polykey');
    mockedPingNode = jest.spyOn(NodeManager.prototype, 'pingNode');
    // Cannot use the shared global agent since we can't 'un-add' a node
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      logger,
    });
  });
  afterAll(async () => {
    await pkAgent.stop();
    await pkAgent.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
    mockedPingNode.mockRestore();
  });
  beforeEach(async () => {
    await pkAgent.nodeGraph.stop();
    await pkAgent.nodeGraph.start({ fresh: true });
    mockedPingNode.mockImplementation(() => true);
  });
  test('adds a node', async () => {
    const { exitCode } = await testBinUtils.pkStdio(
      [
        'nodes',
        'add',
        nodesUtils.encodeNodeId(validNodeId),
        validHost,
        `${port}`,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(0);
    // Checking if node was added.
    const { stdout } = await testBinUtils.pkStdio(
      ['nodes', 'find', nodesUtils.encodeNodeId(validNodeId)],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(stdout).toContain(validHost);
    expect(stdout).toContain(`${port}`);
  });
  test('fails to add a node (invalid node ID)', async () => {
    const { exitCode } = await testBinUtils.pkStdio(
      [
        'nodes',
        'add',
        nodesUtils.encodeNodeId(invalidNodeId),
        validHost,
        `${port}`,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(sysexits.USAGE);
  });
  test('fails to add a node (invalid IP address)', async () => {
    const { exitCode } = await testBinUtils.pkStdio(
      [
        'nodes',
        'add',
        nodesUtils.encodeNodeId(validNodeId),
        invalidHost,
        `${port}`,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(sysexits.USAGE);
  });
  test('adds a node with --force flag', async () => {
    const { exitCode } = await testBinUtils.pkStdio(
      [
        'nodes',
        'add',
        '--force',
        nodesUtils.encodeNodeId(validNodeId),
        validHost,
        `${port}`,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(0);
    // Checking if node was added.
    const node = await pkAgent.nodeGraph.getNode(validNodeId);
    expect(node?.address).toEqual({ host: validHost, port: port });
  });
  test('fails to add node when ping fails', async () => {
    mockedPingNode.mockImplementation(() => false);
    const { exitCode } = await testBinUtils.pkStdio(
      [
        'nodes',
        'add',
        nodesUtils.encodeNodeId(validNodeId),
        validHost,
        `${port}`,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(sysexits.NOHOST);
  });
  test('adds a node with --no-ping flag', async () => {
    mockedPingNode.mockImplementation(() => false);
    const { exitCode } = await testBinUtils.pkStdio(
      [
        'nodes',
        'add',
        '--no-ping',
        nodesUtils.encodeNodeId(validNodeId),
        validHost,
        `${port}`,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    expect(exitCode).toBe(0);
    // Checking if node was added.
    const node = await pkAgent.nodeGraph.getNode(validNodeId);
    expect(node?.address).toEqual({ host: validHost, port: port });
  });
});
