import type { NodeId, NodeAddress } from '@/nodes/types';
import type { Host, Port } from '@/network/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as testUtils from './utils';
import * as testKeynodeUtils from '../utils';
import { makeNodeId } from '@/nodes/utils';

/**
 * This test file has been optimised to use only one instance of PolykeyAgent where posible.
 * Setting up the PolykeyAgent has been done in a beforeAll block.
 * Keep this in mind when adding or editing tests.
 * Any side effects need to be undone when the test has completed.
 * Preferably within a `afterEach()` since any cleanup will be skipped inside a failing test.
 *
 * - left over state can cause a test to fail in certain cases.
 * - left over state can cause similar tests to succeed when they should fail.
 * - starting or stopping the agent within tests should be done on a new instance of the polykey agent.
 * - when in doubt test each modified or added test on it's own as well as the whole file.
 * - Looking into adding a way to safely clear each domain's DB information with out breaking modules.
 */
describe('CLI Nodes', () => {
  const logger = new Logger('pkWithStdio Test', LogLevel.WARN, [
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

  // helper functions
  function genCommands(options: Array<string>) {
    return ['node', ...options, '-np', nodePath];
  }

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = new PolykeyAgent({
      nodePath: nodePath,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
    });
    keynodeId = polykeyAgent.nodes.getNodeId();

    // Setting up a remote keynode
    remoteOnline = await testKeynodeUtils.setupRemoteKeynode({
      logger,
    });
    remoteOnlineNodeId = remoteOnline.nodes.getNodeId();
    remoteOnlineHost = remoteOnline.revProxy.getIngressHost();
    remoteOnlinePort = remoteOnline.revProxy.getIngressPort();
    await testKeynodeUtils.addRemoteDetails(polykeyAgent, remoteOnline);

    // Setting up an offline remote keynode
    remoteOffline = await testKeynodeUtils.setupRemoteKeynode({
      logger,
    });
    remoteOfflineNodeId = remoteOffline.nodes.getNodeId();
    remoteOfflineHost = remoteOffline.revProxy.getIngressHost();
    remoteOfflinePort = remoteOffline.revProxy.getIngressPort();
    await testKeynodeUtils.addRemoteDetails(polykeyAgent, remoteOffline);
    await remoteOffline.stop();

    // Authorize session
    await testUtils.pk([
      'agent',
      'unlock',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
  }, global.polykeyStartupTimeout * 3);
  afterAll(async () => {
    await polykeyAgent.stop();
    await testKeynodeUtils.cleanupRemoteKeynode(remoteOnline);
    await testKeynodeUtils.cleanupRemoteKeynode(remoteOffline);
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  describe('commandClaimNode', () => {
    beforeAll(async () => {
      await remoteOnline.nodes.setNode(keynodeId, {
        ip: polykeyAgent.revProxy.getIngressHost(),
        port: polykeyAgent.revProxy.getIngressPort(),
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
      await polykeyAgent.notifications.clearNotifications();
      await remoteOnline.notifications.clearNotifications();
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
      await remoteOnline.nodes.clearDB();
    });
    test('Should send a gestalt invite', async () => {
      const commands = genCommands(['claim', remoteOnlineNodeId]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.
      expect(result.stdout).toContain('Gestalt Invite');
      expect(result.stdout).toContain(remoteOnlineNodeId);
    });
    test('Should send a gestalt invite (force invite)', async () => {
      await remoteOnline.notifications.sendNotification(keynodeId, {
        type: 'GestaltInvite',
      });
      const commands = genCommands([
        'claim',
        remoteOnlineNodeId,
        '--force-invite',
      ]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.
      expect(result.stdout).toContain('Gestalt Invite');
      expect(result.stdout).toContain(remoteOnlineNodeId);
    });
    test('Should claim remote node', async () => {
      await remoteOnline.notifications.sendNotification(keynodeId, {
        type: 'GestaltInvite',
      });
      const commands = genCommands(['claim', remoteOnlineNodeId]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.
      expect(result.stdout).toContain('cryptolink claim');
      expect(result.stdout).toContain(remoteOnlineNodeId);
    });
  });
  describe('commandPingNode', () => {
    test(
      'Should return failure when pinging an offline node',
      async () => {
        const commands = genCommands(['ping', remoteOfflineNodeId]);
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).toBe(1); // Should fail with no response. for automation purposes.
        expect(result.stdout).toContain('No response received');

        //checking for json output
        const commands2 = genCommands([
          'ping',
          remoteOfflineNodeId,
          '--format',
          'json',
        ]);
        const result2 = await testUtils.pkWithStdio(commands2);
        expect(result2.code).toBe(1); // Should fail with no response. for automation purposes.
        expect(result2.stdout).toContain('No response received');
      },
      global.failedConnectionTimeout,
    );
    test(
      "Should return failure if can't find the node",
      async () => {
        const fakeNodeId = makeNodeId('FakeNodeId' + 'A'.repeat(34));
        const commands = genCommands(['ping', fakeNodeId]);
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).not.toBe(0); // Should fail if node doesn't exist.
        expect(result.stdout).toContain('Failed to resolve node ID');

        //Json format.
        const commands2 = genCommands([
          'ping',
          fakeNodeId,
          '--format',
          'json',
        ]);
        const result2 = await testUtils.pkWithStdio(commands2);
        expect(result2.code).not.toBe(0); // Should fail if node doesn't exist.
        expect(result2.stdout).toContain('success');
        expect(result2.stdout).toContain('false');
        expect(result2.stdout).toContain('message');
        expect(result2.stdout).toContain('Failed to resolve node ID');
      },
      global.failedConnectionTimeout,
    );
    test('Should return success when pinging a live node', async () => {
      const commands = genCommands(['ping', remoteOnlineNodeId]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Node is Active.');

      //Checking for Json output.
      const commands2 = genCommands([
        'ping',
        remoteOnlineNodeId,
        '--format',
        'json',
      ]);
      const result2 = await testUtils.pkWithStdio(commands2);
      expect(result2.code).toBe(0);
      expect(result2.stdout).toContain('success');
      expect(result2.stdout).toContain('true');
      expect(result2.stdout).toContain('message');
      expect(result2.stdout).toContain('Node is Active');
    });
  });
  describe('commandFindNode', () => {
    test('Should find an online node', async () => {
      const commands = genCommands(['find', remoteOnlineNodeId]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);
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
      const result2 = await testUtils.pkWithStdio(commands2);
      expect(result2.code).toBe(0);
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
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);
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
      const result2 = await testUtils.pkWithStdio(commands2);
      expect(result2.code).toBe(0);
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
        const unknownNodeId = makeNodeId('A'.repeat(44));
        const commands = genCommands(['find', unknownNodeId]);
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).toBe(1);
        expect(result.stdout).toContain(`Failed to find node ${unknownNodeId}`);

        //Checking json format.
        const commands2 = genCommands([
          'find',
          unknownNodeId,
          '--format',
          'json',
        ]);
        const result2 = await testUtils.pkWithStdio(commands2);
        expect(result2.code).toBe(1);
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
      global.failedConnectionTimeout,
    );
  });
  describe('commandAddNode', () => {
    const validNodeId = makeNodeId('A'.repeat(44));
    const invalidNodeId = 'INVALIDID' as NodeId;
    const validHost = '0.0.0.0';
    const invalidHost = 'INVALIDHOST';
    const port = 55555;
    afterEach(async () => {
      await polykeyAgent.nodes.clearDB();
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
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Added node.');

      //Checking if node was added.
      const res = await polykeyAgent.nodes.getNode(validNodeId);
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
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).not.toBe(0);
        expect(result.stdout).toContain('Invalid node ID.');

        // Checking if node was added.
        const res = await polykeyAgent.nodes.getNode(invalidNodeId);
        expect(res).toBeUndefined();
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
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).not.toBe(0);
        expect(result.stdout).toContain('Invalid IP address.');

        //Checking if node was added.
        const res = await polykeyAgent.nodes.getNode(validNodeId);
        expect(res).toBeUndefined();
      },
      global.failedConnectionTimeout,
    );
  });
});
