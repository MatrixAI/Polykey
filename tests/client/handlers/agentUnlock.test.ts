import type { TLSConfig } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/RPC/RPCServer';
import TaskManager from '@/tasks/TaskManager';
import CertManager from '@/keys/CertManager';
import { agentUnlock, AgentUnlockHandler } from '@/client/handlers/agentUnlock';
import RPCClient from '@/RPC/RPCClient';
import { Session, SessionManager } from '@/sessions';
import * as clientUtils from '@/client/utils';
import * as authMiddleware from '@/client/authenticationMiddleware';
import * as middlewareUtils from '@/RPC/middleware';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import * as testsUtils from '../../utils';

describe('agentUnlock', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const host = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let certManager: CertManager;
  let session: Session;
  let sessionManager: SessionManager;
  let clientClient: WebSocketClient;
  let clientServer: WebSocketServer;
  let tlsConfig: TLSConfig;

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
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await clientServer.stop(true);
    await clientClient.destroy(true);
    await certManager.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('unlock', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        agentUnlock: new AgentUnlockHandler({}),
      },
      middleware: middlewareUtils.defaultServerMiddlewareWrapper(
        authMiddleware.authenticationMiddlewareServer(sessionManager, keyRing),
      ),
      logger,
    });
    clientServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger,
    });
    clientClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger,
      port: clientServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        agentUnlock,
      },
      streamPairCreateCallback: async () => clientClient.startConnection(),
      middleware: middlewareUtils.defaultClientMiddlewareWrapper(
        authMiddleware.authenticationMiddlewareClient(session),
      ),
      logger,
    });

    // Doing the test
    const result = await rpcClient.methods.agentUnlock({
      metadata: {
        Authorization: clientUtils.encodeAuthFromPassword(password),
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