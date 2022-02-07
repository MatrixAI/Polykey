import type { NodeId } from '@/nodes/types';
import type { VaultId, VaultName } from '@/vaults/types';
import type { GestaltGraph } from '@/gestalts';
import type { ACL } from '@/acl';
import type { NotificationsManager } from '@/notifications';
import type { VaultInternal } from '@/vaults';
import type { KeyManager } from '@/keys';
import type { NodeManager } from '@/nodes';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { utils as idUtils } from '@matrixai/id';
import { DB } from '@matrixai/db';
import { utils as keysUtils } from '@/keys';
import { PolykeyAgent } from '@';
import { VaultManager, vaultOps } from '@/vaults';
import { errors as vaultErrors } from '@/vaults';
import { utils as nodesUtils } from '@/nodes';
import { utils as vaultsUtils } from '@/vaults';
import * as testUtils from '../utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('VaultManager', () => {
  const logger = new Logger('VaultManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const nonExistentVaultId = vaultsUtils.makeVaultId(
    idUtils.fromString('DoesNotExist'),
  );
  const password = 'password';
  let gestaltGraph: GestaltGraph;
  let vaultManager: VaultManager;
  let remoteVaultId: VaultId;

  let localKeynodeId: NodeId;
  let remoteKeynode1Id: NodeId;
  let remoteKeynode2Id: NodeId;

  const secretNames = ['Secret1', 'Secret2', 'Secret3', 'Secret4'];

  const vaultName = 'TestVault' as VaultName;
  const secondVaultName = 'SecondTestVault' as VaultName;
  const thirdVaultName = 'ThirdTestVault' as VaultName;

  let localKeynode: PolykeyAgent;
  let remoteKeynode1: PolykeyAgent, remoteKeynode2: PolykeyAgent;

  let allDataDir: string;

  beforeAll(async () => {
    // Creating agents.
    allDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    localKeynode = await PolykeyAgent.createPolykeyAgent({
      password,
      logger: logger.getChild('Local Keynode'),
      nodePath: path.join(allDataDir, 'localKeynode'),
    });
    gestaltGraph = localKeynode.gestaltGraph;
    vaultManager = localKeynode.vaultManager;
    localKeynodeId = localKeynode.keyManager.getNodeId();

    remoteKeynode1 = await PolykeyAgent.createPolykeyAgent({
      password,
      logger: logger.getChild('Remote Keynode 1'),
      nodePath: path.join(allDataDir, 'remoteKeynode1'),
    });
    remoteKeynode1Id = remoteKeynode1.keyManager.getNodeId();
    remoteKeynode2 = await PolykeyAgent.createPolykeyAgent({
      password,
      logger: logger.getChild('Remote Keynode 2'),
      nodePath: path.join(allDataDir, 'remoteKeynode2'),
    });
    remoteKeynode2Id = remoteKeynode2.keyManager.getNodeId();

    // Adding details to each agent.
    await localKeynode.nodeManager.setNode(remoteKeynode1Id, {
      host: remoteKeynode1.revProxy.getIngressHost(),
      port: remoteKeynode1.revProxy.getIngressPort(),
    });
    await localKeynode.nodeManager.setNode(remoteKeynode2Id, {
      host: remoteKeynode2.revProxy.getIngressHost(),
      port: remoteKeynode2.revProxy.getIngressPort(),
    });
    await remoteKeynode1.nodeManager.setNode(localKeynodeId, {
      host: localKeynode.revProxy.getIngressHost(),
      port: localKeynode.revProxy.getIngressPort(),
    });
    await remoteKeynode1.nodeManager.setNode(remoteKeynode2Id, {
      host: remoteKeynode2.revProxy.getIngressHost(),
      port: remoteKeynode2.revProxy.getIngressPort(),
    });
    await remoteKeynode2.nodeManager.setNode(localKeynodeId, {
      host: localKeynode.revProxy.getIngressHost(),
      port: localKeynode.revProxy.getIngressPort(),
    });
    await remoteKeynode2.nodeManager.setNode(remoteKeynode1Id, {
      host: remoteKeynode1.revProxy.getIngressHost(),
      port: remoteKeynode1.revProxy.getIngressPort(),
    });

    await gestaltGraph.setNode({
      id: remoteKeynode1Id,
      chain: {},
    });
    await gestaltGraph.setNode({
      id: remoteKeynode2Id,
      chain: {},
    });
    await remoteKeynode1.gestaltGraph.setNode({
      id: localKeynodeId,
      chain: {},
    });
    await remoteKeynode1.gestaltGraph.setNode({
      id: remoteKeynode2Id,
      chain: {},
    });
    await remoteKeynode2.gestaltGraph.setNode({
      id: localKeynodeId,
      chain: {},
    });
    await remoteKeynode2.gestaltGraph.setNode({
      id: remoteKeynode1Id,
      chain: {},
    });

    remoteVaultId = await remoteKeynode1.vaultManager.createVault(vaultName);
    await remoteKeynode1.vaultManager.shareVault(remoteVaultId, localKeynodeId);
    await remoteKeynode1.vaultManager.shareVault(
      remoteVaultId,
      remoteKeynode2Id,
    );

    await remoteKeynode1.vaultManager.withVaults(
      [remoteVaultId],
      async (remoteVault) => {
        for (const secret of secretNames.slice(0, 2)) {
          await vaultOps.addSecret(remoteVault, secret, 'success?');
        }
      },
    );
  });

  afterEach(async () => {
    for (const [, vaultId] of await vaultManager.listVaults()) {
      await vaultManager.destroyVault(vaultId);
    }
    for (const [, vaultId] of await remoteKeynode2.vaultManager.listVaults()) {
      await remoteKeynode2.vaultManager.destroyVault(vaultId);
    }
  });

  afterAll(async () => {
    await remoteKeynode2.stop();
    await remoteKeynode2.destroy();
    await remoteKeynode1.stop();
    await remoteKeynode1.destroy();
    await localKeynode.stop();
    await localKeynode.destroy();
    await fs.promises.rm(allDataDir, {
      recursive: true,
      force: true,
    });
  });

  test('VaultManager readiness', async () => {
    const dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const db = await DB.createDB({
      dbPath: path.join(dataDir, 'DB'),
      crypto: {
        key: await vaultsUtils.generateVaultKey(),
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
      logger: logger.getChild(DB.name),
    });
    const vaultManagerReadiness = await VaultManager.createVaultManager({
      vaultsPath: path.join(dataDir, 'VAULTS'),
      keyManager: {} as KeyManager,
      nodeManager: {} as NodeManager,
      gestaltGraph: {} as GestaltGraph,
      acl: {} as ACL,
      notificationsManager: {} as NotificationsManager,
      db,
      logger: logger.getChild(VaultManager.name),
    });

    await expect(vaultManagerReadiness.destroy()).rejects.toThrow(
      vaultErrors.ErrorVaultManagerRunning,
    );
    // Should be a noop
    await vaultManagerReadiness.start();
    await vaultManagerReadiness.stop();
    await vaultManagerReadiness.destroy();
    await expect(vaultManagerReadiness.start()).rejects.toThrow(
      vaultErrors.ErrorVaultManagerDestroyed,
    );
    await expect(async () => {
      await vaultManagerReadiness.listVaults();
    }).rejects.toThrow(vaultErrors.ErrorVaultManagerNotRunning);
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('is type correct', () => {
    expect(vaultManager).toBeInstanceOf(VaultManager);
  });
  test('can create many vaults and open a vault', async () => {
    const vaultNames = [
      'Vault1',
      'Vault2',
      'Vault3',
      'Vault4',
      'Vault5',
      'Vault6',
      'Vault7',
      'Vault8',
      'Vault9',
      'Vault10',
      'Vault11',
      'Vault12',
      'Vault13',
      'Vault14',
      'Vault15',
    ];
    for (const vaultName of vaultNames) {
      await vaultManager.createVault(vaultName as VaultName);
    }
    expect((await vaultManager.listVaults()).size).toEqual(vaultNames.length);
  });
  test('can rename a vault', async () => {
    const vaultId = await vaultManager.createVault(vaultName);
    await vaultManager.renameVault(vaultId, secondVaultName);
    await expect(vaultManager.getVaultId(vaultName)).resolves.toBeUndefined();
    await expect(
      vaultManager.getVaultId(secondVaultName),
    ).resolves.toStrictEqual(vaultId);
    await expect(() =>
      vaultManager.renameVault(nonExistentVaultId, 'DNE' as VaultName),
    ).rejects.toThrow(vaultErrors.ErrorVaultsVaultUndefined);
  });
  test('can delete a vault', async () => {
    const secondVaultId = await vaultManager.createVault(secondVaultName);
    await vaultManager.destroyVault(secondVaultId);
  });
  test('can list vaults', async () => {
    const firstVaultId = await vaultManager.createVault(vaultName);
    const secondVaultId = await vaultManager.createVault(secondVaultName);
    const vaultNames: Array<string> = [];
    const vaultIds: Array<string> = [];
    const vaultList = await vaultManager.listVaults();
    vaultList.forEach((vaultId, vaultName) => {
      vaultNames.push(vaultName);
      vaultIds.push(vaultId.toString());
    });
    expect(vaultNames.sort()).toEqual([vaultName, secondVaultName].sort());
    expect(vaultIds.sort()).toEqual(
      [firstVaultId.toString(), secondVaultId.toString()].sort(),
    );
  });
  test('able to read and load existing metadata', async () => {
    const vaultNames = [
      'Vault1',
      'Vault2',
      'Vault3',
      'Vault4',
      'Vault5',
      'Vault6',
      'Vault7',
      'Vault8',
      'Vault9',
      'Vault10',
    ];
    for (const vaultName of vaultNames) {
      await vaultManager.createVault(vaultName as VaultName);
    }
    const vaults = await vaultManager.listVaults();
    const vaultId = vaults.get('Vault1' as VaultName) as VaultId;
    expect(vaultId).not.toBeUndefined();
    await vaultManager.stop();
    await vaultManager.start();
    const restartedVaultNames: Array<string> = [];
    const vaultList = await vaultManager.listVaults();
    vaultList.forEach((_, vaultName) => {
      restartedVaultNames.push(vaultName);
    });
    expect(restartedVaultNames.sort()).toEqual(vaultNames.sort());
  });
  test.skip('cannot concurrently create vaults with the same name', async () => {
    const vaults = Promise.all([
      vaultManager.createVault(vaultName),
      vaultManager.createVault(vaultName),
    ]);
    await expect(() => vaults).rejects.toThrow(
      vaultErrors.ErrorVaultsVaultDefined,
    );
  });
  test('can concurrently rename the same vault', async () => {
    const vaultId = await vaultManager.createVault(vaultName);
    await Promise.all([
      vaultManager.renameVault(vaultId, secondVaultName),
      vaultManager.renameVault(vaultId, thirdVaultName),
    ]);
    const vaultNameTest = (await vaultManager.getVaultMeta(vaultId)).name;
    expect(vaultNameTest).toBe(thirdVaultName);
  });
  test('can concurrently open and rename the same vault', async () => {
    const vaultId = await vaultManager.createVault(vaultName);
    await Promise.all([
      vaultManager.renameVault(vaultId, secondVaultName),
      vaultManager.withVaults([vaultId], async (vault) => vault.vaultId),
    ]);
    const vaultNameTest = (await vaultManager.getVaultMeta(vaultId)).name;
    expect(vaultNameTest).toBe(secondVaultName);
  });
  test('can save the commit state of a vault', async () => {
    const vaultId = await vaultManager.createVault(vaultName);
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.commit(async (efs) => {
        await efs.writeFile('test', 'test');
      });
    });

    await vaultManager.stop();
    await vaultManager.start();

    const read = await vaultManager.withVaults(
      [vaultId],
      async (vaultLoaded) => {
        return await vaultLoaded.access(async (efs) => {
          return await efs.readFile('test', { encoding: 'utf8' });
        });
      },
    );
    expect(read).toBe('test');
  });
  test('able to recover metadata after complex operations', async () => {
    const vaultNames = ['Vault1', 'Vault2', 'Vault3', 'Vault4', 'Vault5'];
    const alteredVaultNames = [
      'Vault1',
      'Vault2',
      'Vault3',
      'Vault6',
      'Vault10',
    ];
    for (const vaultName of vaultNames) {
      await vaultManager.createVault(vaultName as VaultName);
    }
    const v5 = await vaultManager.getVaultId('Vault5' as VaultName);
    expect(v5).not.toBeUndefined();
    await vaultManager.destroyVault(v5!);
    const v4 = await vaultManager.getVaultId('Vault4' as VaultName);
    expect(v4).toBeTruthy();
    await vaultManager.renameVault(v4!, 'Vault10' as VaultName);
    const v6 = await vaultManager.createVault('Vault6' as VaultName);

    await vaultManager.withVaults([v6], async (vault6) => {
      await vault6.commit(async (efs) => {
        await efs.writeFile('reloaded', 'reload');
      });
    });

    const vn: Array<string> = [];
    (await vaultManager.listVaults()).forEach((_, vaultName) =>
      vn.push(vaultName),
    );
    expect(vn.sort()).toEqual(alteredVaultNames.sort());
    await vaultManager.stop();
    await vaultManager.start();
    await vaultManager.createVault('Vault7' as VaultName);

    const v10 = await vaultManager.getVaultId('Vault10' as VaultName);
    expect(v10).not.toBeUndefined();
    alteredVaultNames.push('Vault7');
    expect((await vaultManager.listVaults()).size).toEqual(
      alteredVaultNames.length,
    );
    const vnAltered: Array<string> = [];
    (await vaultManager.listVaults()).forEach((_, vaultName) =>
      vnAltered.push(vaultName),
    );
    expect(vnAltered.sort()).toEqual(alteredVaultNames.sort());
    const file = await vaultManager.withVaults([v6], async (reloadedVault) => {
      return await reloadedVault.access(async (efs) => {
        return await efs.readFile('reloaded', { encoding: 'utf8' });
      });
    });

    expect(file).toBe('reload');
  });
  test('clone vaults from a remote keynode using a vault name', async () => {
    await expect(() =>
      vaultManager.cloneVault(
        remoteKeynode1.keyManager.getNodeId(),
        'not-existing' as VaultName,
      ),
    ).rejects.toThrow(vaultErrors.ErrorVaultsVaultUndefined);
    await vaultManager.cloneVault(
      remoteKeynode1.keyManager.getNodeId(),
      vaultName,
    );
    const vaultId = await vaultManager.getVaultId(vaultName);
    if (vaultId === undefined) fail('VaultId is not found.');
    const [file, secretsList] = await vaultManager.withVaults(
      [vaultId],
      async (vaultClone) => {
        const file = await vaultClone.access(async (efs) => {
          return await efs.readFile(secretNames[0], { encoding: 'utf8' });
        });
        const secretsList = (await vaultOps.listSecrets(vaultClone)).sort();
        return [file, secretsList];
      },
    );
    expect(file).toBe('success?');
    expect(secretsList).toStrictEqual(secretNames.slice(0, 2).sort());
  }, 100000);
  test('clone and pull vaults using a vault id', async () => {
    const vaultId = await vaultManager.cloneVault(
      remoteKeynode1.keyManager.getNodeId(),
      remoteVaultId,
    );
    await vaultManager.withVaults([vaultId], async (vaultClone) => {
      const file = await vaultClone.access(async (efs) => {
        return await efs.readFile(secretNames[0], { encoding: 'utf8' });
      });
      expect(file).toBe('success?');
      expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
        secretNames.slice(0, 2).sort(),
      );
    });

    await remoteKeynode1.vaultManager.withVaults(
      [remoteVaultId],
      async (remoteVault) => {
        for (const secret of secretNames.slice(2)) {
          await vaultOps.addSecret(remoteVault, secret, 'second success?');
        }
      },
    );

    await vaultManager.pullVault({ vaultId });

    await vaultManager.withVaults([vaultId], async (vaultClone) => {
      const file = await vaultClone.access(async (efs) => {
        return await efs.readFile(secretNames[2], { encoding: 'utf8' });
      });
      expect(file).toBe('second success?');
      expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
        secretNames.sort(),
      );
    });

    await remoteKeynode1.vaultManager.withVaults(
      [remoteVaultId],
      async (remoteVault) => {
        for (const secret of secretNames.slice(2)) {
          await vaultOps.deleteSecret(remoteVault, secret);
        }
      },
    );
  });
  test('reject cloning and pulling when permissions are not set', async () => {
    await remoteKeynode1.vaultManager.unshareVault(
      remoteVaultId,
      localKeynodeId,
    );
    await expect(() =>
      vaultManager.cloneVault(remoteKeynode1Id, remoteVaultId),
    ).rejects.toThrow(vaultErrors.ErrorVaultsPermissionDenied);
    expect((await vaultManager.listVaults()).size).toBe(0);
    await remoteKeynode1.vaultManager.shareVault(remoteVaultId, localKeynodeId);
    const clonedVaultId = await vaultManager.cloneVault(
      remoteKeynode1Id,
      remoteVaultId,
    );
    await vaultManager.withVaults([clonedVaultId], async (clonedVault) => {
      const file = await clonedVault.access(async (efs) => {
        return await efs.readFile(secretNames[0], { encoding: 'utf8' });
      });
      expect(file).toBe('success?');
    });

    await remoteKeynode1.vaultManager.unshareVault(
      remoteVaultId,
      localKeynodeId,
    );
    await expect(() =>
      vaultManager.pullVault({ vaultId: clonedVaultId }),
    ).rejects.toThrow(vaultErrors.ErrorVaultsPermissionDenied);

    await vaultManager.withVaults([clonedVaultId], async (clonedVault) => {
      await expect(vaultOps.listSecrets(clonedVault)).resolves.toStrictEqual(
        secretNames.slice(0, 2),
      );
    });

    await remoteKeynode1.vaultManager.shareVault(remoteVaultId, localKeynodeId);
  });
  test('throw when trying to commit to a cloned vault', async () => {
    const clonedVaultId = await vaultManager.cloneVault(
      remoteKeynode1Id,
      remoteVaultId,
    );
    await vaultManager.withVaults([clonedVaultId], async (clonedVault) => {
      await expect(
        vaultOps.renameSecret(clonedVault, secretNames[0], secretNames[2]),
      ).rejects.toThrow(vaultErrors.ErrorVaultsVaultImmutable);
    });
  });
  test(
    'clone and pull from other cloned vaults',
    async () => {
      const clonedVaultRemote2Id = await remoteKeynode2.vaultManager.cloneVault(
        remoteKeynode1Id,
        remoteVaultId,
      );
      await localKeynode.acl.setNodePerm(remoteKeynode2Id, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });
      await remoteKeynode2.vaultManager.shareVault(
        clonedVaultRemote2Id,
        localKeynodeId,
      );
      const notification = (
        await localKeynode.notificationsManager.readNotifications()
      ).pop();
      expect(notification?.data['type']).toBe('VaultShare');
      expect(notification?.data['vaultId']).toBe(
        idUtils.toString(clonedVaultRemote2Id),
      );
      expect(notification?.data['vaultName']).toBe(vaultName);
      expect(notification?.data['actions']['clone']).toBeNull();
      expect(notification?.data['actions']['pull']).toBeNull();
      await vaultManager.cloneVault(remoteKeynode2Id, clonedVaultRemote2Id);
      const vaultIdClone = await vaultManager.getVaultId(vaultName);
      expect(vaultIdClone).not.toBeUndefined();
      await vaultManager.withVaults([vaultIdClone!], async (vaultClone) => {
        expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
          secretNames.slice(0, 2).sort(),
        );
      });

      await remoteKeynode1.vaultManager.withVaults(
        [remoteVaultId],
        async (remoteVault) => {
          for (const secret of secretNames.slice(2)) {
            await vaultOps.addSecret(remoteVault, secret, 'success?');
          }
        },
      );

      await vaultManager.pullVault({
        vaultId: vaultIdClone!,
        pullNodeId: remoteKeynode1Id,
        pullVaultNameOrId: remoteVaultId,
      });
      await vaultManager.withVaults([vaultIdClone!], async (vaultClone) => {
        expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
          secretNames.sort(),
        );
      });

      await remoteKeynode1.vaultManager.withVaults(
        [remoteVaultId],
        async (remoteVault) => {
          for (const secret of secretNames.slice(2)) {
            await vaultOps.deleteSecret(remoteVault, secret);
          }
        },
      );
    },
    global.defaultTimeout * 2,
  );
  // Irrelevant for the moment as cloned vaults are immutable but will
  // be useful in the future
  test.skip('manage pulling from different remotes', async () => {
    const clonedVaultRemote2Id = await remoteKeynode2.vaultManager.cloneVault(
      remoteKeynode1Id,
      remoteVaultId,
    );

    await remoteKeynode2.vaultManager.shareVault(
      clonedVaultRemote2Id,
      localKeynodeId,
    );

    const vaultCloneId = await vaultManager.cloneVault(
      remoteKeynode2Id,
      clonedVaultRemote2Id,
    );

    await remoteKeynode1.vaultManager.withVaults(
      [remoteVaultId],
      async (remoteVault) => {
        await vaultOps.addSecret(remoteVault, secretNames[2], 'success?');
      },
    );
    await vaultManager.pullVault({
      vaultId: vaultCloneId,
      pullNodeId: remoteKeynode1Id,
      pullVaultNameOrId: vaultName,
    });

    await vaultManager.withVaults([vaultCloneId], async (vaultClone) => {
      expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
        secretNames.slice(0, 3).sort(),
      );
    });

    await remoteKeynode2.vaultManager.withVaults(
      [clonedVaultRemote2Id],
      async (clonedVaultRemote2) => {
        await vaultOps.addSecret(
          clonedVaultRemote2,
          secretNames[3],
          'second success?',
        );
      },
    );
    await vaultManager.pullVault({ vaultId: vaultCloneId });

    await vaultManager.withVaults([vaultCloneId], async (vaultClone) => {
      expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
        secretNames.sort(),
      );
    });
  });
  test('Do actions on a vault using `withVault`', async () => {
    const vault1 = await vaultManager.createVault('testVault1' as VaultName);
    const vault2 = await vaultManager.createVault('testVault2' as VaultName);
    const vaults = [vault1, vault2];

    await vaultManager.withVaults(vaults, async (vault1, vault2) => {
      expect(vault1.vaultId).toEqual(vaults[0]);
      expect(vault2.vaultId).toEqual(vaults[1]);
      await vault1.commit(async (fs) => {
        await fs.writeFile('test', 'test1');
      });
      await vault2.commit(async (fs) => {
        await fs.writeFile('test', 'test2');
      });
    });

    await vaultManager.withVaults(vaults, async (vault1, vault2) => {
      const a = await vault1.access((fs) => {
        return fs.readFile('test');
      });
      const b = await vault2.access((fs) => {
        return fs.readFile('test');
      });

      expect(a.toString()).toEqual('test1');
      expect(b.toString()).toEqual('test2');
    });
  });
  test('WorkingDirIndex is maintained across certain actions', async () => {
    const vaultId = await vaultManager.createVault('testVault1' as VaultName);
    const oid2 = await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.commit(async (fs) => {
        await fs.writeFile('test1', 'test1');
      });
      await vault.commit(async (fs) => {
        await fs.writeFile('test2', 'test2');
      });
      const oid2 = (await vault.log(1)).pop()!.oid;
      await vault.commit(async (fs) => {
        await fs.writeFile('test3', 'test3');
      });
      await vault.version(oid2);
      return oid2;
    });
    await vaultManager.closeVault(vaultId);
    await vaultManager.withVaults([vaultId], async (vault) => {
      const vaultInternal = vault as VaultInternal;
      const currentOid = vaultInternal.getworkingDirIndex();
      await vault.access(async (fs) => {
        expect(await fs.readdir('.')).toEqual(['test1', 'test2']);
      });
      expect(currentOid).toStrictEqual(oid2);
    });
  });
});
