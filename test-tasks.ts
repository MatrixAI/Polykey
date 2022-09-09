import type { ContextTimed } from './src/contexts/types';
import { TaskHandlerId } from './src/tasks/types';
import Logger, { LogLevel } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyManager from './src/keys/KeyManager';
import TaskManager from './src/tasks/TaskManager';
import { sleep } from './src/utils';

async function main () {

  // Keeps the process alive
  // process.stdin.resume();

  const logger = new Logger('root', LogLevel.DEBUG);
  logger.setFilter(/tasks/);

  // const keyManager = await KeyManager.createKeyManager({
  //   keysPath: './tmp/keys',
  //   password: 'password',
  //   rootKeyPairBits: 1024,
  //   logger,
  // });

  const db = await DB.createDB({
    dbPath: './tmp/db',
    fresh: true,
    logger,
  });

  // Lazy startup
  const tasks = await TaskManager.createTaskManager({
    db,
    fresh: false,
    lazy: true,
    logger: logger.getChild('tasks'),
  });

  const test = 'test' as TaskHandlerId;

  tasks.registerHandler(
    test,
    async (ctx: ContextTimed, x: string) => {
      console.log(`TEST HANDLER EXECUTED ${x}`);
      console.log(ctx);
    }
  );

  await tasks.scheduleTask({
    handlerId: test,
    parameters: ['T1'],
    delay: 500,
    priority: 0,
    deadline: 10000,
  });

  await tasks.scheduleTask({
    handlerId: test,
    parameters: ['T2'],
    delay: 500,
    priority: 0,
    deadline: 10000,
  });

  await tasks.scheduleTask({
    handlerId: test,
    parameters: ['T3'],
    delay: 4000,
    priority: 0,
    deadline: 10000,
  });

  await tasks.scheduleTask({
    handlerId: test,
    parameters: ['T4'],
    delay: 5000,
    priority: 0,
    deadline: 10000,
  });

  for await (const task of tasks.getTasks()) {
    console.log(task);
  }

  // console.log('DUMP AFTER SCHEDULING TASK', decodeBufferArray(await db.dump([], true)));

  // await sleep(1000);

  // This starts the processing now
  await tasks.startProcessing();

  // await sleep(6000);

  // console.log(decodeBufferArray(await db.dump([], true)));

  // await tasks.scheduleTask({
  //   handlerId: test,
  //   parameters: ['abc'],
  //   delay: 2000,
  //   priority: 0,
  //   deadline: 10000,
  // });

  await sleep(10000);

  // console.log(decodeBufferArray(await db.dump([], true)));

  // for await (const task of tasks.getTasks()) {
  //   console.log(task);
  // }

  // process.on('SIGINT', async () => {
  //   console.log('SIGINT');
    await tasks.stop();
    await db.stop();
    // await keyManager.stop();
    // console.log('DONE');
  // });

}

void main();
