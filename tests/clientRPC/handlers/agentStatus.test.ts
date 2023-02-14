import type { Server } from 'https';
import type { WebSocketServer } from 'ws';
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
  agentStatusCaller,
  AgentStatusHandler,
} from '@/clientRPC/handlers/agentStatus';
import RPCClient from '@/RPC/RPCClient';
import * as clientRPCUtils from '@/clientRPC/utils';
import * as nodesUtils from '@/nodes/utils';
import * as testsUtils from '../../utils';

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
  let server: Server;
  let wss: WebSocketServer;
  const host = '127.0.0.1';
  let port: number;

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
    const tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
    server = createServer({
      cert: tlsConfig.certChainPem,
      key: tlsConfig.keyPrivatePem,
    });
    port = await clientRPCUtils.listen(server, host);
  });
  afterEach(async () => {
    wss?.close();
    server?.close();
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
      manifest: {
        agentStatus: new AgentStatusHandler({
          keyRing,
          certManager,
          logger: logger.getChild('container'),
        }),
      },
      logger: logger.getChild('RPCServer'),
    });
    wss = clientRPCUtils.createClientServer(
      server,
      rpcServer,
      logger.getChild('server'),
    );
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        agentStatus: agentStatusCaller,
      },
      streamPairCreateCallback: async () => {
        return clientRPCUtils.startConnection(
          host,
          port,
          logger.getChild('client'),
        );
      },
      logger: logger.getChild('RPCClient'),
    });
    // Doing the test
    const result = await rpcClient.methods.agentStatus({});
    expect(result).toStrictEqual({
      pid: process.pid,
      nodeId: nodesUtils.encodeNodeId(keyRing.getNodeId()),
      publicJwk: JSON.stringify(
        keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey),
      ),
    });
  });
});
