import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';
import type { ResourceRelease } from '@matrixai/resources';
import type {
  Task,
  TaskDeadline,
  TaskDelay,
  TaskData,
  TaskHandlerId,
  TaskHandler,
  TaskTimestamp,
  TaskParameters,
  TaskIdEncoded,
  TaskIdString,
  TaskPriority,
  TaskId,
  TaskPath,
} from './types';
import type KeyManager from '../keys/KeyManager';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { Lock } from '@matrixai/async-locks';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { extractTs } from '@matrixai/id/dist/IdSortable';
import lexi from 'lexicographic-integer';
import TaskEvent from './TaskEvent';
import * as tasksErrors from './errors';
import * as tasksUtils from './utils';
import Timer from '../timer/Timer';
import * as utils from '../utils';
import * as debug from '../utils/debug';

const abortSchedulingLoopReason = Symbol('abort scheduling loop reason');
const abortQueuingLoopReason = Symbol('abort queuing loop reason');

@CreateDestroyStartStop(
  new tasksErrors.ErrorQueueRunning(),
  new tasksErrors.ErrorQueueDestroyed(),
)
class Tasks {
  public static async createTasks({
    db,
    handlers = {},
    lazy = false,
    activeLimit = Infinity,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    handlers?: Record<TaskHandlerId, TaskHandler>;
    lazy?: boolean;
    activeLimit?: number;
    logger?: Logger;
    fresh?: boolean;
  }) {
    logger.info(`Creating ${this.name}`);
    const tasks = new this({
      db,
      activeLimit,
      logger,
    });
    await tasks.start({
      handlers,
      lazy,
      fresh,
    });
    logger.info(`Created ${this.name}`);
    return tasks;
  }


  protected logger: Logger;
  protected db: DB;
  protected activeLimit: number;

  protected tasksDbPath: LevelPath = [this.constructor.name];

  /**
   * Maintain last Task ID to preserve monotonicity across process restarts
   * `Tasks/lastTaskId -> {raw(TaskId)}`
   */
  protected tasksLastTaskIdPath: KeyPath = [...this.tasksDbPath, 'lastTaskId'];

  /**
   * Tasks collection
   * `Tasks/tasks/{TaskId} -> {json(TaskData)}`
   */
  protected tasksTaskDbPath: LevelPath = [...this.tasksDbPath, 'task'];

  /**
   * Tasks indexed path
   * `Tasks/path/{...TaskPath}/{TaskId} -> {raw(TaskId)}`
   */
  protected tasksPathDbPath: LevelPath = [...this.tasksDbPath, 'path'];

  /**
   * Scheduled Tasks
   * This is indexed by `TaskId` at the end to avoid conflicts
   * `Tasks/scheduled/{lexi(TaskTimestamp + TaskDelay)}/{TaskId} -> {raw(TaskId)}`
   */
  protected tasksScheduledDbPath: LevelPath = [
    ...this.tasksDbPath,
    'scheduled',
  ];

  /**
   * Queued Tasks
   * This is indexed by `TaskId` at the end to avoid conflicts
   * `Tasks/queued/{lexi(TaskPriority)}/{lexi(TaskTimestamp + TaskDelay)}/{TaskId} -> {raw(TaskId})}`
   */
  protected tasksQueuedDbPath: LevelPath = [...this.tasksDbPath, 'queued'];

  /**
   * Tracks actively running tasks
   * `Tasks/active/{TaskId} -> {raw(TaskId})}`
   */
  protected tasksActiveDbPath: LevelPath = [...this.tasksDbPath, 'active'];

  protected schedulerLogger: Logger;
  protected queueLogger: Logger;

  /**
   * Asynchronous scheduling loop
   * This transitions tasks from `scheduled` to `queued`
   * This is blocked by the `schedulingLock`
   * The `null` indicates that the scheduling loop isn't running
   */
  protected schedulingLoop: PromiseCancellable<void> | null = null;

  /**
   * Timer used to unblock the scheduling loop
   * This releases the `schedulingLock` if it is locked
   * The `null` indicates there is no timer running
   */
  protected schedulingTimer: Timer | null = null;

  /**
   * Lock controls whether to run an iteration of the scheduling loop
   */
  protected schedulingLock: Lock = new Lock();

  /**
   * Releases the scheduling lock
   */
  protected schedulingLockReleaser?: ResourceRelease;

  /**
   * Asynchronous queuing loop
   * This transitions tasks from `queued` to `active`
   * This is blocked by the `queuingLock`
   * The `null` indicates that the queuing loop isn't running
   */
  protected queuingLoop: PromiseCancellable<void> | null = null;

  /**
   * Lock controls whether to run an iteration of the queuing loop
   */
  protected queuingLock: Lock = new Lock();

  /**
   * Releases the queuing lock
   */
  protected queuingLockReleaser?: ResourceRelease;

  // If the releaser is set
  // it's possible that the releaser function
  // is still pointing to the old lock
  // we want to wipe that, or at least
  // ensure that it cannot be used
  // need to see if this is a problem

  protected generateTaskId: () => TaskId;
  protected handlers: Map<TaskHandlerId, TaskHandler> = new Map();
  protected taskEvents: EventTarget = new EventTarget();

  // WILL never settle?
  // it would be rejected immediately if the task no longer existed
  // if it does exist, it will be resolved
  // AND if it is cancelled, then it will be settled
  // so it is guaranteed to settle
  // tasks can only be cancelled, not removed
  protected taskPromises: Map<TaskIdString, PromiseCancellable<any>> = new Map();

  protected activePromises: Map<TaskIdEncoded, Promise<any>> = new Map();

  public constructor({
    db,
    activeLimit,
    logger,
  }: {
    db: DB;
    activeLimit: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.schedulerLogger = logger.getChild('scheduler');
    this.queueLogger = logger.getChild('queue');
    this.db = db;
    this.activeLimit = activeLimit;
  }

  public async start({
    handlers = {},
    lazy = false,
    fresh = false,
  }: {
    handlers?: Record<TaskHandlerId, TaskHandler>;
    lazy?: boolean;
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(
      `Starting ${this.constructor.name} ${
        lazy ? 'in Lazy Mode' : 'in Eager Mode'
      }`,
    );
    if (fresh) {
      this.handlers.clear();
      await this.db.clear(this.tasksDbPath);
    } else {
      await this.repairDanglingTasks();
    }
    const lastTaskId = await this.getLastTaskId();
    this.generateTaskId = tasksUtils.createTaskIdGenerator(lastTaskId);
    for (const taskHandlerId in handlers) {
      this.handlers.set(
        taskHandlerId as TaskHandlerId,
        handlers[taskHandlerId],
      );
    }
    if (!lazy) {
      await this.startProcessing();
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.stopProcessing();

    // This may not be necessary
    // await this.gcTasks();

    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    this.handlers.clear();
    await this.db.clear(this.tasksDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Start scheduling and queuing loop
   * This call is idempotent
   * Use this when `Tasks` is started in lazy mode
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['starting'])
  public async startProcessing(): Promise<void> {
    await Promise.all([this.startScheduling(), this.startQueueing()]);
  }

  /**
   * Stop the scheduling and queuing loop
   * This call is idempotent
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['stopping'])
  public async stopProcessing(): Promise<void> {
    await Promise.all([this.stopQueueing(), this.stopScheduling()]);
  }

  public getHandler(handlerId: TaskHandlerId): TaskHandler | undefined {
    return this.handlers.get(handlerId);
  }

  public getHandlers(): Record<TaskHandlerId, TaskHandler> {
    return Object.fromEntries(this.handlers);
  }

  /**
   * Registers a handler for tasks with the same `TaskHandlerId`
   */
  public registerHandler(handlerId: TaskHandlerId, handler: TaskHandler) {
    this.handlers.set(handlerId, handler);
  }

  /**
   * Deregisters a handler
   */
  public deregisterHandler(handlerId: TaskHandlerId) {
    this.handlers.delete(handlerId);
  }

  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['starting'])
  public async getLastTaskId(
    tran?: DBTransaction,
  ): Promise<TaskId | undefined> {
    const lastTaskIdBuffer = await (tran ?? this.db).get(
      this.tasksLastTaskIdPath,
      true,
    );
    if (lastTaskIdBuffer == null) return;
    return IdInternal.fromBuffer<TaskId>(lastTaskIdBuffer);
  }

  // Public async getTask(
  //   taskId: TaskId,
  //   lazy: boolean = false,
  //   tran?: DBTransaction,
  // ): Promise<Task | undefined> {
  //   if (tran == null) {
  //     return this.db.withTransactionF((tran) =>
  //       this.getTask(taskId, lazy, tran),
  //     );
  //   }
  //   const taskData = await tran.get<TaskData>([
  //     ...this.tasksTaskDbPath,
  //     taskId.toBuffer(),
  //   ]);
  //   if (taskData == null) {
  //     return undefined;
  //   }
  //   return {
  //     id: taskId,
  //     promise: new PromiseCancellable<void>((resolve, reject) => { resolve()}),
  //     ...taskData,
  //   };
  // }

  public async *getTaskDatas(
    path: TaskPath = [],
    order: 'asc' | 'desc' = 'asc',
    lazy: boolean = false,
    tran?: DBTransaction,
  ): AsyncGenerator<TaskData> {}

  /**
   * Schedules a task
   * If `this.schedulingLoop` isn't running, then this will not
   * attempt to reset the `this.schedulingTimer`
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public async scheduleTask(
    {
      handlerId,
      parameters = [],
      delay = 0,
      priority = 0,
      deadline = Infinity,
      path = [],
      lazy = false,
    }: {
      handlerId: TaskHandlerId;
      parameters?: TaskParameters;
      delay?: number;
      priority?: number;
      deadline?: number;
      path?: TaskPath;
      lazy?: boolean;
    },
    tran?: DBTransaction,
  ): Promise<Task> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.scheduleTask(
          {
            handlerId,
            parameters,
            delay,
            priority,
            deadline,
            path,
            lazy,
          },
          tran,
        ),
      );
    }
    const taskId = this.generateTaskId();
    const taskIdEncoded = tasksUtils.encodeTaskId(taskId);
    this.logger.debug(
      `Scheduling Task ${taskIdEncoded} with handler ${handlerId}`,
    );
    const taskIdBuffer = taskId.toBuffer();
    // Timestamp extracted from `IdSortable` is a floating point in seconds
    // with subsecond fractionals, multiply it by 1000 gives us milliseconds
    const taskTimestamp = Math.trunc(extractTs(taskId) * 1000) as TaskTimestamp;
    const taskPriority = tasksUtils.toPriority(priority);
    const taskDelay = Math.max(delay, 0) as TaskDelay;
    const taskDeadline = Math.max(deadline, 0) as TaskDeadline;
    const taskScheduleTime = taskTimestamp + taskDelay;
    const taskData: TaskData = {
      handlerId,
      parameters,
      timestamp: taskTimestamp,
      priority: taskPriority,
      delay: taskDelay,
      deadline: taskDeadline,
      path,
    };
    // Saving the task
    await tran.put([...this.tasksTaskDbPath, taskIdBuffer], taskData);
    // Saving last task ID
    await tran.put(this.tasksLastTaskIdPath, taskIdBuffer, true);
    // Putting task into scheduled index
    await tran.put(
      [
        ...this.tasksScheduledDbPath,
        utils.lexiPackBuffer(taskScheduleTime),
        taskIdBuffer,
      ],
      taskIdBuffer,
      true,
    );
    // Putting the task into the path index
    await tran.put(
      [...this.tasksPathDbPath, ...path, taskIdBuffer],
      taskIdBuffer,
      true,
    );
    // Transaction success triggers timer interception
    tran.queueSuccess(() => {
      // If the scheduling loop is not set then the `Tasks` system was created
      // in lazy mode or the scheduling loop was explicitly stopped in either
      // case, we do not attempt to intercept the scheduling timer
      if (this.schedulingLoop != null) {
        this.triggerScheduling(taskScheduleTime);
      }
    });
    let promise: () => PromiseCancellable<any>;
    if (lazy) {
      promise = () => this.getTaskPromise(taskId);
    } else {
      const taskPromise = this.getTaskPromise(taskId, tran);
      tran.queueFailure((e) => {
        taskPromise.cancel(e);
      });
      promise = () => taskPromise;
    }
    this.logger.debug(
      `Scheduled Task ${taskIdEncoded} with handler ${handlerId}`,
    );
    return {
      id: taskId,
      status: 'scheduled',
      promise,
      handlerId,
      parameters,
      priority: tasksUtils.fromPriority(taskPriority),
      delay: taskDelay,
      deadline: taskDeadline,
      path,
      created: new Date(taskTimestamp),
      scheduled: new Date(taskScheduleTime),
    };
  }

  protected getTaskPromise(taskId: TaskId, tran?: DBTransaction): PromiseCancellable<any> {
    return new PromiseCancellable((resolve, reject) => {
      resolve('TEST');
    });
  }

  // @ready(new tasksErrors.ErrorSchedulerNotRunning())
  // public getTaskPromise(taskId: TaskId, tran?: DBTransaction): PromiseCancellable<any> {
  //   const taskIdString = taskId.toString() as TaskIdString;
  //   // This will return a task promise if it already exists
  //   const existingTaskPromise = this.taskPromises.get(taskIdString);
  //   if (existingTaskPromise != null) return existingTaskPromise;

  //   // If the task exist then it will create the task promise and return that
  //   const newTaskPromise = new PromiseCancellable((resolve, reject, signal) => {
  //     const abortListener = async () => {
  //       // TODO: this needs to call a cancel method called
  //       // this.cancelTask(taskId)

  //       // FIXME: this reject is temporary
  //       reject(new Error('TMP fast rejection for edge case, remove me when task cancellation is implemented'))
  //     }
  //     signal.addEventListener('abort', abortListener);
  //     const resultListener = (event: TaskEvent) => {
  //       signal.removeEventListener('abort', abortListener);
  //       if (event.detail.status === 'failure') reject(event.detail.reason);
  //       else resolve(event.detail.result);
  //     };
  //     this.taskEvents.addEventListener(taskIdString, resultListener, {
  //       once: true,
  //     });
  //     // If not task promise exists then with will check if the task exists
  //     void (tran ?? this.db)
  //       .get([...this.tasksTaskDbPath, taskId.toBuffer()], true)
  //       .then(
  //         (taskData) => {
  //           if (taskData == null) {
  //             this.taskEvents.removeEventListener(
  //               taskIdString,
  //               resultListener,
  //             );
  //             signal.removeEventListener('abort', abortListener);
  //             reject(new tasksErrors.ErrorTaskMissing(`task ${taskId.toMultibase('base32hex')} was not found`));
  //           }
  //         },
  //         (reason) => reject(reason),
  //       );
  //   }).finally(() => {
  //     this.taskPromises.delete(taskIdString);
  //   });
  //   this.taskPromises.set(taskIdString, newTaskPromise);
  //   return newTaskPromise;
  // }

  /**
   * Transition tasks from `scheduled` to `queued`
   */
  protected async startScheduling() {
    if (this.schedulingLoop != null) return;
    this.schedulerLogger.info('Starting Scheduling Loop');
    const abortController = new AbortController();
    const abortP = utils.signalPromise(abortController.signal);
    const schedulingLoop = (async () => {
      while (!abortController.signal.aborted) {
        // Blocks the scheduling loop until lock is released
        // this ensures that each iteration of the loop is only
        // run when it is required
        try {
          await Promise.race([this.schedulingLock.waitForUnlock(), abortP]);
        } catch (e) {
          if (e === abortSchedulingLoopReason) {
            break;
          } else {
            throw e;
          }
        }
        this.schedulerLogger.debug(`Begin scheduling loop iteration`);
        [this.schedulingLockReleaser] = await this.schedulingLock.lock()();

        // Peek ahead by 100 ms
        // this is because the subsequent operations of this iteration may take up to 100ms
        // and we might as well prefetch some tasks to be executed
        const now = Math.trunc(performance.timeOrigin + performance.now()) + 100;

        await this.db.withTransactionF(async (tran) => {
          // Queue up all the tasks that are scheduled to be executed before `now`
          for await (const [kP] of tran.iterator(this.tasksScheduledDbPath, {
            // Upper bound of `{lexi(TaskTimestamp + TaskDelay)}/{TaskId}`
            // notice the usage of `''` as the upper bound of `TaskId`
            lte: [utils.lexiPackBuffer(now), ''],
            values: false,
          })) {
            if (abortController.signal.aborted) return;
            const taskScheduleTime = utils.lexiUnpackBuffer(kP[0] as Buffer);
            const taskIdBuffer = kP[1] as Buffer;
            const taskId = IdInternal.fromBuffer<TaskId>(taskIdBuffer);
            await this.queueTask(taskId, taskScheduleTime);
          }
        });

        if (abortController.signal.aborted) break;

        await this.db.withTransactionF(async (tran) => {
          // Get the next task to be scheduled and set the timer accordingly
          let nextScheduleTime: number | undefined;
          for await (const [kP] of tran.iterator(this.tasksScheduledDbPath, {
            limit: 1,
            values: false,
          })) {
            nextScheduleTime = utils.lexiUnpackBuffer(kP[0] as Buffer);
          }
          if (abortController.signal.aborted) return;
          if (nextScheduleTime == null) {
            this.logger.debug(
              'Scheduling loop iteration found no more scheduled tasks',
            );
          } else {
            this.triggerScheduling(nextScheduleTime);
          }
          this.schedulerLogger.debug('Finish scheduling loop iteration');
        });
      }
    })();
    this.schedulingLoop = PromiseCancellable.from(
      schedulingLoop,
      abortController,
    );
    this.schedulerLogger.info('Started Scheduling Loop');
  }

  protected async startQueueing() {
    if (this.queuingLoop != null) return;
    this.queueLogger.info('Starting Queueing Loop');
    const abortController = new AbortController();
    const abortP = utils.signalPromise(abortController.signal);
    const queuingLoop = (async () => {
      while (!abortController.signal.aborted) {
        try {
          await Promise.race([this.queuingLock.waitForUnlock(), abortP]);
        } catch (e) {
          if (e === abortQueuingLoopReason) {
            break;
          } else {
            throw e;
          }
        }
        this.queueLogger.debug(`Begin queuing loop iteration`);
        [this.queuingLockReleaser] = await this.queuingLock.lock()();
        await this.db.withTransactionF(async (tran) => {
          for await (const [kP] of tran.iterator(
            this.tasksQueuedDbPath,
            { values: false },
          )) {
            if (abortController.signal.aborted) break;
            if (this.activePromises.size >= this.activeLimit) break;
            const taskId = IdInternal.fromBuffer<TaskId>(kP[2] as Buffer);
            await this.startTask(taskId);
          }
        });
        this.queueLogger.debug(`Finish queuing loop iteration`);
      }
    })();
    // Cancellation is always a resolution
    // the promise must resolve, by waiting for resolution
    // it's graceful termination of the loop
    this.queuingLoop = PromiseCancellable.from(queuingLoop, abortController);
    this.queueLogger.info('Started Queueing Loop');
  }

  protected async stopScheduling(): Promise<void> {
    if (this.schedulingLoop == null) return;
    this.logger.info('Stopping Scheduling Loop');
    // Cancel the timer if it exists
    this.schedulingTimer?.cancel();
    // Cancel the scheduling loop
    this.schedulingLoop.cancel(abortSchedulingLoopReason);
    // Wait for the cancellation signal to resolve the promise
    await this.schedulingLoop;
    // Indicates that the loop is no longer running
    this.schedulingLoop = null;
    this.logger.info('Stopped Scheduling Loop');
  }

  protected async stopQueueing() {
    if (this.queuingLoop == null) return;
    this.logger.info('Stopping Queuing Loop');
    // Cancel the scheduling loop
    this.queuingLoop.cancel(abortQueuingLoopReason);
    await this.queuingLoop;
    this.queuingLoop = null;
    this.logger.info('Stopped Queuing Loop');
  }

  /**
   * Triggers the scheduler on a delayed basis
   * If the delay is 0, the scheduler is triggered immediately
   * The scheduling timer is a singleton that can be set by both
   * `this.schedulingLoop` and `this.scheduleTask`
   * This ensures that the timer is set to the earliest scheduled task
   */
  protected triggerScheduling(scheduleTime: number) {
    if (this.schedulingTimer != null) {
      if (scheduleTime >= this.schedulingTimer.scheduled!.getTime()) return;
      this.schedulingTimer.cancel();
    }
    const now = Math.trunc(performance.timeOrigin + performance.now());
    const delay = Math.max(scheduleTime - now, 0);
    // On the first iteration of the scheduling loop
    // the lock may not be acquired yet, and therefore releaser is not set
    // in which case don't do anything, and the lock remains unlocked
    if (delay === 0) {
      this.schedulerLogger.debug(
        `Setting scheduling loop iteration immediately (delay: ${delay} ms)`,
      );
      this.schedulingTimer = null;
      if (this.schedulingLockReleaser != null) {
        this.schedulingLockReleaser();
      }
    } else {
      this.schedulerLogger.debug(
        `Setting scheduling loop iteration for ${new Date(
          scheduleTime,
        ).toISOString()} (delay: ${delay} ms)`,
      );
      this.schedulingTimer = new Timer(() => {
        this.schedulingTimer = null;
        if (this.schedulingLockReleaser != null) {
          this.schedulingLockReleaser();
        }
      }, delay);
    }
  }

  /**
   * Same idea as triggerScheduling
   * But this time unlocking the queue to proceed
   * If already unlocked, subsequent unlocking is idempotent
   * The unlocking of the scheduling is delayed
   * Whereas this unlocking is not
   * Remember the queuing just keeps running until finished
   */
  protected triggerQueuing() {
    if (this.activePromises.size >= this.activeLimit) return;
    // On the first iteration of the queuing loop
    // the lock may not be acquired yet, and therefore releaser is not set
    // in which case don't do anything, and the lock remains unlocked
    if (this.queuingLockReleaser != null) {
      this.queuingLockReleaser();
    }
  }

  /**
   * Transition from scheduled to queued
   */
  protected async queueTask(
    taskId: TaskId,
    taskScheduleTime: number,
  ): Promise<void> {
    const taskIdEncoded = tasksUtils.encodeTaskId(taskId);
    this.schedulerLogger.debug(`Queuing Task ${taskIdEncoded}`);
    await this.db.withTransactionF(async (tran) => {
      const taskIdBuffer = taskId.toBuffer();
      const taskData = (await tran.get<TaskData>([
        ...this.tasksTaskDbPath,
        taskIdBuffer,
      ]))!;
      // Remove task from the scheduled index
      await tran.del([
        ...this.tasksScheduledDbPath,
        utils.lexiPackBuffer(taskScheduleTime),
        taskIdBuffer
      ]);
      // Put task into the queue index
      await tran.put(
        [
          ...this.tasksQueuedDbPath,
          utils.lexiPackBuffer(taskData.priority),
          utils.lexiPackBuffer(taskScheduleTime),
          taskIdBuffer,
        ],
        taskIdBuffer,
        true,
      );
      tran.queueSuccess(() => {
        this.triggerQueuing();
      });
    });
    this.schedulerLogger.debug(`Queued Task ${taskIdEncoded}`);
  }

  /**
   * Transition from queued to active
   */
  protected async startTask(
    taskId: TaskId,
  ): Promise<void> {
    await this.db.withTransactionF(async (tran) => {
      const taskIdBuffer = taskId.toBuffer();
      const taskIdEncoded = tasksUtils.encodeTaskId(taskId);
      this.queueLogger.debug(`Starting Task ${taskIdEncoded}`);
      const taskData = (await tran.get<TaskData>([
        ...this.tasksTaskDbPath,
        taskIdBuffer,
      ]))!;
      const taskHandler = this.getHandler(taskData.handlerId);
      if (taskHandler == null) {
        this.queueLogger.error(
          `Failed Task ${taskIdEncoded} - No Handler Registered`,
        );
        this.taskEvents.dispatchEvent(
          new TaskEvent(taskIdEncoded, {
            detail: {
              status: 'failure',
              reason: new tasksErrors.ErrorSchedulerHandlerMissing(),
            },
          }),
        );
        await this.gcTask(taskId, tran);
        return;
      }
      // Remove task from the queued index
      await tran.del([
        ...this.tasksQueuedDbPath,
        utils.lexiPackBuffer(taskData.priority),
        utils.lexiPackBuffer(taskData.timestamp + taskData.delay),
        taskIdBuffer
      ]);
      // Put task into the active index
      // this index will be used to retry tasks if they don't finish
      await tran.put(
        [...this.tasksActiveDbPath, taskId.toBuffer()],
        taskId.toBuffer(),
        true,
      );
      tran.queueSuccess(() => {

        // Dummy values for now
        const timer = new Timer();
        const abortController = new AbortController();

        const taskP = taskHandler(...taskData.parameters, {
          timer: timer,
          signal: abortController.signal,
        })
          .then(
            (result: any) => {
              this.queueLogger.debug(
                `Succeeded Task ${taskIdEncoded}`,
              );
              // If no event listeners, then only side effects are recorded
              this.taskEvents.dispatchEvent(
                new TaskEvent(taskIdEncoded, {
                  detail: {
                    status: 'success',
                    result,
                  },
                }),
              );
            },
            (reason: any) => {
              this.queueLogger.warn(
                `Failed Task ${taskIdEncoded} - Reason: ${reason}`,
              );
              this.taskEvents.dispatchEvent(
                new TaskEvent(taskIdEncoded, {
                  detail: {
                    status: 'failure',
                    reason,
                  },
                }),
              );
            },
          )
          .finally(() => {
            this.activePromises.delete(taskIdEncoded);
            this.gcTask(taskId);
            this.triggerQueuing();
          });
        this.activePromises.set(taskIdEncoded, taskP);
        this.queueLogger.debug(`Started Task ${taskIdEncoded}`);
      });
    });
  }

  /**
   * This is used to garbage collect tasks that have settled
   * Explicit removal of tasks can only be done through task cancellation
   */
  protected async gcTask(taskId: TaskId, tran?: DBTransaction) {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.gcTask(taskId, tran));
    }
    const taskIdEncoded = tasksUtils.encodeTaskId(taskId);
    this.logger.debug(`Garbage Collecting Task ${taskIdEncoded}`);
    const taskData = await tran.get<TaskData>([
      ...this.tasksTaskDbPath,
      taskId.toBuffer(),
    ]);
    if (taskData == null) return;
    await tran.del([...this.tasksActiveDbPath, taskId.toBuffer()]);
    await tran.del([
      ...this.tasksPathDbPath,
      ...taskData.path,
      taskId.toBuffer(),
    ]);
    await tran.del([...this.tasksTaskDbPath, taskId.toBuffer()]);
    this.logger.debug(`Garbage Collected Task ${taskIdEncoded}`);
  }

  /**
   * If the process was killed ungracefully
   * then we may need to repair any dangling tasks
   * Dangling tasks can exist in active, queued or scheduled indexes
   * This is due to our optimistic mapping algorithm during the scheduling
   * and queuing loop. It maps the scheduled to queued, and queued to active
   * before the tasks are deleted from the prior index
   * Tasks that are left in the active index will be moved to the queued index,
   * these will be retried first
   * Tasks that are left in the scheduled index that are in the queued index are
   * removed
   */
  protected async repairDanglingTasks() {
    await this.db.withTransactionF(async (tran) => {
      this.logger.info('Begin Tasks Repair');
      // Move tasks from active to queued
      // these tasks will be retried
      for await (const [kP] of tran.iterator(
        this.tasksActiveDbPath,
        { values: false }
      )) {
        const taskIdBuffer = kP[0] as Buffer;
        const taskId = IdInternal.fromBuffer<TaskId>(taskIdBuffer);
        const taskIdEncoded = tasksUtils.encodeTaskId(taskId);
        const taskData = (await tran.get<TaskData>([
          ...this.tasksTaskDbPath,
          taskIdBuffer,
        ]))!;
        // Put task back into the queue index
        await tran.put(
          [
            ...this.tasksQueuedDbPath,
            utils.lexiPackBuffer(taskData.priority),
            utils.lexiPackBuffer(taskData.timestamp + taskData.delay),
            taskIdBuffer,
          ],
          taskIdBuffer,
          true,
        );
        // Removing task from active index
        await tran.del([...this.tasksActiveDbPath, ...kP]);
        this.logger.warn(`Moving Task ${taskIdEncoded} from Active to Queued`);
      }

      // The above has to be done regardless
      // this is iterating OVER ALL scheduled tasks
      // seems kind of inefficient
      // would be better to iterate over the queued tasks
      // if we could somehow control the iterator
      // but the bottom is no longer necessary
      // because scheduled to queued happens in one go
      // so you don't have things that are in the queued


      // Remove tasks from scheduled that are already in queued
      // for await (const [kP] of tran.iterator(
      //   this.tasksScheduledDbPath,
      //   { values: false }
      // )) {
      //   const taskIdBuffer = kP[1] as Buffer;
      //   const taskScheduleTimeBuffer = kP[0] as Buffer;
      //   const taskData = (await tran.get<TaskData>([
      //     ...this.tasksTaskDbPath,
      //     taskIdBuffer,
      //   ]))!;
      //   // Check if it's inside the tasksQueuedDbPath index
      //   const taskQueued = await tran.get([
      //     ...this.tasksQueuedDbPath,
      //     utils.lexiPackBuffer(taskData.priority),
      //     taskScheduleTimeBuffer,
      //     taskIdBuffer
      //   ]);
      //   if (taskQueued == null) {
      //     // It's not possible any further tasks will be duplicated
      //     break;
      //   }
      //   await tran.del([...this.tasksScheduledDbPath, ...kP]);
      //   const taskId = IdInternal.fromBuffer<TaskId>(taskIdBuffer);
      //   const taskIdEncoded = tasksUtils.encodeTaskId(taskId);
      //   this.logger.warn(`Removing Task ${taskIdEncoded} from Scheduled, it is already Queued`);
      // }
      this.logger.info('Finish Tasks Repair');
    });
  }
}

export default Tasks;
