import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '@/client/types';
import type { TLSConfig } from '../../src/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import {
  RPCClient,
  UnaryCaller,
  UnaryHandler,
  middleware as rpcUtilsMiddleware,
} from '@matrixai/rpc';
import { WebSocketClient } from '@matrixai/ws';
import KeyRing from '@/keys/KeyRing';
import TaskManager from '@/tasks/TaskManager';
import CertManager from '@/keys/CertManager';
import ClientService from '@/client/ClientService';
import { Session, SessionManager } from '@/sessions';
import * as authMiddleware from '@/client/authenticationMiddleware';
import * as keysUtils from '@/keys/utils';
import * as clientUtils from '@/client/utils';
import * as networkUtils from '@/network/utils';
import * as testsUtils from '../utils';

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
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
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
