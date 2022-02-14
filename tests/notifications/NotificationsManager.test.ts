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
import { KeyManager, utils as keysUtils } from '@/keys';
import { VaultManager } from '@/vaults';
import { GestaltGraph } from '@/gestalts';
import { NodeConnectionManager, NodeGraph, NodeManager } from '@/nodes';
import { NotificationsManager } from '@/notifications';
import { ForwardProxy, ReverseProxy } from '@/network';
import { AgentServiceService, createAgentService } from '@/agent';
import { generateVaultId } from '@/vaults/utils';
import { utils as nodesUtils } from '@/nodes';
import * as testUtils from '../utils';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('NotificationsManager', () => {
  const password = 'password';
  const node: NodeInfo = {
    id: nodesUtils.encodeNodeId(testUtils.generateRandomNodeId()),
    chain: {},
  };
  const logger = new Logger('NotificationsManager Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const authToken = 'AUTH';
  let senderFwdProxy: ForwardProxy;
  let receiverRevProxy: ReverseProxy;
  let fwdTLSConfig: TLSConfig;

  let keysDataDir: string;
  let receiverDataDir: string;
  let receiverKeyManager: KeyManager;
  let receiverVaultManager: VaultManager;
  let receiverNodeGraph: NodeGraph;
  let receiverNodeManager: NodeManager;
  let receiverNodeConnectionManager: NodeConnectionManager;
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
  let senderNodeGraph: NodeGraph;
  let senderNodeConnectionManager: NodeConnectionManager;
  let senderNodeManager: NodeManager;

  let senderNodeId: NodeId, receiverNodeId: NodeId;
  let senderKeyPairPem: KeyPairPem, receiverKeyPairPem: KeyPairPem;
  let senderCertPem: CertificatePem, receiverCertPem: CertificatePem;

  let agentService;
  let agentServer: GRPCServer;

  // Keep IPs unique. ideally we'd use the generated IP and port. but this is good for now.
  // If this fails again we shouldn't specify the port and IP.
  const senderHost = '127.0.0.1' as Host;
  const receiverHost = '127.0.0.2' as Host;
  let receiverIngressPort: Port;

  beforeAll(async () => {
    keysDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-server'),
    );

    receiverDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-server'),
    );

    const senderKeysPath = path.join(keysDataDir, 'senderKeys');
    senderKeyManager = await KeyManager.createKeyManager({
      password,
      keysPath: senderKeysPath,
      fs,
      logger,
    });
    senderKeyPairPem = senderKeyManager.getRootKeyPairPem();
    senderCertPem = senderKeyManager.getRootCertPem();
    senderNodeId = keysUtils.certNodeId(senderKeyManager.getRootCert())!;
    fwdTLSConfig = {
      keyPrivatePem: senderKeyPairPem.privateKey,
      certChainPem: senderCertPem,
    };

    const receiverKeysPath = path.join(keysDataDir, 'receiverKeys');
    receiverKeyManager = await KeyManager.createKeyManager({
      password,
      keysPath: receiverKeysPath,
      fs: fs,
      logger: logger,
    });
    receiverKeyPairPem = receiverKeyManager.getRootKeyPairPem();
    receiverCertPem = receiverKeyManager.getRootCertPem();
    const revTLSConfig = {
      keyPrivatePem: receiverKeyPairPem.privateKey,
      certChainPem: receiverCertPem,
    };

    // Server setup
    const receiverVaultsPath = path.join(receiverDataDir, 'receiverVaults');
    const receiverDbPath = path.join(receiverDataDir, 'receiverDb');

    receiverDb = await DB.createDB({
      dbPath: receiverDbPath,
      fs: fs,
      logger: logger,
      crypto: {
        key: receiverKeyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
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
    const receiverFwdProxy = new ForwardProxy({
      authToken: '',
      logger: logger,
    });
    receiverRevProxy = new ReverseProxy({
      logger: logger,
    });
    receiverNodeGraph = await NodeGraph.createNodeGraph({
      db: receiverDb,
      keyManager: receiverKeyManager,
      logger: logger,
    });
    receiverNodeConnectionManager = new NodeConnectionManager({
      keyManager: receiverKeyManager,
      nodeGraph: receiverNodeGraph,
      fwdProxy: receiverFwdProxy,
      revProxy: receiverRevProxy,
      logger,
    });
    await receiverNodeConnectionManager.start();
    receiverNodeManager = new NodeManager({
      db: receiverDb,
      sigchain: receiverSigchain,
      keyManager: receiverKeyManager,
      nodeGraph: receiverNodeGraph,
      nodeConnectionManager: receiverNodeConnectionManager,
      logger: logger,
    });
    receiverVaultManager = await VaultManager.createVaultManager({
      keyManager: receiverKeyManager,
      vaultsPath: receiverVaultsPath,
      nodeConnectionManager: receiverNodeConnectionManager,
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
        nodeConnectionManager: receiverNodeConnectionManager,
        nodeManager: receiverNodeManager,
        keyManager: receiverKeyManager,
        messageCap: 5,
        logger: logger,
      });
    receiverNodeId = keysUtils.certNodeId(receiverKeyManager.getRootCert())!;
    await receiverGestaltGraph.setNode(node);

    agentService = createAgentService({
      keyManager: receiverKeyManager,
      vaultManager: receiverVaultManager,
      nodeManager: receiverNodeManager,
      nodeGraph: receiverNodeGraph,
      sigchain: receiverSigchain,
      nodeConnectionManager: receiverNodeConnectionManager,
      notificationsManager: receiverNotificationsManager,
    });
    agentServer = new GRPCServer({
      logger: logger,
    });
    await agentServer.start({
      services: [[AgentServiceService, agentService]],
      host: receiverHost,
    });

    await receiverRevProxy.start({
      serverHost: receiverHost,
      serverPort: agentServer.port,
      ingressHost: receiverHost,
      tlsConfig: revTLSConfig,
    });
    receiverIngressPort = receiverRevProxy.getIngressPort();
  }, global.polykeyStartupTimeout * 2);

  beforeEach(async () => {
    senderDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-sender'),
    );
    const senderDbPath = await fs.promises.mkdtemp(
      path.join(senderDataDir, 'senderDb'),
    );
    // Won't be used so don't need to start
    const senderRevProxy = new ReverseProxy({
      logger: logger,
    });
    senderFwdProxy = new ForwardProxy({
      authToken: authToken,
      logger: logger,
    });
    senderDb = await DB.createDB({
      dbPath: senderDbPath,
      fs,
      logger,
      crypto: {
        key: senderKeyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    senderACL = await ACL.createACL({ db: senderDb, logger });
    senderSigchain = await Sigchain.createSigchain({
      keyManager: senderKeyManager,
      db: senderDb,
      logger,
    });
    senderNodeGraph = await NodeGraph.createNodeGraph({
      db: senderDb,
      keyManager: senderKeyManager,
      logger,
    });
    senderNodeConnectionManager = new NodeConnectionManager({
      keyManager: senderKeyManager,
      nodeGraph: senderNodeGraph,
      fwdProxy: senderFwdProxy,
      revProxy: senderRevProxy,
      logger,
    });
    await senderNodeConnectionManager.start();
    senderNodeManager = new NodeManager({
      db: senderDb,
      sigchain: senderSigchain,
      keyManager: senderKeyManager,
      nodeGraph: senderNodeGraph,
      nodeConnectionManager: senderNodeConnectionManager,
      logger,
    });

    await senderACL.stop();
    await senderFwdProxy.start({
      tlsConfig: fwdTLSConfig,
      proxyHost: senderHost,
      // ProxyPort: senderPort,
      egressHost: senderHost,
      // EgressPort: senderPort,
    });
    await senderNodeGraph.setNode(receiverNodeId, {
      host: receiverHost,
      port: receiverIngressPort,
    } as NodeAddress);

    await receiverNotificationsManager.clearNotifications();
    expect(await receiverNotificationsManager.readNotifications()).toEqual([]);
  }, global.polykeyStartupTimeout * 2);

  afterEach(async () => {
    await senderNodeConnectionManager.stop();
    await senderNodeGraph.stop();
    await senderACL.stop();
    await senderFwdProxy.stop();
    await senderDb.stop();
    await fs.promises.rm(senderDataDir, {
      force: true,
      recursive: true,
    });
  });

  afterAll(async () => {
    await senderKeyManager.stop();
    await receiverACL.stop();
    await receiverSigchain.stop();
    await receiverGestaltGraph.stop();
    await receiverVaultManager.stop();
    await receiverNodeConnectionManager.stop();
    await receiverNodeGraph.stop();
    await receiverNotificationsManager.stop();
    await agentServer.stop();
    await receiverRevProxy.stop();
    await receiverKeyManager.stop();
    await receiverDb.stop();
    await fs.promises.rm(receiverDataDir, {
      force: true,
      recursive: true,
    });
  });

  test('can send notifications', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeConnectionManager: senderNodeConnectionManager,
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
    await senderNotificationsManager.stop();
  });

  test('can receive and read sent notifications', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeConnectionManager: senderNodeConnectionManager,
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
    expect(notifs[0].senderId).toEqual(nodesUtils.encodeNodeId(senderNodeId));
    expect(notifs[0].isRead).toBeTruthy();

    await senderNotificationsManager.stop();
  });

  test('cannot receive notifications without notify permission', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeConnectionManager: senderNodeConnectionManager,
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

    await senderNotificationsManager.stop();
  });

  test('notifications are read in order they were sent', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeConnectionManager: senderNodeConnectionManager,
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

    await senderNotificationsManager.stop();
  });

  test('notifications can be capped', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeConnectionManager: senderNodeConnectionManager,
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

    await senderNotificationsManager.stop();
  });

  test('can send and receive Gestalt Invite notifications', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeConnectionManager: senderNodeConnectionManager,
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
    expect(notifs[0].senderId).toEqual(nodesUtils.encodeNodeId(senderNodeId));
    expect(notifs[0].isRead).toBeTruthy();

    await senderNotificationsManager.stop();
  });

  test('can send and receive Vault Share notifications', async () => {
    const senderNotificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl: senderACL,
        db: senderDb,
        nodeConnectionManager: senderNodeConnectionManager,
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
    expect(notifs[0].senderId).toEqual(nodesUtils.encodeNodeId(senderNodeId));
    expect(notifs[0].isRead).toBeTruthy();

    await senderNotificationsManager.stop();
  });
});
