import type { NodeId, NodeAddress, NodeInfo } from '@/nodes/types';
import type { ProviderId, IdentityId, IdentityInfo } from '@/identities/types';
import type { Host, Port, TLSConfig } from '@/network/types';
import type { VaultId } from '@/vaults/types';
import type { ChainData } from '@/sigchain/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { KeyManager } from '@/keys';
import { NodeManager } from '@/nodes';
import { Sigchain } from '@/sigchain';
import { VaultManager } from '@/vaults';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { DB } from '@/db';
import { ForwardProxy, ReverseProxy } from '@/network';
import GRPCServer from '@/grpc/GRPCServer';
import { AgentService, createAgentService } from '@/agent';
import { NotificationsManager } from '@/notifications';
import { IAgentServer } from '@/proto/js/Agent_grpc_pb';

import { errors as vaultErrors } from '@/vaults';
import { errors as gitErrors } from '@/git';

describe('VaultManager is', () => {
  const logger = new Logger('VaultManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let nodeManager: NodeManager;
  let vaultManager: VaultManager;
  let sigchain: Sigchain;

  const sourceHost = '127.0.0.1' as Host;
  const sourcePort = 11112 as Port;
  const targetHost = '127.0.0.2' as Host;
  const targetPort = 11113 as Port;
  const altHost = '127.0.0.3' as Host;
  const altPort = 11114 as Port;
  const altHostIn = '127.0.0.4' as Host;
  const altPortIn = 11115 as Port;

  const fwdProxy = new ForwardProxy({
    authToken: 'abc',
    logger: logger,
  });
  const revProxy = new ReverseProxy({
    logger: logger,
  });
  const altRevProxy = new ReverseProxy({
    logger: logger,
  });

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    const vaultsPath = path.join(dataDir, 'vaults');

    keyManager = await KeyManager.createKeyManager({
      keysPath: keysPath,
      logger: logger,
    });
    await keyManager.start({
      password: 'password',
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
    });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });

    sigchain = new Sigchain({
      keyManager: keyManager,
      db: db,
      logger: logger,
    });
    await sigchain.start();

    nodeManager = new NodeManager({
      db: db,
      sigchain: sigchain,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });
    await nodeManager.start();

    acl = new ACL({
      db: db,
      logger: logger,
    });
    await acl.start();

    gestaltGraph = new GestaltGraph({
      db: db,
      acl: acl,
      logger: logger,
    });
    await gestaltGraph.start();

    vaultManager = new VaultManager({
      vaultsPath: vaultsPath,
      keyManager: keyManager,
      nodeManager: nodeManager,
      db: db,
      acl: acl,
      gestaltGraph: gestaltGraph,
      fs: fs,
      logger: logger,
    });
  });
  afterEach(async () => {
    await gestaltGraph.stop();
    await acl.stop();
    await db.stop();
    await nodeManager.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  afterAll(async () => {
    await fwdProxy.stop();
  });
  test('type correct', () => {
    expect(vaultManager).toBeInstanceOf(VaultManager);
  });
  test('starting and stopping', async () => {
    await vaultManager.start({ fresh: true });
    expect(vaultManager.started).toBe(true);
    await expect(fs.promises.readdir(dataDir)).resolves.toContain('vaults');
    await vaultManager.stop();
  });
  test('able to create a vault', async () => {
    await vaultManager.start({});
    const vault = await vaultManager.createVault('MyTestVault');
    expect(vault).toBeTruthy();
    await expect(
      fs.promises.readdir(path.join(dataDir, 'vaults')),
    ).resolves.toContain(vault.vaultId);
    await vaultManager.stop();
  });
  test('able to create and get a vault', async () => {
    await vaultManager.start({});
    const vault = await vaultManager.createVault('MyTestVault');
    const theVault = await vaultManager.getVault(vault.vaultId);

    expect(vault).toBe(theVault);
    await expect(
      vaultManager.getVault('DoesNotExist' as VaultId),
    ).rejects.toThrow(vaultErrors.ErrorVaultUndefined);

    await vaultManager.stop();
  });
  test('able to rename a vault', async () => {
    await vaultManager.start({});
    const vault = await vaultManager.createVault('TestVault');
    const result = await vaultManager.renameVault(vault.vaultId, 'BetterVault');
    expect(result).toBe(true);
    await expect(vaultManager.getVault(vault.vaultId)).resolves.toBe(vault);
    await expect(
      vaultManager.renameVault('DoesNotExist' as VaultId, 'DNE'),
    ).rejects.toThrow(vaultErrors.ErrorVaultUndefined);
    await vaultManager.stop();
  });
  test('able to delete a vault', async () => {
    await vaultManager.start({});
    const firstVault = await vaultManager.createVault('MyFirstVault');
    const secondVault = await vaultManager.createVault('MySecondVault');
    const thirdVault = await vaultManager.createVault('MyThirdVault');
    const result = await vaultManager.deleteVault(secondVault.vaultId);
    expect(result).toBe(true);
    await expect(vaultManager.getVault(firstVault.vaultId)).resolves.toBe(
      firstVault,
    );
    await expect(vaultManager.getVault(secondVault.vaultId)).rejects.toThrow(
      vaultErrors.ErrorVaultUndefined,
    );
    await expect(vaultManager.getVault(thirdVault.vaultId)).resolves.toBe(
      thirdVault,
    );
    await vaultManager.stop();
  });
  test('able to list vaults', async () => {
    await vaultManager.start({});
    await vaultManager.createVault('MyTestVault');
    await vaultManager.createVault('MyOtherTestVault');
    const vn: Array<string> = [];
    (await vaultManager.listVaults()).forEach((a) => vn.push(a.name));
    expect(vn.sort()).toEqual(['MyTestVault', 'MyOtherTestVault'].sort());
    await vaultManager.stop();
  });
  test('able to get vault stats', async () => {
    await vaultManager.start({});
    const vault1 = await vaultManager.createVault('MyTestVault');
    const vault2 = await vaultManager.createVault('MyOtherTestVault');
    const stat1 = await vaultManager.vaultStats(vault1.vaultId);
    const stat2 = await vaultManager.vaultStats(vault2.vaultId);
    expect(stat1).toBeInstanceOf(fs.Stats);
    expect(stat2).toBeInstanceOf(fs.Stats);
    expect(stat1.ctime < stat2.ctime).toBeTruthy();
    await vaultManager.stop();
  });
  test('able to update the default node repo to pull from', async () => {
    await vaultManager.start({});
    const vault1 = await vaultManager.createVault('MyTestVault');
    const vault2 = await vaultManager.createVault('MyOtherTestVault');
    const noNode = await vaultManager.getDefaultNode(vault1.vaultId);
    expect(noNode).toBeUndefined();
    await vaultManager.setDefaultNode(vault1.vaultId, 'abc' as NodeId);
    const node = await vaultManager.getDefaultNode(vault1.vaultId);
    const noNode2 = await vaultManager.getDefaultNode(vault2.vaultId);
    expect(node).toBe('abc');
    expect(noNode2).toBeUndefined();
    await vaultManager.stop();
  });
  test('checking gestalt permissions for vaults', async () => {
    const node1: NodeInfo = {
      id: '123' as NodeId,
      chain: { nodes: {}, identities: {} } as ChainData,
    };
    const node2: NodeInfo = {
      id: '345' as NodeId,
      chain: { nodes: {}, identities: {} } as ChainData,
    };
    const node3: NodeInfo = {
      id: '678' as NodeId,
      chain: { nodes: {}, identities: {} } as ChainData,
    };
    const node4: NodeInfo = {
      id: '890' as NodeId,
      chain: { nodes: {}, identities: {} } as ChainData,
    };
    const id1: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'abc' as IdentityId,
      claims: {
        nodes: {},
      } as ChainData,
    };
    const id2: IdentityInfo = {
      providerId: 'github.com' as ProviderId,
      identityId: 'def' as IdentityId,
      claims: {
        nodes: {},
      } as ChainData,
    };

    await gestaltGraph.setNode(node1);
    await gestaltGraph.setNode(node2);
    await gestaltGraph.setNode(node3);
    await gestaltGraph.setNode(node4);
    await gestaltGraph.setIdentity(id1);
    await gestaltGraph.setIdentity(id2);
    await gestaltGraph.linkNodeAndNode(node1, node2);
    await gestaltGraph.linkNodeAndIdentity(node1, id1);
    await gestaltGraph.linkNodeAndIdentity(node4, id2);

    await vaultManager.start({});
    const vault = await vaultManager.createVault('Test');
    await vaultManager.setVaultPermissions('123' as NodeId, vault.vaultId);
    let record = await vaultManager.getVaultPermissions(vault.vaultId);
    expect(record).not.toBeUndefined();
    expect(record['123']['pull']).toBeNull();
    expect(record['345']['pull']).toBeNull();
    expect(record['678']).toBeUndefined();
    expect(record['890']).toBeUndefined();

    await vaultManager.unsetVaultPermissions('345' as NodeId, vault.vaultId);
    record = await vaultManager.getVaultPermissions(vault.vaultId);
    expect(record).not.toBeUndefined();
    expect(record['123']['pull']).toBeUndefined();
    expect(record['345']['pull']).toBeUndefined();

    await gestaltGraph.unlinkNodeAndNode(node1.id, node2.id);
    await vaultManager.setVaultPermissions('345' as NodeId, vault.vaultId);
    record = await vaultManager.getVaultPermissions(vault.vaultId);
    expect(record).not.toBeUndefined();
    expect(record['123']['pull']).toBeUndefined();
    expect(record['345']['pull']).toBeNull();

    await vaultManager.stop();
  });
  test('able to create many vaults', async () => {
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
    await vaultManager.start({});
    for (const vaultName of vaultNames) {
      await vaultManager.createVault(vaultName);
    }
    expect((await vaultManager.listVaults()).length).toEqual(vaultNames.length);
    await vaultManager.stop();
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
    await vaultManager.start({});
    for (const vaultName of vaultNames) {
      await vaultManager.createVault(vaultName);
    }
    const vaults = await vaultManager.listVaults();
    let vaultId: VaultId = '' as VaultId;
    for (const v of vaults) {
      if (v.name === 'Vault1') {
        vaultId = v.id;
        break;
      }
    }
    expect(vaultId).not.toBeUndefined();
    const vault = await vaultManager.getVault(vaultId);
    expect(vault).toBeTruthy();
    await vaultManager.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await db.stop();

    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
    await acl.start();
    await gestaltGraph.start();
    await vaultManager.start({});
    const vn: Array<string> = [];
    (await vaultManager.listVaults()).forEach((a) => vn.push(a.name));
    expect(vn.sort()).toEqual(vaultNames.sort());
    await vaultManager.stop();
  });
  test('able to recover metadata after complex operations', async () => {
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
    await vaultManager.start({});
    for (const vaultName of vaultNames) {
      await vaultManager.createVault(vaultName);
    }
    const v10 = await vaultManager.getVaultId('Vault10');
    expect(v10).toBeTruthy();
    await vaultManager.deleteVault(v10!);
    const v5 = await vaultManager.getVaultId('Vault5');
    expect(v5).toBeTruthy();
    await vaultManager.deleteVault(v5!);
    const v9 = await vaultManager.getVaultId('Vault9');
    expect(v9).toBeTruthy();
    const vault9 = await vaultManager.getVault(v9!);
    await vaultManager.renameVault(v9!, 'Vault10');
    await vaultManager.createVault('ThirdImpact');
    await vaultManager.createVault('Cake');
    await vault9.addSecret('MySecret', 'MyActualPassword');
    const vn: Array<string> = [];
    (await vaultManager.listVaults()).forEach((a) => vn.push(a.name));
    expect(vn.sort()).toEqual(alteredVaultNames.sort());
    await vaultManager.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await db.stop();

    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
    await acl.start();
    await gestaltGraph.start();
    await vaultManager.start({});
    await vaultManager.createVault('Pumpkin');
    const v102 = await vaultManager.getVaultId('Vault10');
    expect(v102).toBeTruthy();
    const secret = await (
      await vaultManager.getVault(v102!)
    ).getSecret('MySecret');
    expect(secret.toString()).toBe('MyActualPassword');
    alteredVaultNames.push('Pumpkin');
    expect((await vaultManager.listVaults()).length).toEqual(
      alteredVaultNames.length,
    );
    await vaultManager.stop();
  });
  /* TESTING TODO:
   *  Changing the default node to pull from
   */
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

    const altFwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
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
        keysPath: path.join(targetDataDir, 'keys'),
        fs: fs,
        logger: logger,
      });
      await targetKeyManager.start({ password: 'password' });
      targetNodeId = targetKeyManager.getNodeId();
      revTLSConfig = {
        keyPrivatePem: targetKeyManager.getRootKeyPairPem().privateKey,
        certChainPem: await targetKeyManager.getRootCertChainPem(),
      };
      targetFwdProxy = new ForwardProxy({
        authToken: '',
        logger: logger,
      });
      targetDb = await DB.createDB({
        dbPath: path.join(targetDataDir, 'db'),
        logger: logger,
      });
      await targetDb.start({ keyPair: targetKeyManager.getRootKeyPair() });
      targetSigchain = new Sigchain({
        keyManager: targetKeyManager,
        db: targetDb,
        logger: logger,
      });
      await targetSigchain.start();
      targetNodeManager = new NodeManager({
        db: targetDb,
        sigchain: targetSigchain,
        keyManager: targetKeyManager,
        fwdProxy: targetFwdProxy,
        revProxy: revProxy,
        fs: fs,
        logger: logger,
      });
      await targetNodeManager.start();
      targetACL = new ACL({
        db: targetDb,
        logger: logger,
      });
      await targetACL.start();
      targetNotificationsManager = new NotificationsManager({
        acl: targetACL,
        db: targetDb,
        nodeManager: targetNodeManager,
        keyManager: targetKeyManager,
        messageCap: 5,
        logger: logger,
      });
      await targetNotificationsManager.start();
      targetGestaltGraph = new GestaltGraph({
        db: targetDb,
        acl: targetACL,
        logger: logger,
      });
      await targetGestaltGraph.start();
      await targetGestaltGraph.setNode(node);
      targetVaultManager = new VaultManager({
        vaultsPath: path.join(targetDataDir, 'vaults'),
        keyManager: targetKeyManager,
        nodeManager: targetNodeManager,
        db: targetDb,
        acl: targetACL,
        gestaltGraph: targetGestaltGraph,
        logger: logger,
      });
      await targetVaultManager.start({});
      targetAgentService = createAgentService({
        keyManager: targetKeyManager,
        vaultManager: targetVaultManager,
        nodeManager: targetNodeManager,
        sigchain: targetSigchain,
        notificationsManager: targetNotificationsManager,
      });
      targetServer = new GRPCServer({
        logger: logger,
      });
      await targetServer.start({
        services: [[AgentService, targetAgentService]],
        host: targetHost,
      });

      altDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      altKeyManager = await  KeyManager.createKeyManager({
        keysPath: path.join(altDataDir, 'keys'),
        fs: fs,
        logger: logger,
      });
      await altKeyManager.start({ password: 'password' });
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
      });
      await altDb.start({ keyPair: altKeyManager.getRootKeyPair() });
      altSigchain = new Sigchain({
        keyManager: altKeyManager,
        db: altDb,
        logger: logger,
      });
      await altSigchain.start();
      altNodeManager = new NodeManager({
        db: altDb,
        sigchain: altSigchain,
        keyManager: altKeyManager,
        fwdProxy: altFwdProxy,
        revProxy: altRevProxy,
        fs: fs,
        logger: logger,
      });
      await altNodeManager.start();
      altACL = new ACL({
        db: altDb,
        logger: logger,
      });
      await altACL.start();
      altNotificationsManager = new NotificationsManager({
        acl: altACL,
        db: altDb,
        nodeManager: altNodeManager,
        keyManager: altKeyManager,
        messageCap: 5,
        logger: logger,
      });
      await altNotificationsManager.start();
      altGestaltGraph = new GestaltGraph({
        db: altDb,
        acl: altACL,
        logger: logger,
      });
      await altGestaltGraph.start();
      await altGestaltGraph.setNode(node);
      altVaultManager = new VaultManager({
        vaultsPath: path.join(altDataDir, 'vaults'),
        keyManager: altKeyManager,
        nodeManager: altNodeManager,
        db: altDb,
        acl: altACL,
        gestaltGraph: altGestaltGraph,
        logger: logger,
      });
      await altVaultManager.start({});
      altAgentService = createAgentService({
        keyManager: altKeyManager,
        vaultManager: altVaultManager,
        nodeManager: altNodeManager,
        sigchain: altSigchain,
        notificationsManager: altNotificationsManager,
      });
      altServer = new GRPCServer({
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
      await targetVaultManager.stop();
      await targetGestaltGraph.stop();
      await targetNotificationsManager.stop();
      await targetACL.stop();
      await targetDb.stop();
      await targetNodeManager.stop();
      await targetKeyManager.stop();
      await fs.promises.rm(targetDataDir, {
        force: true,
        recursive: true,
      });
      await altServer.stop();
      await altVaultManager.stop();
      await altGestaltGraph.stop();
      await altNotificationsManager.stop();
      await altACL.stop();
      await altDb.stop();
      await altNodeManager.stop();
      await altKeyManager.stop();
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
        await vaultManager.start({});
        await vaultManager.createVault('MyFirstVault');
        await vaultManager.createVault('MyFirstVault copy');
        const vault = await targetVaultManager.createVault('MyFirstVault');
        await targetVaultManager.setVaultPermissions(
          nodeManager.getNodeId(),
          vault.vaultId,
        );
        const names: string[] = [];
        for (let i = 0; i < 10; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Success?';
          await vault.addSecret(name, content);
        }
        await nodeManager.setNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await nodeManager.createConnectionToNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await revProxy.openConnection(sourceHost, sourcePort);
        await vaultManager.cloneVault(vault.vaultId, targetNodeId);
        const vaultsList = await vaultManager.listVaults();
        expect(vaultsList[2].name).toStrictEqual('MyFirstVault copy copy');
        await expect(
          vaultManager.getDefaultNode(vaultsList[2].id),
        ).resolves.toBe(targetNodeId);
        const clonedVault = await vaultManager.getVault(vaultsList[2].id);
        expect(await clonedVault.getSecret('secret 9')).toStrictEqual(
          'Success?',
        );
        expect((await clonedVault.listSecrets()).sort()).toStrictEqual(
          names.sort(),
        );
        for (let i = 10; i < 20; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Second Success?';
          await vault.addSecret(name, content);
        }
        await vaultManager.pullVault(clonedVault.vaultId, targetNodeId);
        expect((await clonedVault.listSecrets()).sort()).toStrictEqual(
          names.sort(),
        );
        expect(await clonedVault.getSecret('secret 19')).toStrictEqual(
          'Second Success?',
        );
      },
      global.defaultTimeout * 2,
    );
    test(
      'reject clone and pull ops when permissions are not set',
      async () => {
        await vaultManager.start({});
        const vault = await targetVaultManager.createVault('MyFirstVault');
        await vault.addSecret('MyFirstSecret', 'Success?');
        await nodeManager.setNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await nodeManager.createConnectionToNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await revProxy.openConnection(sourceHost, sourcePort);
        await expect(
          vaultManager.cloneVault(vault.vaultId, targetNodeId),
        ).rejects.toThrow(gitErrors.ErrorGitPermissionDenied);
        const vaultsList = await vaultManager.listVaults();
        expect(vaultsList).toStrictEqual([]);
        await targetVaultManager.setVaultPermissions(
          nodeManager.getNodeId(),
          vault.vaultId,
        );
        await vaultManager.cloneVault(vault.vaultId, targetNodeId);
        const vaultList = await vaultManager.listVaults();
        await targetVaultManager.unsetVaultPermissions(
          nodeManager.getNodeId(),
          vault.vaultId,
        );
        vault.addSecret('MySecondSecret', 'SecondSuccess?');
        await expect(
          vaultManager.pullVault(vaultList[0].id, targetNodeId),
        ).rejects.toThrow(gitErrors.ErrorGitPermissionDenied);
        const list = await vaultManager.listVaults();
        const clonedVault = await vaultManager.getVault(list[0].id);
        expect((await clonedVault.listSecrets()).sort()).toStrictEqual(
          ['MyFirstSecret'].sort(),
        );
        await vaultManager.stop();
      },
      global.defaultTimeout * 2,
    );
    test(
      'handle vault conflicts',
      async () => {
        await vaultManager.start({});
        const vault = await targetVaultManager.createVault('MyFirstVault');
        await targetVaultManager.setVaultPermissions(
          nodeManager.getNodeId(),
          vault.vaultId,
        );
        const names: string[] = [];
        for (let i = 0; i < 10; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Success?';
          await vault.addSecret(name, content);
        }
        await vault.mkdir('dir', { recursive: true });
        await nodeManager.setNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await nodeManager.createConnectionToNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await revProxy.openConnection(sourceHost, sourcePort);
        await vaultManager.cloneVault(vault.vaultId, targetNodeId);
        const vaultList = await vaultManager.listVaults();
        const clonedVault = await vaultManager.getVault(vaultList[0].id);
        await clonedVault.renameSecret('secret 9', 'secret 10');
        await vault.renameSecret('secret 9', 'causing merge conflict');
        await expect(
          vaultManager.pullVault(clonedVault.vaultId),
        ).rejects.toThrow(vaultErrors.ErrorVaultMergeConflict);
      },
      global.defaultTimeout * 2,
    );
    test(
      'clone and pull from a default node',
      async () => {
        await vaultManager.start({});
        const vault = await targetVaultManager.createVault('MyFirstVault');
        await targetVaultManager.setVaultPermissions(
          altNodeManager.getNodeId(),
          vault.vaultId,
        );
        await targetVaultManager.setVaultPermissions(
          nodeManager.getNodeId(),
          vault.vaultId,
        );
        const names: string[] = [];
        for (let i = 0; i < 10; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Success?';
          await vault.addSecret(name, content);
        }
        await altNodeManager.setNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await altNodeManager.createConnectionToNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await revProxy.openConnection(altHost, altPort);
        await altVaultManager.cloneVault(vault.vaultId, targetNodeId);
        const altVaultsList = await altVaultManager.listVaults();
        expect(altVaultsList[0].name).toStrictEqual('MyFirstVault');
        await nodeManager.setNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await nodeManager.createConnectionToNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await revProxy.openConnection(sourceHost, sourcePort);
        await vaultManager.cloneVault(vault.vaultId, targetNodeId);
        await altVaultManager.setVaultPermissions(
          nodeManager.getNodeId(),
          altVaultsList[0].id,
        );
        const vaultsList = await vaultManager.listVaults();
        expect(vaultsList[0].name).toStrictEqual('MyFirstVault');
        const clonedVault = await vaultManager.getVault(vaultsList[0].id);
        const altClonedVault = await altVaultManager.getVault(
          altVaultsList[0].id,
        );
        await altClonedVault.updateSecret('secret 9', 'this is new');
        await nodeManager.setNode(altNodeId, {
          ip: altHostIn,
          port: altPortIn,
        } as NodeAddress);
        await nodeManager.createConnectionToNode(altNodeId, {
          ip: altHostIn,
          port: altPortIn,
        } as NodeAddress);
        await altRevProxy.openConnection(sourceHost, sourcePort);
        await vaultManager.pullVault(clonedVault.vaultId, altNodeId);
        expect(await clonedVault.getSecret('secret 9')).toStrictEqual(
          'this is new',
        );
        await altClonedVault.addSecret('secret 10', 'default pull?');
        await vaultManager.pullVault(clonedVault.vaultId);
        expect(await clonedVault.getSecret('secret 10')).toStrictEqual(
          'default pull?',
        );
      },
      global.defaultTimeout * 2,
    );
    test(
      'clone and pull within a system of 3 nodes',
      async () => {
        await vaultManager.start({});
        const vault = await targetVaultManager.createVault('MyFirstVault');
        await targetVaultManager.setVaultPermissions(
          altNodeManager.getNodeId(),
          vault.vaultId,
        );
        await targetVaultManager.setVaultPermissions(
          nodeManager.getNodeId(),
          vault.vaultId,
        );
        const names: string[] = [];
        for (let i = 0; i < 10; i++) {
          const name = 'secret ' + i.toString();
          names.push(name);
          const content = 'Success?';
          await vault.addSecret(name, content);
        }
        await altNodeManager.setNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await altNodeManager.createConnectionToNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await revProxy.openConnection(altHost, altPort);
        await altVaultManager.cloneVault(vault.vaultId, targetNodeId);
        const altVaultsList = await altVaultManager.listVaults();
        expect(altVaultsList[0].name).toStrictEqual('MyFirstVault');
        await nodeManager.setNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await nodeManager.createConnectionToNode(targetNodeId, {
          ip: targetHost,
          port: targetPort,
        } as NodeAddress);
        await revProxy.openConnection(sourceHost, sourcePort);
        await vaultManager.cloneVault(vault.vaultId, targetNodeId);
        await altVaultManager.setVaultPermissions(
          nodeManager.getNodeId(),
          altVaultsList[0].id,
        );
        const vaultsList = await vaultManager.listVaults();
        expect(vaultsList[0].name).toStrictEqual('MyFirstVault');
        const clonedVault = await vaultManager.getVault(vaultsList[0].id);
        const altClonedVault = await altVaultManager.getVault(
          altVaultsList[0].id,
        );
        await altClonedVault.updateSecret('secret 9', 'this is new');
        await nodeManager.setNode(altNodeId, {
          ip: altHostIn,
          port: altPortIn,
        } as NodeAddress);
        await nodeManager.createConnectionToNode(altNodeId, {
          ip: altHostIn,
          port: altPortIn,
        } as NodeAddress);
        await altRevProxy.openConnection(sourceHost, sourcePort);
        await vaultManager.pullVault(clonedVault.vaultId, altNodeId);
        expect(await clonedVault.getSecret('secret 9')).toStrictEqual(
          'this is new',
        );
      },
      global.defaultTimeout * 2,
    );
  });
});
