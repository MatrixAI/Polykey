import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '#client/types.js';
import type { TLSConfig } from '#network/types.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import {
  RPCClient,
  UnaryCaller,
  UnaryHandler,
  middleware as rpcUtilsMiddleware,
} from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import * as testsUtils from '../utils/index.js';
import KeyRing from '#keys/KeyRing.js';
import TaskManager from '#tasks/TaskManager.js';
import CertManager from '#keys/CertManager.js';
import ClientService from '#client/ClientService.js';
import { Session, SessionManager } from '#sessions/index.js';
import * as authMiddleware from '#client/authenticationMiddleware.js';
import * as keysUtils from '#keys/utils/index.js';
import * as clientUtils from '#client/utils.js';
import * as networkUtils from '#network/utils.js';

describe('authenticationMiddleware', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let certManager: CertManager;
  let session: Session;
  let sessionManager: SessionManager;
  let clientService: ClientService;
  let clientClient: WebSocketClient;
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
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
      logger,
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
    await clientService?.stop({ force: true });
    await clientClient?.destroy({ force: true });
    await certManager.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('middleware', async () => {
    // Setup
    class EchoHandler extends UnaryHandler<
      { logger: Logger },
      ClientRPCRequestParams,
      ClientRPCResponseResult
    > {
      public async handle(
        input: ClientRPCRequestParams,
      ): Promise<ClientRPCResponseResult> {
        return input;
      }
    }
    clientService = new ClientService({
      tlsConfig,
      middlewareFactory: authMiddleware.authenticationMiddlewareServer(
        sessionManager,
        keyRing,
      ),
      logger: logger.getChild(ClientService.name),
    });
    await clientService.start({
      manifest: {
        testHandler: new EchoHandler({ logger }),
      },
      host: localhost,
    });
    clientClient = await WebSocketClient.createWebSocketClient({
      config: {
        verifyPeer: false,
      },
      host: localhost,
      port: clientService.port,
      logger,
    });
    const rpcClient = new RPCClient({
      manifest: {
        testHandler: new UnaryCaller<
          ClientRPCRequestParams,
          ClientRPCResponseResult
        >(),
      },
      streamFactory: async () => clientClient.connection.newStream(),
      toError: networkUtils.toError,
      middlewareFactory: rpcUtilsMiddleware.defaultClientMiddlewareWrapper(
        authMiddleware.authenticationMiddlewareClient(session),
      ),
      logger,
    });

    // Doing the test
    const result = await rpcClient.methods.testHandler({
      metadata: {
        authorization: clientUtils.encodeAuthFromPassword(password),
      },
    });
    expect(result).toMatchObject({
      metadata: {
        authorization: expect.any(String),
      },
    });
    const result2 = await rpcClient.methods.testHandler({});
    expect(result2).toMatchObject({
      metadata: {
        authorization: expect.any(String),
      },
    });
  });
});
