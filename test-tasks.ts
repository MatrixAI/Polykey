import Logger, { LogLevel } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyManager from './src/keys/KeyManager';
import Tasks from './src/tasks/Tasks';

async function main () {

  const logger = new Logger('root', LogLevel.INFO);

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
    fresh: true
  });

  await tasks.stop();

  await db.stop();
  await keyManager.stop();
}

void main();
