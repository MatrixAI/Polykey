import type { NotificationId, Notification } from './types';
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
  protected notificationsDb: DBLevel<string>;
  protected notificationsMessagesDb: DBLevel<NotificationId>;
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
      // sub-level stores MESSAGE_COUNT_KEY -> number (of messages)
      const notificationsDb = await this.db.level<string>(
        this.notificationsDomain,
      );
      // sub-sub-level stores NotificationId -> string (message)
      const notificationsMessagesDb = await this.db.level<NotificationId>(
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
   * Send a notification
   */
  public async sendNotification(nodeId: NodeId, message: string) {
    const notification: Notification = {
      senderId: this.nodeManager.getNodeId(),
      message: message,
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
          await this.db.put<number>(
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
        await this.db.put<Notification>(
          this.notificationsMessagesDbDomain,
          notificationId,
          notification,
        );
        // Number of messages += 1
        const newNumMessages = numMessages + 1;
        await this.db.put<number>(
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
  } = {}): Promise<Array<string>> {
    let notifications: Array<Record<NotificationId, Notification>>;
    if (unread === true) {
      notifications = await this.getNotifications('unread');
    } else {
      notifications = await this.getNotifications('all');
    }

    if (number === 'all' || number > notifications.length) {
      number = notifications.length;
    }

    if (order === 'newest') {
      notifications.reverse();
    }

    const readNotifications: Array<string> = [];
    for (let i = 0; i < number; i++) {
      const notifId = Object.keys(notifications[i])[0] as NotificationId;
      const notifMsg = await this.readNotificationById(notifId);
      readNotifications.push(notifMsg!);
    }

    return readNotifications;
  }

  /**
   * Removes all notifications
   */
  public async clearNotifications() {
    await this._transaction(async () => {
      const notifications = await this.getNotifications('all');
      const numMessages = await this.db.get<number>(
        this.notificationsDbDomain,
        this.MESSAGE_COUNT_KEY,
      );
      if (numMessages !== undefined) {
        for (let i = 0; i < numMessages; i++) {
          const notifId = Object.keys(notifications[i])[0] as NotificationId;
          await this.removeNotification(notifId);
        }
      }
    });
  }

  private async readNotificationById(
    notificationId: NotificationId,
  ): Promise<string | undefined> {
    return await this._transaction(async () => {
      const notification = await this.db.get<Notification>(
        this.notificationsMessagesDbDomain,
        notificationId,
      );
      if (notification === undefined) {
        return undefined;
      }
      notification.isRead = true;
      await this.db.put<Notification>(
        this.notificationsMessagesDbDomain,
        notificationId,
        notification,
      );
      return notification.message;
    });
  }

  private async getNotifications(
    type: 'unread' | 'all',
  ): Promise<Array<Record<NotificationId, Notification>>> {
    return await this._transaction(async () => {
      const notifications: Array<Record<NotificationId, Notification>> = [];
      for await (const o of this.notificationsMessagesDb.createReadStream()) {
        const notifId = (o as any).key as NotificationId;
        const data = (o as any).value as Buffer;
        const notif = this.db.unserializeDecrypt<Notification>(data);
        if (type === 'all') {
          const notification: Record<NotificationId, Notification> = {
            [notifId]: notif,
          };
          notifications.push(notification);
        } else if (type === 'unread') {
          if (notif.isRead === false) {
            const notification: Record<NotificationId, Notification> = {
              [notifId]: notif,
            };
            notifications.push(notification);
          }
        }
      }
      return notifications;
    });
  }

  private async getOldestNotificationId(): Promise<NotificationId | undefined> {
    const notifications = await this.getNotifications('all');
    if (notifications.length === 0) {
      return undefined;
    }

    const notifId = Object.keys(notifications[0])[0] as NotificationId;

    return notifId;
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
      await this.db.put<number>(
        this.notificationsDbDomain,
        this.MESSAGE_COUNT_KEY,
        numMessages - 1,
      );
    });
  }
}

export default NotificationsManager;
