import type { ContextTimed } from '@/contexts/types';
import { TaskHandlerId } from '@/tasks/types';
import Logger, { LogLevel } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyManager from './src/keys/KeyManager';
import Tasks from './src/tasks/Tasks';

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

  const logger = new Logger('root', LogLevel.WARN);

  const keyManager = await KeyManager.createKeyManager({
    keysPath: './tmp/keys',
    password: 'password',
    rootKeyPairBits: 1024,
    logger,
  });

  const db = await DB.createDB({
    dbPath: './tmp/db',
    fresh: true,
    logger,
  });

  const tasks = await Tasks.createTasks({
    db,
    keyManager,
    fresh: true,
    logger,
  });

  // it actually has to take a context signal in
  // (a: number, b: string)
  // scheduleTask({ params: [1, 'abc' ]})
  // because...

  // why not the event system?
  // you listen for event, then type it?
  // it's kind of dynamic

  const test = 'test' as TaskHandlerId;

  tasks.registerHandler(
    test,
    async (x: string, ctx: ContextTimed) => {
      console.log('HANDLER executed');
    }
  );

  await tasks.scheduleTask({
    handlerId: test,
    parameters: ['abc'],
    delay: 1000,
    priority: 0,
    deadline: 10000,
  });

  // await db.put('test', 'test');
  console.log(decodeBufferArray(await db.dump([], true)));


  await tasks.stop();

  await db.stop();
  await keyManager.stop();
}

void main();
