import type { TaskHandlerId, TaskId, TaskGroup } from '../../src/tasks/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { sleep } from '@matrixai/async-locks/dist/utils';
import KeyManager from '@/keys/KeyManager';
import Scheduler from '@/tasks/Scheduler';
import * as keysUtils from '@/keys/utils';
import { globalRootKeyPems } from '../fixtures/globalRootKeyPems';
import EventEmitter from 'events';
import { IdInternal } from '@matrixai/id';

describe(Scheduler.name, () => {
  const password = 'password';
  const logger = new Logger(`${Scheduler.name} test`, LogLevel.INFO, [
    new StreamHandler(),
  ]);
  let keyManager: KeyManager;
  let dbKey: Buffer;
  let dbPath: string;
  let db: DB;
  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = `${dataDir}/keys`;
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
      privateKeyPemOverride: globalRootKeyPems[0],
    });
    dbKey = await keysUtils.generateKey();
    dbPath = `${dataDir}/db`;
  });
  beforeEach(async () => {
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
  });
  afterEach(async () => {
    await db.stop();
    await db.destroy();
  });
  test('can add tasks with scheduled delay', async () => {
    const scheduler = await Scheduler.createScheduler({
      db,
      keyManager,
      logger,
      concurrencyLimit: 2,
    });
    const taskHandler = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => sleep(100));
    scheduler.registerHandler(taskHandler, handler);

    await scheduler.start();
    await scheduler.scheduleTask(taskHandler, [1], 1000);
    await scheduler.scheduleTask(taskHandler, [2], 100);
    await scheduler.scheduleTask(taskHandler, [3], 2000);
    await scheduler.scheduleTask(taskHandler, [4], 10);
    await scheduler.scheduleTask(taskHandler, [5], 10);
    await scheduler.scheduleTask(taskHandler, [6], 10);
    await scheduler.scheduleTask(taskHandler, [7], 3000);
    await sleep(4000);
    await scheduler.stop();
    expect(handler).toHaveBeenCalledTimes(7);
  });
  test('scheduled tasks persist', async () => {
    const scheduler = await Scheduler.createScheduler({
      db,
      keyManager,
      logger,
      concurrencyLimit: 2,
    });
    const taskHandler = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => sleep(100));
    scheduler.registerHandler(taskHandler, handler);

    await scheduler.start();
    await scheduler.scheduleTask(taskHandler, [1], 1000);
    await scheduler.scheduleTask(taskHandler, [2], 100);
    await scheduler.scheduleTask(taskHandler, [3], 2000);
    await scheduler.scheduleTask(taskHandler, [4], 10);
    await scheduler.scheduleTask(taskHandler, [5], 10);
    await scheduler.scheduleTask(taskHandler, [6], 10);
    await scheduler.scheduleTask(taskHandler, [7], 3000);
    await sleep(500);
    await scheduler.stop();

    logger.info('intermission!!!!');

    await scheduler.start();
    await sleep(10000);
    await scheduler.stop();
    expect(handler).toHaveBeenCalledTimes(7);
  });
  test.todo('Scheculed tasks get moved to queue after delay');
  test('tasks can have an optional group', async () => {
    const scheduler = await Scheduler.createScheduler({
      db,
      keyManager,
      logger,
      delay: true,
      concurrencyLimit: 2,
    });
    const taskHandler = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => sleep(100));
    scheduler.registerHandler(taskHandler, handler);

    await scheduler.scheduleTask(taskHandler, [1], 0, undefined, ['one']);
    await scheduler.scheduleTask(taskHandler, [2], 0, undefined, ['two']);
    await scheduler.scheduleTask(taskHandler, [3], 0, undefined, ['two']);
    await scheduler.scheduleTask(taskHandler, [3], 0, undefined, [
      'group1',
      'three',
    ]);
    await scheduler.scheduleTask(taskHandler, [3], 0, undefined, [
      'group1',
      'four',
    ]);
    await scheduler.scheduleTask(taskHandler, [3], 0, undefined, [
      'group1',
      'four',
    ]);
    await scheduler.scheduleTask(taskHandler, [3], 0, undefined, [
      'group2',
      'five',
    ]);
    await scheduler.scheduleTask(taskHandler, [3], 0, undefined, [
      'group2',
      'six',
    ]);

    const listTasks = async (taskGroup: TaskGroup) => {
      const tasks: Array<TaskId> = [];
      for await (const task of scheduler.getGroupTasks(taskGroup)) {
        tasks.push(task);
      }
      return tasks;
    };

    expect(await listTasks(['one'])).toHaveLength(1);
    expect(await listTasks(['two'])).toHaveLength(2);
    expect(await listTasks(['group1'])).toHaveLength(3);
    expect(await listTasks(['group1', 'four'])).toHaveLength(2);
    expect(await listTasks(['group2'])).toHaveLength(2);
    expect(await listTasks([])).toHaveLength(8);

    await scheduler.stop();
  });
  test.todo('tasks timestamps are unique on taskId');
  test.todo('can remove scheduled tasks');
  test.todo('can not remove active tasks');
  test('completed tasks emit events', async () => {
    const scheduler = await Scheduler.createScheduler({
      db,
      keyManager,
      logger,
      delay: true,
      concurrencyLimit: 2,
    });
    const taskHandler = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async (num) => {
      if (num % 3 === 0) throw Error('three');
      return num
    });
    scheduler.registerHandler(taskHandler, handler);

    const tasks: Array<TaskId> = [];
    const events: Array<any> = [];
    const pushTask = async (param) => {
      const task = await scheduler.scheduleTask(taskHandler, param, 0)
      const taskId = task!.id;
      tasks.push(taskId);
      // @ts-ignore: private property
      scheduler.taskEvents.once(taskId.toMultibase('base32hex'), (...values) => events.push(values));
    };

    await pushTask([1])
    await pushTask([2])
    await pushTask([3])
    await pushTask([4])

    for (const taskId of tasks) {
      // @ts-ignore: private method
      await scheduler.handleTask(taskId).catch(() => {});
    }
    console.log(events);
    expect(events).toHaveLength(4);

    await scheduler.stop();
  });
  test('can await a task promise', async () => {
    const scheduler = await Scheduler.createScheduler({
      db,
      keyManager,
      logger,
      delay: true,
      concurrencyLimit: 2,
    });
    const taskHandler = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    scheduler.registerHandler(taskHandler, handler);

    const taskSucceed = await scheduler.scheduleTask(taskHandler, [true], 0);
    const taskFail = await scheduler.scheduleTask(taskHandler, [false], 0);

    // If we get a 2nd task promise, it should be the same promise
    const prom1 = scheduler.getTaskP(taskSucceed!.id);
    const prom2 = scheduler.getTaskP(taskSucceed!.id);
    expect(prom1).toBe(prom2);
    expect(prom1).toBe(taskSucceed!.promise);

    // promises should succeed and fail respectively
    const taskSucceedP = taskSucceed!.promise;
    const taskFailP = taskFail!.promise;
    await scheduler.startProcessing();

    await expect(taskSucceedP).resolves.toBe(true);
    await expect(taskFailP).rejects.toBeInstanceOf(Error);

    // Task promise will throw an error if task not found
    const invalidTask = scheduler.getTaskP(IdInternal.fromBuffer<TaskId>(Buffer.alloc(16, 0)));
    await expect(invalidTask).rejects.toThrow();
    // Finished tasks should be invalid as well
    await expect(taskSucceed?.promise).rejects.toThrow();


    await scheduler.stop();
  });
});

test('events', async () => {
  const taskEvents = new EventEmitter();
  taskEvents.on('lol', (...args) => console.log(...args));
  taskEvents.emit('lol', 1)
  taskEvents.emit('lol', 2)
  taskEvents.emit('lol', 3,4)
})
