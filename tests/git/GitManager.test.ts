import type { NodeId, NodeAddress, NodeInfo } from '../../src/nodes/types';
import type { Host, Port, TLSConfig } from '@/network/types';
import type { KeyPairPem, CertificatePem } from '@/keys/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { GitManager, GitBackend } from '@/git';
import { KeyManager, utils as keysUtils } from '@/keys';
import { utils as networkUtils } from '@/network';
import { NodeManager } from '@/nodes';
import { VaultManager, errors as vaultsErrors } from '@/vaults';
import { ForwardProxy, ReverseProxy } from '@/network';
import GRPCServer from '@/grpc/GRPCServer';
import { AgentService, createAgentService } from '@/agent';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { DB } from '@/db';

import * as gitErrors from '@/git/errors';

describe('GitManager is', () => {
  const logger = new Logger('VaultManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const node: NodeInfo = {
    id: '12345' as NodeId,
    links: { nodes: {}, identities: {} },
  };

  let dataDir: string;
  let dataDir2: string;

  let sourceKeyManager: KeyManager;
  let sourceNodeManager: NodeManager;
  let sourceVaultManager: VaultManager;
  let sourceGitManager: GitManager;
  let sourceFwdProxy: ForwardProxy;
  const revProxy = new ReverseProxy({
    logger: logger,
  });
  let sourceACL: ACL;
  let sourceGestaltGraph: GestaltGraph;
  let sourceDb: DB;

  let targetKeyManager: KeyManager;
  let targetNodeManager: NodeManager;
  let targetVaultManager: VaultManager;
  let targetFwdProxy: ForwardProxy;
  let targetGitBackend: GitBackend;
  let targetACL: ACL;
  let targetGestaltGraph: GestaltGraph;
  let targetDb: DB;

  const sourceHost = '127.0.0.1' as Host;
  const sourcePort = 11112 as Port;
  const targetHost = '127.0.0.2' as Host;
  const targetPort = 11113 as Port;

  let targetNodeId: NodeId;
  let targetKeyPairPem: KeyPairPem;
  let targetCertPem: CertificatePem;
  let revTLSConfig: TLSConfig;

  let agentService;
  let server: GRPCServer;

  beforeAll(async () => {
    sourceFwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });
  });

  beforeEach(async () => {
    const targetKeyPair = await keysUtils.generateKeyPair(4096);
    targetKeyPairPem = keysUtils.keyPairToPem(targetKeyPair);
    const targetCert = keysUtils.generateCertificate(
      targetKeyPair.publicKey,
      targetKeyPair.privateKey,
      targetKeyPair.privateKey,
      12332432423,
    );

    targetCertPem = keysUtils.certToPem(targetCert);
    targetNodeId = networkUtils.certNodeId(targetCert);
    revTLSConfig = {
      keyPrivatePem: targetKeyPairPem.privateKey,
      certChainPem: targetCertPem,
    };

    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    dataDir2 = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    sourceKeyManager = new KeyManager({
      keysPath: path.join(dataDir, 'keys'),
      fs: fs,
      logger: logger,
    });
    sourceDb = new DB({
      dbPath: path.join(dataDir, 'db'),
      keyManager: sourceKeyManager,
      logger: logger,
    });
    sourceACL = new ACL({
      db: sourceDb,
      logger: logger,
    });
    sourceGestaltGraph = new GestaltGraph({
      db: sourceDb,
      acl: sourceACL,
      logger: logger,
    });
    sourceVaultManager = new VaultManager({
      vaultsPath: dataDir,
      keyManager: sourceKeyManager,
      db: sourceDb,
      acl: sourceACL,
      gestaltGraph: sourceGestaltGraph,
      fs: fs,
      logger: logger,
    });
    sourceNodeManager = new NodeManager({
      nodesPath: path.join(dataDir, 'nodes'),
      keyManager: sourceKeyManager,
      fwdProxy: sourceFwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });
    sourceGitManager = new GitManager({
      vaultManager: sourceVaultManager,
      nodeManager: sourceNodeManager,
    });
    await sourceKeyManager.start({ password: 'password' });
    await sourceFwdProxy.start({
      tlsConfig: {
        keyPrivatePem: sourceKeyManager.getRootKeyPairPem().privateKey,
        certChainPem: await sourceKeyManager.getRootCertChainPem(),
      },
      egressHost: sourceHost,
      egressPort: sourcePort,
    });
    await sourceDb.start();
    await sourceACL.start();
    await sourceGestaltGraph.start();
    await sourceVaultManager.start({});
    await sourceNodeManager.start({ nodeId: 'abc' as NodeId });
    await sourceGitManager.start();
    targetFwdProxy = new ForwardProxy({
      authToken: '',
      logger: logger,
    });
    targetKeyManager = new KeyManager({
      keysPath: path.join(dataDir2, 'keys'),
      fs: fs,
      logger: logger,
    });
    targetDb = new DB({
      dbPath: path.join(dataDir2, 'db'),
      keyManager: targetKeyManager,
      fs: fs,
      logger: logger,
    });
    targetACL = new ACL({
      db: targetDb,
      logger: logger,
    });
    targetGestaltGraph = new GestaltGraph({
      db: targetDb,
      acl: targetACL,
      logger: logger,
    });
    node.id = sourceNodeManager.getNodeId();
    targetVaultManager = new VaultManager({
      vaultsPath: path.join(dataDir2, 'vaults'),
      keyManager: targetKeyManager,
      db: targetDb,
      acl: targetACL,
      gestaltGraph: targetGestaltGraph,
      fs: fs,
      logger: logger,
    });
    targetNodeManager = new NodeManager({
      nodesPath: path.join(dataDir2, 'nodes'),
      keyManager: targetKeyManager,
      fwdProxy: targetFwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });
    targetGitBackend = new GitBackend({
      getVault: targetVaultManager.getVault.bind(targetVaultManager),
      getVaultNames: targetVaultManager.scanVaults.bind(targetVaultManager),
      logger: logger,
    });
    await targetKeyManager.start({ password: 'password2' });
    await targetDb.start();
    await targetACL.start();
    await targetGestaltGraph.start();
    await targetGestaltGraph.setNode(node);
    await targetVaultManager.start({});
    await targetNodeManager.start({ nodeId: targetNodeId });
    agentService = createAgentService({
      keyManager: targetKeyManager,
      vaultManager: targetVaultManager,
      nodeManager: targetNodeManager,
      gitBackend: targetGitBackend,
    });
    server = new GRPCServer({
      services: [[AgentService, agentService]],
      logger: logger,
    });
    await server.start({
      host: targetHost,
    });

    await revProxy.start({
      ingressHost: targetHost,
      ingressPort: targetPort,
      serverHost: targetHost,
      serverPort: server.getPort(),
      tlsConfig: revTLSConfig,
    });
  });

  afterEach(async () => {
    await revProxy.closeConnection(
      sourceFwdProxy.getEgressHost(),
      sourceFwdProxy.getEgressPort(),
    );
    await sourceFwdProxy.closeConnection(
      sourceFwdProxy.getEgressHost(),
      sourceFwdProxy.getEgressPort(),
    );
    await revProxy.stop();
    await server.stop();
    await sourceGitManager.stop();
    await sourceNodeManager.stop();
    await sourceVaultManager.stop();
    await sourceGestaltGraph.stop();
    await sourceACL.stop();
    await sourceDb.stop();
    await sourceKeyManager.stop();
    await targetNodeManager.stop();
    await targetVaultManager.stop();
    await targetGestaltGraph.stop();
    await targetACL.stop();
    await targetDb.stop();
    await targetKeyManager.stop();
    await targetFwdProxy.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await fs.promises.rm(dataDir2, {
      force: true,
      recursive: true,
    });
  });

  afterAll(async () => {
    await sourceFwdProxy.stop();
  });

  test('able to scan vaults from another node', async () => {
    const vault1 = await targetVaultManager.createVault('MyFirstVault');
    const vault2 = await targetVaultManager.createVault('MySecondVault');
    await sourceNodeManager.setNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    await sourceNodeManager.createConnectionToNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    await revProxy.openConnection(sourceHost, sourcePort);
    let list = await sourceGitManager.scanNodeVaults(targetNodeId);
    expect(list.sort()).toStrictEqual([]);
    await targetVaultManager.setVaultPerm(
      sourceNodeManager.getNodeId(),
      vault1.vaultId,
    );
    await targetVaultManager.setVaultPerm(
      sourceNodeManager.getNodeId(),
      vault2.vaultId,
    );
    list = await sourceGitManager.scanNodeVaults(targetNodeId);
    expect(list.sort()).toStrictEqual(
      [
        `${vault1.vaultId}\t${vault1.vaultName}`,
        `${vault2.vaultId}\t${vault2.vaultName}`,
      ].sort(),
    );
  });
  test('able to clone and pull vaults from another node', async () => {
    const vault = await targetVaultManager.createVault('MyFirstVault');
    await targetVaultManager.setVaultPerm(
      sourceNodeManager.getNodeId(),
      vault.vaultId,
    );
    await vault.initializeVault();
    await vault.addSecret('MyFirstSecret', Buffer.from('Success?'));
    await sourceNodeManager.setNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    await sourceNodeManager.createConnectionToNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    await revProxy.openConnection(sourceHost, sourcePort);
    await sourceGitManager.cloneVault(vault.vaultId, targetNodeId);
    const vaultsList = sourceVaultManager.listVaults();
    expect(vaultsList[0].name).toStrictEqual('MyFirstVault');
    const clonedVault = sourceVaultManager.getVault(vaultsList[0].id);
    expect(await clonedVault.getSecret('MyFirstSecret')).toStrictEqual(
      Buffer.from('Success?'),
    );
    vault.addSecret('MySecondSecret', Buffer.from('SecondSuccess?'));
    await sourceGitManager.pullVault(vault.vaultId, targetNodeId);
    expect((await clonedVault.listSecrets()).sort()).toStrictEqual(
      ['MyFirstSecret', 'MySecondSecret'].sort(),
    );
    expect(await clonedVault.getSecret('MySecondSecret')).toStrictEqual(
      Buffer.from('SecondSuccess?'),
    );
  });
  test('able to handle various edge cases', async () => {
    const vault = await targetVaultManager.createVault('MyFirstVault');
    const vault2 = await targetVaultManager.createVault('MySecondVault');
    await targetVaultManager.setVaultPerm(
      sourceNodeManager.getNodeId(),
      vault.vaultId,
    );
    await targetVaultManager.setVaultPerm(
      sourceNodeManager.getNodeId(),
      vault2.vaultId,
    );
    await vault.initializeVault();
    await vault2.initializeVault();
    await vault.addSecret('MyFirstSecret', Buffer.from('Success?'));
    await sourceNodeManager.setNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    await sourceNodeManager.createConnectionToNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    await revProxy.openConnection(sourceHost, sourcePort);
    await sourceVaultManager.createVault('MyFirstVault');
    await sourceGitManager.cloneVault(vault.vaultId, targetNodeId);
    const list = sourceVaultManager.listVaults();
    expect(list[0].name).toBe('MyFirstVault');
    expect(list[1].name).toBe('MyFirstVault copy');
    const copiedVault = sourceVaultManager.getVault(list[1].id);
    await expect(copiedVault.getSecret('MyFirstSecret')).resolves.toStrictEqual(
      Buffer.from('Success?'),
    );
    await expect(
      sourceGitManager.pullVault(vault2.vaultId, targetNodeId),
    ).rejects.toThrow(vaultsErrors.ErrorVaultUnlinked);
    await vault.updateSecret('MyFirstSecret', Buffer.from('Success!'));
    await sourceGitManager.pullVault(vault.vaultId, targetNodeId);
    await expect(copiedVault.getSecret('MyFirstSecret')).resolves.toStrictEqual(
      Buffer.from('Success!'),
    );
  });
  test('unable to clone and pull vaults when permissions are not set', async () => {
    const vault = await targetVaultManager.createVault('MyFirstVault');
    await vault.initializeVault();
    await vault.addSecret('MyFirstSecret', Buffer.from('Success?'));
    await sourceNodeManager.setNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    await sourceNodeManager.createConnectionToNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    await revProxy.openConnection(sourceHost, sourcePort);
    await expect(
      sourceGitManager.cloneVault(vault.vaultId, targetNodeId),
    ).rejects.toThrow(gitErrors.ErrorGitPermissionDenied);
    const vaultsList = sourceVaultManager.listVaults();
    expect(vaultsList).toStrictEqual([]);
    await targetVaultManager.setVaultPerm(
      sourceNodeManager.getNodeId(),
      vault.vaultId,
    );
    await sourceGitManager.cloneVault(vault.vaultId, targetNodeId);
    await targetVaultManager.unsetVaultPerm(
      sourceNodeManager.getNodeId(),
      vault.vaultId,
    );
    vault.addSecret('MySecondSecret', Buffer.from('SecondSuccess?'));
    await expect(
      sourceGitManager.pullVault(vault.vaultId, targetNodeId),
    ).rejects.toThrow(gitErrors.ErrorGitPermissionDenied);
    const list = sourceVaultManager.listVaults();
    const clonedVault = sourceVaultManager.getVault(list[0].id);
    expect((await clonedVault.listSecrets()).sort()).toStrictEqual(
      ['MyFirstSecret'].sort(),
    );
  });
});
