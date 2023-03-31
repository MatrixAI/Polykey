import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
} from '@/client/types';
import type { TLSConfig } from '../../src/network/types';
import type { ContextTimed } from '@/contexts/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Timer } from '@matrixai/timer';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import TaskManager from '@/tasks/TaskManager';
import CertManager from '@/keys/CertManager';
import RPCClient from '@/rpc/RPCClient';
import * as timeoutMiddleware from '@/client/utils/timeoutMiddleware';
import { UnaryCaller } from '@/rpc/callers';
import { UnaryHandler } from '@/rpc/handlers';
import * as middlewareUtils from '@/rpc/utils/middleware';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import { promise } from '@/utils';
import * as testsUtils from '../utils';

describe('timeoutMiddleware', () => {
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
  let clientServer: WebSocketServer;
  let clientClient: WebSocketClient;
  let tlsConfig: TLSConfig;

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
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await clientServer?.stop(true);
    await clientClient?.destroy(true);
    await certManager.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('Server side timeout updates', async () => {
    // Setup
    const ctxProm = promise<ContextTimed>();
    class EchoHandler extends UnaryHandler<
      { logger: Logger },
      ClientRPCRequestParams,
      ClientRPCResponseResult
    > {
      public async handle(
        input: ClientRPCRequestParams,
        _,
        ctx,
      ): Promise<ClientRPCResponseResult> {
        ctxProm.resolveP(ctx);
        return input;
      }
    }
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        testHandler: new EchoHandler({ logger }),
      },
      middlewareFactory: middlewareUtils.defaultServerMiddlewareWrapper(
        timeoutMiddleware.timeoutMiddlewareServer,
      ),
      logger,
    });
    clientServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) => {
        rpcServer.handleStream(streamPair, connectionInfo);
      },
      host,
      tlsConfig,
      logger,
    });
    clientClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      port: clientServer.getPort(),
      logger,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        testHandler: new UnaryCaller<
          ClientRPCRequestParams,
          ClientRPCResponseResult
        >(),
      },
      streamFactory: async () => clientClient.startConnection(),
      middlewareFactory: middlewareUtils.defaultClientMiddlewareWrapper(
        timeoutMiddleware.timeoutMiddlewareClient,
      ),
      logger,
    });

    // Doing the test
    const timer = new Timer({
      delay: 100,
    });
    await rpcClient.methods.testHandler({}, { timer });

    const ctx = await ctxProm.p;
    expect(ctx.timer.delay).toBe(100);
  });
  test('client side timeout updates', async () => {
    // Setup
    class EchoHandler extends UnaryHandler<
      { logger: Logger },
      ClientRPCRequestParams,
      ClientRPCResponseResult
    > {
      public async handle(
        input: ClientRPCRequestParams,
        _,
      ): Promise<ClientRPCResponseResult> {
        return input;
      }
    }
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        testHandler: new EchoHandler({ logger }),
      },
      middlewareFactory: middlewareUtils.defaultServerMiddlewareWrapper(
        timeoutMiddleware.timeoutMiddlewareServer,
      ),
      defaultTimeout: 100,
      logger,
    });
    clientServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) => {
        rpcServer.handleStream(streamPair, connectionInfo);
      },
      host,
      tlsConfig,
      logger,
    });
    clientClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      port: clientServer.getPort(),
      logger,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        testHandler: new UnaryCaller<
          ClientRPCRequestParams,
          ClientRPCResponseResult
        >(),
      },
      streamFactory: async () => clientClient.startConnection(),
      middlewareFactory: middlewareUtils.defaultClientMiddlewareWrapper(
        timeoutMiddleware.timeoutMiddlewareClient,
      ),
      logger,
    });

    // Doing the test
    const timer = new Timer({
      delay: 1000,
    });
    await rpcClient.methods.testHandler({}, { timer });
    expect(timer.delay).toBe(100);
  });
});
