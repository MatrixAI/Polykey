import type { Host, Port, TLSConfig } from '@/network/types';
import type { NodeId, NodeInfo, NodeData } from '@/nodes/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { StreamHandler, LogLevel } from '@matrixai/logger';
import { ForwardProxy, ReverseProxy } from '@/network';
import { NodeConnection, NodeManager } from '@/nodes';
import { VaultManager } from '@/vaults';
import { KeyManager } from '@/keys';
import { utils as networkUtils } from '@/network';
import GRPCServer from '@/grpc/GRPCServer';
import { AgentService, createAgentService } from '@/agent';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { DB } from '@matrixai/db';
import { Sigchain } from '@/sigchain';
import { NotificationsManager } from '@/notifications';

import * as grpcErrors from '@/grpc/errors';
import * as nodesTestUtils from './utils';
import * as nodesUtils from '@/nodes/utils';
import { makeCrypto } from '../utils';

// FIXME: This is not finishing properly.
describe('NodeConnection', () => {
  const password = 'password';
  const node: NodeInfo = {
    id: 'NodeId' as NodeId,
    chain: {},
  };
  const logger = new Logger('NodeConnection Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);

  // Server
  let serverDataDir: string;
  let targetNodeId: NodeId;
  let serverKeyManager: KeyManager;
  let serverVaultManager: VaultManager;
  let serverNodeManager: NodeManager;
  let serverSigchain: Sigchain;
  let serverACL: ACL;
  let serverGestaltGraph: GestaltGraph;
  let serverDb: DB;
  let serverNotificationsManager: NotificationsManager;
  let revTLSConfig: TLSConfig;
  let revProxy: ReverseProxy;

  // Client
  let clientDataDir: string;
  let sourceNodeId: NodeId;
  let clientKeyManager: KeyManager;
  let fwdTLSConfig: TLSConfig;
  const authToken = 'AUTH';
  let fwdProxy: ForwardProxy;

  let agentService;
  let server: GRPCServer;

  // Meep IPs unique. Ideally we'd use the generated IP and port. But this is good for now.
  // If this fails again we shouldn't specify the port and IP.
  const sourceHost = '127.0.0.1' as Host;
  const sourcePort = 11110 as Port;
  const targetHost = '127.0.0.2' as Host;
  const targetPort = 11111 as Port;

  beforeAll(async () => {
    // Server setup
    serverDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-server'),
    );
    const serverKeysPath = path.join(serverDataDir, 'serverKeys');
    const serverVaultsPath = path.join(serverDataDir, 'serverVaults');
    const serverDbPath = path.join(serverDataDir, 'serverDb');

    fwdProxy = await ForwardProxy.createForwardProxy({
      authToken: authToken,
      logger: logger,
    });

    revProxy = await ReverseProxy.createReverseProxy({
      logger: logger,
    });

    serverKeyManager = await KeyManager.createKeyManager({
      password,
      keysPath: serverKeysPath,
      fs: fs,
      logger: logger,
    });
    serverDb = await DB.createDB({
      dbPath: serverDbPath,
      fs: fs,
      logger: logger,
      crypto: makeCrypto(serverKeyManager),
    });
    serverACL = await ACL.createACL({
      db: serverDb,
      logger: logger,
    });
    serverSigchain = await Sigchain.createSigchain({
      keyManager: serverKeyManager,
      db: serverDb,
      logger: logger,
    });
    serverGestaltGraph = await GestaltGraph.createGestaltGraph({
      db: serverDb,
      acl: serverACL,
      logger: logger,
    });
    // Only needed to pass into nodeManager constructor - won't be forwarding calls
    // so no need to start
    const serverFwdProxy = await ForwardProxy.createForwardProxy({
      authToken: '',
      logger: logger,
    });
    serverNodeManager = await NodeManager.createNodeManager({
      db: serverDb,
      sigchain: serverSigchain,
      keyManager: serverKeyManager,
      fwdProxy: serverFwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });
    serverVaultManager = await VaultManager.createVaultManager({
      keyManager: serverKeyManager,
      vaultsPath: serverVaultsPath,
      nodeManager: serverNodeManager,
      vaultsKey: serverKeyManager.vaultKey,
      db: serverDb,
      acl: serverACL,
      gestaltGraph: serverGestaltGraph,
      fs: fs,
      logger: logger,
    });
    serverNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: serverACL,
        db: serverDb,
        nodeManager: serverNodeManager,
        keyManager: serverKeyManager,
        logger: logger,
      });
    await serverDb.start();
    await serverGestaltGraph.setNode(node);
    await serverNodeManager.start();
    agentService = createAgentService({
      keyManager: serverKeyManager,
      vaultManager: serverVaultManager,
      nodeManager: serverNodeManager,
      sigchain: serverSigchain,
      notificationsManager: serverNotificationsManager,
    });
    server = await GRPCServer.createGRPCServer({
      logger: logger,
    });
    await server.start({
      services: [[AgentService, agentService]],
      host: targetHost,
    });
    revTLSConfig = {
      keyPrivatePem: serverKeyManager.getRootKeyPairPem().privateKey,
      certChainPem: await serverKeyManager.getRootCertChainPem(),
    };
    await revProxy.start({
      ingressHost: targetHost,
      ingressPort: targetPort,
      serverHost: targetHost,
      serverPort: server.getPort(),
      tlsConfig: revTLSConfig,
    });
    targetNodeId = serverKeyManager.getNodeId();
  }, global.polykeyStartupTimeout * 2);

  beforeEach(async () => {
    // Client setup
    clientDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-client'),
    );
    const clientKeysPath = path.join(clientDataDir, 'clientKeys');
    clientKeyManager = await KeyManager.createKeyManager({
      password,
      keysPath: clientKeysPath,
      logger,
    });
    fwdTLSConfig = {
      keyPrivatePem: clientKeyManager.getRootKeyPairPem().privateKey,
      certChainPem: await clientKeyManager.getRootCertChainPem(),
    };
    await fwdProxy.start({
      tlsConfig: fwdTLSConfig,
      egressHost: sourceHost,
      egressPort: sourcePort,
    });
    sourceNodeId = clientKeyManager.getNodeId();
  });
  afterEach(async () => {
    await fs.promises.rm(clientDataDir, {
      force: true,
      recursive: true,
    });
    await clientKeyManager.destroy();
    await fwdProxy.stop();

    await serverNodeManager.clearDB();
  });
  afterAll(async () => {
    await fs.promises.rm(serverDataDir, {
      force: true,
      recursive: true,
    });
    await revProxy.stop();
    await revProxy.destroy();
    await serverKeyManager.destroy();
    await serverDb.stop();
    await serverDb.destroy();
    await serverACL.destroy();
    await serverSigchain.destroy();
    await serverGestaltGraph.destroy();
    await serverVaultManager.destroy();
    await serverNodeManager.stop();
    await serverNodeManager.destroy();
    await serverNotificationsManager.destroy();
    await server.stop();
    await server.destroy();
  });

  test('connects to its target (via direct connection)', async () => {
    expect(fwdProxy.getConnectionCount()).toBe(0);
    const initialNumConnections = revProxy.getConnectionCount();
    const conn = await NodeConnection.createNodeConnection({
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
    await conn.destroy();
  });

  test('receives 20 closest local nodes from connected target', async () => {
    const conn = await NodeConnection.createNodeConnection({
      targetNodeId: targetNodeId,
      targetHost: targetHost,
      targetPort: targetPort,
      forwardProxy: fwdProxy,
      keyManager: clientKeyManager,
      logger: logger,
    });
    await conn.start({});
    await revProxy.openConnection(sourceHost, sourcePort);

    // Now generate and add 20 nodes that will be close to this node ID
    const addedClosestNodes: NodeData[] = [];
    for (let i = 1; i < 101; i += 5) {
      const closeNodeId = nodesTestUtils.generateNodeIdForBucket(
        targetNodeId,
        i,
      );
      const nodeAddress = {
        ip: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await serverNodeManager.setNode(closeNodeId, nodeAddress);
      addedClosestNodes.push({
        id: closeNodeId,
        address: nodeAddress,
        distance: nodesUtils.calculateDistance(targetNodeId, closeNodeId),
      });
    }
    // Now create and add 10 more nodes that are far away from this node
    for (let i = 1; i <= 10; i++) {
      const farNodeId = ('NODEID' + i) as NodeId;
      const nodeAddress = {
        ip: (i + '.' + i + '.' + i + '.' + i) as Host,
        port: i as Port,
      };
      await serverNodeManager.setNode(farNodeId, nodeAddress);
    }

    // Get the closest nodes to the target node
    const closest = await conn.getClosestNodes(targetNodeId);
    // Sort the received nodes on distance such that we can check its equality
    // with addedClosestNodes
    closest.sort(nodesUtils.sortByDistance);
    expect(closest.length).toBe(20);
    expect(closest).toEqual(addedClosestNodes);

    await conn.stop();
    await revProxy.closeConnection(
      fwdProxy.getEgressHost(),
      fwdProxy.getEgressPort(),
    );
    await conn.destroy();
  });

  test('sends hole punch message to connected target (expected to be broker, to relay further)', async () => {
    const conn = await NodeConnection.createNodeConnection({
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
    expect(() =>
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
    await conn.destroy();
  });

  test.skip('scans the servers vaults', async () => {
    // Const vault1 = await serverVaultManager.createVault('Vault1' as VaultName);
    // const vault2 = await serverVaultManager.createVault('Vault2' as VaultName);
    // const vault3 = await serverVaultManager.createVault('Vault3' as VaultName);
    // const vault4 = await serverVaultManager.createVault('Vault4' as VaultName);
    // const vault5 = await serverVaultManager.createVault('Vault5' as VaultName);

    await serverGestaltGraph.setNode({
      id: sourceNodeId,
      chain: {},
    });

    const conn = await NodeConnection.createNodeConnection({
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

    fail('Not Implemented');
    // FIXME
    // await serverVaultManager.setVaultPermissions(sourceNodeId, vault1.vaultId);
    // await serverVaultManager.setVaultPermissions(sourceNodeId, vault2.vaultId);
    // await serverVaultManager.setVaultPermissions(sourceNodeId, vault3.vaultId);

    vaults = await conn.scanVaults();

    // VaultList.push(`${vault1.vaultName}\t${vault1.vaultId}`);
    // vaultList.push(`${vault2.vaultName}\t${vault2.vaultId}`);
    // vaultList.push(`${vault3.vaultName}\t${vault3.vaultId}`);

    expect(vaults.sort()).toStrictEqual(vaultList.sort());

    // Await serverVaultManager.setVaultPermissions(sourceNodeId, vault4.vaultId);
    // await serverVaultManager.setVaultPermissions(sourceNodeId, vault5.vaultId);

    vaults = await conn.scanVaults();

    // VaultList.push(`${vault4.vaultName}\t${vault4.vaultId}`);
    // vaultList.push(`${vault5.vaultName}\t${vault5.vaultId}`);

    expect(vaults.sort()).toStrictEqual(vaultList.sort());

    await conn.stop();
    await revProxy.closeConnection(
      fwdProxy.getEgressHost(),
      fwdProxy.getEgressPort(),
    );
    await conn.destroy();
  });
});
