import type { Host, Port } from '@/network/types';
import type { NodeId, NodeAddress } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { makeNodeId } from '@/nodes/utils';
import * as testUtils from './utils';
import * as testKeynodeUtils from '../utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('CLI Nodes', () => {
  const password = 'password';
  const logger = new Logger('pkStdio Test', LogLevel.WARN, [
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

  const nodeId1 = makeNodeId(
    'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
  );
  const nodeId2 = makeNodeId(
    'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg',
  );
  const nodeId3 = makeNodeId(
    'v359vgrgmqf1r5g4fvisiddjknjko6bmm4qv7646jr7fi9enbfuug',
  );

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
    remoteOnline = await testKeynodeUtils.setupRemoteKeynode({
      logger,
    });
    remoteOnlineNodeId = remoteOnline.nodeManager.getNodeId();
    remoteOnlineHost = remoteOnline.revProxy.ingressHost;
    remoteOnlinePort = remoteOnline.revProxy.ingressPort;
    await testKeynodeUtils.addRemoteDetails(polykeyAgent, remoteOnline);

    // Setting up an offline remote keynode
    remoteOffline = await testKeynodeUtils.setupRemoteKeynode({
      logger,
    });
    remoteOfflineNodeId = remoteOffline.nodeManager.getNodeId();
    remoteOfflineHost = remoteOffline.revProxy.ingressHost;
    remoteOfflinePort = remoteOffline.revProxy.ingressPort;
    await testKeynodeUtils.addRemoteDetails(polykeyAgent, remoteOffline);
    await remoteOffline.stop();

    // Authorize session
    await testUtils.pkStdio(
      ['agent', 'unlock', '-np', nodePath, '--password-file', passwordFile],
      {},
      nodePath,
    );
  }, global.polykeyStartupTimeout * 3);
  afterAll(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await testKeynodeUtils.cleanupRemoteKeynode(remoteOnline);
    await testKeynodeUtils.cleanupRemoteKeynode(remoteOffline);
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  describe('commandClaimNode', () => {
    beforeAll(async () => {
      await remoteOnline.nodeManager.setNode(keynodeId, {
        ip: polykeyAgent.revProxy.ingressHost,
        port: polykeyAgent.revProxy.ingressPort,
      } as NodeAddress);
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
    });
    afterEach(async () => {
      await polykeyAgent.notificationsManager.clearNotifications();
      await remoteOnline.notificationsManager.clearNotifications();
      await polykeyAgent.sigchain.clearDB();
      await remoteOnline.sigchain.clearDB();
    });
    afterAll(async () => {
      await polykeyAgent.acl.setNodePerm(remoteOnlineNodeId, {
        gestalt: {},
        vaults: {},
      });
      await remoteOnline.acl.setNodePerm(keynodeId, {
        gestalt: {},
        vaults: {},
      });
      await remoteOnline.nodeManager.clearDB();
    });
    test(
      'Should send a gestalt invite',
      async () => {
        const commands = genCommands(['claim', remoteOnlineNodeId]);
        const result = await testUtils.pkStdio(commands);
        expect(result.exitCode).toBe(0); // Succeeds.
        expect(result.stdout).toContain('Gestalt Invite');
        expect(result.stdout).toContain(remoteOnlineNodeId);
      },
      global.polykeyStartupTimeout * 4,
    );
    test('Should send a gestalt invite (force invite)', async () => {
      await remoteOnline.notificationsManager.sendNotification(keynodeId, {
        type: 'GestaltInvite',
      });
      const commands = genCommands([
        'claim',
        remoteOnlineNodeId,
        '--force-invite',
      ]);
      const result = await testUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(0); // Succeeds.
      expect(result.stdout).toContain('Gestalt Invite');
      expect(result.stdout).toContain(remoteOnlineNodeId);
    });
    test('Should claim remote node', async () => {
      await remoteOnline.notificationsManager.sendNotification(keynodeId, {
        type: 'GestaltInvite',
      });
      const commands = genCommands(['claim', remoteOnlineNodeId]);
      const result = await testUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(0); // Succeeds.
      expect(result.stdout).toContain('cryptolink claim');
      expect(result.stdout).toContain(remoteOnlineNodeId);
    });
  });
  describe('commandPingNode', () => {
    test(
      'Should return failure when pinging an offline node',
      async () => {
        const commands = genCommands(['ping', remoteOfflineNodeId]);
        const result = await testUtils.pkStdio(commands, {}, dataDir);
        expect(result.exitCode).toBe(1); // Should fail with no response. for automation purposes.
        expect(result.stdout).toContain('No response received');

        // Checking for json output
        const commands2 = genCommands([
          'ping',
          remoteOfflineNodeId,
          '--format',
          'json',
        ]);
        const result2 = await testUtils.pkStdio(commands2, {}, dataDir);
        expect(result2.exitCode).toBe(1); // Should fail with no response. for automation purposes.
        expect(result2.stdout).toContain('No response received');
      },
      global.failedConnectionTimeout * 2,
    );
    test(
      "Should return failure if can't find the node",
      async () => {
        const fakeNodeId = nodeId1;
        const commands = genCommands(['ping', fakeNodeId]);
        const result = await testUtils.pkStdio(commands, {}, dataDir);
        expect(result.exitCode).not.toBe(0); // Should fail if node doesn't exist.
        expect(result.stdout).toContain('Failed to resolve node ID');

        // Json format.
        const commands2 = genCommands(['ping', fakeNodeId, '--format', 'json']);
        const result2 = await testUtils.pkStdio(commands2, {}, dataDir);
        expect(result2.exitCode).not.toBe(0); // Should fail if node doesn't exist.
        expect(result2.stdout).toContain('success');
        expect(result2.stdout).toContain('false');
        expect(result2.stdout).toContain('message');
        expect(result2.stdout).toContain('Failed to resolve node ID');
      },
      global.failedConnectionTimeout * 2,
    );
    test('Should return success when pinging a live node', async () => {
      const commands = genCommands(['ping', remoteOnlineNodeId]);
      const result = await testUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Node is Active.');

      // Checking for Json output.
      const commands2 = genCommands([
        'ping',
        remoteOnlineNodeId,
        '--format',
        'json',
      ]);
      const result2 = await testUtils.pkStdio(commands2, {}, dataDir);
      expect(result2.exitCode).toBe(0);
      expect(result2.stdout).toContain('success');
      expect(result2.stdout).toContain('true');
      expect(result2.stdout).toContain('message');
      expect(result2.stdout).toContain('Node is Active');
    });
  });
  describe('commandFindNode', () => {
    test('Should find an online node', async () => {
      const commands = genCommands(['find', remoteOnlineNodeId]);
      const result = await testUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Found node at');
      expect(result.stdout).toContain(remoteOnlineHost);
      expect(result.stdout).toContain(remoteOnlinePort);

      // Checking json format.
      const commands2 = genCommands([
        'find',
        remoteOnlineNodeId,
        '--format',
        'json',
      ]);
      const result2 = await testUtils.pkStdio(commands2, {}, dataDir);
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
      expect(result2.stdout).toContain(remoteOnlineNodeId);
    });
    test('Should find an offline node', async () => {
      const commands = genCommands(['find', remoteOfflineNodeId]);
      const result = await testUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Found node at');
      expect(result.stdout).toContain(remoteOfflineHost);
      expect(result.stdout).toContain(remoteOfflinePort);

      // Checking json format.
      const commands2 = genCommands([
        'find',
        remoteOfflineNodeId,
        '--format',
        'json',
      ]);
      const result2 = await testUtils.pkStdio(commands2, {}, dataDir);
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
      expect(result2.stdout).toContain(remoteOfflineNodeId);
    });
    test(
      'Should fail to find an unknown node',
      async () => {
        const unknownNodeId = nodeId2;
        const commands = genCommands(['find', unknownNodeId]);
        const result = await testUtils.pkStdio(commands, {}, dataDir);
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain(`Failed to find node ${unknownNodeId}`);

        // Checking json format.
        const commands2 = genCommands([
          'find',
          unknownNodeId,
          '--format',
          'json',
        ]);
        const result2 = await testUtils.pkStdio(commands2, {}, dataDir);
        expect(result2.exitCode).toBe(1);
        expect(result2.stdout).toContain(`message`);
        expect(result2.stdout).toContain(
          `Failed to find node ${unknownNodeId}`,
        );
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
  describe('commandAddNode', () => {
    const validNodeId = nodeId3;
    const invalidNodeId = 'INVALIDID' as NodeId;
    const validHost = '0.0.0.0';
    const invalidHost = 'INVALIDHOST';
    const port = 55555;
    afterEach(async () => {
      await polykeyAgent.nodeManager.clearDB();
    });
    afterAll(async () => {
      // Restore removed nodes
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, remoteOnline);
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, remoteOffline);
    });
    test('Should add the node', async () => {
      const commands = genCommands([
        'add',
        validNodeId,
        validHost,
        port.toString(),
      ]);
      const result = await testUtils.pkStdio(commands, {}, dataDir);
      expect(result.exitCode).toBe(0);

      // Checking if node was added.
      const res = await polykeyAgent.nodeManager.getNode(validNodeId);
      expect(res).toBeTruthy();
      expect(res!.ip).toEqual(validHost);
      expect(res!.port).toEqual(port);
    });
    test(
      'Should fail to add the node (invalid node ID)',
      async () => {
        const commands = genCommands([
          'add',
          invalidNodeId,
          validHost,
          port.toString(),
        ]);
        const result = await testUtils.pkStdio(commands, {}, dataDir);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain('Invalid node ID.');
      },
      global.failedConnectionTimeout,
    );
    test(
      'Should fail to add the node (invalid IP address)',
      async () => {
        const commands = genCommands([
          'add',
          validNodeId,
          invalidHost,
          port.toString(),
        ]);
        const result = await testUtils.pkStdio(commands, {}, dataDir);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain('Invalid IP address.');

        // Checking if node was added.
        const res = await polykeyAgent.nodeManager.getNode(validNodeId);
        expect(res).toBeUndefined();
      },
      global.failedConnectionTimeout,
    );
  });
});
