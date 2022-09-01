import type { DB, LevelPath, KeyPath } from '@matrixai/db';
import type {
  TaskIdString,
  TaskData,
  TaskHandlerId,
  TaskHandler,
  TaskTimestamp,
  TaskParameters,
} from './types';
import type KeyManager from '../keys/KeyManager';
import EventEmitter from 'events';
import { DBTransaction } from '@matrixai/db';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import { RWLockReader } from '@matrixai/async-locks';
import { extractTs } from '@matrixai/id/dist/IdSortable';
import * as tasksErrors from './errors';
import { TaskId, TaskGroup } from './types';
import * as tasksUtils from './utils';
import Task from './Task';
import { Plug } from '../utils/index';

interface Queue extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new tasksErrors.ErrorQueueRunning(),
  new tasksErrors.ErrorQueueDestroyed(),
)
class Queue {
  public static async createQueue({
    db,
    keyManager,
    handlers = {},
    delay = false,
    concurrencyLimit = Number.POSITIVE_INFINITY,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    handlers?: Record<TaskHandlerId, TaskHandler>;
    delay?: boolean;
    concurrencyLimit?: number;
    logger?: Logger;
    fresh?: boolean;
  }) {
    logger.info(`Creating ${this.name}`);
    const queue = new this({ db, keyManager, concurrencyLimit, logger });
    await queue.start({ handlers, delay, fresh });
    logger.info(`Created ${this.name}`);
    return queue;
  }

  // Concurrency variables
  public concurrencyLimit: number;
  protected concurrencyCount: number = 0;
  protected concurrencyPlug: Plug = new Plug();
  protected activeTasksPlug: Plug = new Plug();

  protected logger: Logger;
  protected db: DB;
  protected queueDbPath: LevelPath = [this.constructor.name];
  /**
   * Tasks collection
   * `tasks/{TaskId} -> {json(Task)}`
   */
  public readonly queueTasksDbPath: LevelPath = [...this.queueDbPath, 'tasks'];
  public readonly queueStartTimeDbPath: LevelPath = [
    ...this.queueDbPath,
    'startTime',
  ];
  /**
   * This is used to track pending tasks in order of start time
   */
  protected queueDbTimestampPath: LevelPath = [
    ...this.queueDbPath,
    'timestamp',
  ];
  // FIXME: remove this path, data is part of the task data record
  protected queueDbMetadataPath: LevelPath = [...this.queueDbPath, 'metadata'];
  /**
   * Tracks actively running tasks
   */
  protected queueDbActivePath: LevelPath = [...this.queueDbPath, 'active'];
  /**
   * Tasks by groups
   * `groups/...taskGroup: Array<string> -> {raw(TaskId)}`
   */
  public readonly queueGroupsDbPath: LevelPath = [
    ...this.queueDbPath,
    'groups',
  ];
  /**
   * Last Task Id
   */
  public readonly queueLastTaskIdPath: KeyPath = [
    ...this.queueDbPath,
    'lastTaskId',
  ];

  // When the queue to execute the tasks
  // the task id is generated outside
  // you don't get a task id here
  // you just "push" tasks there to be executed
  // this is the "shared" set of promises to be maintained
  protected promises: Map<TaskIdString, Promise<any>> = new Map();
  // /**
  //  * Listeners for task execution
  //  * When a task is executed, these listeners are synchronously executed
  //  * The listeners are intended for resolving or rejecting task promises
  //  */
  // protected listeners: Map<TaskIdString, Array<TaskListener>> = new Map();

  // variables to consuming tasks
  protected activeTaskLoop: Promise<void> | null = null;
  protected taskLoopPlug: Plug = new Plug();
  protected taskLoopEnding: boolean;
  // FIXME: might not be needed
  protected cleanUpLock: RWLockReader = new RWLockReader();

  protected handlers: Map<TaskHandlerId, TaskHandler> = new Map();
  protected taskPromises: Map<TaskIdString, Promise<any>> = new Map();
  protected taskEvents: EventEmitter = new EventEmitter();
  protected keyManager: KeyManager;
  protected generateTaskId: () => TaskId;

  public constructor({
    db,
    keyManager,
    concurrencyLimit,
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    concurrencyLimit: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.concurrencyLimit = concurrencyLimit;
    this.db = db;
    this.keyManager = keyManager;
  }

  public async start({
    handlers = {},
    delay = false,
    fresh = false,
  }: {
    handlers?: Record<TaskHandlerId, TaskHandler>;
    delay?: boolean;
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      this.handlers.clear();
      await this.db.clear(this.queueDbPath);
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
    if (!delay) await this.startTasks();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.stopTasks();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    this.handlers.clear();
    await this.db.clear(this.queueDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  // Promises are "connected" to events
  //
  // when tasks are "dispatched" to the queue
  // they are actually put into a persistent system
  // then we proceed to execution
  //
  // a task here is a function
  // this is already managed by the Scheduler
  // along with the actual function itself?
  // we also have a priority
  //
  // t is a task
  // but it's actually just a function
  // and in this case
  // note that we are "passing" in the parameters at this point
  // but it is any function
  // () => taskHandler(parameters)
  //
  // it returns a "task"
  // that should be used like a "lazy" promise
  // the actual task function depends on the situation
  // don't we need to know actual metadata
  // wait a MINUTE
  // if we are "persisting" it
  // do we persist it here?

  /**
   * Pushes tasks into the persistent database
   */
  @ready(new tasksErrors.ErrorQueueNotRunning())
  public async pushTask(
    taskId: TaskId,
    taskTimestampKey: Buffer,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.pushTask(taskId, taskTimestampKey, tran),
      );
    }

    this.logger.info('adding task');
    await tran.lock([
      [...this.queueDbTimestampPath, 'loopSerialisation'].join(''),
      'read',
    ]);
    await tran.put(
      [...this.queueStartTimeDbPath, taskId.toBuffer()],
      taskTimestampKey,
      true,
    );
    await tran.put(
      [...this.queueDbTimestampPath, taskTimestampKey],
      taskId.toBuffer(),
      true,
    );
    await tran.put(
      [...this.queueDbMetadataPath, taskId.toBuffer()],
      taskTimestampKey,
      true,
    );
    tran.queueSuccess(async () => await this.taskLoopPlug.unplug());
  }

  /**
   * Removes a task from the persistent database
   */
  // @ready(new tasksErrors.ErrorQueueNotRunning(), false, ['stopping', 'starting'])
  public async removeTask(taskId: TaskId, tran?: DBTransaction) {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.removeTask(taskId, tran));
    }

    this.logger.info('removing task');
    await tran.lock([
      [...this.queueDbTimestampPath, 'loopSerialisation'].join(''),
      'read',
    ]);
    const timestampBuffer = await tran.get(
      [...this.queueDbMetadataPath, taskId.toBuffer()],
      true,
    );
    // Noop
    if (timestampBuffer == null) return;
    // Removing records
    await tran.del([...this.queueDbTimestampPath, timestampBuffer]);
    await tran.del([...this.queueDbMetadataPath, taskId.toBuffer()]);
    await tran.del([...this.queueDbActivePath, taskId.toBuffer()]);
  }

  /**
   * This will get the next task based on priority
   */
  protected async getNextTask(
    tran?: DBTransaction,
  ): Promise<TaskId | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getNextTask(tran));
    }

    await tran.lock([
      [...this.queueDbTimestampPath, 'loopSerialisation'].join(''),
      'write',
    ]);
    // Read out the database until we read a task not already executing
    let taskId: TaskId | undefined;
    for await (const [, taskIdBuffer] of tran.iterator(
      this.queueDbTimestampPath,
    )) {
      taskId = IdInternal.fromBuffer<TaskId>(taskIdBuffer);
      const exists = await tran.get(
        [...this.queueDbActivePath, taskId.toBuffer()],
        true,
      );
      // Looking for an inactive task
      if (exists == null) break;
      taskId = undefined;
    }
    if (taskId == null) return;
    await tran.put(
      [...this.queueDbActivePath, taskId.toBuffer()],
      Buffer.alloc(0, 0),
      true,
    );
    return taskId;
  }

  @ready(new tasksErrors.ErrorQueueNotRunning(), false, ['starting'])
  public async startTasks() {
    // Nop if running
    if (this.activeTaskLoop != null) return;

    this.activeTaskLoop = this.initTaskLoop();
    // Unplug if tasks exist to be consumed
    for await (const _ of this.db.iterator(this.queueDbTimestampPath, {
      limit: 1,
    })) {
      // Unplug if tasks exist
      await this.taskLoopPlug.unplug();
    }
  }

  @ready(new tasksErrors.ErrorQueueNotRunning(), false, ['stopping'])
  public async stopTasks() {
    this.taskLoopEnding = true;
    await this.taskLoopPlug.unplug();
    await this.concurrencyPlug.unplug();
    await this.activeTaskLoop;
    this.activeTaskLoop = null;
    // FIXME: likely not needed, remove
    await this.cleanUpLock.waitForUnlock();
  }

  protected async initTaskLoop() {
    this.logger.info('initializing task loop');
    this.taskLoopEnding = false;
    await this.taskLoopPlug.plug();
    const pace = async () => {
      if (this.taskLoopEnding) return false;
      await this.taskLoopPlug.waitForUnplug();
      await this.concurrencyPlug.waitForUnplug();
      return !this.taskLoopEnding;
    };
    while (await pace()) {
      // Check for task
      const nextTaskId = await this.getNextTask();
      if (nextTaskId == null) {
        this.logger.info('no task found, waiting');
        await this.taskLoopPlug.plug();
        continue;
      }

      // Do the task with concurrency here.
      // We need to call whatever dispatches tasks here
      //  and hook lifecycle to the promise.
      // call scheduler. handleTask?
      const taskIdString = nextTaskId.toMultibase('base32hex') as TaskIdString;
      await this.concurrencyIncrement();
      const prom = this.handleTask(nextTaskId);
      // Hook lifecycle
      this.promises.set(taskIdString, prom);
      this.logger.info(`started task ${taskIdString}`);

      const [cleanupRelease] = await this.cleanUpLock.read()();
      const onFinally = async () => {
        this.promises.delete(taskIdString);
        await this.concurrencyDecrement();
        await cleanupRelease();
      };

      void prom.then(
        async () => {
          await this.removeTask(nextTaskId);
          // TODO: emit an event for completed task
          await onFinally();
        },
        async () => {
          // FIXME: should only remove failed tasks but not cancelled
          await this.removeTask(nextTaskId);
          // TODO: emit an event for a failed or cancelled task
          await onFinally();
        },
      );
    }
    await this.activeTasksPlug.waitForUnplug();
    this.logger.info('dispatching ending');
  }

  // Concurrency limiting methods
  /**
   * Awaits an open slot in the concurrency.
   * Must be paired with `concurrencyDecrement` when operation is done.
   */

  /**
   * Increment and concurrencyPlug if full
   */
  protected async concurrencyIncrement() {
    if (this.concurrencyCount < this.concurrencyLimit) {
      this.concurrencyCount += 1;
      await this.activeTasksPlug.plug();
      if (this.concurrencyCount >= this.concurrencyLimit) {
        await this.concurrencyPlug.plug();
      }
    }
  }

  /**
   * Decrement and unplugs, resolves concurrencyActivePromise if empty
   */
  protected async concurrencyDecrement() {
    this.concurrencyCount -= 1;
    if (this.concurrencyCount < this.concurrencyLimit) {
      await this.concurrencyPlug.unplug();
    }
    if (this.concurrencyCount === 0) {
      await this.activeTasksPlug.unplug();
    }
  }

  /**
   * Will resolve when the concurrency counter reaches 0
   */
  public async allActiveTasksSettled() {
    await this.activeTasksPlug.waitForUnplug();
  }

  /**
   * IF a handler does not exist
   * if the task is executed
   * then an exception is thrown
   * if listener exists, the exception is passed into this listener function
   * if it doesn't exist, then it's just a reference exception in general, this can be logged
   * There's nothing else to do
   */
  // @ready(new tasksErrors.ErrorSchedulerNotRunning())
  // protected registerListener(
  //   taskId: TaskId,
  //   taskListener: TaskListener
  // ): void {
  //   const taskIdString = taskId.toString() as TaskIdString;
  //   const taskListeners = this.listeners.get(taskIdString);
  //   if (taskListeners != null) {
  //     taskListeners.push(taskListener);
  //   } else {
  //     this.listeners.set(taskIdString, [taskListener]);
  //   }
  // }

  // @ready(new tasksErrors.ErrorSchedulerNotRunning())
  // protected deregisterListener(
  //   taskId: TaskId,
  //   taskListener: TaskListener
  // ): void {
  //   const taskIdString = taskId.toString() as TaskIdString;
  //   const taskListeners = this.listeners.get(taskIdString);
  //   if (taskListeners == null || taskListeners.length < 1) return;
  //   const index = taskListeners.indexOf(taskListener);
  //   if (index !== -1) {
  //     taskListeners.splice(index, 1);
  //   }
  // }

  protected async handleTask(taskId: TaskId) {
    // Get the task information and use the relevant handler
    // throw and error if the task does not exist
    // throw an error if the handler does not exist.

    return await this.db.withTransactionF(async (tran) => {
      // Getting task information
      const taskData = await tran.get<TaskData>([
        ...this.queueTasksDbPath,
        taskId.toBuffer(),
      ]);
      if (taskData == null) throw Error('TEMP task not found');
      // Getting handler
      const handler = this.getHandler(taskData.handlerId);
      if (handler == null) throw Error('TEMP handler not found');

      const prom = handler(...taskData.parameters);

      // Add the promise to the map and hook any lifecycle stuff
      const taskIdString = taskId.toMultibase('base32hex') as TaskIdString;
      this.promises.set(taskIdString, prom);
      return prom
        .finally(async () => {
          this.promises.delete(taskIdString);

          // Cleaning up is a separate transaction
          await this.db.withTransactionF(async (tran) => {
            const taskTimestampKeybuffer = await tran.get(
              [...this.queueStartTimeDbPath, taskId.toBuffer()],
              true,
            );
            await tran.del([...this.queueTasksDbPath, taskId.toBuffer()]);
            await tran.del([...this.queueStartTimeDbPath, taskId.toBuffer()]);
            if (taskData.taskGroup != null) {
              await tran.del([
                ...this.queueGroupsDbPath,
                ...taskData.taskGroup,
                taskTimestampKeybuffer!,
              ]);
            }
          });
        })
        .then(
          (value) => {
            this.taskEvents.emit(taskIdString, value);
            return value;
          },
          (reason) => {
            this.taskEvents.emit(taskIdString, reason);
            throw reason;
          },
        );
    });
  }

  public getHandler(handlerId: TaskHandlerId): TaskHandler | undefined {
    return this.handlers.get(handlerId);
  }

  public getHandlers(): Record<TaskHandlerId, TaskHandler> {
    return Object.fromEntries(this.handlers);
  }

  /**
   * Registers a handler for tasks with the same `TaskHandlerId`
   * If tasks are dispatched without their respective handler,
   * the scheduler will throw `tasksErrors.ErrorSchedulerHandlerMissing`
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
  public getTaskP(taskId: TaskId, tran?: DBTransaction): Promise<any> {
    const taskIdString = taskId.toMultibase('base32hex') as TaskIdString;
    // This will return a task promise if it already exists
    const existingTaskPromise = this.taskPromises.get(taskIdString);
    if (existingTaskPromise != null) return existingTaskPromise;

    // If the task exist then it will create the task promise and return that
    const newTaskPromise = new Promise((resolve, reject) => {
      const resultListener = (result) => {
        if (result instanceof Error) reject(result);
        else resolve(result);
      };
      this.taskEvents.once(taskIdString, resultListener);
      // If not task promise exists then with will check if the task exists
      void (tran ?? this.db)
        .get([...this.queueTasksDbPath, taskId.toBuffer()], true)
        .then(
          (taskData) => {
            if (taskData == null) {
              this.taskEvents.removeListener(taskIdString, resultListener);
              reject(Error('TEMP task not found'));
            }
          },
          (reason) => reject(reason),
        );
    }).finally(() => {
      this.taskPromises.delete(taskIdString);
    });
    this.taskPromises.set(taskIdString, newTaskPromise);
    return newTaskPromise;
  }

  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public async *getGroupTasks(
    taskGroup: TaskGroup,
    tran?: DBTransaction,
  ): AsyncGenerator<TaskId> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) =>
        this.getGroupTasks(taskGroup, tran),
      );
    }

    for await (const [, taskIdBuffer] of tran.iterator([
      ...this.queueGroupsDbPath,
      ...taskGroup,
    ])) {
      yield IdInternal.fromBuffer<TaskId>(taskIdBuffer);
    }
  }

  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['starting'])
  public async getLastTaskId(
    tran?: DBTransaction,
  ): Promise<TaskId | undefined> {
    const lastTaskIdBuffer = await (tran ?? this.db).get(
      this.queueLastTaskIdPath,
      true,
    );
    if (lastTaskIdBuffer == null) return;
    return IdInternal.fromBuffer<TaskId>(lastTaskIdBuffer);
  }

  public async createTask(
    handlerId: TaskHandlerId,
    parameters: TaskParameters = [],
    priority: number = 0,
    taskGroup?: TaskGroup,
    lazy: boolean = false,
    tran?: DBTransaction,
  ): Promise<Task<any>> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.createTask(handlerId, parameters, priority, taskGroup, lazy, tran),
      );
    }

    // This does a combination of things
    //  1. create save the new task within the DB
    //  2. if timer exist and new delay is longer then just return the task
    //  3. else cancel the timer and create a new one with the delay
    const taskId = this.generateTaskId();
    // Timestamp extracted from `IdSortable` is a floating point in seconds
    // with subsecond fractionals, multiply it by 1000 gives us milliseconds
    const taskTimestamp = Math.trunc(extractTs(taskId) * 1000) as TaskTimestamp;
    const taskPriority = tasksUtils.toPriority(priority);
    const taskData: TaskData = {
      handlerId,
      parameters,
      timestamp: taskTimestamp,
      taskGroup,
      priority: taskPriority,
    };
    const taskIdBuffer = taskId.toBuffer();
    // Save the task
    await tran.put([...this.queueTasksDbPath, taskIdBuffer], taskData);
    // Save the last task ID
    await tran.put(this.queueLastTaskIdPath, taskIdBuffer, true);

    // Adding to group
    if (taskGroup != null) {
      await tran.put(
        [...this.queueGroupsDbPath, ...taskGroup, taskIdBuffer],
        taskIdBuffer,
        true,
      );
    }
    let taskPromise: Promise<any> | null = null;
    if (!lazy) {
      taskPromise = this.getTaskP(taskId, tran);
    }
    return new Task(
      this,
      taskId,
      handlerId,
      parameters,
      taskTimestamp,
      // Delay,
      taskGroup,
      taskPriority,
      taskPromise,
    );
  }
}

export default Queue;

// Epic queue
// need to do a couple things:
// 1. integrate fast-check
// 2. integrate span checks
// 3. might also consider span logs?
// 4. open tracing observability
// 5. structured logging
// 6. async hooks to get traced promises to understand the situation
// 7. do we also get fantasy land promises? and async cancellable stuff?
// 8. task abstractions?
// need to use the db for this
// 9. priority structure
// 10. timers
// abort controller

// kinetic data structure
// the priority grows as a function of time
// order by priority <- this thing has a static value
// in a key value DB, you can maintain sorted index of values
// IDs can be lexicographically sortable

// this is a persistent queue
// of tasks that should be EXECUTED right now
// the scheduler is a persistent scheduler of scheduled tasks
// tasks get pushed from the scheduler into the queue
// the queue connects to the WorkerManager
