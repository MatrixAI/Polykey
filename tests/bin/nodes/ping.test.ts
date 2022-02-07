import type { NodeId } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import * as testBinUtils from '../utils';
import * as testNodesUtils from '../../nodes/utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('ping', () => {
  const password = 'password';
  const logger = new Logger('ping test', LogLevel.WARN, [new StreamHandler()]);
  let rootDataDir: string;
  let dataDir: string;
  let nodePath: string;
  let passwordFile: string;
  let polykeyAgent: PolykeyAgent;
  let remoteOnline: PolykeyAgent;
  let remoteOffline: PolykeyAgent;

  let remoteOnlineNodeId: NodeId;
  let remoteOfflineNodeId: NodeId;

  // Helper functions
  function genCommands(options: Array<string>) {
    return ['nodes', ...options, '-np', nodePath];
  }

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    rootDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: nodePath,
      logger: logger,
    });

    // Setting up a remote keynode
    remoteOnline = await PolykeyAgent.createPolykeyAgent({
      password: 'password',
      nodePath: path.join(rootDataDir, 'remoteOnline'),
      keysConfig: {
        rootKeyPairBits: 2048,
      },
      logger,
    });
    remoteOnlineNodeId = remoteOnline.nodeManager.getNodeId();
    await testNodesUtils.nodesConnect(polykeyAgent, remoteOnline);

    // Setting up an offline remote keynode
    remoteOffline = await PolykeyAgent.createPolykeyAgent({
      password: 'password',
      nodePath: path.join(rootDataDir, 'remoteOffline'),
      keysConfig: {
        rootKeyPairBits: 2048,
      },
      logger,
    });
    remoteOfflineNodeId = remoteOffline.nodeManager.getNodeId();
    await testNodesUtils.nodesConnect(polykeyAgent, remoteOffline);
    await remoteOffline.stop();

    // Authorize session
    await testBinUtils.pkStdio(
      ['agent', 'unlock', '-np', nodePath, '--password-file', passwordFile],
      {},
      nodePath,
    );
  }, global.polykeyStartupTimeout * 3);
  afterAll(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await remoteOnline.stop();
    await remoteOffline.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await fs.promises.rm(rootDataDir, {
      force: true,
      recursive: true,
    });
  });
  test(
    'fail when pinging an offline node',
    async () => {
      const commands = genCommands([
        'ping',
        nodesUtils.encodeNodeId(remoteOfflineNodeId),
        '-c',
        '1',
        '-ad',
        '100',
      ]);
      const result = await testBinUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(1); // Should fail with no response. for automation purposes.
      expect(result.stdout).toContain('No response received');

      // Checking for json output
      const commands2 = genCommands([
        'ping',
        nodesUtils.encodeNodeId(remoteOfflineNodeId),
        '--format',
        'json',
      ]);
      const result2 = await testBinUtils.pkStdio(commands2, {}, dataDir);
      expect(result2.exitCode).toBe(1); // Should fail with no response. for automation purposes.
      expect(result2.stdout).toContain('No response received');
    },
    global.failedConnectionTimeout * 2,
  );
  test(
    'fail if node cannot be found',
    async () => {
      const fakeNodeId = nodesUtils.decodeNodeId(
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
      )!;
      const commands = genCommands([
        'ping',
        nodesUtils.encodeNodeId(fakeNodeId),
      ]);
      const result = await testBinUtils.pk(commands);
      expect(result.exitCode).not.toBe(0); // Should fail if node doesn't exist.
      expect(result.stdout).toContain('Failed to resolve node ID');

      // Json format.
      const commands2 = genCommands([
        'ping',
        nodesUtils.encodeNodeId(fakeNodeId),
        '--format',
        'json',
      ]);
      const result2 = await testBinUtils.pkStdio(commands2, {}, dataDir);
      expect(result2.exitCode).not.toBe(0); // Should fail if node doesn't exist.
      expect(result2.stdout).toContain('success');
      expect(result2.stdout).toContain('false');
      expect(result2.stdout).toContain('message');
      expect(result2.stdout).toContain('Failed to resolve node ID');
    },
    global.failedConnectionTimeout * 2,
  );
  test('succeed when pinging a live node', async () => {
    const commands = genCommands([
      'ping',
      nodesUtils.encodeNodeId(remoteOnlineNodeId),
    ]);
    const result = await testBinUtils.pkStdio(commands, {}, dataDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Node is Active.');

    // Checking for Json output.
    const commands2 = genCommands([
      'ping',
      nodesUtils.encodeNodeId(remoteOnlineNodeId),
      '--format',
      'json',
    ]);
    const result2 = await testBinUtils.pkStdio(commands2, {}, dataDir);
    expect(result2.exitCode).toBe(0);
    expect(result2.stdout).toContain('success');
    expect(result2.stdout).toContain('true');
    expect(result2.stdout).toContain('message');
    expect(result2.stdout).toContain('Node is Active');
  });
});
