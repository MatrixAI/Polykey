import type { NodeId, NodeInfo, NodeAddress } from '@/nodes/types';
import type { Host, Port, TLSConfig } from '@/network/types';
import type { KeyPairPem, CertificatePem } from '@/keys/types';

import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { DB } from '@/db';
import { ACL } from '@/acl';
import { Sigchain } from '@/sigchain';
import { GRPCServer } from '@/grpc';
import { KeyManager } from '@/keys';
import { VaultManager } from '@/vaults';
import { GestaltGraph } from '@/gestalts';
import { NodeManager } from '@/nodes';
import { NotificationsManager } from '@/notifications';
import { ForwardProxy, ReverseProxy } from '@/network';
import { AgentService, createAgentService } from '@/agent';

import * as networkUtils from '@/network/utils';

describe('NotificationsManager', () => {
  const node: NodeInfo = {
    id: 'NodeId' as NodeId,
    chain: {},
  };
  const logger = new Logger('NotificationsManager Test', LogLevel.WARN, [
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

  let receiverDataDir: string;
  let receiverKeyManager: KeyManager;
  let receiverVaultManager: VaultManager;
  let receiverNodeManager: NodeManager;
  let receiverSigchain: Sigchain;
  let receiverACL: ACL;
  let receiverGestaltGraph: GestaltGraph;
  let receiverDb: DB;
  let receiverNotificationsManager: NotificationsManager;

  let senderDataDir: string;
  let senderKeyManager: KeyManager;
  let senderDb: DB;
  let senderACL: ACL;
  let senderSigchain: Sigchain;
  let senderNodeManager: NodeManager;

  let senderNodeId: NodeId, receiverNodeId: NodeId;
  let senderKeyPairPem: KeyPairPem, receiverKeyPairPem: KeyPairPem;
  let senderCertPem: CertificatePem, receiverCertPem: CertificatePem;
  let fwdTLSConfig: TLSConfig, revTLSConfig: TLSConfig;

  let agentService;
  let server: GRPCServer;

  const senderHost = '127.0.0.1' as Host;
  const senderPort = 11110 as Port;
  const receiverHost = '127.0.0.2' as Host;
  const receiverPort = 11111 as Port;

  beforeAll(async () => {
    receiverDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-server'),
    );

    // Server setup
    const receiverKeysPath = path.join(receiverDataDir, 'receiverKeys');
    const receiverVaultsPath = path.join(receiverDataDir, 'receiverVaults');
    const receiverDbPath = path.join(receiverDataDir, 'receiverDb');

    receiverKeyManager = new KeyManager({
      keysPath: receiverKeysPath,
      fs: fs,
      logger: logger,
    });
    receiverDb = new DB({
      dbPath: receiverDbPath,
      fs: fs,
      logger: logger,
    });
    receiverACL = new ACL({
      db: receiverDb,
      logger: logger,
    });
    receiverSigchain = new Sigchain({
      keyManager: receiverKeyManager,
      db: receiverDb,
      logger: logger,
    });
    receiverGestaltGraph = new GestaltGraph({
      db: receiverDb,
      acl: receiverACL,
      logger: logger,
    });
    // won't be used so don't need to start
    const receiverFwdProxy = new ForwardProxy({
      authToken: '',
      logger: logger,
    });
    receiverNodeManager = new NodeManager({
      db: receiverDb,
      sigchain: receiverSigchain,
      keyManager: receiverKeyManager,
      fwdProxy: receiverFwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });
    receiverVaultManager = new VaultManager({
      vaultsPath: receiverVaultsPath,
      keyManager: receiverKeyManager,
      nodeManager: receiverNodeManager,
      db: receiverDb,
      acl: receiverACL,
      gestaltGraph: receiverGestaltGraph,
      fs: fs,
      logger: logger,
    });
    receiverNotificationsManager = new NotificationsManager({
      acl: receiverACL,
      db: receiverDb,
      nodeManager: receiverNodeManager,
      keyManager: receiverKeyManager,
      messageCap: 5,
      logger: logger,
    });
    await receiverKeyManager.start({ password: 'password' });
    receiverKeyPairPem = receiverKeyManager.getRootKeyPairPem();
    receiverCertPem = receiverKeyManager.getRootCertPem();
    receiverNodeId = networkUtils.certNodeId(receiverKeyManager.getRootCert());
    revTLSConfig = {
      keyPrivatePem: receiverKeyPairPem.privateKey,
      certChainPem: receiverCertPem,
    };
    await receiverDb.start({ keyPair: receiverKeyManager.getRootKeyPair() });
    await receiverACL.start();
    await receiverSigchain.start();
    await receiverGestaltGraph.start();
    await receiverGestaltGraph.setNode(node);
    await receiverNodeManager.start({ nodeId: receiverNodeId });
    await receiverNotificationsManager.start();
    await receiverVaultManager.start({});

    agentService = createAgentService({
      vaultManager: receiverVaultManager,
      nodeManager: receiverNodeManager,
      sigchain: receiverSigchain,
      notificationsManager: receiverNotificationsManager,
    });
    server = new GRPCServer({
      services: [[AgentService, agentService]],
      logger: logger,
    });
    await server.start({
      host: receiverHost,
    });

    await revProxy.start({
      ingressHost: receiverHost,
      ingressPort: receiverPort,
      serverHost: receiverHost,
      serverPort: server.getPort(),
      tlsConfig: revTLSConfig,
    });
  }, global.polykeyStartupTimeout);

  beforeEach(async () => {
    senderDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-sender'),
    );
    const senderKeysPath = path.join(senderDataDir, 'senderKeys');
    const senderDbPath = await fs.promises.mkdtemp(
      path.join(senderDataDir, 'senderDb'),
    );
    // won't be used so don't need to start
    const senderRevProxy = new ReverseProxy({
      logger: logger,
    });
    senderKeyManager = new KeyManager({ keysPath: senderKeysPath, fs, logger });
    senderDb = new DB({ dbPath: senderDbPath, fs, logger });
    senderACL = new ACL({ db: senderDb, logger });
    senderSigchain = new Sigchain({
      keyManager: senderKeyManager,
      db: senderDb,
      logger,
    });
    senderNodeManager = new NodeManager({
      db: senderDb,
      sigchain: senderSigchain,
      keyManager: senderKeyManager,
      fwdProxy,
      revProxy: senderRevProxy,
      fs,
      logger,
    });

    await senderKeyManager.start({ password: 'password' });
    senderKeyPairPem = senderKeyManager.getRootKeyPairPem();
    senderCertPem = senderKeyManager.getRootCertPem();
    senderNodeId = networkUtils.certNodeId(senderKeyManager.getRootCert());
    fwdTLSConfig = {
      keyPrivatePem: senderKeyPairPem.privateKey,
      certChainPem: senderCertPem,
    };
    await senderDb.start({ keyPair: senderKeyManager.getRootKeyPair() });
    await senderACL.start();
    await fwdProxy.start({
      tlsConfig: fwdTLSConfig,
      proxyHost: senderHost,
      proxyPort: senderPort,
      egressHost: senderHost,
      egressPort: senderPort,
    });
    await senderNodeManager.start({ nodeId: senderNodeId });
    await senderNodeManager.setNode(receiverNodeId, {
      ip: receiverHost,
      port: receiverPort,
    } as NodeAddress);

    await receiverNotificationsManager.clearNotifications();
    expect(await receiverNotificationsManager.readNotifications()).toEqual([]);
  }, global.polykeyStartupTimeout);

  afterEach(async () => {
    await fs.promises.rm(senderDataDir, {
      force: true,
      recursive: true,
    });

    await senderNodeManager.stop();
    await fwdProxy.stop();
    await senderACL.stop();
    await senderDb.stop();
    await senderKeyManager.stop();
  });

  afterAll(async () => {
    await fs.promises.rm(receiverDataDir, {
      force: true,
      recursive: true,
    });
    await revProxy.stop();
    await receiverKeyManager.stop();
    await receiverDb.stop();
    await receiverACL.stop();
    await receiverSigchain.stop();
    await receiverGestaltGraph.stop();
    await receiverVaultManager.stop();
    await receiverNodeManager.stop();
    await receiverNotificationsManager.stop();
    await server.stop();
  });

  test('can send notifications', async () => {
    const senderNotificationsManager = new NotificationsManager({
      acl: senderACL,
      db: senderDb,
      nodeManager: senderNodeManager,
      keyManager: senderKeyManager,
      logger,
    });
    await senderNotificationsManager.start({});
    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await senderNotificationsManager.sendNotification(receiverNodeId, 'msg');
    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {},
      vaults: {},
    });
    await senderNotificationsManager.sendNotification(receiverNodeId, 'msg');
    await senderNotificationsManager.stop();
  });

  test('can receive and read sent notifications', async () => {
    const senderNotificationsManager = new NotificationsManager({
      acl: senderACL,
      db: senderDb,
      nodeManager: senderNodeManager,
      keyManager: senderKeyManager,
      logger,
    });
    await senderNotificationsManager.start({});

    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await senderNotificationsManager.sendNotification(receiverNodeId, 'msg');
    const msg = await receiverNotificationsManager.readNotifications();
    expect(msg).toEqual(['msg']);

    await senderNotificationsManager.stop();
  });

  test('cannot receive notifications without notify permission', async () => {
    const senderNotificationsManager = new NotificationsManager({
      acl: senderACL,
      db: senderDb,
      nodeManager: senderNodeManager,
      keyManager: senderKeyManager,
      logger,
    });
    await senderNotificationsManager.start({});

    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {},
      vaults: {},
    });

    await senderNotificationsManager.sendNotification(receiverNodeId, 'msg');
    const msg = await receiverNotificationsManager.readNotifications();
    expect(msg).toEqual([]);

    await senderNotificationsManager.stop();
  });

  test('notifications are read in order they were sent', async () => {
    const senderNotificationsManager = new NotificationsManager({
      acl: senderACL,
      db: senderDb,
      nodeManager: senderNodeManager,
      keyManager: senderKeyManager,
      logger,
    });
    await senderNotificationsManager.start({});

    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await senderNotificationsManager.sendNotification(receiverNodeId, 'msg1');
    await senderNotificationsManager.sendNotification(receiverNodeId, 'msg2');
    await senderNotificationsManager.sendNotification(receiverNodeId, 'msg3');
    const msgs = await receiverNotificationsManager.readNotifications();
    expect(msgs).toEqual(['msg3', 'msg2', 'msg1']);

    await senderNotificationsManager.stop();
  });

  test('notifications can be capped', async () => {
    const senderNotificationsManager = new NotificationsManager({
      acl: senderACL,
      db: senderDb,
      nodeManager: senderNodeManager,
      keyManager: senderKeyManager,
      logger,
    });
    await senderNotificationsManager.start({});

    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    for (let i = 0; i <= 5; i++) {
      const msg = i.toString();
      await senderNotificationsManager.sendNotification(receiverNodeId, msg);
    }
    const msgs = await receiverNotificationsManager.readNotifications();
    expect(msgs).toEqual(['5', '4', '3', '2', '1']);

    await senderNotificationsManager.stop();
  });
});
