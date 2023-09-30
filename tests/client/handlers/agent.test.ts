import type { TLSConfig } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { running } from '@matrixai/async-init';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import TaskManager from '@/tasks/TaskManager';
import { AgentLockAllHandler } from '@/client/handlers/agentLockAll';
import RPCClient from '@matrixai/rpc/dist/RPCClient';
import { Session, SessionManager } from '@/sessions';
import WebSocketClient from '@/websockets/WebSocketClient';
import {
  agentLockAll,
  agentStatus,
  AgentStatusHandler,
  agentStop,
  AgentStopHandler,
  agentUnlock,
  AgentUnlockHandler,
} from '@/client';
import PolykeyAgent from '@/PolykeyAgent';
import * as nodesUtils from '@/nodes/utils';
import config from '@/config';
import Status from '@/status/Status';
import CertManager from '@/keys/CertManager';
import * as rpcUtilsMiddleware from '@matrixai/rpc/dist/middleware';
import * as clientUtilsAuthMiddleware from '@/client/utils/authenticationMiddleware';
import * as clientUtils from '@/client/utils';
import ClientService from '@/client/ClientService';
import * as testsUtils from '../../utils';

describe('agentLockAll', () => {
  const logger = new Logger('agentLockAll test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let sessionManager: SessionManager;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
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
    sessionManager = await SessionManager.createSessionManager({
      db,
      keyRing,
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('locks all current sessions', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        agentLockAll: new AgentLockAllHandler({
          db,
          sessionManager,
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      port: clientService.port,
      logger: logger.getChild('client'),
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        agentLockAll,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const token = await sessionManager.createToken();
    await rpcClient.methods.agentLockAll({});
    expect(await sessionManager.verifyToken(token)).toBeFalsy();
  });
});
describe('agentStatus', () => {
  const logger = new Logger('agentStatus test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let pkAgent: PolykeyAgent;
  let clientService: ClientService;
  let clientClient: WebSocketClient;
  let tlsConfig: TLSConfig;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const nodePath = path.join(dataDir, 'node');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
    tlsConfig = await testsUtils.createTLSConfig(pkAgent.keyRing.keyPair);
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await clientClient?.destroy(true);
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('get status', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        agentStatus: new AgentStatusHandler({
          pkAgentProm: Promise.resolve(pkAgent),
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    clientClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [pkAgent.keyRing.getNodeId()],
      host: localhost,
      port: clientService.port,
      logger,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        agentStatus,
      },
      streamFactory: async () => clientClient.startConnection(),
      logger: logger.getChild('RPCClient'),
    });
    // Doing the test
    const result = await rpcClient.methods.agentStatus({});
    expect(result).toStrictEqual({
      pid: process.pid,
      nodeIdEncoded: nodesUtils.encodeNodeId(pkAgent.keyRing.getNodeId()),
      clientHost: pkAgent.clientServiceHost,
      clientPort: pkAgent.clientServicePort,
      agentHost: pkAgent.agentServiceHost,
      agentPort: pkAgent.agentServicePort,
      publicKeyJwk: keysUtils.publicKeyToJWK(pkAgent.keyRing.keyPair.publicKey),
      certChainPEM: await pkAgent.certManager.getCertPEMsChainPEM(),
    });
  });
});
describe('agentStop', () => {
  const logger = new Logger('agentStop test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const localhost = '127.0.0.1';
  let dataDir: string;
  let nodePath: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let clientService: ClientService;
  let tlsConfig: TLSConfig;
  let pkAgent: PolykeyAgent;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'polykey');
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
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      options: {
        nodePath,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger,
    });
  });
  afterEach(async () => {
    await clientService?.stop({ force: true });
    await webSocketClient.destroy(true);
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('stops the agent', async () => {
    // Setup
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        agentStop: new AgentStopHandler({
          pkAgentProm: Promise.resolve(pkAgent),
        }),
      },
      options: {
        host: localhost,
      },
      logger: logger.getChild(ClientService.name),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger: logger.getChild('client'),
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        agentStop,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const statusPath = path.join(nodePath, config.paths.statusBase);
    const statusLockPath = path.join(nodePath, config.paths.statusLockBase);
    const status = new Status({
      statusPath,
      statusLockPath,
      fs,
      logger,
    });
    await rpcClient.methods.agentStop({});
    // It may already be stopping
    expect(await status.readStatus()).toMatchObject({
      status: expect.stringMatching(/LIVE|STOPPING|DEAD/),
    });
    await status.waitFor('DEAD');
    expect(pkAgent[running]).toBe(false);
  });
});
describe('agentUnlock', () => {
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
  let clientClient: WebSocketClient;
  let clientService: ClientService;
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
    await clientService?.stop({ force: true });
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
    clientService = await ClientService.createClientService({
      tlsConfig,
      manifest: {
        agentUnlock: new AgentUnlockHandler({}),
      },
      options: {
        host: localhost,
        middlewareFactory:
          clientUtilsAuthMiddleware.authenticationMiddlewareServer(
            sessionManager,
            keyRing,
          ),
      },
      logger: logger.getChild(ClientService.name),
    });
    clientClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host: localhost,
      logger,
      port: clientService.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        agentUnlock,
      },
      streamFactory: async () => clientClient.startConnection(),
      middlewareFactory: rpcUtilsMiddleware.defaultClientMiddlewareWrapper(
        clientUtilsAuthMiddleware.authenticationMiddlewareClient(session),
      ),
      logger,
    });

    // Doing the test
    const result = await rpcClient.methods.agentUnlock({
      metadata: {
        authorization: clientUtils.encodeAuthFromPassword(password),
      },
    });
    expect(result).toMatchObject({
      metadata: {
        authorization: expect.any(String),
      },
    });
    const result2 = await rpcClient.methods.agentUnlock({});
    expect(result2).toMatchObject({
      metadata: {
        authorization: expect.any(String),
      },
    });
  });
});
