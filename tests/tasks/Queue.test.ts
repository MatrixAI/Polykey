import type { TaskHandlerId, TaskId } from '../../src/tasks/types';
import type { TaskGroup } from '../../src/tasks/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { sleep } from '@matrixai/async-locks/dist/utils';
import { IdInternal } from '@matrixai/id';
import { promise } from 'encryptedfs/dist/utils';
import Scheduler from '@/tasks/Scheduler';
import Queue from '@/tasks/Queue';
import * as keysUtils from '@/keys/utils';
import * as tasksUtils from '@/tasks/utils';
import KeyManager from '@/keys/KeyManager';
import { globalRootKeyPems } from '../fixtures/globalRootKeyPems';

describe(Queue.name, () => {
  const password = 'password';
  const logger = new Logger(`${Scheduler.name} test`, LogLevel.INFO, [
    new StreamHandler(),
  ]);
  let dbKey: Buffer;
  let dbPath: string;
  let db: DB;
  let keyManager: KeyManager;
  const handlerId = 'testId' as TaskHandlerId;

  const pushTask = async (
    queue: Queue,
    handlerId,
    params: Array<any>,
    lazy = true,
  ) => {
    const task = await queue.createTask(
      handlerId,
      params,
      undefined,
      undefined,
      lazy,
    );
    const timestampBuffer = tasksUtils.makeTaskTimestampKey(
      task.timestamp,
      task.id,
    );
    await queue.pushTask(task.id, timestampBuffer);
    return task;
  };

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

  test('can start and stop', async () => {
    const queue = await Queue.createQueue({
      db,
      keyManager,
      concurrencyLimit: 2,
      logger,
    });
    await queue.stop();
    await queue.start();
    await queue.stop();
  });
  test('can consume tasks', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    const queue = await Queue.createQueue({
      db,
      keyManager,
      handlers: { [handlerId]: handler },
      concurrencyLimit: 2,
      logger,
    });
    await queue.startTasks();
    await pushTask(queue, handlerId, [0]);
    await pushTask(queue, handlerId, [1]);
    await queue.allActiveTasksSettled();
    await queue.stop();
    expect(handler).toHaveBeenCalled();
  });
  test('tasks persist', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => sleep(0));
    let queue = await Queue.createQueue({
      db,
      keyManager,
      concurrencyLimit: 2,
      logger,
    });

    await pushTask(queue, handlerId, [0]);
    await pushTask(queue, handlerId, [1]);
    await pushTask(queue, handlerId, [2]);
    await queue.stop();

    queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      concurrencyLimit: 2,
      logger,
    });
    await queue.startTasks();
    // Time for tasks to start processing
    await sleep(10);
    await queue.allActiveTasksSettled();
    await queue.stop();
    expect(handler).toHaveBeenCalled();
  });
  test('concurrency is enforced', async () => {
    const handler = jest.fn();
    const prom = promise<void>();
    handler.mockImplementation(async () => {
      await prom.p;
    });
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      concurrencyLimit: 2,
      logger,
    });

    await queue.startTasks();
    await pushTask(queue, handlerId, [0]);
    await pushTask(queue, handlerId, [1]);
    await pushTask(queue, handlerId, [2]);
    await pushTask(queue, handlerId, [3]);
    await sleep(200);
    expect(handler).toHaveBeenCalledTimes(2);
    prom.resolveP();
    await sleep(200);
    await queue.allActiveTasksSettled();
    await queue.stop();
    expect(handler).toHaveBeenCalledTimes(4);
  });
  test('called exactly 4 times', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      logger,
    });

    await queue.startTasks();
    await pushTask(queue, handlerId, [0]);
    await pushTask(queue, handlerId, [1]);
    await pushTask(queue, handlerId, [2]);
    await pushTask(queue, handlerId, [3]);
    await sleep(100);
    await queue.stop();
    expect(handler).toHaveBeenCalledTimes(4);
  });
  test('tasks can have an optional group', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (nextTaskId) => {
      // Await sleep(1000);
      logger.info(`task complete ${tasksUtils.encodeTaskId(nextTaskId)}`);
    });
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      delay: true,
      concurrencyLimit: 2,
      logger,
    });

    await queue.createTask(handlerId, [1], undefined, ['one'], true);
    await queue.createTask(handlerId, [2], undefined, ['two'], true);
    await queue.createTask(handlerId, [3], undefined, ['two'], true);
    await queue.createTask(
      handlerId,
      [4],
      undefined,
      ['group1', 'three'],
      true,
    );
    await queue.createTask(handlerId, [5], undefined, ['group1', 'four'], true);
    await queue.createTask(handlerId, [6], undefined, ['group1', 'four'], true);
    await queue.createTask(handlerId, [7], undefined, ['group2', 'five'], true);
    await queue.createTask(handlerId, [8], undefined, ['group2', 'six'], true);

    const listTasks = async (taskGroup: TaskGroup) => {
      const tasks: Array<TaskId> = [];
      for await (const task of queue.getGroupTasks(taskGroup)) {
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

    await queue.stop();
  });
  test('completed tasks emit events', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => {
      return 'completed';
    });
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      concurrencyLimit: 2,
      logger,
    });

    await pushTask(queue, handlerId, [0]);
    await pushTask(queue, handlerId, [1]);
    await pushTask(queue, handlerId, [2]);
    await pushTask(queue, handlerId, [4]);
    await queue.startTasks();
    await sleep(200);
    await queue.allActiveTasksSettled();
    await queue.stop();
    expect(handler).toHaveBeenCalledTimes(4);
  });
  test('can await a task promise resolve', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      concurrencyLimit: 2,
      logger,
    });

    const taskSucceed = await pushTask(queue, handlerId, [true], false);

    // Promise should succeed with result
    const taskSucceedP = taskSucceed!.promise;
    await expect(taskSucceedP).resolves.toBe(true);

    await queue.stop();
  });
  test('can await a task promise reject', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      concurrencyLimit: 2,
      logger,
    });

    const taskFail = await pushTask(queue, handlerId, [false], false);
    // Promise should fail
    const taskFailP = taskFail!.promise;
    await expect(taskFailP).rejects.toBeInstanceOf(Error);

    await queue.stop();
  });
  test('getting multiple promises for a task should be the same promise', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      delay: true,
      concurrencyLimit: 2,
      logger,
    });

    const taskSucceed = await pushTask(queue, handlerId, [true], false);
    // If we get a 2nd task promise, it should be the same promise
    const prom1 = queue.getTaskP(taskSucceed.id);
    const prom2 = queue.getTaskP(taskSucceed.id);
    expect(prom1).toBe(prom2);
    expect(prom1).toBe(taskSucceed!.promise);

    await queue.stop();
  });
  test('task promise for invalid task should throw', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      delay: true,
      concurrencyLimit: 2,
      logger,
    });

    // Getting task promise should not throw
    const invalidTask = queue.getTaskP(
      IdInternal.fromBuffer<TaskId>(Buffer.alloc(16, 0)),
    );
    // Task promise will throw an error if task not found
    await expect(invalidTask).rejects.toThrow();

    await queue.stop();
  });
  test('lazy task promise for completed task should throw', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      delay: true,
      concurrencyLimit: 2,
      logger,
    });

    const taskSucceed = await pushTask(queue, handlerId, [true], true);
    const prom = queue.getTaskP(taskSucceed.id);
    await queue.startTasks();
    await prom;
    // Finished tasks should throw
    await expect(taskSucceed?.promise).rejects.toThrow();

    await queue.stop();
  });
  test('eager task promise for completed task should resolve', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (fail) => {
      if (!fail) throw Error('three');
      return fail;
    });
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      delay: true,
      concurrencyLimit: 2,
      logger,
    });

    await queue.startTasks();
    const taskSucceed = await pushTask(queue, handlerId, [true], false);
    await expect(taskSucceed?.promise).resolves.toBe(true);

    await queue.stop();
  });

  test('template', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (nextTaskId) => {
      // Await sleep(1000);
      logger.info(`task complete ${tasksUtils.encodeTaskId(nextTaskId)}`);
    });
    const queue = await Queue.createQueue({
      db,
      handlers: { [handlerId]: handler },
      keyManager,
      concurrencyLimit: 2,
      logger,
    });

    await pushTask(queue, handlerId, [0]);
    await pushTask(queue, handlerId, [1]);
    await pushTask(queue, handlerId, [2]);

    await queue.startTasks();
    await sleep(100);
    await queue.stop();
    expect(handler).toHaveBeenCalledTimes(3);
  });
});
