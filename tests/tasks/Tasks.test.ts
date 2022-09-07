import Tasks from '@/tasks/Tasks';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as fc from 'fast-check';
import { Task, TaskHandlerId } from '../../src/tasks/types';
import { sleep } from '@matrixai/async-locks/dist/utils';

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
    jest.useRealTimers();
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
  test.todo('tasks persist between Tasks object creation');
  test.todo('tasks persist between Tasks stop and starts');
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
  test.todo('tasks are handled exactly once per task');
  // TODO: use fastCheck
  test.todo('awaited taskPromises resolve');
  // TODO: use fastCheck
  test.todo('awaited taskPromises reject');
  // TODO: use fastCheck
  test.todo('awaited taskPromises resolve and reject');
  test.todo('tasks fail with no handler');
  test.todo('tasks fail with unregistered handler');
  test.todo('eager taskPromise resolves when awaited after task completion');
  test.todo('lazy taskPromise rejects when awaited after task completion');
  test.todo('incomplete active tasks cleaned up during startup');
  test.todo('stopping should gracefully end active tasks');
  test.todo('tests for taskPath');
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
