import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import KeyManager from '@/keys/KeyManager';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import keysEncrypt from '@/client/service/keysEncrypt';
import keysDecrypt from '@/client/service/keysDecrypt';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as keysPB from '@/proto/js/polykey/v1/keys/keys_pb';
import * as clientUtils from '@/client/utils/utils';
import * as keysUtils from '@/keys/utils';
import * as testUtils from '../../utils';

describe('keysEncryptDecrypt', () => {
  const logger = new Logger('keysEncryptDecrypt test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
  });
  afterAll(async () => {
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  let dataDir: string;
  let keyManager: KeyManager;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
    });
    const clientService = {
      keysEncrypt: keysEncrypt({
        authenticate,
        keyManager,
      }),
      keysDecrypt: keysDecrypt({
        authenticate,
        keyManager,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[ClientServiceService, clientService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: keyManager.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('encrypts and decrypts data', async () => {
    const plainText = Buffer.from('abc');
    const request = new keysPB.Crypto();
    request.setData(plainText.toString('binary'));
    const encrypted = await grpcClient.keysEncrypt(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(encrypted).toBeInstanceOf(keysPB.Crypto);
    const response = await grpcClient.keysDecrypt(
      encrypted,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(keysPB.Crypto);
    expect(response.getData()).toBe('abc');
  });
});
