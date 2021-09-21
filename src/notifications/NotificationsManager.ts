import type { NotificationId, Notification, NotificationData } from './types';
import type { ACL } from '../acl';
import type { DB } from '../db';
import type { KeyManager } from '../keys';
import type { NodeManager } from '../nodes';
import type { NodeId } from '../nodes/types';
import type { WorkerManager } from '../workers';
import type { DBLevel } from '../db/types';

import Logger from '@matrixai/logger';
import { Mutex } from 'async-mutex';

import * as notificationsUtils from './utils';
import * as notificationsErrors from './errors';
import { errors as dbErrors } from '../db';

/**
 * Manage Node Notifications between Gestalts
 */
class NotificationsManager {
  protected logger: Logger;
  protected acl: ACL;
  protected db: DB;
  protected keyManager: KeyManager;
  protected nodeManager: NodeManager;
  protected workerManager?: WorkerManager;

  protected messageCap: number;
  protected readonly MESSAGE_COUNT_KEY: string = 'numMessages';

  protected notificationsDomain: string = this.constructor.name;
  protected notificationsDbDomain: Array<string> = [this.notificationsDomain];
  protected notificationsMessagesDbDomain: Array<string> = [
    this.notificationsDomain,
    'messages',
  ];
  protected notificationsDb: DBLevel;
  protected notificationsMessagesDb: DBLevel;
  protected lock: Mutex = new Mutex();
  private _started: boolean = false;

  constructor({
    acl,
    db,
    nodeManager,
    keyManager,
    messageCap,
    logger,
  }: {
    acl: ACL;
    db: DB;
    nodeManager: NodeManager;
    keyManager: KeyManager;
    messageCap?: number;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.messageCap = messageCap ?? 10000;
    this.acl = acl;
    this.db = db;
    this.keyManager = keyManager;
    this.nodeManager = nodeManager;
  }

  public get started(): boolean {
    return this._started;
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    try {
      if (this._started) {
        return;
      }
      this.logger.info('Starting Notifications Manager');
      this._started = true;
      if (!this.db.started) {
        throw new dbErrors.ErrorDBNotStarted();
      }
      // Sub-level stores MESSAGE_COUNT_KEY -> number (of messages)
      const notificationsDb = await this.db.level(this.notificationsDomain);
      // Sub-sub-level stores NotificationId -> string (message)
      const notificationsMessagesDb = await this.db.level(
        this.notificationsMessagesDbDomain[1],
        notificationsDb,
      );
      if (fresh) {
        await notificationsDb.clear();
      }
      this.notificationsDb = notificationsDb;
      this.notificationsMessagesDb = notificationsMessagesDb;
      this.logger.info('Started Notifications Manager');
    } catch (e) {
      this._started = false;
      throw e;
    }
  }

  async stop() {
    if (!this._started) {
      return;
    }
    this.logger.info('Stopping Notifications Manager');
    this._started = false;
    this.logger.info('Stopped Notifications Manager');
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
  public async sendNotification(nodeId: NodeId, data: NotificationData) {
    const notification = {
      data: data,
      senderId: this.nodeManager.getNodeId(),
      isRead: false,
    };
    const signedNotification = await notificationsUtils.signNotification(
      notification,
      this.keyManager.getRootKeyPairPem(),
    );
    await this.nodeManager.sendNotification(nodeId, signedNotification);
  }

  /**
   * Receive a notification
   */
  public async receiveNotification(notification: Notification) {
    await this._transaction(async () => {
      const nodePerms = await this.acl.getNodePerm(notification.senderId);
      if (nodePerms === undefined) {
        throw new notificationsErrors.ErrorNotificationsPermissionsNotFound();
      }
      // Only keep the message if the sending node has the correct permissions
      if (Object.keys(nodePerms.gestalt).includes('notify')) {
        // If the number stored in notificationsDb >= 10000
        let numMessages = await this.db.get<number>(
          this.notificationsDbDomain,
          this.MESSAGE_COUNT_KEY,
        );
        if (numMessages === undefined) {
          numMessages = 0;
          await this.db.put(
            this.notificationsDbDomain,
            this.MESSAGE_COUNT_KEY,
            0,
          );
        }
        if (numMessages >= this.messageCap) {
          // Remove the oldest notification from notificationsMessagesDb
          const oldestId = await this.getOldestNotificationId();
          await this.removeNotification(oldestId!);
        }
        // Store the new notification in notificationsMessagesDb
        const notificationId = notificationsUtils.generateNotifId();
        await this.db.put(
          this.notificationsMessagesDbDomain,
          notificationId,
          notification,
        );
        // Number of messages += 1
        const newNumMessages = numMessages + 1;
        await this.db.put(
          this.notificationsDbDomain,
          this.MESSAGE_COUNT_KEY,
          newNumMessages,
        );
      }
    });
  }

  /**
   * Read a notification
   */
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
      const notif = await this.readNotificationById(id);
      notifications.push(notif!);
    }

    return notifications;
  }

  /**
   * Linearly searches for a GestaltInvite notification from the supplied NodeId.
   * Returns the notification if found.
   */
  public async findGestaltInvite(
    fromNode: NodeId,
  ): Promise<Notification | undefined> {
    const notifications = await this.getNotifications('all');
    for (const notif of notifications) {
      if (notif.data.type === 'GestaltInvite' && notif.senderId === fromNode) {
        return notif;
      }
    }
  }

  /**
   * Removes all notifications
   */
  public async clearNotifications() {
    await this._transaction(async () => {
      const notificationIds = await this.getNotificationIds('all');
      const numMessages = await this.db.get<number>(
        this.notificationsDbDomain,
        this.MESSAGE_COUNT_KEY,
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
        notificationId,
      );
      if (notification === undefined) {
        return undefined;
      }
      notification.isRead = true;
      await this.db.put(
        this.notificationsMessagesDbDomain,
        notificationId,
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
        const notifId = (o as any).key as NotificationId;
        const data = (o as any).value as Buffer;
        const notif = await this.db.deserializeDecrypt<Notification>(data);
        if (type === 'all') {
          notificationIds.push(notifId);
        } else if (type === 'unread') {
          if (notif.isRead === false) {
            notificationIds.push(notifId);
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
        this.MESSAGE_COUNT_KEY,
      );
      if (numMessages === undefined) {
        throw new notificationsErrors.ErrorNotificationsDb();
      }

      await this.db.del(this.notificationsMessagesDbDomain, messageId);
      await this.db.put(
        this.notificationsDbDomain,
        this.MESSAGE_COUNT_KEY,
        numMessages - 1,
      );
    });
  }
}

export default NotificationsManager;
