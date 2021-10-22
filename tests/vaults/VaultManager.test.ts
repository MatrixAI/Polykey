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

  // FIXME, try not to do this, they can all have the localhost,
  //  but use the generated port when the server is started.
  const sourceHost = '127.0.0.1' as Host;
  const sourcePort = 11112 as Port;
  const targetHost = '127.0.0.2' as Host;
  const targetPort = 11113 as Port;
  const altHost = '127.0.0.3' as Host;
  const altPort = 11114 as Port;
  const altHostIn = '127.0.0.4' as Host;
  const altPortIn = 11115 as Port;

  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;
  let altRevProxy: ReverseProxy;

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
    altRevProxy = await ReverseProxy.createReverseProxy({
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

    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
      egressHost: sourceHost,
      egressPort: sourcePort,
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
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  afterAll(async () => {
    await fwdProxy.stop();
  });
  test('is type correct', () => {
    expect(vaultManager).toBeInstanceOf(VaultManager);
  });
  test('can create many vaults and open a vault', async () => {
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
  }, global.defaultTimeout * 2);
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
  test.skip('cannot concurrently create the same vault', async () => {
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
  // Test('able to update the default node repo to pull from', async () => {
  //   await vaultManager.start({});
  //   const vault1 = await vaultManager.createVault('MyTestVault');
  //   const vault2 = await vaultManager.createVault('MyOtherTestVault');
  //   const noNode = await vaultManager.getDefaultNode(vault1.vaultId);
  //   expect(noNode).toBeUndefined();
  //   await vaultManager.setDefaultNode(vault1.vaultId, 'abc' as NodeId);
  //   const node = await vaultManager.getDefaultNode(vault1.vaultId);
  //   const noNode2 = await vaultManager.getDefaultNode(vault2.vaultId);
  //   expect(node).toBe('abc');
  //   expect(noNode2).toBeUndefined();
  //   await vaultManager.stop();
  // });
  // test('checking gestalt permissions for vaults', async () => {
  //   const node1: NodeInfo = {
  //     id: '123' as NodeId,
  //     chain: { nodes: {}, identities: {} } as ChainData,
  //   };
  //   const node2: NodeInfo = {
  //     id: '345' as NodeId,
  //     chain: { nodes: {}, identities: {} } as ChainData,
  //   };
  //   const node3: NodeInfo = {
  //     id: '678' as NodeId,
  //     chain: { nodes: {}, identities: {} } as ChainData,
  //   };
  //   const node4: NodeInfo = {
  //     id: '890' as NodeId,
  //     chain: { nodes: {}, identities: {} } as ChainData,
  //   };
  //   const id1: IdentityInfo = {
  //     providerId: 'github.com' as ProviderId,
  //     identityId: 'abc' as IdentityId,
  //     claims: {
  //       nodes: {},
  //     } as ChainData,
  //   };
  //   const id2: IdentityInfo = {
  //     providerId: 'github.com' as ProviderId,
  //     identityId: 'def' as IdentityId,
  //     claims: {
  //       nodes: {},
  //     } as ChainData,
  //   };

  //   await gestaltGraph.setNode(node1);
  //   await gestaltGraph.setNode(node2);
  //   await gestaltGraph.setNode(node3);
  //   await gestaltGraph.setNode(node4);
  //   await gestaltGraph.setIdentity(id1);
  //   await gestaltGraph.setIdentity(id2);
  //   await gestaltGraph.linkNodeAndNode(node1, node2);
  //   await gestaltGraph.linkNodeAndIdentity(node1, id1);
  //   await gestaltGraph.linkNodeAndIdentity(node4, id2);

  //   await vaultManager.start({});
  //   const vault = await vaultManager.createVault('Test');
  //   await vaultManager.setVaultPermissions('123' as NodeId, vault.vaultId);
  //   let record = await vaultManager.getVaultPermissions(vault.vaultId);
  //   expect(record).not.toBeUndefined();
  //   expect(record['123']['pull']).toBeNull();
  //   expect(record['345']['pull']).toBeNull();
  //   expect(record['678']).toBeUndefined();
  //   expect(record['890']).toBeUndefined();

  //   await vaultManager.unsetVaultPermissions('345' as NodeId, vault.vaultId);
  //   record = await vaultManager.getVaultPermissions(vault.vaultId);
  //   expect(record).not.toBeUndefined();
  //   expect(record['123']['pull']).toBeUndefined();
  //   expect(record['345']['pull']).toBeUndefined();

  //   await gestaltGraph.unlinkNodeAndNode(node1.id, node2.id);
  //   await vaultManager.setVaultPermissions('345' as NodeId, vault.vaultId);
  //   record = await vaultManager.getVaultPermissions(vault.vaultId);
  //   expect(record).not.toBeUndefined();
  //   expect(record['123']['pull']).toBeUndefined();
  //   expect(record['345']['pull']).toBeNull();

  //   await vaultManager.stop();
  // });
  // /* TESTING TODO:
  //  *  Changing the default node to pull from
  //  */
  describe('interacting with another node to', () => {
    let targetDataDir: string, altDataDir: string;
    let targetKeyManager: KeyManager, altKeyManager: KeyManager;
    let targetFwdProxy: ForwardProxy;
    let targetDb: DB, altDb: DB;
    let targetACL: ACL, altACL: ACL;
    let targetGestaltGraph: GestaltGraph, altGestaltGraph: GestaltGraph;
    let targetNodeManager: NodeManager, altNodeManager: NodeManager;
    let targetVaultManager: VaultManager, altVaultManager: VaultManager;
    let targetSigchain: Sigchain, altSigchain: Sigchain;
    let targetNotificationsManager: NotificationsManager,
      altNotificationsManager: NotificationsManager;

    let targetNodeId: NodeId, altNodeId: NodeId;
    let revTLSConfig: TLSConfig, altRevTLSConfig: TLSConfig;

    let targetAgentService: IAgentServer, altAgentService: IAgentServer;
    let targetServer: GRPCServer, altServer: GRPCServer;

    let node: NodeInfo;

    let altFwdProxy: ForwardProxy;

    beforeAll(async () => {
      altFwdProxy = await ForwardProxy.createForwardProxy({
        authToken: 'abc',
        logger: logger,
      });
    });

    beforeEach(async () => {
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
        keyPrivatePem: targetKeyManager.getRootKeyPairPem().privateKey,
        certChainPem: await targetKeyManager.getRootCertChainPem(),
      };
      targetFwdProxy = await ForwardProxy.createForwardProxy({
        authToken: '',
        logger: logger,
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
        revProxy: revProxy,
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
        logger: logger,
        fresh: true,
      });
      targetAgentService = createAgentService({
        keyManager: targetKeyManager,
        vaultManager: targetVaultManager,
        nodeManager: targetNodeManager,
        sigchain: targetSigchain,
        notificationsManager: targetNotificationsManager,
      });
      targetServer = await GRPCServer.createGRPCServer({
        logger: logger,
      });
      await targetServer.start({
        services: [[AgentService, targetAgentService]],
        host: targetHost,
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
        },
        egressHost: altHost,
        egressPort: altPort,
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
        gestaltGraph: altGestaltGraph,
        logger: logger,
      });
      altAgentService = createAgentService({
        keyManager: altKeyManager,
        vaultManager: altVaultManager,
        nodeManager: altNodeManager,
        sigchain: altSigchain,
        notificationsManager: altNotificationsManager,
      });
      altServer = await GRPCServer.createGRPCServer({
        logger: logger,
      });
      await altServer.start({
        services: [[AgentService, altAgentService]],
        host: altHostIn,
      });

      await revProxy.start({
        ingressHost: targetHost,
        ingressPort: targetPort,
        serverHost: targetHost,
        serverPort: targetServer.getPort(),
        tlsConfig: revTLSConfig,
      });

      await altRevProxy.start({
        ingressHost: altHostIn,
        ingressPort: altPortIn,
        serverHost: altHostIn,
        serverPort: altServer.getPort(),
        tlsConfig: altRevTLSConfig,
      });
    }, global.polykeyStartupTimeout * 2);

    afterEach(async () => {
      await revProxy.closeConnection(altHost, altPort);
      await revProxy.closeConnection(sourceHost, sourcePort);
      await altRevProxy.closeConnection(sourceHost, sourcePort);
      await fwdProxy.closeConnection(
        fwdProxy.getEgressHost(),
        fwdProxy.getEgressPort(),
      );
      await altFwdProxy.closeConnection(
        altFwdProxy.getEgressHost(),
        altFwdProxy.getEgressPort(),
      );
      await revProxy.stop();
      await altRevProxy.stop();
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
      await fs.promises.rm(altDataDir, {
        force: true,
        recursive: true,
      });
    });

    afterAll(async () => {
      await altFwdProxy.stop();
    });

    test(
      'clone and pull vaults',
      async () => {
        // Await vaultManager.createVault(vaultName);
        // await vaultManager.createVault('MyFirstVault copy');
        const vault = await targetVaultManager.createVault(vaultName);
        // Await targetVaultManager.setVaultPermissions(
        //   nodeManager.getNodeId(),
        //   vault.vaultId,
        // );
        const names: string[] = [];
        for (let i = 0; i < 1; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Success?';
          await vaultOps.addSecret(vault, name, content);
        }
        await nodeManager.setNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await nodeManager.getConnectionToNode(targetNodeId);
        await revProxy.openConnection(sourceHost, sourcePort);
        await vaultManager.cloneVault(targetNodeId, vault.vaultId);
        const vaultId = await vaultManager.getVaultId(vaultName);
        const vaultClone = await vaultManager.openVault(vaultId!);
        let file = await vaultClone.access(async (efs) => {
          return await efs.readFile('secret 0', { encoding: 'utf8' });
        });
        expect(file).toBe('Success?');
        // Expect(vaultsList[2].name).toStrictEqual('MyFirstVault copy copy');
        // await expect(
        //   vaultManager.getDefaultNode(vaultsList[2].id),
        // ).resolves.toBe(targetNodeId);
        // const clonedVault = await vaultManager.getVault(vaultsList[2].id);
        // expect(await clonedVault.getSecret('secret 9')).toStrictEqual(
        //   'Success?',
        // );
        // expect((await clonedVault.listSecrets()).sort()).toStrictEqual(
        //   names.sort(),
        // );
        for (let i = 1; i < 2; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Second Success?';
          await vaultOps.addSecret(vault, name, content);
        }
        await vaultManager.pullVault({ vaultId: vaultClone.vaultId });
        file = await vaultClone.access(async (efs) => {
          return await efs.readFile('secret 1', { encoding: 'utf8' });
        });
        expect(file).toBe('Second Success?');
        // Expect((await clonedVault.listSecrets()).sort()).toStrictEqual(
        //   names.sort(),
        // );
        // expect(await clonedVault.getSecret('secret 19')).toStrictEqual(
        //   'Second Success?',
        // );
      },
      global.defaultTimeout * 2,
    );
    //   Test(
    //     'reject clone and pull ops when permissions are not set',
    //     async () => {
    //       await vaultManager.start({});
    //       const vault = await targetVaultManager.createVault('MyFirstVault');
    //       await vault.addSecret('MyFirstSecret', 'Success?');
    //       await nodeManager.setNode(targetNodeId, {
    //         ip: targetHost,
    //         port: targetPort,
    //       } as NodeAddress);
    //       await nodeManager.getConnectionToNode(targetNodeId);
    //       await revProxy.openConnection(sourceHost, sourcePort);
    //       await expect(() =>
    //         vaultManager.cloneVault(vault.vaultId, targetNodeId),
    //       ).rejects.toThrow(gitErrors.ErrorGitPermissionDenied);
    //       const vaultsList = await vaultManager.listVaults();
    //       expect(vaultsList).toStrictEqual([]);
    //       await targetVaultManager.setVaultPermissions(
    //         nodeManager.getNodeId(),
    //         vault.vaultId,
    //       );
    //       await vaultManager.cloneVault(vault.vaultId, targetNodeId);
    //       const vaultList = await vaultManager.listVaults();
    //       await targetVaultManager.unsetVaultPermissions(
    //         nodeManager.getNodeId(),
    //         vault.vaultId,
    //       );
    //       vault.addSecret('MySecondSecret', 'SecondSuccess?');
    //       await expect(() =>
    //         vaultManager.pullVault(vaultList[0].id, targetNodeId),
    //       ).rejects.toThrow(gitErrors.ErrorGitPermissionDenied);
    //       const list = await vaultManager.listVaults();
    //       const clonedVault = await vaultManager.getVault(list[0].id);
    //       expect((await clonedVault.listSecrets()).sort()).toStrictEqual(
    //         ['MyFirstSecret'].sort(),
    //       );
    //       await vaultManager.stop();
    //     },
    //     global.defaultTimeout * 2,
    //   );
    //   test(
    //     'handle vault conflicts',
    //     async () => {
    //       await vaultManager.start({});
    //       const vault = await targetVaultManager.createVault('MyFirstVault');
    //       await targetVaultManager.setVaultPermissions(
    //         nodeManager.getNodeId(),
    //         vault.vaultId,
    //       );
    //       const names: string[] = [];
    //       for (let i = 0; i < 10; i++) {
    //         const name = 'secret ' + i.toString();
    //         names.push(name);
    //         const content = 'Success?';
    //         await vault.addSecret(name, content);
    //       }
    //       await vault.mkdir('dir', { recursive: true });
    //       await nodeManager.setNode(targetNodeId, {
    //         ip: targetHost,
    //         port: targetPort,
    //       } as NodeAddress);
    //       await nodeManager.getConnectionToNode(targetNodeId);
    //       await revProxy.openConnection(sourceHost, sourcePort);
    //       await vaultManager.cloneVault(vault.vaultId, targetNodeId);
    //       const vaultList = await vaultManager.listVaults();
    //       const clonedVault = await vaultManager.getVault(vaultList[0].id);
    //       await clonedVault.renameSecret('secret 9', 'secret 10');
    //       await vault.renameSecret('secret 9', 'causing merge conflict');
    //       await expect(() =>
    //         vaultManager.pullVault(clonedVault.vaultId),
    //       ).rejects.toThrow(vaultErrors.ErrorVaultMergeConflict);
    //     },
    //     global.defaultTimeout * 2,
    //   );
    //   test(
    //     'clone and pull from a default node',
    //     async () => {
    //       await vaultManager.start({});
    //       const vault = await targetVaultManager.createVault('MyFirstVault');
    //       await targetVaultManager.setVaultPermissions(
    //         altNodeManager.getNodeId(),
    //         vault.vaultId,
    //       );
    //       await targetVaultManager.setVaultPermissions(
    //         nodeManager.getNodeId(),
    //         vault.vaultId,
    //       );
    //       const names: string[] = [];
    //       for (let i = 0; i < 10; i++) {
    //         const name = 'secret ' + i.toString();
    //         names.push(name);
    //         const content = 'Success?';
    //         await vault.addSecret(name, content);
    //       }
    //       await altNodeManager.setNode(targetNodeId, {
    //         ip: targetHost,
    //         port: targetPort,
    //       } as NodeAddress);
    //       await altNodeManager.getConnectionToNode(targetNodeId);
    //       await revProxy.openConnection(altHost, altPort);
    //       await altVaultManager.cloneVault(vault.vaultId, targetNodeId);
    //       const altVaultsList = await altVaultManager.listVaults();
    //       expect(altVaultsList[0].name).toStrictEqual('MyFirstVault');
    //       await nodeManager.setNode(targetNodeId, {
    //         ip: targetHost,
    //         port: targetPort,
    //       } as NodeAddress);
    //       await nodeManager.getConnectionToNode(targetNodeId);
    //       await revProxy.openConnection(sourceHost, sourcePort);
    //       await vaultManager.cloneVault(vault.vaultId, targetNodeId);
    //       await altVaultManager.setVaultPermissions(
    //         nodeManager.getNodeId(),
    //         altVaultsList[0].id,
    //       );
    //       const vaultsList = await vaultManager.listVaults();
    //       expect(vaultsList[0].name).toStrictEqual('MyFirstVault');
    //       const clonedVault = await vaultManager.getVault(vaultsList[0].id);
    //       const altClonedVault = await altVaultManager.getVault(
    //         altVaultsList[0].id,
    //       );
    //       await altClonedVault.updateSecret('secret 9', 'this is new');
    //       await nodeManager.setNode(altNodeId, {
    //         ip: altHostIn,
    //         port: altPortIn,
    //       } as NodeAddress);
    //       await nodeManager.getConnectionToNode(altNodeId);
    //       await altRevProxy.openConnection(sourceHost, sourcePort);
    //       await vaultManager.pullVault(clonedVault.vaultId, altNodeId);
    //       expect(await clonedVault.getSecret('secret 9')).toStrictEqual(
    //         'this is new',
    //       );
    //       await altClonedVault.addSecret('secret 10', 'default pull?');
    //       await vaultManager.pullVault(clonedVault.vaultId);
    //       expect(await clonedVault.getSecret('secret 10')).toStrictEqual(
    //         'default pull?',
    //       );
    //     },
    //     global.defaultTimeout * 2,
    //   );
    //   test(
    //     'clone and pull within a system of 3 nodes',
    //     async () => {
    //       await vaultManager.start({});
    //       const vault = await targetVaultManager.createVault('MyFirstVault');
    //       await targetVaultManager.setVaultPermissions(
    //         altNodeManager.getNodeId(),
    //         vault.vaultId,
    //       );
    //       await targetVaultManager.setVaultPermissions(
    //         nodeManager.getNodeId(),
    //         vault.vaultId,
    //       );
    //       const names: string[] = [];
    //       for (let i = 0; i < 10; i++) {
    //         const name = 'secret ' + i.toString();
    //         names.push(name);
    //         const content = 'Success?';
    //         await vault.addSecret(name, content);
    //       }
    //       await altNodeManager.setNode(targetNodeId, {
    //         ip: targetHost,
    //         port: targetPort,
    //       } as NodeAddress);
    //       await altNodeManager.getConnectionToNode(targetNodeId);
    //       await revProxy.openConnection(altHost, altPort);
    //       await altVaultManager.cloneVault(vault.vaultId, targetNodeId);
    //       const altVaultsList = await altVaultManager.listVaults();
    //       expect(altVaultsList[0].name).toStrictEqual('MyFirstVault');
    //       await nodeManager.setNode(targetNodeId, {
    //         ip: targetHost,
    //         port: targetPort,
    //       } as NodeAddress);
    //       await nodeManager.getConnectionToNode(targetNodeId);
    //       await revProxy.openConnection(sourceHost, sourcePort);
    //       await vaultManager.cloneVault(vault.vaultId, targetNodeId);
    //       await altVaultManager.setVaultPermissions(
    //         nodeManager.getNodeId(),
    //         altVaultsList[0].id,
    //       );
    //       const vaultsList = await vaultManager.listVaults();
    //       expect(vaultsList[0].name).toStrictEqual('MyFirstVault');
    //       const clonedVault = await vaultManager.getVault(vaultsList[0].id);
    //       const altClonedVault = await altVaultManager.getVault(
    //         altVaultsList[0].id,
    //       );
    //       await altClonedVault.updateSecret('secret 9', 'this is new');
    //       await nodeManager.setNode(altNodeId, {
    //         ip: altHostIn,
    //         port: altPortIn,
    //       } as NodeAddress);
    //       await nodeManager.getConnectionToNode(altNodeId);
    //       await altRevProxy.openConnection(sourceHost, sourcePort);
    //       await vaultManager.pullVault(clonedVault.vaultId, altNodeId);
    //       expect(await clonedVault.getSecret('secret 9')).toStrictEqual(
    //         'this is new',
    //       );
    //     },
    //     global.defaultTimeout * 2,
    //   );
  });
});
