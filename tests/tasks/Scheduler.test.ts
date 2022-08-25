import type { TaskHandlerId } from '../../src/tasks/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { sleep } from '@matrixai/async-locks/dist/utils';
import {
  extractRand,
  extractSeq,
  extractTs,
} from '@matrixai/id/dist/IdSortable';
import KeyManager from '@/keys/KeyManager';
import Scheduler from '@/tasks/Scheduler';
import * as keysUtils from '@/keys/utils';
import * as tasksUtils from '@/tasks/utils';
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
  test('do it', async () => {
    const scheduler = await Scheduler.createScheduler({
      db,
      keyManager,
      logger,
    });
    const taskHandler = 'asd' as TaskHandlerId;
    const things: Array<number> = [];
    const handler = async (num: number) => things.push(num);
    scheduler.registerHandler(taskHandler, handler);
    console.log('asd');

    await scheduler.start();
    await scheduler.scheduleTask(taskHandler, [1], 1000);
    await scheduler.scheduleTask(taskHandler, [2], 100);
    await scheduler.scheduleTask(taskHandler, [3], 2000);
    await scheduler.scheduleTask(taskHandler, [7], 3000);
    await scheduler.scheduleTask(taskHandler, [4], 10);
    await scheduler.scheduleTask(taskHandler, [5], 10);
    await scheduler.scheduleTask(taskHandler, [6], 10);
    await sleep(500);
    await scheduler.stop();

    await scheduler.start();
    await sleep(3000);
    await scheduler.stop();
    console.log(things);
  });
  test('checking time uniqueness', async () => {
    const generateTaskId = tasksUtils.createTaskIdGenerator(
      keyManager.getNodeId(),
    );
    const a = generateTaskId();
    const b = generateTaskId();
    await sleep(10);
    const c = generateTaskId();
    console.log(extractTs(a), extractRand(a), extractSeq(a));
    console.log(extractTs(b), extractRand(b), extractSeq(b));
    console.log(extractTs(c), extractRand(c), extractSeq(c));
  });
});
