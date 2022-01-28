import type { Host, Port } from '@/network/types';
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

describe('find', () => {
  const password = 'password';
  const logger = new Logger('find test', LogLevel.WARN, [new StreamHandler()]);
  let rootDataDir: string;
  let dataDir: string;
  let nodePath: string;
  let passwordFile: string;
  let polykeyAgent: PolykeyAgent;
  let remoteOnline: PolykeyAgent;
  let remoteOffline: PolykeyAgent;

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
    rootDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
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
    remoteOnlineHost = remoteOnline.revProxy.getIngressHost();
    remoteOnlinePort = remoteOnline.revProxy.getIngressPort();
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
    remoteOfflineHost = remoteOffline.revProxy.getIngressHost();
    remoteOfflinePort = remoteOffline.revProxy.getIngressPort();
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

  test('find an online node', async () => {
    const commands = genCommands([
      'find',
      nodesUtils.encodeNodeId(remoteOnlineNodeId),
    ]);
    const result = await testBinUtils.pkStdio(commands, {}, dataDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Found node at');
    expect(result.stdout).toContain(remoteOnlineHost);
    expect(result.stdout).toContain(remoteOnlinePort);

    // Checking json format.
    const commands2 = genCommands([
      'find',
      nodesUtils.encodeNodeId(remoteOnlineNodeId),
      '--format',
      'json',
    ]);
    const result2 = await testBinUtils.pkStdio(commands2, {}, dataDir);
    expect(result2.exitCode).toBe(0);
    expect(result2.stdout).toContain('success');
    expect(result2.stdout).toContain('true');
    expect(result2.stdout).toContain('message');
    expect(result2.stdout).toContain(
      `Found node at ${remoteOnlineHost}:${remoteOnlinePort}`,
    );
    expect(result2.stdout).toContain('host');
    expect(result2.stdout).toContain('port');
    expect(result2.stdout).toContain('id');
    expect(result2.stdout).toContain(
      nodesUtils.encodeNodeId(remoteOnlineNodeId),
    );
  });
  test('find an offline node', async () => {
    const commands = genCommands([
      'find',
      nodesUtils.encodeNodeId(remoteOfflineNodeId),
    ]);
    const result = await testBinUtils.pkStdio(commands, {}, dataDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Found node at');
    expect(result.stdout).toContain(remoteOfflineHost);
    expect(result.stdout).toContain(remoteOfflinePort);

    // Checking json format.
    const commands2 = genCommands([
      'find',
      nodesUtils.encodeNodeId(remoteOfflineNodeId),
      '--format',
      'json',
    ]);
    const result2 = await testBinUtils.pkStdio(commands2, {}, dataDir);
    expect(result2.exitCode).toBe(0);
    expect(result2.stdout).toContain('success');
    expect(result2.stdout).toContain('true');
    expect(result2.stdout).toContain('message');
    expect(result2.stdout).toContain(
      `Found node at ${remoteOfflineHost}:${remoteOfflinePort}`,
    );
    expect(result2.stdout).toContain('host');
    expect(result2.stdout).toContain('port');
    expect(result2.stdout).toContain('id');
    expect(result2.stdout).toContain(
      nodesUtils.encodeNodeId(remoteOfflineNodeId),
    );
  });
  test(
    'fail to find an unknown node',
    async () => {
      const unknownNodeId = nodesUtils.decodeNodeId(
        'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg',
      );
      const commands = genCommands([
        'find',
        nodesUtils.encodeNodeId(unknownNodeId),
      ]);
      const result = await testBinUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain(
        `Failed to find node ${nodesUtils.encodeNodeId(unknownNodeId)}`,
      );

      // Checking json format.
      const commands2 = genCommands([
        'find',
        nodesUtils.encodeNodeId(unknownNodeId),
        '--format',
        'json',
      ]);
      const result2 = await testBinUtils.pkStdio(commands2, {}, dataDir);
      expect(result2.exitCode).toBe(1);
      expect(result2.stdout).toContain(`message`);
      expect(result2.stdout).toContain(`Failed to find node ${unknownNodeId}`);
      expect(result2.stdout).toContain('id');
      expect(result2.stdout).toContain(unknownNodeId);
      expect(result2.stdout).toContain('port');
      expect(result2.stdout).toContain('0');
      expect(result2.stdout).toContain('host');
      expect(result2.stdout).toContain('success');
      expect(result2.stdout).toContain('false');
    },
    global.failedConnectionTimeout * 2,
  );
});
