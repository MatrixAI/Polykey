import type { DB, DBTransaction, LevelPath } from '@matrixai/db';
import type {
  NotificationId,
  Notification,
  NotificationData,
  NotificationDB,
} from './types';
import type ACL from '../acl/ACL';
import type KeyRing from '../keys/KeyRing';
import type NodeManager from '../nodes/NodeManager';
import type {
  NodeId,
  NodeIdEncoded,
  NotificationIdEncoded,
  TaskHandlerId,
} from '../ids/types';
import type { Task, TaskHandler } from '../tasks/types';
import type { TaskManager } from '../tasks';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as notificationsUtils from './utils';
import * as notificationsErrors from './errors';
import * as notificationsEvents from './events';
import * as nodesUtils from '../nodes/utils';
import { never } from '../utils/utils';

const abortSendNotificationTaskReason = Symbol(
  'abort send notification task reason',
);

/**
 * Manage Node Notifications between Gestalts
 */
interface NotificationsManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new notificationsErrors.ErrorNotificationsRunning(),
  new notificationsErrors.ErrorNotificationsDestroyed(),
  {
    eventStart: notificationsEvents.EventNotificationsManagerStart,
    eventStarted: notificationsEvents.EventNotificationsManagerStarted,
    eventStop: notificationsEvents.EventNotificationsManagerStop,
    eventStopped: notificationsEvents.EventNotificationsManagerStopped,
    eventDestroy: notificationsEvents.EventNotificationsManagerDestroy,
    eventDestroyed: notificationsEvents.EventNotificationsManagerDestroyed,
  },
)
class NotificationsManager {
  static async createNotificationsManager({
    acl,
    db,
    nodeManager,
    taskManager,
    keyRing,
    messageCap = 10000,
    defaultRetries = 64,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    acl: ACL;
    db: DB;
    nodeManager: NodeManager;
    taskManager: TaskManager;
    keyRing: KeyRing;
    messageCap?: number;
    defaultRetries?: number;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<NotificationsManager> {
    logger.info(`Creating ${this.name}`);
    const notificationsManager = new this({
      acl,
      db,
      keyRing,
      logger,
      messageCap,
      defaultRetries,
      nodeManager,
      taskManager,
    });

    await notificationsManager.start({ fresh });
    logger.info(`Created ${this.name}`);
    return notificationsManager;
  }

  protected logger: Logger;
  protected acl: ACL;
  protected db: DB;
  protected keyRing: KeyRing;
  protected nodeManager: NodeManager;
  protected taskManager: TaskManager;
  protected messageCap: number;
  protected defaultRetries: number;

  protected notificationsManagerDbPath: LevelPath = [this.constructor.name];
  /**
   * Inbox Notifications
   * `NotificationsManager/inbox/{NotificationId} -> {NotificationDB}`
   */
  protected notificationsManagerInboxDbPath: LevelPath = [
    ...this.notificationsManagerDbPath,
    'inbox',
  ];
  /**
   * Outbox Notifications
   * `NotificationsManager/outbox/{NotificationId} -> {NotificationDB}`
   */
  protected notificationsManagerOutboxDbPath: LevelPath = [
    ...this.notificationsManagerDbPath,
    'outbox',
  ];

  protected inboxNotificationIdGenerator: () => NotificationId;
  protected outboxNotificationIdGenerator: () => NotificationId;

  protected sendNotificationHandler: TaskHandler = async (
    _ctx,
    taskInfo,
    {
      nodeIdEncoded,
      notificationIdEncoded,
      retries,
    }: {
      nodeIdEncoded: NodeIdEncoded;
      notificationIdEncoded: NotificationIdEncoded;
      retries: number;
    },
  ) => {
    return await this.db.withTransactionF(async (tran) => {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded)!;
      const notificationId = notificationsUtils.decodeNotificationId(
        notificationIdEncoded,
      )!;
      const notificationKeyPath = [
        ...this.notificationsManagerOutboxDbPath,
        notificationId.toBuffer(),
      ];
      const notificationDb =
        (await tran.get<NotificationDB>(notificationKeyPath))!;
      const signedNotification = await notificationsUtils.generateNotification(
        {
          notificationIdEncoded,
          ...notificationDb,
        },
        this.keyRing.keyPair,
      );
      // The task id if a new task has been scheduled for a retry.
      try {
        await this.nodeManager.withConnF(nodeId, async (connection) => {
          const client = connection.getClient();
          await client.methods.notificationsSend({
            signedNotificationEncoded: signedNotification,
          });
        });
      } catch (e) {
        if (nodesUtils.isConnectionError(e) && 0 < retries) {
          this.logger.warn(
            `Could not send to ${
              notificationDb.data.type
            } notification to ${nodesUtils.encodeNodeId(nodeId)}`,
          );
          // delay is 1 hr at the start, and then double of the last task after that, capped at one day
          const delay = taskInfo.delay === 0 ? 60 * 60 * 1000 : Math.min(taskInfo.delay * 2, 24 * 60 * 60 * 1000);
          // Recursively return inner task, so that the handler can process them.
          const newTask = await this.taskManager.scheduleTask(
            {
              handlerId: this.sendNotificationHandlerId,
              path: [this.sendNotificationHandlerId, notificationIdEncoded],
              parameters: [
                {
                  nodeIdEncoded,
                  notificationIdEncoded,
                  retries: retries - 1,
                },
              ],
              delay: delay,
              lazy: false,
            },
            tran,
          );
          return newTask;
        }
        this.logger.warn(
          `Notification recipient ${nodesUtils.encodeNodeId(
            nodeId,
          )} responded with error: ${e.cause.description}`,
        );
        await this.db.del(notificationKeyPath);
        throw e;
      }
    });
  };
  public readonly sendNotificationHandlerId =
    `${this.constructor.name}.sendNotificationHandler` as TaskHandlerId;

  constructor({
    acl,
    db,
    nodeManager,
    taskManager,
    keyRing,
    messageCap,
    defaultRetries,
    logger,
  }: {
    acl: ACL;
    db: DB;
    nodeManager: NodeManager;
    taskManager: TaskManager;
    keyRing: KeyRing;
    messageCap: number;
    defaultRetries: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.messageCap = messageCap;
    this.defaultRetries = defaultRetries;
    this.acl = acl;
    this.db = db;
    this.keyRing = keyRing;
    this.nodeManager = nodeManager;
    this.taskManager = taskManager;
  }

  public async start({
    fresh = false,
  }: { fresh?: boolean } = {}): Promise<void> {
    await this.db.withTransactionF(async (tran) => {
      this.logger.info(`Starting ${this.constructor.name}`);
      if (fresh) {
        await tran.clear(this.notificationsManagerDbPath);
      }
      // Getting latest ID and creating ID generator
      let latestInboxId: NotificationId | undefined;
      for await (const [keyPath] of tran.iterator(
        this.notificationsManagerInboxDbPath,
        {
          limit: 1,
          reverse: true,
          values: false,
        },
      )) {
        latestInboxId = IdInternal.fromBuffer<NotificationId>(
          keyPath[0] as Buffer,
        );
      }
      this.inboxNotificationIdGenerator =
        notificationsUtils.createNotificationIdGenerator(latestInboxId);
      let latestOutboxId: NotificationId | undefined;
      for await (const [keyPath] of tran.iterator(
        this.notificationsManagerOutboxDbPath,
        {
          limit: 1,
          reverse: true,
          values: false,
        },
      )) {
        latestOutboxId = IdInternal.fromBuffer<NotificationId>(
          keyPath[0] as Buffer,
        );
      }
      this.outboxNotificationIdGenerator =
        notificationsUtils.createNotificationIdGenerator(latestOutboxId);
      this.taskManager.registerHandler(
        this.sendNotificationHandlerId,
        this.sendNotificationHandler,
      );
      this.logger.info(`Started ${this.constructor.name}`);
    });
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.taskManager.deregisterHandler(this.sendNotificationHandlerId);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.withTransactionF((tran) =>
      tran.clear(this.notificationsManagerDbPath),
    );
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Send a notification to another node
   * The `data` parameter must match one of the NotificationData types outlined in ./types
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async sendNotification(
    {
      nodeId,
      data,
      retries = this.defaultRetries,
    }: {
      nodeId: NodeId;
      data: NotificationData;
      retries?: number;
    },
    tran?: DBTransaction,
  ): Promise<{
    /**
     * The ID of the notification that was sent.
     */
    notificationId: NotificationId;
    /**
     * A promise that resolves when the notification is successfully sent,
     * and rejects when the peer responds with an error or if the notification was never successfully sent
     */
    sendP: Promise<void>;
  }> {
    if (tran == null) {
      return await this.db.withTransactionF((tran) =>
        this.sendNotification(
          {
            nodeId,
            data,
            retries,
          },
          tran,
        ),
      );
    }
    const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
    const notificationId = this.outboxNotificationIdGenerator();
    const notificationIdEncoded =
      notificationsUtils.encodeNotificationId(notificationId);
    const notificationDb: NotificationDB = {
      typ: 'notification',
      data: data,
      isRead: false,
      iss: nodesUtils.encodeNodeId(this.keyRing.getNodeId()),
      sub: nodeIdEncoded,
    };
    let pendingTask: Task | undefined;
    await tran.put(
      [...this.notificationsManagerOutboxDbPath, notificationId.toBuffer()],
      notificationDb,
    );
    pendingTask = await this.taskManager.scheduleTask(
      {
        handlerId: this.sendNotificationHandlerId,
        parameters: [
          {
            nodeIdEncoded,
            notificationIdEncoded,
            retries,
          },
        ],
        path: [this.sendNotificationHandlerId, notificationIdEncoded],
        lazy: false,
      },
      tran,
    );
    const sendP = (async () => {
      while (pendingTask != null) {
        pendingTask = await pendingTask.promise();
      }
    })();
    sendP.catch(() => {});
    return {
      notificationId,
      sendP,
    };
  }

  protected async *getOutboxNotificationIds({
    number = 'all',
    order = 'newest',
    tran,
  }: {
    number?: number | 'all';
    order?: 'newest' | 'oldest';
    tran: DBTransaction;
  }): AsyncGenerator<NotificationId> {
    const messageIterator = tran.iterator<NotificationDB>(
      this.notificationsManagerOutboxDbPath,
      { valueAsBuffer: false, reverse: order === 'newest' },
    );
    let i = 0;
    for await (const [keyPath] of messageIterator) {
      if (number !== 'all' && i >= number) {
        break;
      }
      const key = keyPath[0] as Buffer;
      const notificationId = IdInternal.fromBuffer<NotificationId>(key);
      yield notificationId;
      i++;
    }
  }

  protected async readOutboxNotificationById(
    notificationId: NotificationId,
    tran: DBTransaction,
  ): Promise<Notification | undefined> {
    const notificationDb = await tran.get<NotificationDB>([
      ...this.notificationsManagerOutboxDbPath,
      notificationId.toBuffer(),
    ]);
    if (notificationDb == null) {
      return undefined;
    }
    return {
      notificationIdEncoded:
        notificationsUtils.encodeNotificationId(notificationId),
      ...notificationDb,
    };
  }

  /**
   * Read pending notifications in the outbox.
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async *readOutboxNotifications({
    number = 'all',
    order = 'newest',
    tran,
  }: {
    number?: number | 'all';
    order?: 'newest' | 'oldest';
    tran?: DBTransaction;
  } = {}): AsyncGenerator<Notification> {
    if (tran == null) {
      const readOutboxNotifications = (tran) =>
        this.readOutboxNotifications({ number, order, tran });
      return yield* this.db.withTransactionG(async function* (tran) {
        return yield* readOutboxNotifications(tran);
      });
    }

    const outboxIds = this.getOutboxNotificationIds({
      number,
      order,
      tran,
    });

    for await (const id of outboxIds) {
      const notification = await this.readOutboxNotificationById(id, tran);
      if (notification == null) never();
      yield notification;
    }
  }

  /**
   * Clears the pending outbox notifications
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async clearOutboxNotifications(tran?: DBTransaction): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.clearOutboxNotifications(tran),
      );
    }
    const notificationIds = this.getOutboxNotificationIds({ tran });
    for await (const id of notificationIds) {
      await this.removeOutboxNotification(id, tran);
    }
  }

  protected async removeOutboxNotification(
    notificationId: NotificationId,
    tran: DBTransaction,
  ): Promise<void> {
    const taskIterator = this.taskManager.getTasks(
      undefined,
      false,
      [
        this.sendNotificationHandlerId,
        notificationsUtils.encodeNotificationId(notificationId),
      ],
      tran,
    );
    const task: Task = await taskIterator.next().then((value) => value.value);
    await taskIterator.return(undefined);
    task.cancel(abortSendNotificationTaskReason);
    await tran.del([
      ...this.notificationsManagerOutboxDbPath,
      notificationId.toBuffer(),
    ]);
  }

  /**
   * Receive a notification
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async receiveNotification(
    notification: Notification,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF(async (tran) =>
        this.receiveNotification(notification, tran),
      );
    }
    const nodePerms = await this.acl.getNodePerm(
      nodesUtils.decodeNodeId(notification.iss)!,
    );
    if (nodePerms === undefined) {
      throw new notificationsErrors.ErrorNotificationsPermissionsNotFound();
    }
    // Only keep the message if the sending node has the correct permissions
    if (Object.keys(nodePerms.gestalt).includes('notify')) {
      // If the number stored in notificationsDb >= 10000
      const numMessages = await tran.count(
        this.notificationsManagerInboxDbPath,
      );
      if (numMessages >= this.messageCap) {
        // Remove the oldest notification from notificationsMessagesDb
        const oldestId = await this.getOldestNotificationId(tran);
        await this.removeNotification(oldestId!, tran);
      }
      // Store the new notification in notificationsMessagesDb
      const notificationId = this.inboxNotificationIdGenerator();
      await tran.put(
        [...this.notificationsManagerInboxDbPath, notificationId.toBuffer()],
        {
          ...notification,
          peerNotificationIdEncoded: notification.notificationIdEncoded,
          notificationIdEncoded: undefined,
        } as NotificationDB,
      );
    }
  }

  /**
   * Read a notification
   */
  @ready(new notificationsErrors.ErrorNotificationsNotRunning())
  public async *readNotifications({
    unread = false,
    number = 'all',
    order = 'newest',
    tran,
  }: {
    unread?: boolean;
    number?: number | 'all';
    order?: 'newest' | 'oldest';
    tran?: DBTransaction;
  } = {}): AsyncGenerator<Notification> {
    if (tran == null) {
      const readNotifications = (tran) =>
        this.readNotifications({ unread, number, order, tran });
      return yield* this.db.withTransactionG(async function* (tran) {
        return yield* readNotifications(tran);
      });
    }
    const notificationIds = this.getNotificationIds({
      unread,
      number,
      order,
      tran,
    });
    for await (const id of notificationIds) {
      const notification = await this.readNotificationById(id, tran);
      if (notification == null) never();
      yield notification;
    }
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
        nodesUtils.decodeNodeId(notification.iss)!.equals(fromNode)
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
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.clearNotifications(tran));
    }
    const notificationIds = this.getNotificationIds({ tran });
    for await (const id of notificationIds) {
      await this.removeNotification(id, tran);
    }
  }

  protected async readNotificationById(
    notificationId: NotificationId,
    tran: DBTransaction,
  ): Promise<Notification | undefined> {
    const notificationDb = await tran.get<NotificationDB>([
      ...this.notificationsManagerInboxDbPath,
      notificationId.toBuffer(),
    ]);
    if (notificationDb === undefined) {
      return undefined;
    }
    notificationDb.isRead = true;
    await tran.put(
      [...this.notificationsManagerInboxDbPath, notificationId.toBuffer()],
      notificationDb,
    );
    return {
      ...notificationDb,
      notificationIdEncoded:
        notificationsUtils.encodeNotificationId(notificationId),
    };
  }

  protected async *getNotificationIds({
    unread = false,
    number = 'all',
    order = 'newest',
    tran,
  }: {
    unread?: boolean;
    number?: number | 'all';
    order?: 'newest' | 'oldest';
    tran: DBTransaction;
  }): AsyncGenerator<NotificationId> {
    const messageIterator = tran.iterator<NotificationDB>(
      this.notificationsManagerInboxDbPath,
      { valueAsBuffer: false, reverse: order === 'newest' },
    );
    let i = 0;
    for await (const [keyPath, notificationDb] of messageIterator) {
      if (number !== 'all' && i >= number) {
        break;
      }
      if (notificationDb.isRead && unread) {
        continue;
      }
      const key = keyPath[0] as Buffer;
      const notificationId = IdInternal.fromBuffer<NotificationId>(key);
      yield notificationId;
      i++;
    }
  }

  protected async getNotifications(
    type: 'unread' | 'all',
    tran: DBTransaction,
  ): Promise<Array<Notification>> {
    const notifications: Array<Notification> = [];
    for await (const [keyPath, notificationDb] of tran.iterator<NotificationDB>(
      this.notificationsManagerInboxDbPath,
      { valueAsBuffer: false },
    )) {
      const notificationIdEncoded = notificationsUtils.encodeNotificationId(
        IdInternal.fromBuffer<NotificationId>(keyPath[0] as Buffer),
      );
      if (type === 'all') {
        notifications.push({
          notificationIdEncoded,
          ...notificationDb,
        });
      } else if (type === 'unread') {
        if (!notificationDb.isRead) {
          notifications.push({
            notificationIdEncoded,
            ...notificationDb,
          });
        }
      }
    }
    return notifications;
  }

  protected async getOldestNotificationId(
    tran: DBTransaction,
  ): Promise<NotificationId | undefined> {
    for await (const notification of this.getNotificationIds({
      order: 'oldest',
      tran,
    })) {
      return notification;
    }
    return undefined;
  }

  protected async removeNotification(
    messageId: NotificationId,
    tran: DBTransaction,
  ): Promise<void> {
    await tran.del([
      ...this.notificationsManagerInboxDbPath,
      messageId.toBuffer(),
    ]);
  }
}

export default NotificationsManager;
