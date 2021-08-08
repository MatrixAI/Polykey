import type { NodeId, NodeInfo } from '@/nodes/types';
import * as testUtils from './utils';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import * as utils from './utils';
import * as testKeynodeUtils from '../utils';

const logger = new Logger('pkWithStdio Test', LogLevel.WARN, [
  new StreamHandler(),
]);
let dataDir: string;
let nodePath: string;
let passwordFile: string;
let polykeyAgent: PolykeyAgent;
let remote: PolykeyAgent;
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
const node3: NodeInfo = {
  id: ('A'.repeat(43) + '=') as NodeId,
  chain: {},
};
const invaldNode: NodeInfo = {
  id: 'invalid' as NodeId,
  chain: {},
};

const noJWTFailCode = 77;

function genCommands(options: Array<string>) {
  return ['node', ...options, '-np', nodePath];
}

describe('CLI Nodes', () => {
  beforeEach(async () => {
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
      dataDir,
    });
    remoteNode.id = remote.nodes.getNodeId();

    // Authorize session
    await utils.pk([
      'agent',
      'unlock',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
  });
  afterEach(async () => {
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
  describe('commandGetNode', () => {
    test('Should get a node by nodeId.', async () => {
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, remote);

      const commands = genCommands(['get', remoteNode.id]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);
      const details = await polykeyAgent.nodes.requestNodeDetails(
        remoteNode.id,
      );
      expect(result.stdout).toContain(details.id);
      expect(result.stdout).toContain(details.address);
      expect(result.stdout).toContain(details.publicKey);
    }, 40000);
    test(
      'Should get the local node.',
      async () => {
        const commands = genCommands(['get']);
        const result = await testUtils.pkWithStdio(commands);
        expect(result.code).toBe(0); //Succeeds.
        const details = polykeyAgent.nodes.getNodeDetails();
        expect(result.stdout).toContain(details.id);
        expect(result.stdout).toContain(details.address);
        expect(result.stdout).toContain(details.publicKey);
      },
      global.defaultTimeout * 3,
    );
  });
  describe('commandPingNode', () => {
    test('Should return success with live node.', async () => {
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, remote);

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
    }, 40000);
    test('Should return failure with offline node.', async () => {
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, remote);
      await remote.stop();

      const commands = genCommands(['ping', remoteNode.id]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(1); // Should fail with no response. for automation purposes.
      expect(result.stdout).toContain('No response received');

      //checking for json output
      const commands2 = genCommands([
        'ping',
        remoteNode.id,
        '--format',
        'json',
      ]);
      const result2 = await testUtils.pkWithStdio(commands2);
      expect(result2.code).toBe(1); // Should fail with no response. for automation purposes.
      expect(result2.stdout).toContain('No response received');
    }, 80000);
    test("Should fail if can't find the node.", async () => {
      await testKeynodeUtils.addRemoteDetails(polykeyAgent, remote);

      const commands = genCommands(['ping', node3.id]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).not.toBe(0); // Should fail if node doesn't exist.
      expect(result.stdout).toContain('Failed to resolve node ID');

      //Json format.
      const commands2 = genCommands(['ping', node3.id, '--format', 'json']);
      const result2 = await testUtils.pkWithStdio(commands2);
      expect(result2.code).not.toBe(0); // Should fail if node doesn't exist.
      expect(result2.stdout).toContain('success');
      expect(result2.stdout).toContain('false');
      expect(result2.stdout).toContain('message');
      expect(result2.stdout).toContain('Failed to resolve node ID');
    });
  });
  describe('commandAddNode', () => {
    test('Should add the node.', async () => {
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
    }, 40000);
    test.only('Should fail to add the node (invalid node ID).', async () => {
      const host = '0.0.0.0';
      const port = 55555;
      const commands = genCommands(['add', node1.id, host, port.toString()]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).not.toBe(0);
      expect(result.stdout).toContain('Invalid node ID.');

      //Checking if node was added.
      const res = await polykeyAgent.nodes.getNode(node1.id);
      expect(res).toBeUndefined();
    });
    test.only('Should fail to add the node (invalid IP address).', async () => {
      const host = '0';
      const port = 55555;
      const commands = genCommands(['add', node3.id, host, port.toString()]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).not.toBe(0);
      expect(result.stdout).toContain('Invalid IP address.');

      //Checking if node was added.
      const res = await polykeyAgent.nodes.getNode(node3.id);
      expect(res).toBeUndefined();
    });
  });
  describe('commandFindNode', () => {
    test(
      'Should find the node',
      async () => {
        //adding node information.
        await testKeynodeUtils.addRemoteDetails(polykeyAgent, remote);
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
      },
      global.defaultTimeout * 3,
    );
    test(
      'Should not find an offline node',
      async () => {
        //adding node information.
        await testKeynodeUtils.addRemoteDetails(polykeyAgent, remote);

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
      global.defaultTimeout * 5,
    );
  });
  describe('Should fail when', () => {
    test(
      'Session is not running.',
      async () => {
        // Authorize session
        await utils.pk(['agent', 'lock', '-np', nodePath]);
        let result;

        // result = await testUtils.pkWithStdio(genCommands(['claim', node1.id]));
        // expect(result.code).toBe(noJWTFailCode);

        result = await testUtils.pkWithStdio(genCommands(['get']));
        expect(result.code).toBe(noJWTFailCode);

        result = await testUtils.pkWithStdio(genCommands(['ping', node1.id]));
        expect(result.code).toBe(noJWTFailCode);

        result = await testUtils.pkWithStdio(
          genCommands(['add', node3.id, '0.0.0.0', '55555']),
        );
        expect(result.code).toBe(noJWTFailCode);

        result = await testUtils.pkWithStdio(
          genCommands(['find', remoteNode.id]),
        );
        expect(result.code).toBe(noJWTFailCode);
      },
      global.defaultTimeout * 5,
    );
  });
});
