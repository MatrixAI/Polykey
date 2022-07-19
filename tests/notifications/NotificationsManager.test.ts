import type { NodeId } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import type { VaultActions, VaultName } from '@/vaults/types';
import type { Notification, NotificationData } from '@/notifications/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import Queue from '@/nodes/Queue';
import PolykeyAgent from '@/PolykeyAgent';
import ACL from '@/acl/ACL';
import Sigchain from '@/sigchain/Sigchain';
import KeyManager from '@/keys/KeyManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import NotificationsManager from '@/notifications/NotificationsManager';
import Proxy from '@/network/Proxy';

import * as notificationsErrors from '@/notifications/errors';
import * as vaultsUtils from '@/vaults/utils';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as testUtils from '../utils';
import { globalRootKeyPems } from '../globalRootKeyPems';

describe('NotificationsManager', () => {
  const password = 'password';
  const logger = new Logger(
    `${NotificationsManager.name} Test`,
    LogLevel.WARN,
    [new StreamHandler()],
  );
  const senderId = IdInternal.create<NodeId>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 5,
  ]);
  const senderIdEncoded = nodesUtils.encodeNodeId(
    IdInternal.create<NodeId>([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 5,
    ]),
  );
  /**
   * Shared ACL, DB, NodeManager, KeyManager for all tests
   */
  let dataDir: string;
  let acl: ACL;
  let db: DB;
  let nodeGraph: NodeGraph;
  let queue: Queue;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let keyManager: KeyManager;
  let sigchain: Sigchain;
  let proxy: Proxy;

  let receiver: PolykeyAgent;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
      privateKeyPemOverride: globalRootKeyPems[0],
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    acl = await ACL.createACL({
      db,
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyManager,
      logger,
    });
    proxy = new Proxy({
      authToken: 'abc123',
      logger,
    });
    await proxy.start({
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
      serverHost: '127.0.0.1' as Host,
      serverPort: 0 as Port,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger,
    });
    queue = new Queue({ logger });
    nodeConnectionManager = new NodeConnectionManager({
      nodeGraph,
      keyManager,
      proxy,
      queue,
      logger,
    });
    nodeManager = new NodeManager({
      db,
      keyManager,
      sigchain,
      nodeConnectionManager,
      nodeGraph,
      queue,
      logger,
    });
    await queue.start();
    await nodeManager.start();
    await nodeConnectionManager.start({ nodeManager });
    // Set up node for receiving notifications
    receiver = await PolykeyAgent.createPolykeyAgent({
      password: password,
      nodePath: path.join(dataDir, 'receiver'),
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[1],
      },
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
      },
      logger,
    });
    await nodeGraph.setNode(receiver.keyManager.getNodeId(), {
      host: receiver.proxy.getProxyHost(),
      port: receiver.proxy.getProxyPort(),
    });
  }, global.defaultTimeout);
  afterEach(async () => {
    await receiver.stop();
    await queue.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await nodeGraph.stop();
    await proxy.stop();
    await sigchain.stop();
    await acl.stop();
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('notifications manager readiness', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    await expect(notificationsManager.destroy()).rejects.toThrow(
      notificationsErrors.ErrorNotificationsRunning,
    );
    // Should be a noop
    await notificationsManager.start();
    await notificationsManager.stop();
    await notificationsManager.destroy();
    await expect(notificationsManager.start()).rejects.toThrow(
      notificationsErrors.ErrorNotificationsDestroyed,
    );
    await expect(async () => {
      await notificationsManager.readNotifications();
    }).rejects.toThrow(notificationsErrors.ErrorNotificationsNotRunning);
    await expect(async () => {
      await notificationsManager.clearNotifications();
    }).rejects.toThrow(notificationsErrors.ErrorNotificationsNotRunning);
  });
  test('can send notifications with permission', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const generalNotification: NotificationData = {
      type: 'General',
      message: 'msg',
    };
    const gestaltNotification: NotificationData = {
      type: 'GestaltInvite',
    };
    const vaultNotification: NotificationData = {
      type: 'VaultShare',
      vaultId: vaultsUtils.encodeVaultId(vaultsUtils.generateVaultId()),
      vaultName: 'vaultName' as VaultName,
      actions: {
        clone: null,
        pull: null,
      } as VaultActions,
    };
    await receiver.acl.setNodePerm(keyManager.getNodeId(), {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.sendNotification(
      receiver.keyManager.getNodeId(),
      generalNotification,
    );
    await notificationsManager.sendNotification(
      receiver.keyManager.getNodeId(),
      gestaltNotification,
    );
    await notificationsManager.sendNotification(
      receiver.keyManager.getNodeId(),
      vaultNotification,
    );
    const receivedNotifications =
      await receiver.notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(3);
    expect(receivedNotifications[0].data).toEqual(vaultNotification);
    expect(receivedNotifications[0].senderId).toBe(
      nodesUtils.encodeNodeId(keyManager.getNodeId()),
    );
    expect(receivedNotifications[1].data).toEqual(gestaltNotification);
    expect(receivedNotifications[1].senderId).toBe(
      nodesUtils.encodeNodeId(keyManager.getNodeId()),
    );
    expect(receivedNotifications[2].data).toEqual(generalNotification);
    expect(receivedNotifications[2].senderId).toBe(
      nodesUtils.encodeNodeId(keyManager.getNodeId()),
    );
    // Reverse side-effects
    await receiver.notificationsManager.clearNotifications();
    await receiver.acl.unsetNodePerm(keyManager.getNodeId());
    await notificationsManager.stop();
  });
  test('cannot send notifications without permission', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const generalNotification: NotificationData = {
      type: 'General',
      message: 'msg',
    };
    const gestaltNotification: NotificationData = {
      type: 'GestaltInvite',
    };
    const vaultNotification: NotificationData = {
      type: 'VaultShare',
      vaultId: vaultsUtils.encodeVaultId(vaultsUtils.generateVaultId()),
      vaultName: 'vaultName' as VaultName,
      actions: {
        clone: null,
        pull: null,
      } as VaultActions,
    };

    await testUtils.expectRemoteError(
      notificationsManager.sendNotification(
        receiver.keyManager.getNodeId(),
        generalNotification,
      ),
      notificationsErrors.ErrorNotificationsPermissionsNotFound,
    );
    await testUtils.expectRemoteError(
      notificationsManager.sendNotification(
        receiver.keyManager.getNodeId(),
        gestaltNotification,
      ),
      notificationsErrors.ErrorNotificationsPermissionsNotFound,
    );
    await testUtils.expectRemoteError(
      notificationsManager.sendNotification(
        receiver.keyManager.getNodeId(),
        vaultNotification,
      ),
      notificationsErrors.ErrorNotificationsPermissionsNotFound,
    );
    const receivedNotifications =
      await receiver.notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(0);
    // Reverse side-effects
    await notificationsManager.stop();
  });
  test('can receive notifications from senders with permission', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification1: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      data: {
        type: 'GestaltInvite',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      data: {
        type: 'VaultShare',
        vaultId: vaultsUtils.encodeVaultId(vaultsUtils.generateVaultId()),
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        } as VaultActions,
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification1);
    await notificationsManager.receiveNotification(notification2);
    await notificationsManager.receiveNotification(notification3);
    const receivedNotifications =
      await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(3);
    expect(receivedNotifications[0].data).toEqual(notification3.data);
    expect(receivedNotifications[0].senderId).toEqual(senderIdEncoded);
    expect(receivedNotifications[1].data).toEqual(notification2.data);
    expect(receivedNotifications[1].senderId).toEqual(senderIdEncoded);
    expect(receivedNotifications[2].data).toEqual(notification1.data);
    expect(receivedNotifications[2].senderId).toEqual(senderIdEncoded);
    // Reverse side-effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('cannot receive notifications from senders without permission', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    // No permissions
    await expect(async () =>
      notificationsManager.receiveNotification(notification),
    ).rejects.toThrow(
      notificationsErrors.ErrorNotificationsPermissionsNotFound,
    );
    let receivedNotifications = await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(0);
    // Missing permission
    await acl.setNodePerm(senderId, {
      gestalt: {},
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification);
    receivedNotifications = await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(0);
    // Reverse side-effects
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('marks notifications as read', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification);
    const receivedNotifications =
      await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(1);
    expect(receivedNotifications[0].isRead).toBeTruthy();
    // Reverse side-effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('all notifications are read oldest to newest by default', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification1: Notification = {
      data: {
        type: 'General',
        message: 'msg1',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      data: {
        type: 'General',
        message: 'msg2',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      data: {
        type: 'General',
        message: 'msg3',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification1);
    await notificationsManager.receiveNotification(notification2);
    await notificationsManager.receiveNotification(notification3);
    const receivedNotifications =
      await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(3);
    expect(receivedNotifications[0].data['message']).toBe('msg3');
    expect(receivedNotifications[1].data['message']).toBe('msg2');
    expect(receivedNotifications[2].data['message']).toBe('msg1');
    // Reverse side-effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('can read only unread notifications', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification1: Notification = {
      data: {
        type: 'General',
        message: 'msg1',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      data: {
        type: 'General',
        message: 'msg2',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      data: {
        type: 'General',
        message: 'msg3',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification1);
    await notificationsManager.receiveNotification(notification2);
    await notificationsManager.receiveNotification(notification3);
    await notificationsManager.readNotifications();
    const unreadNotifications = await notificationsManager.readNotifications({
      unread: true,
    });
    expect(unreadNotifications).toHaveLength(0);
    // Reverse side-effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('can read a single notification', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification1: Notification = {
      data: {
        type: 'General',
        message: 'msg1',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      data: {
        type: 'General',
        message: 'msg2',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      data: {
        type: 'General',
        message: 'msg3',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification1);
    await notificationsManager.receiveNotification(notification2);
    await notificationsManager.receiveNotification(notification3);
    const lastNotification = await notificationsManager.readNotifications({
      number: 1,
    });
    expect(lastNotification).toHaveLength(1);
    // Reverse side-effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('can read notifications in reverse order', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification1: Notification = {
      data: {
        type: 'General',
        message: 'msg1',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      data: {
        type: 'General',
        message: 'msg2',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      data: {
        type: 'General',
        message: 'msg3',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification1);
    await notificationsManager.receiveNotification(notification2);
    await notificationsManager.receiveNotification(notification3);
    const reversedNotifications = await notificationsManager.readNotifications({
      order: 'oldest',
    });
    expect(reversedNotifications).toHaveLength(3);
    expect(reversedNotifications[0].data['message']).toBe('msg1');
    expect(reversedNotifications[1].data['message']).toBe('msg2');
    expect(reversedNotifications[2].data['message']).toBe('msg3');
    // Reverse side-effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('notifications can be capped and oldest notifications deleted', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        messageCap: 2,
        logger,
      });
    const notification1: Notification = {
      data: {
        type: 'General',
        message: 'msg1',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      data: {
        type: 'General',
        message: 'msg2',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      data: {
        type: 'General',
        message: 'msg3',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification1);
    await notificationsManager.receiveNotification(notification2);
    await notificationsManager.receiveNotification(notification3);
    const receivedNotifications =
      await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(2);
    expect(receivedNotifications[0].data['message']).toBe('msg3');
    expect(receivedNotifications[1].data['message']).toBe('msg2');
    // Reverse side-effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('can find a gestalt invite notification', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification: Notification = {
      data: {
        type: 'GestaltInvite',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification);
    const receivedInvite = await notificationsManager.findGestaltInvite(
      senderId,
    );
    expect(receivedInvite).toEqual(notification);
    // Reverse side-effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('clears notifications', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification);
    await notificationsManager.clearNotifications();
    const receivedNotifications =
      await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(0);
    // Reverse side-effects
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('notifications are persistent across restarts', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification1: Notification = {
      data: {
        type: 'General',
        message: 'msg1',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      data: {
        type: 'General',
        message: 'msg2',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification1);
    await notificationsManager.receiveNotification(notification2);
    await notificationsManager.readNotifications({ number: 1 });
    await notificationsManager.stop();
    await notificationsManager.start();
    const unreadNotifications = await notificationsManager.readNotifications({
      unread: true,
    });
    expect(unreadNotifications).toHaveLength(1);
    expect(unreadNotifications[0].data).toEqual(notification1.data);
    expect(unreadNotifications[0].senderId).toBe(notification1.senderId);
    const latestNotification = await notificationsManager.readNotifications({
      number: 1,
    });
    expect(latestNotification).toHaveLength(1);
    expect(latestNotification[0].data).toEqual(notification2.data);
    expect(latestNotification[0].senderId).toBe(notification2.senderId);
    // Reverse side-effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('creating fresh notifications manager', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeConnectionManager,
        nodeManager,
        keyManager,
        logger,
      });
    const notification: Notification = {
      data: {
        type: 'General',
        message: 'msg',
      },
      senderId: senderIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification);
    await notificationsManager.stop();
    await notificationsManager.start({ fresh: true });
    const receivedNotifications =
      await notificationsManager.readNotifications();
    expect(receivedNotifications).toHaveLength(0);
    // Reverse side-effects
    await notificationsManager.clearNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
});
