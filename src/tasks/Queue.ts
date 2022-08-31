import type { DB, LevelPath } from '@matrixai/db';
import type { TaskIdString } from './types';
import { DBTransaction } from '@matrixai/db';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import { RWLockReader } from '@matrixai/async-locks';
import * as tasksErrors from './errors';
import { TaskId } from './types';
import { Plug } from '../utils/index';

type TaskHandler = (taskId: TaskId) => Promise<any>;

interface Queue extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new tasksErrors.ErrorQueueRunning(),
  new tasksErrors.ErrorQueueDestroyed(),
)
class Queue {
  public static async createQueue({
    db,
    taskHandler,
    // Delay = false,
    concurrencyLimit = Number.POSITIVE_INFINITY,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    taskHandler: TaskHandler;
    // Delay?: boolean;
    concurrencyLimit?: number;
    logger?: Logger;
    fresh?: boolean;
  }) {
    logger.info(`Creating ${this.name}`);
    const queue = new this({ db, concurrencyLimit, logger });
    await queue.start({ taskHandler, fresh });
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
  protected queueDbTimestampPath: LevelPath = [
    ...this.queueDbPath,
    'timestamp',
  ];
  protected queueDbMetadataPath: LevelPath = [...this.queueDbPath, 'metadata'];
  protected queueDbActivePath: LevelPath = [...this.queueDbPath, 'active'];
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

  /**
   * Handler for tasks
   */
  protected taskHandler: TaskHandler;

  public constructor({
    db,
    concurrencyLimit,
    logger,
  }: {
    db: DB;
    concurrencyLimit: number;
    logger: Logger;
  }) {
    this.logger = logger;
    this.concurrencyLimit = concurrencyLimit;
    this.db = db;
  }

  public async start({
    taskHandler,
    // Delay = false,
    fresh = false,
  }: {
    taskHandler: TaskHandler;
    // Delay?: boolean;
    fresh?: boolean;
  }): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.queueDbPath);
    }
    this.taskHandler = taskHandler;
    // If (!delay) await this.startTasks();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.stopTasks();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
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
    let task;
    for await (const [, task_] of this.db.iterator(this.queueDbTimestampPath, {
      limit: 1,
    })) {
      task = task_;
    }
    if (task != null) {
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
      const prom = this.taskHandler(nextTaskId);
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
  public async allConcurrentSettled() {
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
