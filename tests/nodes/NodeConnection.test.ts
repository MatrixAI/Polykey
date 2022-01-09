import type { Host, Port, ConnectionInfo } from '@/network/types';
import type { NodeId, NodeInfo, NodeData } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { StreamHandler, LogLevel } from '@matrixai/logger';
import { DB } from '@matrixai/db';

import { ForwardProxy, ReverseProxy } from '@/network';
import { NodeConnection, NodeManager } from '@/nodes';
import { VaultManager } from '@/vaults';
import { KeyManager, utils as keysUtils } from '@/keys';
import GRPCServer from '@/grpc/GRPCServer';
import { AgentServiceService, createAgentService } from '@/agent';
import { ACL } from '@/acl';
import { GestaltGraph } from '@/gestalts';
import { Sigchain } from '@/sigchain';
import { NotificationsManager } from '@/notifications';

import * as nodesUtils from '@/nodes/utils';
import * as nodesErrors from '@/nodes/errors';
import * as networkErrors from '@/network/errors';
import { makeNodeId } from '@/nodes/utils';
import { poll } from '@/utils';
import * as nodesTestUtils from './utils';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

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
  let serverRevProxy: ReverseProxy;

  // Client
  let clientDataDir: string;
  let sourceNodeId: NodeId;
  let clientKeyManager: KeyManager;
  const authToken = 'AUTH';
  let clientFwdProxy: ForwardProxy;

  let agentServer: GRPCServer;

  const nodeIdGenerator = (number: number) => {
    const idArray = new Uint8Array([
      223,
      24,
      34,
      40,
      46,
      217,
      4,
      71,
      103,
      71,
      59,
      123,
      143,
      187,
      9,
      29,
      157,
      41,
      131,
      44,
      68,
      160,
      79,
      127,
      137,
      154,
      221,
      86,
      157,
      23,
      77,
      number,
    ]);
    return makeNodeId(idArray);
  };

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

    serverKeyManager = await KeyManager.createKeyManager({
      password,
      keysPath: serverKeysPath,
      fs: fs,
      logger: logger,
    });

    const serverTLSConfig = {
      keyPrivatePem: serverKeyManager.getRootKeyPairPem().privateKey,
      certChainPem: await serverKeyManager.getRootCertChainPem(),
    };

    serverDb = await DB.createDB({
      dbPath: serverDbPath,
      fs: fs,
      logger: logger,
      crypto: {
        key: serverKeyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
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

    const serverFwdProxy = new ForwardProxy({
      authToken: '',
      logger: logger,
    });

    serverRevProxy = new ReverseProxy({
      logger: logger,
    });

    serverNodeManager = await NodeManager.createNodeManager({
      db: serverDb,
      sigchain: serverSigchain,
      keyManager: serverKeyManager,
      fwdProxy: serverFwdProxy,
      revProxy: serverRevProxy,
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
    await serverGestaltGraph.setNode(node);
    await serverNodeManager.start();
    const agentService = createAgentService({
      keyManager: serverKeyManager,
      vaultManager: serverVaultManager,
      nodeManager: serverNodeManager,
      sigchain: serverSigchain,
      notificationsManager: serverNotificationsManager,
    });
    agentServer = new GRPCServer({
      logger: logger,
    });
    await agentServer.start({
      services: [[AgentServiceService, agentService]],
      host: targetHost,
    });
    await serverRevProxy.start({
      serverHost: targetHost,
      serverPort: agentServer.port,
      ingressHost: targetHost,
      ingressPort: targetPort,
      tlsConfig: serverTLSConfig,
    });
    targetNodeId = serverKeyManager.getNodeId();

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

    const clientTLSConfig = {
      keyPrivatePem: clientKeyManager.getRootKeyPairPem().privateKey,
      certChainPem: await clientKeyManager.getRootCertChainPem(),
    };

    sourceNodeId = clientKeyManager.getNodeId();
    clientFwdProxy = new ForwardProxy({
      authToken: authToken,
      logger: logger,
    });
    await clientFwdProxy.start({
      tlsConfig: clientTLSConfig,
      egressHost: sourceHost,
      egressPort: sourcePort,
    });
  }, global.polykeyStartupTimeout * 2);

  afterEach(async () => {
    // Do you really need to clear the database state of NodeManager
    // To do NodeConnection testing?
    await serverNodeManager.clearDB();
  });

  afterAll(async () => {
    await clientFwdProxy.stop();
    await clientKeyManager.stop();
    await clientKeyManager.destroy();
    await fs.promises.rm(clientDataDir, {
      force: true,
      recursive: true,
    });

    await serverACL.stop();
    await serverACL.destroy();
    await serverSigchain.stop();
    await serverSigchain.destroy();
    await serverGestaltGraph.stop();
    await serverGestaltGraph.destroy();
    await serverVaultManager.stop();
    await serverVaultManager.destroy();
    await serverNodeManager.stop();
    await serverNodeManager.destroy();
    await serverNotificationsManager.stop();
    await serverNotificationsManager.destroy();
    await agentServer.stop();
    await serverRevProxy.stop();
    await serverKeyManager.stop();
    await serverKeyManager.destroy();
    await serverDb.stop();
    await serverDb.destroy();
    await fs.promises.rm(serverDataDir, {
      force: true,
      recursive: true,
    });
  });

  test('session readiness', async () => {
    logger.debug('session readiness start');
    const nodeConnection = await NodeConnection.createNodeConnection({
      targetNodeId: targetNodeId,
      targetHost: targetHost,
      targetPort: targetPort,
      forwardProxy: clientFwdProxy,
      keyManager: clientKeyManager,
      logger: logger,
    });
    await expect(nodeConnection.destroy()).rejects.toThrow(
      nodesErrors.ErrorNodeConnectionRunning,
    );
    // Should be a noop
    await nodeConnection.start();
    await nodeConnection.stop();
    await nodeConnection.destroy();
    await expect(nodeConnection.start()).rejects.toThrow(
      nodesErrors.ErrorNodeConnectionDestroyed,
    );
    expect(() => {
      nodeConnection.getRootCertChain();
    }).toThrow(nodesErrors.ErrorNodeConnectionNotRunning);
    await expect(async () => {
      await nodeConnection.getClosestNodes('abc' as NodeId);
    }).rejects.toThrow(nodesErrors.ErrorNodeConnectionNotRunning);
    // Explicitly close the connection such that there's no interference in next test
    await serverRevProxy.closeConnection(sourceHost, sourcePort);
  });
  test('connects to its target (via direct connection)', async () => {
    const conn = await NodeConnection.createNodeConnection({
      targetNodeId: targetNodeId,
      targetHost: targetHost,
      targetPort: targetPort,
      forwardProxy: clientFwdProxy,
      keyManager: clientKeyManager,
      logger: logger,
    });
    // Because the connection will not have enough time to compose before we
    // attempt to acquire the connection info, we need to wait and poll it
    const connInfo = await poll<ConnectionInfo | undefined>(
      async () => {
        return serverRevProxy.getConnectionInfoByEgress(sourceHost, sourcePort);
      },
      (e) => {
        if (e instanceof networkErrors.ErrorConnectionNotComposed) return false;
        return true;
      },
    );
    expect(connInfo).toBeDefined();
    expect(connInfo).toMatchObject({
      nodeId: sourceNodeId,
      certificates: expect.any(Array),
      egressHost: sourceHost,
      egressPort: sourcePort,
      ingressHost: targetHost,
      ingressPort: targetPort,
    });
    await conn.stop();
    await conn.destroy();
  });
  test('fails to connect to target (times out)', async () => {
    await expect(
      NodeConnection.createNodeConnection({
        targetNodeId: targetNodeId,
        targetHost: '128.0.0.1' as Host,
        targetPort: 12345 as Port,
        connTimeout: 300,
        forwardProxy: clientFwdProxy,
        keyManager: clientKeyManager,
        logger: logger,
      }),
    ).rejects.toThrow(nodesErrors.ErrorNodeConnectionTimeout);
  });
  test('receives 20 closest local nodes from connected target', async () => {
    const conn = await NodeConnection.createNodeConnection({
      targetNodeId: targetNodeId,
      targetHost: targetHost,
      targetPort: targetPort,
      forwardProxy: clientFwdProxy,
      keyManager: clientKeyManager,
      logger: logger,
    });
    // Await serverRevProxy.openConnection(sourceHost, sourcePort);

    // Now generate and add 20 nodes that will be close to this node ID
    const addedClosestNodes: NodeData[] = [];
    for (let i = 1; i < 101; i += 5) {
      const closeNodeId = nodesTestUtils.generateNodeIdForBucket(
        targetNodeId,
        i,
      );
      const nodeAddress = {
        host: (i + '.' + i + '.' + i + '.' + i) as Host,
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
      const farNodeId = nodeIdGenerator(i);
      const nodeAddress = {
        host: (i + '.' + i + '.' + i + '.' + i) as Host,
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
    await serverRevProxy.closeConnection(
      clientFwdProxy.getEgressHost(),
      clientFwdProxy.getEgressPort(),
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
      forwardProxy: clientFwdProxy,
      keyManager: clientKeyManager,
      logger: logger,
    });
    await serverRevProxy.openConnection(sourceHost, sourcePort);

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
    await serverRevProxy.closeConnection(
      clientFwdProxy.getEgressHost(),
      clientFwdProxy.getEgressPort(),
    );
    await conn.destroy();
  });
});
