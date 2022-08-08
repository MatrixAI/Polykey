import type { NodeIdEncoded, NodeAddress, NodeInfo } from '@/nodes/types';
import type { VaultId, VaultName } from '@/vaults/types';
import type { Host } from '@/network/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import * as vaultsUtils from '@/vaults/utils';
import sysexits from '@/utils/sysexits';
import NotificationsManager from '@/notifications/NotificationsManager';
import * as execUtils from '../../utils/exec';
import * as testNodesUtils from '../../nodes/utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import * as testUtils from '../../utils';

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

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger: logger,
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
    });
    await polykeyAgent.gestaltGraph.setNode(node1);
    await polykeyAgent.gestaltGraph.setNode(node2);
    await polykeyAgent.gestaltGraph.setNode(node3);

    vaultNumber = 0;

    // Authorize session
    await execUtils.pkStdio(
      ['agent', 'unlock', '-np', dataDir, '--password-file', passwordFile],
      {},
      dataDir,
    );
    vaultName = genVaultName();
    command = [];
  });
  afterEach(async () => {
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  describe('commandListVaults', () => {
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should list all vaults',
      async () => {
        command = ['vaults', 'list', '-np', dataDir];
        await polykeyAgent.vaultManager.createVault('Vault1' as VaultName);
        await polykeyAgent.vaultManager.createVault('Vault2' as VaultName);

        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(0);
      },
    );
  });
  describe('commandCreateVaults', () => {
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should create vaults',
      async () => {
        command = ['vaults', 'create', '-np', dataDir, 'MyTestVault'];
        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(0);
        const result2 = await execUtils.pkStdio(
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
      },
    );
  });
  describe('commandRenameVault', () => {
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should rename vault',
      async () => {
        command = [
          'vaults',
          'rename',
          vaultName,
          'RenamedVault',
          '-np',
          dataDir,
        ];
        await polykeyAgent.vaultManager.createVault(vaultName);
        const id = polykeyAgent.vaultManager.getVaultId(vaultName);
        expect(id).toBeTruthy();

        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(0);

        const list = (await polykeyAgent.vaultManager.listVaults()).keys();
        const namesList: string[] = [];
        for await (const name of list) {
          namesList.push(name);
        }
        expect(namesList).toContain('RenamedVault');
      },
    );
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should fail to rename non-existent vault',
      async () => {
        command = [
          'vaults',
          'rename',
          'z4iAXFwgHGeyUrdC5CiCNU4', // Vault does not exist
          'RenamedVault',
          '-np',
          dataDir,
        ];
        await polykeyAgent.vaultManager.createVault(vaultName);
        const id = polykeyAgent.vaultManager.getVaultId(vaultName);
        expect(id).toBeTruthy();

        const result = await execUtils.pkStdio([...command], {}, dataDir);
        // Exit code of the exception
        expect(result.exitCode).toBe(sysexits.USAGE);

        const list = (await polykeyAgent.vaultManager.listVaults()).keys();
        const namesList: string[] = [];
        for await (const name of list) {
          namesList.push(name);
        }
        expect(namesList).toContain(vaultName);
      },
    );
  });
  describe('commandDeleteVault', () => {
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should delete vault',
      async () => {
        command = ['vaults', 'delete', '-np', dataDir, vaultName];
        await polykeyAgent.vaultManager.createVault(vaultName);
        let id = polykeyAgent.vaultManager.getVaultId(vaultName);
        expect(id).toBeTruthy();

        id = polykeyAgent.vaultManager.getVaultId(vaultName);
        expect(id).toBeTruthy();

        const result2 = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result2.exitCode).toBe(0);

        const list = (await polykeyAgent.vaultManager.listVaults()).keys();
        const namesList: string[] = [];
        for await (const name of list) {
          namesList.push(name);
        }
        expect(namesList).not.toContain(vaultName);
      },
    );
  });
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'should clone and pull a vault',
    async () => {
      const dataDir2 = await fs.promises.mkdtemp(
        path.join(globalThis.tmpDir, 'polykey-test-'),
      );
      const targetPolykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: dataDir2,
        networkConfig: {
          proxyHost: '127.0.0.1' as Host,
        },
        keysConfig: {
          privateKeyPemOverride: globalRootKeyPems[1],
        },
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
        host: targetPolykeyAgent.proxy.getProxyHost(),
        port: targetPolykeyAgent.proxy.getProxyPort(),
      });
      await targetPolykeyAgent.nodeManager.setNode(
        polykeyAgent.keyManager.getNodeId(),
        {
          host: polykeyAgent.proxy.getProxyHost(),
          port: polykeyAgent.proxy.getProxyPort(),
        },
      );
      await polykeyAgent.acl.setNodePerm(targetNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });

      const nodeId = polykeyAgent.keyManager.getNodeId();
      await targetPolykeyAgent.gestaltGraph.setGestaltActionByNode(
        nodeId,
        'scan',
      );
      await targetPolykeyAgent.acl.setVaultAction(vaultId, nodeId, 'clone');
      await targetPolykeyAgent.acl.setVaultAction(vaultId, nodeId, 'pull');

      command = [
        'vaults',
        'clone',
        '-np',
        dataDir,
        vaultsUtils.encodeVaultId(vaultId),
        targetNodeIdEncoded,
      ];

      let result = await execUtils.pkStdio([...command], {}, dataDir);
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
      result = await execUtils.pkStdio([...command], {}, dataDir);
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
      result = await execUtils.pkStdio([...command], {}, dataDir);
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
      result = await execUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(sysexits.USAGE);
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
      result = await execUtils.pkStdio([...command], {}, dataDir);
      expect(result.exitCode).toBe(sysexits.USAGE);

      await targetPolykeyAgent.stop();
      await targetPolykeyAgent.destroy();
      await fs.promises.rm(dataDir2, {
        force: true,
        recursive: true,
      });
    },
    globalThis.defaultTimeout * 3,
  );
  describe('commandShare', () => {
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'Should share a vault',
      async () => {
        const mockedSendNotification = jest.spyOn(
          NotificationsManager.prototype,
          'sendNotification',
        );
        try {
          // We don't want to actually send a notification
          mockedSendNotification.mockImplementation(async (_) => {});
          const vaultId = await polykeyAgent.vaultManager.createVault(
            vaultName,
          );
          const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
          const targetNodeId = testNodesUtils.generateRandomNodeId();
          const targetNodeIdEncoded = nodesUtils.encodeNodeId(targetNodeId);
          await polykeyAgent.gestaltGraph.setNode({
            id: nodesUtils.encodeNodeId(targetNodeId),
            chain: {},
          });
          expect(
            (await polykeyAgent.acl.getNodePerm(targetNodeId))?.vaults[vaultId],
          ).toBeUndefined();

          command = [
            'vaults',
            'share',
            '-np',
            dataDir,
            vaultIdEncoded,
            targetNodeIdEncoded,
          ];
          const result = await execUtils.pkStdio([...command], {}, dataDir);
          expect(result.exitCode).toBe(0);

          // Check permission
          const permissions1 = (
            await polykeyAgent.acl.getNodePerm(targetNodeId)
          )?.vaults[vaultId];
          expect(permissions1).toBeDefined();
          expect(permissions1.pull).toBeDefined();
          expect(permissions1.clone).toBeDefined();
        } finally {
          mockedSendNotification.mockRestore();
        }
      },
    );
  });
  describe('commandUnshare', () => {
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'Should unshare a vault',
      async () => {
        const vaultId1 = await polykeyAgent.vaultManager.createVault(vaultName);
        const vaultId2 = await polykeyAgent.vaultManager.createVault(
          vaultName + '1',
        );
        const vaultIdEncoded1 = vaultsUtils.encodeVaultId(vaultId1);
        const vaultIdEncoded2 = vaultsUtils.encodeVaultId(vaultId2);
        const targetNodeId = testNodesUtils.generateRandomNodeId();
        const targetNodeIdEncoded = nodesUtils.encodeNodeId(targetNodeId);
        await polykeyAgent.gestaltGraph.setNode({
          id: nodesUtils.encodeNodeId(targetNodeId),
          chain: {},
        });

        // Creating permissions
        await polykeyAgent.gestaltGraph.setGestaltActionByNode(
          targetNodeId,
          'scan',
        );
        await polykeyAgent.acl.setVaultAction(vaultId1, targetNodeId, 'clone');
        await polykeyAgent.acl.setVaultAction(vaultId1, targetNodeId, 'pull');
        await polykeyAgent.acl.setVaultAction(vaultId2, targetNodeId, 'clone');
        await polykeyAgent.acl.setVaultAction(vaultId2, targetNodeId, 'pull');

        command = [
          'vaults',
          'unshare',
          '-np',
          dataDir,
          vaultIdEncoded1,
          targetNodeIdEncoded,
        ];
        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(0);

        // Check permission
        const permissions = (await polykeyAgent.acl.getNodePerm(targetNodeId))
          ?.vaults[vaultId1];
        expect(permissions).toBeDefined();
        expect(permissions.pull).toBeUndefined();
        expect(permissions.clone).toBeUndefined();

        expect(
          (await polykeyAgent.acl.getNodePerm(targetNodeId))?.gestalt['scan'],
        ).toBeDefined();

        command = [
          'vaults',
          'unshare',
          '-np',
          dataDir,
          vaultIdEncoded2,
          targetNodeIdEncoded,
        ];
        const result2 = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result2.exitCode).toBe(0);

        // Check permission
        const permissions2 = (await polykeyAgent.acl.getNodePerm(targetNodeId))
          ?.vaults[vaultId2];
        expect(permissions2).toBeDefined();
        expect(permissions2.pull).toBeUndefined();
        expect(permissions2.clone).toBeUndefined();

        // And the scan permission should be removed
        expect(
          (await polykeyAgent.acl.getNodePerm(targetNodeId))?.gestalt['scan'],
        ).toBeUndefined();
      },
    );
  });
  describe('commandPermissions', () => {
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'Should get a vaults permissions',
      async () => {
        const vaultId1 = await polykeyAgent.vaultManager.createVault(vaultName);
        const vaultId2 = await polykeyAgent.vaultManager.createVault(
          vaultName + '1',
        );
        const vaultIdEncoded1 = vaultsUtils.encodeVaultId(vaultId1);
        const vaultIdEncoded2 = vaultsUtils.encodeVaultId(vaultId2);
        const targetNodeId = testNodesUtils.generateRandomNodeId();
        const targetNodeIdEncoded = nodesUtils.encodeNodeId(targetNodeId);
        await polykeyAgent.gestaltGraph.setNode({
          id: nodesUtils.encodeNodeId(targetNodeId),
          chain: {},
        });

        // Creating permissions
        await polykeyAgent.gestaltGraph.setGestaltActionByNode(
          targetNodeId,
          'scan',
        );
        await polykeyAgent.acl.setVaultAction(vaultId1, targetNodeId, 'clone');
        await polykeyAgent.acl.setVaultAction(vaultId1, targetNodeId, 'pull');
        await polykeyAgent.acl.setVaultAction(vaultId2, targetNodeId, 'pull');

        command = ['vaults', 'permissions', '-np', dataDir, vaultIdEncoded1];
        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(targetNodeIdEncoded);
        expect(result.stdout).toContain('clone');
        expect(result.stdout).toContain('pull');

        command = ['vaults', 'permissions', '-np', dataDir, vaultIdEncoded2];
        const result2 = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result2.exitCode).toBe(0);
        expect(result2.stdout).toContain(targetNodeIdEncoded);
        expect(result2.stdout).not.toContain('clone');
        expect(result2.stdout).toContain('pull');
      },
    );
  });
  describe('commandVaultVersion', () => {
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should switch the version of a vault',
      async () => {
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

        const command = [
          'vaults',
          'version',
          '-np',
          dataDir,
          vaultName,
          ver1Oid,
        ];

        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(0);

        await polykeyAgent.vaultManager.withVaults([vaultId], async (vault) => {
          const fileContents = await vault.readF(async (efs) => {
            return (await efs.readFile(secret1.name)).toString();
          });
          expect(fileContents).toStrictEqual(secret1.content);
        });
      },
    );
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should switch the version of a vault to the latest version',
      async () => {
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

        const command = [
          'vaults',
          'version',
          '-np',
          dataDir,
          vaultName,
          ver1Oid,
        ];

        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(0);

        const command2 = [
          'vaults',
          'version',
          '-np',
          dataDir,
          vaultName,
          'last',
        ];

        const result2 = await execUtils.pkStdio([...command2], {}, dataDir);
        expect(result2.exitCode).toBe(0);
      },
    );
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should handle invalid version IDs',
      async () => {
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

        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(sysexits.USAGE);

        expect(result.stderr).toContain('ErrorVaultReferenceInvalid');
      },
    );
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should throw an error if the vault is not found',
      async () => {
        const command = [
          'vaults',
          'version',
          '-np',
          dataDir,
          'zLnM7puKobbh4YXEz66StAq',
          'NOT_A_VALID_CHECKOUT_ID',
        ];

        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toBe(sysexits.USAGE);
        expect(result.stderr).toContain('ErrorVaultsVaultUndefined');
      },
    );
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

    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'Should get all writeFs',
      async () => {
        const command = ['vaults', 'log', '-np', dataDir, vaultName];

        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).toContain(writeF1Oid);
        expect(result.stdout).toContain(writeF2Oid);
        expect(result.stdout).toContain(writeF3Oid);
      },
    );
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should get a part of the log',
      async () => {
        const command = ['vaults', 'log', '-np', dataDir, '-d', '2', vaultName];

        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).not.toContain(writeF1Oid);
        expect(result.stdout).toContain(writeF2Oid);
        expect(result.stdout).toContain(writeF3Oid);
      },
    );
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should get a specific writeF',
      async () => {
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

        const result = await execUtils.pkStdio([...command], {}, dataDir);
        expect(result.exitCode).toEqual(0);
        expect(result.stdout).not.toContain(writeF1Oid);
        expect(result.stdout).toContain(writeF2Oid);
        expect(result.stdout).not.toContain(writeF3Oid);
      },
    );
    test.todo('test formatting of the output');
  });
  describe('commandScanNode', () => {
    testUtils.testIf(testUtils.isTestPlatformEmpty)(
      'should return the vaults names and ids of the remote vault',
      async () => {
        let remoteOnline: PolykeyAgent | undefined;
        try {
          remoteOnline = await PolykeyAgent.createPolykeyAgent({
            password,
            logger,
            nodePath: path.join(dataDir, 'remoteOnline'),
            networkConfig: {
              proxyHost: '127.0.0.1' as Host,
            },
            keysConfig: {
              privateKeyPemOverride: globalRootKeyPems[2],
            },
          });
          const remoteOnlineNodeId = remoteOnline.keyManager.getNodeId();
          const remoteOnlineNodeIdEncoded =
            nodesUtils.encodeNodeId(remoteOnlineNodeId);
          await polykeyAgent.nodeManager.setNode(remoteOnlineNodeId, {
            host: remoteOnline.proxy.getProxyHost(),
            port: remoteOnline.proxy.getProxyPort(),
          } as NodeAddress);

          await remoteOnline.gestaltGraph.setNode({
            id: nodesUtils.encodeNodeId(polykeyAgent.keyManager.getNodeId()),
            chain: {},
          });

          const commands1 = [
            'vaults',
            'scan',
            remoteOnlineNodeIdEncoded,
            '-np',
            dataDir,
          ];
          const result1 = await execUtils.pkStdio(
            commands1,
            { PK_PASSWORD: 'password' },
            dataDir,
          );
          expect(result1.exitCode).toEqual(sysexits.NOPERM);
          expect(result1.stderr).toContain(
            'ErrorVaultsPermissionDenied: Permission was denied - Scanning is not allowed for',
          );

          await remoteOnline.gestaltGraph.setGestaltActionByNode(
            polykeyAgent.keyManager.getNodeId(),
            'notify',
          );

          const commands2 = [
            'vaults',
            'scan',
            remoteOnlineNodeIdEncoded,
            '-np',
            dataDir,
          ];
          const result2 = await execUtils.pkStdio(
            commands2,
            { PK_PASSWORD: 'password' },
            dataDir,
          );
          expect(result2.exitCode).toEqual(sysexits.NOPERM);
          expect(result2.stderr).toContain(
            'ErrorVaultsPermissionDenied: Permission was denied - Scanning is not allowed for',
          );

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
          const nodeId = polykeyAgent.keyManager.getNodeId();
          await remoteOnline.acl.setVaultAction(vault1Id, nodeId, 'clone');
          await remoteOnline.acl.setVaultAction(vault2Id, nodeId, 'pull');
          await remoteOnline.acl.setVaultAction(vault2Id, nodeId, 'clone');
          const commands3 = [
            'vaults',
            'scan',
            remoteOnlineNodeIdEncoded,
            '-np',
            dataDir,
          ];
          const result3 = await execUtils.pkStdio(
            commands3,
            { PK_PASSWORD: 'password' },
            dataDir,
          );
          expect(result3.exitCode).toBe(0);
          expect(result3.stdout).toContain(
            `Vault1\t\t${vaultsUtils.encodeVaultId(vault1Id)}\t\tclone`,
          );
          expect(result3.stdout).toContain(
            `Vault2\t\t${vaultsUtils.encodeVaultId(vault2Id)}\t\tpull,clone`,
          );
          expect(result3.stdout).not.toContain(
            `Vault3\t\t${vaultsUtils.encodeVaultId(vault3Id)}`,
          );
        } finally {
          await remoteOnline?.stop();
          await remoteOnline?.destroy();
        }
      },
      globalThis.defaultTimeout * 2,
    );
  });
});
