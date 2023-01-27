import type { ConnectionInfo } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TransformStream } from 'stream/web';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/RPC/RPCServer';
import TaskManager from '@/tasks/TaskManager';
import CertManager from '@/keys/CertManager';
import {
  agentUnlockName,
  agentUnlockHandler,
  agentUnlockCaller,
} from '@/clientRPC/handlers/agentUnlock';
import RPCClient from '@/RPC/RPCClient';
import * as rpcTestUtils from '../../RPC/utils';

describe('agentStatus', () => {
  const logger = new Logger('agentStatus test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let certManager: CertManager;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    taskManager = await TaskManager.createTaskManager({ db, logger });
    certManager = await CertManager.createCertManager({
      db,
      keyRing,
      taskManager,
      logger,
    });
  });
  afterEach(async () => {
    await certManager.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('get status', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      container: {
        // KeyRing,
        // certManager,
        logger,
      },
      logger,
    });
    rpcServer.registerUnaryHandler(agentUnlockName, agentUnlockHandler);
    rpcServer.registerForwardMiddleware(() => {
      return (input) => {
        // This middleware needs to check the first message for the token
        return input.pipeThrough(
          new TransformStream({
            transform: (chunk, controller) => {
              controller.enqueue(chunk);
            },
          }),
        );
      };
    });
    const rpcClient = await RPCClient.createRPCClient({
      streamPairCreateCallback: async () => {
        const { clientPair, serverPair } = rpcTestUtils.createTapPairs();
        rpcServer.handleStream(serverPair, {} as ConnectionInfo);
        return clientPair;
      },
      logger,
    });

    // Doing the test
    const result = await agentUnlockCaller({}, rpcClient);
    expect(result).toStrictEqual({
      pid: process.pid,
      nodeId: keyRing.getNodeId(),
      publicJwk: JSON.stringify(
        keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey),
      ),
    });
  });
});
