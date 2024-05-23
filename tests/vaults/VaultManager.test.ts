import type { NodeId } from '@/ids/types';
import type {
  VaultAction,
  VaultId,
  VaultIdString,
  VaultName,
} from '@/vaults/types';
import type NotificationsManager from '@/notifications/NotificationsManager';
import type { Host } from '@/network/types';
import type { Sigchain } from '@/sigchain';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { DB } from '@matrixai/db';
import { destroyed, running } from '@matrixai/async-init';
import git from 'isomorphic-git';
import { RWLockWriter } from '@matrixai/async-locks';
import TaskManager from '@/tasks/TaskManager';
import ACL from '@/acl/ACL';
import GestaltGraph from '@/gestalts/GestaltGraph';
import NodeManager from '@/nodes/NodeManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import KeyRing from '@/keys/KeyRing';
import PolykeyAgent from '@/PolykeyAgent';
import VaultManager from '@/vaults/VaultManager';
import * as vaultsErrors from '@/vaults/errors';
import NodeGraph from '@/nodes/NodeGraph';
import * as vaultsUtils from '@/vaults/utils';
import { sleep } from '@/utils';
import VaultInternal from '@/vaults/VaultInternal';
import * as keysUtils from '@/keys/utils';
import * as nodeTestUtils from '../nodes/utils';
import * as testUtils from '../utils';
import * as tlsTestsUtils from '../utils/tls';

describe('VaultManager', () => {
  const localhost = '127.0.0.1';
  const logger = new Logger('VaultManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const vaultIdGenerator = vaultsUtils.createVaultIdGenerator();
  const nonExistentVaultId = IdInternal.fromString<VaultId>('DoesNotExistxxxx');
  const password = 'password';
  let remoteVaultId: VaultId;

  let remoteKeynode1Id: NodeId;
  let remoteKeynode2Id: NodeId;

  const secretNames = ['Secret1', 'Secret2', 'Secret3', 'Secret4'];

  const vaultName = 'TestVault' as VaultName;
  const secondVaultName = 'SecondTestVault' as VaultName;
  const thirdVaultName = 'ThirdTestVault' as VaultName;

  let dataDir: string;
  let vaultsPath: string;
  let db: DB;

  // We only ever use this to get NodeId, No need to create a whole one
  const nodeId = nodeTestUtils.generateRandomNodeId();
  const dummyKeyRing = {
    getNodeId: () => nodeId,
  } as KeyRing;
  const dummyGestaltGraph = {} as GestaltGraph;
  const dummySigchain = {} as Sigchain;
  const dummyACL = {} as ACL;
  const dummyNodeManager = {} as NodeManager;
  const dummyNotificationsManager = {} as NotificationsManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    vaultsPath = path.join(dataDir, 'VAULTS');
    db = await DB.createDB({
      dbPath: path.join(dataDir, 'DB'),
      logger: logger.getChild(DB.name),
    });
  });
  afterEach(async () => {
    await db.stop();
    await db.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  describe('with a vault', () => {
    let acl: ACL;
    let gestaltGraph: GestaltGraph;
    let vaultManager: VaultManager;

    beforeEach(async () => {
      acl = await ACL.createACL({
        db,
        logger,
      });
      gestaltGraph = await GestaltGraph.createGestaltGraph({
        db,
        acl,
        logger,
      });
      vaultManager = await VaultManager.createVaultManager({
        vaultsPath,
        keyRing: dummyKeyRing,
        gestaltGraph,
        nodeManager: dummyNodeManager,
        acl,
        notificationsManager: dummyNotificationsManager,
        db,
        logger: logger.getChild(VaultManager.name),
      });
    });
    afterEach(async () => {
      await vaultManager.stop();
      await vaultManager.destroy();
      await gestaltGraph.stop();
      await gestaltGraph.destroy();
      await acl.stop();
      await acl.destroy();
    });

    test('VaultManager readiness', async () => {
      await expect(vaultManager.destroy()).rejects.toThrow(
        vaultsErrors.ErrorVaultManagerRunning,
      );
      // Should be a noop
      await vaultManager.start();
      await vaultManager.stop();
      await vaultManager.destroy();
      await expect(vaultManager.start()).rejects.toThrow(
        vaultsErrors.ErrorVaultManagerDestroyed,
      );
      await expect(async () => {
        await vaultManager.listVaults();
      }).rejects.toThrow(vaultsErrors.ErrorVaultManagerNotRunning);
    });
    test('is type correct', async () => {
      expect(vaultManager).toBeInstanceOf(VaultManager);
    });
    test(
      'can create many vaults and open a vault',
      async () => {
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
        expect((await vaultManager.listVaults()).size).toEqual(
          vaultNames.length,
        );
      },
      globalThis.defaultTimeout * 4,
    );
    test('can rename a vault', async () => {
      const vaultId = await vaultManager.createVault(vaultName);
      // We can rename the vault here
      await vaultManager.renameVault(vaultId, secondVaultName);
      await expect(vaultManager.getVaultId(vaultName)).resolves.toBeUndefined();
      await expect(
        vaultManager.getVaultId(secondVaultName),
      ).resolves.toStrictEqual(vaultId);
      // Can't rename an non existing vault
      await expect(() =>
        vaultManager.renameVault(nonExistentVaultId, 'DNE' as VaultName),
      ).rejects.toThrow(vaultsErrors.ErrorVaultsVaultUndefined);
      await vaultManager.createVault(thirdVaultName);
      // Can't rename vault to a name that exists
      await expect(
        vaultManager.renameVault(vaultId, thirdVaultName),
      ).rejects.toThrow(vaultsErrors.ErrorVaultsVaultDefined);
    });
    test('can delete a vault', async () => {
      expect((await vaultManager.listVaults()).size).toBe(0);
      const secondVaultId = await vaultManager.createVault(secondVaultName);
      // @ts-ignore: protected method
      const vault = await vaultManager.getVault(secondVaultId);
      await vaultManager.destroyVault(secondVaultId);
      // The mapping should be gone
      expect((await vaultManager.listVaults()).size).toBe(0);
      // The vault should be destroyed
      expect(vault[destroyed]).toBe(true);
      // Metadata should be gone
      expect(await vaultManager.getVaultMeta(secondVaultId)).toBeUndefined();
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
    test(
      'able to read and load existing metadata',
      async () => {
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
      },
      globalThis.defaultTimeout * 2,
    );
    test('concurrently creating vault with same name only creates 1 vault', async () => {
      await expect(
        Promise.all([
          vaultManager.createVault(vaultName),
          vaultManager.createVault(vaultName),
        ]),
      ).rejects.toThrow(vaultsErrors.ErrorVaultsVaultDefined);
      // @ts-ignore: kidnapping the map
      const vaultMap = vaultManager.vaultMap;
      expect(vaultMap.size).toBe(1);
    });
    test('can concurrently rename the same vault', async () => {
      const vaultId = await vaultManager.createVault(vaultName);
      await Promise.all([
        vaultManager.renameVault(vaultId, secondVaultName),
        vaultManager.renameVault(vaultId, thirdVaultName),
      ]);
      const vaultNameTest = (await vaultManager.getVaultMeta(vaultId))
        ?.vaultName;
      expect(vaultNameTest).toBe(thirdVaultName);
    });
    test('can concurrently open and rename the same vault', async () => {
      const vaultId = await vaultManager.createVault(vaultName);
      await Promise.all([
        vaultManager.renameVault(vaultId, secondVaultName),
        vaultManager.withVaults([vaultId], async (vault) => vault.vaultId),
      ]);
      const vaultNameTest = (await vaultManager.getVaultMeta(vaultId))
        ?.vaultName;
      expect(vaultNameTest).toBe(secondVaultName);
    });
    test('can save the commit state of a vault', async () => {
      const vaultId = await vaultManager.createVault(vaultName);
      await vaultManager.withVaults([vaultId], async (vault) => {
        await vault.writeF(async (efs) => {
          await efs.writeFile('test', 'test');
        });
      });

      await vaultManager.stop();
      await vaultManager.start();

      const read = await vaultManager.withVaults(
        [vaultId],
        async (vaultLoaded) => {
          return await vaultLoaded.readF(async (efs) => {
            return await efs.readFile('test', { encoding: 'utf8' });
          });
        },
      );
      expect(read).toBe('test');
    });
    test('do actions on a vault using `withVault`', async () => {
      const vault1 = await vaultManager.createVault('testVault1' as VaultName);
      const vault2 = await vaultManager.createVault('testVault2' as VaultName);
      const vaults = [vault1, vault2];

      await vaultManager.withVaults(vaults, async (vault1, vault2) => {
        expect(vault1.vaultId).toEqual(vaults[0]);
        expect(vault2.vaultId).toEqual(vaults[1]);
        await vault1.writeF(async (fs) => {
          await fs.writeFile('test', 'test1');
        });
        await vault2.writeF(async (fs) => {
          await fs.writeFile('test', 'test2');
        });
      });

      await vaultManager.withVaults(vaults, async (vault1, vault2) => {
        const a = await vault1.readF((fs) => {
          return fs.readFile('test');
        });
        const b = await vault2.readF((fs) => {
          return fs.readFile('test');
        });

        expect(a.toString()).toEqual('test1');
        expect(b.toString()).toEqual('test2');
      });
    });
    test('handleScanVaults should list all vaults with permissions', async () => {
      // Setting up state
      const nodeId1 = nodeTestUtils.generateRandomNodeId();
      const nodeId2 = nodeTestUtils.generateRandomNodeId();
      await gestaltGraph.setNode({
        nodeId: nodeId1,
      });
      await gestaltGraph.setNode({
        nodeId: nodeId2,
      });
      await gestaltGraph.setGestaltAction(['node', nodeId1], 'scan');

      const vault1 = await vaultManager.createVault('testVault1' as VaultName);
      const vault2 = await vaultManager.createVault('testVault2' as VaultName);
      const vault3 = await vaultManager.createVault('testVault3' as VaultName);

      // Setting permissions
      await acl.setVaultAction(vault1, nodeId1, 'clone');
      await acl.setVaultAction(vault1, nodeId1, 'pull');
      await acl.setVaultAction(vault2, nodeId1, 'clone');
      // No permissions for vault3

      // scanning vaults
      const gen = vaultManager.handleScanVaults(nodeId1);
      const vaults: Record<VaultId, [VaultName, VaultAction[]]> = {};
      for await (const vault of gen) {
        vaults[vault.vaultId] = [vault.vaultName, vault.vaultPermissions];
      }
      expect(vaults[vault1]).toEqual(['testVault1', ['clone', 'pull']]);
      expect(vaults[vault2]).toEqual(['testVault2', ['clone']]);
      expect(vaults[vault3]).toBeUndefined();

      // Should throw due to no permission
      await expect(async () => {
        for await (const _ of vaultManager.handleScanVaults(nodeId2)) {
          // Should throw
        }
      }).rejects.toThrow(vaultsErrors.ErrorVaultsPermissionDenied);
      // Should throw due to lack of scan permission
      await gestaltGraph.setGestaltAction(['node', nodeId2], 'notify');
      await expect(async () => {
        for await (const _ of vaultManager.handleScanVaults(nodeId2)) {
          // Should throw
        }
      }).rejects.toThrow(vaultsErrors.ErrorVaultsPermissionDenied);
    });
    test('stopping respects locks', async () => {
      // @ts-ignore: kidnapping the map
      const vaultMap = vaultManager.vaultMap;
      // @ts-ignore: kidnap vaultManager lockBox
      const vaultLocks = vaultManager.vaultLocks;

      // Create the vault
      const vaultId = await vaultManager.createVault('vaultName');
      const vaultIdString = vaultId.toString() as VaultIdString;
      // Getting and holding the lock
      const vault = vaultMap.get(vaultIdString)!;
      const [releaseWrite] = await vaultLocks.lock([
        vaultId.toString(),
        RWLockWriter,
        'write',
      ])();
      // Try to destroy
      const closeP = vaultManager.closeVault(vaultId);
      await sleep(1000);
      // Shouldn't be closed
      expect(vault[running]).toBe(true);
      expect(vaultMap.get(vaultIdString)).toBeDefined();
      // Release the lock
      await releaseWrite();
      await closeP;
      expect(vault[running]).toBe(false);
      expect(vaultMap.get(vaultIdString)).toBeUndefined();
    });
    test('destroying respects locks', async () => {
      // @ts-ignore: kidnapping the map
      const vaultMap = vaultManager.vaultMap;
      // @ts-ignore: kidnap vaultManager lockBox
      const vaultLocks = vaultManager.vaultLocks;
      // Create the vault
      const vaultId = await vaultManager.createVault('vaultName');
      const vaultIdString = vaultId.toString() as VaultIdString;
      // Getting and holding the lock
      const vault = vaultMap.get(vaultIdString)!;
      const [releaseWrite] = await vaultLocks.lock([
        vaultId.toString(),
        RWLockWriter,
        'write',
      ])();
      // Try to destroy
      const destroyP = vaultManager.destroyVault(vaultId);
      await sleep(1000);
      // Shouldn't be destroyed
      expect(vault[destroyed]).toBe(false);
      expect(vaultMap.get(vaultIdString)).toBeDefined();
      // Release the lock
      await releaseWrite();
      await destroyP;
      expect(vault[destroyed]).toBe(true);
      expect(vaultMap.get(vaultIdString)).toBeUndefined();
    });
    test('withVault respects locks', async () => {
      // @ts-ignore: kidnap vaultManager lockBox
      const vaultLocks = vaultManager.vaultLocks;
      // Create the vault
      const vaultId = await vaultManager.createVault('vaultName');
      // Getting and holding the lock
      const [releaseWrite] = await vaultLocks.lock([
        vaultId.toString(),
        RWLockWriter,
        'write',
      ])();
      // Try to use vault
      let finished = false;
      const withP = vaultManager.withVaults([vaultId], async () => {
        finished = true;
      });
      await sleep(1000);
      // Shouldn't be destroyed
      expect(finished).toBe(false);
      // Release the lock
      await releaseWrite();
      await withP;
      expect(finished).toBe(true);
    });
    test('creation adds a vault', async () => {
      await vaultManager.createVault(vaultName);
      // @ts-ignore: kidnapping the map
      const vaultMap = vaultManager.vaultMap;
      expect(vaultMap.size).toBe(1);
    });
    test('vaults persist', async () => {
      const vaultId = await vaultManager.createVault(vaultName);
      await vaultManager.closeVault(vaultId);
      // @ts-ignore: kidnapping the map
      const vaultMap = vaultManager.vaultMap;
      expect(vaultMap.size).toBe(0);

      // @ts-ignore: protected method
      const vault1 = await vaultManager.getVault(vaultId);
      expect(vaultMap.size).toBe(1);

      // @ts-ignore: protected method
      const vault2 = await vaultManager.getVault(vaultId);
      expect(vaultMap.size).toBe(1);
      expect(vault1).toEqual(vault2);
    });
    test('vaults can be removed from map', async () => {
      const vaultId = await vaultManager.createVault(vaultName);
      // @ts-ignore: kidnapping the map
      const vaultMap = vaultManager.vaultMap;
      expect(vaultMap.size).toBe(1);
      // @ts-ignore: protected method
      const vault1 = await vaultManager.getVault(vaultId);
      await vaultManager.closeVault(vaultId);
      expect(vaultMap.size).toBe(0);
      // @ts-ignore: protected method
      const vault2 = await vaultManager.getVault(vaultId);
      expect(vault1).not.toEqual(vault2);
    });
    test('stopping vaultManager empties map and stops all vaults', async () => {
      const vaultId1 = await vaultManager.createVault('vault1');
      const vaultId2 = await vaultManager.createVault('vault2');
      // @ts-ignore: kidnapping the map
      const vaultMap = vaultManager.vaultMap;
      expect(vaultMap.size).toBe(2);
      // @ts-ignore: protected method
      const vault1 = await vaultManager.getVault(vaultId1);
      // @ts-ignore: protected method
      const vault2 = await vaultManager.getVault(vaultId2);
      await vaultManager.stop();
      expect(vaultMap.size).toBe(0);
      expect(vault1[running]).toBe(false);
      expect(vault2[running]).toBe(false);
    });
    test('destroying vaultManager destroys all data', async () => {
      let vaultManager2: VaultManager | undefined;
      try {
        const vaultId = await vaultManager.createVault('vault1');
        await vaultManager.stop();
        await vaultManager.destroy();
        // Vaults DB should be empty
        expect(await db.count([VaultManager.constructor.name])).toBe(0);
        vaultManager2 = await VaultManager.createVaultManager({
          vaultsPath,
          keyRing: dummyKeyRing,
          gestaltGraph: dummyGestaltGraph,
          nodeManager: dummyNodeManager,
          acl: dummyACL,
          notificationsManager: dummyNotificationsManager,
          db,
          logger: logger.getChild(VaultManager.name),
        });

        // @ts-ignore: protected method
        await expect(vaultManager2.getVault(vaultId)).rejects.toThrow(
          vaultsErrors.ErrorVaultsVaultUndefined,
        );
      } finally {
        await vaultManager2?.stop();
        await vaultManager2?.destroy();
      }
    });
    test("withVaults should throw if vaultId doesn't exist", async () => {
      const vaultId = vaultIdGenerator();
      await expect(
        vaultManager.withVaults([vaultId], async () => {
          // Do nothing
        }),
      ).rejects.toThrow(vaultsErrors.ErrorVaultsVaultUndefined);
    });
    test('generateVaultId handles vault conflicts', async () => {
      const generateVaultIdMock = jest.spyOn(
        vaultManager as any,
        'vaultIdGenerator',
      );
      // Generate 100 ids
      const vaultIds: VaultId[] = [];
      for (let i = 0; i < 100; i++) {
        vaultIds.push(
          // @ts-ignore: protected method
          vaultsUtils.encodeVaultId(await vaultManager.generateVaultId()),
        );
      }
      const duplicates = vaultIds.filter(
        (item, index) => vaultIds.indexOf(item) !== index,
      );
      expect(duplicates.length).toBe(0);

      const vaultId = await vaultManager.createVault('testVault');
      // Now only returns duplicates
      // @ts-ignore - mocking protected method
      generateVaultIdMock.mockReturnValue(vaultId);
      const asd = async () => {
        for (let i = 0; i < 100; i++) {
          // @ts-ignore: protected method
          await vaultManager.generateVaultId();
        }
      };
      await expect(async () => {
        return await asd();
      }).rejects.toThrow(vaultsErrors.ErrorVaultsCreateVaultId);
    });
  });
  describe('with a vault and remote agents', () => {
    let allDataDir: string;
    let keyRing: KeyRing;
    let nodeGraph: NodeGraph;
    let nodeConnectionManager: NodeConnectionManager;
    let nodeManager: NodeManager;
    let remoteKeynode1: PolykeyAgent, remoteKeynode2: PolykeyAgent;
    let localNodeId: NodeId;
    let taskManager: TaskManager;

    let vaultManager: VaultManager;

    beforeAll(async () => {
      // Creating agents
      allDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );

      remoteKeynode1 = await PolykeyAgent.createPolykeyAgent({
        password,
        options: {
          nodePath: path.join(allDataDir, 'remoteKeynode1'),
          agentServiceHost: localhost,
          clientServiceHost: localhost,
          keys: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        },
        logger: logger.getChild('Remote Keynode 1'),
      });
      remoteKeynode1Id = remoteKeynode1.keyRing.getNodeId();
      remoteKeynode2 = await PolykeyAgent.createPolykeyAgent({
        password,
        options: {
          nodePath: path.join(allDataDir, 'remoteKeynode2'),
          agentServiceHost: localhost,
          clientServiceHost: localhost,
          keys: {
            passwordOpsLimit: keysUtils.passwordOpsLimits.min,
            passwordMemLimit: keysUtils.passwordMemLimits.min,
            strictMemoryLock: false,
          },
        },
        logger: logger.getChild('Remote Keynode 2'),
      });
      remoteKeynode2Id = remoteKeynode2.keyRing.getNodeId();

      // Adding details to each agent
      await remoteKeynode1.nodeGraph.setNodeContactAddressData(
        remoteKeynode2Id,
        [remoteKeynode2.agentServiceHost, remoteKeynode2.agentServicePort],
        {
          mode: 'direct',
          connectedTime: Date.now(),
          scopes: ['global'],
        },
      );
      await remoteKeynode2.nodeGraph.setNodeContactAddressData(
        remoteKeynode1Id,
        [remoteKeynode1.agentServiceHost, remoteKeynode1.agentServicePort],
        {
          mode: 'direct',
          connectedTime: Date.now(),
          scopes: ['global'],
        },
      );
      await remoteKeynode1.gestaltGraph.setNode({
        nodeId: remoteKeynode2Id,
      });
      await remoteKeynode2.gestaltGraph.setNode({
        nodeId: remoteKeynode1Id,
      });
    });
    afterAll(async () => {
      await remoteKeynode2.stop();
      await remoteKeynode1.stop();
      await fs.promises.rm(allDataDir, {
        recursive: true,
        force: true,
      });
    });
    beforeEach(async () => {
      remoteVaultId = await remoteKeynode1.vaultManager.createVault(vaultName);

      await remoteKeynode1.gestaltGraph.stop();
      await remoteKeynode1.gestaltGraph.start({ fresh: true });
      await remoteKeynode1.acl.stop();
      await remoteKeynode1.acl.start({ fresh: true });

      nodeGraph = await NodeGraph.createNodeGraph({
        db,
        keyRing: dummyKeyRing,
        logger,
      });

      keyRing = await KeyRing.createKeyRing({
        keysPath: path.join(allDataDir, 'allKeyRing'),
        password: 'password',
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
        logger,
      });
      localNodeId = keyRing.getNodeId();

      taskManager = await TaskManager.createTaskManager({
        db,
        lazy: true,
        logger,
      });
      const tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
      nodeConnectionManager = new NodeConnectionManager({
        keyRing,
        tlsConfig,
        logger,
      });
      await nodeConnectionManager.start({
        host: localhost as Host,
        agentService: {} as AgentServerManifest,
      });
      nodeManager = new NodeManager({
        db,
        keyRing,
        nodeConnectionManager,
        nodeGraph,
        gestaltGraph: dummyGestaltGraph,
        sigchain: dummySigchain,
        taskManager,
        logger,
      });
      await nodeManager.start();
      await taskManager.startProcessing();
      await nodeGraph.setNodeContactAddressData(
        remoteKeynode1Id,
        [remoteKeynode1.agentServiceHost, remoteKeynode1.agentServicePort],
        {
          mode: 'direct',
          connectedTime: Date.now(),
          scopes: ['global'],
        },
      );
      await nodeGraph.setNodeContactAddressData(
        remoteKeynode2Id,
        [remoteKeynode2.agentServiceHost, remoteKeynode2.agentServicePort],
        {
          mode: 'direct',
          connectedTime: Date.now(),
          scopes: ['global'],
        },
      );

      vaultManager = await VaultManager.createVaultManager({
        vaultsPath,
        keyRing: dummyKeyRing,
        gestaltGraph: dummyGestaltGraph,
        nodeManager,
        acl: dummyACL,
        notificationsManager: dummyNotificationsManager,
        db,
        logger: logger.getChild(VaultManager.name),
      });
    });
    afterEach(async () => {
      await taskManager.stopProcessing();
      await taskManager.stopTasks();
      await remoteKeynode1.vaultManager.destroyVault(remoteVaultId);
      await nodeManager.stop();
      await nodeConnectionManager.stop();
      await nodeGraph.stop();
      await nodeGraph.destroy();
      await keyRing.stop();
      await keyRing.destroy();
      await taskManager.stop();
    });

    test('clone vaults from a remote keynode using a vault name', async () => {
      // Creating some state at the remote
      await remoteKeynode1.vaultManager.withVaults(
        [remoteVaultId],
        async (vault) => {
          await vault.writeF(async (efs) => {
            await efs.writeFile('secret-1', 'secret1');
            await efs.writeFile('secret-2', 'secret2');
          });
        },
      );

      // Setting permissions
      await remoteKeynode1.gestaltGraph.setNode({
        nodeId: localNodeId,
      });
      await remoteKeynode1.gestaltGraph.setGestaltAction(
        ['node', localNodeId],
        'scan',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'clone',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'pull',
      );
      await vaultManager.cloneVault(remoteKeynode1Id, vaultName);
      const vaultId = await vaultManager.getVaultId(vaultName);
      if (vaultId === undefined) fail('VaultId is not found.');
      const [file, secretsList] = await vaultManager.withVaults(
        [vaultId],
        async (vaultClone) => {
          return await vaultClone.readF(async (efs) => {
            const file = await efs.readFile('secret-1', { encoding: 'utf8' });
            const secretsList = await efs.readdir('.');
            return [file, secretsList];
          });
        },
      );
      expect(file).toBe('secret1');
      expect(secretsList).toContain('secret-1');
      expect(secretsList).toContain('secret-2');
    });
    test('clone vaults from a remote keynode using a vault name with no history', async () => {
      // Setting permissions
      await remoteKeynode1.gestaltGraph.setNode({
        nodeId: localNodeId,
      });
      await remoteKeynode1.gestaltGraph.setGestaltAction(
        ['node', localNodeId],
        'scan',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'clone',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'pull',
      );

      await vaultManager.cloneVault(remoteKeynode1Id, vaultName);
      const vaultId = await vaultManager.getVaultId(vaultName);
      if (vaultId === undefined) fail('VaultId is not found.');
    });
    test('fails to clone non existing vault', async () => {
      // Setting permissions
      await remoteKeynode1.gestaltGraph.setNode({
        nodeId: localNodeId,
      });
      await remoteKeynode1.gestaltGraph.setGestaltAction(
        ['node', localNodeId],
        'scan',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'clone',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'pull',
      );

      await testUtils.expectRemoteError(
        vaultManager.cloneVault(remoteKeynode1Id, 'not-existing' as VaultName),
        vaultsErrors.ErrorVaultsVaultUndefined,
      );
    });
    test('clone and pull vaults using a vault id', async () => {
      // Creating some state at the remote
      await remoteKeynode1.vaultManager.withVaults(
        [remoteVaultId],
        async (vault) => {
          await vault.writeF(async (efs) => {
            await efs.writeFile('secret-1', 'secret1');
            await efs.writeFile('secret-2', 'secret2');
          });
        },
      );

      // Setting permissions
      await remoteKeynode1.gestaltGraph.setNode({
        nodeId: localNodeId,
      });
      await remoteKeynode1.gestaltGraph.setGestaltAction(
        ['node', localNodeId],
        'scan',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'clone',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'pull',
      );

      await vaultManager.cloneVault(remoteKeynode1Id, remoteVaultId);
      const vaultId = await vaultManager.getVaultId(vaultName);
      if (vaultId === undefined) fail('VaultId is not found.');
      const [file, secretsList] = await vaultManager.withVaults(
        [vaultId],
        async (vaultClone) => {
          return await vaultClone.readF(async (efs) => {
            const file = await efs.readFile('secret-1', { encoding: 'utf8' });
            const secretsList = await efs.readdir('.');
            return [file, secretsList];
          });
        },
      );
      expect(file).toBe('secret1');
      expect(secretsList).toContain('secret-1');
      expect(secretsList).toContain('secret-2');
    });
    test('should reject cloning when permissions are not set', async () => {
      // Should reject with no permissions set
      await testUtils.expectRemoteError(
        vaultManager.cloneVault(remoteKeynode1Id, remoteVaultId),
        vaultsErrors.ErrorVaultsPermissionDenied,
      );
      // No new vault created
      expect((await vaultManager.listVaults()).size).toBe(0);
    });
    test('should reject Pulling when permissions are not set', async () => {
      // Setting permissions
      await remoteKeynode1.gestaltGraph.setNode({
        nodeId: localNodeId,
      });
      await remoteKeynode1.gestaltGraph.setGestaltAction(
        ['node', localNodeId],
        'scan',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'clone',
      );

      const clonedVaultId = await vaultManager.cloneVault(
        remoteKeynode1Id,
        remoteVaultId,
      );

      await testUtils.expectRemoteError(
        vaultManager.pullVault({ vaultId: clonedVaultId }),
        vaultsErrors.ErrorVaultsPermissionDenied,
      );
    });
    test(
      'can pull a cloned vault',
      async () => {
        // Creating some state at the remote
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (vault) => {
            await vault.writeF(async (efs) => {
              await efs.writeFile('secret-1', 'secret1');
            });
          },
        );

        // Setting permissions
        await remoteKeynode1.gestaltGraph.setNode({
          nodeId: localNodeId,
        });
        await remoteKeynode1.gestaltGraph.setGestaltAction(
          ['node', localNodeId],
          'scan',
        );
        await remoteKeynode1.acl.setVaultAction(
          remoteVaultId,
          localNodeId,
          'clone',
        );
        await remoteKeynode1.acl.setVaultAction(
          remoteVaultId,
          localNodeId,
          'pull',
        );

        await vaultManager.cloneVault(remoteKeynode1Id, vaultName);
        const vaultId = await vaultManager.getVaultId(vaultName);
        if (vaultId === undefined) fail('VaultId is not found.');
        await vaultManager.withVaults([vaultId], async (vaultClone) => {
          // History should only be 2 commits long
          expect(await vaultClone.log()).toHaveLength(2);
          return await vaultClone.readF(async (efs) => {
            const file = await efs.readFile('secret-1', { encoding: 'utf8' });
            const secretsList = await efs.readdir('.');
            expect(file).toBe('secret1');
            expect(secretsList).toContain('secret-1');
            expect(secretsList).not.toContain('secret-2');
          });
        });

        // Adding history
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (vault) => {
            await vault.writeF(async (efs) => {
              await efs.writeFile('secret-2', 'secret2');
            });
          },
        );

        // Pulling vault
        await vaultManager.pullVault({
          vaultId: vaultId,
        });

        // Should have new data
        await vaultManager.withVaults([vaultId], async (vaultClone) => {
          // History should only be 3 commits long
          expect(await vaultClone.log()).toHaveLength(3);
          return await vaultClone.readF(async (efs) => {
            const file = await efs.readFile('secret-1', { encoding: 'utf8' });
            const secretsList = await efs.readdir('.');
            expect(file).toBe('secret1');
            expect(secretsList).toContain('secret-1');
            expect(secretsList).toContain('secret-2');
          });
        });

        // Adding history
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (vault) => {
            await vault.writeF(async (efs) => {
              await efs.writeFile('secret-3', 'secret3');
            });
          },
        );

        // Pulling vault
        await vaultManager.pullVault({
          vaultId: vaultId,
        });

        // Should have new data
        await vaultManager.withVaults([vaultId], async (vaultClone) => {
          // History should only be 4 commits long
          expect(await vaultClone.log()).toHaveLength(4);
          return await vaultClone.readF(async (efs) => {
            const file = await efs.readFile('secret-1', { encoding: 'utf8' });
            const secretsList = await efs.readdir('.');
            expect(file).toBe('secret1');
            expect(secretsList).toContain('secret-1');
            expect(secretsList).toContain('secret-2');
            expect(secretsList).toContain('secret-3');
          });
        });
      },
      globalThis.defaultTimeout * 2,
    );
    test(
      'can pull a cloned vault with branched history',
      async () => {
        // Creating some state at the remote
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (vault) => {
            await vault.writeF(async (efs) => {
              await efs.writeFile('secret-1', 'secret1');
            });
          },
        );

        // Setting permissions
        await remoteKeynode1.gestaltGraph.setNode({
          nodeId: localNodeId,
        });
        await remoteKeynode1.gestaltGraph.setGestaltAction(
          ['node', localNodeId],
          'scan',
        );
        await remoteKeynode1.acl.setVaultAction(
          remoteVaultId,
          localNodeId,
          'clone',
        );
        await remoteKeynode1.acl.setVaultAction(
          remoteVaultId,
          localNodeId,
          'pull',
        );

        await vaultManager.cloneVault(remoteKeynode1Id, vaultName);
        const vaultId = await vaultManager.getVaultId(vaultName);
        if (vaultId === undefined) fail('VaultId is not found.');
        await vaultManager.withVaults([vaultId], async (vaultClone) => {
          // History should only be 2 commits long
          expect(await vaultClone.log()).toHaveLength(2);
          return await vaultClone.readF(async (efs) => {
            const file = await efs.readFile('secret-1', { encoding: 'utf8' });
            const secretsList = await efs.readdir('.');
            expect(file).toBe('secret1');
            expect(secretsList).toContain('secret-1');
            expect(secretsList).not.toContain('secret-2');
          });
        });

        // Adding history
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (vault) => {
            await vault.writeF(async (efs) => {
              await efs.writeFile('secret-2', 'secret2');
            });
          },
        );

        // Pulling vault
        await vaultManager.pullVault({
          vaultId: vaultId,
        });

        // Should have new data
        await vaultManager.withVaults([vaultId], async (vaultClone) => {
          // History should only be 3 commits long
          expect(await vaultClone.log()).toHaveLength(3);
          return await vaultClone.readF(async (efs) => {
            const file = await efs.readFile('secret-1', { encoding: 'utf8' });
            const secretsList = await efs.readdir('.');
            expect(file).toBe('secret1');
            expect(secretsList).toContain('secret-1');
            expect(secretsList).toContain('secret-2');
          });
        });

        // Branching history
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (vault) => {
            const branchCommit = (await vault.log())[1].commitId;
            await vault.version(branchCommit);
            await vault.writeF(async (efs) => {
              await efs.writeFile('secret-3', 'secret3');
            });
          },
        );

        // Pulling vault should throw
        await expect(
          vaultManager.pullVault({
            vaultId: vaultId,
          }),
        ).rejects.toThrow(vaultsErrors.ErrorVaultsMergeConflict);
      },
      globalThis.defaultTimeout * 2,
    );
    test(
      'manage pulling from different remotes',
      async () => {
        // Initial history
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (remoteVault) => {
            await remoteVault.writeF(async (efs) => {
              await efs.writeFile(secretNames[0], 'success?');
              await efs.writeFile(secretNames[1], 'success?');
            });
          },
        );

        // Setting permissions
        await remoteKeynode1.gestaltGraph.setNode({
          nodeId: localNodeId,
        });
        await remoteKeynode1.gestaltGraph.setGestaltAction(
          ['node', localNodeId],
          'scan',
        );
        await remoteKeynode1.acl.setVaultAction(
          remoteVaultId,
          localNodeId,
          'clone',
        );
        await remoteKeynode1.acl.setVaultAction(
          remoteVaultId,
          localNodeId,
          'pull',
        );

        await remoteKeynode1.gestaltGraph.setNode({
          nodeId: remoteKeynode2Id,
        });
        await remoteKeynode1.gestaltGraph.setGestaltAction(
          ['node', remoteKeynode2Id],
          'scan',
        );
        await remoteKeynode1.acl.setVaultAction(
          remoteVaultId,
          remoteKeynode2Id,
          'clone',
        );
        await remoteKeynode1.acl.setVaultAction(
          remoteVaultId,
          remoteKeynode2Id,
          'pull',
        );

        const clonedVaultRemote2Id =
          await remoteKeynode2.vaultManager.cloneVault(
            remoteKeynode1Id,
            remoteVaultId,
          );

        await remoteKeynode2.gestaltGraph.setNode({
          nodeId: localNodeId,
        });
        await remoteKeynode2.gestaltGraph.setGestaltAction(
          ['node', localNodeId],
          'scan',
        );
        await remoteKeynode2.acl.setVaultAction(
          clonedVaultRemote2Id,
          localNodeId,
          'clone',
        );
        await remoteKeynode2.acl.setVaultAction(
          clonedVaultRemote2Id,
          localNodeId,
          'pull',
        );
        const vaultCloneId = await vaultManager.cloneVault(
          remoteKeynode2Id,
          clonedVaultRemote2Id,
        );

        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (remoteVault) => {
            await remoteVault.writeF(async (efs) => {
              await efs.writeFile(secretNames[2], 'success?');
            });
          },
        );
        await vaultManager.pullVault({
          vaultId: vaultCloneId,
          pullNodeId: remoteKeynode1Id,
          pullVaultNameOrId: vaultName,
        });
        await vaultManager.withVaults([vaultCloneId], async (vaultClone) => {
          await vaultClone.readF(async (efs) => {
            expect((await efs.readdir('.')).sort()).toStrictEqual(
              secretNames.slice(0, 3).sort(),
            );
          });
        });
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (remoteVault) => {
            await remoteVault.writeF(async (efs) => {
              await efs.writeFile(secretNames[3], 'second success?');
            });
          },
        );
        await vaultManager.pullVault({ vaultId: vaultCloneId });
        await vaultManager.withVaults([vaultCloneId], async (vaultClone) => {
          await vaultClone.readF(async (efs) => {
            expect((await efs.readdir('.')).sort()).toStrictEqual(
              secretNames.sort(),
            );
          });
        });
      },
      globalThis.failedConnectionTimeout,
    );
    test(
      'able to recover metadata after complex operations',
      async () => {
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
          await vault6.writeF(async (efs) => {
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
        const file = await vaultManager.withVaults(
          [v6],
          async (reloadedVault) => {
            return await reloadedVault.readF(async (efs) => {
              return await efs.readFile('reloaded', { encoding: 'utf8' });
            });
          },
        );

        expect(file).toBe('reload');
      },
      globalThis.defaultTimeout * 2,
    );
    test('throw when trying to commit to a cloned vault', async () => {
      // Creating some state at the remote
      await remoteKeynode1.vaultManager.withVaults(
        [remoteVaultId],
        async (vault) => {
          await vault.writeF(async (efs) => {
            await efs.writeFile('secret-1', 'secret1');
            await efs.writeFile('secret-2', 'secret2');
          });
        },
      );

      // Setting permissions
      await remoteKeynode1.gestaltGraph.setNode({
        nodeId: localNodeId,
      });
      await remoteKeynode1.gestaltGraph.setGestaltAction(
        ['node', localNodeId],
        'scan',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'clone',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'pull',
      );

      await vaultManager.cloneVault(remoteKeynode1Id, vaultName);
      const vaultId = await vaultManager.getVaultId(vaultName);
      if (vaultId === undefined) fail('VaultId is not found.');
      await vaultManager.withVaults([vaultId], async (vaultClone) => {
        await expect(
          vaultClone.writeF(async (efs) => {
            await efs.writeFile('secret-3', 'secret3');
          }),
        ).rejects.toThrow(vaultsErrors.ErrorVaultRemoteDefined);
      });
    });
    test("test pulling a vault that isn't remote", async () => {
      // Creating some state at the remote
      const vaultId = await vaultManager.createVault('testVault1');
      await expect(vaultManager.pullVault({ vaultId })).rejects.toThrow(
        vaultsErrors.ErrorVaultRemoteUndefined,
      );
    });
    test(
      'pullVault respects locking',
      async () => {
        // This should respect the VaultManager read lock
        // and the VaultInternal write lock
        const pullVaultMock = jest.spyOn(VaultInternal.prototype, 'pullVault');
        const gitPullMock = jest.spyOn(git, 'pull');
        // Creating some state at the remote
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (vault) => {
            await vault.writeF(async (efs) => {
              await efs.writeFile('secret-1', 'secret1');
              await efs.writeFile('secret-2', 'secret2');
            });
          },
        );

        // Setting permissions
        await remoteKeynode1.gestaltGraph.setNode({
          nodeId: localNodeId,
        });
        await remoteKeynode1.gestaltGraph.setGestaltAction(
          ['node', localNodeId],
          'scan',
        );
        await remoteKeynode1.acl.setVaultAction(
          remoteVaultId,
          localNodeId,
          'clone',
        );
        await remoteKeynode1.acl.setVaultAction(
          remoteVaultId,
          localNodeId,
          'pull',
        );

        await vaultManager.cloneVault(remoteKeynode1Id, vaultName);
        const vaultId = await vaultManager.getVaultId(vaultName);
        if (vaultId === undefined) fail('VaultId is not found.');

        // Creating new history
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (vault) => {
            await vault.writeF(async (efs) => {
              await efs.writeFile('secret-2', 'secret2');
            });
          },
        );

        // @ts-ignore: kidnap vaultManager map and grabbing lock
        const vaultsMap = vaultManager.vaultMap;
        const vault = vaultsMap.get(vaultId.toString() as VaultIdString);
        // @ts-ignore: kidnap vaultManager lockBox
        const vaultLocks = vaultManager.vaultLocks;
        const [releaseWrite] = await vaultLocks.lock([
          vaultId.toString(),
          RWLockWriter,
          'write',
        ])();

        // Pulling vault respects VaultManager write lock
        const pullP = vaultManager.pullVault({
          vaultId: vaultId,
        });
        await sleep(200);
        expect(pullVaultMock).not.toHaveBeenCalled();
        await releaseWrite();
        await pullP;
        expect(pullVaultMock).toHaveBeenCalled();
        pullVaultMock.mockClear();

        // Creating new history
        await remoteKeynode1.vaultManager.withVaults(
          [remoteVaultId],
          async (vault) => {
            await vault.writeF(async (efs) => {
              await efs.writeFile('secret-3', 'secret3');
            });
          },
        );

        // Respects VaultInternal write lock
        // @ts-ignore: kidnap vault lock
        const vaultLock = vault!.lock;
        const [releaseVaultWrite] = await vaultLock.write()();
        // Pulling vault respects VaultManager write lock
        gitPullMock.mockClear();
        const pullP2 = vaultManager.pullVault({
          vaultId: vaultId,
        });
        await sleep(200);
        expect(gitPullMock).not.toHaveBeenCalled();
        await releaseVaultWrite();
        await pullP2;
        expect(gitPullMock).toHaveBeenCalled();
      },
      globalThis.failedConnectionTimeout,
    );
    test('scanVaults should get all vaults with permissions from remote node', async () => {
      // Setting up state
      const targetNodeId = remoteKeynode1.keyRing.getNodeId();
      const nodeId1 = keyRing.getNodeId();

      // Letting nodeGraph know where the remote agent is
      await nodeGraph.setNodeContactAddressData(
        targetNodeId,
        [remoteKeynode1.agentServiceHost, remoteKeynode1.agentServicePort],
        {
          mode: 'direct',
          connectedTime: Date.now(),
          scopes: ['global'],
        },
      );

      await remoteKeynode1.gestaltGraph.setNode({
        nodeId: nodeId1,
      });

      const vault1 = await remoteKeynode1.vaultManager.createVault(
        'testVault1' as VaultName,
      );
      const vault2 = await remoteKeynode1.vaultManager.createVault(
        'testVault2' as VaultName,
      );
      const vault3 = await remoteKeynode1.vaultManager.createVault(
        'testVault3' as VaultName,
      );

      // Scanning vaults

      // Should throw due to no permission
      const testFun = async () => {
        for await (const _ of vaultManager.scanVaults(targetNodeId)) {
          // Should throw
        }
      };
      await testUtils.expectRemoteError(
        testFun(),
        vaultsErrors.ErrorVaultsPermissionDenied,
      );
      // Should throw due to lack of scan permission
      await remoteKeynode1.gestaltGraph.setGestaltAction(
        ['node', nodeId1],
        'notify',
      );
      await testUtils.expectRemoteError(
        testFun(),
        vaultsErrors.ErrorVaultsPermissionDenied,
      );

      // Setting permissions
      await remoteKeynode1.gestaltGraph.setGestaltAction(
        ['node', nodeId1],
        'scan',
      );
      await remoteKeynode1.acl.setVaultAction(vault1, nodeId1, 'clone');
      await remoteKeynode1.acl.setVaultAction(vault1, nodeId1, 'pull');
      await remoteKeynode1.acl.setVaultAction(vault2, nodeId1, 'clone');
      // No permissions for vault3

      const gen = vaultManager.scanVaults(targetNodeId);
      const vaults: Record<VaultId, [VaultName, VaultAction[]]> = {};
      for await (const vault of gen) {
        vaults[vault.vaultIdEncoded] = [
          vault.vaultName,
          vault.vaultPermissions,
        ];
      }

      expect(vaults[vaultsUtils.encodeVaultId(vault1)]).toEqual([
        'testVault1',
        ['clone', 'pull'],
      ]);
      expect(vaults[vaultsUtils.encodeVaultId(vault2)]).toEqual([
        'testVault2',
        ['clone'],
      ]);
      expect(vaults[vaultsUtils.encodeVaultId(vault3)]).toBeUndefined();
    });
    test('can handle name conflict when cloning', async () => {
      // Creating some state at the remote
      await remoteKeynode1.vaultManager.withVaults(
        [remoteVaultId],
        async (vault) => {
          await vault.writeF(async (efs) => {
            await efs.writeFile('secret-1', 'secret1');
            await efs.writeFile('secret-2', 'secret2');
          });
        },
      );

      // Setting permissions
      await remoteKeynode1.gestaltGraph.setNode({
        nodeId: localNodeId,
      });
      await remoteKeynode1.gestaltGraph.setGestaltAction(
        ['node', localNodeId],
        'scan',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'clone',
      );
      await remoteKeynode1.acl.setVaultAction(
        remoteVaultId,
        localNodeId,
        'pull',
      );

      // Before cloning we create a local vault
      await vaultManager.createVault(vaultName);
      await vaultManager.createVault(`${vaultName}-1`);
      await vaultManager.createVault(`${vaultName}-2`);
      await vaultManager.createVault(`${vaultName}-3`);
      await vaultManager.createVault(`${vaultName}-4`);
      await vaultManager.createVault(`${vaultName}-5`);

      const vaultId = await vaultManager.cloneVault(
        remoteKeynode1Id,
        vaultName,
      );
      if (vaultId === undefined) fail('VaultId is not found.');
      const [file, secretsList] = await vaultManager.withVaults(
        [vaultId],
        async (vaultClone) => {
          return await vaultClone.readF(async (efs) => {
            const file = await efs.readFile('secret-1', { encoding: 'utf8' });
            const secretsList = await efs.readdir('.');
            return [file, secretsList];
          });
        },
      );
      expect(file).toBe('secret1');
      expect(secretsList).toContain('secret-1');
      expect(secretsList).toContain('secret-2');
    });
  });
});
