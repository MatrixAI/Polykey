import type { Host, Port } from '@/network/types';
import type { CertificatePEM } from '@/keys/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import KeyRing from '@/keys/KeyRing';
import TaskManager from '@/tasks/TaskManager';
import CertManager from '@/keys/CertManager';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import keysCertsGet from '@/client/service/keysCertsGet';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as keysPB from '@/proto/js/polykey/v1/keys/keys_pb';
import * as clientUtils from '@/client/utils/utils';
import * as keysUtils from '@/keys/utils/index';

describe('keysCertsGet', () => {
  const logger = new Logger('keysCertsGet test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedGetRootCertPem: jest.SpyInstance;
  beforeAll(async () => {
    mockedGetRootCertPem = jest
      .spyOn(CertManager.prototype, 'getCurrentCertPEM')
      .mockResolvedValue('rootCertPem' as CertificatePEM);
  });
  afterAll(async () => {
    mockedGetRootCertPem.mockRestore();
  });
  let dataDir: string;
  let keyRing: KeyRing;
  let db: DB;
  let taskManager: TaskManager;
  let certManager: CertManager;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    db = await DB.createDB({
      dbPath,
      logger,
    });
    taskManager = await TaskManager.createTaskManager({ db, logger });
    certManager = await CertManager.createCertManager({
      db,
      keyRing,
      taskManager,
      logger,
    });
    const clientService = {
      keysCertsGet: keysCertsGet({
        authenticate,
        certManager,
        logger,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[ClientServiceService, clientService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: keyRing.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await certManager.stop();
    await taskManager.stop();
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the root certificate', async () => {
    const request = new utilsPB.EmptyMessage();
    const response = await grpcClient.keysCertsGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(keysPB.Certificate);
    expect(response.getCert()).toBe('rootCertPem');
  });
});
