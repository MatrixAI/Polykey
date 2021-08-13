import type { Host, Port, TLSConfig } from '@/network/types';
import type { KeyPairPem, CertificatePem } from '@/keys/types';
import type { NodeId, NodeInfo } from '@/nodes/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { StreamHandler, LogLevel } from '@matrixai/logger';
import { ForwardProxy, ReverseProxy } from '@/network';
import { NodeConnection, NodeManager } from '@/nodes';
import { VaultManager } from '@/vaults';
import { KeyManager, utils as keysUtils } from '@/keys';
import { utils as networkUtils } from '@/network';
import GRPCServer from '@/grpc/GRPCServer';
import { AgentService, createAgentService } from '@/agent';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { DB } from '@/db';
import { Sigchain } from '@/sigchain';
import { NotificationsManager } from '@/notifications';

import * as grpcErrors from '@/grpc/errors';

describe('NodeConnection', () => {
  const node: NodeInfo = {
    id: 'NodeId' as NodeId,
    chain: {},
  };
  const logger = new Logger('NodeConnection Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const authToken = 'AUTH';
  const fwdProxy = new ForwardProxy({
    authToken: authToken,
    logger: logger,
  });

  const revProxy = new ReverseProxy({
    logger: logger,
  });

  let clientDataDir: string;
  let serverDataDir: string;
  let clientKeyManager: KeyManager, serverKeyManager: KeyManager;
  let serverVaultManager: VaultManager;
  let serverNodeManager: NodeManager;
  let serverSigchain: Sigchain;
  let serverACL: ACL, clientACL: ACL;
  let serverGestaltGraph: GestaltGraph, clientGestaltGraph: GestaltGraph;
  let serverDb: DB, clientDb: DB;
  let serverNotificationsManager: NotificationsManager;

  let sourceNodeId: NodeId, targetNodeId: NodeId;
  let sourceKeyPairPem: KeyPairPem, targetKeyPairPem: KeyPairPem;
  let sourceCertPem: CertificatePem, targetCertPem: CertificatePem;
  let fwdTLSConfig: TLSConfig, revTLSConfig: TLSConfig;

  let agentService;
  let server: GRPCServer;

  const sourceHost = '127.0.0.1' as Host;
  const sourcePort = 11110 as Port;
  const targetHost = '127.0.0.2' as Host;
  const targetPort = 11111 as Port;

  beforeAll(async () => {
    serverDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-server'),
    );

    const srcKeyPair = await keysUtils.generateKeyPair(4098);
    sourceKeyPairPem = keysUtils.keyPairToPem(srcKeyPair);
    const srcCert = keysUtils.generateCertificate(
      srcKeyPair.publicKey,
      srcKeyPair.privateKey,
      srcKeyPair.privateKey,
      12332432423,
    );
    sourceCertPem = keysUtils.certToPem(srcCert);
    sourceNodeId = networkUtils.certNodeId(srcCert);
    fwdTLSConfig = {
      keyPrivatePem: sourceKeyPairPem.privateKey,
      certChainPem: sourceCertPem,
    };

    // Target node ID from this seed = JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBwQ=
    const mnemonic =
      'loyal cereal fruit fringe radar toilet radar exercise when system maple column';
    const targetKeyPair = await keysUtils.generateDeterministicKeyPair(
      4096,
      mnemonic,
    );
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

    // Server setup
    const serverKeysPath = path.join(serverDataDir, 'serverKeys');
    const serverVaultsPath = path.join(serverDataDir, 'serverVaults');
    const serverDbPath = path.join(serverDataDir, 'serverDb');

    serverKeyManager = new KeyManager({
      keysPath: serverKeysPath,
      fs: fs,
      logger: logger,
    });
    serverDb = new DB({
      dbPath: serverDbPath,
      fs: fs,
      logger: logger,
    });
    serverACL = new ACL({
      db: serverDb,
      logger: logger,
    });
    serverSigchain = new Sigchain({
      keyManager: serverKeyManager,
      db: serverDb,
      logger: logger,
    });
    serverGestaltGraph = new GestaltGraph({
      db: serverDb,
      acl: serverACL,
      logger: logger,
    });
    // Only needed to pass into nodeManager constructor - won't be forwarding calls
    // so no need to start
    const serverFwdProxy = new ForwardProxy({
      authToken: '',
      logger: logger,
    });
    serverNodeManager = new NodeManager({
      db: serverDb,
      sigchain: serverSigchain,
      keyManager: serverKeyManager,
      fwdProxy: serverFwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });
    serverVaultManager = new VaultManager({
      vaultsPath: serverVaultsPath,
      keyManager: serverKeyManager,
      nodeManager: serverNodeManager,
      db: serverDb,
      acl: serverACL,
      gestaltGraph: serverGestaltGraph,
      fs: fs,
      logger: logger,
    });
    serverNotificationsManager = new NotificationsManager({
      acl: serverACL,
      db: serverDb,
      nodeManager: serverNodeManager,
      keyManager: serverKeyManager,
      logger: logger,
    });
    await serverKeyManager.start({ password: 'password' });
    await serverDb.start({ keyPair: serverKeyManager.getRootKeyPair() });
    await serverACL.start();
    await serverSigchain.start();
    await serverGestaltGraph.start();
    await serverGestaltGraph.setNode(node);
    await serverNodeManager.start({ nodeId: targetNodeId });
    await serverNotificationsManager.start({});
    await serverVaultManager.start({});

    agentService = createAgentService({
      vaultManager: serverVaultManager,
      nodeManager: serverNodeManager,
      sigchain: serverSigchain,
      notificationsManager: serverNotificationsManager,
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
  }, global.polykeyStartupTimeout);

  beforeEach(async () => {
    // Client setup
    clientDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-client'),
    );
    const clientKeysPath = path.join(clientDataDir, 'clientKeys');
    clientKeyManager = new KeyManager({ keysPath: clientKeysPath, logger });
    await clientKeyManager.start({ password: 'password' });
    await fwdProxy.start({
      tlsConfig: fwdTLSConfig,
      egressHost: sourceHost,
      egressPort: sourcePort,
    });
  });
  afterEach(async () => {
    await fs.promises.rm(clientDataDir, {
      force: true,
      recursive: true,
    });
    await clientKeyManager.stop();
    await fwdProxy.stop();
  });
  afterAll(async () => {
    await fs.promises.rm(serverDataDir, {
      force: true,
      recursive: true,
    });
    await revProxy.stop();
    await serverKeyManager.stop();
    await serverDb.stop();
    await serverACL.stop();
    await serverSigchain.stop();
    await serverGestaltGraph.stop();
    await serverVaultManager.stop();
    await serverNodeManager.stop();
    await server.stop();
  });

  test('connects to its target (via direct connection)', async () => {
    expect(fwdProxy.getConnectionCount()).toBe(0);
    const initialNumConnections = revProxy.getConnectionCount();
    const conn = new NodeConnection({
      sourceNodeId: sourceNodeId,
      targetNodeId: targetNodeId,
      targetHost: targetHost,
      targetPort: targetPort,
      forwardProxy: fwdProxy,
      keyManager: clientKeyManager,
      logger: logger,
    });
    // Client-side: start sending hole-punching packets to server (target: the revProxy)
    await conn.start({});
    // Server-side: send hole-punching packets back to client (fwdProxy)
    await revProxy.openConnection(sourceHost, sourcePort);

    expect(
      revProxy.getConnectionInfoByEgress(sourceHost, sourcePort),
    ).toBeTruthy();
    expect(fwdProxy.getConnectionCount()).toBe(1);
    expect(revProxy.getConnectionCount()).toBe(initialNumConnections + 1);

    await conn.stop();
    await revProxy.closeConnection(
      fwdProxy.getEgressHost(),
      fwdProxy.getEgressPort(),
    );
  });

  test('receives 20 closest local nodes from connected target', async () => {
    const conn = new NodeConnection({
      sourceNodeId: sourceNodeId,
      targetNodeId: targetNodeId,
      targetHost: targetHost,
      targetPort: targetPort,
      forwardProxy: fwdProxy,
      keyManager: clientKeyManager,
      logger: logger,
    });
    await conn.start({});
    await revProxy.openConnection(sourceHost, sourcePort);

    for (let i = 1; i <= 30; i++) {
      let newNodeId: NodeId;
      // Replaces last 2 characters of node ID with i
      if (i < 10) {
        newNodeId = (targetNodeId.substring(0, 43) + i) as NodeId;
      } else {
        newNodeId = (targetNodeId.substring(0, 42) + i) as NodeId;
      }
      const nodeAddress = {
        ip: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await serverNodeManager.setNode(newNodeId, nodeAddress);
    }

    // Get the closest nodes to the target node
    const closest = await conn.getClosestNodes(targetNodeId);
    expect(closest.length).toBe(20);
    expect(closest).toEqual([
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw11',
        address: { ip: '11.11.11.11', port: 11 },
        distance: 24588n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw12',
        address: { ip: '12.12.12.12', port: 12 },
        distance: 24591n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw13',
        address: { ip: '13.13.13.13', port: 13 },
        distance: 24590n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw14',
        address: { ip: '14.14.14.14', port: 14 },
        distance: 24585n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw15',
        address: { ip: '15.15.15.15', port: 15 },
        distance: 24584n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw16',
        address: { ip: '16.16.16.16', port: 16 },
        distance: 24587n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw17',
        address: { ip: '17.17.17.17', port: 17 },
        distance: 24586n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw18',
        address: { ip: '18.18.18.18', port: 18 },
        distance: 24581n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw19',
        address: { ip: '19.19.19.19', port: 19 },
        distance: 24580n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw29',
        address: { ip: '29.29.29.29', port: 29 },
        distance: 25348n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBw30',
        address: { ip: '30.30.30.30', port: 30 },
        distance: 25101n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBwQ1',
        address: { ip: '1.1.1.1', port: 1 },
        distance: 12n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBwQ2',
        address: { ip: '2.2.2.2', port: 2 },
        distance: 15n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBwQ3',
        address: { ip: '3.3.3.3', port: 3 },
        distance: 14n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBwQ4',
        address: { ip: '4.4.4.4', port: 4 },
        distance: 9n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBwQ5',
        address: { ip: '5.5.5.5', port: 5 },
        distance: 8n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBwQ6',
        address: { ip: '6.6.6.6', port: 6 },
        distance: 11n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBwQ7',
        address: { ip: '7.7.7.7', port: 7 },
        distance: 10n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBwQ8',
        address: { ip: '8.8.8.8', port: 8 },
        distance: 5n,
      },
      {
        id: 'JuOvPEtSpp1u6cwjVYV1V4rlK44Le1ded0dkpKTWBwQ9',
        address: { ip: '9.9.9.9', port: 9 },
        distance: 4n,
      },
    ]);

    await conn.stop();
    await revProxy.closeConnection(
      fwdProxy.getEgressHost(),
      fwdProxy.getEgressPort(),
    );
  });

  test('sends hole punch message to connected target (expected to be broker, to relay further)', async () => {
    const conn = new NodeConnection({
      sourceNodeId: sourceNodeId,
      targetNodeId: targetNodeId,
      targetHost: targetHost,
      targetPort: targetPort,
      forwardProxy: fwdProxy,
      keyManager: clientKeyManager,
      logger: logger,
    });
    await conn.start({});
    await revProxy.openConnection(sourceHost, sourcePort);

    const egressAddress = networkUtils.buildAddress(
      fwdProxy.getEgressHost() as Host,
      fwdProxy.getEgressPort() as Port,
    );
    const signature = await clientKeyManager.signWithRootKeyPair(
      Buffer.from(egressAddress),
    );

    // The targetNodeId ('NODEID') differs from the node ID of the connected target,
    // indicating that this relay message is intended for another node.
    // Expected to throw an error, as the connection to 1.1.1.1:11111 would not
    // exist on the server's side. A broker is expected to have this pre-existing
    // connection.
    expect(
      conn.sendHolePunchMessage(
        sourceNodeId,
        'NODEID' as NodeId,
        egressAddress,
        signature,
      ),
    ).rejects.toThrow(grpcErrors.ErrorGRPCConnection);

    await conn.stop();
    await revProxy.closeConnection(
      fwdProxy.getEgressHost(),
      fwdProxy.getEgressPort(),
    );
  });

  test('scans the servers vaults', async () => {
    const vault1 = await serverVaultManager.createVault('Vault1');
    const vault2 = await serverVaultManager.createVault('Vault2');
    const vault3 = await serverVaultManager.createVault('Vault3');
    const vault4 = await serverVaultManager.createVault('Vault4');
    const vault5 = await serverVaultManager.createVault('Vault5');

    await serverGestaltGraph.setNode({
      id: sourceNodeId,
      chain: {},
    });

    const conn = new NodeConnection({
      sourceNodeId: sourceNodeId,
      targetNodeId: targetNodeId,
      targetHost: targetHost,
      targetPort: targetPort,
      forwardProxy: fwdProxy,
      keyManager: clientKeyManager,
      logger: logger,
    });
    await conn.start({});
    await revProxy.openConnection(sourceHost, sourcePort);

    const vaultList: string[] = [];

    let vaults = await conn.scanVaults();

    expect(vaults.sort()).toStrictEqual(vaultList.sort());

    await serverVaultManager.setVaultPermissions(sourceNodeId, vault1.vaultId);
    await serverVaultManager.setVaultPermissions(sourceNodeId, vault2.vaultId);
    await serverVaultManager.setVaultPermissions(sourceNodeId, vault3.vaultId);

    vaults = await conn.scanVaults();

    vaultList.push(`${vault1.vaultName}\t${vault1.vaultId}`);
    vaultList.push(`${vault2.vaultName}\t${vault2.vaultId}`);
    vaultList.push(`${vault3.vaultName}\t${vault3.vaultId}`);

    expect(vaults.sort()).toStrictEqual(vaultList.sort());

    await serverVaultManager.setVaultPermissions(sourceNodeId, vault4.vaultId);
    await serverVaultManager.setVaultPermissions(sourceNodeId, vault5.vaultId);

    vaults = await conn.scanVaults();

    vaultList.push(`${vault4.vaultName}\t${vault4.vaultId}`);
    vaultList.push(`${vault5.vaultName}\t${vault5.vaultId}`);

    expect(vaults.sort()).toStrictEqual(vaultList.sort());

    await conn.stop();
    await revProxy.closeConnection(
      fwdProxy.getEgressHost(),
      fwdProxy.getEgressPort(),
    );
  });
});
