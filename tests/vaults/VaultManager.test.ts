import type { NodeId, NodeAddress, NodeInfo } from '@/nodes/types';
import type { Host, Port, TLSConfig } from '@/network/types';
import type { VaultId, VaultKey, VaultName } from '@/vaults/types';
import type { ChainData } from '@/sigchain/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { KeyManager } from '@/keys';
import { NodeManager } from '@/nodes';
import { Sigchain } from '@/sigchain';
import { VaultManager, vaultOps } from '@/vaults';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { DB } from '@matrixai/db';
import { ForwardProxy, ReverseProxy } from '@/network';
import GRPCServer from '@/grpc/GRPCServer';
import { AgentService, createAgentService } from '@/agent';
import { NotificationsManager } from '@/notifications';
import { IAgentServer } from '@/proto/js/Agent_grpc_pb';

import { errors as vaultErrors } from '@/vaults';
import { utils as vaultUtils } from '@/vaults';
import { makeCrypto } from '../utils';
import { makeVaultId } from '@/vaults/utils';
import { utils as idUtils } from '@matrixai/id';

describe('VaultManager', () => {
  const password = 'password';
  const logger = new Logger('VaultManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const nonExistantVaultId = makeVaultId(idUtils.fromString('DoesNotExist'));
  let dataDir: string;
  let vaultsPath: string;
  let vaultsKey: VaultKey;
  let keyManager: KeyManager;
  let db: DB;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let nodeManager: NodeManager;
  let vaultManager: VaultManager;
  let sigchain: Sigchain;
  let notificationsManager: NotificationsManager;

  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;

  const vaultName = 'TestVault' as VaultName;
  const secondVaultName = 'SecondTestVault' as VaultName;
  const thirdVaultName = 'ThirdTestVault' as VaultName;

  beforeAll(async () => {
    fwdProxy = await ForwardProxy.createForwardProxy({
      authToken: 'abc',
      logger: logger,
    });
    revProxy = await ReverseProxy.createReverseProxy({
      logger: logger,
    });
  });
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    vaultsPath = path.join(dataDir, 'vaults');
    vaultsKey = await vaultUtils.generateVaultKey();
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath: keysPath,
      logger: logger,
    });

    db = await DB.createDB({
      dbPath: dbPath,
      logger: logger,
      crypto: makeCrypto(keyManager),
    });
    await db.start();

    sigchain = await Sigchain.createSigchain({
      keyManager: keyManager,
      db: db,
      logger: logger,
    });

    nodeManager = await NodeManager.createNodeManager({
      db: db,
      sigchain: sigchain,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });
    await nodeManager.start();

    acl = await ACL.createACL({
      db: db,
      logger: logger,
    });

    notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: acl,
        db: db,
        nodeManager: nodeManager,
        keyManager: keyManager,
        messageCap: 5,
        logger: logger,
      });

    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db: db,
      acl: acl,
      logger: logger,
    });

    vaultManager = await VaultManager.createVaultManager({
      keyManager: keyManager,
      vaultsPath,
      vaultsKey,
      nodeManager,
      db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      notificationsManager: notificationsManager,
      fs,
      logger: logger,
      fresh: true,
    });
  });
  afterEach(async () => {
    await vaultManager.destroy();
    await gestaltGraph.destroy();
    await acl.destroy();
    await db.stop();
    await nodeManager.stop();
    await keyManager.destroy();
    await fwdProxy.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('is type correct', () => {
    expect(vaultManager).toBeInstanceOf(VaultManager);
  });
  test(
    'can create many vaults and open a vault',
    async () => {
      const vault = await vaultManager.createVault(vaultName);
      const theVault = await vaultManager.openVault(vault.vaultId);
      expect(vault).toBe(theVault);
      await expect(() =>
        vaultManager.openVault(nonExistantVaultId),
      ).rejects.toThrow(vaultErrors.ErrorVaultUndefined);
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
        'Vault16',
        'Vault17',
        'Vault18',
        'Vault19',
        'Vault20',
      ];
      for (const vaultName of vaultNames) {
        await vaultManager.createVault(vaultName as VaultName);
      }
      expect((await vaultManager.listVaults()).size).toEqual(
        vaultNames.length + 1,
      );
    },
    global.defaultTimeout * 2,
  );
  test('can open the same vault twice and perform mutations', async () => {
    const vault = await vaultManager.createVault(vaultName);
    const vaultCopyOne = await vaultManager.openVault(vault.vaultId);
    const vaultCopyTwo = await vaultManager.openVault(vault.vaultId);
    expect(vaultCopyOne).toBe(vaultCopyTwo);
    await vaultCopyOne.commit(async (efs) => {
      await efs.writeFile('test', 'test');
    });
    const read = await vaultCopyTwo.access(async (efs) => {
      return (await efs.readFile('test', { encoding: 'utf8' })) as string;
    });
    expect(read).toBe('test');
  });
  test('can rename a vault', async () => {
    const vault = await vaultManager.createVault(vaultName);
    await vaultManager.renameVault(vault.vaultId, secondVaultName as VaultName);
    await expect(vaultManager.openVault(vault.vaultId)).resolves.toBe(vault);
    await expect(vaultManager.getVaultId(vaultName)).resolves.toBeUndefined();
    await expect(
      vaultManager.getVaultId(secondVaultName),
    ).resolves.toStrictEqual(vault.vaultId);
    await expect(() =>
      vaultManager.renameVault(nonExistantVaultId, 'DNE' as VaultName),
    ).rejects.toThrow(vaultErrors.ErrorVaultUndefined);
  });
  test('can delete a vault', async () => {
    const firstVault = await vaultManager.createVault(vaultName);
    const secondVault = await vaultManager.createVault(secondVaultName);
    await vaultManager.destroyVault(secondVault.vaultId);
    await expect(vaultManager.openVault(firstVault.vaultId)).resolves.toBe(
      firstVault,
    );
    await expect(() =>
      vaultManager.openVault(secondVault.vaultId),
    ).rejects.toThrow(vaultErrors.ErrorVaultUndefined);
  });
  test('can list vaults', async () => {
    const firstVault = await vaultManager.createVault(vaultName);
    const secondVault = await vaultManager.createVault(secondVaultName);
    const vaultNames: Array<string> = [];
    const vaultIds: Array<string> = [];
    const vaultList = await vaultManager.listVaults();
    vaultList.forEach((vaultId, vaultName) => {
      vaultNames.push(vaultName);
      vaultIds.push(vaultId.toString());
    });
    expect(vaultNames.sort()).toEqual([vaultName, secondVaultName].sort());
    expect(vaultIds.sort()).toEqual(
      [firstVault.vaultId.toString(), secondVault.vaultId.toString()].sort(),
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
    const vault = await vaultManager.openVault(vaultId);
    expect(vault).toBeTruthy();
    await vaultManager.destroy();
    await db.stop();
    await db.start();
    vaultManager = await VaultManager.createVaultManager({
      keyManager: keyManager,
      vaultsPath,
      vaultsKey,
      nodeManager,
      gestaltGraph,
      notificationsManager,
      acl,
      db,
      logger,
    });
    const restartedVaultNames: Array<string> = [];
    const vaultList = await vaultManager.listVaults();
    vaultList.forEach((_, vaultName) => {
      restartedVaultNames.push(vaultName);
    });
    expect(restartedVaultNames.sort()).toEqual(vaultNames.sort());
  }, global.defaultTimeout * 2);
  test.skip('cannot concurrently create vaults with the same name', async () => {
    const vaults = Promise.all([
      vaultManager.createVault(vaultName),
      vaultManager.createVault(vaultName),
    ]);
    await expect(() => vaults).rejects.toThrow(vaultErrors.ErrorVaultDefined);
  });
  test('can concurrently rename the same vault', async () => {
    const vault = await vaultManager.createVault(vaultName);
    await Promise.all([
      vaultManager.renameVault(vault.vaultId, secondVaultName),
      vaultManager.renameVault(vault.vaultId, thirdVaultName),
    ]);
    await expect(vaultManager.getVaultName(vault.vaultId)).resolves.toBe(
      thirdVaultName,
    );
  });
  test('can concurrently open and rename the same vault', async () => {
    const vault = await vaultManager.createVault(vaultName);
    await Promise.all([
      vaultManager.renameVault(vault.vaultId, secondVaultName),
      vaultManager.openVault(vault.vaultId),
    ]);
    await expect(vaultManager.getVaultName(vault.vaultId)).resolves.toBe(
      secondVaultName,
    );
  });
  test('can save the commit state of a vault', async () => {
    const vault = await vaultManager.createVault(vaultName);
    await vault.commit(async (efs) => {
      await efs.writeFile('test', 'test');
    });
    await vaultManager.closeVault(vault.vaultId);
    await vaultManager.destroy();
    vaultManager = await VaultManager.createVaultManager({
      keyManager: keyManager,
      vaultsPath,
      vaultsKey,
      nodeManager,
      db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      notificationsManager,
      fs,
      logger,
    });
    const vaultLoaded = await vaultManager.openVault(vault.vaultId);
    const read = await vaultLoaded.access(async (efs) => {
      return await efs.readFile('test', { encoding: 'utf8' });
    });
    expect(read).toBe('test');
  });
  test(
    'able to recover metadata after complex operations',
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
      const alteredVaultNames = [
        'Vault1',
        'Vault2',
        'Vault3',
        'Vault4',
        'Vault6',
        'Vault7',
        'Vault8',
        'Vault10',
        'ThirdImpact',
        'Cake',
      ];
      for (const vaultName of vaultNames) {
        await vaultManager.createVault(vaultName as VaultName);
      }
      const v10 = await vaultManager.getVaultId('Vault10' as VaultName);
      expect(v10).not.toBeUndefined();
      await vaultManager.destroyVault(v10!);
      const v5 = await vaultManager.getVaultId('Vault5' as VaultName);
      expect(v5).not.toBeUndefined();
      await vaultManager.destroyVault(v5!);
      const v9 = await vaultManager.getVaultId('Vault9' as VaultName);
      expect(v9).toBeTruthy();
      await vaultManager.renameVault(v9!, 'Vault10' as VaultName);
      await vaultManager.createVault('ThirdImpact' as VaultName);
      await vaultManager.createVault('Cake' as VaultName);
      const vn: Array<string> = [];
      (await vaultManager.listVaults()).forEach((_, vaultName) =>
        vn.push(vaultName),
      );
      expect(vn.sort()).toEqual(alteredVaultNames.sort());
      await vaultManager.destroy();
      await db.stop();

      await db.start();
      const vaultManagerReloaded = await VaultManager.createVaultManager({
        keyManager: keyManager,
        vaultsPath,
        vaultsKey,
        nodeManager,
        db,
        acl: acl,
        gestaltGraph: gestaltGraph,
        notificationsManager,
        fs,
        logger,
      });
      await vaultManagerReloaded.createVault('Pumpkin' as VaultName);
      const v102 = await vaultManagerReloaded.getVaultId(
        'Vault10' as VaultName,
      );
      expect(v102).not.toBeUndefined();
      alteredVaultNames.push('Pumpkin');
      expect((await vaultManagerReloaded.listVaults()).size).toEqual(
        alteredVaultNames.length,
      );
      const vnAltered: Array<string> = [];
      (await vaultManagerReloaded.listVaults()).forEach((_, vaultName) =>
        vnAltered.push(vaultName),
      );
      expect(vnAltered.sort()).toEqual(alteredVaultNames.sort());
      await vaultManagerReloaded.destroy();
    },
    global.defaultTimeout * 2,
  );
  describe('interacting with another node to', () => {
    let targetDataDir: string, altDataDir: string;
    let targetKeyManager: KeyManager, altKeyManager: KeyManager;
    let targetFwdProxy: ForwardProxy, altFwdProxy: ForwardProxy;
    let targetDb: DB, altDb: DB;
    let targetACL: ACL, altACL: ACL;
    let targetGestaltGraph: GestaltGraph, altGestaltGraph: GestaltGraph;
    let targetNodeManager: NodeManager, altNodeManager: NodeManager;
    let targetVaultManager: VaultManager, altVaultManager: VaultManager;
    let targetSigchain: Sigchain, altSigchain: Sigchain;
    let targetNotificationsManager: NotificationsManager,
      altNotificationsManager: NotificationsManager;

    let targetNodeId: NodeId, altNodeId: NodeId;
    let revTLSConfig: TLSConfig, targetRevTLSConfig: TLSConfig, altRevTLSConfig: TLSConfig;

    let agentService: IAgentServer, targetAgentService: IAgentServer, altAgentService: IAgentServer;
    let agentServer: GRPCServer, targetServer: GRPCServer, altServer: GRPCServer;

    let targetRevProxy: ReverseProxy, altRevProxy: ReverseProxy;

    let node: NodeInfo;

    beforeAll(async () => {
      altFwdProxy = await ForwardProxy.createForwardProxy({
        authToken: 'abc',
        logger: logger,
      });
      targetFwdProxy = await ForwardProxy.createForwardProxy({
        authToken: 'def',
        logger: logger,
      });
      altRevProxy = await ReverseProxy.createReverseProxy({
        logger: logger,
      });
      targetRevProxy = await ReverseProxy.createReverseProxy({
        logger: logger,
      });
    });

    beforeEach(async () => {
      await fwdProxy.start({
        tlsConfig: {
          keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
          certChainPem: await keyManager.getRootCertChainPem(),
        }
      });
      node = {
        id: nodeManager.getNodeId(),
        chain: { nodes: {}, identities: {} } as ChainData,
      };
      targetDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      targetKeyManager = await KeyManager.createKeyManager({
        password,
        keysPath: path.join(targetDataDir, 'keys'),
        fs: fs,
        logger: logger,
      });
      targetNodeId = targetKeyManager.getNodeId();
      revTLSConfig = {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      };
      targetRevTLSConfig = {
        keyPrivatePem: targetKeyManager.getRootKeyPairPem().privateKey,
        certChainPem: await targetKeyManager.getRootCertChainPem(),
      };
      await targetFwdProxy.start({
        tlsConfig: {
          keyPrivatePem: targetKeyManager.getRootKeyPairPem().privateKey,
          certChainPem: await targetKeyManager.getRootCertChainPem(),
        }
      });
      targetDb = await DB.createDB({
        dbPath: path.join(targetDataDir, 'db'),
        logger: logger,
        crypto: makeCrypto(keyManager),
      });
      await targetDb.start();
      targetSigchain = await Sigchain.createSigchain({
        keyManager: targetKeyManager,
        db: targetDb,
        logger: logger,
      });
      targetNodeManager = await NodeManager.createNodeManager({
        db: targetDb,
        sigchain: targetSigchain,
        keyManager: targetKeyManager,
        fwdProxy: targetFwdProxy,
        revProxy: targetRevProxy,
        fs: fs,
        logger: logger,
      });
      await targetNodeManager.start();
      targetACL = await ACL.createACL({
        db: targetDb,
        logger: logger,
      });
      targetNotificationsManager =
        await NotificationsManager.createNotificationsManager({
          acl: targetACL,
          db: targetDb,
          nodeManager: targetNodeManager,
          keyManager: targetKeyManager,
          messageCap: 5,
          logger: logger,
        });
      targetGestaltGraph = await GestaltGraph.createGestaltGraph({
        db: targetDb,
        acl: targetACL,
        logger: logger,
      });
      await targetGestaltGraph.setNode(node);
      const targetVaultKey = await vaultUtils.generateVaultKey();
      targetVaultManager = await VaultManager.createVaultManager({
        keyManager: keyManager,
        vaultsPath: path.join(targetDataDir, 'vaults'),
        vaultsKey: targetVaultKey,
        nodeManager: targetNodeManager,
        db: targetDb,
        acl: targetACL,
        gestaltGraph: targetGestaltGraph,
        notificationsManager: targetNotificationsManager,
        logger: logger,
        fresh: true,
      });
      targetAgentService = createAgentService({
        keyManager: targetKeyManager,
        vaultManager: targetVaultManager,
        nodeManager: targetNodeManager,
        sigchain: targetSigchain,
        notificationsManager: targetNotificationsManager,
        acl: targetACL,
      });
      targetServer = await GRPCServer.createGRPCServer({
        logger: logger,
      });
      await targetServer.start({
        services: [[AgentService, targetAgentService]],
      });

      altDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      altKeyManager = await KeyManager.createKeyManager({
        password,
        keysPath: path.join(altDataDir, 'keys'),
        fs: fs,
        logger: logger,
      });
      altNodeId = altKeyManager.getNodeId();
      await targetGestaltGraph.setNode({
        id: altNodeId,
        chain: {},
      });
      altRevTLSConfig = {
        keyPrivatePem: altKeyManager.getRootKeyPairPem().privateKey,
        certChainPem: await altKeyManager.getRootCertChainPem(),
      };
      await altFwdProxy.start({
        tlsConfig: {
          keyPrivatePem: altKeyManager.getRootKeyPairPem().privateKey,
          certChainPem: await altKeyManager.getRootCertChainPem(),
        }
      });
      altDb = await DB.createDB({
        dbPath: path.join(altDataDir, 'db'),
        logger: logger,
        crypto: makeCrypto(keyManager),
      });
      await altDb.start();
      altSigchain = await Sigchain.createSigchain({
        keyManager: altKeyManager,
        db: altDb,
        logger: logger,
      });
      altNodeManager = await NodeManager.createNodeManager({
        db: altDb,
        sigchain: altSigchain,
        keyManager: altKeyManager,
        fwdProxy: altFwdProxy,
        revProxy: altRevProxy,
        fs: fs,
        logger: logger,
      });
      await altNodeManager.start();
      altACL = await ACL.createACL({
        db: altDb,
        logger: logger,
      });
      altNotificationsManager =
        await NotificationsManager.createNotificationsManager({
          acl: altACL,
          db: altDb,
          nodeManager: altNodeManager,
          keyManager: altKeyManager,
          messageCap: 5,
          logger: logger,
        });
      altGestaltGraph = await GestaltGraph.createGestaltGraph({
        db: altDb,
        acl: altACL,
        logger: logger,
      });
      await altGestaltGraph.setNode(node);
      const altVaultKey = await vaultUtils.generateVaultKey();
      altVaultManager = await VaultManager.createVaultManager({
        keyManager: keyManager,
        vaultsPath: path.join(altDataDir, 'vaults'),
        vaultsKey: altVaultKey,
        nodeManager: altNodeManager,
        db: altDb,
        acl: altACL,
        notificationsManager: altNotificationsManager,
        gestaltGraph: altGestaltGraph,
        logger: logger,
      });
      altAgentService = createAgentService({
        keyManager: altKeyManager,
        vaultManager: altVaultManager,
        nodeManager: altNodeManager,
        sigchain: altSigchain,
        notificationsManager: altNotificationsManager,
        acl: altACL,
      });

      altServer = await GRPCServer.createGRPCServer({
        logger: logger,
      });

      await altServer.start({
        services: [[AgentService, altAgentService]],
      });

      agentService = createAgentService({
        keyManager: keyManager,
        vaultManager: vaultManager,
        nodeManager: nodeManager,
        sigchain: sigchain,
        notificationsManager: notificationsManager,
        acl: acl,
      });

      agentServer = await GRPCServer.createGRPCServer({
        logger: logger,
      });

      await agentServer.start({
        services: [[AgentService, agentService]],
      });

      await revProxy.start({
        serverHost: agentServer.getHost(),
        serverPort: agentServer.getPort(),
        tlsConfig: revTLSConfig,
      });

      await targetRevProxy.start({
        serverHost: targetServer.getHost(),
        serverPort: targetServer.getPort(),
        tlsConfig: targetRevTLSConfig,
      });

      await altRevProxy.start({
        serverHost: altServer.getHost(),
        serverPort: altServer.getPort(),
        tlsConfig: altRevTLSConfig,
      });

      await acl.setNodePerm(targetNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });

      await acl.setNodePerm(altNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });

      await altACL.setNodePerm(targetNodeId, {
        gestalt: {
          notify: null,
        },
        vaults: {},
      });

    }, global.polykeyStartupTimeout * 2);

    afterEach(async () => {
      await revProxy.stop();
      await targetRevProxy.stop();
      await altRevProxy.stop();
      await agentServer.stop();
      await targetServer.stop();
      await targetVaultManager.destroy();
      await targetGestaltGraph.destroy();
      await targetNotificationsManager.destroy();
      await targetACL.destroy();
      await targetDb.stop();
      await targetNodeManager.stop();
      await targetKeyManager.destroy();
      await fs.promises.rm(targetDataDir, {
        force: true,
        recursive: true,
      });
      await altServer.stop();
      await altGestaltGraph.destroy();
      await altVaultManager.destroy();
      await altNotificationsManager.destroy();
      await altACL.destroy();
      await altDb.stop();
      await altNodeManager.stop();
      await altKeyManager.destroy();
      await targetFwdProxy.stop();
      await altFwdProxy.stop();
      await fs.promises.rm(altDataDir, {
        force: true,
        recursive: true,
      });
    });

    test(
      'clone vaults using a vault name',
      async () => {
        const firstVault = await targetVaultManager.createVault(vaultName);
        const names: string[] = [];
        for (let i = 0; i < 5; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Success?';
          await vaultOps.addSecret(firstVault, name, content);
        }
        await nodeManager.setNode(targetNodeId, {
          ip: targetRevProxy.getIngressHost(),
          port: targetRevProxy.getIngressPort(),
        } as NodeAddress);
        await targetNodeManager.setNode(nodeManager.getNodeId(), {
          ip: revProxy.getIngressHost(),
          port: revProxy.getIngressPort(),
        } as NodeAddress);
        await targetVaultManager.shareVault(
          firstVault.vaultId,
          nodeManager.getNodeId(),
        );
        await vaultManager.cloneVault(targetNodeId, vaultName);
        const vaultId = await vaultManager.getVaultId(vaultName);
        const vaultClone = await vaultManager.openVault(vaultId!);
        let file = await vaultClone.access(async (efs) => {
          return await efs.readFile('secret 0', { encoding: 'utf8' });
        });
        expect(file).toBe('Success?');
        expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
          names.sort(),
        );
      },
      global.defaultTimeout * 2,
    );
    test(
      'clone and pull vaults using a vault id',
      async () => {
        const firstVault = await targetVaultManager.createVault(vaultName);
        await nodeManager.setNode(targetNodeId, {
          ip: targetRevProxy.getIngressHost(),
          port: targetRevProxy.getIngressPort(),
        } as NodeAddress);
        await targetNodeManager.setNode(nodeManager.getNodeId(), {
          ip: revProxy.getIngressHost(),
          port: revProxy.getIngressPort(),
        } as NodeAddress);
        await targetVaultManager.shareVault(
          firstVault.vaultId,
          nodeManager.getNodeId(),
        );
        const names: string[] = [];
        for (let i = 0; i < 5; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Success?';
          await vaultOps.addSecret(firstVault, name, content);
        }
        await vaultManager.cloneVault(targetNodeId, firstVault.vaultId);
        const vaultId = await vaultManager.getVaultId(vaultName);
        const vaultClone = await vaultManager.openVault(vaultId!);
        let file = await vaultClone.access(async (efs) => {
          return await efs.readFile('secret 0', { encoding: 'utf8' });
        });
        expect(file).toBe('Success?');
        expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
          names.sort(),
        );
        for (let i = 5; i < 10; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Second Success?';
          await vaultOps.addSecret(firstVault, name, content);
        }
        await vaultManager.pullVault({ vaultId: vaultClone.vaultId });
        file = await vaultClone.access(async (efs) => {
          return await efs.readFile('secret 5', { encoding: 'utf8' });
        });
        expect(file).toBe('Second Success?');
        expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
          names.sort(),
        );
      },
      global.defaultTimeout * 2,
    );
    // FIXME: Errors aren't being handled over GRPC
    test.skip(
      'reject cloning and pulling when permissions are not set',
      async () => {
        const vault = await targetVaultManager.createVault(vaultName);
        await nodeManager.setNode(targetNodeId, {
          ip: targetRevProxy.getIngressHost(),
          port: targetRevProxy.getIngressPort(),
        } as NodeAddress);
        await targetNodeManager.setNode(nodeManager.getNodeId(), {
          ip: revProxy.getIngressHost(),
          port: revProxy.getIngressPort(),
        } as NodeAddress);
        await vaultOps.addSecret(vault, 'MyFirstSecret', 'Success?');
        await expect(() =>
          vaultManager.cloneVault(targetNodeId, vault.vaultId),
        ).rejects.toThrow(vaultErrors.ErrorVaultPermissionDenied);
        await expect(vaultManager.listVaults()).resolves.toStrictEqual([]);
        await targetVaultManager.shareVault(
          vault.vaultId,
          nodeManager.getNodeId()
        );
        const clonedVault = await vaultManager.cloneVault(targetNodeId, vault.vaultId);
        const file = await clonedVault.access(async (efs) => {
          return await efs.readFile('MyFirstSecret', { encoding: 'utf8' });
        })
        expect(file).toBe('Success?');
        await targetVaultManager.unshareVault(
          vault.vaultId,
          nodeManager.getNodeId()
        );
        vaultOps.addSecret(vault, 'MySecondSecret', 'SecondSuccess?');
        await expect(() =>
          vaultManager.pullVault({ vaultId: clonedVault.vaultId }),
        ).rejects.toThrow(vaultErrors.ErrorVaultPermissionDenied);
        await expect(vaultOps.listSecrets(clonedVault)).resolves.toStrictEqual(
          ['MyFirstSecret'],
        );
      },
      global.defaultTimeout * 2,
    );
    test(
      'throw when encountering merge conflicts',
      async () => {
        const vault = await targetVaultManager.createVault(vaultName);
        await nodeManager.setNode(targetNodeId, {
          ip: targetRevProxy.getIngressHost(),
          port: targetRevProxy.getIngressPort(),
        } as NodeAddress);
        await targetNodeManager.setNode(nodeManager.getNodeId(), {
          ip: revProxy.getIngressHost(),
          port: revProxy.getIngressPort(),
        } as NodeAddress);
        await targetVaultManager.shareVault(
          vault.vaultId,
          nodeManager.getNodeId()
        );
        const names: string[] = [];
        for (let i = 0; i < 5; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Success?';
          await vaultOps.addSecret(vault, name, content);
        }
        await vaultOps.mkdir(vault, 'dir', { recursive: true });
        const cloneVault = await vaultManager.cloneVault(targetNodeId, vault.vaultId);
        await vaultOps.renameSecret(cloneVault, 'secret 4', 'secret 5');
        await vaultOps.renameSecret(vault, 'secret 4', 'causing merge conflict');
        await expect(() =>
          vaultManager.pullVault({ vaultId: cloneVault.vaultId }),
        ).rejects.toThrow(vaultErrors.ErrorVaultMergeConflict);
      },
      global.defaultTimeout * 2,
    );
    test(
      'clone and pull from other cloned vaults',
      async () => {
        const vault = await targetVaultManager.createVault(vaultName);
        await nodeManager.setNode(targetNodeId, {
          ip: targetRevProxy.getIngressHost(),
          port: targetRevProxy.getIngressPort(),
        } as NodeAddress);
        await targetNodeManager.setNode(nodeManager.getNodeId(), {
          ip: revProxy.getIngressHost(),
          port: revProxy.getIngressPort(),
        } as NodeAddress);
        await nodeManager.setNode(altNodeId, {
          ip: altRevProxy.getIngressHost(),
          port: altRevProxy.getIngressPort(),
        } as NodeAddress);
        await altNodeManager.setNode(nodeManager.getNodeId(), {
          ip: revProxy.getIngressHost(),
          port: revProxy.getIngressPort(),
        } as NodeAddress);
        await altNodeManager.setNode(targetNodeId, {
          ip: targetRevProxy.getIngressHost(),
          port: targetRevProxy.getIngressPort(),
        } as NodeAddress);
        await targetNodeManager.setNode(altNodeId, {
          ip: altRevProxy.getIngressHost(),
          port: altRevProxy.getIngressPort(),
        } as NodeAddress);
        await targetVaultManager.shareVault(
          vault.vaultId,
          altNodeManager.getNodeId(),
        );
        await targetVaultManager.shareVault(
          vault.vaultId,
          nodeManager.getNodeId()
        );
        const names: string[] = [];
        for (let i = 0; i < 5; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Success?';
          await vaultOps.addSecret(vault, name, content);
        }
        const clonedVaultAlt = await altVaultManager.cloneVault(targetNodeId, vault.vaultId);
        await altVaultManager.shareVault(
          clonedVaultAlt.vaultId,
          nodeManager.getNodeId()
        );
        await vaultManager.cloneVault(altNodeId, clonedVaultAlt.vaultId);
        const vaultIdClone = await vaultManager.getVaultId(vaultName);
        const vaultClone = await vaultManager.openVault(vaultIdClone!);
        expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
          names.sort(),
        );
        for (let i = 5; i < 10; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Success?';
          await vaultOps.addSecret(vault, name, content);
        }
        await vaultManager.pullVault({ vaultId: vaultClone.vaultId, pullNodeId: targetNodeId, pullVaultNameOrId: vault.vaultId });
        expect((await vaultOps.listSecrets(vaultClone)).sort()).toStrictEqual(
          names.sort(),
        );
      },
      global.defaultTimeout * 2,
    );
  });
});
