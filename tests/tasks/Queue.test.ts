import type { NodeId } from '../../src/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { sleep } from '@matrixai/async-locks/dist/utils';
import { IdInternal } from '@matrixai/id';
import { promise } from 'encryptedfs/dist/utils';
import KeyManager from '@/keys/KeyManager';
import Scheduler from '@/tasks/Scheduler';
import Queue from '@/tasks/Queue';
import * as keysUtils from '@/keys/utils';
import * as tasksUtils from '@/tasks/utils';
import { globalRootKeyPems } from '../fixtures/globalRootKeyPems';

describe(Queue.name, () => {
  const password = 'password';
  const logger = new Logger(`${Scheduler.name} test`, LogLevel.INFO, [
    new StreamHandler(),
  ]);
  let keyManager: KeyManager;
  let dbKey: Buffer;
  let dbPath: string;
  let db: DB;
  let generateTaskId;

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
    generateTaskId = tasksUtils.createTaskIdGenerator(
      IdInternal.fromBuffer<NodeId>(Buffer.alloc(0, 32)),
    );
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
      taskHandler: async () => {},
      concurrencyLimit: 2,
      logger,
    });
    await queue.start();
    await queue.stop();
  });
  test('can consume tasks', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    const queue = await Queue.createQueue({
      db,
      taskHandler: handler,
      concurrencyLimit: 2,
      logger,
    });
    await queue.pushTask(generateTaskId(), 0);
    await queue.pushTask(generateTaskId(), 1);
    await queue.allConcurrentSettled();
    await queue.stop();
    expect(handler).toHaveBeenCalled();
  });
  test('tasks persist', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => sleep(0));
    let queue = await Queue.createQueue({
      db,
      taskHandler: async () => {},
      concurrencyLimit: 2,
      delay: true,
      logger,
    });

    await queue.pushTask(generateTaskId(), 0);
    await queue.pushTask(generateTaskId(), 1);
    await queue.pushTask(generateTaskId(), 2);
    await queue.stop();

    queue = await Queue.createQueue({
      db,
      taskHandler: handler,
      concurrencyLimit: 2,
      logger,
    });
    // Time for tasks to start processing
    await sleep(10);
    await queue.allConcurrentSettled();
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
      taskHandler: handler,
      concurrencyLimit: 2,
      logger,
    });

    await queue.pushTask(generateTaskId(), 0);
    await queue.pushTask(generateTaskId(), 1);
    await queue.pushTask(generateTaskId(), 2);
    await queue.pushTask(generateTaskId(), 3);
    await sleep(200);
    expect(handler).toHaveBeenCalledTimes(2);
    prom.resolveP();
    await sleep(200);
    await queue.allConcurrentSettled();
    await queue.stop();
    expect(handler).toHaveBeenCalledTimes(4);
  });
  test('called exactly 4 times', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async () => {});
    const queue = await Queue.createQueue({
      db,
      taskHandler: handler,
      logger,
    });

    await queue.pushTask(generateTaskId(), 0);
    await queue.pushTask(generateTaskId(), 1);
    await queue.pushTask(generateTaskId(), 2);
    await queue.pushTask(generateTaskId(), 3);
    await sleep(100);
    await queue.stop();
    expect(handler).toHaveBeenCalledTimes(4);
  });

  test('template', async () => {
    const handler = jest.fn();
    handler.mockImplementation(async (nextTaskId) => {
      // Await sleep(1000);
      logger.info(`task complete ${nextTaskId.toMultibase('base32hex')}`);
    });
    const queue = await Queue.createQueue({
      db,
      taskHandler: handler,
      concurrencyLimit: 2,
      logger,
    });

    await queue.start({ delay: true });
    await queue.pushTask(generateTaskId(), 0);
    await queue.pushTask(generateTaskId(), 1);
    await queue.pushTask(generateTaskId(), 2);

    await queue.startTasks();
    await sleep(100);
    await queue.stop();
    expect(handler).toHaveBeenCalledTimes(3);
  });
});
