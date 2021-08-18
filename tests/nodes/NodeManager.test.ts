import type { NodeId, NodeAddress } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import type { CertificatePem, KeyPairPem } from '@/keys/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { KeyManager, utils as keysUtils } from '@/keys';
import { NodeManager } from '@/nodes';
import { ForwardProxy, ReverseProxy, utils as networkUtils } from '@/network';
import { Sigchain } from '@/sigchain';
import * as testUtils from '../utils';
import * as nodesErrors from '@/nodes/errors';
import { DB } from '@/db';

describe('NodeManager', () => {
  const logger = new Logger('NodeManagerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;
  let nodeManager: NodeManager;

  const fwdProxy = new ForwardProxy({
    authToken: 'abc',
    logger: logger,
  });
  const revProxy = new ReverseProxy({
    logger: logger,
  });
  let keyManager: KeyManager;
  let keyPairPem: KeyPairPem;
  let certPem: CertificatePem;
  let nodeId: NodeId;
  let db: DB;
  let sigchain: Sigchain;

  const serverHost = '::1' as Host;
  const serverPort = 1 as Port;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = new KeyManager({ keysPath, logger });
    await keyManager.start({ password: 'password' });

    const cert = keyManager.getRootCert();
    keyPairPem = keyManager.getRootKeyPairPem();
    certPem = keysUtils.certToPem(cert);
    nodeId = networkUtils.certNodeId(cert);

    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    await revProxy.start({
      serverHost,
      serverPort,
      tlsConfig: {
        keyPrivatePem: keyPairPem.privateKey,
        certChainPem: certPem,
      },
    });
    const dbPath = `${dataDir}/db`;
    db = new DB({ dbPath, logger });
    await db.start({
      keyPair: keyManager.getRootKeyPair(),
    });
    sigchain = new Sigchain({ keyManager, db, logger });
    await sigchain.start();

    nodeManager = new NodeManager({
      db,
      sigchain,
      keyManager,
      fwdProxy,
      revProxy,
      logger,
    });
    await nodeManager.start({ nodeId });
  });
  afterEach(async () => {
    await nodeManager.stop();
    await sigchain.stop();
    await db.stop();
    await keyManager.stop();
    await fwdProxy.stop();
    await revProxy.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test(
    'pings node',
    async () => {
      const server = await testUtils.setupRemoteKeynode({
        logger: logger,
      });
      const serverNodeId = server.nodes.getNodeId();
      let serverNodeAddress: NodeAddress = {
        ip: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
      };
      await nodeManager.setNode(serverNodeId, serverNodeAddress);

      // Set server node offline
      await server.stop();
      // Check if active
      // Case 1: cannot establish new connection, so offline
      const active1 = await nodeManager.pingNode(serverNodeId);
      expect(active1).toBe(false);
      // Bring server node online
      await server.start({ password: 'password' });
      // Update the node address (only changes because we start and stop)
      serverNodeAddress = {
        ip: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
      };
      await nodeManager.setNode(serverNodeId, serverNodeAddress);
      // Check if active
      // Case 2: can establish new connection, so online
      const active2 = await nodeManager.pingNode(serverNodeId);
      expect(active2).toBe(true);
      // Turn server node offline again
      await server.stop();
      // Check if active
      // Case 3: pre-existing connection no longer active, so offline
      const active3 = await nodeManager.pingNode(serverNodeId);
      expect(active3).toBe(false);

      await testUtils.cleanupRemoteKeynode(server);
    },
    global.defaultTimeout * 5,
  ); // ping needs to timeout (takes 20 seconds + setup + pulldown)
  test('finds node (local)', async () => {
    // Case 1: node already exists in the local node graph (no contact required)
    const nodeId = 'nodeId' as NodeId;
    const nodeAddress: NodeAddress = {
      ip: '127.0.0.1' as Host,
      port: 11111 as Port,
    };
    await nodeManager.setNode(nodeId, nodeAddress);
    // Expect no error thrown
    await expect(nodeManager.findNode(nodeId)).resolves.not.toThrowError();
    const foundAddress1 = await nodeManager.findNode(nodeId);
    expect(foundAddress1).toStrictEqual(nodeAddress);
  });
  test(
    'finds node (contacts remote node)',
    async () => {
      // Case 2: node can be found on the remote node
      const nodeId = 'nodeId' as NodeId;
      const nodeAddress: NodeAddress = {
        ip: '127.0.0.1' as Host,
        port: 11111 as Port,
      };
      const server = await testUtils.setupRemoteKeynode({ logger: logger });
      await nodeManager.setNode(server.nodes.getNodeId(), {
        ip: server.revProxy.getIngressHost(),
        port: server.revProxy.getIngressPort(),
      } as NodeAddress);
      await server.nodes.setNode(nodeId, nodeAddress);
      const foundAddress2 = await nodeManager.findNode(nodeId);
      expect(foundAddress2).toStrictEqual(nodeAddress);

      await testUtils.cleanupRemoteKeynode(server);
    },
    global.defaultTimeout * 5,
  ),
    test(
      'cannot find node (contacts remote node)',
      async () => {
        // Case 3: node exhausts all contacts and cannot find node
        const nodeId = 'unfindableNode' as NodeId;
        const server = await testUtils.setupRemoteKeynode({ logger: logger });
        await nodeManager.setNode(server.nodes.getNodeId(), {
          ip: server.revProxy.getIngressHost(),
          port: server.revProxy.getIngressPort(),
        } as NodeAddress);
        // Add a dummy node to the server node graph database
        // Server will not be able to connect to this node (the only node in its
        // database), and will therefore not be able to locate the node.
        await server.nodes.setNode(
          'dummyNode' as NodeId,
          {
            ip: '127.0.0.2' as Host,
            port: 22222 as Port,
          } as NodeAddress,
        );
        // So unfindableNode cannot be found
        await expect(nodeManager.findNode(nodeId)).rejects.toThrowError(
          nodesErrors.ErrorNodeGraphNodeNotFound,
        );

        await testUtils.cleanupRemoteKeynode(server);
      },
      global.defaultTimeout * 5,
    );
});
