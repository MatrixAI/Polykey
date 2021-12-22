import type { NodeId, NodeIdEncoded } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { utils as nodesUtils } from '@/nodes';
import * as keysUtils from '@/keys/utils';
import * as testBinUtils from '../utils';
import * as testNodesUtils from '../../nodes/utils';

describe('claim', () => {
  const password = 'password';
  const logger = new Logger('claim test', LogLevel.WARN, [new StreamHandler()]);
  let rootDataDir: string;
  let dataDir: string;
  let nodePath: string;
  let passwordFile: string;
  let polykeyAgent: PolykeyAgent;
  let remoteOnline: PolykeyAgent;

  let keynodeId: NodeId;
  let remoteOnlineNodeId: NodeId;
  let remoteOnlineNodeIdEncoded: NodeIdEncoded;

  // Helper functions
  function genCommands(options: Array<string>) {
    return ['nodes', ...options, '-np', nodePath];
  }

  const mockedGenerateDeterministicKeyPair = jest.spyOn(
    keysUtils,
    'generateDeterministicKeyPair',
  );

  beforeAll(async () => {
    mockedGenerateDeterministicKeyPair.mockImplementation((bits, _) => {
      return keysUtils.generateKeyPair(bits);
    });

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
    keynodeId = polykeyAgent.keyManager.getNodeId();
    // Setting up a remote keynode
    remoteOnline = await PolykeyAgent.createPolykeyAgent({
      password: 'password',
      nodePath: path.join(rootDataDir, 'remoteOnline'),
      keysConfig: {
        rootKeyPairBits: 2048,
      },
      logger,
    });
    remoteOnlineNodeId = remoteOnline.keyManager.getNodeId();
    remoteOnlineNodeIdEncoded = nodesUtils.encodeNodeId(remoteOnlineNodeId);
    await testNodesUtils.nodesConnect(polykeyAgent, remoteOnline);

    await remoteOnline.nodeGraph.setNode(keynodeId, {
      host: polykeyAgent.revProxy.getIngressHost(),
      port: polykeyAgent.revProxy.getIngressPort(),
    });
    await polykeyAgent.acl.setNodePerm(remoteOnlineNodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await remoteOnline.acl.setNodePerm(keynodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });

    // Authorize session
    await testBinUtils.pkStdio(
      ['agent', 'unlock', '-np', nodePath, '--password-file', passwordFile],
      {},
      nodePath,
    );
  }, global.polykeyStartupTimeout * 2);

  afterEach(async () => {
    await polykeyAgent.notificationsManager.clearNotifications();
    await remoteOnline.notificationsManager.clearNotifications();
    await polykeyAgent.sigchain.clearDB();
    await remoteOnline.sigchain.clearDB();
  });
  afterAll(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await remoteOnline.stop();
    await fs.promises.rm(rootDataDir, {
      force: true,
      recursive: true,
    });
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test(
    'send a gestalt invite',
    async () => {
      const commands = genCommands([
        'claim',
        nodesUtils.encodeNodeId(remoteOnlineNodeId),
      ]);
      const result = await testBinUtils.pkStdio(commands);
      expect(result.exitCode).toBe(0); // Succeeds.
      expect(result.stdout).toContain('Gestalt Invite');
      expect(result.stdout).toContain(remoteOnlineNodeIdEncoded);
    },
    global.polykeyStartupTimeout * 4,
  );
  test('send a gestalt invite (force invite)', async () => {
    await remoteOnline.notificationsManager.sendNotification(keynodeId, {
      type: 'GestaltInvite',
    });
    // Needs to be forced, as the local node has already received an invitation
    const commands = genCommands([
      'claim',
      nodesUtils.encodeNodeId(remoteOnlineNodeId),
      '--force-invite',
    ]);
    const result = await testBinUtils.pkStdio(commands, {}, dataDir);
    expect(result.exitCode).toBe(0); // Succeeds.
    expect(result.stdout).toContain('Gestalt Invite');
    expect(result.stdout).toContain(remoteOnlineNodeIdEncoded);
  });
  test('claim the remote node', async () => {
    await remoteOnline.notificationsManager.sendNotification(keynodeId, {
      type: 'GestaltInvite',
    });
    // Received an invitation, so will attempt to perform the claiming process
    const commands = genCommands([
      'claim',
      nodesUtils.encodeNodeId(remoteOnlineNodeId),
    ]);
    const result = await testBinUtils.pkStdio(commands, {}, dataDir);
    expect(result.exitCode).toBe(0); // Succeeds.
    expect(result.stdout).toContain('cryptolink claim');
    expect(result.stdout).toContain(remoteOnlineNodeIdEncoded);
  });
});
