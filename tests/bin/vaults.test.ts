import type { NodeInfo } from '@/nodes/types';
import type { Vault, VaultName } from '@/vaults/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { makeNodeId } from '@/nodes/utils';
import { makeVaultIdPretty } from '@/vaults/utils';
import * as utils from './utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

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
describe('CLI vaults', () => {
  const password = 'password';
  const logger = new Logger('CLI Test', LogLevel.WARN, [new StreamHandler()]);
  let dataDir: string;
  let passwordFile: string;
  let polykeyAgent: PolykeyAgent;
  let command: Array<string>;
  let vaultNumber: number;
  let vaultName: VaultName;

  // Constants
  const nodeId1 = makeNodeId(
    'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
  );
  const nodeId2 = makeNodeId(
    'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg',
  );
  const nodeId3 = makeNodeId(
    'v359vgrgmqf1r5g4fvisiddjknjko6bmm4qv7646jr7fi9enbfuug',
  );

  const node1: NodeInfo = {
    id: nodeId1,
    chain: {},
  };
  const node2: NodeInfo = {
    id: nodeId2,
    chain: {},
  };
  const node3: NodeInfo = {
    id: nodeId3,
    chain: {},
  };

  // Helper functions
  function genVaultName() {
    vaultNumber++;
    return `vault-${vaultNumber}` as VaultName;
  }

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger: logger,
    });
    await polykeyAgent.gestaltGraph.setNode(node1);
    await polykeyAgent.gestaltGraph.setNode(node2);
    await polykeyAgent.gestaltGraph.setNode(node3);

    vaultNumber = 0;

    // Authorize session
    await utils.pkStdio(
      ['agent', 'unlock', '-np', dataDir, '--password-file', passwordFile],
      {},
      dataDir,
    );
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  beforeEach(async () => {
    vaultName = genVaultName();
    command = [];
  });

  describe('commandListVaults', () => {
    test('should list all vaults', async () => {
      command = ['vaults', 'list', '-np', dataDir];
      await polykeyAgent.vaultManager.createVault('Vault1' as VaultName);
      await polykeyAgent.vaultManager.createVault('Vault2' as VaultName);

      const result = await utils.pkStdio([...command]);
      expect(result.exitCode).toBe(0);
    });
  });
  describe('commandCreateVaults', () => {
    test('should create vaults', async () => {
      command = ['vaults', 'create', '-np', dataDir, 'MyTestVault'];
      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
      const result2 = await utils.pkStdio(
        ['vaults', 'touch', '-np', dataDir, 'MyTestVault2'],
        {},
        dataDir,
      );
      expect(result2.exitCode).toBe(0);

      const list = (await polykeyAgent.vaultManager.listVaults()).keys();
      const namesList: string[] = [];
      for await (const name of list) {
        namesList.push(name);
      }
      expect(namesList).toContain('MyTestVault');
      expect(namesList).toContain('MyTestVault2');
    });
  });
  describe('commandRenameVault', () => {
    test('should rename vault', async () => {
      command = ['vaults', 'rename', vaultName, 'RenamedVault', '-np', dataDir];
      await polykeyAgent.vaultManager.createVault(vaultName);
      const id = polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      const list = (await polykeyAgent.vaultManager.listVaults()).keys();
      const namesList: string[] = [];
      for await (const name of list) {
        namesList.push(name);
      }
      expect(namesList).toContain('RenamedVault');
    });
    test('should fail to rename non-existent vault', async () => {
      command = [
        'vaults',
        'rename',
        'InvalidVaultId', // Vault does not exist
        'RenamedVault',
        '-np',
        dataDir,
      ];
      await polykeyAgent.vaultManager.createVault(vaultName);
      const id = polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      const result = await utils.pkStdio([...command], {}, dataDir);
      // Exit code of the exception
      expect(result.exitCode).toBe(10);

      const list = (await polykeyAgent.vaultManager.listVaults()).keys();
      const namesList: string[] = [];
      for await (const name of list) {
        namesList.push(name);
      }
      expect(namesList).toContain(vaultName);
    });
  });
  describe('commandDeleteVault', () => {
    test('should delete vault', async () => {
      command = ['vaults', 'delete', '-np', dataDir, vaultName];
      await polykeyAgent.vaultManager.createVault(vaultName);
      let id = polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      id = polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      const result2 = await utils.pkStdio([...command], {}, dataDir);
      expect(result2.exitCode).toBe(0);

      const list = (await polykeyAgent.vaultManager.listVaults()).keys();
      const namesList: string[] = [];
      for await (const name of list) {
        namesList.push(name);
      }
      expect(namesList).not.toContain(vaultName);
    });
  });
  describe.skip('commandVaultStats', () => {
    test('should return the stats of a vault', async () => {
      command = ['vaults', 'stat', '-np', dataDir, vaultName];
      await polykeyAgent.vaultManager.createVault(vaultName);
      const id = polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
    });
  });
  describe.skip('commandSetPermsVault', () => {
    test('should share a vault', async () => {
      command = ['vaults', 'share', '-np', dataDir, vaultName, node1.id];
      await polykeyAgent.vaultManager.createVault(vaultName);
      const id = await polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
      fail();
      // FIXME methods not implemented.
      // const sharedNodes = await polykeyAgent.vaults.getVaultPermissions(
      //   id!,
      //   undefined,
      // );
      // const sharedNodesString = JSON.stringify(sharedNodes);
      // expect(sharedNodesString).toContain(node1.id);
      // expect(sharedNodesString).not.toContain(node2.id);
    });
  });
  describe.skip('commandUnsetPermsVault', () => {
    test('should un-share a vault', async () => {
      command = ['vaults', 'unshare', '-np', dataDir, vaultName, node1.id];
      // Creating vault.
      await polykeyAgent.vaultManager.createVault(vaultName);
      const id = await polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      // Init sharing.
      fail();
      // FIXME methods not implemented.
      // await polykeyAgent.vaults.setVaultPermissions(node1.id, id!);
      // await polykeyAgent.vaults.setVaultPermissions(node2.id, id!);
      // await polykeyAgent.vaults.setVaultPermissions(node3.id, id!);

      const result = await utils.pkStdio([...command]);
      expect(result.exitCode).toBe(0);
      // Const sharedNodes = await polykeyAgent.vaults.getVaultPermissions(
      //   id!,
      //   undefined,
      // );
      // expect(sharedNodes[node1.id]['pull']).toBeUndefined();
      // expect(sharedNodes[node2.id]['pull']).toBeNull();
      // expect(sharedNodes[node3.id]['pull']).toBeNull();
    });
  });
  describe.skip('commandVaultPermissions', () => {
    test('should get permissions of a vault', async () => {
      command = ['vaults', 'perms', '-np', dataDir, vaultName];

      await polykeyAgent.vaultManager.createVault(vaultName);
      const id = await polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      fail();
      // FIXME methods not implemented.
      // await polykeyAgent.vaults.setVaultPermissions(node1.id, vault.vaultId);
      // await polykeyAgent.vaults.setVaultPermissions(node2.id, vault.vaultId);
      // await polykeyAgent.vaults.setVaultPermissions(node3.id, vault.vaultId);

      // await polykeyAgent.vaults.unsetVaultPermissions(node2.id, vault.vaultId);

      const result = await utils.pkStdio([...command]);
      expect(result.exitCode).toBe(0);
    });
  });
  describe.skip('commandPullVault', () => {
    test(
      'should clone a vault',
      async () => {
        const dataDir2 = await fs.promises.mkdtemp(
          path.join(os.tmpdir(), 'polykey-test-'),
        );
        const targetPolykeyAgent = await PolykeyAgent.createPolykeyAgent({
          password,
          nodePath: dataDir2,
          logger: logger,
        });
        const vault = await targetPolykeyAgent.vaultManager.createVault(
          vaultName,
        );
        const id = await targetPolykeyAgent.vaultManager.getVaultId(vaultName);
        expect(id).toBeTruthy();

        await targetPolykeyAgent.gestaltGraph.setNode({
          id: polykeyAgent.nodeManager.getNodeId(),
          chain: {},
        });
        fail();
        // FIXME methods not implemented.
        // await targetPolykeyAgent.vaults.setVaultPermissions(
        //   polykeyAgent.nodes.getNodeId(),
        //   vault.vaultId,
        // );

        const targetNodeId = targetPolykeyAgent.nodeManager.getNodeId();
        const targetHost = targetPolykeyAgent.revProxy.ingressHost;
        const targetPort = targetPolykeyAgent.revProxy.ingressPort;
        await polykeyAgent.nodeManager.setNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        });
        // Client agent: Start sending hole-punching packets to the target
        await polykeyAgent.nodeManager.getConnectionToNode(targetNodeId);
        const clientEgressHost = polykeyAgent.fwdProxy.egressHost;
        const clientEgressPort = polykeyAgent.fwdProxy.egressPort;
        // Server agent: start sending hole-punching packets back to the 'client'
        // agent (in order to establish a connection)
        await targetPolykeyAgent.nodeManager.openConnection(
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
          makeVaultIdPretty(vault.vaultId),
        ];

        // Vault does not exist on the source PolykeyAgent so the pull command throws an error which
        // caught, the error is checked and if it is ErrorVaultUndefined, then the Agent attempts a
        // clone instead
        const result = await utils.pkStdio([...command]);
        expect(result.exitCode).toBe(0);

        // Const list = (await polykeyAgent.vaults.listVaults()).map(
        //   (vault) => vault,
        // );
        // expect(JSON.stringify(list)).toContain(vaultName);

        await targetPolykeyAgent.stop();
        await targetPolykeyAgent.destroy();
        await fs.promises.rm(dataDir2, {
          force: true,
          recursive: true,
        });
      },
      global.defaultTimeout * 2,
    );
    test(
      'should pull a vault',
      async () => {
        const dataDir2 = await fs.promises.mkdtemp(
          path.join(os.tmpdir(), 'polykey-test-'),
        );
        const targetPolykeyAgent = await PolykeyAgent.createPolykeyAgent({
          password,
          nodePath: dataDir2,
          logger: logger,
        });
        await targetPolykeyAgent.vaultManager.createVault(vaultName);

        const id = await targetPolykeyAgent.vaultManager.getVaultId(vaultName);
        expect(id).toBeTruthy();

        await targetPolykeyAgent.gestaltGraph.setNode({
          id: polykeyAgent.nodeManager.getNodeId(),
          chain: {},
        });
        fail();
        // FIXME methods not implemented.
        // await targetPolykeyAgent.vaults.setVaultPermissions(
        //   polykeyAgent.nodes.getNodeId(),
        //   vault.vaultId,
        // );

        const targetNodeId = targetPolykeyAgent.nodeManager.getNodeId();
        const targetHost = targetPolykeyAgent.revProxy.ingressHost;
        const targetPort = targetPolykeyAgent.revProxy.ingressPort;
        await polykeyAgent.nodeManager.setNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        });
        // Client agent: Start sending hole-punching packets to the target
        await polykeyAgent.nodeManager.getConnectionToNode(targetNodeId);
        const clientEgressHost = polykeyAgent.fwdProxy.egressHost;
        const clientEgressPort = polykeyAgent.fwdProxy.egressPort;
        // Server agent: start sending hole-punching packets back to the 'client'
        // agent (in order to establish a connection)
        await targetPolykeyAgent.nodeManager.openConnection(
          clientEgressHost,
          clientEgressPort,
        );
        // Await polykeyAgent.vaults.cloneVault(vault.vaultId, targetNodeId);

        // await vault.addSecret('MySecret', 'This secret will be pulled');

        // const list = (await polykeyAgent.vaults.listVaults()).map(
        //   (vault) => vault,
        // );
        // const filteredList = list.filter((value) => {
        //   return value.name === vaultName;
        // });
        // expect(filteredList.length).toBe(1);
        // const clonedVault = await polykeyAgent.vaults.getVault(
        //   filteredList[0].id,
        // );
        // await expect(clonedVault.listSecrets()).resolves.toStrictEqual([]);

        command = [
          'vaults',
          'pull',
          '-np',
          dataDir,
          '-vn',
          vaultName,
          '-ni',
          targetNodeId,
        ];

        const result = await utils.pkStdio([...command]);
        expect(result.exitCode).toBe(0);

        // Await expect(clonedVault.listSecrets()).resolves.toStrictEqual([
        //   'MySecret',
        // ]);
        // await expect(clonedVault.getSecret('MySecret')).resolves.toStrictEqual(
        //   'This secret will be pulled',
        // );

        await targetPolykeyAgent.stop();
        await targetPolykeyAgent.destroy();
        await fs.promises.rm(dataDir2, { recursive: true });
      },
      global.defaultTimeout * 2,
    );
  });
  describe.skip('commandScanVault', () => {
    test('should scan a node for vaults', async () => {
      const dataDir2 = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      const targetPolykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: dataDir2,
        logger: logger,
      });

      const targetNodeId = targetPolykeyAgent.nodeManager.getNodeId();
      const targetHost = targetPolykeyAgent.revProxy.ingressHost;
      const targetPort = targetPolykeyAgent.revProxy.ingressPort;
      await polykeyAgent.nodeManager.setNode(targetNodeId, {
        ip: targetHost,
        port: targetPort,
      });
      // Client agent: Start sending hole-punching packets to the target
      await polykeyAgent.nodeManager.getConnectionToNode(targetNodeId);
      const clientEgressHost = polykeyAgent.fwdProxy.egressHost;
      const clientEgressPort = polykeyAgent.fwdProxy.egressPort;
      // Server agent: start sending hole-punching packets back to the 'client'
      // agent (in order to establish a connection)
      await targetPolykeyAgent.nodeManager.openConnection(
        clientEgressHost,
        clientEgressPort,
      );

      await targetPolykeyAgent.vaultManager.createVault(
        `${vaultName}-Vault1` as VaultName,
      );
      await targetPolykeyAgent.vaultManager.createVault(
        `${vaultName}-Vault2` as VaultName,
      );
      await targetPolykeyAgent.vaultManager.createVault(
        `${vaultName}-Vault3` as VaultName,
      );

      const targetVaults = (
        await targetPolykeyAgent.vaultManager.listVaults()
      ).keys();
      const namesList: string[] = [];
      for await (const name of targetVaults) {
        namesList.push(name);
      }
      expect(namesList.length).toBe(3);

      command = [
        'vaults',
        'scan',
        '-np',
        dataDir,
        '-ni',
        targetNodeId as string,
      ];
      const result = await utils.pkStdio([...command]);
      expect(result.exitCode).toBe(0);

      await targetPolykeyAgent.stop();
      await targetPolykeyAgent.destroy();
      await fs.promises.rmdir(dataDir2, { recursive: true });
    });
  });
  describe('commandVaultVersion', () => {
    test('should switch the version of a vault', async () => {
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);
      const id = polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      const secret1 = { name: 'Secret-1', content: 'Secret-1-content' };
      const secret2 = { name: 'Secret-1', content: 'Secret-2-content' };

      await vault.commit(async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
      });
      const ver1Oid = (await vault.log(1))[0].oid;

      await vault.commit(async (efs) => {
        await efs.writeFile(secret2.name, secret2.content);
      });

      const command = ['vaults', 'version', '-np', dataDir, vaultName, ver1Oid];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(vaultName);
      expect(result.stdout).toContain(ver1Oid);

      const fileContents = await vault.access(async (efs) => {
        return (await efs.readFile(secret1.name)).toString();
      });
      expect(fileContents).toStrictEqual(secret1.content);
    });
    test('should switch the version of a vault to the latest version', async () => {
      const vault = await polykeyAgent.vaultManager.createVault(vaultName);
      const id = polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      const secret1 = { name: 'Secret-1', content: 'Secret-1-content' };
      const secret2 = { name: 'Secret-1', content: 'Secret-2-content' };

      await vault.commit(async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
      });
      const ver1Oid = (await vault.log(1))[0].oid;

      await vault.commit(async (efs) => {
        await efs.writeFile(secret2.name, secret2.content);
      });

      const command = ['vaults', 'version', '-np', dataDir, vaultName, ver1Oid];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      const command2 = ['vaults', 'version', '-np', dataDir, vaultName, 'last'];

      const result2 = await utils.pkStdio([...command2], {}, dataDir);
      expect(result2.exitCode).toBe(0);
      expect(result2.stdout).toContain(vaultName);
      expect(result2.stdout).toContain('latest');
    });
    test('should handle invalid version IDs', async () => {
      await polykeyAgent.vaultManager.createVault(vaultName);
      const id = polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      const command = [
        'vaults',
        'version',
        '-np',
        dataDir,
        vaultName,
        'NOT_A_VALID_CHECKOUT_ID',
      ];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(10);

      expect(result.stderr).toContain('ErrorVaultCommitUndefined');
    });
    test('should throw an error if the vault is not found', async () => {
      const command = [
        'vaults',
        'version',
        '-np',
        dataDir,
        'A' + vaultName,
        'NOT_A_VALID_CHECKOUT_ID',
      ];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(10);
      expect(result.stderr).toContain('ErrorVaultUndefined');
    });
  });
  describe('commandVaultLog', () => {
    const secret1 = { name: 'secret1', content: 'Secret-1-content' };
    const secret2 = { name: 'secret2', content: 'Secret-2-content' };

    let vault: Vault;
    let commit1Oid: string;
    let commit2Oid: string;
    let commit3Oid: string;

    beforeEach(async () => {
      vault = await polykeyAgent.vaultManager.createVault(vaultName);

      await vault.commit(async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
      });
      commit1Oid = (await vault.log(0))[0].oid;

      await vault.commit(async (efs) => {
        await efs.writeFile(secret2.name, secret2.content);
      });
      commit2Oid = (await vault.log(0))[0].oid;

      await vault.commit(async (efs) => {
        await efs.unlink(secret2.name);
      });
      commit3Oid = (await vault.log(0))[0].oid;
    });
    afterEach(async () => {
      await polykeyAgent.vaultManager.destroyVault(vault.vaultId);
    });

    test('Should get all commits', async () => {
      const command = ['vaults', 'log', '-np', dataDir, vaultName];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toEqual(0);
      expect(result.stdout).toContain(commit1Oid);
      expect(result.stdout).toContain(commit2Oid);
      expect(result.stdout).toContain(commit3Oid);
    });
    test('should get a part of the log', async () => {
      const command = ['vaults', 'log', '-np', dataDir, '-d', '2', vaultName];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toEqual(0);
      expect(result.stdout).not.toContain(commit1Oid);
      expect(result.stdout).toContain(commit2Oid);
      expect(result.stdout).toContain(commit3Oid);
    });
    test('should get a specific commit', async () => {
      const command = [
        'vaults',
        'log',
        '-np',
        dataDir,
        '-d',
        '1',
        vaultName,
        '-ci',
        commit2Oid,
      ];

      const result = await utils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toEqual(0);
      expect(result.stdout).not.toContain(commit1Oid);
      expect(result.stdout).toContain(commit2Oid);
      expect(result.stdout).not.toContain(commit3Oid);
    });
    test.todo('test formatting of the output');
  });
});
