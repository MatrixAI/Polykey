import type { ContextTimed } from '@/contexts/types';
import { TaskHandlerId } from '@/tasks/types';
import Logger, { LogLevel } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyManager from './src/keys/KeyManager';
import Tasks from './src/tasks/Tasks';
import { sleep } from '@/utils';

// This function decodes a nested array of Buffer
// and converts to them  utf8 strings
function decodeBufferArray (arr: any): any {
  if (arr instanceof Buffer) {
    const str = arr.toString('utf8');
    if (isPrintable(str)) {
      return str;
    } else {
      return '0x' + arr.toString('hex');
    }
    // return arr.toString('utf8');
  } else if (Array.isArray(arr)) {
    return arr.map(decodeBufferArray);
  } else {
    return arr;
  }
}

function isPrintable (str: string): boolean {
  return /^[\x20-\x7E]*$/.test(str);
}

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
  const tasks = await Tasks.createTasks({
    db,
    fresh: false,
    lazy: true,
    logger: logger.getChild('tasks'),
  });

  const test = 'test' as TaskHandlerId;

  tasks.registerHandler(
    test,
    async (x: string, ctx: ContextTimed) => {
      console.log(`TEST HANDLER EXECUTED ${x}`);
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

  // process.on('SIGINT', async () => {
  //   console.log('SIGINT');
    await tasks.stop();
    await db.stop();
    // await keyManager.stop();
    // console.log('DONE');
  // });

}

void main();
