import type { DB, DBTransaction, LevelPath } from '@matrixai/db';
import type { TaskId, TaskIdString, TaskPriority } from './types';
import type { PromiseDeconstructed } from '../types';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as tasksUtils from './utils';
import * as tasksErrors from './errors';

interface Queue extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new tasksErrors.ErrorQueueRunning(),
  new tasksErrors.ErrorQueueDestroyed(),
)
class Queue {
  public static async createQueue({
    db,
    concurrencyLimit = Number.POSITIVE_INFINITY,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    concurrencyLimit?: number;
    logger?: Logger;
    fresh?: boolean;
  }) {
    logger.info(`Creating ${this.name}`);
    const queue = new this({ db, concurrencyLimit, logger });
    await queue.start({ fresh });
    logger.info(`Created ${this.name}`);
    return queue;
  }

  public concurrencyLimit: number;

  protected logger: Logger;
  protected db: DB;
  protected queueDbPath: LevelPath = [this.constructor.name];
  // When the queue to execute the tasks
  // the task id is generated outside
  // you don't get a task id here
  // you just "push" tasks there to be executed
  // this is the "shared" set of promises to be maintained
  protected promises: Map<TaskIdString, PromiseDeconstructed<any>> = new Map();
  // /**
  //  * Listeners for task execution
  //  * When a task is executed, these listeners are synchronously executed
  //  * The listeners are intended for resolving or rejecting task promises
  //  */
  // protected listeners: Map<TaskIdString, Array<TaskListener>> = new Map();

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
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.queueDbPath);
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.queueDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  // Promises are "connected" to events

  // when tasks are "dispatched" to the queue
  // they are actually put into a persistent system
  // then we proceed to execution

  // a task here is a function
  // this is already managed by the Scheduler
  // along with the actual function itself?
  // we also have a priority

  // t is a task
  // but it's actually just a function
  // and in this case
  // note that we are "passing" in the parameters at this point
  // but it is any function
  // () => taskHandler(parameters)

  // it returns a "task"
  // that should be used like a "lazy" promise
  // the actual task function depends on the situation
  // don't we need to know actual metadata
  // wait a MINUTE
  // if we are "persisting" it
  // do we persist it here?

  // public async pushTask(taskF: TaskFunction, priority: TaskPriority) {
  //   // This needs to proceed to push it into an in-memory queue
  //   // and maintain a concurrency limit?
  //   // my issue is that whatever does the persistence
  //   // will need to execute it with the parmaeters and the task handler
  //   // so by the time it is in memory as a `taskF`
  //   // then no persistence makes sense anymore
  // }

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
