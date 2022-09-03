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
  TaskPriority,
  TaskId,
  TaskPath,
} from './types';
import type KeyManager from '../keys/KeyManager';
import {
  CreateDestroyStartStop,
  ready
} from "@matrixai/async-init/dist/CreateDestroyStartStop";
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { Lock } from '@matrixai/async-locks';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { extractTs } from '@matrixai/id/dist/IdSortable';
import lexi from 'lexicographic-integer';
import Timer from '../timer/Timer';
import * as tasksErrors from './errors';
import * as tasksUtils from './utils';
import * as utils from '../utils';
import * as debug from '../utils/debug';

@CreateDestroyStartStop(
  new tasksErrors.ErrorQueueRunning(),
  new tasksErrors.ErrorQueueDestroyed(),
)
class Tasks {
  public static async createTasks({
    db,
    keyManager,
    handlers = {},
    lazy = false,
    activeLimit = Infinity,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    handlers?: Record<TaskHandlerId, TaskHandler>;
    lazy?: boolean;
    activeLimit?: number;
    logger?: Logger;
    fresh?: boolean;
  }) {
    logger.info(`Creating ${this.name}`);
    const tasks = new this({
      db,
      keyManager,
      activeLimit,
      logger
    });
    await tasks.start({
      handlers,
      lazy,
      fresh
    });
    logger.info(`Created ${this.name}`);
    return tasks;
  }

  protected logger: Logger;
  protected db: DB;
  protected keyManager: KeyManager;
  protected activeLimit: number;
  protected handlers: Map<TaskHandlerId, TaskHandler> = new Map();
  protected generateTaskId: () => TaskId;
  protected tasksDbPath: LevelPath = [this.constructor.name];


  // you are pausing the loop a bit



  /**
   * Maintain last Task Id to preserve monotonicity across procee restarts
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
  protected tasksScheduledDbPath: LevelPath = [...this.tasksDbPath, 'scheduled'];

  /**
   * Queued Tasks
   * This is indexed by `TaskId` at the end to avoid conflicts
   * `Tasks/queued/{lexi(TaskPriority)}/{lexi(TaskTimestamp + TaskDelay)}/{TaskId} -> {raw(TaskId})}`
   */
  protected tasksQueuedDbPath: LevelPath = [...this.tasksDbPath, 'queued'];

  /**
   * Asynchronous scheduling loop
   * This transitions tasks from `scheduled` to `queued`
   * This is blocked by the `schedulingLock`
   */
  protected schedulingLoop: PromiseCancellable<void> | null = null;

  /**
   * Timer used to unblock the scheduling loop
   * This releases the `schedulingLock` if it is locked
   */
  protected schedulingTimer: Timer | null = null;

  /**
   * Lock controls whether to run an iteration of the scheduling loop
   */
  protected schedulingLock: Lock = new Lock();

  /**
   * Releases the lock
   * In the beginning the scheduling lock is not locked,
   * therefore this is initialised to be an async noop
   */
  protected schedulingLockReleaser: ResourceRelease = async () => {};

  // If the releaser is set
  // it's possible that the releaser function
  // is still pointing to the old lock
  // we want to wipe that, or at least
  // ensure that it cannot be used
  // need to see if this is a problem


  protected queuingLoop: Promise<void> | null = null;

  public constructor({
    db,
    keyManager,
    activeLimit,
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    activeLimit: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.activeLimit = activeLimit;
    this.keyManager = keyManager;
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
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      this.handlers.clear();
      await this.db.clear(this.tasksDbPath);
    }
    const lastTaskId = await this.getLastTaskId();
    this.generateTaskId = tasksUtils.createTaskIdGenerator(
      this.keyManager.getNodeId(),
      lastTaskId,
    );
    for (const taskHandlerId in handlers) {
      this.handlers.set(
        taskHandlerId as TaskHandlerId,
        handlers[taskHandlerId],
      );
    }
    // Even if it is not lazy
    // it just means we are not starting yet
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
  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['starting'])
  public async startProcessing(): Promise<void> {
    await Promise.all([
      this.startScheduling(),
      this.startQueueing(),
    ]);
  }

  /**
   * Stop the scheduling and queuing loop
   * This call is idempotent
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['stopping'])
  public async stopProcessing(): Promise<void> {
    await Promise.all([
      this.stopQueueing(),
      this.stopScheduling(),
    ]);
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
      handlerId: TaskHandlerId,
      parameters?: TaskParameters,
      delay?: TaskDelay,
      priority?: number,
      deadline?: TaskDeadline,
      path?: TaskPath,
      lazy?: boolean
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

    delay = Math.max(delay, 0);

    const taskId = this.generateTaskId();
    // Timestamp extracted from `IdSortable` is a floating point in seconds
    // with subsecond fractionals, multiply it by 1000 gives us milliseconds
    const taskTimestamp = Math.trunc(extractTs(taskId) * 1000) as TaskTimestamp;
    const taskPriority = tasksUtils.toPriority(priority);
    const taskIdBuffer = taskId.toBuffer();
    const taskScheduleTime = taskTimestamp + delay;

    // Change to this? Easier than holding a delay?

    // task.createTime
    // task.scheduledTime

    console.log('TASK CREATION TIME', new Date(taskTimestamp));
    console.log('TASK SCHEDULE TIME', new Date(taskScheduleTime));


    const taskData = {
      handlerId,
      parameters,
      timestamp: taskTimestamp,
      priority: taskPriority,
      delay,
      deadline,
      path,
    };
    // Saving the task
    await tran.put([...this.tasksTaskDbPath, taskIdBuffer], taskData);

    // Saving last task ID
    await tran.put(this.tasksLastTaskIdPath, taskIdBuffer, true);

    await tran.put(
      [
        ...this.tasksScheduledDbPath,
        utils.lexiPackBuffer(taskScheduleTime),
        taskIdBuffer, // attempt to not put the task id...
      ],
      taskIdBuffer,
      true
    );

    // Saving path index
    await tran.put(
      [...this.tasksPathDbPath, ...path, taskIdBuffer],
      taskIdBuffer,
      true,
    );

    if (!lazy) {
    } else {
    }

    // If the delay is 0, we can schedule the task immediately
    if (delay > 0) {
    } else {
      // go straight to queueing the task
    }

    // If the `schedulingTimer` is null, it means `Tasks` was started in lazy mode
    // the user must call `Tasks.startProcessing()`
    if (
      this.schedulingTimer != null &&
      (taskScheduleTime < this.schedulingTimer.scheduled!.getTime())
    ) {
      if (this.schedulingTimer != null) this.schedulingTimer.cancel();
      this.schedulingLockReleaser();
    }

    return {
      id: taskId,
      promise: new PromiseCancellable<void>((resolve, reject) => { resolve()}),
      ...taskData
    };
  }



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
    const taskData = await tran.get<TaskData>([
      ...this.tasksTaskDbPath,
      taskId.toBuffer(),
    ]);
    if (taskData == null) {
      return undefined;
    }


    return {
      id: taskId,
      promise: new PromiseCancellable<void>((resolve, reject) => { resolve()}),
      ...taskData,
    };
  }

  public async *getTaskDatas(
    path: TaskPath = [],
    order: 'asc' | 'desc' = 'asc',
    lazy: boolean = false,
    tran?: DBTransaction,
  ): AsyncGenerator<TaskData> {

  }


  // this is not a loop that is not set and shit
  // it's always set...
  // so `undefined` here means that it was never set
  // or `null` here means that it is explicitly something?

  /**
   * Transition tasks from `scheduled` to `queued`
   */
  protected async startScheduling() {
    if (this.schedulingLoop != null) {
      return;
    }
    const abortController = new AbortController();

    console.log('STARTING LOOP');

    const schedulingLoop = (async () => {
      while (!abortController.signal.aborted) {

        // Blocks the scheduling loop until lock is released
        // this ensures that each iteration of the loop is only
        // run when it is required
        await this.schedulingLock.waitForUnlock();

        console.count('Scheduling Loop Iteration');

        // Lock up the scheduling lock
        // only the `schedulingTimer` or the `scheduleTask` method can unlock
        [this.schedulingLockReleaser] = await this.schedulingLock.lock()();

        // Peek ahead by 100 ms
        // this is because the subsequent operations of this iteration may take up to 100ms
        // and we might as well prefetch some tasks to be executed
        const now = Math.trunc(performance.timeOrigin + performance.now()) + 100;

        await this.db.withTransactionF(async (tran) => {
          // Queue up all the tasks that are scheduled to be executed before `now`
          for await (const [kP] of tran.iterator(
            this.tasksScheduledDbPath,
            {
              // Upper bound of `{lexi(TaskTimestamp + TaskDelay)}/{TaskId}`
              // notice the usage of `''` as the upper bound of `TaskId`
              lte: [ utils.lexiPackBuffer(now), '' ],
              values: false
            }
          )) {
            // Break out of the dispatch loop if aborted
            if(abortController.signal.aborted) break;
            const taskIdBuffer = kP[1] as Buffer;
            const taskData = (await tran.get<TaskData>([
              ...this.tasksTaskDbPath,
              taskIdBuffer
            ]))!;
            // Put task into the queue index
            await tran.put(
              [
                ...this.tasksQueuedDbPath,
                utils.lexiPackBuffer(taskData.priority),
                ...kP
              ],
              taskIdBuffer,
              true
            );
            // Remove task from the scheduled index
            await tran.del([...this.tasksScheduledDbPath, ...kP]);
          }

          // Get the next task to be scheduled and set the timer accordingly
          let nextScheduleTime: number | undefined;
          for await (const [kP] of tran.iterator(
            this.tasksScheduledDbPath,
            { limit: 1, values: false }
          )) {
            nextScheduleTime = utils.lexiUnpackBuffer(kP[0] as Buffer);
          }

          if(abortController.signal.aborted) return;

          // If there is no task, no timer will be set
          if (nextScheduleTime != null) {
            this.logger.debug(
              `Scheduling loop next step at ${new Date(nextScheduleTime).toISOString()}`
            );
            const now = Math.trunc(performance.timeOrigin + performance.now());
            const delay = Math.max(nextScheduleTime - now, 0);
            this.schedulingTimer = new Timer(
              () => {
                this.schedulingLockReleaser();
              },
              delay
            );
          }
        });

        console.log('DUMP AFTER ONE STEP of SCHEDULING LOOP'),
        console.dir(
          debug.inspectBufferStructure(await this.db.dump([], true))
        );

      }
    })();

    this.schedulingLoop = PromiseCancellable.from(
      schedulingLoop,
      abortController
    );
  }

  protected async startQueueing() {
    /**
     * Transition tasks from `queued` to `scheduled`
     */
    this.queuingLoop = (async () => {
    })();
  }

  protected async stopScheduling (): Promise<void> {
    // HOW to stop the scheduling loop?
    // make it a promise cancellable and BREAK out of the loop
    // it's not an async function then
    // the loop may not be running
    // but the timer may retrigger it

    this.schedulingTimer?.cancel();
    this.schedulingLoop?.cancel();
    await this.schedulingLoop;
  }

  protected async stopQueueing() {

  }

  // queueing a task does nto involve this
  protected async queueTask() {

    // if htis cna be done
    // scheduleTask is the entrypoint
    // this would be a protected function
    // you just set the delay to some poitn in theime

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
}

export default Tasks;
