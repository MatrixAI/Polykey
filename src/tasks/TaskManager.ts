import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';
import type { ResourceRelease } from '@matrixai/resources';
import type {
  Task,
  TaskDeadline,
  TaskData,
  TaskHandlerId,
  TaskHandler,
  TaskTimestamp,
  TaskParameters,
  TaskIdEncoded,
  TaskStatus,
  TaskId,
  TaskPath,
} from './types';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { Lock } from '@matrixai/async-locks';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { extractTs } from '@matrixai/id/dist/IdSortable';
import TaskEvent from './TaskEvent';
import * as tasksErrors from './errors';
import * as tasksUtils from './utils';
import Timer from '../timer/Timer';
import * as utils from '../utils';

const abortSchedulingLoopReason = Symbol('abort scheduling loop reason');
const abortQueuingLoopReason = Symbol('abort queuing loop reason');

@CreateDestroyStartStop(
  new tasksErrors.ErrorTasksRunning(),
  new tasksErrors.ErrorTasksDestroyed(),
)
class TaskManager {
  public static async createTaskManager({
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
  protected schedulerLogger: Logger;
  protected queueLogger: Logger;
  protected db: DB;
  protected handlers: Map<TaskHandlerId, TaskHandler> = new Map();
  protected activeLimit: number;
  protected generateTaskId: () => TaskId;
  protected taskPromises: Map<TaskIdEncoded, PromiseCancellable<any>> =
    new Map();
  protected activePromises: Map<TaskIdEncoded, PromiseCancellable<any>> =
    new Map();
  protected taskEvents: EventTarget = new EventTarget();
  protected tasksDbPath: LevelPath = [this.constructor.name];
  /**
   * Tasks collection
   * `Tasks/tasks/{TaskId} -> {json(TaskData)}`
   */
  protected tasksTaskDbPath: LevelPath = [...this.tasksDbPath, 'task'];
  /**
   * Scheduled Tasks
   * This is indexed by `TaskId` at the end to avoid conflicts
   * `Tasks/scheduled/{lexi(TaskTimestamp + TaskDelay)}/{TaskId} -> null`
   */
  protected tasksScheduledDbPath: LevelPath = [
    ...this.tasksDbPath,
    'scheduled',
  ];
  /**
   * Queued Tasks
   * This is indexed by `TaskId` at the end to avoid conflicts
   * `Tasks/queued/{lexi(TaskPriority)}/{lexi(TaskTimestamp + TaskDelay)}/{TaskId} -> null`
   */
  protected tasksQueuedDbPath: LevelPath = [...this.tasksDbPath, 'queued'];
  /**
   * Tracks actively running tasks
   * `Tasks/active/{TaskId} -> null`
   */
  protected tasksActiveDbPath: LevelPath = [...this.tasksDbPath, 'active'];
  /**
   * Tasks indexed path
   * `Tasks/path/{...TaskPath}/{TaskId} -> null`
   */
  protected tasksPathDbPath: LevelPath = [...this.tasksDbPath, 'path'];
  /**
   * Maintain last Task ID to preserve monotonicity across process restarts
   * `Tasks/lastTaskId -> {raw(TaskId)}`
   */
  protected tasksLastTaskIdPath: KeyPath = [...this.tasksDbPath, 'lastTaskId'];
  /**
   * Asynchronous scheduling loop
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

  public get activeCount(): number {
    return this.activePromises.size;
  }

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
  @ready(new tasksErrors.ErrorTasksNotRunning(), false, ['starting'])
  public async startProcessing(): Promise<void> {
    await Promise.all([this.startScheduling(), this.startQueueing()]);
  }

  /**
   * Stop the scheduling and queuing loop
   * This call is idempotent
   */
  @ready(new tasksErrors.ErrorTasksNotRunning(), false, ['stopping'])
  public async stopProcessing(): Promise<void> {
    await Promise.all([this.stopQueueing(), this.stopScheduling()]);
  }

  public getHandler(handlerId: TaskHandlerId): TaskHandler | undefined {
    return this.handlers.get(handlerId);
  }

  public getHandlers(): Record<TaskHandlerId, TaskHandler> {
    return Object.fromEntries(this.handlers);
  }

  public registerHandler(handlerId: TaskHandlerId, handler: TaskHandler) {
    this.handlers.set(handlerId, handler);
  }

  public deregisterHandler(handlerId: TaskHandlerId) {
    this.handlers.delete(handlerId);
  }

  @ready(new tasksErrors.ErrorTasksNotRunning(), false, ['starting'])
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

  @ready(new tasksErrors.ErrorTasksNotRunning())
  public async getTask(
    taskId: TaskId,
    lazy: boolean = false,
    tran?: DBTransaction,
  ): Promise<Task | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getTask(taskId, lazy, tran),
      );
    }
    const taskIdBuffer = taskId.toBuffer();
    // The task promise must be set up before we check for the presence `TaskData`
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
    const cancel = (reason: any) => {
      this.cancelTask(taskId, reason);
    };
    const taskData = await tran.get<TaskData>([
      ...this.tasksTaskDbPath,
      taskIdBuffer,
    ]);
    if (taskData == null) {
      return;
    }
    const taskScheduleTime = taskData.timestamp + taskData.delay;
    let taskStatus: TaskStatus;
    if (
      (await tran.get([...this.tasksActiveDbPath, taskId.toBuffer()])) !==
      undefined
    ) {
      taskStatus = 'active';
    } else if (
      (await tran.get([
        ...this.tasksQueuedDbPath,
        utils.lexiPackBuffer(taskData.priority),
        utils.lexiPackBuffer(taskScheduleTime),
        taskIdBuffer,
      ])) !== undefined
    ) {
      taskStatus = 'queued';
    } else if (
      (await tran.get([
        ...this.tasksScheduledDbPath,
        utils.lexiPackBuffer(taskScheduleTime),
        taskIdBuffer,
      ])) !== undefined
    ) {
      taskStatus = 'scheduled';
    }
    return {
      id: taskId,
      status: taskStatus!,
      promise,
      cancel,
      handlerId: taskData.handlerId,
      parameters: taskData.parameters,
      delay: tasksUtils.fromDelay(taskData.delay),
      deadline: tasksUtils.fromDeadline(taskData.deadline),
      priority: tasksUtils.fromPriority(taskData.priority),
      path: taskData.path,
      created: new Date(taskData.timestamp),
      scheduled: new Date(taskScheduleTime),
    };
  }

  @ready(new tasksErrors.ErrorTasksNotRunning())
  public async *getTasks(
    order: 'asc' | 'desc' = 'asc',
    lazy: boolean = false,
    path?: TaskPath,
    tran?: DBTransaction,
  ): AsyncGenerator<Task> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) =>
        this.getTasks(order, lazy, path, tran),
      );
    }
    if (path == null) {
      for await (const [[taskIdBuffer]] of tran.iterator(
        [...this.tasksTaskDbPath],
        { values: false, reverse: order !== 'asc' },
      )) {
        const taskId = IdInternal.fromBuffer<TaskId>(taskIdBuffer as Buffer);
        const task = (await this.getTask(taskId, lazy, tran))!;
        yield task;
      }
    } else {
      for await (const [kP] of tran.iterator(
        [...this.tasksPathDbPath, ...path],
        { values: false, reverse: order !== 'asc' },
      )) {
        const taskIdBuffer = kP[kP.length - 1] as Buffer;
        const taskId = IdInternal.fromBuffer<TaskId>(taskIdBuffer);
        const task = (await this.getTask(taskId, lazy, tran))!;
        yield task;
      }
    }
  }

  @ready(new tasksErrors.ErrorTasksNotRunning())
  public getTaskPromise(
    taskId: TaskId,
    tran?: DBTransaction,
  ): PromiseCancellable<any> {
    const taskIdEncoded = tasksUtils.encodeTaskId(taskId);
    // If the task promise is already running, return the existing promise
    // this is because the task promise has a singleton cleanup operation attached
    let taskPromise = this.taskPromises.get(taskIdEncoded);
    if (taskPromise != null) return taskPromise;
    const abortController = new AbortController();
    const p = new Promise((resolve, reject) => {
      const signalHandler = () => {
        // so if we are cancelling the task
        // we would indicate that we have cancelled the task
        // but to do this
        this.cancelTask(
          taskId,
          // new tasksErrors.ErrorTaskCancelled(undefined, {
          //   cause: abortController.signal.reason,
          // }),
          abortController.signal.reason
        );
      };
      const taskListener = (event: TaskEvent) => {
        abortController.signal.removeEventListener(
          'abort',
          signalHandler
        );
        if (event.detail.status === 'success') {
          resolve(event.detail.result);
        } else {
          reject(
            event.detail.reason
          );
        }
      };
      // Event listeners are registered synchronously
      abortController.signal.addEventListener('abort', signalHandler);
      this.taskEvents.addEventListener(taskIdEncoded, taskListener, {
        once: true,
      });
      // The task may not actually exist anymore
      // in which case, the task listener will never settle
      // Here we concurrently check if the task exists
      // if it doesn't, remove all listeners and reject early
      void (tran ?? this.db)
        .get<TaskData>([...this.tasksTaskDbPath, taskId.toBuffer()])
        .then(
          (taskData: TaskData | undefined) => {
            if (taskData == null) {
              this.taskEvents.removeEventListener(taskIdEncoded, taskListener);
              abortController.signal.removeEventListener('abort', signalHandler);
              reject(new tasksErrors.ErrorTaskMissing(taskIdEncoded));
            }
          },
          (reason) => {
            reject(reason);
          },
        );
    }).finally(() => {
      this.taskPromises.delete(taskIdEncoded);
    });
    taskPromise = PromiseCancellable.from(p, abortController);
    this.taskPromises.set(taskIdEncoded, taskPromise);
    return taskPromise;
  }

  @ready(new tasksErrors.ErrorTasksNotRunning())
  public async updateTask(
    taskId: TaskId,
    taskPatch: Partial<{
      handlerId: TaskHandlerId;
      parameters: TaskParameters;
      delay: number;
      deadline: number;
      priority: number;
      path: TaskPath;
    }>,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.updateTask(taskId, taskPatch, tran),
      );
    }
    // Copy the patch POJO to avoid parameter mutation
    const taskDataPatch = { ...taskPatch };
    if (taskDataPatch.delay != null) {
      taskDataPatch.delay = tasksUtils.toDelay(taskDataPatch.delay);
    }
    if (taskDataPatch.deadline != null) {
      taskDataPatch.deadline = tasksUtils.toDeadline(taskDataPatch.deadline);
    }
    if (taskDataPatch.priority != null) {
      taskDataPatch.priority = tasksUtils.toPriority(taskDataPatch.priority);
    }
    // Mutually exclude `this.queueTask` and `this.gcTask`
    await tran.lock([...this.tasksScheduledDbPath, taskId.toString()].join(''));
    const taskIdBuffer = taskId.toBuffer();
    const taskData = await tran.get<TaskData>([
      ...this.tasksTaskDbPath,
      taskIdBuffer,
    ]);
    if (taskData == null) {
      throw new tasksErrors.ErrorTaskMissing();
    }
    if (
      (await tran.get([
        ...this.tasksScheduledDbPath,
        utils.lexiPackBuffer(taskData.timestamp + taskData.delay),
        taskIdBuffer,
      ])) === undefined
    ) {
      // Cannot update the task if the task is already running
      throw new tasksErrors.ErrorTaskRunning();
    }
    const taskDataNew = {
      ...taskData,
      ...taskDataPatch,
    };
    // Save updated task
    await tran.put([...this.tasksTaskDbPath, taskIdBuffer], taskDataNew);
    // Update the path index
    if (taskDataPatch.path != null) {
      await tran.del([...this.tasksPathDbPath, ...taskData.path, taskIdBuffer]);
      await tran.put(
        [...this.tasksPathDbPath, ...taskDataPatch.path, taskIdBuffer],
        true,
      );
    }
    // Update the schedule time and trigger scheduling if delay is updated
    if (taskDataPatch.delay != null) {
      const taskScheduleTime = taskData.timestamp + taskData.delay;
      const taskScheduleTimeNew = taskData.timestamp + taskDataPatch.delay;
      await tran.del([...this.tasksScheduledDbPath, utils.lexiPackBuffer(taskScheduleTime), taskIdBuffer])
      await tran.put(
        [
          ...this.tasksScheduledDbPath,
          utils.lexiPackBuffer(taskScheduleTimeNew),
          taskIdBuffer,
        ],
        null,
      );
      tran.queueSuccess(async () => {
        if (this.schedulingLoop != null) {
          this.triggerScheduling(taskScheduleTimeNew);
        }
      });
    }
  }

  /**
   * Schedules a task
   * If `this.schedulingLoop` isn't running, then this will not
   * attempt to reset the `this.schedulingTimer`
   */
  @ready(new tasksErrors.ErrorTasksNotRunning())
  public async scheduleTask(
    {
      handlerId,
      parameters = [],
      delay = 0,
      deadline = Infinity,
      priority = 0,
      path = [],
      lazy = false,
    }: {
      handlerId: TaskHandlerId;
      parameters?: TaskParameters;
      delay?: number;
      deadline?: number;
      priority?: number;
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
    await tran.lock(this.tasksLastTaskIdPath.join(''));
    const taskId = this.generateTaskId();
    const taskIdEncoded = tasksUtils.encodeTaskId(taskId);
    this.logger.debug(
      `Scheduling Task ${taskIdEncoded} with handler \`${handlerId}\``,
    );
    const taskIdBuffer = taskId.toBuffer();
    // Timestamp extracted from `IdSortable` is a floating point in seconds
    // with subsecond fractionals, multiply it by 1000 gives us milliseconds
    const taskTimestamp = Math.trunc(extractTs(taskId) * 1000) as TaskTimestamp;
    const taskPriority = tasksUtils.toPriority(priority);
    const taskDelay = tasksUtils.toDelay(delay);
    const taskDeadline = tasksUtils.toDeadline(deadline);
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
      null,
    );
    // Putting the task into the path index
    await tran.put([...this.tasksPathDbPath, ...path, taskIdBuffer], null);
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
    const cancel = (reason: any) => {
      this.cancelTask(taskId, reason);
    };
    this.logger.debug(
      `Scheduled Task ${taskIdEncoded} with handler \`${handlerId}\``,
    );
    return {
      id: taskId,
      status: 'scheduled',
      promise,
      cancel,
      handlerId,
      parameters,
      delay: tasksUtils.fromDelay(taskDelay),
      deadline: tasksUtils.fromDeadline(taskDeadline),
      priority: tasksUtils.fromPriority(taskPriority),
      path,
      created: new Date(taskTimestamp),
      scheduled: new Date(taskScheduleTime),
    };
  }

  /**
   * Transition tasks from `scheduled` to `queued`
   */
  protected async startScheduling() {
    if (this.schedulingLoop != null) return;
    this.schedulerLogger.info('Starting Scheduling Loop');
    const abortController = new AbortController();
    const abortP = utils.signalPromise(abortController.signal);
    // First iteration must run
    if (this.schedulingLockReleaser != null) await this.schedulingLockReleaser();
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
        const now =
          Math.trunc(performance.timeOrigin + performance.now()) + 100;

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
    // First iteration must run
    if (this.queuingLockReleaser != null) await this.queuingLockReleaser();
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
          for await (const [kP] of tran.iterator(this.tasksQueuedDbPath, {
            values: false,
          })) {
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
    this.schedulingTimer = null;
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
      this.schedulingTimer = null;
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
        void this.schedulingLockReleaser();
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
          void this.schedulingLockReleaser();
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
      void this.queuingLockReleaser();
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
      // Mutually exclude `this.updateTask` and `this.gcTask`
      await tran.lock(
        [...this.tasksScheduledDbPath, taskId.toString()].join(''),
      );
      const taskIdBuffer = taskId.toBuffer();
      const taskData = (await tran.get<TaskData>([
        ...this.tasksTaskDbPath,
        taskIdBuffer,
      ]))!;
      // Remove task from the scheduled index
      await tran.del([
        ...this.tasksScheduledDbPath,
        utils.lexiPackBuffer(taskScheduleTime),
        taskIdBuffer,
      ]);
      // Put task into the queue index
      await tran.put(
        [
          ...this.tasksQueuedDbPath,
          utils.lexiPackBuffer(taskData.priority),
          utils.lexiPackBuffer(taskScheduleTime),
          taskIdBuffer,
        ],
        null,
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
  protected async startTask(taskId: TaskId): Promise<void> {
    const taskIdBuffer = taskId.toBuffer();
    const taskIdEncoded = tasksUtils.encodeTaskId(taskId);
    this.queueLogger.debug(`Starting Task ${taskIdEncoded}`);
    await this.db.withTransactionF(async (tran) => {

      // GENERAL LOCKING OF THE TASK, maybe only for safety
      await tran.lock([...this.tasksScheduledDbPath, taskId.toString()].join(''));

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
              reason: new tasksErrors.ErrorTaskHandlerMissing(),
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
        taskIdBuffer,
      ]);
      // Put task into the active index
      // this index will be used to retry tasks if they don't finish
      await tran.put([...this.tasksActiveDbPath, taskId.toBuffer()], null);
      tran.queueSuccess(() => {
        const abortController = new AbortController();
        const timeoutError = new tasksErrors.ErrorTaskTimedOut();
        const timer = new Timer<void>(
          () => void abortController.abort(timeoutError),
          tasksUtils.fromDeadline(taskData.deadline)
        );
        const ctx = {
          timer,
          signal: abortController.signal,
        };
        const activePromise = (async () => {
          try {
            let succeeded: boolean;
            let result: any;
            let reason: any;
            try {
              result = await taskHandler(ctx, ...taskData.parameters);
              succeeded = true;
            } catch (e) {
              reason = e;
              succeeded = false;
            }
            // GC the task before dispatching events
            try {
              await this.gcTask(taskId);
            } catch (e) {
              // If the `gcTask` failed, there's nothing we can do here
              // except to report the error
              // this should not happen
              this.queueLogger.error(
                `Failed Garbage Collecting Task ${taskIdEncoded} - ${String(
                  e,
                )}`,
              );
            }
            if (succeeded) {
              this.queueLogger.debug(`Succeeded Task ${taskIdEncoded}`);
              // If no event listeners, then only side effects are recorded
              this.taskEvents.dispatchEvent(
                new TaskEvent(taskIdEncoded, {
                  detail: {
                    status: 'success',
                    result,
                  },
                }),
              );
            } else {
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
            }
          } finally {
            // Task has finished, cancel the timer
            timer.cancel();
            // Remove from active promises
            this.activePromises.delete(taskIdEncoded);
            // Slot has opened up, trigger queueing
            this.triggerQueuing();
          }
        })();
        // This will be a lazy `PromiseCancellable`
        const activePromiseCancellable = PromiseCancellable.from(
          activePromise,
          abortController
        );
        this.activePromises.set(taskIdEncoded, activePromiseCancellable);
        this.queueLogger.debug(`Started Task ${taskIdEncoded}`);
      });
    });
  }

  /**
   * This is used to garbage collect tasks that have settled
   * Explicit removal of tasks can only be done through task cancellation
   */
  protected async gcTask(taskId: TaskId, tran?: DBTransaction): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.gcTask(taskId, tran));
    }
    // Mutually exclude `this.updateTask` and `this.queueTask`
    await tran.lock([...this.tasksScheduledDbPath, taskId.toString()].join(''));
    const taskData = await tran.get<TaskData>([
      ...this.tasksTaskDbPath,
      taskId.toBuffer(),
    ]);
    if (taskData == null) return;
    const taskIdEncoded = tasksUtils.encodeTaskId(taskId);
    const taskIdBuffer = taskId.toBuffer();
    this.queueLogger.debug(`Garbage Collecting Task ${taskIdEncoded}`);
    const taskScheduleTime = taskData.timestamp + taskData.delay;
    await tran.del([
      ...this.tasksPathDbPath,
      ...taskData.path,
      taskId.toBuffer(),
    ]);
    await tran.del([...this.tasksActiveDbPath, taskId.toBuffer()]);
    await tran.del([
      ...this.tasksQueuedDbPath,
      utils.lexiPackBuffer(taskData.priority),
      utils.lexiPackBuffer(taskScheduleTime),
      taskIdBuffer
    ]);
    await tran.del([
      ...this.tasksScheduledDbPath,
      utils.lexiPackBuffer(taskScheduleTime),
      taskIdBuffer
    ]);
    await tran.del([...this.tasksTaskDbPath, taskId.toBuffer()]);
    this.queueLogger.debug(`Garbage Collected Task ${taskIdEncoded}`);
  }


  protected async cancelTask(
    taskId: TaskId,
    cancelReason: any,
    tran?: DBTransaction
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.cancelTask(taskId, tran));
    }
    // Mutually exclude `this.updateTask`, `this.queueTask`, `this.gcTask`
    await tran.lock([...this.tasksScheduledDbPath, taskId.toString()].join(''));
    const taskIdBuffer = taskId.toBuffer();
    const taskData = await tran.get<TaskData>([
      ...this.tasksTaskDbPath,
      taskIdBuffer,
    ]);
    if (taskData == null) return;
    if (
      (await tran.get([
        ...this.tasksActiveDbPath,
        taskIdBuffer
      ])) !== undefined
    ) {
      const activePromise = this.activePromises.get(tasksUtils.encodeTaskId(taskId));
      if (activePromise != null) {
        activePromise.cancel(cancelReason);
      }
    } else {
      await this.gcTask(taskId, tran);
    }
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
      for await (const [kP] of tran.iterator(this.tasksActiveDbPath, {
        values: false,
      })) {
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
          null,
        );
        // Removing task from active index
        await tran.del([...this.tasksActiveDbPath, ...kP]);
        this.logger.warn(`Moving Task ${taskIdEncoded} from Active to Queued`);
      }
      this.logger.info('Finish Tasks Repair');
    });
  }
}

export default TaskManager;
