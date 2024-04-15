import type { DB, DBTransaction, KeyPath, LevelPath } from '@matrixai/db';
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
  TaskId,
} from '../ids/types';
import type { Task, TaskHandler } from '../tasks/types';
import type { TaskManager } from '../tasks';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { utils as idUtils } from '@matrixai/id';
import * as notificationsUtils from './utils';
import * as notificationsErrors from './errors';
import * as notificationsEvents from './events';
import * as errors from '../errors';
import * as nodesUtils from '../nodes/utils';
import { never } from '../utils/utils';

const NOTIFICATIONS_COUNT_KEY = 'numNotifications';

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
    logger = new Logger(this.name),
    fresh = false,
  }: {
    acl: ACL;
    db: DB;
    nodeManager: NodeManager;
    taskManager: TaskManager;
    keyRing: KeyRing;
    messageCap?: number;
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

  /**
   * Map for hashing NotificationIds to find TaskIds.
   * The key must be NotificationIdEncoded, so that the string representation is hashed rather than the reference to the NotificationId object.
   */
  protected outboxNotificationIdEncodedToTaskIdMap: Map<
    NotificationIdEncoded,
    TaskId
  >;

  /**
   * Top level stores inbox/outbox -> Notifications, numMessages
   */
  protected notificationsManagerDbPath: LevelPath = [this.constructor.name];
  protected notificationsManagerInboxDbPath: LevelPath = [
    ...this.notificationsManagerDbPath,
    'inbox',
  ];
  protected notificationsManagerOutboxDbPath: LevelPath = [
    ...this.notificationsManagerDbPath,
    'outbox',
  ];
  /**
   * Notifications stores NotificationId -> Notification
   */
  protected notificationsManagerInboxNotificationsDbPath: LevelPath = [
    ...this.notificationsManagerInboxDbPath,
    'notifications',
  ];
  protected notificationsManagerInboxNotificationsCounterDbPath: KeyPath = [
    ...this.notificationsManagerInboxDbPath,
    NOTIFICATIONS_COUNT_KEY,
  ];
  protected notificationsManagerOutboxNotificationsDbPath: LevelPath = [
    ...this.notificationsManagerOutboxDbPath,
    'notifications',
  ];
  protected notificationsManagerOutboxNotificationsCounterDbPath: KeyPath = [
    ...this.notificationsManagerOutboxDbPath,
    NOTIFICATIONS_COUNT_KEY,
  ];

  protected inboxNotificationIdGenerator: () => NotificationId;
  protected outboxNotificationIdGenerator: () => NotificationId;

  public readonly sendNotificationHandlerId =
    `${this.constructor.name}.sendNotificationHandler` as TaskHandlerId;

  protected sendNotificationHandler: TaskHandler = async (
    _ctx,
    _taskInfo,
    {
      nodeIdEncoded,
      notificationIdEncoded,
      blocking,
      retries,
      attempt,
    }: {
      nodeIdEncoded: NodeIdEncoded;
      notificationIdEncoded: NotificationIdEncoded;
      blocking: boolean;
      retries: number;
      attempt: number;
    },
  ) => {
    return this.db.withTransactionF(async (tran) => {
      const nodeId = nodesUtils.decodeNodeId(nodeIdEncoded)!;
      const notificationId = notificationsUtils.decodeNotificationId(
        notificationIdEncoded,
      )!;
      const notificationKeyPath = [
        ...this.notificationsManagerOutboxNotificationsDbPath,
        idUtils.toBuffer(notificationId),
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
      let newTaskId: TaskId | undefined;
      try {
        await this.nodeManager.withConnF(nodeId, async (connection) => {
          const client = connection.getClient();
          await client.methods.notificationsSend({
            signedNotificationEncoded: signedNotification,
          });
        });
      } catch (e) {
        if (e instanceof errors.ErrorPolykeyRemote) {
          this.logger.warn(
            `Notification recipient ${nodesUtils.encodeNodeId(
              nodeId,
            )} responded with error: ${e.cause.description}`,
          );
          if (blocking) {
            throw e;
          }
          return;
        } else {
          this.logger.warn(
            `Could not send to ${
              notificationDb.data.type
            } notification to ${nodesUtils.encodeNodeId(nodeId)}`,
          );
        }
        // This will only happen on connection errors.
        if (attempt < retries) {
          // Recursively return inner task, so that the handler can process them.
          const newTask = await this.taskManager.scheduleTask({
            handlerId: this.sendNotificationHandlerId,
            path: [this.sendNotificationHandlerId],
            parameters: [
              {
                nodeIdEncoded,
                notificationIdEncoded,
                blocking,
                retries,
                attempt: attempt + 1,
              },
            ],
            delay: 1000 * 2 ** attempt,
            lazy: false,
          });
          newTaskId = newTask.id;
          return newTask;
        } else if (blocking) {
          throw e;
        }
      } finally {
        // If a new task has been scheduled, set it in the map. If not, delete it.
        if (newTaskId == null) {
          this.outboxNotificationIdEncodedToTaskIdMap.delete(
            notificationIdEncoded,
          );
          await tran.del(notificationKeyPath);
          const counter = await tran.get<number>(
            this.notificationsManagerOutboxNotificationsCounterDbPath,
          );
          await tran.put(
            this.notificationsManagerOutboxNotificationsCounterDbPath,
            counter != null ? counter - 1 : 0,
          );
        } else {
          this.outboxNotificationIdEncodedToTaskIdMap.set(
            notificationIdEncoded,
            newTaskId,
          );
        }
      }
    });
  };

  constructor({
    acl,
    db,
    nodeManager,
    taskManager,
    keyRing,
    messageCap,
    logger,
  }: {
    acl: ACL;
    db: DB;
    nodeManager: NodeManager;
    taskManager: TaskManager;
    keyRing: KeyRing;
    messageCap: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.messageCap = messageCap;
    this.acl = acl;
    this.db = db;
    this.keyRing = keyRing;
    this.nodeManager = nodeManager;
    this.taskManager = taskManager;
    this.outboxNotificationIdEncodedToTaskIdMap = new Map();
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
        this.notificationsManagerInboxNotificationsDbPath,
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
        this.notificationsManagerOutboxNotificationsDbPath,
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
      // Set the notificationIds of the saved taskIds to the map.
      for await (const task of this.taskManager.getTasks('asc', false, [
        this.sendNotificationHandlerId,
      ])) {
        this.outboxNotificationIdEncodedToTaskIdMap.set(
          task.parameters[0].notificationIdEncoded,
          task.id,
        );
      }
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
    this.outboxNotificationIdEncodedToTaskIdMap.clear();
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
  public async sendNotification({
    nodeId,
    data,
    blocking = false,
    retries = 64,
  }: {
    nodeId: NodeId;
    data: NotificationData;
    blocking?: boolean;
    retries?: number;
  }): Promise<void> {
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
    await this.db.withTransactionF(async (tran) => {
      await tran.put(
        [
          ...this.notificationsManagerOutboxNotificationsDbPath,
          idUtils.toBuffer(notificationId),
        ],
        notificationDb,
      );
      const counter = await tran.get<number>(
        this.notificationsManagerOutboxNotificationsCounterDbPath,
      );
      await tran.put(
        this.notificationsManagerOutboxNotificationsCounterDbPath,
        counter != null ? counter + 1 : 1,
      );
      pendingTask = await this.taskManager.scheduleTask(
        {
          handlerId: this.sendNotificationHandlerId,
          parameters: [
            {
              nodeIdEncoded,
              notificationIdEncoded,
              blocking,
              retries,
              attempt: 0,
            },
          ],
          path: [this.sendNotificationHandlerId],
          lazy: false,
        },
        tran,
      );
      this.outboxNotificationIdEncodedToTaskIdMap.set(
        notificationIdEncoded,
        pendingTask.id,
      );
    });
    if (blocking) {
      while (pendingTask != null) {
        pendingTask = await pendingTask.promise();
      }
    }
  }

  protected async getOutboxNotificationIds(
    tran: DBTransaction,
  ): Promise<Array<NotificationId>> {
    const notificationIds: Array<NotificationId> = [];
    const messageIterator = tran.iterator<NotificationDB>(
      this.notificationsManagerOutboxNotificationsDbPath,
      { valueAsBuffer: false },
    );
    for await (const [keyPath] of messageIterator) {
      const key = keyPath[0] as Buffer;
      const notificationId = IdInternal.fromBuffer<NotificationId>(key);
      notificationIds.push(notificationId);
    }
    return notificationIds;
  }

  protected async readOutboxNotificationById(
    notificationId: NotificationId,
    tran: DBTransaction,
  ): Promise<Notification | undefined> {
    const notificationDb = await tran.get<NotificationDB>([
      ...this.notificationsManagerOutboxNotificationsDbPath,
      idUtils.toBuffer(notificationId),
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
  public async readOutboxNotifications({
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
        this.readOutboxNotifications({ number, order, tran }),
      );
    }
    let outboxIds = await this.getOutboxNotificationIds(tran);

    if (order === 'newest') {
      outboxIds.reverse();
    }

    if (number === 'all' || number > outboxIds.length) {
      number = outboxIds.length;
    }
    outboxIds = outboxIds.slice(0, number);

    const notifications: Array<Notification> = [];
    for (const id of outboxIds) {
      const notification = await this.readOutboxNotificationById(id, tran);
      if (notification == null) never();
      notifications.push(notification);
    }

    return notifications;
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

    await tran.lock(
      this.notificationsManagerOutboxNotificationsCounterDbPath.join(''),
    );
    const notificationIds = await this.getNotificationIds('all', tran);
    const numMessages = await tran.get<number>(
      this.notificationsManagerOutboxNotificationsCounterDbPath,
    );
    if (numMessages !== undefined) {
      for (const id of notificationIds) {
        await this.removeOutboxNotification(id, tran);
      }
    }
  }

  protected async removeOutboxNotification(
    notificationId: NotificationId,
    tran: DBTransaction,
  ): Promise<void> {
    await tran.lock(
      this.notificationsManagerOutboxNotificationsCounterDbPath.join(''),
    );
    const numMessages = await tran.get<number>(
      this.notificationsManagerOutboxNotificationsCounterDbPath,
    );
    if (numMessages === undefined) {
      throw new notificationsErrors.ErrorNotificationsDb();
    }
    const taskId = this.outboxNotificationIdEncodedToTaskIdMap.get(
      notificationsUtils.encodeNotificationId(notificationId),
    )!;
    const task = (await this.taskManager.getTask(taskId, false, tran))!;
    task.cancel(abortSendNotificationTaskReason);
    await tran.del([
      ...this.notificationsManagerOutboxNotificationsDbPath,
      idUtils.toBuffer(notificationId),
    ]);
    await tran.put(
      this.notificationsManagerOutboxNotificationsCounterDbPath,
      numMessages - 1,
    );
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

    await tran.lock(
      this.notificationsManagerInboxNotificationsCounterDbPath.join(''),
    );
    const nodePerms = await this.acl.getNodePerm(
      nodesUtils.decodeNodeId(notification.iss)!,
    );
    if (nodePerms === undefined) {
      throw new notificationsErrors.ErrorNotificationsPermissionsNotFound();
    }
    // Only keep the message if the sending node has the correct permissions
    if (Object.keys(nodePerms.gestalt).includes('notify')) {
      // If the number stored in notificationsDb >= 10000
      let numMessages = await tran.get<number>(
        this.notificationsManagerInboxNotificationsCounterDbPath,
      );
      if (numMessages === undefined) {
        numMessages = 0;
        await tran.put(
          this.notificationsManagerInboxNotificationsCounterDbPath,
          0,
        );
      }
      if (numMessages >= this.messageCap) {
        // Remove the oldest notification from notificationsMessagesDb
        const oldestId = await this.getOldestNotificationId(tran);
        await this.removeNotification(oldestId!, tran);
      }
      // Store the new notification in notificationsMessagesDb
      const notificationId = this.inboxNotificationIdGenerator();
      await tran.put(
        [
          ...this.notificationsManagerInboxNotificationsDbPath,
          idUtils.toBuffer(notificationId),
        ],
        {
          ...notification,
          peerNotificationIdEncoded: notification.notificationIdEncoded,
          notificationIdEncoded: undefined,
        } as NotificationDB,
      );
      // Number of messages += 1
      const newNumMessages = numMessages + 1;
      await tran.put(
        this.notificationsManagerInboxNotificationsCounterDbPath,
        newNumMessages,
      );
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

    await tran.lock(
      this.notificationsManagerInboxNotificationsCounterDbPath.join(''),
    );
    const notificationIds = await this.getNotificationIds('all', tran);
    const numMessages = await tran.get<number>(
      this.notificationsManagerInboxNotificationsCounterDbPath,
    );
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
    const notificationDb = await tran.get<NotificationDB>([
      ...this.notificationsManagerInboxNotificationsDbPath,
      idUtils.toBuffer(notificationId),
    ]);
    if (notificationDb === undefined) {
      return undefined;
    }
    notificationDb.isRead = true;
    await tran.put(
      [
        ...this.notificationsManagerInboxNotificationsDbPath,
        idUtils.toBuffer(notificationId),
      ],
      notificationDb,
    );
    return {
      notificationIdEncoded:
        notificationsUtils.encodeNotificationId(notificationId),
      ...notificationDb,
    };
  }

  protected async getNotificationIds(
    type: 'unread' | 'all',
    tran: DBTransaction,
  ): Promise<Array<NotificationId>> {
    const notificationIds: Array<NotificationId> = [];
    const messageIterator = tran.iterator<NotificationDB>(
      this.notificationsManagerInboxNotificationsDbPath,
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
    for await (const [keyPath, notificationDb] of tran.iterator<NotificationDB>(
      this.notificationsManagerInboxNotificationsDbPath,
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
    await tran.lock(
      this.notificationsManagerInboxNotificationsCounterDbPath.join(''),
    );
    const numMessages = await tran.get<number>(
      this.notificationsManagerInboxNotificationsCounterDbPath,
    );
    if (numMessages === undefined) {
      throw new notificationsErrors.ErrorNotificationsDb();
    }

    await tran.del([
      ...this.notificationsManagerInboxNotificationsDbPath,
      idUtils.toBuffer(messageId),
    ]);
    await tran.put(
      this.notificationsManagerInboxNotificationsCounterDbPath,
      numMessages - 1,
    );
  }
}

export default NotificationsManager;
