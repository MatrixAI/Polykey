import type { DB, KeyPath, LevelPath } from '@matrixai/db';
import type {
  TaskData,
  TaskHandler,
  TaskTimestamp,
  TaskIdString,
} from './types';
import type KeyManager from '../keys/KeyManager';
import type { PromiseDeconstructed } from '../types';
import { EventEmitter } from 'events';
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
import {
  TaskDelay,
  TaskHandlerId,
  TaskId,
  TaskParameters,
  TaskGroup,
} from './types';
import * as tasksUtils from './utils';
import * as tasksErrors from './errors';
import Queue from './Queue';
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
    concurrencyLimit = Number.POSITIVE_INFINITY,
    logger = new Logger(this.name),
    handlers = {},
    delay = false,
    fresh = false,
  }: {
    db: DB;
    keyManager: KeyManager;
    // Queue?: Queue;
    concurrencyLimit: number;
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
    const scheduler = new this({ db, keyManager, logger, concurrencyLimit });
    await scheduler.start({ handlers, delay, fresh });
    logger.info(`Created ${this.name}`);
    return scheduler;
  }

  protected logger: Logger;
  protected db: DB;
  protected keyManager: KeyManager;
  protected queue: Queue;
  protected handlers: Map<TaskHandlerId, TaskHandler> = new Map();
  // TODO: remove this?
  protected promises: Map<TaskIdString, Promise<any>> = new Map();
  protected taskPromises: Map<TaskIdString, Promise<any>> = new Map();
  protected generateTaskId: () => TaskId;
  protected taskEvents: EventEmitter = new EventEmitter();

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

  /**
   * Tasks by groups
   * `groups/...taskGroup: Array<string> -> {raw(TaskId)}`
   */
  protected schedulerGroupsDbPath: LevelPath = [
    ...this.schedulerDbPath,
    'groups',
  ];

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
    this.queue = new Queue({
      db,
      concurrencyLimit,
      logger,
    });
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
    // Starting queue
    await this.queue.start({
      fresh,
      taskHandler: (taskId) => this.handleTask(taskId),
    });
    // Setting up processing
    this.pendingProcessing = this.processTaskLoop();
    // Don't start processing if we still want to register handlers
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

  protected updateTimer(startTime: number) {
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
  public async startProcessing(): Promise<void> {
    // Starting queue
    await this.queue.startTasks();
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
        const [taskTimestampKeyBuffer] = tasksUtils.splitTaskTimestampKey(
          keyPath_[0] as Buffer,
        );
        time = lexi.unpack(Array.from(taskTimestampKeyBuffer));
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
  public async stopProcessing(): Promise<void> {
    const stopQueueP = this.queue.stopTasks();
    clearTimeout(this.processingTimer);
    delete this.processingTimer;
    this.processingEnding = true;
    this.processingPlug.resolveP();
    await this.pendingProcessing;
    this.pendingProcessing = null;
    await stopQueueP;
  }

  protected async processTaskLoop(): Promise<void> {
    // This will pop tasks from the queue and put the where they need to go
    this.logger.info('processing set up');
    this.processingEnding = false;
    this.processingPlug = promise();
    this.processingTimerTimestamp = Number.POSITIVE_INFINITY;
    while (true) {
      await this.processingPlug.p;
      if (this.processingEnding) break;
      await this.db.withTransactionF(async (tran) => {
        // Read the pending task
        let taskIdBuffer: Buffer | undefined;
        let keyPath: KeyPath | undefined;
        // FIXME: get a range of tasks to do.
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
        const taskTimestampKeyBuffer = keyPath[0] as Buffer;
        const [timestampBuffer] = tasksUtils.splitTaskTimestampKey(
          taskTimestampKeyBuffer,
        );
        const time = lexi.unpack(Array.from(timestampBuffer));
        // If task is still waiting it start time then we wait
        // FIXME: This check is not needed if we get a range of tasks
        // FIXME: Don't use `Date.now()`, should be using performance timer taskID uses
        if (time > Date.now()) {
          // This.logger.info('waiting for tasks pending tasks');
          this.updateTimer(time);
          this.processingPlug = promise();
          return;
        }

        // Process the task now and remove it from the scheduler
        // this.logger.info('processing task');
        await this.processTask(tran, taskIdBuffer, taskTimestampKeyBuffer);
      });
    }
    this.logger.info('processing ending');
  }

  protected async processTask(
    tran: DBTransaction,
    taskIdBuffer: Buffer,
    taskTimestampKeyBuffer: Buffer,
  ) {
    const taskData = await tran.get<TaskData>([
      ...this.schedulerTasksDbPath,
      taskIdBuffer,
    ]);
    await tran.del([...this.schedulerTimeDbPath, taskTimestampKeyBuffer]);
    // Await tran.del([...this.schedulerTasksDbPath, taskIdBuffer]);
    const taskId = IdInternal.fromBuffer<TaskId>(taskIdBuffer);

    // We want to move it to the pending list
    // console.log(taskId.toMultibase('base32hex'), taskData);
    if (taskData == null) throw Error('TEMP ERROR');

    await this.queue.pushTask(taskId, taskTimestampKeyBuffer, tran);
  }

  protected async handleTask(taskId: TaskId) {
    // Get the task information and use the relevant handler
    // throw and error if the task does not exist
    // throw an error if the handler does not exist.

    return await this.db.withTransactionF(async (tran) => {
      // Getting task information
      const taskData = await this.getTaskData_(taskId, tran);
      if (taskData == null) throw Error('TEMP task not found');
      // Getting handler
      const handler = this.getHandler(taskData.handlerId);
      if (handler == null) throw Error('TEMP handler not found');

      const prom = handler(...taskData.parameters);

      // Add the promise to the map and hook any lifecycle stuff
      const taskIdString = taskId.toMultibase('base32hex') as TaskIdString;
      this.promises.set(taskIdString, prom);
      return prom
        .then(
          (value) => {
            this.taskEvents.emit(taskIdString, value);
            return value;
          },
          (reason) => {
            this.taskEvents.emit(taskIdString, reason);
            throw reason;
          },
        )
        .finally(async () => {
          this.promises.delete(taskIdString);
          const taskTimestampKeybuffer = tasksUtils.makeTaskTimestampKey(
            taskData.timestamp + taskData.delay,
            taskId,
          );
          // Cleaning up is a separate transaction
          await this.db.withTransactionF(async (tran) => {
            await tran.del([...this.schedulerTasksDbPath, taskId.toBuffer()]);
            if (taskData.taskGroup != null) {
              await tran.del([
                ...this.schedulerGroupsDbPath,
                ...taskData.taskGroup,
                taskTimestampKeybuffer,
              ]);
            }
          });
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

  protected async getTaskData_(
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
        .get<TaskData>([...this.schedulerTasksDbPath, taskId.toBuffer()])
        .then((taskData) => {
          if (taskData == null) {
            this.taskEvents.removeListener(taskIdString, resultListener);
            reject(Error('TEMP task not found'));
          }
        });
    }).finally(() => {
      this.taskPromises.delete(taskIdString);
    });
    this.taskPromises.set(taskIdString, newTaskPromise);
    return newTaskPromise;
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
    taskGroup?: TaskGroup,
    lazy: boolean = false,
    tran?: DBTransaction,
  ): Promise<Task<any> | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.scheduleTask(
          handlerId,
          parameters,
          delay,
          priority,
          taskGroup,
          lazy,
          tran,
        ),
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
      delay,
      taskGroup,
      priority: taskPriority,
    };

    const taskIdBuffer = taskId.toBuffer();
    const startTime = taskTimestamp + delay;

    // Save the task
    await tran.put([...this.schedulerTasksDbPath, taskIdBuffer], taskData);
    // Save the last task ID
    await tran.put(this.schedulerLastTaskIdPath, taskIdBuffer, true);
    // Save the scheduled time
    const taskTimestampKeyBuffer = tasksUtils.makeTaskTimestampKey(
      startTime,
      taskId,
    );
    await tran.put(
      [...this.schedulerTimeDbPath, taskTimestampKeyBuffer],
      taskId.toBuffer(),
      true,
    );

    // Adding to group
    if (taskGroup != null) {
      await tran.put(
        [...this.schedulerGroupsDbPath, ...taskGroup, taskTimestampKeyBuffer],
        taskIdBuffer,
        true,
      );
    }
    let taskPromise: Promise<any> | null = null;
    if (!lazy) {
      taskPromise = this.getTaskP(taskId, tran);
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

    // Only update timer if transaction succeeds
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
      taskGroup,
      taskPriority,
      taskPromise,
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

  @ready(new tasksErrors.ErrorSchedulerNotRunning())
  public async allTasksSettled() {
    return await this.queue.allConcurrentSettled();
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
      ...this.schedulerGroupsDbPath,
      ...taskGroup,
    ])) {
      yield IdInternal.fromBuffer<TaskId>(taskIdBuffer);
    }
  }
}

export default Scheduler;
