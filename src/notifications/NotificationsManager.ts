import type { DB, DBTransaction, LevelPath } from '@matrixai/db';
import type {
  NotificationId,
  Notification,
  NotificationData,
  NotificationIdGenerator,
} from './types';
import type ACL from '../acl/ACL';
import type KeyManager from '../keys/KeyManager';
import type NodeManager from '../nodes/NodeManager';
import type NodeConnectionManager from '../nodes/NodeConnectionManager';
import type { NodeId } from '../nodes/types';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { utils as idUtils } from '@matrixai/id';
import * as notificationsUtils from './utils';
import * as notificationsErrors from './errors';
import * as notificationsPB from '../proto/js/polykey/v1/notifications/notifications_pb';
import * as nodesUtils from '../nodes/utils';
import { never } from '../utils/utils';

const MESSAGE_COUNT_KEY = 'numMessages';

/**
 * Manage Node Notifications between Gestalts
 */
interface NotificationsManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new notificationsErrors.ErrorNotificationsRunning(),
  new notificationsErrors.ErrorNotificationsDestroyed(),
)
class NotificationsManager {
  static async createNotificationsManager({
    acl,
    db,
    nodeConnectionManager,
    nodeManager,
    keyManager,
    messageCap = 10000,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    acl: ACL;
    db: DB;
    nodeConnectionManager: NodeConnectionManager;
    nodeManager: NodeManager;
    keyManager: KeyManager;
    messageCap?: number;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<NotificationsManager> {
    logger.info(`Creating ${this.name}`);
    const notificationsManager = new this({
      acl,
      db,
      keyManager,
      logger,
      messageCap,
      nodeConnectionManager,
      nodeManager,
    });

    await notificationsManager.start({ fresh });
    logger.info(`Created ${this.name}`);
    return notificationsManager;
  }

  protected logger: Logger;
  protected acl: ACL;
  protected db: DB;
  protected keyManager: KeyManager;
  protected nodeManager: NodeManager;
  protected nodeConnectionManager: NodeConnectionManager;
  protected messageCap: number;

  /**
   * Top level stores MESSAGE_COUNT_KEY -> number (of messages)
   */
  protected notificationsDbPath: LevelPath = [this.constructor.name];
  /**
   * Messages stores NotificationId -> string (message)
   */
  protected notificationsMessagesDbPath: LevelPath = [
    this.constructor.name,
    'messages',
  ];

  protected notificationIdGenerator: NotificationIdGenerator;

  constructor({
    acl,
    db,
    nodeConnectionManager,
    nodeManager,
    keyManager,
    messageCap,
    logger,
  }: {
    acl: ACL;
    db: DB;
    nodeConnectionManager: NodeConnectionManager;
    nodeManager: NodeManager;
    keyManager: KeyManager;
    messageCap: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.messageCap = messageCap;
    this.acl = acl;
    this.db = db;
    this.keyManager = keyManager;
    this.nodeConnectionManager = nodeConnectionManager;
    this.nodeManager = nodeManager;
  }

  public async start({
    fresh = false,
  }: { fresh?: boolean } = {}): Promise<void> {
    await this.db.withTransactionF(async (tran) => {
      await tran.lock(
        [...this.notificationsDbPath, MESSAGE_COUNT_KEY].toString(),
      );
      this.logger.info(`Starting ${this.constructor.name}`);
      if (fresh) {
        await tran.clear(this.notificationsDbPath);
      }

      // Getting latest ID and creating ID generator
      let latestId: NotificationId | undefined;
      const keyIterator = tran.iterator(this.notificationsMessagesDbPath, {
        limit: 1,
        reverse: true,
        values: false,
      });
      for await (const [keyPath] of keyIterator) {
        const key = keyPath[0] as Buffer;
        latestId = IdInternal.fromBuffer<NotificationId>(key);
      }
      this.notificationIdGenerator =
        notificationsUtils.createNotificationIdGenerator(latestId);
      this.logger.info(`Started ${this.constructor.name}`);
    });
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.withTransactionF((tran) =>
      tran.clear(this.notificationsDbPath),
    );
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Send a notification to another node
   * The `data` parameter must match one of the NotificationData types outlined in ./types
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async sendNotification(
    nodeId: NodeId,
    data: NotificationData,
  ): Promise<void> {
    const notification = {
      data: data,
      senderId: nodesUtils.encodeNodeId(this.keyManager.getNodeId()),
      isRead: false,
    };
    const signedNotification = await notificationsUtils.signNotification(
      notification,
      this.keyManager.getRootKeyPairPem(),
    );
    const notificationMsg = new notificationsPB.AgentNotification();
    notificationMsg.setContent(signedNotification);
    await this.nodeConnectionManager.withConnF(nodeId, async (connection) => {
      const client = connection.getClient();
      await client.notificationsSend(notificationMsg);
    });
  }

  /**
   * Receive a notification
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async receiveNotification(
    notification: Notification,
    tran?: DBTransaction,
  ): Promise<void> {
    const messageCountPath = [...this.notificationsDbPath, MESSAGE_COUNT_KEY];
    if (tran == null) {
      return this.db.withTransactionF(async (tran) =>
        this.receiveNotification(notification, tran),
      );
    }

    await tran.lock(messageCountPath.toString());
    const nodePerms = await this.acl.getNodePerm(
      nodesUtils.decodeNodeId(notification.senderId)!,
    );
    if (nodePerms === undefined) {
      throw new notificationsErrors.ErrorNotificationsPermissionsNotFound();
    }
    // Only keep the message if the sending node has the correct permissions
    if (Object.keys(nodePerms.gestalt).includes('notify')) {
      // If the number stored in notificationsDb >= 10000
      let numMessages = await tran.getForUpdate<number>(messageCountPath);
      if (numMessages === undefined) {
        numMessages = 0;
        await tran.put(messageCountPath, 0);
      }
      if (numMessages >= this.messageCap) {
        // Remove the oldest notification from notificationsMessagesDb
        const oldestId = await this.getOldestNotificationId(tran);
        await this.removeNotification(oldestId!, tran);
      }
      // Store the new notification in notificationsMessagesDb
      const notificationId = this.notificationIdGenerator();
      await tran.put(
        [...this.notificationsMessagesDbPath, idUtils.toBuffer(notificationId)],
        notification,
      );
      // Number of messages += 1
      const newNumMessages = numMessages + 1;
      await tran.put(messageCountPath, newNumMessages);
    }
  }

  /**
   * Read a notification
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async readNotifications({
    unread = false,
    number = 'all',
    order = 'newest',
    tran,
  }: {
    unread?: boolean;
    number?: number | 'all';
    order?: 'newest' | 'oldest';
    tran?: DBTransaction;
  } = {}): Promise<Array<Notification>> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.readNotifications({ unread, number, order, tran }),
      );
    }
    let notificationIds: Array<NotificationId>;
    if (unread) {
      notificationIds = await this.getNotificationIds('unread', tran);
    } else {
      notificationIds = await this.getNotificationIds('all', tran);
    }

    if (order === 'newest') {
      notificationIds.reverse();
    }

    if (number === 'all' || number > notificationIds.length) {
      number = notificationIds.length;
    }
    notificationIds = notificationIds.slice(0, number);

    const notifications: Array<Notification> = [];
    for (const id of notificationIds) {
      const notification = await this.readNotificationById(id, tran);
      if (notification == null) never();
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Linearly searches for a GestaltInvite notification from the supplied NodeId.
   * Returns the notification if found.
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async findGestaltInvite(
    fromNode: NodeId,
    tran?: DBTransaction,
  ): Promise<Notification | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.findGestaltInvite(fromNode, tran),
      );
    }
    const notifications = await this.getNotifications('all', tran);
    for (const notification of notifications) {
      if (
        notification.data.type === 'GestaltInvite' &&
        nodesUtils.decodeNodeId(notification.senderId)!.equals(fromNode)
      ) {
        return notification;
      }
    }
  }

  /**
   * Removes all notifications
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async clearNotifications(tran?: DBTransaction): Promise<void> {
    const messageCountPath = [...this.notificationsDbPath, MESSAGE_COUNT_KEY];
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.clearNotifications(tran));
    }

    await tran.lock(messageCountPath.toString());
    const notificationIds = await this.getNotificationIds('all', tran);
    const numMessages = await tran.getForUpdate<number>(messageCountPath);
    if (numMessages !== undefined) {
      for (const id of notificationIds) {
        await this.removeNotification(id, tran);
      }
    }
  }

  protected async readNotificationById(
    notificationId: NotificationId,
    tran: DBTransaction,
  ): Promise<Notification | undefined> {
    const notification = await tran.get<Notification>([
      ...this.notificationsMessagesDbPath,
      idUtils.toBuffer(notificationId),
    ]);
    if (notification === undefined) {
      return undefined;
    }
    notification.isRead = true;
    await tran.put(
      [...this.notificationsMessagesDbPath, idUtils.toBuffer(notificationId)],
      notification,
    );
    return notification;
  }

  protected async getNotificationIds(
    type: 'unread' | 'all',
    tran: DBTransaction,
  ): Promise<Array<NotificationId>> {
    const notificationIds: Array<NotificationId> = [];
    const messageIterator = tran.iterator<Notification>(
      this.notificationsMessagesDbPath,
      { valueAsBuffer: false },
    );
    for await (const [keyPath, notification] of messageIterator) {
      const key = keyPath[0] as Buffer;
      const notificationId = IdInternal.fromBuffer<NotificationId>(key);
      if (type === 'all') {
        notificationIds.push(notificationId);
      } else if (type === 'unread') {
        if (!notification.isRead) {
          notificationIds.push(notificationId);
        }
      }
    }
    return notificationIds;
  }

  protected async getNotifications(
    type: 'unread' | 'all',
    tran: DBTransaction,
  ): Promise<Array<Notification>> {
    const notifications: Array<Notification> = [];
    for await (const [, notification] of tran.iterator<Notification>(
      this.notificationsMessagesDbPath,
      { valueAsBuffer: false },
    )) {
      if (type === 'all') {
        notifications.push(notification);
      } else if (type === 'unread') {
        if (!notification.isRead) {
          notifications.push(notification);
        }
      }
    }
    return notifications;
  }

  protected async getOldestNotificationId(
    tran: DBTransaction,
  ): Promise<NotificationId | undefined> {
    const notificationIds = await this.getNotificationIds('all', tran);
    if (notificationIds.length === 0) {
      return undefined;
    }
    return notificationIds[0];
  }

  protected async removeNotification(
    messageId: NotificationId,
    tran: DBTransaction,
  ): Promise<void> {
    await tran.lock([
      ...this.notificationsDbPath,
      MESSAGE_COUNT_KEY,
    ].toString());
    const numMessages = await tran.getForUpdate<number>([
      ...this.notificationsDbPath,
      MESSAGE_COUNT_KEY,
    ]);
    if (numMessages === undefined) {
      throw new notificationsErrors.ErrorNotificationsDb();
    }

    await tran.del([
      ...this.notificationsMessagesDbPath,
      idUtils.toBuffer(messageId),
    ]);
    await tran.put(
      [...this.notificationsDbPath, MESSAGE_COUNT_KEY],
      numMessages - 1,
    );
  }
}

export default NotificationsManager;
