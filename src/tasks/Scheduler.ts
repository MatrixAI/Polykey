import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';
import type {
  TaskId,
  TaskHandlerId,
  TaskHandler,
  TaskData,
  TaskInfo,
  TaskIdString,
  TaskParameters,
  TaskDelay,
  TaskTimestamp
} from './types';
import type KeyManager from '../keys/KeyManager';
import type { PolykeyWorkerManagerInterface } from '../workers/types';
import type { POJO, Callback, PromiseDeconstructed } from '../types';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { extractTs } from '@matrixai/id/dist/IdSortable';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import lexi from 'lexicographic-integer';
import Queue from './Queue';
import * as tasksUtils from './utils';
import * as tasksErrors from './errors';
import * as utils from '../utils';

interface Scheduler extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new tasksErrors.ErrorSchedulerRunning(),
  new tasksErrors.ErrorSchedulerDestroyed(),
)
class Scheduler {
  /**
   * Create the scheduler, which will create its own Queue
   * This will automatically start the scheduler
   * If the scheduler needs to be started after the fact
   * Make sure to construct it, and then call `start` manually
   */
  public static async createScheduler({
    db,
    keyManager,
    queue,
    logger = new Logger(this.name),
    handlers = {},
    delay = false,
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    queue?: Queue;
    logger?: Logger;
    handlers?: Record<TaskHandlerId, TaskHandler>;
    delay?: boolean;
    fresh?: boolean;
  }): Promise<Scheduler> {
    logger.info(`Creating ${this.name}`);
    queue = queue ?? await Queue.createQueue({
      db,
      logger: logger.getChild(Queue.name),
      fresh
    });
    const scheduler = new this({ db, keyManager, queue, logger });
    await scheduler.start({ handlers, delay, fresh });
    logger.info(`Created ${this.name}`);
    return scheduler;
  }

  protected logger: Logger;
  protected db: DB;
  protected keyManager: KeyManager;
  protected queue: Queue;
  protected handlers: Map<TaskHandlerId, TaskHandler> = new Map();
  protected generateTaskId: () => TaskId;

  // TODO: swap this out for the timer system later

  protected processingTimer?: ReturnType<typeof setTimeout>;
  protected processingTimerTimestamp?: number;

  protected schedulerDbPath: LevelPath = [this.constructor.name];

  /**
   * Last Task Id
   */
  protected schedulerLastTaskIdPath: KeyPath = [...this.schedulerDbPath, 'lastTaskId'];

  /**
   * Tasks collection
   * `tasks/{TaskId} -> {json(Task)}`
   */
  protected schedulerTasksDbPath: LevelPath = [...this.schedulerDbPath, 'tasks'];

  /**
   * Tasks scheduled by time
   * `time/{lexi(TaskTimestamp + TaskDelay)} -> {raw(TaskId)}`
   */
  protected schedulerTimeDbPath: LevelPath = [...this.schedulerDbPath, 'time'];

  /**
   * Tasks queued for execution
   * `pending/{lexi(TaskPriority)}/{lexi(TaskTimestamp + TaskDelay)} -> {raw(TaskId)}`
   */
  protected schedulerPendingDbPath: LevelPath = [...this.schedulerDbPath, 'pending'];

  /**
   * Task handlers
   * `handlers/{TaskHandlerId}/{TaskId} -> {raw(TaskId)}`
   */
  protected schedulerHandlersDbPath: LevelPath = [...this.schedulerDbPath, 'handlers'];

  public constructor({
    db,
    keyManager,
    queue,
    logger
  }: {
    db: DB;
    keyManager: KeyManager;
    queue: Queue;
    logger: Logger
  }) {
    this.logger = logger;
    this.db = db;
    this.keyManager = keyManager;
    this.queue = queue;
  }

  public get isProcessing(): boolean {
    return this.processingTimer != null;
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
      // this.promises.clear();
      await this.db.clear(this.schedulerDbPath);
    }
    for (const taskHandlerId in handlers) {
      this.handlers.set(taskHandlerId as TaskHandlerId, handlers[taskHandlerId]);
    }
    const lastTaskId = await this.getLastTaskId();
    this.generateTaskId = tasksUtils.createTaskIdGenerator(
      this.keyManager.getNodeId(),
      lastTaskId,
    );
    // Flip this to true to delay the processing start
    // if task handler registration is done after the scheduler is created
    if (!delay) {
      await this.startProcessing();
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  /**
   * Stop the scheduler
   * This does not clear the handlers nor promises
   * This maintains any registered handlers and awaiting promises
   */
  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await this.stopProcessing();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  /**
   * Destroys the scheduler
   * This must first clear all handlers
   * Then it needs to cancel all promises
   * Finally destroys all underlying state
   */
  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    this.handlers.clear();

    // TODO: cancel the task promises so that any function awaiting may receive a cancellation
    // this.promises.clear();

    await this.db.clear(this.schedulerDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Starts the processing of the work
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public async startProcessing(timeout?: number): Promise<void> {
    // If already started, do nothing
    if (this.processingTimer != null) return;

    // We actually need to find ht elast task

    await this.db.withTransactionF(
      async (tran) => {
        // we use the transaction here
        // and we use it run our tasks
        // every "execution" involves running it here
        return;
      }
    );

    // when we "pop" a task
    // it is actually to peek at the latest task
    // then to set a timeout
    // the process is that we find tasks that are worth executing right now
    // then we dispatch to execution


    this.processingTimer = setTimeout(() => {

    }, 1000);
  }

  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public async stopProcessing(): Promise<void> {
    clearTimeout(this.processingTimer);
    delete this.processingTimer;
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

  /**
   * Gets a scheduled task data
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public async getTaskData(
    taskId: TaskId,
    tran?: DBTransaction
  ): Promise<TaskData | undefined> {
    return await (tran ?? this.db).get<TaskData>(
      [...this.schedulerTasksDbPath, taskId.toBuffer()]
    );
  }

  /**
   * Gets all scheduled task datas
   * Tasks are sorted by the `TaskId`
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public async *getTaskDatas(
    order: 'asc' | 'desc' = 'asc',
    tran?: DBTransaction
  ): AsyncGenerator<[TaskId, TaskData]> {
    if (tran == null) {
      return yield* this.db.withTransactionG(
        (tran) => this.getTaskDatas(...arguments, tran)
      );
    }
    for await (const [keyPath, taskData] of tran.iterator<TaskData>(
      this.schedulerTasksDbPath,
      { valueAsBuffer: false, reverse: order !== 'asc' }
    )) {
      const taskId = IdInternal.fromBuffer<TaskId>(keyPath[0] as Buffer);
      yield [
        taskId,
        taskData
      ];
    }
  }

  // /**
  //  * Gets a task abstraction
  //  */
  // @ready(new tasksErrors.ErrorSchedulerNotRunning())
  // public async getTask(id: TaskId, tran?: DBTransaction) {
  //   const taskData = await (tran ?? this.db).get<TaskData>([...this.queueTasksDbPath, id.toBuffer()]);
  //   if (taskData == null) {
  //     return;
  //   }
  //   const { p: taskP, resolveP, rejectP } = utils.promise<any>();

  //   // can we standardise on the unified listener
  //   // that is 1 listener for every task is created automatically
  //   // if 1000 tasks are inserted into the DB
  //   // 1000 listeners are created automatically?

  //   // we can either...
  //   // A standardise on the listener
  //   // B standardise on the promise

  //   // if the creation of the promise is lazy
  //   // then one can standardise on the promise
  //   // the idea being if the promise exists, just return the promise
  //   // if it doesn't exist, then first check if the task id still exists
  //   // if so, create a promise out of that lazily
  //   // now you need an object map locking to prevent race conditions on promise creation
  //   // then there's only ever 1 promise for a given task
  //   // any other cases, they always give back the same promise


  //   const listener = (taskError, taskResult) => {
  //     if (taskError != null) {
  //       rejectP(taskError);
  //     } else {
  //       resolveP(taskResult);
  //     }
  //     this.deregisterListener(id, listener);
  //   };
  //   this.registerListener(id, listener);
  //   return taskP;
  // }


  // protected async getTaskP(taskId: TaskId, lazy: boolean, tran: DBTransaction) {
  //   // does that mean we don't extend the promise?
  //   // we just make it look like it
  //   // i guess it works too
  //   // if not lazy, then we do it immediately
  //   // we would assert that we already have this
  //   // so if it is not lazy
  //   // it is not necessary to do this?

  //   if (!lazy) {
  //     const taskData = await tran.get<TaskData>([...this.queueTasksDbPath, taskId.toBuffer()]);
  //     if (taskData == null) {
  //       return;
  //     }

  //   }

  //   const { p: taskP, resolveP, rejectP } = utils.promise<any>();
  //   const listener = (taskError, taskResult) => {
  //     if (taskError != null) {
  //       rejectP(taskError);
  //     } else {
  //       resolveP(taskResult);
  //     }
  //     this.deregisterListener(id, listener);
  //   };
  //   this.registerListener(id, listener);

  //   // can we say that taskP
  //   return taskP;
  // }

  /*
  const task = await scheduleTask(...);
  await task; // <- any

  const task = scheduleTask(...);
  await task; // <- Promise


  const task = scheduleTask(...);
  await task; // <- Task (you are actually waiting for both scheduling + task execution)

  const task = scheduleTask(..., lazy=true);
  await task; // <- Task you are only awaiting the scheduling
  await task.task;

  const task = scheduleTask(delay=10hrs, lazy=True);

  waited 68 hrs

  await task; <- there's no information about the task - ErrorTasksTaskMissing


  const task = scheduleTask(delay=10hrs, lazy=True);

  waited 5 hrs

  await task; - it can register an event handler for this task

  for loop:
    scheduleTask(delay=10hrs);


  const task = await scheduler.scheduleTask(lazy=false);
  await task.promise;

  const task = await scheduler.getTask(lazy=false); // this is natu
  await task.promise;

  */

  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public async scheduleTask(
    handlerId: TaskHandlerId,
    parameters: TaskParameters = [],
    delay: TaskDelay = 0,
    priority: number = 0,
    lazy: boolean = false,
    tran?: DBTransaction
  ): Promise<Task<any>> {

    if (tran == null) {
      return this.db.withTransactionF(
        (tran) => this.scheduleTask(handlerId, parameters, delay, priority, lazy, tran)
      );
    }
    const taskId = this.generateTaskId();
    // Timestamp extracted from `IdSortable` is a floating point in seconds
    // with subsecond fractionals, multiply it by 1000 gives us milliseconds
    const taskTimestamp = Math.trunc(extractTs(taskId) * 1000) as TaskTimestamp;
    const taskPriority = tasksUtils.toPriority(priority);
    const taskData = {
      handlerId,
      parameters,
      timestamp: taskTimestamp,
      delay,
      priority: taskPriority,
    };

    const taskIdBuffer = taskId.toBuffer();

    // Save the task
    await tran.put([...this.schedulerTasksDbPath, taskIdBuffer], taskData);
    // Save the last task ID
    await tran.put(this.schedulerLastTaskIdPath, taskIdBuffer, true);
    // Save the scheduled time
    const taskScheduledLexi = Buffer.from(lexi.pack(taskTimestamp + delay));
    await tran.put(
      [...this.schedulerTimeDbPath, taskScheduledLexi],
      taskId.toBuffer(),
      true
    );

    // do we do this?
    // new Task()



    if (!lazy) {
      // task().then(onFullfill, onReject).finally(onFinally)
      // const { p: taskP, resolveP: resolveTaskP, rejectP: rejectTaskP } = utils.promise<any>();
      // this.promises.set(
      //   taskId.toString() as TaskIdString,
      //   {
      //     taskP,
      //     resolveTaskP,
      //     rejectTaskP
      //   }
      // );
      // const taskListener = (taskError, taskResult) => {
      //   if (taskError != null) {
      //     resolveTaskP(taskError);
      //   } else {
      //     rejectTaskP(taskResult);
      //   }
      //   this.deregisterListener(taskId, taskListener);
      // };
      // this.registerListener(taskId, taskListener);
    }


    const task = {
      id: taskId,
      ...taskData,
      then: async (onFulfilled, onRejected) => {

        // if this taskP already exists
        // then there's no need to set it up?
        const taskP = this.promises.get(taskId.toString() as TaskIdString);
        // this is going to be bound to somnething?
        // we need to create a promise for it?
        // but this means you start doing this by default

      }
    };

    // return [
    //   {
    //     id: taskId,
    //     ...taskData,
    //   }
    // ];

    // TODO: trigger the processing of the task?

    // TODO: reset the timeout in case the timeouts have been exhausted
    // if the timeouts haven't been started or stopped
    // scheduling a task can be halted
    // you should "set the next setTimeout"
    // depending if the setTimeout is already set
    // if set, it will reset

    if (this.processingTimer != null) {
      // proceed to update the processing timer
      // startProcessing will peek at the next task
      // and start timing out there
      // if the timeout isn't given
      // it will instead be given  and do it there
      // it depends on the timer
      // seems like if the timer exists

      // we can "reset" t othe current time
      // reschedules it
      // but that's not what we want to do
      // we want to clear that timeout
      // and schedule a new TIMER
      // if this overrides that timer
      // but we don't know how much time
      // or when this is scheduled to run?

      await this.startProcessing();
    }

  }

  // we have to start the loop
  // the `setTimeout` is what actually starts the execution
  // Pop up the next highest priority

  // when pushing a task
  // it is "scheduled"
  // but that is not what happens here

  // instead scheduling is triggered in 2 ways
  // one by starting the system
  // and another when a task is entered into the system
  // in both cases, a trigger takes place

  public async popTask(tran?: DBTransaction) {
    if (tran == null) {
      return this.db.withTransactionF(
        (tran) => this.popTask.apply(this, [...arguments, tran])
      );
    }
    let taskId: TaskId | undefined;
    let taskData: TaskData | undefined;
    for await (const [, taskIdBuffer] of tran.iterator(
      this.schedulerTimeDbPath,
      {
        limit: 1,
        keys: false
      }
    )) {
      taskId = IdInternal.fromBuffer<TaskId>(taskIdBuffer);
      taskData = await tran.get<TaskData>(
        [...this.schedulerTasksDbPath, taskIdBuffer]
      );
    }
    return {
      id: taskId,
      ...taskData
    };
  }

  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['starting'])
  public async getLastTaskId(tran?: DBTransaction): Promise<TaskId | undefined> {
    const lastTaskIdBuffer = await (tran ?? this.db).get(this.schedulerLastTaskIdPath, true);
    if (lastTaskIdBuffer == null) return;
    return IdInternal.fromBuffer<TaskId>(lastTaskIdBuffer);
  }
}

export default Scheduler;
