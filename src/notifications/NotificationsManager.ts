import type { DB, DBTransaction, KeyPath, LevelPath } from '@matrixai/db';
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
import { utils as dbUtils } from '@matrixai/db';
import { withF } from '@matrixai/resources';
import * as notificationsUtils from './utils';
import * as notificationsErrors from './errors';
import * as notificationsPB from '../proto/js/polykey/v1/notifications/notifications_pb';
import * as nodesUtils from '../nodes/utils';

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
    const notificationsManager = new NotificationsManager({
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
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.notificationsDbPath);
    }
    // Getting latest ID and creating ID generator
    let latestId: NotificationId | undefined;
    // for await (const [k] of tran.iterator({ value: false }, [
    //   ...this.nodeGraphBucketsDbPath,
    // ])) {
    // const keyStream = this.notificationsMessagesDb.createKeyStream({
    //   limit: 1,
    //   reverse: true,
    // });
    await withF(
      [this.db.transaction()],
      ([tran]) => async (tran) => tran.iterator({ limit: 1, reverse: true, value: false }, [...this.notificationsMessagesDbPath])
  }
    for await (const o of keyStream) {
      latestId = IdInternal.fromBuffer<NotificationId>(o as Buffer);
    }
    this.notificationIdGenerator = createNotificationIdGenerator(latestId);
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    const notificationsDb = await this.db.level(this.notificationsDomain);
    await notificationsDb.clear();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(
    f: (notificationsManager: NotificationsManager) => Promise<T>,
  ): Promise<T> {
    const release = await this.lock.acquire();
    try {
      return await f(this);
    } finally {
      release();
    }
  }

  /**
   * Transaction wrapper that will not lock if the operation was executed
   * within a transaction context
   */
  public async _transaction<T>(f: () => Promise<T>): Promise<T> {
    if (this.lock.isLocked()) {
      return await f();
    } else {
      return await this.transaction(f);
    }
  }

  /**
   * Send a notification to another node
   * The `data` parameter must match one of the NotificationData types outlined in ./types
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async sendNotification(nodeId: NodeId, data: NotificationData) {
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
  public async receiveNotification(notification: Notification) {
    await this._transaction(async () => {
      const nodePerms = await this.acl.getNodePerm(
        nodesUtils.decodeNodeId(notification.senderId)!,
      );
      if (nodePerms === undefined) {
        throw new notificationsErrors.ErrorNotificationsPermissionsNotFound();
      }
      // Only keep the message if the sending node has the correct permissions
      if (Object.keys(nodePerms.gestalt).includes('notify')) {
        // If the number stored in notificationsDb >= 10000
        let numMessages = await this.db.get<number>(
          this.notificationsDbDomain,
          MESSAGE_COUNT_KEY,
        );
        if (numMessages === undefined) {
          numMessages = 0;
          await this.db.put(this.notificationsDbDomain, MESSAGE_COUNT_KEY, 0);
        }
        if (numMessages >= this.messageCap) {
          // Remove the oldest notification from notificationsMessagesDb
          const oldestId = await this.getOldestNotificationId();
          await this.removeNotification(oldestId!);
        }
        // Store the new notification in notificationsMessagesDb
        const notificationId = this.notificationIdGenerator();
        await this.db.put(
          this.notificationsMessagesDbDomain,
          idUtils.toBuffer(notificationId),
          notification,
        );
        // Number of messages += 1
        const newNumMessages = numMessages + 1;
        await this.db.put(
          this.notificationsDbDomain,
          MESSAGE_COUNT_KEY,
          newNumMessages,
        );
      }
    });
  }

  /**
   * Read a notification
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async readNotifications({
    unread = false,
    number = 'all',
    order = 'newest',
  }: {
    unread?: boolean;
    number?: number | 'all';
    order?: 'newest' | 'oldest';
  } = {}): Promise<Array<Notification>> {
    let notificationIds: Array<NotificationId>;
    if (unread === true) {
      notificationIds = await this.getNotificationIds('unread');
    } else {
      notificationIds = await this.getNotificationIds('all');
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
      const notification = await this.readNotificationById(id);
      notifications.push(notification!);
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
  ): Promise<Notification | undefined> {
    const notifications = await this.getNotifications('all');
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
  public async clearNotifications() {
    await this._transaction(async () => {
      const notificationIds = await this.getNotificationIds('all');
      const numMessages = await this.db.get<number>(
        this.notificationsDbDomain,
        MESSAGE_COUNT_KEY,
      );
      if (numMessages !== undefined) {
        for (const id of notificationIds) {
          await this.removeNotification(id);
        }
      }
    });
  }

  private async readNotificationById(
    notificationId: NotificationId,
  ): Promise<Notification | undefined> {
    return await this._transaction(async () => {
      const notification = await this.db.get<Notification>(
        this.notificationsMessagesDbDomain,
        idUtils.toBuffer(notificationId),
      );
      if (notification === undefined) {
        return undefined;
      }
      notification.isRead = true;
      await this.db.put(
        this.notificationsMessagesDbDomain,
        idUtils.toBuffer(notificationId),
        notification,
      );
      return notification;
    });
  }

  private async getNotificationIds(
    type: 'unread' | 'all',
  ): Promise<Array<NotificationId>> {
    return await this._transaction(async () => {
      const notificationIds: Array<NotificationId> = [];
      for await (const o of this.notificationsMessagesDb.createReadStream()) {
        const notificationId = IdInternal.fromBuffer<NotificationId>(
          (o as any).key,
        );
        const data = (o as any).value as Buffer;
        const notification = await this.db.deserializeDecrypt<Notification>(
          data,
          false,
        );
        if (type === 'all') {
          notificationIds.push(notificationId);
        } else if (type === 'unread') {
          if (notification.isRead === false) {
            notificationIds.push(notificationId);
          }
        }
      }
      return notificationIds;
    });
  }

  private async getNotifications(
    type: 'unread' | 'all',
  ): Promise<Array<Notification>> {
    return await this._transaction(async () => {
      const notifications: Array<Notification> = [];
      for await (const v of this.notificationsMessagesDb.createValueStream()) {
        const data = v as Buffer;
        const notification = await this.db.deserializeDecrypt<Notification>(
          data,
          false,
        );
        if (type === 'all') {
          notifications.push(notification);
        } else if (type === 'unread') {
          if (notification.isRead === false) {
            notifications.push(notification);
          }
        }
      }
      return notifications;
    });
  }

  private async getOldestNotificationId(): Promise<NotificationId | undefined> {
    const notificationIds = await this.getNotificationIds('all');
    if (notificationIds.length === 0) {
      return undefined;
    }
    return notificationIds[0];
  }

  private async removeNotification(messageId: NotificationId) {
    await this._transaction(async () => {
      const numMessages = await this.db.get<number>(
        this.notificationsDbDomain,
        MESSAGE_COUNT_KEY,
      );
      if (numMessages === undefined) {
        throw new notificationsErrors.ErrorNotificationsDb();
      }

      await this.db.del(
        this.notificationsMessagesDbDomain,
        idUtils.toBuffer(messageId),
      );
      await this.db.put(
        this.notificationsDbDomain,
        MESSAGE_COUNT_KEY,
        numMessages - 1,
      );
    });
  }
}

export default NotificationsManager;
