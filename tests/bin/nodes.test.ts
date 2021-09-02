import type { NodeId, NodeInfo } from '@/nodes/types';
import * as testUtils from './utils';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utils from './utils';
import * as testKeynodeUtils from '../utils';
import { sleep } from '@/utils';

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
  let remote: PolykeyAgent;
  let remoteOffline: PolykeyAgent;

  // constants
  const node1: NodeInfo = {
    id: '123' as NodeId,
    chain: {},
  };
  const keynode: NodeInfo = {
    id: '123' as NodeId,
    chain: {},
  };
  const remoteNode: NodeInfo = {
    id: '456' as NodeId,
    chain: {},
  };
  const remoteNodeOffline: NodeInfo = {
    id: '789' as NodeId,
    chain: {},
  };
  const node2: NodeInfo = {
    id: ('B'.repeat(43) + '=') as NodeId,
    chain: {},
  };
  const node3: NodeInfo = {
    id: ('A'.repeat(43) + '=') as NodeId,
    chain: {},
  };
  const invaldNode: NodeInfo = {
    id: 'invalid' as NodeId,
    chain: {},
  };
  const noJWTFailCode = 77;

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
    keynode.id = polykeyAgent.nodes.getNodeId();

    //Creating a remote node.
    remote = await testKeynodeUtils.setupRemoteKeynode({
      logger,
    });
    remoteNode.id = remote.nodes.getNodeId();
    await testKeynodeUtils.addRemoteDetails(polykeyAgent, remote);

    //creating offline remote node.
    remoteOffline = await testKeynodeUtils.setupRemoteKeynode({
      logger,
    });
    remoteNodeOffline.id = remoteOffline.nodes.getNodeId();
    await testKeynodeUtils.addRemoteDetails(polykeyAgent, remoteOffline);
    await remoteOffline.stop();

    // Authorize session
    await utils.pk([
      'agent',
      'unlock',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
  }, global.polykeyStartupTimeout * 2);
  afterAll(async () => {
    await polykeyAgent.stop();
    await remote.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  // Not supported for now, commented out for later use.
  // describe('commandClaimNode', () => {
  //   test('Should claim a node.', async () => {
  //     const commands = genCommands(['claim', remoteNode.id]);
  //     const result = await testUtils.pkWithStdio(commands);
  //     expect(result.code).toBe(0); //Succeeds.
  //     fail("finish test.");
  //   });
  // });
  describe('commandPingNode', () => {
    test(
      'Should return failure when pinging an offline node',
      async () => {
        const commands = genCommands(['ping', remoteNodeOffline.id]);
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).toBe(1); // Should fail with no response. for automation purposes.
        expect(result.stdout).toContain('No response received');

        //checking for json output
        const commands2 = genCommands([
          'ping',
          remoteNodeOffline.id,
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
        const commands = genCommands(['ping', 'FakeNodeId']);
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).not.toBe(0); // Should fail if node doesn't exist.
        expect(result.stdout).toContain('Failed to resolve node ID');

        //Json format.
        const commands2 = genCommands([
          'ping',
          'FakeNodeID',
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
      global.failedConnectionTimeout * 2,
    );
    test('Should return success when pinging a live node', async () => {
      const commands = genCommands(['ping', remoteNode.id]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Node is Active.');

      //Checking for Json output.
      const commands2 = genCommands([
        'ping',
        remoteNode.id,
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
      //adding node information.
      const remoteHost = remote.revProxy.getIngressHost();
      const remotePort = remote.revProxy.getIngressPort();

      const commands = genCommands(['find', remoteNode.id]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Found node at');
      expect(result.stdout).toContain(remoteHost);
      expect(result.stdout).toContain(remotePort);

      // Checking json format.
      const commands2 = genCommands([
        'find',
        remoteNode.id,
        '--format',
        'json',
      ]);
      const result2 = await testUtils.pkWithStdio(commands2);
      expect(result2.code).toBe(0);
      expect(result2.stdout).toContain('success');
      expect(result2.stdout).toContain('true');
      expect(result2.stdout).toContain('message');
      expect(result2.stdout).toContain(
        `Found node at ${remoteHost}:${remotePort}`,
      );
      expect(result2.stdout).toContain('host');
      expect(result2.stdout).toContain('port');
      expect(result2.stdout).toContain('id');
      expect(result2.stdout).toContain(remoteNode.id);
    });
    test(
      'Should fail to find an offline node',
      async () => {
        const commands = genCommands(['find', node3.id]);
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).toBe(1);
        expect(result.stdout).toContain(`Failed to find node ${node3.id}`);

        //Checking json format.
        const commands2 = genCommands(['find', node3.id, '--format', 'json']);
        const result2 = await testUtils.pkWithStdio(commands2);
        expect(result2.code).toBe(1);
        expect(result2.stdout).toContain(`message`);
        expect(result2.stdout).toContain(`Failed to find node ${node3.id}`);
        expect(result2.stdout).toContain('id');
        expect(result2.stdout).toContain(node3.id);
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
    test('Should add the node', async () => {
      const host = '0.0.0.0';
      const port = 55555;
      const commands = genCommands(['add', node3.id, host, port.toString()]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Added node.');

      //Checking if node was added.
      const res = await polykeyAgent.nodes.getNode(node3.id);
      expect(res).toBeTruthy();
      expect(res!.ip).toEqual(host);
      expect(res!.port).toEqual(port);
      await sleep(100);
    });
    test(
      'Should fail to add the node (invalid node ID)',
      async () => {
        const host = '0.0.0.0';
        const port = 55555;
        const invalidId = 'INVALIDID' as NodeId;
        const commands = genCommands(['add', invalidId, host, port.toString()]);
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).not.toBe(0);
        expect(result.stdout).toContain('Invalid node ID.');

        // Checking if node was added.
        const res = await polykeyAgent.nodes.getNode(invalidId);
        expect(res).toBeUndefined();
      },
      global.failedConnectionTimeout,
    );
    test(
      'Should fail to add the node (invalid IP address)',
      async () => {
        const host = 'asdfghdsgh';
        const port = 55555;
        const commands = genCommands(['add', node2.id, host, port.toString()]);
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).not.toBe(0);
        expect(result.stdout).toContain('Invalid IP address.');

        //Checking if node was added.
        const res = await polykeyAgent.nodes.getNode(node2.id);
        expect(res).toBeUndefined();
      },
      global.failedConnectionTimeout,
    );
  });
});
