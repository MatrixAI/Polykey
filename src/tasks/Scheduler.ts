import type { DB, KeyPath, LevelPath } from '@matrixai/db';
import type {
  TaskData,
  TaskHandler,
  TaskPriority,
  TaskTimestamp,
  TaskIdString,
} from './types';
import type KeyManager from '../keys/KeyManager';
import type { PromiseDeconstructed } from '../types';
import { DBTransaction } from '@matrixai/db';
import Logger, { LogLevel } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import { extractTs } from '@matrixai/id/dist/IdSortable';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import lexi from 'lexicographic-integer';
import Task from './Task';
import { TaskDelay, TaskHandlerId, TaskId, TaskParameters } from './types';
import * as tasksUtils from './utils';
import * as tasksErrors from './errors';
import { promise } from '../utils';

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
    // Queue,
    logger = new Logger(this.name),
    handlers = {},
    delay = false,
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    // Queue?: Queue;
    logger?: Logger;
    handlers?: Record<TaskHandlerId, TaskHandler>;
    delay?: boolean;
    fresh?: boolean;
  }): Promise<Scheduler> {
    logger.info(`Creating ${this.name}`);
    // Queue =
    //   queue ??
    //   (await Queue.createQueue({
    //     db,
    //     logger: logger.getChild(Queue.name),
    //     fresh,
    //   }));
    const scheduler = new this({ db, keyManager, logger, concurrencyLimit: 2 });
    await scheduler.start({ handlers, delay, fresh });
    logger.info(`Created ${this.name}`);
    return scheduler;
  }

  protected logger: Logger;
  protected db: DB;
  protected keyManager: KeyManager;
  // Protected queue: Queue;
  protected handlers: Map<TaskHandlerId, TaskHandler> = new Map();
  protected promises: Map<TaskIdString, Promise<any>> = new Map();
  protected generateTaskId: () => TaskId;

  // TODO: swap this out for the timer system later

  protected processingTimer?: ReturnType<typeof setTimeout>;
  protected processingTimerTimestamp: number = Number.POSITIVE_INFINITY;
  protected pendingProcessing: Promise<void> | null = null;
  protected processingPlug: PromiseDeconstructed<void> = promise();
  protected processingEnding: boolean = false;

  protected schedulerDbPath: LevelPath = [this.constructor.name];

  /**
   * Last Task Id
   */
  protected schedulerLastTaskIdPath: KeyPath = [
    ...this.schedulerDbPath,
    'lastTaskId',
  ];

  /**
   * Tasks collection
   * `tasks/{TaskId} -> {json(Task)}`
   */
  protected schedulerTasksDbPath: LevelPath = [
    ...this.schedulerDbPath,
    'tasks',
  ];

  /**
   * Tasks scheduled by time
   * `time/{lexi(TaskTimestamp + TaskDelay)} -> {raw(TaskId)}`
   */
  protected schedulerTimeDbPath: LevelPath = [...this.schedulerDbPath, 'time'];

  // /**
  //  * Tasks queued for execution
  //  * `pending/{lexi(TaskPriority)}/{lexi(TaskTimestamp + TaskDelay)} -> {raw(TaskId)}`
  //  */
  // protected schedulerPendingDbPath: LevelPath = [
  //   ...this.schedulerDbPath,
  //   'pending',
  // ];

  // /**
  //  * Task handlers
  //  * `handlers/{TaskHandlerId}/{TaskId} -> {raw(TaskId)}`
  //  */
  // protected schedulerHandlersDbPath: LevelPath = [
  //   ...this.schedulerDbPath,
  //   'handlers',
  // ];

  // these variables are part of the priority queue system
  /**
   * Pending tasks to be executed
   */
  protected activeTasks: Array<{ taskId: TaskId; priority: TaskPriority }> = [];
  protected activeDispatchTaskLoop: Promise<void> | null = null;
  protected dispatchPlug: PromiseDeconstructed<void>;
  protected dispatchEnding: boolean;

  public constructor({
    db,
    keyManager,
    concurrencyLimit,
    // Queue,
    logger,
  }: {
    db: DB;
    keyManager: KeyManager;
    concurrencyLimit: number;
    // Queue: Queue;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.keyManager = keyManager;
    // This.queue = queue;
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
    this.logger.setLevel(LogLevel.INFO);
    this.logger.setLevel(LogLevel.INFO);
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      this.handlers.clear();
      // This.promises.clear();
      await this.db.clear(this.schedulerDbPath);
    }
    for (const taskHandlerId in handlers) {
      this.handlers.set(
        taskHandlerId as TaskHandlerId,
        handlers[taskHandlerId],
      );
    }
    const lastTaskId = await this.getLastTaskId();
    this.generateTaskId = tasksUtils.createTaskIdGenerator(
      this.keyManager.getNodeId(),
      lastTaskId,
    );
    // Setting up processing
    this.pendingProcessing = this.processTaskLoop();
    // Don't start processing if we still want to register handlers
    if (!delay) {
      await this.startProcessing();
      await this.startDispatching();
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
    await Promise.allSettled([this.stopProcessing(), this.stopDispatching()]);
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

  private updateTimer(startTime: number) {
    if (startTime >= this.processingTimerTimestamp) return;
    const delay = Math.max(startTime - Date.now(), 0);
    clearTimeout(this.processingTimer);
    this.processingTimer = setTimeout(() => {
      // This.logger.info('consuming pending tasks');
      this.processingPlug.resolveP();
      this.processingTimerTimestamp = Number.POSITIVE_INFINITY;
    }, delay);
    this.processingTimerTimestamp = startTime;
    // This.logger.info(`Timer was updated to ${delay} to end at ${startTime}`);
  }

  /**
   * Starts the processing of the work
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['starting'])
  private async startProcessing(): Promise<void> {
    // If already started, do nothing
    if (this.pendingProcessing == null) {
      this.pendingProcessing = this.processTaskLoop();
    }

    // We actually need to find the last task
    const time = await this.db.withTransactionF(async (tran) => {
      let time: number | undefined;
      for await (const [keyPath_] of tran.iterator(this.schedulerTimeDbPath, {
        limit: 1,
      })) {
        time = lexi.unpack(Array.from(keyPath_[0] as Buffer));
      }
      // If a task exists we set start the timer for when it's due
      return time;
    });
    if (time != null) {
      this.updateTimer(time);
    } else {
      // This.logger.info(`No pending tasks exist, timer was not started`);
    }
  }

  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['stopping'])
  private async stopProcessing(): Promise<void> {
    clearTimeout(this.processingTimer);
    delete this.processingTimer;
    this.processingEnding = true;
    this.processingPlug.resolveP();
    await this.pendingProcessing;
    this.pendingProcessing = null;
  }

  private processTaskLoop(): Promise<void> {
    // This will pop tasks from the queue and put the where they need to go
    // this.logger.info('processing set up');
    this.processingEnding = false;
    this.processingPlug = promise();
    this.processingTimerTimestamp = Number.POSITIVE_INFINITY;
    return (async () => {
      while (true) {
        await this.processingPlug.p;
        if (this.processingEnding) break;
        await this.db.withTransactionF(async (tran) => {
          // Read the pending task
          let taskIdBuffer: Buffer | undefined;
          let keyPath: KeyPath | undefined;
          for await (const [keyPath_, taskIdBuffer_] of tran.iterator(
            this.schedulerTimeDbPath,
            {
              limit: 1,
            },
          )) {
            taskIdBuffer = taskIdBuffer_;
            keyPath = keyPath_;
          }
          // If pending tasks are empty we wait
          if (taskIdBuffer == null || keyPath == null) {
            // This.logger.info('waiting for new tasks');
            this.processingPlug = promise();
            return;
          }
          const time = lexi.unpack(Array.from(keyPath[0] as Buffer));
          // If task is still waiting it start time then we wait
          if (time > Date.now()) {
            // This.logger.info('waiting for tasks pending tasks');
            this.updateTimer(time);
            this.processingPlug = promise();
            return;
          }

          // Process the task now and remove it from the scheduler
          // this.logger.info('processing task');
          await this.processTask(tran, taskIdBuffer, keyPath);
        });
      }
      // This.logger.info('processing ending');
    })();
  }

  private async processTask(
    tran: DBTransaction,
    taskIdBuffer: Buffer,
    keyPath: KeyPath,
  ) {
    const taskData = await tran.get<TaskData>([
      ...this.schedulerTasksDbPath,
      taskIdBuffer,
    ]);
    await tran.del([...this.schedulerTimeDbPath, ...keyPath]);
    // Await tran.del([...this.schedulerTasksDbPath, taskIdBuffer]);
    const taskId = IdInternal.fromBuffer<TaskId>(taskIdBuffer);

    // We want to move it to the pending list
    // console.log(taskId.toMultibase('base32hex'), taskData);
    if (taskData == null) throw Error('TEMP ERROR');

    this.dispatchTask(taskId, taskData.priority);
  }

  private dispatchTask(taskId: TaskId, priority: TaskPriority) {
    this.logger.info('addingTask');
    this.activeTasks.push({ taskId, priority });
    this.dispatchPlug.resolveP();
  }

  private async startDispatching() {
    if (this.activeDispatchTaskLoop == null) {
      this.activeDispatchTaskLoop = this.dispatchTasksLoop();
    }
    this.dispatchPlug.resolveP();
  }

  private async stopDispatching() {
    this.dispatchEnding = true;
    this.dispatchPlug.resolveP();
    await this.activeDispatchTaskLoop;
    this.activeDispatchTaskLoop = null;
  }

  private dispatchTasksLoop() {
    this.logger.info('dispatching set up');
    this.dispatchPlug = promise();
    this.dispatchEnding = false;
    const pace = async () => {
      await this.dispatchPlug.p;
      return !this.dispatchEnding;
    };
    return (async () => {
      while (await pace()) {
        // Pop task and dispatch
        this.logger.info('getting task');
        const nextTask = this.activeTasks.pop();
        if (nextTask == null) {
          this.logger.info('no task found, waiting');
          this.dispatchPlug = promise();
          continue;
        }
        this.logger.info('dispatching task');
        try {
          await this.handleTask(nextTask.taskId);
        } catch (e) {
          // FIXME: ignore for now
        }
      }
      // Await this.concurrency.allConcurrentSettled();
      this.logger.info('dispatching ending');
    })();
  }

  private async handleTask(taskId) {
    // Get the task information and use the relevant handler
    // throw and error if the task does not exist
    // throw an error if the handler does not exist.

    await this.db.withTransactionF(async (tran) => {
      // Getting task information
      const taskData = await this.getTaskData_(taskId, tran);
      if (taskData == null) throw Error('TEMP task not found');
      // Getting handler
      const handler = this.getHandler(taskData.handlerId);
      if (handler == null) throw Error('TEMP handler not found');

      // Const { promise: prom } = await this.concurrency.withConcurrency(
      //   async () => {
      //     return await handler(...taskData.parameters);
      //   },
      // );
      const prom = new Promise(() => {});

      // Add the promise to the map and hook any lifecycle stuff
      const taskIdString = taskId.toMultibase('hex') as TaskIdString;
      this.promises.set(taskIdString, prom);
      prom.finally(async () => {
        this.promises.delete(taskIdString);
        await tran.del([...this.schedulerTasksDbPath, taskId.toBuffer()]);
      });
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

  /**
   * Gets a scheduled task data
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public async getTaskData(
    taskId: TaskId,
    tran?: DBTransaction,
  ): Promise<TaskData | undefined> {
    return await this.getTaskData_(taskId, tran);
  }

  private async getTaskData_(
    taskId: TaskId,
    tran?: DBTransaction,
  ): Promise<TaskData | undefined> {
    return await (tran ?? this.db).get<TaskData>([
      ...this.schedulerTasksDbPath,
      taskId.toBuffer(),
    ]);
  }

  /**
   * Gets all scheduled task datas
   * Tasks are sorted by the `TaskId`
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public async *getTaskDatas(
    order: 'asc' | 'desc' = 'asc',
    tran?: DBTransaction,
  ): AsyncGenerator<[TaskId, TaskData]> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) =>
        this.getTaskDatas(...arguments, tran),
      );
    }
    for await (const [keyPath, taskData] of tran.iterator<TaskData>(
      this.schedulerTasksDbPath,
      { valueAsBuffer: false, reverse: order !== 'asc' },
    )) {
      const taskId = IdInternal.fromBuffer<TaskId>(keyPath[0] as Buffer);
      yield [taskId, taskData];
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
  //
  //   // can we standardise on the unified listener
  //   // that is 1 listener for every task is created automatically
  //   // if 1000 tasks are inserted into the DB
  //   // 1000 listeners are created automatically?
  //
  //   // we can either...
  //   // A standardise on the listener
  //   // B standardise on the promise
  //
  //   // if the creation of the promise is lazy
  //   // then one can standardise on the promise
  //   // the idea being if the promise exists, just return the promise
  //   // if it doesn't exist, then first check if the task id still exists
  //   // if so, create a promise out of that lazily
  //   // now you need an object map locking to prevent race conditions on promise creation
  //   // then there's only ever 1 promise for a given task
  //   // any other cases, they always give back the same promise
  //
  //
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

  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public getTaskP(taskId: TaskId) {
    // This will only get an active promise
    // if a promise is still scheduled then so far as we can tell it doesn't exist
    // We may have to make an event system that emits when a task is made active
    // Then we can wait for that even and then retrieve it from the active tasks
    // I think we should be able to hook a cancel on this as well
    const taskIdString = taskId.toMultibase('base32hex') as TaskIdString;
    const taskP = this.promises.get(taskIdString);
    if (taskP == null) throw Error('TEMP task not running');

    return taskP;
  }

  /*
  Const task = await scheduleTask(...);
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
    tran?: DBTransaction,
  ): Promise<Task<any> | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.scheduleTask(handlerId, parameters, delay, priority, lazy, tran),
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
    const taskData = {
      handlerId,
      parameters,
      timestamp: taskTimestamp,
      delay,
      priority: taskPriority,
    };

    const taskIdBuffer = taskId.toBuffer();
    const startTime = Date.now() + delay;

    // Save the task
    await tran.put([...this.schedulerTasksDbPath, taskIdBuffer], taskData);
    // Save the last task ID
    await tran.put(this.schedulerLastTaskIdPath, taskIdBuffer, true);
    // Save the scheduled time
    const taskScheduledLexi = Buffer.from(lexi.pack(startTime));
    await tran.put(
      [...this.schedulerTimeDbPath, taskScheduledLexi],
      taskId.toBuffer(),
      true,
    );

    if (!lazy) {
      // Task().then(onFullfill, onReject).finally(onFinally)
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

    // TODO: trigger the processing of the task?
    // TODO: reset the timeout in case the timeouts have been exhausted
    // if the timeouts haven't been started or stopped
    // scheduling a task can be halted
    // you should "set the next setTimeout"
    // depending if the setTimeout is already set
    // if set, it will reset
    //
    // Proceed to update the processing timer
    // startProcessing will peek at the next task
    // and start timing out there
    // if the timeout isn't given
    // it will instead be given  and do it there
    // it depends on the timer
    // seems like if the timer exists
    //
    // we can "reset" t othe current time
    // reschedules it
    // but that's not what we want to do
    // we want to clear that timeout
    // and schedule a new TIMER
    // if this overrides that timer
    // but we don't know how much time
    // or when this is scheduled to run?

    tran.queueSuccess(() => {
      this.updateTimer(startTime);
      this.logger.info(
        `Task ${taskId.toMultibase(
          'base32hex',
        )} was scheduled for ${startTime}`,
      );
    });

    return new Task(
      this,
      taskId,
      handlerId,
      parameters,
      taskTimestamp,
      delay,
      taskPriority,
    );
  }

  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['starting'])
  public async getLastTaskId(
    tran?: DBTransaction,
  ): Promise<TaskId | undefined> {
    const lastTaskIdBuffer = await (tran ?? this.db).get(
      this.schedulerLastTaskIdPath,
      true,
    );
    if (lastTaskIdBuffer == null) return;
    return IdInternal.fromBuffer<TaskId>(lastTaskIdBuffer);
  }
}

export default Scheduler;
