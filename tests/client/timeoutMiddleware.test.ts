import type { ContextTimed } from '@matrixai/contexts';
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
import { Timer } from '@matrixai/timer';
import RPCClient from '@matrixai/rpc/dist/RPCClient';
import { UnaryCaller } from '@matrixai/rpc/dist/callers';
import { UnaryHandler } from '@matrixai/rpc/dist/handlers';
import * as rpcUtilsMiddleware from '@matrixai/rpc/dist/middleware';
import { WebSocketClient } from '@matrixai/ws';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import TaskManager from '@/tasks/TaskManager';
import CertManager from '@/keys/CertManager';
import * as timeoutMiddleware from '@/client/utils/timeoutMiddleware';
import { promise } from '@/utils';
import ClientService from '@/client/ClientService';
import * as testsUtils from '../utils';

describe('timeoutMiddleware', () => {
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
  let clientService: ClientService;
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
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    taskManager = await TaskManager.createTaskManager({ db, logger });
    certManager = await CertManager.createCertManager({
      db,
      keyRing,
      taskManager,
      options: {},
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
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
  test('server side timeout updates', async () => {
    // Setup
    const ctxProm = promise<ContextTimed>();
    class EchoHandler extends UnaryHandler<
      { logger: Logger },
      ClientRPCRequestParams,
      ClientRPCResponseResult
    > {
      public handle = async (
        input: ClientRPCRequestParams,
        _cancel,
        _meta,
        ctx,
      ) => {
        ctxProm.resolveP(ctx);
        return input;
      };
    }
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        testHandler: new EchoHandler({ logger }),
      },
      options: {
        host: localhost,
        middlewareFactory: timeoutMiddleware.timeoutMiddlewareServer,
      },
      logger: logger.getChild(ClientService.name),
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
      streamFactory: () => clientClient.connection.newStream(),
      middlewareFactory: rpcUtilsMiddleware.defaultClientMiddlewareWrapper(
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
    timer.cancel();
    await timer.then(
      () => {},
      () => {},
    );
    await clientService.destroy({ force: true });
  });
  test('client side timeout updates', async () => {
    // Setup
    class EchoHandler extends UnaryHandler<
      { logger: Logger },
      ClientRPCRequestParams,
      ClientRPCResponseResult
    > {
      public handle = async (
        input: ClientRPCRequestParams,
        _cancel,
        _meta,
        _ctx,
      ) => {
        return input;
      };
    }
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        testHandler: new EchoHandler({ logger }),
      },
      options: {
        host: localhost,
        middlewareFactory: timeoutMiddleware.timeoutMiddlewareServer,
        rpcCallTimeoutTime: 100,
      },
      logger,
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
      idGen: async () => null,
      manifest: {
        testHandler: new UnaryCaller<
          ClientRPCRequestParams,
          ClientRPCResponseResult
        >(),
      },
      streamFactory: async () => clientClient.connection.newStream(),
      middlewareFactory: rpcUtilsMiddleware.defaultClientMiddlewareWrapper(
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
    timer.cancel();
  });
});
