import type { NodeId, NodeAddress } from '../../src/nodes/types';
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

describe('GitManager is', () => {
  const logger = new Logger('VaultManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
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

  let targetKeyManager: KeyManager;
  let targetNodeManager: NodeManager;
  let targetVaultManager: VaultManager;
  let targetFwdProxy: ForwardProxy;
  let targetGitBackend: GitBackend;

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
    sourceVaultManager = new VaultManager({
      vaultsPath: path.join(dataDir, 'vaults'),
      keyManager: sourceKeyManager,
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
    targetVaultManager = new VaultManager({
      vaultsPath: path.join(dataDir2, 'vaults'),
      keyManager: targetKeyManager,
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
      getVaultID: targetVaultManager.getVaultIds.bind(targetVaultManager),
      getVaultNames: targetVaultManager.listVaults.bind(targetVaultManager),
      logger: logger,
    });
    await targetKeyManager.start({ password: 'password2' });
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
    await sourceKeyManager.stop();
    await targetNodeManager.stop();
    await targetVaultManager.stop();
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
    await targetVaultManager.createVault('MyFirstVault');
    await targetVaultManager.createVault('MySecondVault');
    await sourceNodeManager.setNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    await sourceNodeManager.createConnectionToNode(targetNodeId, {
      ip: targetHost,
      port: targetPort,
    } as NodeAddress);
    await revProxy.openConnection(sourceHost, sourcePort);
    const list = await sourceGitManager.scanNodeVaults(targetNodeId);
    expect(list.sort()).toStrictEqual(['MyFirstVault', 'MySecondVault']);
  });
  test('able to clone and pull vaults from another node', async () => {
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
    await sourceGitManager.cloneVault('MyFirstVault', targetNodeId);
    const vaultsList = sourceVaultManager.listVaults();
    expect(vaultsList[0].name).toStrictEqual('MyFirstVault');
    const clonedVault = sourceVaultManager.getVault(vaultsList[0].id);
    expect(await clonedVault.getSecret('MyFirstSecret')).toStrictEqual(
      Buffer.from('Success?'),
    );
    vault.addSecret('MySecondSecret', Buffer.from('SecondSuccess?'));
    await sourceGitManager.pullVault('MyFirstVault', targetNodeId);
    expect((await clonedVault.listSecrets()).sort()).toStrictEqual(
      ['MyFirstSecret', 'MySecondSecret'].sort(),
    );
    expect(await clonedVault.getSecret('MySecondSecret')).toStrictEqual(
      Buffer.from('SecondSuccess?'),
    );
  });
  test('able to handle various rejection cases', async () => {
    const vault = await targetVaultManager.createVault('MyFirstVault');
    const vault2 = await targetVaultManager.createVault('MySecondVault');
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
    await expect(
      sourceGitManager.cloneVault('MyFirstVault', targetNodeId),
    ).rejects.toThrow(vaultsErrors.ErrorVaultDefined);
    await expect(
      sourceGitManager.pullVault('MySecondVault', targetNodeId),
    ).rejects.toThrow(vaultsErrors.ErrorVaultUndefined);
    await expect(
      sourceGitManager.pullVault('MyFirstVault', targetNodeId),
    ).rejects.toThrow(vaultsErrors.ErrorVaultUnlinked);
  });
});
