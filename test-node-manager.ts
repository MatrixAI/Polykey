import path from 'path';
import { DB } from '@matrixai/db';
import type { Host, Port, TLSConfig } from './src/network/types';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import NodeManager from './src/nodes/NodeManager';
import KeyRing from './src/keys/KeyRing';
import Sigchain from './src/sigchain/Sigchain';
import ACL from './src/acl/ACL';
import GestaltGraph from './src/gestalts/GestaltGraph';
import TaskManager from './src/tasks/TaskManager';
import NodeGraph from './src/nodes/NodeGraph';
import NodeConnectionManager from './src/nodes/NodeConnectionManager';
import * as keysUtils from './src/keys/utils';
import * as testsUtils from './tests/utils';

async function main() {
  const logger = new Logger(`${NodeManager.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const dataDir = './tmp';

  let keyRing: KeyRing;
  let db: DB;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let taskManager: TaskManager;
  let tlsConfig: TLSConfig;

  const password = 'password';
  const keysPath = path.join(dataDir, 'keys');
  keyRing = await KeyRing.createKeyRing({
    password,
    keysPath,
    logger,
    passwordOpsLimit: keysUtils.passwordOpsLimits.min,
    passwordMemLimit: keysUtils.passwordMemLimits.min,
    strictMemoryLock: false,
  });
  const dbPath = path.join(dataDir, 'db');
  db = await DB.createDB({
    dbPath,
    logger,
  });
  acl = await ACL.createACL({
    db,
    logger,
  });
  gestaltGraph = await GestaltGraph.createGestaltGraph({
    db,
    acl,
    logger,
  });
  nodeGraph = await NodeGraph.createNodeGraph({
    db,
    keyRing,
    logger,
  });
  sigchain = await Sigchain.createSigchain({
    db,
    keyRing,
    logger,
  });
  taskManager = await TaskManager.createTaskManager({
    db,
    logger,
  });
  tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);


}

void main();
