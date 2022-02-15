import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import KeyManager from '@/keys/KeyManager';
import Proxy from '@/network/Proxy';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import agentStatus from '@/client/service/agentStatus';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as agentPB from '@/proto/js/polykey/v1/agent/agent_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as keysUtils from '@/keys/utils';
import * as clientUtils from '@/client/utils/utils';
import * as testUtils from '../../utils';

describe('agentStatus', () => {
  const logger = new Logger('agentStatus test', LogLevel.WARN, [
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
  const authToken = 'abc123';
  let dataDir: string;
  let keyManager: KeyManager;
  let grpcServerClient: GRPCServer;
  let grpcServerAgent: GRPCServer;
  let proxy: Proxy;
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
    grpcServerClient = new GRPCServer({ logger });
    await grpcServerClient.start({
      services: [],
    });
    grpcServerAgent = new GRPCServer({ logger });
    await grpcServerAgent.start({
      services: [],
    });
    proxy = new Proxy({
      authToken,
      logger,
    });
    await proxy.start({
      serverHost: '127.0.0.1' as Host,
      serverPort: 0 as Port,
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
    });
    const clientService = {
      agentStatus: agentStatus({
        authenticate,
        keyManager,
        grpcServerClient,
        grpcServerAgent,
        proxy,
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
    await proxy.stop();
    await grpcServerAgent.stop();
    await grpcServerClient.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('gets status', async () => {
    const request = new utilsPB.EmptyMessage();
    const response = await grpcClient.agentStatus(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(agentPB.InfoMessage);
    expect(response.toObject()).toMatchObject({
      pid: expect.any(Number),
      nodeId: expect.any(String),
      clientHost: expect.any(String),
      clientPort: expect.any(Number),
      agentHost: expect.any(String),
      agentPort: expect.any(Number),
      forwardHost: expect.any(String),
      forwardPort: expect.any(Number),
      proxyHost: expect.any(String),
      proxyPort: expect.any(Number),
      rootPublicKeyPem: expect.any(String),
      rootCertPem: expect.any(String),
    });
  });
});
