import Tasks from '@/tasks/Tasks';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as fc from 'fast-check';
import { Task, TaskHandlerId } from '../../src/tasks/types';
import { promise, sleep } from '@/utils';
import { Lock } from '@matrixai/async-locks';
import timer from '@/timer/Timer';
import { Timer } from '@/timer/index';

// TODO: move to testing utils
const scheduleCall = <T>(
  s: fc.Scheduler,
  f: () => Promise<T>,
  label: string = 'scheduled call',
) => s.schedule(Promise.resolve(label)).then(() => f());

describe(Tasks.name, () => {
  const logger = new Logger(`${Tasks.name} test`, LogLevel.DEBUG, [
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
    jest.useRealTimers();
    await db.stop();
    await fs.promises.rm(dataDir, {recursive: true, force: true});
    logger.info('CLEANED UP');
  })


  test('can start and stop', async () => {
    const tasks = await Tasks.createTasks({
      db,
      lazy: false,
      logger
    });
    await tasks.stop();
    await tasks.start();
    await tasks.stop();
  });
  // TODO: use timer mocking to speed up testing
  test('tasks persist between Tasks object creation', async () => {
    let tasks = await Tasks.createTasks({
      db,
      lazy: true,
      logger,
    });
    const handlerId = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    tasks.registerHandler(handlerId, handler);

    await tasks.startProcessing();
    await tasks.scheduleTask({ handlerId , parameters: [1], delay: 1000, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [2], delay: 100, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [3], delay: 2000, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [4], delay: 10, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [5], delay: 10, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [6], delay: 10, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [7], delay: 3000, lazy: true });

    await sleep(500);
    logger.info('STOPPING');
    await tasks.stop();
    expect(handler).toHaveBeenCalledTimes(4);

    logger.info('CREATING');
    handler.mockClear();
    tasks = await Tasks.createTasks({
      db,
      lazy: true,
      logger,
    });
    tasks.registerHandler(handlerId, handler);
    await tasks.startProcessing();
    await sleep(4000);
    logger.info('STOPPING AGAIN');
    await tasks.stop();
    expect(handler).toHaveBeenCalledTimes(3);
  });
  // TODO: use timer mocking to speed up testing
  test('tasks persist between Tasks stop and starts', async () => {
    const tasks = await Tasks.createTasks({
      db,
      lazy: true,
      logger,
    });
    const handlerId = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    tasks.registerHandler(handlerId, handler);

    await tasks.startProcessing();
    await tasks.scheduleTask({ handlerId , parameters: [1], delay: 1000, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [2], delay: 100, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [3], delay: 2000, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [4], delay: 10, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [5], delay: 10, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [6], delay: 10, lazy: true });
    await tasks.scheduleTask({ handlerId , parameters: [7], delay: 3000, lazy: true });

    await sleep(500);
    logger.info('STOPPING');
    await tasks.stop();
    expect(handler).toHaveBeenCalledTimes(4);
    handler.mockClear();
    logger.info('STARTING');
    await tasks.start();
    await sleep(4000);
    logger.info('STOPPING AGAIN');
    await tasks.stop();
    expect(handler).toHaveBeenCalledTimes(3);
  });
  // FIXME: needs more experimenting to get this to work.
  test('tasks persist between Tasks stop and starts TIMER FAKING', async () => {
    const tasks = await Tasks.createTasks({
      db,
      lazy: true,
      logger,
    });
    const handlerId = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    tasks.registerHandler(handlerId, handler);
    console.log('a');
    await tasks.scheduleTask({ handlerId , parameters: [1], delay: 1000 });
    const t1 = await tasks.scheduleTask({ handlerId , parameters: [1], delay: 100, lazy: false });
    await tasks.scheduleTask({ handlerId , parameters: [1], delay: 2000 });
    await tasks.scheduleTask({ handlerId , parameters: [1], delay: 10 });
    await tasks.scheduleTask({ handlerId , parameters: [1], delay: 10 });
    await tasks.scheduleTask({ handlerId , parameters: [1], delay: 10 });
    await tasks.scheduleTask({ handlerId , parameters: [1], delay: 3000 });

    // setting up actions
    jest.useFakeTimers()
    setTimeout(async () => {
      console.log('starting processing');
      await tasks.startProcessing();
    }, 0);
    setTimeout(async () => {
      console.log('stop');
      await tasks.stop();
    }, 500);
    setTimeout(async () => {
      console.log('start');
      await tasks.start();
    }, 1000);

    // Running tests here...
    // after 600 ms we should stop and 4 tasks should've run
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
    await tasks.stop();
    console.log('b');
  });
  // TODO: Use fastCheck here
  test('activeLimit is enforced', async () => {
    // const mockedTimers = jest.useFakeTimers();
    const taskArb = fc.record({
      delay: fc.integer({min: 0, max : 1000}),
      // priority: fc.integer({min: -200, max: 200}),
    })
    const tasksArb = fc.array(taskArb, {minLength: 10, maxLength: 50})
    await fc.assert(
      fc.asyncProperty(fc.scheduler(), fc.scheduler(), tasksArb, async (sCall, sHandle, tasksDatas) => {
        console.log('a');
        const tasks = await Tasks.createTasks({
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
          logger.info(`ACTIVE TASKS: ${tasks.activeTasks}`)
          await sHandle.schedule(Promise.resolve());
          handledTaskCount += 1;
        })
        tasks.registerHandler(handlerId, handler);
        console.log('a');
        await tasks.startProcessing();
        console.log('a');

        // Scheduling tasks to be scheduled
        const calls: Array<Promise<void>> = [];
        const pendingTasks: Array<Task> = [];
        console.log('a');
        for (const tasksData of tasksDatas) {
          calls.push(scheduleCall(sCall, async () => {
              const task = await tasks.scheduleTask({
                delay: tasksData.delay,
                handlerId,
                lazy: false,
              })
              pendingTasks.push(task);
            }
          , `delay: ${tasksData.delay}`));
        }

        while (handledTaskCount < tasksDatas.length){
          await sleep(10);
          logger.info(`handledTaskCount: ${handledTaskCount}`);
          // Advance time and check expectations until all tasks are complete
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
        await tasks.stop();
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
    handler.mockImplementation(async (number: number) => {
      resolvedTasks.set(number, (resolvedTasks.get(number) ?? 0) + 1);
      if (resolvedTasks.size >= totalTasks) await lockReleaser();
    });
    const tasks = await Tasks.createTasks({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    await db.withTransactionF(async tran => {
      for (let i = 0; i < totalTasks; i++) {
        await tasks.scheduleTask({
          handlerId,
          parameters: [i],
          lazy: true,
        }, tran);
      }
    })

    await pendingLock.waitForUnlock();
    // Each task called exactly once
    resolvedTasks.forEach((value) => expect(value).toEqual(1));

    await tasks.stop();
    expect(handler).toHaveBeenCalledTimes(totalTasks);
  });
  // TODO: use fastCheck
  test('awaited taskPromises resolve', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const tasks = await Tasks.createTasks({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskSucceed = await tasks.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false,
    })

    // Promise should succeed with result
    const taskSucceedP = taskSucceed!.promise();
    await expect(taskSucceedP).resolves.toBe(true);

    await tasks.stop();
  });
  // TODO: use fastCheck
  test('awaited taskPromises reject', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const tasks = await Tasks.createTasks({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskFail = await tasks.scheduleTask({
      handlerId,
      parameters: [false],
      lazy: false,
    })

    // Promise should throw
    const taskFailP = taskFail.promise();
    await expect(taskFailP).rejects.toThrow();

    await tasks.stop();
  });
  // TODO: use fastCheck
  test('awaited taskPromises resolve or reject', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const tasks = await Tasks.createTasks({
      db,
      handlers: { [handlerId]: handler },
      logger,
    });

    const taskFail = await tasks.scheduleTask({
      handlerId,
      parameters: [false],
      lazy: false,
    })

    const taskSuccess = await tasks.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false,
    })

    // Promise should succeed with result
    const taskSucceedP = taskSuccess.promise();
    await expect(taskSucceedP).resolves.toBe(true);
    const taskFailP = taskFail.promise();
    await expect(taskFailP).rejects.toThrow();

    await tasks.stop();
  });
  test.todo('tasks fail with no handler');
  test.todo('tasks fail with unregistered handler');
  test('eager taskPromise resolves when awaited after task completion', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const tasks = await Tasks.createTasks({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });

    const taskSucceed1 = await tasks.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false
    });
    await tasks.startProcessing();
    await expect(taskSucceed1.promise()).resolves.toBe(true);
    const taskSucceed2 = await tasks.scheduleTask({
      handlerId,
      parameters: [true],
      lazy: false
    });
    await expect(taskSucceed2.promise()).resolves.toBe(true);
    await tasks.stop();
  });
  test('lazy taskPromise rejects when awaited after task completion', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => {
    });
    const tasks = await Tasks.createTasks({
      db,
      handlers: { [handlerId]: handler },
      lazy: true,
      logger,
    });

    const taskSucceed = await tasks.scheduleTask({
      handlerId,
      parameters: [],
      lazy: true
    });
    const taskProm = tasks.getTaskPromise(taskSucceed.id);
    await tasks.startProcessing();
    await taskProm;
    await expect(taskSucceed.promise()).rejects.toThrow();
    await tasks.stop();
  });
  test('Task Promises should be singletons', async () => {
    const tasks = await Tasks.createTasks({
      db,
      lazy: true,
      logger,
    });

    const task1 = await tasks.scheduleTask({
      handlerId,
      parameters: [],
      lazy: false
    });
    const task2 = await tasks.scheduleTask({
      handlerId,
      parameters: [],
      lazy: true
    });
    expect(task1.promise()).toBe(task1.promise());
    expect(task1.promise()).toBe(tasks.getTaskPromise(task1.id));
    expect(tasks.getTaskPromise(task1.id)).toBe(tasks.getTaskPromise(task1.id));
    expect(task2.promise()).toBe(task2.promise());
    expect(task2.promise()).toBe(tasks.getTaskPromise(task2.id));
    expect(tasks.getTaskPromise(task2.id)).toBe(tasks.getTaskPromise(task2.id));
    await tasks.stop();
  });
  test.todo('can cancel scheduled task, clean up and reject taskPromise');
  test.todo('can cancel queued task, clean up and reject taskPromise');
  test.todo('can cancel active task, clean up and reject taskPromise');
  test.todo('incomplete active tasks cleaned up during startup');
  test.todo('stopping should gracefully end active tasks');
  test('tests for taskPath', async () => {
    const tasks = await Tasks.createTasks({
      db,
      lazy: true,
      logger,
    });

    throw Error('IMP')
  });
  test.todo('getTask')
  test.todo('getTasks')
  test.todo('updating tasks while scheduled');
  test.todo('updating tasks while queued or active should fail');
  test.todo('updating tasks delay should update schedule timer');
  test.todo('task should run after scheduled delay');
  test.todo('queued tasks should be started in priority order');
  test.todo('task exceeding deadline should abort and clean up');
  test.todo('scheduled task times should not conflict');
  // TODO: this should move the clock backwards with mocking
  test.todo('taskIds are monotonic');
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
    await context.tasks.scheduleTask({
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
    const context = {tasks: {}}
    for (const command of commands) {
      await command(context);
    }
  }), {numRuns: 2})
})
