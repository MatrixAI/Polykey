import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import CertManager from '@/keys/CertManager';
import KeyRing from '@/keys/KeyRing';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import keysCertsChainGet from '@/client/service/keysCertsChainGet';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as keysPB from '@/proto/js/polykey/v1/keys/keys_pb';
import * as clientUtils from '@/client/utils/utils';
import { CertificatePEM } from '../../../src/keys/types';
import * as keysUtils from '@/keys/utils/index';

describe('keysCertsChainGet', () => {
  const logger = new Logger('keysCertsChainGet test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const certs = ['cert1', 'cert2', 'cert3'] as Array<CertificatePEM>;
  let mockedGetRootCertChainPems: jest.SpyInstance;
  beforeAll(async () => {
    mockedGetRootCertChainPems = jest
      .spyOn(CertManager.prototype, 'getCertPEMsChain')
      .mockResolvedValue(certs);
  });
  afterAll(async () => {
    mockedGetRootCertChainPems.mockRestore();
  });
  let dataDir: string;
  let keyRing: KeyRing;
  let db: DB;
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
      memoryLocked: false,
    });
    db = await DB.createDB({
      dbPath,
      logger,
    })
    certManager = await CertManager.createCertManager({
      db,
      keyRing,
      logger,
    })
    const clientService = {
      keysCertsChainGet: keysCertsChainGet({
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
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets the root certchain', async () => {
    const request = new utilsPB.EmptyMessage();
    const response = grpcClient.keysCertsChainGet(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    const output = Array<string>();
    for await (const cert of response) {
      expect(cert).toBeInstanceOf(keysPB.Certificate);
      output.push(cert.getCert());
    }
    expect(output).toEqual(certs);
  });
});
