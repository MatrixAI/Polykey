import type { Server } from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createServer } from 'https';
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
import { Session, SessionManager } from '@/sessions';
import * as abcUtils from '@/clientRPC/utils';
import * as clientRPCUtils from '@/clientRPC/utils';
import * as testsUtils from '../../utils';

describe('agentUnlock', () => {
  const logger = new Logger('agentUnlock test', LogLevel.INFO, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let certManager: CertManager;
  let session: Session;
  let sessionManager: SessionManager;
  let server: Server;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    const sessionPath = path.join(dataDir, 'session');
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
    session = await Session.createSession({
      sessionTokenPath: sessionPath,
      logger,
    });
    sessionManager = await SessionManager.createSessionManager({
      db,
      keyRing,
      logger,
    });
    const tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    server = createServer({
      cert: tlsConfig.certChainPem,
      key: tlsConfig.keyPrivatePem,
    });
    server.listen(8080, '127.0.0.1');
  });
  afterEach(async () => {
    server.close();
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
        logger,
      },
      logger,
    });
    rpcServer.registerUnaryHandler(agentUnlockName, agentUnlockHandler);
    rpcServer.registerMiddleware(
      abcUtils.authenticationMiddlewareServer(sessionManager, keyRing),
    );
    clientRPCUtils.createClientServer(
      server,
      rpcServer,
      logger.getChild('server'),
    );
    const rpcClient = await RPCClient.createRPCClient({
      streamPairCreateCallback: async () => {
        return clientRPCUtils.startConnection(
          'wss://localhost:8080',
          logger.getChild('client'),
        );
      },
      logger,
    });
    rpcClient.registerMiddleware(
      abcUtils.authenticationMiddlewareClient(session),
    );

    // Doing the test
    const result = await agentUnlockCaller(
      {
        Authorization: abcUtils.encodeAuthFromPassword(password),
      },
      rpcClient,
    );
    expect(result).toMatchObject({
      metadata: {
        Authorization: expect.any(String),
      },
      data: null,
    });
    const result2 = await agentUnlockCaller({}, rpcClient);
    expect(result2).toMatchObject({
      metadata: {
        Authorization: expect.any(String),
      },
      data: null,
    });
  });
});
