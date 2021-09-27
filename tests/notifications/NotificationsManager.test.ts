import type { NodeId, NodeInfo, NodeAddress } from '@/nodes/types';
import type { Host, Port, TLSConfig } from '@/network/types';
import type { KeyPairPem, CertificatePem } from '@/keys/types';
import type { VaultActions, VaultId, VaultName } from '@/vaults/types';
import type { NotificationData } from '@/notifications/types';

import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { DB } from '@matrixai/db';
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
import { makeCrypto } from '../utils';

describe('NotificationsManager', () => {
  const password = 'password';
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

    receiverKeyManager = await KeyManager.createKeyManager({
      password,
      keysPath: receiverKeysPath,
      fs: fs,
      logger: logger,
    });
    receiverDb = await DB.createDB({
      dbPath: receiverDbPath,
      fs: fs,
      logger: logger,
      crypto: makeCrypto(receiverKeyManager),
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
    // Won't be used so don't need to start
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
    receiverKeyPairPem = receiverKeyManager.getRootKeyPairPem();
    receiverCertPem = receiverKeyManager.getRootCertPem();
    receiverNodeId = networkUtils.certNodeId(receiverKeyManager.getRootCert());
    revTLSConfig = {
      keyPrivatePem: receiverKeyPairPem.privateKey,
      certChainPem: receiverCertPem,
    };
    await receiverDb.start();
    await receiverACL.start();
    await receiverSigchain.start();
    await receiverGestaltGraph.start();
    await receiverGestaltGraph.setNode(node);
    await receiverNodeManager.start();
    await receiverNotificationsManager.start();
    await receiverVaultManager.start({});

    agentService = createAgentService({
      keyManager: receiverKeyManager,
      vaultManager: receiverVaultManager,
      nodeManager: receiverNodeManager,
      sigchain: receiverSigchain,
      notificationsManager: receiverNotificationsManager,
    });
    server = new GRPCServer({
      logger: logger,
    });
    await server.start({
      services: [[AgentService, agentService]],
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
    // Won't be used so don't need to start
    const senderRevProxy = new ReverseProxy({
      logger: logger,
    });
    senderKeyManager = await KeyManager.createKeyManager({
      password,
      keysPath: senderKeysPath,
      fs,
      logger,
    });
    senderDb = await DB.createDB({
      dbPath: senderDbPath,
      fs,
      logger,
      crypto: makeCrypto(senderKeyManager),
    });
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

    senderKeyPairPem = senderKeyManager.getRootKeyPairPem();
    senderCertPem = senderKeyManager.getRootCertPem();
    senderNodeId = networkUtils.certNodeId(senderKeyManager.getRootCert());
    fwdTLSConfig = {
      keyPrivatePem: senderKeyPairPem.privateKey,
      certChainPem: senderCertPem,
    };
    await senderDb.start();
    await senderACL.start();
    await fwdProxy.start({
      tlsConfig: fwdTLSConfig,
      proxyHost: senderHost,
      proxyPort: senderPort,
      egressHost: senderHost,
      egressPort: senderPort,
    });
    await senderNodeManager.start();
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
    const notificationData: NotificationData = {
      type: 'General',
      message: 'msg',
    };
    // Can send with permissions
    await senderNotificationsManager.start({});
    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    // Can send without permissions
    await senderNotificationsManager.sendNotification(
      receiverNodeId,
      notificationData,
    );
    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {},
      vaults: {},
    });
    await senderNotificationsManager.sendNotification(
      receiverNodeId,
      notificationData,
    );
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

    const notificationData: NotificationData = {
      type: 'General',
      message: 'msg',
    };
    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await senderNotificationsManager.sendNotification(
      receiverNodeId,
      notificationData,
    );
    const notifs = await receiverNotificationsManager.readNotifications();
    expect(notifs[0].data).toEqual(notificationData);
    expect(notifs[0].senderId).toEqual(senderNodeId);
    expect(notifs[0].isRead).toBeTruthy();

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

    const notificationData: NotificationData = {
      type: 'General',
      message: 'msg',
    };
    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {},
      vaults: {},
    });

    await senderNotificationsManager.sendNotification(
      receiverNodeId,
      notificationData,
    );
    const notifs = await receiverNotificationsManager.readNotifications();
    expect(notifs).toEqual([]);

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

    const notificationData1: NotificationData = {
      type: 'General',
      message: 'msg1',
    };
    const notificationData2: NotificationData = {
      type: 'General',
      message: 'msg2',
    };
    const notificationData3: NotificationData = {
      type: 'General',
      message: 'msg3',
    };

    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await senderNotificationsManager.sendNotification(
      receiverNodeId,
      notificationData1,
    );
    await senderNotificationsManager.sendNotification(
      receiverNodeId,
      notificationData2,
    );
    await senderNotificationsManager.sendNotification(
      receiverNodeId,
      notificationData3,
    );
    const notifs = await receiverNotificationsManager.readNotifications();
    expect(notifs[0].data).toEqual(notificationData3);
    expect(notifs[1].data).toEqual(notificationData2);
    expect(notifs[2].data).toEqual(notificationData1);

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
      const notificationData: NotificationData = {
        type: 'General',
        message: i.toString(),
      };
      await senderNotificationsManager.sendNotification(
        receiverNodeId,
        notificationData,
      );
    }
    const notifs = await receiverNotificationsManager.readNotifications();
    expect(notifs[0].data).toEqual({
      type: 'General',
      message: '5',
    });
    expect(notifs[1].data).toEqual({
      type: 'General',
      message: '4',
    });
    expect(notifs[2].data).toEqual({
      type: 'General',
      message: '3',
    });
    expect(notifs[3].data).toEqual({
      type: 'General',
      message: '2',
    });
    expect(notifs[4].data).toEqual({
      type: 'General',
      message: '1',
    });

    await senderNotificationsManager.stop();
  });

  test('can send and receive Gestalt Invite notifications', async () => {
    const senderNotificationsManager = new NotificationsManager({
      acl: senderACL,
      db: senderDb,
      nodeManager: senderNodeManager,
      keyManager: senderKeyManager,
      logger,
    });
    await senderNotificationsManager.start({});

    const notificationData: NotificationData = {
      type: 'GestaltInvite',
    };
    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await senderNotificationsManager.sendNotification(
      receiverNodeId,
      notificationData,
    );
    const notifs = await receiverNotificationsManager.readNotifications();
    expect(notifs[0].data).toEqual(notificationData);
    expect(notifs[0].senderId).toEqual(senderNodeId);
    expect(notifs[0].isRead).toBeTruthy();

    await senderNotificationsManager.stop();
  });

  test('can send and receive Vault Share notifications', async () => {
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

    const notificationData: NotificationData = {
      type: 'VaultShare',
      vaultId: 'vaultId' as VaultId,
      vaultName: 'vaultName' as VaultName,
      actions: {
        clone: null,
        pull: null,
      } as VaultActions,
    };

    await senderNotificationsManager.sendNotification(
      receiverNodeId,
      notificationData,
    );
    const notifs = await receiverNotificationsManager.readNotifications();
    expect(notifs[0].data).toEqual(notificationData);
    expect(notifs[0].senderId).toEqual(senderNodeId);
    expect(notifs[0].isRead).toBeTruthy();

    await senderNotificationsManager.stop();
  });
});
