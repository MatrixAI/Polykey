import type { TaskHandlerId } from '../../src/tasks/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { sleep } from '@matrixai/async-locks/dist/utils';
import KeyManager from '@/keys/KeyManager';
import Scheduler from '@/tasks/Scheduler';
import * as keysUtils from '@/keys/utils';
import Queue from '@/tasks/Queue';
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
    const queue = await Queue.createQueue({
      db,
      keyManager,
      logger,
    });
    const scheduler = await Scheduler.createScheduler({
      db,
      queue,
      logger,
    });
    const taskHandler = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => sleep(100));
    queue.registerHandler(taskHandler, handler);

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
    const queue = await Queue.createQueue({
      db,
      keyManager,
      logger,
    });
    const scheduler = await Scheduler.createScheduler({
      db,
      queue,
      logger,
    });
    const taskHandler = 'asd' as TaskHandlerId;
    const handler = jest.fn();
    handler.mockImplementation(async () => sleep(100));
    queue.registerHandler(taskHandler, handler);

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
    await sleep(4000);
    await scheduler.stop();
    expect(handler).toHaveBeenCalledTimes(7);
  });
  test.todo('Scheculed tasks get moved to queue after delay');
  test.todo('tasks timestamps are unique on taskId');
  test.todo('can remove scheduled tasks');
  test.todo('can not remove active tasks');
  test.todo('Should clean up any inconsistent state during creation');
});
