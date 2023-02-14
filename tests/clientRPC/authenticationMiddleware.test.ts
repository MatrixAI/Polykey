import type { Server } from 'https';
import type { WebSocketServer } from 'ws';
import type { RPCRequestParams, RPCResponseResult } from '@/clientRPC/types';
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
import RPCClient from '@/RPC/RPCClient';
import { Session, SessionManager } from '@/sessions';
import * as clientRPCUtils from '@/clientRPC/utils';
import * as authMiddleware from '@/clientRPC/authenticationMiddleware';
import { UnaryCaller } from '@/RPC/callers';
import { UnaryHandler } from '@/RPC/handlers';
import * as middlewareUtils from '@/RPC/middleware';
import * as testsUtils from '../utils';

describe('agentUnlock', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
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
  let wss: WebSocketServer;
  let port: number;

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
    port = await clientRPCUtils.listen(server, '127.0.0.1');
  });
  afterEach(async () => {
    wss?.close();
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
    class EchoHandler extends UnaryHandler<
      { logger: Logger },
      RPCRequestParams,
      RPCResponseResult
    > {
      public async handle(input: RPCRequestParams): Promise<RPCResponseResult> {
        return input;
      }
    }
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        agentUnlock: new EchoHandler({ logger }),
      },
      middleware: middlewareUtils.defaultServerMiddlewareWrapper(
        authMiddleware.authenticationMiddlewareServer(sessionManager, keyRing),
      ),
      logger,
    });
    wss = clientRPCUtils.createClientServer(
      server,
      rpcServer,
      logger.getChild('server'),
    );
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        agentUnlock: new UnaryCaller<RPCRequestParams, RPCResponseResult>(),
      },
      streamPairCreateCallback: async () => {
        return clientRPCUtils.startConnection(
          '127.0.0.1',
          port,
          logger.getChild('client'),
        );
      },
      middleware: middlewareUtils.defaultClientMiddlewareWrapper(
        authMiddleware.authenticationMiddlewareClient(session),
      ),
      logger,
    });

    // Doing the test
    const result = await rpcClient.methods.agentUnlock({
      metadata: {
        Authorization: clientRPCUtils.encodeAuthFromPassword(password),
      },
    });
    expect(result).toMatchObject({
      metadata: {
        Authorization: expect.any(String),
      },
    });
    const result2 = await rpcClient.methods.agentUnlock({});
    expect(result2).toMatchObject({
      metadata: {
        Authorization: expect.any(String),
      },
    });
  });
});
