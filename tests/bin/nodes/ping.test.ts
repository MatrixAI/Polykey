import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('ping', () => {
  const password = 'password';
  const logger = new Logger('ping test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodePath: string;
  let passwordFile: string;
  let polykeyAgent: PolykeyAgent;
  let remoteOnline: PolykeyAgent;
  let remoteOffline: PolykeyAgent;

  let keynodeId: NodeId;
  let remoteOnlineNodeId: NodeId;
  let remoteOfflineNodeId: NodeId;

  let remoteOnlineHost: Host;
  let remoteOnlinePort: Port;
  let remoteOfflineHost: Host;
  let remoteOfflinePort: Port;

  // Helper functions
  function genCommands(options: Array<string>) {
    return ['nodes', ...options, '-np', nodePath];
  }

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
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
    keynodeId = polykeyAgent.nodeManager.getNodeId();

    // Setting up a remote keynode
    remoteOnline = await testUtils.setupRemoteKeynode({
      logger,
    });
    remoteOnlineNodeId = remoteOnline.nodeManager.getNodeId();
    remoteOnlineHost = remoteOnline.revProxy.getIngressHost();
    remoteOnlinePort = remoteOnline.revProxy.getIngressPort();
    await testUtils.addRemoteDetails(polykeyAgent, remoteOnline);

    // Setting up an offline remote keynode
    remoteOffline = await testUtils.setupRemoteKeynode({
      logger,
    });
    remoteOfflineNodeId = remoteOffline.nodeManager.getNodeId();
    remoteOfflineHost = remoteOffline.revProxy.getIngressHost();
    remoteOfflinePort = remoteOffline.revProxy.getIngressPort();
    await testUtils.addRemoteDetails(polykeyAgent, remoteOffline);
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
    await testUtils.cleanupRemoteKeynode(remoteOnline);
    await testUtils.cleanupRemoteKeynode(remoteOffline);
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test(
    'fail when pinging an offline node',
    async () => {
      const commands = genCommands(['ping', remoteOfflineNodeId]);
      const result = await testBinUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(1); // Should fail with no response. for automation purposes.
      expect(result.stdout).toContain('No response received');

      // Checking for json output
      const commands2 = genCommands([
        'ping',
        remoteOfflineNodeId,
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
      const fakeNodeId = nodesUtils.makeNodeId(
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
      );
      const commands = genCommands(['ping', fakeNodeId]);
      const result = await testBinUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).not.toBe(0); // Should fail if node doesn't exist.
      expect(result.stdout).toContain('Failed to resolve node ID');

      // Json format.
      const commands2 = genCommands(['ping', fakeNodeId, '--format', 'json']);
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
    const commands = genCommands(['ping', remoteOnlineNodeId]);
    const result = await testBinUtils.pkStdio(commands, {}, dataDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Node is Active.');

    // Checking for Json output.
    const commands2 = genCommands([
      'ping',
      remoteOnlineNodeId,
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
