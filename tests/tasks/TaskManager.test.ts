import TaskManager from '@/tasks/TaskManager';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as fc from 'fast-check';
import { Task, TaskHandlerId, TaskPath } from '../../src/tasks/types';
import { promise, sleep, never } from '@/utils';
import * as utils from '@/utils/index';
import { Lock } from '@matrixai/async-locks';
import { Timer } from '@/timer/index';
import * as tasksErrors from '@/tasks/errors';
import { ContextTimed } from '../../dist/contexts/types';

// TODO: move to testing utils
const scheduleCall = <T>(
  s: fc.Scheduler,
  f: () => Promise<T>,
  label: string = 'scheduled call',
) => s.schedule(Promise.resolve(label)).then(() => f());

describe(TaskManager.name, () => {
  const logger = new Logger(`${TaskManager.name} test`, LogLevel.DEBUG, [
    new StreamHandler(),
  ]);
  const handlerId = 'testId' as TaskHandlerId;
  let dataDir: string;
  let db: DB;


  beforeEach(async () => {
    logger.info('SETTING UP');
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    logger.info('SET UP');
  });
  afterEach(async () => {
    logger.info('CLEANING UP');
    await db.stop();
    await fs.promises.rm(dataDir, {recursive: true, force: true});
    logger.info('CLEANED UP');
  })


  test('can start and stop', async () => {
    const taskManager = await TaskManager.createTaskManager({
      db,
      lazy: false,
      logger
    });
    await taskManager.stop();
    await taskManager.start();
    await taskManager.stop();
  });
  // TODO: use timer mocking to speed up testing
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
    await taskManager.scheduleTask({ handlerId , parameters: [1], delay: 1000, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [2], delay: 100, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [3], delay: 2000, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [4], delay: 10, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [5], delay: 10, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [6], delay: 10, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [7], delay: 3000, lazy: true });

    await sleep(500);
    logger.info('STOPPING');
    await taskManager.stop();
    expect(handler).toHaveBeenCalledTimes(4);

    logger.info('CREATING');
    handler.mockClear();
    taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });
    taskManager.registerHandler(handlerId, handler);
    await taskManager.startProcessing();
    await sleep(4000);
    logger.info('STOPPING AGAIN');
    await taskManager.stop();
    expect(handler).toHaveBeenCalledTimes(3);
  });
  // TODO: use timer mocking to speed up testing
  test('tasks persist between Tasks stop and starts', async () => {
    const taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });
    const handlerId = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    taskManager.registerHandler(handlerId, handler);

    await taskManager.startProcessing();
    await taskManager.scheduleTask({ handlerId , parameters: [1], delay: 1000, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [2], delay: 100, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [3], delay: 2000, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [4], delay: 10, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [5], delay: 10, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [6], delay: 10, lazy: true });
    await taskManager.scheduleTask({ handlerId , parameters: [7], delay: 3000, lazy: true });

    await sleep(500);
    logger.info('STOPPING');
    await taskManager.stop();
    expect(handler).toHaveBeenCalledTimes(4);
    handler.mockClear();
    logger.info('STARTING');
    await taskManager.start();
    await sleep(4000);
    logger.info('STOPPING AGAIN');
    await taskManager.stop();
    expect(handler).toHaveBeenCalledTimes(3);
  });
  // FIXME: needs more experimenting to get this to work.
  test.skip('tasks persist between Tasks stop and starts TIMER FAKING', async () => {
    const taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });
    const handlerId = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    taskManager.registerHandler(handlerId, handler);
    console.log('a');
    await taskManager.scheduleTask({ handlerId , parameters: [1], delay: 1000 });
    const t1 = await taskManager.scheduleTask({ handlerId , parameters: [1], delay: 100, lazy: false });
    await taskManager.scheduleTask({ handlerId , parameters: [1], delay: 2000 });
    await taskManager.scheduleTask({ handlerId , parameters: [1], delay: 10 });
    await taskManager.scheduleTask({ handlerId , parameters: [1], delay: 10 });
    await taskManager.scheduleTask({ handlerId , parameters: [1], delay: 10 });
    await taskManager.scheduleTask({ handlerId , parameters: [1], delay: 3000 });

    // setting up actions
    jest.useFakeTimers()
    setTimeout(async () => {
      console.log('starting processing');
      await taskManager.startProcessing();
    }, 0);
    setTimeout(async () => {
      console.log('stop');
      await taskManager.stop();
    }, 500);
    setTimeout(async () => {
      console.log('start');
      await taskManager.start();
    }, 1000);

    // Running tests here...
    // after 600 ms we should stop and 4 taskManager should've run
    console.log('b');
    jest.advanceTimersByTime(400);
    jest.runAllTimers();
    console.log('b');
    jest.advanceTimersByTime(200);
    console.log('b');
    console.log(jest.getTimerCount());
    jest.runAllTimers();
    console.log(jest.getTimerCount());
    await t1.promise();
    console.log('b');
    expect(handler).toHaveBeenCalledTimes(4);
    // After another 5000ms the rest should've been called
    console.log('b');
    handler.mockClear();
    console.log('b');
    jest.advanceTimersByTime(5000);
    console.log('b');
    // expect(handler).toHaveBeenCalledTimes(3);
    console.log('b');
    jest.useRealTimers();
    console.log('b');
    await taskManager.stop();
    console.log('b');
  });
  // TODO: Use fastCheck here, this needs to be re-written
  test('activeLimit is enforced', async () => {
    // const mockedTimers = jest.useFakeTimers();
    const taskArb = fc.record({
      delay: fc.integer({min: 0, max : 1000}),
      // priority: fc.integer({min: -200, max: 200}),
    })
    const taskManagerArb = fc.array(taskArb, {minLength: 10, maxLength: 50})
    await fc.assert(
      fc.asyncProperty(fc.scheduler(), fc.scheduler(), taskManagerArb, async (sCall, sHandle, taskManagerDatas) => {
        console.log('a');
        const taskManager = await TaskManager.createTaskManager({
          activeLimit: 0,
          db,
          fresh: true,
          lazy: true,
          logger
        })
        console.log('a');
        let handledTaskCount = 0;
        const handlerId: TaskHandlerId = 'handlerId' as TaskHandlerId;
        const handler = jest.fn();
        handler.mockImplementation(async () => {
          // Schedule to resolve randomly
          logger.info(`ACTIVE TASKS: ${taskManager.activeCount}`)
          await sHandle.schedule(Promise.resolve());
          handledTaskCount += 1;
        })
        taskManager.registerHandler(handlerId, handler);
        console.log('a');
        await taskManager.startProcessing();
        console.log('a');

        // Scheduling taskManager to be scheduled
        const calls: Array<Promise<void>> = [];
        const pendingTasks: Array<Task> = [];
        console.log('a');
        for (const taskManagerData of taskManagerDatas) {
          calls.push(scheduleCall(sCall, async () => {
              const task = await taskManager.scheduleTask({
                delay: taskManagerData.delay,
                handlerId,
                lazy: false,
              })
              pendingTasks.push(task);
            }
          , `delay: ${taskManagerData.delay}`));
        }

        while (handledTaskCount < taskManagerDatas.length){
          await sleep(10);
          logger.info(`handledTaskCount: ${handledTaskCount}`);
          // Advance time and check expectations until all taskManager are complete
          // mockedTimers.advanceTimersToNextTimer();
          console.log(sHandle.count(), sCall.count());
          while(sHandle.count() > 0) {
            await sHandle.waitOne();
            logger.info('resolving 1 handle');
          }
          // shoot off 5 each step
          if (sCall.count() > 0) {
            for (let i = 0; i < 5; i++) {
              await sCall.waitOne();
            }
          }
        }
        const promises = pendingTasks.map(task => task.promise());
        await Promise.all(calls).then(
          result => console.log(result),
          reason => {
            console.error(reason);
            throw reason;
          },
        )
        await Promise.all(promises).then(
          result => console.log(result),
          reason => {
            console.error(reason);
            throw reason;
          },
        )
        await taskManager.stop();
        console.log('done');
      }),
      { interruptAfterTimeLimit: globalThis.defaultTimeout - 2000, numRuns: 1 },
    );
  });
  // TODO: Use fastCheck for this
  test('tasks are handled exactly once per task', async () => {
    const handler = jest.fn();
    const pendingLock = new Lock();
    const [lockReleaser] = await pendingLock.lock()();
    const resolvedTasks = new Map<number, number>();
    const totalTasks = 50;
    handler.mockImplementation(async (_, number: number) => {
      resolvedTasks.set(number, (resolvedTasks.get(number) ?? 0) + 1);
      if (resolvedTasks.size >= totalTasks) await lockReleaser();
    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    await db.withTransactionF(async tran => {
      for (let i = 0; i < totalTasks; i++) {
        await taskManager.scheduleTask({
          handlerId,
          parameters: [i],
          lazy: true,
        }, tran);
      }
    })

    await pendingLock.waitForUnlock();
    // Each task called exactly once
    resolvedTasks.forEach((value) => expect(value).toEqual(1));

    await taskManager.stop();
    expect(handler).toHaveBeenCalledTimes(totalTasks);
  });
  // TODO: use fastCheck
  test('awaited taskPromises resolve', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_, fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskSucceed = await taskManager.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false,
    })

    // Promise should succeed with result
    const taskSucceedP = taskSucceed!.promise();
    await expect(taskSucceedP).resolves.toBe(true);

    await taskManager.stop();
  });
  // TODO: use fastCheck
  test('awaited taskPromises reject', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_, fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskFail = await taskManager.scheduleTask({
      handlerId,
      parameters: [false],
      lazy: false,
    })

    // Promise should throw
    const taskFailP = taskFail.promise();
    await expect(taskFailP).rejects.toThrow(Error);

    await taskManager.stop();
  });
  // TODO: use fastCheck
  test('awaited taskPromises resolve or reject', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_, fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskFail = await taskManager.scheduleTask({
      handlerId,
      parameters: [false],
      lazy: false,
    })

    const taskSuccess = await taskManager.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false,
    })

    // Promise should succeed with result
    await expect(taskSuccess.promise()).resolves.toBe(true);
    await expect(taskFail.promise()).rejects.toThrow(Error);

    await taskManager.stop();
  });
  test('tasks fail with no handler', async () => {
    const taskManager = await TaskManager.createTaskManager({
      db,
      logger,
    });

    const taskFail = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: false,
    })

    // Promise should throw
    const taskFailP = taskFail.promise();
    await expect(taskFailP).rejects.toThrow(tasksErrors.ErrorTaskHandlerMissing);

    await taskManager.stop();
  });
  test('tasks fail with unregistered handler', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_, fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskSucceed = await taskManager.scheduleTask({
      handlerId,
      parameters: [false],
      lazy: false,
    })

    // Promise should succeed
    const taskSucceedP = taskSucceed.promise();
    await expect(taskSucceedP).rejects.not.toThrow(tasksErrors.ErrorTaskHandlerMissing);

    // Deregister
    taskManager.deregisterHandler(handlerId);
    const taskFail = await taskManager.scheduleTask({
      handlerId,
      parameters: [false],
      lazy: false,
    })
    const taskFailP = taskFail.promise();
    await expect(taskFailP).rejects.toThrow(tasksErrors.ErrorTaskHandlerMissing);

    await taskManager.stop();
  });
  test('eager taskPromise resolves when awaited after task completion', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_, fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });

    const taskSucceed1 = await taskManager.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false
    });
    await taskManager.startProcessing();
    await expect(taskSucceed1.promise()).resolves.toBe(true);
    const taskSucceed2 = await taskManager.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false
    });
    await expect(taskSucceed2.promise()).resolves.toBe(true);
    await taskManager.stop();
  });
  test('lazy taskPromise rejects when awaited after task completion', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => {
    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });

    const taskSucceed = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: true
    });
    const taskProm = taskManager.getTaskPromise(taskSucceed.id);
    await taskManager.startProcessing();
    await taskProm;
    await expect(taskSucceed.promise()).rejects.toThrow();
    await taskManager.stop();
  });
  test('Task Promises should be singletons', async () => {
    const taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });

    const task1 = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: false
    });
    const task2 = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      lazy: true
    });
    expect(task1.promise()).toBe(task1.promise());
    expect(task1.promise()).toBe(taskManager.getTaskPromise(task1.id));
    expect(taskManager.getTaskPromise(task1.id)).toBe(taskManager.getTaskPromise(task1.id));
    expect(task2.promise()).toBe(task2.promise());
    expect(task2.promise()).toBe(taskManager.getTaskPromise(task2.id));
    expect(taskManager.getTaskPromise(task2.id)).toBe(taskManager.getTaskPromise(task2.id));
    await taskManager.stop();
  });
  test('can cancel scheduled task, clean up and reject taskPromise', async () => {
    const taskManager = await TaskManager.createTaskManager({
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

    // cancellation should reject promise
    const taskPromise = task1.promise();
    taskPromise.cancel('cancelled')
    await expect(taskPromise).rejects.toBe('cancelled');
    // should cancel without awaiting anything
    task2.cancel('cancelled');
    await sleep(200);

    // task should be cleaned up
    expect(await taskManager.getTask(task1.id)).toBeUndefined();
    expect(await taskManager.getTask(task2.id)).toBeUndefined();

    await taskManager.stop();
  });
  test('can cancel queued task, clean up and reject taskPromise', async () => {
    const taskManager = await TaskManager.createTaskManager({
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
    // @ts-ignore: private method
    await taskManager.startScheduling();
    await sleep(100);

    // cancellation should reject promise
    const taskPromise = task1.promise();
    taskPromise.cancel('cancelled')
    await expect(taskPromise).rejects.toBe('cancelled');
    task2.cancel('cancelled');
    await sleep(200);

    // task should be cleaned up
    expect(await taskManager.getTask(task1.id)).toBeUndefined();
    expect(await taskManager.getTask(task2.id)).toBeUndefined();

    await taskManager.stop();
  });
  test('can cancel active task, clean up and reject taskPromise', async () => {
    const handler = jest.fn();
    const pauseProm = promise();
    handler.mockImplementation(async (ctx: ContextTimed) => {
      const abortProm = new Promise(
        (resolve, reject) =>
          ctx.signal.addEventListener(
            'abort',
            () => reject(ctx.signal.reason)
          )
      );
      await Promise.race([
        pauseProm.p,
        abortProm,
      ])
    });
    const taskManager = await TaskManager.createTaskManager({
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
    await sleep(100);

    // cancellation should reject promise
    const taskPromise = task1.promise();
    taskPromise.cancel('cancelled')
    // await taskPromise.catch(reason => console.error(reason));
    await expect(taskPromise).rejects.toBe('cancelled');
    task2.cancel('cancelled');
    await sleep(200);

    // task should be cleaned up
    expect(await taskManager.getTask(task1.id, true)).toBeUndefined();
    expect(await taskManager.getTask(task2.id, true)).toBeUndefined();
    pauseProm.resolveP();

    await taskManager.stop() ;
  });
  test('incomplete active tasks cleaned up during startup', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });

    // seeding data
    const task = await taskManager.scheduleTask({
      handlerId,
      parameters: [],
      deadline: 100,
      lazy: false,
    });

    // Moving task to active in database
    const taskScheduleTime = task.scheduled.getTime()
    // @ts-ignore: private property
    const tasksScheduledDbPath = taskManager.tasksScheduledDbPath;
    // @ts-ignore: private property
    const tasksActiveDbPath = taskManager.tasksActiveDbPath
    const taskIdBuffer = task.id.toBuffer();
    await db.withTransactionF(async (tran) => {
      await tran.del([
        ...tasksScheduledDbPath,
        utils.lexiPackBuffer(taskScheduleTime),
        taskIdBuffer,
      ]);
      await tran.put([...tasksActiveDbPath, taskIdBuffer], null);
    });

    // task should be active
    const newTask1 = await taskManager.getTask(task.id);
    expect(newTask1!.status).toBe('active');

    // restart to clean up
    await taskManager.stop();
    await taskManager.start({lazy: true});

    // task should be back to queued
    const newTask2 = await taskManager.getTask(task.id, false);
    expect(newTask2!.status).toBe('queued');
    await taskManager.startProcessing();
    await newTask2!.promise();

    await taskManager.stop();
  });
  test('stopping should gracefully end active tasks', async () => {
    const handler = jest.fn();
    const pauseProm = promise();
    handler.mockImplementation(async (ctx: ContextTimed) => {
      const abortProm = new Promise(
        (resolve, reject) =>
          ctx.signal.addEventListener(
            'abort',
            () => reject(ctx.signal.reason)
          )
      );
      await Promise.race([
        pauseProm.p,
        abortProm,
      ])
    });
    const taskManager = await TaskManager.createTaskManager({
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
    await sleep(100);
    await taskManager.stopTasks();
    await taskManager.stop();

    // taskManager should still exist.
    await taskManager.start({lazy: true});
    expect(await taskManager.getTask(task1.id)).toBeDefined();
    expect(await taskManager.getTask(task2.id)).toBeDefined();
    await task1;
    await task2;

    await taskManager.stop();
  });
  test('tests for taskPath', async () => {
    const taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });

    await taskManager.scheduleTask({handlerId, parameters: [1], path: ['one'], lazy: true})
    await taskManager.scheduleTask({handlerId, parameters: [2], path: ['two'], lazy: true})
    await taskManager.scheduleTask({handlerId, parameters: [3], path: ['two'], lazy: true})
    await taskManager.scheduleTask({handlerId, parameters: [4], path: ['group1', 'three'], lazy: true})
    await taskManager.scheduleTask({handlerId, parameters: [5], path: ['group1', 'four'], lazy: true})
    await taskManager.scheduleTask({handlerId, parameters: [6], path: ['group1', 'four'], lazy: true})
    await taskManager.scheduleTask({handlerId, parameters: [7], path: ['group2', 'five'], lazy: true})
    await taskManager.scheduleTask({handlerId, parameters: [8], path: ['group2', 'six'], lazy: true})

    const listTasks = async (taskGroup: TaskPath) => {
      const taskManagerList: Array<Task> = [];
      for await (const task of taskManager.getTasks(undefined, true, taskGroup)) {
        taskManagerList.push(task);
      }
      return taskManagerList;
    };

    expect(await listTasks(['one'])).toHaveLength(1);
    expect(await listTasks(['two'])).toHaveLength(2);
    expect(await listTasks(['group1'])).toHaveLength(3);
    expect(await listTasks(['group1', 'four'])).toHaveLength(2);
    expect(await listTasks(['group2'])).toHaveLength(2);
    expect(await listTasks([])).toHaveLength(8)

  });
  test('getTask', async () => {
    const taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });

    const task1 = await taskManager.scheduleTask({handlerId, parameters: [1], lazy: true})
    const task2 = await taskManager.scheduleTask({handlerId, parameters: [2], lazy: true})

    const gotTask1 = await taskManager.getTask(task1.id, true);
    expect(task1.toString()).toEqual(gotTask1?.toString());
    const gotTask2 = await taskManager.getTask(task2.id, true);
    expect(task2.toString()).toEqual(gotTask2?.toString());

  })
  test('getTasks', async () => {
    const taskManager = await TaskManager.createTaskManager({
      db,
      lazy: true,
      logger,
    });

    await taskManager.scheduleTask({handlerId, parameters: [1], lazy: true})
    await taskManager.scheduleTask({handlerId, parameters: [2], lazy: true})
    await taskManager.scheduleTask({handlerId, parameters: [3], lazy: true})
    await taskManager.scheduleTask({handlerId, parameters: [4], lazy: true})

    const taskList: Array<Task> = [];
    for await (const task of taskManager.getTasks()){
      taskList.push(task);
    }

    expect(taskList.length).toBe(4);
  })
  test('updating tasks while scheduled', async () => {
    const handlerId1 = 'handler1' as TaskHandlerId;
    const handlerId2 = 'handler2' as TaskHandlerId;
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const taskManager = await TaskManager.createTaskManager({
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
    })

    // Task should be updated
    const oldTask = await taskManager.getTask(task1.id);
    if (oldTask == null) never();
    expect(oldTask.id.equals(task1.id)).toBeTrue();
    expect(oldTask.handlerId).toEqual(handlerId2);
    expect(oldTask.delay).toBe(0);
    expect(oldTask.parameters).toEqual([1]);
    expect(oldTask.priority).toEqual(100);
    expect(oldTask.deadline).toEqual(100);
    expect(oldTask.path).toEqual(['newPath']);

    // path should've been updated
    let task_: Task | undefined;
    for await (const task of taskManager.getTasks(undefined, true, ['newPath'])){
      task_ = task;
      expect(task.id.equals(task1.id)).toBeTrue();
    }
    expect(task_).toBeDefined();

    await taskManager.stop();
  });
  test('updating tasks while queued or active should fail', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (_, value) => value);
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });
    // @ts-ignore: private method, only schedule tasks
    await taskManager.startScheduling();

    logger.info('Scheduling task');
    const task1 = await taskManager.scheduleTask({
      handlerId,
      delay: 0,
      parameters: [],
      lazy: false,
    });

    await sleep(100);

    logger.info('Updating task');
    await expect(taskManager.updateTask(task1.id, {
      delay: 1000,
      parameters: [1],
    })).rejects.toThrow(tasksErrors.ErrorTaskRunning);

    // Task has not been updated
    const oldTask = await taskManager.getTask(task1.id);
    if (oldTask == null) never();
    expect(oldTask.delay).toBe(0);
    expect(oldTask.parameters).toEqual([]);

    await taskManager.stop();
  });
  test('updating tasks delay should update schedule timer', async () => {
    const handlerId1 = 'handler1' as TaskHandlerId;
    const handlerId2 = 'handler2' as TaskHandlerId;
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    handler1.mockImplementation(async (_, value) => value);
    handler2.mockImplementation(async (_, value) => value);

    const taskManager = await TaskManager.createTaskManager({
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
    })

    // Task should be updated
    const newTask = await taskManager.getTask(task1.id);
    if (newTask == null) never();
    expect(newTask.delay).toBe(0);
    expect(newTask.parameters).toEqual([1]);

    // task should resolve with new parameter
    await taskManager.startProcessing();
    await expect(task1.promise()).resolves.toBe(1);

    await sleep(100);
    expect(handler1).toHaveBeenCalledTimes(1);

    // updating task should update existing timer
    await taskManager.updateTask(task2.id, {
      delay: 0,
      parameters: [1],
      handlerId: handlerId2,
    })
    await expect(task2.promise()).resolves.toBe(1);
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);

    await taskManager.stop();
  });
  test('task should run after scheduled delay', async () => {
    const handler = jest.fn();
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });

    // edge case delays
    // same as 0 delay
    await taskManager.scheduleTask({
      handlerId,
      delay: NaN,
      lazy: true,
    });
    // same as max delay
    await taskManager.scheduleTask({
      handlerId,
      delay: Infinity,
      lazy: true,
    });

    // normal delays
    await taskManager.scheduleTask({
      handlerId,
      delay: 500,
      lazy: true,
    });
    await taskManager.scheduleTask({
      handlerId,
      delay: 1000,
      lazy: true,
    });
    await taskManager.scheduleTask({
      handlerId,
      delay: 1500,
      lazy: true,
    });

    expect(handler).toHaveBeenCalledTimes(0);
    await taskManager.startProcessing();
    await sleep(250);
    expect(handler).toHaveBeenCalledTimes(1);
    await sleep(500);
    expect(handler).toHaveBeenCalledTimes(2);
    await sleep(500);
    expect(handler).toHaveBeenCalledTimes(3);
    await sleep(500);
    expect(handler).toHaveBeenCalledTimes(4);

    await taskManager.stop();
  });
  test('queued tasks should be started in priority order', async () => {
    const handler = jest.fn();
    const pendingProm = promise();
    let totalTasks = 31;
    const completedTaskOrder: Array<number> = []
    handler.mockImplementation(async (_, priority) => {
      completedTaskOrder.push(priority);
      if (completedTaskOrder.length >= totalTasks) pendingProm.resolveP();

    });
    const taskManager = await TaskManager.createTaskManager({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });
    const expectedTaskOrder: Array<number> = [];
    for (let i = 0; i < totalTasks; i+=1) {
      const priority = 150 - (i * 10)
      expectedTaskOrder.push(priority);
      await taskManager.scheduleTask({
        handlerId,
        parameters: [priority],
        priority,
        lazy: true,
      });
    }

    // @ts-ignore: start scheduling first
    await taskManager.startScheduling();
    await sleep(500);
    // @ts-ignore: Then queueing
    await taskManager.startQueueing();
    // wait for all tasks to complete
    await pendingProm.p;
    expect(completedTaskOrder).toEqual(expectedTaskOrder);

    await taskManager.stop();
  });
  test('task exceeding deadline should abort and clean up', async () => {
    const handler = jest.fn();
    const pauseProm = promise();
    handler.mockImplementation(async (ctx: ContextTimed) => {
      const abortProm = new Promise(
        (resolve, reject) =>
          ctx.signal.addEventListener(
            'abort',
            () => reject(ctx.signal.reason)
          )
      );
      await Promise.race([
        pauseProm.p,
        abortProm,
      ])
    });
    const taskManager = await TaskManager.createTaskManager({
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

    // cancellation should reject promise
    const taskPromise = task.promise();
    //FIXME: check for deadline timeout error
    await expect(taskPromise).rejects.toThrow(tasksErrors.ErrorTaskTimeOut);

    // task should be cleaned up
    const oldTask = await taskManager.getTask(task.id);
    expect(oldTask).toBeUndefined();
    pauseProm.resolveP();

    await taskManager.stop();
  });
  test.todo('scheduled task times should not conflict');
  // TODO: this should move the clock backwards with mocking
  test.todo('taskIds are monotonic');
  // TODO: needs fast check
  test.todo('general concurrent API usage to test robustness');
});


test('test', async () => {
  jest.useFakeTimers();
  new Timer(() => console.log('test'), 100000);
  console.log('a');
  jest.advanceTimersByTime(100000);
  console.log('a');
  jest.useRealTimers();
})

test('arb', async () => {
  const taskArb = fc.record({
    handlerId: fc.constant('handlerId' as TaskHandlerId),
    delay: fc.integer({min: 10, max: 1000}),
    parameters: fc.constant([]),
    priority: fc.integer({min: -200, max: 200}),
  })

  const scheduleCommandArb = taskArb.map((taskSpec) => async (context) => {
    await context.taskManager.scheduleTask({
      ...taskSpec,
      lazy: false,
    })
  })

  const sleepCommandArb = fc.integer({min: 10, max: 1000})
    .map((value) => async (context) => {
      console.log('sleeping', value);
      await sleep(value)
  })

  const commandsArb = fc.array(fc.oneof(
    {arbitrary: scheduleCommandArb, weight: 1},
    {arbitrary: sleepCommandArb, weight: 1},
  ), {maxLength: 10, minLength: 10});

  await fc.assert( fc.asyncProperty(commandsArb , async (commands) => {
    const context = {taskManager: {}}
    for (const command of commands) {
      await command(context);
    }
  }), {numRuns: 2})
})
