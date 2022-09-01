import type { DB, LevelPath } from '@matrixai/db';
import type { TaskData, TaskIdString } from './types';
import type KeyManager from '../keys/KeyManager';
import type Task from './Task';
import type Queue from './Queue';
import { DBTransaction } from '@matrixai/db';
import Logger, { LogLevel } from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import lexi from 'lexicographic-integer';
import {
  TaskDelay,
  TaskHandlerId,
  TaskId,
  TaskParameters,
  TaskGroup,
} from './types';
import * as tasksUtils from './utils';
import * as tasksErrors from './errors';
import { Plug } from '../utils/index';

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
    queue,
    logger = new Logger(this.name),
    delay = false,
    fresh = false,
  }: {
    db: DB;
    queue: Queue;
    logger?: Logger;
    delay?: boolean;
    fresh?: boolean;
  }): Promise<Scheduler> {
    logger.info(`Creating ${this.name}`);
    const scheduler = new this({ db, queue, logger });
    await scheduler.start({ delay, fresh });
    logger.info(`Created ${this.name}`);
    return scheduler;
  }

  protected logger: Logger;
  protected db: DB;
  protected keyManager: KeyManager;
  protected queue: Queue;
  // TODO: remove this?
  protected promises: Map<TaskIdString, Promise<any>> = new Map();

  // TODO: swap this out for the timer system later

  protected dispatchTimer?: ReturnType<typeof setTimeout>;
  protected dispatchTimerTimestamp: number = Number.POSITIVE_INFINITY;
  protected pendingDispatch: Promise<void> | null = null;
  protected dispatchPlug: Plug = new Plug();
  protected dispatchEnding: boolean = false;

  protected schedulerDbPath: LevelPath = [this.constructor.name];

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

  public constructor({
    db,
    queue,
    logger,
  }: {
    db: DB;
    queue: Queue;
    logger: Logger;
  }) {
    this.logger = logger;
    this.db = db;
    this.queue = queue;
  }

  public get isDispatching(): boolean {
    return this.dispatchTimer != null;
  }

  public async start({
    delay = false,
    fresh = false,
  }: {
    delay?: boolean;
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.setLevel(LogLevel.INFO);
    this.logger.setLevel(LogLevel.INFO);
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.schedulerDbPath);
    }
    // Don't start dispatching if we still want to register handlers
    if (!delay) {
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
    await this.stopDispatching();
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
    await this.db.clear(this.schedulerDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  protected updateTimer(startTime: number) {
    if (startTime >= this.dispatchTimerTimestamp) return;
    const delay = Math.max(startTime - tasksUtils.getPerformanceTime(), 0);
    clearTimeout(this.dispatchTimer);
    this.dispatchTimer = setTimeout(async () => {
      // This.logger.info('consuming pending tasks');
      await this.dispatchPlug.unplug();
      this.dispatchTimerTimestamp = Number.POSITIVE_INFINITY;
    }, delay);
    this.dispatchTimerTimestamp = startTime;
    this.logger.info(`Timer was updated to ${delay} to end at ${startTime}`);
  }

  /**
   * Starts the dispatching of tasks
   */
  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['starting'])
  public async startDispatching(): Promise<void> {
    // Starting queue
    await this.queue.startTasks();
    // If already started, do nothing
    if (this.pendingDispatch == null) {
      this.pendingDispatch = this.dispatchTaskLoop();
    }
  }

  @ready(new tasksErrors.ErrorSchedulerNotRunning(), false, ['stopping'])
  public async stopDispatching(): Promise<void> {
    const stopQueueP = this.queue.stopTasks();
    clearTimeout(this.dispatchTimer);
    delete this.dispatchTimer;
    this.dispatchEnding = true;
    await this.dispatchPlug.unplug();
    await this.pendingDispatch;
    this.pendingDispatch = null;
    await stopQueueP;
  }

  protected async dispatchTaskLoop(): Promise<void> {
    // This will pop tasks from the queue and put the where they need to go
    this.logger.info('dispatching set up');
    this.dispatchEnding = false;
    this.dispatchTimerTimestamp = Number.POSITIVE_INFINITY;
    while (true) {
      if (this.dispatchEnding) break;
      // Setting up and waiting for plug
      this.logger.info('dispatch waiting');
      await this.dispatchPlug.plug();
      // Get the next time to delay for
      await this.db.withTransactionF(async (tran) => {
        for await (const [keyPath] of tran.iterator(this.schedulerTimeDbPath, {
          limit: 1,
        })) {
          const [taskTimestampKeyBuffer] = tasksUtils.splitTaskTimestampKey(
            keyPath[0] as Buffer,
          );
          const time = lexi.unpack(Array.from(taskTimestampKeyBuffer));
          this.updateTimer(time);
        }
      });
      await this.dispatchPlug.waitForUnplug();
      if (this.dispatchEnding) break;
      this.logger.info('dispatch continuing');
      const time = tasksUtils.getPerformanceTime();
      // Peek ahead by 100 ms
      const targetTimestamp = Buffer.from(lexi.pack(time + 100));
      await this.db.withTransactionF(async (tran) => {
        for await (const [keyPath, taskIdBuffer] of tran.iterator(
          this.schedulerTimeDbPath,
          {
            lte: targetTimestamp,
          },
        )) {
          const taskTimestampKeyBuffer = keyPath[0] as Buffer;
          // Process the task now and remove it from the scheduler
          this.logger.info('dispatching task');
          await tran.del([...this.schedulerTimeDbPath, taskTimestampKeyBuffer]);
          const taskId = IdInternal.fromBuffer<TaskId>(taskIdBuffer);
          await this.queue.pushTask(taskId, taskTimestampKeyBuffer, tran);
        }
      });
    }
    this.logger.info('dispatching ending');
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
      ...this.queue.queueTasksDbPath,
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
      this.queue.queueTasksDbPath,
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

    const task = await this.queue.createTask(
      handlerId,
      parameters,
      priority,
      taskGroup,
      lazy,
      tran,
    );
    const taskIdBuffer = task.id.toBuffer();
    const startTime = task.timestamp + delay;
    const taskTimestampKeyBuffer = tasksUtils.makeTaskTimestampKey(
      startTime,
      task.id,
    );
    await tran.put(
      [...this.queue.queueStartTimeDbPath, taskIdBuffer],
      startTime,
    );
    await tran.put(
      [...this.queue.queueStartTimeDbPath, taskIdBuffer],
      taskTimestampKeyBuffer,
      true,
    );
    await tran.put(
      [...this.schedulerTimeDbPath, taskTimestampKeyBuffer],
      taskIdBuffer,
      true,
    );

    // Only update timer if transaction succeeds
    tran.queueSuccess(() => {
      this.updateTimer(startTime);
      this.logger.info(
        `Task ${tasksUtils.encodeTaskId(
          task.id,
        )} was scheduled for ${startTime}`,
      );
    });

    return task;
  }
}

export default Scheduler;
