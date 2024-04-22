import type { NodeId, NodeIdEncoded } from '@/ids/types';
import type { Host } from '@/network/types';
import type { VaultActions, VaultName } from '@/vaults/types';
import type { Notification, NotificationData } from '@/notifications/types';
import type { Key } from '@/keys/types';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type { AgentServerManifest } from '@/nodes/agent/handlers';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { IdInternal } from '@matrixai/id';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import TaskManager from '@/tasks/TaskManager';
import PolykeyAgent from '@/PolykeyAgent';
import ACL from '@/acl/ACL';
import Sigchain from '@/sigchain/Sigchain';
import KeyRing from '@/keys/KeyRing';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import NotificationsManager from '@/notifications/NotificationsManager';
import * as nodesErrors from '@/nodes/errors';
import * as notificationsErrors from '@/notifications/errors';
import * as notificationsUtils from '@/notifications/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as utils from '@/utils';
import * as testUtils from '../utils';
import * as tlsTestsUtils from '../utils/tls';
import 'ix/add/asynciterable-operators/toarray';

describe('NotificationsManager', () => {
  const password = 'password';
  const localhost = '127.0.0.1';
  const logger = new Logger(
    `${NotificationsManager.name} Test`,
    LogLevel.WARN,
    [new StreamHandler()],
  );
  const senderId = IdInternal.create<NodeId>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 5,
  ]);
  const senderIdEncoded = nodesUtils.encodeNodeId(senderId);
  const targetIdEncoded = 'Target' as NodeIdEncoded;
  const vaultIdGenerator = vaultsUtils.createVaultIdGenerator();
  /**
   * Shared ACL, DB, NodeManager, KeyRing for all tests
   */
  let dataDir: string;
  let acl: ACL;
  let db: DB;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let keyRing: KeyRing;
  let sigchain: Sigchain;

  let receiver: PolykeyAgent;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
        },
      },
    });
    acl = await ACL.createACL({
      db,
      logger,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    const tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      tlsConfig,
      logger,
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      sigchain,
      nodeConnectionManager,
      nodeGraph,
      taskManager,
      gestaltGraph: {} as GestaltGraph,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localhost as Host,
      agentService: {} as AgentServerManifest,
    });
    // Set up node for receiving notifications
    receiver = await PolykeyAgent.createPolykeyAgent({
      password: password,
      options: {
        nodePath: path.join(dataDir, 'receiver'),
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
    await nodeGraph.setNodeContactAddressData(
      receiver.keyRing.getNodeId(),
      [receiver.agentServiceHost, receiver.agentServicePort],
      {
        mode: 'direct',
        connectedTime: 0,
        scopes: ['global'],
      },
    );
  }, globalThis.defaultTimeout);
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await receiver.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await nodeGraph.stop();
    await sigchain.stop();
    await acl.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
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
        nodeManager,
        taskManager,
        keyRing,
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
    await expect(
      notificationsManager.readInboxNotifications().next(),
    ).rejects.toThrow(notificationsErrors.ErrorNotificationsNotRunning);
    await expect(
      notificationsManager.clearInboxNotifications(),
    ).rejects.toThrow(notificationsErrors.ErrorNotificationsNotRunning);
  });
  test('can send notifications with permission', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
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
      vaultId: vaultsUtils.encodeVaultId(vaultIdGenerator()),
      vaultName: 'vaultName' as VaultName,
      actions: {
        clone: null,
        pull: null,
      } as VaultActions,
    };
    await receiver.acl.setNodePerm(keyRing.getNodeId(), {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    const sendProms = await db
      .withTransactionF(async (tran) => [
        await notificationsManager.sendNotification(
          {
            nodeId: receiver.keyRing.getNodeId(),
            data: generalNotification,
            retries: 0,
          },
          tran,
        ),
        await notificationsManager.sendNotification(
          {
            nodeId: receiver.keyRing.getNodeId(),
            data: gestaltNotification,
            retries: 0,
          },
          tran,
        ),
        await notificationsManager.sendNotification(
          {
            nodeId: receiver.keyRing.getNodeId(),
            data: vaultNotification,
            retries: 0,
          },
          tran,
        ),
      ])
      .then((value) => value.map((value) => value.sendP));
    const outboxNotifications = await AsyncIterable.as(
      notificationsManager.readOutboxNotifications(),
    ).toArray();
    expect(outboxNotifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: vaultNotification,
          iss: nodesUtils.encodeNodeId(keyRing.getNodeId()),
        }),
        expect.objectContaining({
          data: gestaltNotification,
          iss: nodesUtils.encodeNodeId(keyRing.getNodeId()),
        }),
        expect.objectContaining({
          data: generalNotification,
          iss: nodesUtils.encodeNodeId(keyRing.getNodeId()),
        }),
      ]),
    );
    await taskManager.startProcessing();
    await Promise.all(sendProms);
    await expect(
      notificationsManager
        .readOutboxNotifications()
        .next()
        .then((data) => data.done),
    ).resolves.toBe(true);
    const receivedNotifications = await AsyncIterable.as(
      receiver.notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(3);
    expect(receivedNotifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: vaultNotification,
          iss: nodesUtils.encodeNodeId(keyRing.getNodeId()),
        }),
        expect.objectContaining({
          data: gestaltNotification,
          iss: nodesUtils.encodeNodeId(keyRing.getNodeId()),
        }),
        expect.objectContaining({
          data: generalNotification,
          iss: nodesUtils.encodeNodeId(keyRing.getNodeId()),
        }),
      ]),
    );
    // Reverse side-effects
    await receiver.notificationsManager.clearInboxNotifications();
    await receiver.acl.unsetNodePerm(keyRing.getNodeId());
    await notificationsManager.stop();
  });
  test('cannot send notifications without permission', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    const generalNotification: NotificationData = {
      type: 'General',
      message: 'msg',
    };
    const gestaltNotification: NotificationData = {
      type: 'GestaltInvite',
    };
    const vaultNotification: NotificationData = {
      type: 'VaultShare',
      vaultId: vaultsUtils.encodeVaultId(vaultIdGenerator()),
      vaultName: 'vaultName' as VaultName,
      actions: {
        clone: null,
        pull: null,
      } as VaultActions,
    };

    await testUtils.expectRemoteError(
      notificationsManager
        .sendNotification({
          nodeId: receiver.keyRing.getNodeId(),
          data: generalNotification,
          retries: 0,
        })
        .then((value) => value.sendP),
      notificationsErrors.ErrorNotificationsPermissionsNotFound,
    );
    await testUtils.expectRemoteError(
      notificationsManager
        .sendNotification({
          nodeId: receiver.keyRing.getNodeId(),
          data: gestaltNotification,
          retries: 0,
        })
        .then((value) => value.sendP),
      notificationsErrors.ErrorNotificationsPermissionsNotFound,
    );
    await testUtils.expectRemoteError(
      notificationsManager
        .sendNotification({
          nodeId: receiver.keyRing.getNodeId(),
          data: vaultNotification,
          retries: 0,
        })
        .then((value) => value.sendP),
      notificationsErrors.ErrorNotificationsPermissionsNotFound,
    );
    await expect(
      notificationsManager
        .readOutboxNotifications()
        .next()
        .then((data) => data.done),
    ).resolves.toBe(true);
    const receivedNotifications = await AsyncIterable.as(
      receiver.notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(0);
    // Reverse side-effects
    await notificationsManager.stop();
  });
  test('reattempt send notifications', async () => {
    const spiedWithConnF = jest.spyOn(NodeManager.prototype, 'withConnF');
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        sendNotificationRetries: 5,
        sendNotificationRetryIntervalTimeMin: 0,
        sendNotificationRetryIntervalTimeMax: 0,
        keyRing,
        logger,
      });
    await taskManager.startProcessing();
    const { sendP } = await notificationsManager.sendNotification({
      nodeId: testUtils.generateRandomNodeId(),
      data: {
        type: 'General',
        message: 'msg',
      },
    });
    await expect(sendP).rejects.toThrow(
      nodesErrors.ErrorNodeManagerConnectionFailed,
    );
    expect(spiedWithConnF.mock.calls.length).toBe(6);
    await notificationsManager.stop();
    spiedWithConnF.mockRestore();
  });
  test('can receive notifications from senders with permission', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification1: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'GestaltInvite',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'VaultShare',
        vaultId: vaultsUtils.encodeVaultId(vaultIdGenerator()),
        vaultName: 'vaultName' as VaultName,
        actions: {
          clone: null,
          pull: null,
        } as VaultActions,
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
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
    const receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(3);
    expect(receivedNotifications[0].data).toEqual(notification3.data);
    expect(receivedNotifications[0].iss).toEqual(senderIdEncoded);
    expect(receivedNotifications[1].data).toEqual(notification2.data);
    expect(receivedNotifications[1].iss).toEqual(senderIdEncoded);
    expect(receivedNotifications[2].data).toEqual(notification1.data);
    expect(receivedNotifications[2].iss).toEqual(senderIdEncoded);
    // Reverse side-effects
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('cannot receive notifications from senders without permission', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    // No permissions
    await expect(async () =>
      notificationsManager.receiveNotification(notification),
    ).rejects.toThrow(
      notificationsErrors.ErrorNotificationsPermissionsNotFound,
    );
    let receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(0);
    // Missing permission
    await acl.setNodePerm(senderId, {
      gestalt: {},
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification);
    receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(0);
    // Reverse side-effects
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('marks notifications as read', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification);
    const receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(1);
    expect(receivedNotifications[0].isRead).toBeTruthy();
    // Reverse side-effects
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('all notifications are read oldest to newest by default', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification1: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg1',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg2',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg3',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
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
    const receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(3);
    expect(receivedNotifications[0].data['message']).toBe('msg3');
    expect(receivedNotifications[1].data['message']).toBe('msg2');
    expect(receivedNotifications[2].data['message']).toBe('msg1');
    // Reverse side-effects
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('can read only unread notifications', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification1: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg1',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg2',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg3',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
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
    for await (const _ of notificationsManager.readInboxNotifications()) {
      // Noop
    }
    const unreadNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications({
        unread: true,
      }),
    ).toArray();
    expect(unreadNotifications).toHaveLength(0);
    // Reverse side-effects
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('can read a single notification', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification1: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg1',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg2',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg3',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
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
    const lastNotification = await AsyncIterable.as(
      notificationsManager.readInboxNotifications({
        number: 1,
      }),
    ).toArray();
    expect(lastNotification).toHaveLength(1);
    // Reverse side-effects
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('can read notifications in reverse order', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification1: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg1',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg2',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg3',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
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
    const reversedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications({
        order: 'oldest',
      }),
    ).toArray();
    expect(reversedNotifications).toHaveLength(3);
    expect(reversedNotifications[0].data['message']).toBe('msg1');
    expect(reversedNotifications[1].data['message']).toBe('msg2');
    expect(reversedNotifications[2].data['message']).toBe('msg3');
    // Reverse side-effects
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('notifications can be capped and oldest notifications deleted', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        messageCap: 2,
        logger,
      });
    const notification1: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg1',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg2',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification3: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg3',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
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
    const receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(2);
    expect(receivedNotifications[0].data['message']).toBe('msg3');
    expect(receivedNotifications[1].data['message']).toBe('msg2');
    // Reverse side-effects
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('can find a gestalt invite notification', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationIdEncoded = notificationsUtils.encodeNotificationId(
      generateNotificationId(),
    );
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification: Notification = {
      notificationIdEncoded,
      typ: 'notification',
      data: {
        type: 'GestaltInvite',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification);
    const receivedInvite =
      await notificationsManager.findGestaltInvite(senderId);
    expect(receivedInvite).toEqual({
      ...notification,
      notificationIdEncoded: expect.any(String),
      peerNotificationIdEncoded: notificationIdEncoded,
    });
    // Reverse side-effects
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('clears notifications', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification);
    await notificationsManager.clearInboxNotifications();
    const receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(0);
    // Reverse side-effects
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('clears outbox notifications', async () => {
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    await receiver.acl.setNodePerm(keyRing.getNodeId(), {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.sendNotification({
      nodeId: receiver.keyRing.getNodeId(),
      data: {
        type: 'General',
        message: 'msg1',
      },
    });
    await notificationsManager.clearOutboxNotifications();
    const outboxNotifications = await AsyncIterable.as(
      notificationsManager.readOutboxNotifications(),
    ).toArray();
    expect(outboxNotifications).toHaveLength(0);
    // Reverse side-effects
    await receiver.notificationsManager.clearInboxNotifications();
    await receiver.acl.unsetNodePerm(keyRing.getNodeId());
    await notificationsManager.stop();
  });
  test('notifications are persistent across restarts', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification1: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg1',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    const notification2: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg2',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
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
    for await (const _ of notificationsManager.readInboxNotifications({
      number: 1,
    })) {
      // Noop
    }
    await notificationsManager.stop();
    await notificationsManager.start();
    const unreadNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications({
        unread: true,
      }),
    ).toArray();
    expect(unreadNotifications).toHaveLength(1);
    expect(unreadNotifications[0].data).toEqual(notification1.data);
    expect(unreadNotifications[0].iss).toBe(notification1.iss);
    const latestNotification = await AsyncIterable.as(
      notificationsManager.readInboxNotifications({
        number: 1,
      }),
    ).toArray();
    expect(latestNotification).toHaveLength(1);
    expect(latestNotification[0].data).toEqual(notification2.data);
    expect(latestNotification[0].iss).toBe(notification2.iss);
    // Reverse side-effects
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
  test('creating fresh notifications manager', async () => {
    const generateNotificationId =
      notificationsUtils.createNotificationIdGenerator();
    const notificationsManager =
      await NotificationsManager.createNotificationsManager({
        acl,
        db,
        nodeManager,
        taskManager,
        keyRing,
        logger,
      });
    const notification: Notification = {
      notificationIdEncoded: notificationsUtils.encodeNotificationId(
        generateNotificationId(),
      ),
      typ: 'notification',
      data: {
        type: 'General',
        message: 'msg',
      },
      iss: senderIdEncoded,
      sub: targetIdEncoded,
      isRead: false,
    };
    await acl.setNodePerm(senderId, {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await receiver.acl.setNodePerm(keyRing.getNodeId(), {
      gestalt: {
        notify: null,
      },
      vaults: {},
    });
    await notificationsManager.receiveNotification(notification);
    await notificationsManager.sendNotification({
      nodeId: receiver.keyRing.getNodeId(),
      data: {
        type: 'General',
        message: 'msg1',
      },
    });
    await notificationsManager.stop();
    await notificationsManager.start({ fresh: true });
    const receivedNotifications = await AsyncIterable.as(
      notificationsManager.readInboxNotifications(),
    ).toArray();
    expect(receivedNotifications).toHaveLength(0);
    const outboxNotifications = await AsyncIterable.as(
      notificationsManager.readOutboxNotifications(),
    ).toArray();
    expect(outboxNotifications).toHaveLength(0);
    // Reverse side-effects
    await receiver.notificationsManager.clearInboxNotifications();
    await receiver.acl.unsetNodePerm(keyRing.getNodeId());
    await notificationsManager.clearInboxNotifications();
    await acl.unsetNodePerm(senderId);
    await notificationsManager.stop();
  });
});
