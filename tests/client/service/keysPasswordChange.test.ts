import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import KeyRing from '@/keys/KeyRing';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import keysPasswordChange from '@/client/service/keysPasswordChange';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as sessionsPB from '@/proto/js/polykey/v1/sessions/sessions_pb';
import * as clientUtils from '@/client/utils/utils';
import * as keysUtils from '@/keys/utils/index';

describe('keysPasswordChange', () => {
  const logger = new Logger('keysPasswordChange test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedChangePassword: jest.SpyInstance;
  beforeAll(async () => {
    mockedChangePassword = jest
      .spyOn(KeyRing.prototype, 'changePassword')
      .mockImplementation(async () => {
        password = 'newpassword';
      });
  });
  afterAll(async () => {
    mockedChangePassword.mockRestore();
  });
  let dataDir: string;
  let keyRing: KeyRing;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
    });
    const clientService = {
      keysPasswordChange: keysPasswordChange({
        authenticate,
        keyRing,
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
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('changes the password', async () => {
    expect(password).toBe('helloworld');
    const request = new sessionsPB.Password();
    request.setPassword('newpassword');
    const response = await grpcClient.keysPasswordChange(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    expect(password).toBe('newpassword');
  });
});
