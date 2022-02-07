import type { NodeIdEncoded, NodeAddress, NodeInfo } from '@/nodes/types';
import type { VaultId, VaultName } from '@/vaults/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { utils as nodesUtils } from '@/nodes';
import { utils as vaultsUtils } from '@/vaults';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as testBinUtils from '../utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

/**
 * This test file has been optimised to use only one instance of PolykeyAgent where possible.
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

  const nodeId1Encoded =
    'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0' as NodeIdEncoded;
  const nodeId2Encoded =
    'vrcacp9vsb4ht25hds6s4lpp2abfaso0mptcfnh499n35vfcn2gkg' as NodeIdEncoded;
  const nodeId3Encoded =
    'v359vgrgmqf1r5g4fvisiddjknjko6bmm4qv7646jr7fi9enbfuug' as NodeIdEncoded;

  const node1: NodeInfo = {
    id: nodeId1Encoded,
    chain: {},
  };
  const node2: NodeInfo = {
    id: nodeId2Encoded,
    chain: {},
  };
  const node3: NodeInfo = {
    id: nodeId3Encoded,
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
    await testBinUtils.pkStdio(
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

      const result = await testBinUtils.pkStdio([...command]);
      expect(result.exitCode).toBe(0);
    });
  });
  describe('commandCreateVaults', () => {
    test('should create vaults', async () => {
      command = ['vaults', 'create', '-np', dataDir, 'MyTestVault'];
      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);
      const result2 = await testBinUtils.pkStdio(
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

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
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

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
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

      const result2 = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result2.exitCode).toBe(0);

      const list = (await polykeyAgent.vaultManager.listVaults()).keys();
      const namesList: string[] = [];
      for await (const name of list) {
        namesList.push(name);
      }
      expect(namesList).not.toContain(vaultName);
    });
  });
  test(
    'should clone and pull a vault',
    async () => {
      const dataDir2 = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      const targetPolykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: dataDir2,
        logger: logger,
      });
      const vaultId = await targetPolykeyAgent.vaultManager.createVault(
        vaultName,
      );
      await targetPolykeyAgent.vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vault.writeF(async (efs) => {
            await efs.writeFile('secret 1', 'secret the first');
          });
        },
      );

      await targetPolykeyAgent.gestaltGraph.setNode({
        id: nodesUtils.encodeNodeId(polykeyAgent.keyManager.getNodeId()),
        chain: {},
      });
      const targetNodeId = targetPolykeyAgent.keyManager.getNodeId();
      const targetNodeIdEncoded = nodesUtils.encodeNodeId(targetNodeId);
      await polykeyAgent.nodeManager.setNode(targetNodeId, {
        host: targetPolykeyAgent.revProxy.getIngressHost(),
        port: targetPolykeyAgent.revProxy.getIngressPort(),
      });
      await targetPolykeyAgent.nodeManager.setNode(
        polykeyAgent.keyManager.getNodeId(),
        {
          host: polykeyAgent.revProxy.getIngressHost(),
          port: polykeyAgent.revProxy.getIngressPort(),
        },
      );
      await polykeyAgent.acl.setNodePerm(targetNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });

      await targetPolykeyAgent.vaultManager.shareVault(
        vaultId,
        polykeyAgent.keyManager.getNodeId(),
      );

      command = [
        'vaults',
        'clone',
        '-np',
        dataDir,
        vaultsUtils.encodeVaultId(vaultId),
        targetNodeIdEncoded,
      ];

      let result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      const clonedVaultId = await polykeyAgent.vaultManager.getVaultId(
        vaultName,
      );

      await polykeyAgent.vaultManager.withVaults(
        [clonedVaultId!],
        async (clonedVault) => {
          const file = await clonedVault.readF(async (efs) => {
            return await efs.readFile('secret 1', { encoding: 'utf8' });
          });
          expect(file).toBe('secret the first');
        },
      );

      await polykeyAgent.vaultManager.destroyVault(clonedVaultId!);
      command = [
        'vaults',
        'clone',
        '-np',
        dataDir,
        vaultName,
        nodesUtils.encodeNodeId(targetNodeId),
      ];
      result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      const secondClonedVaultId = (await polykeyAgent.vaultManager.getVaultId(
        vaultName,
      ))!;
      await polykeyAgent.vaultManager.withVaults(
        [secondClonedVaultId!],
        async (secondClonedVault) => {
          const file = await secondClonedVault.readF(async (efs) => {
            return await efs.readFile('secret 1', { encoding: 'utf8' });
          });
          expect(file).toBe('secret the first');
        },
      );

      await targetPolykeyAgent.vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vault.writeF(async (efs) => {
            await efs.writeFile('secret 2', 'secret the second');
          });
        },
      );

      command = ['vaults', 'pull', '-np', dataDir, vaultName];
      result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      await polykeyAgent.vaultManager.withVaults(
        [secondClonedVaultId!],
        async (secondClonedVault) => {
          const file = await secondClonedVault.readF(async (efs) => {
            return await efs.readFile('secret 2', { encoding: 'utf8' });
          });
          expect(file).toBe('secret the second');
        },
      );

      command = [
        'vaults',
        'pull',
        '-np',
        dataDir,
        '-pv',
        'InvalidName',
        vaultsUtils.encodeVaultId(secondClonedVaultId),
        targetNodeIdEncoded,
      ];
      result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(10);
      expect(result.stderr).toContain('ErrorVaultsVaultUndefined');

      command = [
        'vaults',
        'pull',
        '-np',
        dataDir,
        '-pv',
        vaultName,
        vaultsUtils.encodeVaultId(secondClonedVaultId),
        'InvalidNodeId',
      ];
      result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('ErrorInvalidId');

      await targetPolykeyAgent.stop();
      await targetPolykeyAgent.destroy();
      await fs.promises.rm(dataDir2, {
        force: true,
        recursive: true,
      });
    },
    global.defaultTimeout * 3,
  );
  test(
    'share and unshare vaults',
    async () => {
      const dataDir2 = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      const targetPolykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: dataDir2,
        logger: logger,
      });
      const vaultId = await polykeyAgent.vaultManager.createVault(vaultName);
      await polykeyAgent.vaultManager.withVaults([vaultId], async (vault) => {
        await vault.writeF(async (efs) => {
          await efs.writeFile('secret 1', 'secret');
        });
      });

      await polykeyAgent.gestaltGraph.setNode({
        id: nodesUtils.encodeNodeId(targetPolykeyAgent.keyManager.getNodeId()),
        chain: {},
      });

      const targetNodeId = targetPolykeyAgent.keyManager.getNodeId();
      const targetHost = targetPolykeyAgent.revProxy.getIngressHost();
      const targetPort = targetPolykeyAgent.revProxy.getIngressPort();
      await polykeyAgent.nodeManager.setNode(targetNodeId, {
        host: targetHost,
        port: targetPort,
      });

      await targetPolykeyAgent.nodeManager.setNode(
        polykeyAgent.keyManager.getNodeId(),
        {
          host: polykeyAgent.revProxy.getIngressHost(),
          port: polykeyAgent.revProxy.getIngressPort(),
        },
      );
      await targetPolykeyAgent.acl.setNodePerm(
        polykeyAgent.keyManager.getNodeId(),
        {
          gestalt: {
            notify: null,
          },
          vaults: {},
        },
      );

      await expect(() =>
        targetPolykeyAgent.vaultManager.cloneVault(
          polykeyAgent.keyManager.getNodeId(),
          vaultId,
        ),
      ).rejects.toThrow();

      command = [
        'vaults',
        'share',
        '-np',
        dataDir,
        vaultName,
        nodesUtils.encodeNodeId(targetNodeId),
      ];
      let result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      const clonedVaultId = await targetPolykeyAgent.vaultManager.cloneVault(
        polykeyAgent.keyManager.getNodeId(),
        vaultId,
      );
      await targetPolykeyAgent.vaultManager.withVaults(
        [clonedVaultId],
        async (clonedVault) => {
          const file = await clonedVault.readF(async (efs) => {
            return await efs.readFile('secret 1', { encoding: 'utf8' });
          });
          expect(file).toBe('secret');
        },
      );

      command = [
        'vaults',
        'unshare',
        '-np',
        dataDir,
        vaultsUtils.encodeVaultId(vaultId),
        nodesUtils.encodeNodeId(targetNodeId),
      ];

      result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      await expect(() =>
        targetPolykeyAgent.vaultManager.cloneVault(
          polykeyAgent.keyManager.getNodeId(),
          vaultId,
        ),
      ).rejects.toThrow();

      await targetPolykeyAgent.stop();
      await targetPolykeyAgent.destroy();
      await fs.promises.rm(dataDir2, { recursive: true });
    },
    global.defaultTimeout * 2,
  );
  describe('commandVaultVersion', () => {
    test('should switch the version of a vault', async () => {
      const vaultId = await polykeyAgent.vaultManager.createVault(vaultName);
      const id = polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      const secret1 = { name: 'Secret-1', content: 'Secret-1-content' };
      const secret2 = { name: 'Secret-1', content: 'Secret-2-content' };

      const ver1Oid = await polykeyAgent.vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vault.writeF(async (efs) => {
            await efs.writeFile(secret1.name, secret1.content);
          });
          const ver1Oid = (await vault.log(undefined, 1))[0].commitId;

          await vault.writeF(async (efs) => {
            await efs.writeFile(secret2.name, secret2.content);
          });
          return ver1Oid;
        },
      );

      const command = ['vaults', 'version', '-np', dataDir, vaultName, ver1Oid];

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      await polykeyAgent.vaultManager.withVaults([vaultId], async (vault) => {
        const fileContents = await vault.readF(async (efs) => {
          return (await efs.readFile(secret1.name)).toString();
        });
        expect(fileContents).toStrictEqual(secret1.content);
      });
    });
    test('should switch the version of a vault to the latest version', async () => {
      const vaultId = await polykeyAgent.vaultManager.createVault(vaultName);
      const id = polykeyAgent.vaultManager.getVaultId(vaultName);
      expect(id).toBeTruthy();

      const secret1 = { name: 'Secret-1', content: 'Secret-1-content' };
      const secret2 = { name: 'Secret-1', content: 'Secret-2-content' };

      const ver1Oid = await polykeyAgent.vaultManager.withVaults(
        [vaultId],
        async (vault) => {
          await vault.writeF(async (efs) => {
            await efs.writeFile(secret1.name, secret1.content);
          });
          const ver1Oid = (await vault.log(undefined, 1))[0].commitId;

          await vault.writeF(async (efs) => {
            await efs.writeFile(secret2.name, secret2.content);
          });
          return ver1Oid;
        },
      );

      const command = ['vaults', 'version', '-np', dataDir, vaultName, ver1Oid];

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(0);

      const command2 = ['vaults', 'version', '-np', dataDir, vaultName, 'last'];

      const result2 = await testBinUtils.pkStdio([...command2], {}, dataDir);
      expect(result2.exitCode).toBe(0);
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

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(10);

      expect(result.stderr).toContain('ErrorVaultsWriteFUndefined');
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

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(10);
      expect(result.stderr).toContain('ErrorVaultsVaultUndefined');
    });
  });
  describe('commandVaultLog', () => {
    const secret1 = { name: 'secret1', content: 'Secret-1-content' };
    const secret2 = { name: 'secret2', content: 'Secret-2-content' };

    let vaultId: VaultId;
    let writeF1Oid: string;
    let writeF2Oid: string;
    let writeF3Oid: string;

    beforeEach(async () => {
      vaultId = await polykeyAgent.vaultManager.createVault(vaultName);

      await polykeyAgent.vaultManager.withVaults([vaultId], async (vault) => {
        await vault.writeF(async (efs) => {
          await efs.writeFile(secret1.name, secret1.content);
        });
        writeF1Oid = (await vault.log(undefined, 0))[0].commitId;

        await vault.writeF(async (efs) => {
          await efs.writeFile(secret2.name, secret2.content);
        });
        writeF2Oid = (await vault.log(undefined, 0))[0].commitId;

        await vault.writeF(async (efs) => {
          await efs.unlink(secret2.name);
        });
        writeF3Oid = (await vault.log(undefined, 0))[0].commitId;
      });
    });
    afterEach(async () => {
      await polykeyAgent.vaultManager.destroyVault(vaultId);
    });

    test('Should get all writeFs', async () => {
      const command = ['vaults', 'log', '-np', dataDir, vaultName];

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toEqual(0);
      expect(result.stdout).toContain(writeF1Oid);
      expect(result.stdout).toContain(writeF2Oid);
      expect(result.stdout).toContain(writeF3Oid);
    });
    test('should get a part of the log', async () => {
      const command = ['vaults', 'log', '-np', dataDir, '-d', '2', vaultName];

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toEqual(0);
      expect(result.stdout).not.toContain(writeF1Oid);
      expect(result.stdout).toContain(writeF2Oid);
      expect(result.stdout).toContain(writeF3Oid);
    });
    test('should get a specific writeF', async () => {
      const command = [
        'vaults',
        'log',
        '-np',
        dataDir,
        '-d',
        '1',
        vaultName,
        '-ci',
        writeF2Oid,
      ];

      const result = await testBinUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toEqual(0);
      expect(result.stdout).not.toContain(writeF1Oid);
      expect(result.stdout).toContain(writeF2Oid);
      expect(result.stdout).not.toContain(writeF3Oid);
    });
    test.todo('test formatting of the output');
  });
  describe('commandScanNode', () => {
    test(
      'should return the vaults names and ids of the remote vault',
      async () => {
        let remoteOnline: PolykeyAgent | undefined;
        try {
          remoteOnline = await PolykeyAgent.createPolykeyAgent({
            password,
            logger,
            nodePath: path.join(dataDir, 'remoteOnline'),
          });
          const remoteOnlineNodeId = remoteOnline.keyManager.getNodeId();
          const remoteOnlineNodeIdEncoded =
            nodesUtils.encodeNodeId(remoteOnlineNodeId);
          await polykeyAgent.nodeManager.setNode(remoteOnlineNodeId, {
            host: remoteOnline.revProxy.getIngressHost(),
            port: remoteOnline.revProxy.getIngressPort(),
          } as NodeAddress);

          await remoteOnline.gestaltGraph.setNode({
            id: nodesUtils.encodeNodeId(polykeyAgent.keyManager.getNodeId()),
            chain: {},
          });

          await remoteOnline.gestaltGraph.setGestaltActionByNode(
            polykeyAgent.keyManager.getNodeId(),
            'scan',
          );

          const vault1Id = await remoteOnline.vaultManager.createVault(
            'Vault1' as VaultName,
          );
          const vault2Id = await remoteOnline.vaultManager.createVault(
            'Vault2' as VaultName,
          );
          const vault3Id = await remoteOnline.vaultManager.createVault(
            'Vault3' as VaultName,
          );
          const commands = [
            'vaults',
            'scan',
            remoteOnlineNodeIdEncoded,
            '-np',
            dataDir,
          ];
          const result = await testBinUtils.pkStdio(
            commands,
            { PK_PASSWORD: 'password' },
            dataDir,
          );
          expect(result.exitCode).toBe(0);
          expect(result.stdout).toContain(
            `Vault1\t\t${vaultsUtils.encodeVaultId(vault1Id)}`,
          );
          expect(result.stdout).toContain(
            `Vault2\t\t${vaultsUtils.encodeVaultId(vault2Id)}`,
          );
          expect(result.stdout).toContain(
            `Vault3\t\t${vaultsUtils.encodeVaultId(vault3Id)}`,
          );
        } finally {
          await remoteOnline?.stop();
          await remoteOnline?.destroy();
        }
      },
      global.defaultTimeout * 2,
    );
  });
  describe('commandPermissions', () => {
    test('Should return nodeIds and their permissions', async () => {
      let remoteKeynode1: PolykeyAgent | undefined;
      let remoteKeynode2: PolykeyAgent | undefined;
      try {
        // A ridiculous amount of setup.
        const vaultId1 = await polykeyAgent.vaultManager.createVault(
          'vault1' as VaultName,
        );
        const vaultId2 = await polykeyAgent.vaultManager.createVault(
          'vault2' as VaultName,
        );

        remoteKeynode1 = await PolykeyAgent.createPolykeyAgent({
          password,
          logger: logger.getChild('Remote Keynode 1'),
          nodePath: path.join(dataDir, 'remoteKeynode1'),
        });
        remoteKeynode2 = await PolykeyAgent.createPolykeyAgent({
          password,
          logger: logger.getChild('Remote Keynode 2'),
          nodePath: path.join(dataDir, 'remoteKeynode2'),
        });

        const targetNodeId1 = remoteKeynode1.keyManager.getNodeId();
        const targetNodeId2 = remoteKeynode2.keyManager.getNodeId();
        await polykeyAgent.gestaltGraph.setNode({
          id: nodesUtils.encodeNodeId(targetNodeId1),
          chain: {},
        });
        await polykeyAgent.gestaltGraph.setNode({
          id: nodesUtils.encodeNodeId(targetNodeId2),
          chain: {},
        });
        await polykeyAgent.nodeManager.setNode(targetNodeId1, {
          host: remoteKeynode1.revProxy.getIngressHost(),
          port: remoteKeynode1.revProxy.getIngressPort(),
        });
        await polykeyAgent.nodeManager.setNode(targetNodeId2, {
          host: remoteKeynode2.revProxy.getIngressHost(),
          port: remoteKeynode2.revProxy.getIngressPort(),
        });

        await remoteKeynode1.nodeManager.setNode(
          polykeyAgent.keyManager.getNodeId(),
          {
            host: polykeyAgent.revProxy.getIngressHost(),
            port: polykeyAgent.revProxy.getIngressPort(),
          },
        );
        await remoteKeynode2.nodeManager.setNode(
          polykeyAgent.keyManager.getNodeId(),
          {
            host: polykeyAgent.revProxy.getIngressHost(),
            port: polykeyAgent.revProxy.getIngressPort(),
          },
        );
        await remoteKeynode1.acl.setNodePerm(
          polykeyAgent.keyManager.getNodeId(),
          {
            gestalt: {
              notify: null,
            },
            vaults: {},
          },
        );
        await remoteKeynode2.acl.setNodePerm(
          polykeyAgent.keyManager.getNodeId(),
          {
            gestalt: {
              notify: null,
            },
            vaults: {},
          },
        );

        await polykeyAgent.vaultManager.shareVault(vaultId1, targetNodeId1);
        await polykeyAgent.vaultManager.shareVault(vaultId1, targetNodeId2);
        await polykeyAgent.vaultManager.shareVault(vaultId2, targetNodeId1);

        const vaultMessage = new vaultsPB.Vault();
        vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId1));

        // Now we call and test the command
        const command1 = ['vaults', 'permissions', 'vault1', '-np', dataDir];
        const result1 = await testBinUtils.pkStdio(
          command1,
          { PK_PASSWORD: 'password' },
          dataDir,
        );
        expect(result1.exitCode).toBe(0);
        expect(result1.stdout).toContain(remoteKeynode1.keyManager.getNodeId());
        expect(result1.stdout).toContain(remoteKeynode2.keyManager.getNodeId());
        expect(result1.stdout).toContain('pull');
        expect(result1.stdout).toContain('clone');

        // And the other vault
        const command2 = ['vaults', 'permissions', 'vault2', '-np', dataDir];
        const result2 = await testBinUtils.pkStdio(
          command2,
          { PK_PASSWORD: 'password' },
          dataDir,
        );
        expect(result2.exitCode).toBe(0);
        expect(result2.stdout).toContain(targetNodeId1);
        expect(result2.stdout).not.toContain(targetNodeId2);
        expect(result2.stdout).toContain('pull');
        expect(result2.stdout).toContain('clone');
      } finally {
        await remoteKeynode1?.stop();
        await remoteKeynode1?.destroy();
        await remoteKeynode2?.stop();
        await remoteKeynode2?.destroy();
      }
    });
  });
});
