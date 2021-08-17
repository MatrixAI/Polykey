import type { NodeId, NodeInfo } from '@/nodes/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import { NodeAddress } from '@/nodes/types';
import * as utils from './utils';

const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
let dataDir: string;
let passwordFile: string;
let polykeyAgent: PolykeyAgent;
let command: Array<string>;
const jwtTokenExitCode = 77;
const node1: NodeInfo = {
  id: '123' as NodeId,
  chain: {},
};
const node2: NodeInfo = {
  id: '456' as NodeId,
  chain: {},
};
const node3: NodeInfo = {
  id: '789' as NodeId,
  chain: {},
};

describe('CLI vaults', () => {
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
    });
    await polykeyAgent.gestalts.setNode(node1);
    await polykeyAgent.gestalts.setNode(node2);
    await polykeyAgent.gestalts.setNode(node3);

    // Authorize session
    await utils.pk([
      'agent',
      'unlock',
      '-np',
      dataDir,
      '--password-file',
      passwordFile,
    ]);
    command = [];
  });

  afterEach(async () => {
    // Lock Client
    await utils.pk(['agent', 'lock', '-np', dataDir]);
    // Perform call
    const result = await utils.pk(command);
    expect(result).toBe(jwtTokenExitCode);

    await polykeyAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  describe('commandListVaults', () => {
    test('shoud list vaults', async () => {
      command = ['vaults', 'list', '-np', dataDir];
      await polykeyAgent.vaults.createVault('Vault1');
      await polykeyAgent.vaults.createVault('Vault2');

      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });
  describe('commandCreateVaults', () => {
    test('should create vaults', async () => {
      command = ['vaults', 'create', '-np', dataDir, '-vn', 'MyTestVault'];
      const result = await utils.pk([...command]);
      expect(result).toBe(0);
      const result2 = await utils.pk([
        'vaults',
        'touch',
        '-np',
        dataDir,
        '-vn',
        'MyTestVault2',
      ]);
      expect(result2).toBe(0);

      const vaults = (await polykeyAgent.vaults.listVaults()).map(
        (vault) => vault,
      );
      expect(vaults[0].name).toBe('MyTestVault');
      expect(vaults[1].name).toBe('MyTestVault2');
    });
  });
  describe('commandRenameVault', () => {
    test('should rename vault', async () => {
      command = [
        'vaults',
        'rename',
        '-vn',
        'Vault1',
        '-nn',
        'RenamedVault',
        '-np',
        dataDir,
      ];
      await polykeyAgent.vaults.createVault('Vault1');
      const id = polykeyAgent.vaults.getVaultId('Vault1');
      expect(id).toBeTruthy();

      const result = await utils.pk([...command]);
      expect(result).toBe(0);

      const list = (await polykeyAgent.vaults.listVaults()).map(
        (vault) => vault,
      );
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('RenamedVault');
    });
    test('should fail to rename non-existent vault', async () => {
      command = [
        'vaults',
        'rename',
        '-vn',
        'InvalidVaultId', // vault does not exist
        '-nn',
        'RenamedVault',
        '-np',
        dataDir,
      ];
      await polykeyAgent.vaults.createVault('Vault1');
      const id = polykeyAgent.vaults.getVaultId('Vault1');
      expect(id).toBeTruthy();

      const result = await utils.pk([...command]);
      // Exit code of the exception
      expect(result).toBe(10);
      const list = (await polykeyAgent.vaults.listVaults()).map(
        (vault) => vault,
      );
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('Vault1');
    });
  });
  describe('commandDeleteVault', () => {
    test('should delete vault', async () => {
      command = ['vaults', 'delete', '-np', dataDir, '-vn', 'Vault1'];
      await polykeyAgent.vaults.createVault('Vault1');
      let id = polykeyAgent.vaults.getVaultId('Vault1');
      expect(id).toBeTruthy();

      id = polykeyAgent.vaults.getVaultId('Vault1');
      expect(id).toBeTruthy();

      const result2 = await utils.pk([...command]);
      expect(result2).toBe(0);

      const list = (await polykeyAgent.vaults.listVaults()).map(
        (vault) => vault,
      );
      expect(list.length).toBe(0);
    });
  });
  describe('commandVaultStats', () => {
    test('should return the stats of a vault', async () => {
      command = ['vaults', 'stat', '-np', dataDir, '-vn', 'Vault1'];
      await polykeyAgent.vaults.createVault('Vault1');
      const id = polykeyAgent.vaults.getVaultId('Vault1');
      expect(id).toBeTruthy();

      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });
  describe('commandSetPermsVault', () => {
    test('should share a vault', async () => {
      command = ['vaults', 'share', '-np', dataDir, 'Vault1', node1.id];
      await polykeyAgent.vaults.createVault('Vault1');
      const id = await polykeyAgent.vaults.getVaultId('Vault1');
      expect(id).toBeTruthy();

      const result = await utils.pk([...command]);
      expect(result).toBe(0);
      const sharedNodes = await polykeyAgent.vaults.getVaultPermissions(
        id!,
        undefined,
      );
      const sharedNodesString = JSON.stringify(sharedNodes);
      expect(sharedNodesString).toContain(node1.id);
      expect(sharedNodesString).not.toContain(node2.id);
    });
  });
  describe('commandUnsetPermsVault', () => {
    test('should unshare a vault', async () => {
      command = ['vaults', 'unshare', '-np', dataDir, 'Vault1', node1.id];
      //creating vault.
      await polykeyAgent.vaults.createVault('Vault1');
      const id = await polykeyAgent.vaults.getVaultId('Vault1');
      expect(id).toBeTruthy();

      //init sharing.
      await polykeyAgent.vaults.setVaultPermissions(node1.id, id!);
      await polykeyAgent.vaults.setVaultPermissions(node2.id, id!);
      await polykeyAgent.vaults.setVaultPermissions(node3.id, id!);

      const result = await utils.pk([...command]);
      expect(result).toBe(0);
      const sharedNodes = await polykeyAgent.vaults.getVaultPermissions(
        id!,
        undefined,
      );
      expect(sharedNodes[node1.id]['pull']).toBeUndefined();
      expect(sharedNodes[node2.id]['pull']).toBeNull();
      expect(sharedNodes[node3.id]['pull']).toBeNull();
    });
  });

  describe('commandVaultPermissions', () => {
    test('should get permissions of a vault', async () => {
      command = ['vaults', 'perms', '-np', dataDir, 'vault1'];

      const vault = await polykeyAgent.vaults.createVault('Vault1');
      const id = await polykeyAgent.vaults.getVaultId('Vault1');
      expect(id).toBeTruthy();
      await polykeyAgent.vaults.setVaultPermissions(
        '123' as NodeId,
        vault.vaultId,
      );
      await polykeyAgent.vaults.setVaultPermissions(
        '456' as NodeId,
        vault.vaultId,
      );
      await polykeyAgent.vaults.setVaultPermissions(
        '789' as NodeId,
        vault.vaultId,
      );

      await polykeyAgent.vaults.unsetVaultPermissions(
        '456' as NodeId,
        vault.vaultId,
      );

      const result = await utils.pk([...command]);
      expect(result).toBe(0);
    });
  });

  describe('commandPullVault', () => {
    test('should clone a vault', async () => {
      const dataDir2 = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      const targetPolykeyAgent = new PolykeyAgent({
        nodePath: dataDir2,
        logger: logger,
      });
      await targetPolykeyAgent.start({
        password: 'password',
      });
      const vault = await targetPolykeyAgent.vaults.createVault('Vault1');
      const id = await targetPolykeyAgent.vaults.getVaultId('Vault1');
      expect(id).toBeTruthy();

      await targetPolykeyAgent.gestalts.setNode({
        id: polykeyAgent.nodes.getNodeId(),
        chain: {},
      });
      await targetPolykeyAgent.vaults.setVaultPermissions(
        polykeyAgent.nodes.getNodeId(),
        vault.vaultId,
      );

      const targetNodeId = targetPolykeyAgent.nodes.getNodeId();
      const targetHost = targetPolykeyAgent.revProxy.getIngressHost();
      const targetPort = targetPolykeyAgent.revProxy.getIngressPort();
      await polykeyAgent.nodes.setNode(targetNodeId, {
        ip: targetHost,
        port: targetPort,
      });
      // Client agent: Start sending hole-punching packets to the target
      await polykeyAgent.nodes.createConnectionToNode(targetNodeId, {
        ip: targetHost,
        port: targetPort,
      } as NodeAddress);
      const clientEgressHost = polykeyAgent.fwdProxy.getEgressHost();
      const clientEgressPort = polykeyAgent.fwdProxy.getEgressPort();
      // Server agent: start sending hole-punching packets back to the 'client'
      // agent (in order to establish a connection)
      await targetPolykeyAgent.nodes.openConnection(
        clientEgressHost,
        clientEgressPort,
      );

      command = [
        'vaults',
        'clone',
        '-np',
        dataDir,
        '-ni',
        targetNodeId as string,
        '-vi',
        vault.vaultId,
      ];

      // Vault does not exist on the source PolykeyAgent so the pull command throws an error which
      // caught, the error is checked and if it is ErrorVaultUndefined, then the Agent attempts a
      // clone instead
      const result = await utils.pk([...command]);
      expect(result).toBe(0);

      const list = (await polykeyAgent.vaults.listVaults()).map(
        (vault) => vault,
      );
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('Vault1');

      await targetPolykeyAgent.stop();
      await fs.promises.rm(dataDir2, {
        force: true,
        recursive: true,
      });
    }, 20000);
    test('should pull a vault', async () => {
      const dataDir2 = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      const targetPolykeyAgent = new PolykeyAgent({
        nodePath: dataDir2,
        logger: logger,
      });
      await targetPolykeyAgent.start({
        password: 'password',
      });
      const vault = await targetPolykeyAgent.vaults.createVault('Vault1');

      const id = await targetPolykeyAgent.vaults.getVaultId('Vault1');
      expect(id).toBeTruthy();

      await targetPolykeyAgent.gestalts.setNode({
        id: polykeyAgent.nodes.getNodeId(),
        chain: {},
      });
      await targetPolykeyAgent.vaults.setVaultPermissions(
        polykeyAgent.nodes.getNodeId(),
        vault.vaultId,
      );

      const targetNodeId = targetPolykeyAgent.nodes.getNodeId();
      const targetHost = targetPolykeyAgent.revProxy.getIngressHost();
      const targetPort = targetPolykeyAgent.revProxy.getIngressPort();
      await polykeyAgent.nodes.setNode(targetNodeId, {
        ip: targetHost,
        port: targetPort,
      });
      // Client agent: Start sending hole-punching packets to the target
      await polykeyAgent.nodes.createConnectionToNode(targetNodeId, {
        ip: targetHost,
        port: targetPort,
      } as NodeAddress);
      const clientEgressHost = polykeyAgent.fwdProxy.getEgressHost();
      const clientEgressPort = polykeyAgent.fwdProxy.getEgressPort();
      // Server agent: start sending hole-punching packets back to the 'client'
      // agent (in order to establish a connection)
      await targetPolykeyAgent.nodes.openConnection(
        clientEgressHost,
        clientEgressPort,
      );
      await polykeyAgent.vaults.cloneVault(vault.vaultId, targetNodeId);

      await vault.addSecret('MySecret', 'This secret will be pulled');

      const list = (await polykeyAgent.vaults.listVaults()).map(
        (vault) => vault,
      );
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('Vault1');
      const clonedVault = await polykeyAgent.vaults.getVault(list[0].id);
      await expect(clonedVault.listSecrets()).resolves.toStrictEqual([]);

      command = [
        'vaults',
        'pull',
        '-np',
        dataDir,
        '-vn',
        'Vault1',
        '-ni',
        targetNodeId,
      ];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);

      await expect(clonedVault.listSecrets()).resolves.toStrictEqual([
        'MySecret',
      ]);
      await expect(clonedVault.getSecret('MySecret')).resolves.toStrictEqual(
        'This secret will be pulled',
      );

      await targetPolykeyAgent.stop();
      await fs.promises.rm(dataDir2, { recursive: true });
    }, 20000);
  });
  describe('commandScanVault', () => {
    test('should scan a node for vaults', async () => {
      const dataDir2 = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      const targetPolykeyAgent = new PolykeyAgent({
        nodePath: dataDir2,
        logger: logger,
      });
      await targetPolykeyAgent.start({
        password: 'password',
      });

      const targetNodeId = targetPolykeyAgent.nodes.getNodeId();
      const targetHost = targetPolykeyAgent.revProxy.getIngressHost();
      const targetPort = targetPolykeyAgent.revProxy.getIngressPort();
      await polykeyAgent.nodes.setNode(targetNodeId, {
        ip: targetHost,
        port: targetPort,
      });
      // Client agent: Start sending hole-punching packets to the target
      await polykeyAgent.nodes.createConnectionToNode(targetNodeId, {
        ip: targetHost,
        port: targetPort,
      } as NodeAddress);
      const clientEgressHost = polykeyAgent.fwdProxy.getEgressHost();
      const clientEgressPort = polykeyAgent.fwdProxy.getEgressPort();
      // Server agent: start sending hole-punching packets back to the 'client'
      // agent (in order to establish a connection)
      await targetPolykeyAgent.nodes.openConnection(
        clientEgressHost,
        clientEgressPort,
      );

      await targetPolykeyAgent.vaults.createVault('Vault1');
      await targetPolykeyAgent.vaults.createVault('Vault2');
      await targetPolykeyAgent.vaults.createVault('Vault3');

      const targetVaults = (await targetPolykeyAgent.vaults.listVaults()).map(
        (vault) => vault,
      );
      expect(targetVaults.length).toBe(3);

      command = [
        'vaults',
        'scan',
        '-np',
        dataDir,
        '-ni',
        targetNodeId as string,
      ];

      const result = await utils.pk([...command]);
      expect(result).toBe(0);

      await targetPolykeyAgent.stop();
      await fs.promises.rmdir(dataDir2, { recursive: true });
    });
  });
});
