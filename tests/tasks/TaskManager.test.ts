import type { PromiseCancellable } from '@matrixai/async-cancellable';
import type { ContextTimed } from '@matrixai/contexts';
import type {
  Task,
  TaskHandlerId,
  TaskId,
  TaskPath,
  TaskStatus,
} from '@/tasks/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as fc from 'fast-check';
import { test } from '@fast-check/jest';
import { DB } from '@matrixai/db';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Lock } from '@matrixai/async-locks';
import TaskManager from '@/tasks/TaskManager';
import * as tasksErrors from '@/tasks/errors';
import * as utils from '@/utils';

describe(TaskManager.name, () => {
  const logger = new Logger(`${TaskManager.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const handlerId = 'testId' as TaskHandlerId;
  let dataDir: string;
  let db: DB;
  // Should be set inside the tests, but possibly undefined
  let taskManager: TaskManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
  });
  afterEach(async () => {
    await taskManager?.stop();
    await db.stop();
    await fs.promises.rm(dataDir, { recursive: true, force: true });
  });

  test('can start and stop', async () => {
    taskManager = await TaskManager.createTaskManager({
      db,
      lazy: false,
      logger,
    });
    await taskManager.stop();
    await taskManager.start();
    await taskManager.stop();
  });
  test('tasks persist between Tasks object creation', async () => {
    let taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });
    const handlerId = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    taskManager.registerHandler(handlerId, handler);
    await taskManager.startProcessing();
    const taskA = await taskManager.scheduleTask({
      handlerId,
      parameters: [1],
      delay: 1000,
      lazy: false,
    });
    const taskB = await taskManager.scheduleTask({
      handlerId,
      parameters: [2],
      delay: 100,
      lazy: false,
    });
    const taskC = await taskManager.scheduleTask({
      handlerId,
      parameters: [3],
      delay: 2000,
      lazy: false,
    });
    const taskD = await taskManager.scheduleTask({
      handlerId,
      parameters: [4],
      delay: 10,
      lazy: false,
    });
    const taskE = await taskManager.scheduleTask({
      handlerId,
      parameters: [5],
      delay: 10,
      lazy: false,
    });
    const taskF = await taskManager.scheduleTask({
      handlerId,
      parameters: [6],
      delay: 10,
      lazy: false,
    });
    const taskG = await taskManager.scheduleTask({
      handlerId,
      parameters: [7],
      delay: 3000,
      lazy: false,
    });
    await Promise.all([
      taskB.promise(),
      taskD.promise(),
      taskE.promise(),
      taskF.promise(),
    ]);
    await taskManager.stop();
    expect(handler).toHaveBeenCalledTimes(4);
    handler.mockClear();
    taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });
    taskManager.registerHandler(handlerId, handler);
    await taskManager.startProcessing();
    // We cannot simply use `taskA.promise()`, `taskC.promise()`,
    // `taskG.promise()` because the old task manager has stopped, and the
    // current task manager is different, and the `promise()` method
    // is bound to the previous task manager.
    await Promise.all([
      taskManager.getTaskPromise(taskA.id),
      taskManager.getTaskPromise(taskC.id),
      taskManager.getTaskPromise(taskG.id),
    ]);
    await taskManager.stop();
    expect(handler).toHaveBeenCalledTimes(3);
  });
  test('tasks persist between Tasks stop and starts', async () => {
    taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });
    const handlerId = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    taskManager.registerHandler(handlerId, handler);
    await taskManager.startProcessing();
    const taskA = await taskManager.scheduleTask({
      handlerId,
      parameters: [1],
      delay: 1000,
      lazy: false,
    });
    const taskB = await taskManager.scheduleTask({
      handlerId,
      parameters: [2],
      delay: 100,
      lazy: false,
    });
    const taskC = await taskManager.scheduleTask({
      handlerId,
      parameters: [3],
      delay: 2000,
      lazy: false,
    });
    const taskD = await taskManager.scheduleTask({
      handlerId,
      parameters: [4],
      delay: 10,
      lazy: false,
    });
    const taskE = await taskManager.scheduleTask({
      handlerId,
      parameters: [5],
      delay: 10,
      lazy: false,
    });
    const taskF = await taskManager.scheduleTask({
      handlerId,
      parameters: [6],
      delay: 10,
      lazy: false,
    });
    const taskG = await taskManager.scheduleTask({
      handlerId,
      parameters: [7],
      delay: 3000,
      lazy: false,
    });
    await Promise.all([
      taskB.promise(),
      taskD.promise(),
      taskE.promise(),
      taskF.promise(),
    ]);
    await taskManager.stop();
    expect(handler).toHaveBeenCalledTimes(4);
    handler.mockClear();
    await taskManager.start();
    // Here the same task manager is being used
    // and it has been restarted
    await Promise.all([taskA.promise(), taskC.promise(), taskG.promise()]);
    await taskManager.stop();
    expect(handler).toHaveBeenCalledTimes(3);
  });
  const scheduleCommandArb = fc
    .record({
      handlerId: fc.constant(handlerId),
      delay: fc.integer({ min: 10, max: 1000 }),
      parameters: fc.constant([]),
      priority: fc.integer({ min: -200, max: 200 }),
    })
    .map((taskSpec) => async (context: { taskManager: TaskManager }) => {
      return await context.taskManager.scheduleTask({
        ...taskSpec,
        lazy: false,
      });
    })
    .noShrink();
  const sleepCommandArb = fc
    .integer({ min: 10, max: 100 })
    .noShrink()
    .map((value) => async (_context) => {
      await utils.sleep(value);
    });

  const commandsArb = fc.array(
    fc.oneof(
      { arbitrary: scheduleCommandArb, weight: 2 },
      { arbitrary: sleepCommandArb, weight: 1 },
    ),
    { maxLength: 50, minLength: 50 },
  );
  test.prop([commandsArb], {
    interruptAfterTimeLimit: globalThis.defaultTimeout - 2000,
    numRuns: 3,
  })('activeLimit is enforced', async (commands) => {
    const activeLimit = 5;
    taskManager = await TaskManager.createTaskManager({
      activeLimit,
      db,
      fresh: true,
      logger,
    });
    const handler = jest.fn();
    handler.mockImplementation(async () => {
      await utils.sleep(200);
    });
    taskManager.registerHandler(handlerId, handler);
    await taskManager.startProcessing();
    const context = { taskManager };

    // Scheduling taskManager to be scheduled
    const pendingTasks: Array<PromiseCancellable<any>> = [];
    for (const command of commands) {
      expect(taskManager.activeCount).toBeLessThanOrEqual(activeLimit);
      const task = await command(context);
      if (task != null) pendingTasks.push(task.promise());
    }

    let completed = false;
    const waitForCompletionProm = (async () => {
      await Promise.all(pendingTasks);
      completed = true;
    })();

    // Check for active tasks while tasks are still running
    while (!completed) {
      expect(taskManager.activeCount).toBeLessThanOrEqual(activeLimit);
      await Promise.race([utils.sleep(100), waitForCompletionProm]);
    }

    await taskManager.stop();
  });
  test('tasks are handled exactly once per task', async () => {
    const handler = jest.fn();
    const pendingLock = new Lock();
    const [lockReleaser] = await pendingLock.lock()();
    const resolvedTasks = new Map<number, number>();
    const totalTasks = 50;
    handler.mockImplementation(async (_ctx, _taskInfo, number: number) => {
      resolvedTasks.set(number, (resolvedTasks.get(number) ?? 0) + 1);
      if (resolvedTasks.size >= totalTasks) await lockReleaser();
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });
    await db.withTransactionF(async (tran) => {
      for (let i = 0; i < totalTasks; i++) {
        await taskManager.scheduleTask(
          {
            handlerId,
            parameters: [i],
            lazy: false,
          },
          tran,
        );
      }
    });

    await pendingLock.waitForUnlock();
    // Each task called exactly once
    resolvedTasks.forEach((value) => expect(value).toEqual(1));

    await taskManager.stop();
    expect(handler).toHaveBeenCalledTimes(totalTasks);
  });
  test('awaited taskPromises resolve', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_ctx, _taskInfo, fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskSucceed = await taskManager.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false,
    });

    // Promise should succeed with result
    const taskSucceedP = taskSucceed!.promise();
    await expect(taskSucceedP).resolves.toBe(true);

    await taskManager.stop();
  });
  test('awaited taskPromises reject', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_ctx, _taskInfo, fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskFail = await taskManager.scheduleTask({
      handlerId,
      parameters: [false],
      lazy: false,
    });

    // Promise should throw
    const taskFailP = taskFail.promise();
    await expect(taskFailP).rejects.toThrow(Error);

    await taskManager.stop();
  });
  test('awaited taskPromises resolve or reject', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_ctx, _taskInfo, fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskFail = await taskManager.scheduleTask({
      handlerId,
      parameters: [false],
      lazy: false,
    });

    const taskSuccess = await taskManager.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false,
    });

    // Promise should succeed with result
    await expect(taskSuccess.promise()).resolves.toBe(true);
    await expect(taskFail.promise()).rejects.toThrow(Error);

    await taskManager.stop();
  });
  test('tasks fail with no handler', async () => {
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
    });

    const taskFail = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: false,
    });

    // Promise should throw
    const taskFailP = taskFail.promise();
    await expect(taskFailP).rejects.toThrow(
      tasksErrors.ErrorTaskHandlerMissing,
    );

    await taskManager.stop();
  });
  test('tasks fail with unregistered handler', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_ctx, _taskInfo, fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskSucceed = await taskManager.scheduleTask({
      handlerId,
      parameters: [false],
      lazy: false,
    });

    // Promise should succeed
    const taskSucceedP = taskSucceed.promise();
    await expect(taskSucceedP).rejects.not.toThrow(
      tasksErrors.ErrorTaskHandlerMissing,
    );

    // Deregister
    taskManager.deregisterHandler(handlerId);
    const taskFail = await taskManager.scheduleTask({
      handlerId,
      parameters: [false],
      lazy: false,
    });
    const taskFailP = taskFail.promise();
    await expect(taskFailP).rejects.toThrow(
      tasksErrors.ErrorTaskHandlerMissing,
    );

    await taskManager.stop();
  });
  test('eager taskPromise resolves when awaited after task completion', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_ctx, _taskInfo, fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });

    const taskSucceed1 = await taskManager.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false,
    });
    await taskManager.startProcessing();
    await expect(taskSucceed1.promise()).resolves.toBe(true);
    const taskSucceed2 = await taskManager.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false,
    });
    await expect(taskSucceed2.promise()).resolves.toBe(true);
    await taskManager.stop();
  });
  test('lazy taskPromise rejects when awaited after task completion', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });

    const taskSucceed = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: true,
    });
    const taskProm = taskManager.getTaskPromise(taskSucceed.id);
    await taskManager.startProcessing();
    await taskProm;
    await expect(taskSucceed.promise()).rejects.toThrow();
    await taskManager.stop();
  });
  test('Task Promises should be singletons', async () => {
    taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });

    const task1 = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: false,
    });
    const task2 = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: true,
    });
    expect(task1.promise()).toBe(task1.promise());
    expect(task1.promise()).toBe(taskManager.getTaskPromise(task1.id));
    expect(taskManager.getTaskPromise(task1.id)).toBe(
      taskManager.getTaskPromise(task1.id),
    );
    expect(task2.promise()).toBe(task2.promise());
    expect(task2.promise()).toBe(taskManager.getTaskPromise(task2.id));
    expect(taskManager.getTaskPromise(task2.id)).toBe(
      taskManager.getTaskPromise(task2.id),
    );
    await taskManager.stop();
  });
  test('can cancel scheduled task, clean up and reject taskPromise', async () => {
    taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });
    const task1 = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: false,
    });
    const task2 = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: true,
    });
    // Cancellation should reject promise
    const taskPromise = task1.promise();
    taskPromise.cancel('cancelled');
    await expect(taskPromise).rejects.toBe('cancelled');
    // Cancellation directly from the task object
    task2.cancel('cancelled');
    await expect(task2.promise()).rejects.toBe('cancelled');
    // Task should be cleaned up
    expect(await taskManager.getTask(task1.id)).toBeUndefined();
    expect(await taskManager.getTask(task2.id)).toBeUndefined();
    await taskManager.stop();
  });
  test('can cancel active task, clean up and reject taskPromise', async () => {
    const handler = jest.fn();
    const { p: pauseP, resolveP: resolvePauseP } = utils.promise();
    handler.mockImplementation(async (ctx: ContextTimed) => {
      const abortP = new Promise((_, reject) =>
        ctx.signal.addEventListener('abort', () => reject(ctx.signal.reason)),
      );
      await Promise.race([pauseP, abortP]);
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });
    const task1 = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: false,
    });
    const task2 = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: true,
    });
    await taskManager.startProcessing();
    // Poll until status is active
    await utils.poll(
      async () => {
        return [
          (await taskManager.getTask(task1.id))!.status,
          (await taskManager.getTask(task2.id))!.status,
        ];
      },
      (_: any, status?: [TaskStatus, TaskStatus]) => {
        return status![0] === 'active' && status![1] === 'active';
      },
      10,
      { timer: 1000 },
    );
    // Cancellation should reject promise
    const taskPromise = task1.promise();
    taskPromise.cancel('cancelled');
    await expect(taskPromise).rejects.toBe('cancelled');
    task2.cancel('cancelled');
    await expect(task2.promise()).rejects.toBe('cancelled');
    // Task should be cleaned up
    expect(await taskManager.getTask(task1.id, true)).toBeUndefined();
    expect(await taskManager.getTask(task2.id, true)).toBeUndefined();
    resolvePauseP();
    await taskManager.stop();
  });
  test('incomplete active tasks cleaned up during startup', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });

    // Seeding data
    const task = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      deadline: 100,
      lazy: false,
    });

    // Moving task to active in database
    const taskScheduleTime = task.scheduled.getTime();
    // @ts-ignore: private property
    const tasksScheduledDbPath = taskManager.tasksScheduledDbPath;
    // @ts-ignore: private property
    const tasksActiveDbPath = taskManager.tasksActiveDbPath;
    const taskIdBuffer = task.id.toBuffer();
    await db.withTransactionF(async (tran) => {
      await tran.del([
        ...tasksScheduledDbPath,
        utils.lexiPackBuffer(taskScheduleTime),
        taskIdBuffer,
      ]);
      await tran.put([...tasksActiveDbPath, taskIdBuffer], null);
    });

    // Task should be active
    const newTask1 = await taskManager.getTask(task.id);
    expect(newTask1!.status).toBe('active');

    // Restart to clean up
    await taskManager.stop();
    await taskManager.start({ lazy: true });

    // Task should be back to queued
    const newTask2 = await taskManager.getTask(task.id, false);
    expect(newTask2!.status).toBe('queued');
    await taskManager.startProcessing();
    await newTask2!.promise();

    await taskManager.stop();
  });
  test('stopping should gracefully end active tasks', async () => {
    const handler = jest.fn();
    const { p: pauseP, resolveP: resolvePauseP } = utils.promise();
    handler.mockImplementation(async (ctx: ContextTimed) => {
      const abortP = new Promise((_, reject) =>
        ctx.signal.addEventListener('abort', () =>
          reject(
            new tasksErrors.ErrorTaskRetry(undefined, {
              cause: ctx.signal.reason,
            }),
          ),
        ),
      );
      await Promise.race([pauseP, abortP]);
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });
    const task1 = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: false,
    });
    const task2 = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: false,
    });
    await taskManager.startProcessing();
    await utils.poll(
      async () => {
        return [
          (await taskManager.getTask(task1.id))!.status,
          (await taskManager.getTask(task2.id))!.status,
        ];
      },
      (_: any, status?: [TaskStatus, TaskStatus]) => {
        return status![0] === 'active' && status![1] === 'active';
      },
      10,
      { timer: 1000 },
    );
    await taskManager.stop();
    await taskManager.start({ lazy: true });
    expect(await taskManager.getTask(task1.id)).toBeDefined();
    expect(await taskManager.getTask(task2.id)).toBeDefined();
    await taskManager.stop();
    resolvePauseP();
  });
  test('stopped tasks should run again if allowed', async () => {
    const { p: pauseP, resolveP: resolvePauseP } = utils.promise();
    const handlerId1 = 'handler1' as TaskHandlerId;
    const handler1 = jest.fn();
    handler1.mockImplementation(async (ctx: ContextTimed) => {
      const abortP = new Promise((_, reject) =>
        ctx.signal.addEventListener('abort', () =>
          reject(
            new tasksErrors.ErrorTaskRetry(undefined, {
              cause: ctx.signal.reason,
            }),
          ),
        ),
      );
      await Promise.race([pauseP, abortP]);
    });
    const handlerId2 = 'handler2' as TaskHandlerId;
    const handler2 = jest.fn();
    handler2.mockImplementation(async (ctx: ContextTimed) => {
      const abortP = new Promise((_, reject) =>
        ctx.signal.addEventListener('abort', () => reject(ctx.signal.reason)),
      );
      await Promise.race([pauseP, abortP]);
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId1]: handler1, [handlerId2]: handler2 },
      lazy: true,
      logger,
    });
    const task1 = await taskManager.scheduleTask({
      handlerId: handlerId1,
      parameters: [],
      lazy: false,
    });
    const task2 = await taskManager.scheduleTask({
      handlerId: handlerId2,
      parameters: [],
      lazy: false,
    });
    await taskManager.startProcessing();
    // Poll until status is active
    await utils.poll(
      async () => {
        return [
          (await taskManager.getTask(task1.id))!.status,
          (await taskManager.getTask(task2.id))!.status,
        ];
      },
      (_: any, status?: [TaskStatus, TaskStatus]) => {
        return status![0] === 'active' && status![1] === 'active';
      },
      10,
      { timer: 1000 },
    );
    await taskManager.stop();
    // Tasks were run
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
    handler1.mockClear();
    handler2.mockClear();
    await taskManager.start({ lazy: true });
    const task1New = await taskManager.getTask(task1.id, false);
    const task2New = await taskManager.getTask(task2.id, false);
    await taskManager.startProcessing();
    // Task1 should still exist
    expect(task1New).toBeDefined();
    // Task2 should've been removed
    expect(task2New).toBeUndefined();
    resolvePauseP();
    await expect(task1New?.promise()).resolves.toBeUndefined();
    // Tasks were run
    expect(handler1).toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
    await taskManager.stop();
  });
  test('tests for taskPath', async () => {
    taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });

    await taskManager.scheduleTask({
      handlerId,
      parameters: [1],
      path: ['one'],
      lazy: false,
    });
    await taskManager.scheduleTask({
      handlerId,
      parameters: [2],
      path: ['two'],
      lazy: false,
    });
    await taskManager.scheduleTask({
      handlerId,
      parameters: [3],
      path: ['two'],
      lazy: false,
    });
    await taskManager.scheduleTask({
      handlerId,
      parameters: [4],
      path: ['group1', 'three'],
      lazy: false,
    });
    await taskManager.scheduleTask({
      handlerId,
      parameters: [5],
      path: ['group1', 'four'],
      lazy: false,
    });
    await taskManager.scheduleTask({
      handlerId,
      parameters: [6],
      path: ['group1', 'four'],
      lazy: false,
    });
    await taskManager.scheduleTask({
      handlerId,
      parameters: [7],
      path: ['group2', 'five'],
      lazy: false,
    });
    await taskManager.scheduleTask({
      handlerId,
      parameters: [8],
      path: ['group2', 'six'],
      lazy: false,
    });

    const listTasks = async (taskGroup: TaskPath) => {
      const taskManagerList: Array<Task> = [];
      for await (const task of taskManager.getTasks(
        undefined,
        true,
        taskGroup,
      )) {
        taskManagerList.push(task);
      }
      return taskManagerList;
    };

    expect(await listTasks(['one'])).toHaveLength(1);
    expect(await listTasks(['two'])).toHaveLength(2);
    expect(await listTasks(['group1'])).toHaveLength(3);
    expect(await listTasks(['group1', 'four'])).toHaveLength(2);
    expect(await listTasks(['group2'])).toHaveLength(2);
    expect(await listTasks([])).toHaveLength(8);
  });
  test('getTask', async () => {
    taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });

    const task1 = await taskManager.scheduleTask({
      handlerId,
      parameters: [1],
      lazy: false,
    });
    const task2 = await taskManager.scheduleTask({
      handlerId,
      parameters: [2],
      lazy: false,
    });

    const gotTask1 = await taskManager.getTask(task1.id, true);
    expect(task1.toString()).toEqual(gotTask1?.toString());
    const gotTask2 = await taskManager.getTask(task2.id, true);
    expect(task2.toString()).toEqual(gotTask2?.toString());
  });
  test('getTasks', async () => {
    taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });

    await taskManager.scheduleTask({ handlerId, parameters: [1], lazy: false });
    await taskManager.scheduleTask({ handlerId, parameters: [2], lazy: false });
    await taskManager.scheduleTask({ handlerId, parameters: [3], lazy: false });
    await taskManager.scheduleTask({ handlerId, parameters: [4], lazy: false });

    const taskList: Array<Task> = [];
    for await (const task of taskManager.getTasks()) {
      taskList.push(task);
    }

    expect(taskList.length).toBe(4);
  });
  test('updating tasks while scheduled', async () => {
    const handlerId1 = 'handler1' as TaskHandlerId;
    const handlerId2 = 'handler2' as TaskHandlerId;
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId1]: handler1, [handlerId2]: handler2 },
      lazy: true,
      logger,
    });

    const task1 = await taskManager.scheduleTask({
      handlerId: handlerId1,
      delay: 100000,
      parameters: [],
      lazy: false,
    });
    await taskManager.updateTask(task1.id, {
      handlerId: handlerId2,
      delay: 0,
      parameters: [1],
      priority: 100,
      deadline: 100,
      path: ['newPath'],
    });

    // Task should be updated
    const oldTask = await taskManager.getTask(task1.id);
    if (oldTask == null) utils.never();
    expect(oldTask.id.equals(task1.id)).toBeTrue();
    expect(oldTask.handlerId).toEqual(handlerId2);
    expect(oldTask.delay).toBe(0);
    expect(oldTask.parameters).toEqual([1]);
    expect(oldTask.priority).toEqual(100);
    expect(oldTask.deadline).toEqual(100);
    expect(oldTask.path).toEqual(['newPath']);

    // Path should've been updated
    let task_: Task | undefined;
    for await (const task of taskManager.getTasks(undefined, true, [
      'newPath',
    ])) {
      task_ = task;
      expect(task.id.equals(task1.id)).toBeTrue();
    }
    expect(task_).toBeDefined();

    await taskManager.stop();
  });
  test('updating tasks while queued or active should fail', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_ctx, _taskInfo, value) => value);
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });
    // @ts-ignore: private method, only schedule tasks
    await taskManager.startScheduling();
    const task1 = await taskManager.scheduleTask({
      handlerId,
      delay: 0,
      parameters: [],
      lazy: false,
    });
    await utils.poll(
      async () => {
        return (await taskManager.getTask(task1.id))!.status;
      },
      (_: any, status?: TaskStatus) => {
        return status === 'queued';
      },
      10,
      { timer: 1000 },
    );
    await expect(
      taskManager.updateTask(task1.id, {
        delay: 1000,
        parameters: [1],
      }),
    ).rejects.toThrow(tasksErrors.ErrorTaskRunning);
    // Task has not been updated
    const oldTask = await taskManager.getTask(task1.id);
    if (oldTask == null) utils.never();
    expect(oldTask.delay).toBe(0);
    expect(oldTask.parameters).toEqual([]);
    await taskManager.stop();
  });
  test('updating tasks delay should update schedule timer', async () => {
    const handlerId1 = 'handler1' as TaskHandlerId;
    const handlerId2 = 'handler2' as TaskHandlerId;
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    handler1.mockImplementation(async (_ctx, _taskInfo, value) => value);
    handler2.mockImplementation(async (_ctx, _taskInfo, value) => value);
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId1]: handler1, [handlerId2]: handler2 },
      lazy: true,
      logger,
    });
    const task1 = await taskManager.scheduleTask({
      handlerId: handlerId1,
      delay: 100000,
      parameters: [],
      lazy: false,
    });
    const task2 = await taskManager.scheduleTask({
      handlerId: handlerId1,
      delay: 100000,
      parameters: [],
      lazy: false,
    });
    await taskManager.updateTask(task1.id, {
      delay: 0,
      parameters: [1],
    });
    // Task should be updated
    const newTask = await taskManager.getTask(task1.id);
    if (newTask == null) utils.never();
    expect(newTask.delay).toBe(0);
    expect(newTask.parameters).toEqual([1]);
    // Task should resolve with new parameter
    await taskManager.startProcessing();
    await expect(task1.promise()).resolves.toBe(1);
    expect(handler1).toHaveBeenCalledTimes(1);
    // Updating task should update existing timer
    await taskManager.updateTask(task2.id, {
      delay: 0,
      parameters: [1],
      handlerId: handlerId2,
    });
    await expect(task2.promise()).resolves.toBe(1);
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
    await taskManager.stop();
  });
  test('task should run after scheduled delay', async () => {
    const handler = jest.fn();
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });
    // Edge case delays
    // same as 0 delay
    const task0 = await taskManager.scheduleTask({
      handlerId,
      delay: NaN,
      lazy: false,
    });
    // Same as max delay - never gets executed
    const taskInfinite = await taskManager.scheduleTask({
      handlerId,
      delay: Infinity,
      lazy: false,
    });
    // Normal delays
    const task500 = await taskManager.scheduleTask({
      handlerId,
      delay: 500,
      lazy: false,
    });
    const task1000 = await taskManager.scheduleTask({
      handlerId,
      delay: 1000,
      lazy: false,
    });
    const task1500 = await taskManager.scheduleTask({
      handlerId,
      delay: 1500,
      lazy: false,
    });
    expect(handler).toHaveBeenCalledTimes(0);
    await taskManager.startProcessing();
    await task0.promise();
    expect(handler).toHaveBeenCalledTimes(1);
    await task500.promise();
    expect(handler).toHaveBeenCalledTimes(2);
    await task1000.promise();
    expect(handler).toHaveBeenCalledTimes(3);
    await task1500.promise();
    expect(handler).toHaveBeenCalledTimes(4);
    await taskManager.stop();
    expect(taskInfinite.status).toBe('scheduled');
    expect(taskInfinite.deadline).toBe(Infinity);
  });
  test('queued tasks should be started in priority order', async () => {
    const handler = jest.fn();
    const { p: pendingP, resolveP: resolvePendingP } = utils.promise();
    const totalTasks = 31;
    const completedTaskOrder: Array<number> = [];
    handler.mockImplementation(async (_ctx, _taskInfo, priority) => {
      completedTaskOrder.push(priority);
      if (completedTaskOrder.length >= totalTasks) resolvePendingP();
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });
    const expectedTaskOrder: Array<number> = [];
    const taskIds: Array<TaskId> = [];
    for (let i = 0; i < totalTasks; i += 1) {
      const priority = 150 - i * 10;
      expectedTaskOrder.push(priority);
      const task = await taskManager.scheduleTask({
        handlerId,
        parameters: [priority],
        priority,
        lazy: false,
      });
      taskIds.push(task.id);
    }
    // @ts-ignore: start scheduling first
    await taskManager.startScheduling();
    // Wait for all tasks to be queued
    await utils.poll(
      async () => {
        const tasks = await Promise.all(
          taskIds.map((id) => taskManager.getTask(id)),
        );
        return tasks.map((task) => task!.status);
      },
      (_: any, statuses?: Array<TaskStatus>) => {
        return statuses!.every((status) => status === 'queued');
      },
      10,
      { timer: 1000 },
    );
    // @ts-ignore: Then queueing, which makes the tasks active
    await taskManager.startQueueing();
    // Wait for all tasks to complete
    await pendingP;
    expect(completedTaskOrder).toEqual(expectedTaskOrder);
    await taskManager.stop();
  });
  test('task exceeding deadline should abort and clean up', async () => {
    const handler = jest.fn();
    const { p: pauseP, resolveP: resolvePauseP } = utils.promise();
    handler.mockImplementation(async (ctx: ContextTimed) => {
      const abortP = new Promise((_, reject) =>
        ctx.signal.addEventListener('abort', () => reject(ctx.signal.reason)),
      );
      await Promise.race([pauseP, abortP]);
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });
    const task = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      deadline: 100,
      lazy: false,
    });
    await taskManager.startProcessing();
    // Cancellation should reject promise
    const taskPromise = task.promise();
    await expect(taskPromise).rejects.toThrow(tasksErrors.ErrorTaskTimeOut);
    // Task should be cleaned up
    const oldTask = await taskManager.getTask(task.id);
    expect(oldTask).toBeUndefined();
    resolvePauseP();
    await taskManager.stop();
  });
});
