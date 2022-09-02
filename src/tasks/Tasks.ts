import type { DB, DBTransaction, LevelPath, KeyPath } from '@matrixai/db';
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
  TaskId,
  TaskPath,
} from './types';
import type KeyManager from '../keys/KeyManager';
import {
  CreateDestroyStartStop,
  ready
} from "@matrixai/async-init/dist/CreateDestroyStartStop";
import { IdInternal } from '@matrixai/id';
import Logger from '@matrixai/logger';
import lexi from 'lexicographic-integer';
import Timer from '../timer/Timer';
import * as tasksErrors from './errors';
import * as tasksUtils from './utils';

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

  /**
   * Maintain last Task Id to preserve monotonicity across procee restarts
   * `tasks/lastTaskId -> {raw(TaskId)}`
   */
  protected tasksLastTaskIdPath: KeyPath = [...this.tasksDbPath, 'lastTaskId'];

  /**
   * Tasks indexed by scheduled time
   * This combines it with a `TaskId` to avoid conflicts
   * `tasks/scheduled/{lexi(TaskTimestamp + TaskDelay)}/{raw(TaskId)} -> {raw(TaskId)}`
   */
  protected tasksScheduledDbPath: LevelPath = [...this.tasksDbPath, 'scheduled'];


  protected schedulingLoop: Promise<void> | null = null;
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
    if (!lazy) {
      await Promise.all([
        this.startScheduling(),
        this.startQueueing(),
      ]);
    }
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop() {
    this.logger.info(`Stopping ${this.constructor.name}`);
    await Promise.all([
      this.stopQueueing(),
      this.stopScheduling(),
    ]);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    this.handlers.clear();
    await this.db.clear(this.tasksDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
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
  ): Promise<TaskData> {
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




  }

  public async getTaskData(): Promise<TaskData> {


  }

  // this is not a loop that is not set and shit
  // it's always set...
  // so `undefined` here means that it was never set
  // or `null` here means that it is explicitly something?

  protected async startScheduling() {
    // need to start the scheduling loop here
    // to do this, we can use a while loop with a Timer
    // we need a timer either way
    // a while loop that you are "assigning"
    // but you have to do


    this.schedulingLoop = (async () => {
      while (true) {

        // the idea is to acquire the first one
        // why not have the timer set up already?
        // this gives us a wall clock time
        // that we want to be using
        // the timeOrigin is going to be specific
        // the when the process starts
        // the perofrmance now will contineu

        // Peek ahead by 100 ms
        const scheduledTime = performance.timeOrigin + performance.now() + 100;
        const scheduledTimestamp = Buffer.from(lexi.pack(scheduledTime));


        await this.db.withTransactionF(async (tran) => {
          for await (const [kP] of tran.iterator(
            this.tasksScheduledDbPath,
            { lte: [scheduledTimestamp] }
          )) {


          }

          // this is then done as part of the next one?
          for await (const [kP] of tran.iterator(
            this.tasksScheduledDbPath,
            {
              limit: 1,
            }
          )) {


          }
        });

        // the loop must be "set"
        // and started
        // iterate over the db to do this

      }
    })();


  }

  protected async startQueueing() {

  }

  protected async stopScheduling () {

  }

  protected async stopQueueing() {

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
