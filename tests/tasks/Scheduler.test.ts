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
  // Test('checking time uniqueness', async () => {
  //   const generateTaskId = tasksUtils.createTaskIdGenerator(
  //     keyManager.getNodeId(),
  //   );
  //   const a = generateTaskId();
  //   const b = generateTaskId();
  //   await sleep(10);
  //   const c = generateTaskId();
  //   console.log(extractTs(a), extractRand(a), extractSeq(a));
  //   console.log(extractTs(b), extractRand(b), extractSeq(b));
  //   console.log(extractTs(c), extractRand(c), extractSeq(c));
  // });
});
