import type { NodeId, NodeInfo, NodeAddress } from '@/nodes/types';
import type { Host, Port, TLSConfig } from '@/network/types';
import type { KeyPairPem, CertificatePem } from '@/keys/types';
import type { VaultActions, VaultName } from '@/vaults/types';
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
import { generateVaultId } from '@/vaults/utils';

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
  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;

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

  // Keep IPs unique. ideally we'd use the generated IP and port. but this is good for now.
  // If this fails again we shouldn't specify the port and IP.
  const senderHost = '127.0.0.1' as Host;
  const receiverHost = '127.0.0.2' as Host;
  let receiverIngressPort: Port;

  beforeAll(async () => {
    receiverDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-server'),
    );

    fwdProxy = await ForwardProxy.createForwardProxy({
      authToken: authToken,
      logger: logger,
    });
    revProxy = await ReverseProxy.createReverseProxy({
      logger: logger,
    });

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
    receiverACL = await ACL.createACL({
      db: receiverDb,
      logger: logger,
    });
    receiverSigchain = await Sigchain.createSigchain({
      keyManager: receiverKeyManager,
      db: receiverDb,
      logger: logger,
    });
    receiverGestaltGraph = await GestaltGraph.createGestaltGraph({
      db: receiverDb,
      acl: receiverACL,
      logger: logger,
    });
    // Won't be used so don't need to start
    const receiverFwdProxy = await ForwardProxy.createForwardProxy({
      authToken: '',
      logger: logger,
    });
    receiverNodeManager = await NodeManager.createNodeManager({
      db: receiverDb,
      sigchain: receiverSigchain,
      keyManager: receiverKeyManager,
      fwdProxy: receiverFwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });
    receiverVaultManager = await VaultManager.createVaultManager({
      keyManager: receiverKeyManager,
      vaultsPath: receiverVaultsPath,
      nodeManager: receiverNodeManager,
      vaultsKey: receiverKeyManager.vaultKey,
      db: receiverDb,
      acl: receiverACL,
      gestaltGraph: receiverGestaltGraph,
      fs: fs,
      logger: logger,
    });
    receiverNotificationsManager =
      await NotificationsManager.createNotificationsManager({
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
    await receiverGestaltGraph.setNode(node);
    await receiverNodeManager.start();

    agentService = createAgentService({
      keyManager: receiverKeyManager,
      vaultManager: receiverVaultManager,
      nodeManager: receiverNodeManager,
      sigchain: receiverSigchain,
      notificationsManager: receiverNotificationsManager,
    });
    server = await GRPCServer.createGRPCServer({
      logger: logger,
    });
    await server.start({
      services: [[AgentService, agentService]],
      host: receiverHost,
    });

    await revProxy.start({
      ingressHost: receiverHost,
      serverHost: receiverHost,
      serverPort: server.getPort(),
      tlsConfig: revTLSConfig,
    });
    receiverIngressPort = revProxy.getIngressPort();
  }, global.polykeyStartupTimeout * 2);

  beforeEach(async () => {
    senderDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-sender'),
    );
    const senderKeysPath = path.join(senderDataDir, 'senderKeys');
    const senderDbPath = await fs.promises.mkdtemp(
      path.join(senderDataDir, 'senderDb'),
    );
    // Won't be used so don't need to start
    const senderRevProxy = await ReverseProxy.createReverseProxy({
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
    senderACL = await ACL.createACL({ db: senderDb, logger });
    senderSigchain = await Sigchain.createSigchain({
      keyManager: senderKeyManager,
      db: senderDb,
      logger,
    });
    senderNodeManager = await NodeManager.createNodeManager({
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
    await senderACL.destroy();
    await fwdProxy.start({
      tlsConfig: fwdTLSConfig,
      proxyHost: senderHost,
      // ProxyPort: senderPort,
      egressHost: senderHost,
      // EgressPort: senderPort,
    });
    await senderNodeManager.start();
    await senderNodeManager.setNode(receiverNodeId, {
      ip: receiverHost,
      port: receiverIngressPort,
    } as NodeAddress);

    await receiverNotificationsManager.clearNotifications();
    expect(await receiverNotificationsManager.readNotifications()).toEqual([]);
  }, global.polykeyStartupTimeout * 2);

  afterEach(async () => {
    await fs.promises.rm(senderDataDir, {
      force: true,
      recursive: true,
    });

    await senderNodeManager.stop();
    // Await fwdProxy.stop(); // FIXME: why is this broken?
    await senderACL.destroy();
    await senderDb.stop();
    await senderKeyManager.destroy();
  });

  afterAll(async () => {
    await fs.promises.rm(receiverDataDir, {
      force: true,
      recursive: true,
    });
    await revProxy.stop();
    await receiverKeyManager.destroy();
    await receiverDb.stop();
    await receiverACL.destroy();
    await receiverSigchain.destroy();
    await receiverGestaltGraph.destroy();
    await receiverVaultManager.destroy();
    await receiverNodeManager.stop();
    await receiverNotificationsManager.destroy();
    await server.stop();
  });

  test('can send notifications', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
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
    await senderNotificationsManager.destroy();
  });

  test('can receive and read sent notifications', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
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

    await senderNotificationsManager.destroy();
  });

  test('cannot receive notifications without notify permission', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
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

    await senderNotificationsManager.destroy();
  });

  test('notifications are read in order they were sent', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeManager: senderNodeManager,
        keyManager: senderKeyManager,
        logger,
      });

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

    await senderNotificationsManager.destroy();
  });

  test('notifications can be capped', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeManager: senderNodeManager,
        keyManager: senderKeyManager,
        logger,
      });

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

    await senderNotificationsManager.destroy();
  });

  test('can send and receive Gestalt Invite notifications', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeManager: senderNodeManager,
        keyManager: senderKeyManager,
        logger,
      });

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

    await senderNotificationsManager.destroy();
  });

  test('can send and receive Vault Share notifications', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeManager: senderNodeManager,
        keyManager: senderKeyManager,
        logger,
      });

    await receiverACL.setNodePerm(senderNodeId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });

    const notificationData: NotificationData = {
      type: 'VaultShare',
      vaultId: generateVaultId().toString(),
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

    await senderNotificationsManager.destroy();
  });
});
