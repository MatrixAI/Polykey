import type { Host, Port, TLSConfig } from '@/network/types';
import type Proxy from '@/network/Proxy';
import type Status from '@/status/Status';
import type KeyManager from '@/keys/KeyManager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import PolykeyAgent from '@/PolykeyAgent';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import keysKeyPairRenew from '@/client/service/keysKeyPairRenew';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as keysPB from '@/proto/js/polykey/v1/keys/keys_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '@/client/utils/utils';
import * as keysUtils from '@/keys/utils';
import { NodeManager } from '@/nodes';
import * as testUtils from '../../utils';

describe('keysKeyPairRenew', () => {
  const logger = new Logger('keysKeyPairRenew test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedRefreshBuckets: jest.SpyInstance;
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    const newKeyPair = await keysUtils.generateKeyPair(1024);
    mockedRefreshBuckets = jest.spyOn(NodeManager.prototype, 'resetBuckets');
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValueOnce(globalKeyPair)
      .mockResolvedValue(newKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValueOnce(globalKeyPair)
      .mockResolvedValue(newKeyPair);
  });
  afterAll(async () => {
    mockedRefreshBuckets.mockRestore();
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  let dataDir: string;
  let keyManager: KeyManager;
  let grpcServerClient: GRPCServer;
  let proxy: Proxy;

  let status: Status;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  let pkAgent: PolykeyAgent;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const nodePath = path.join(dataDir, 'polykey');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      logger,
    });
    keyManager = pkAgent.keyManager;
    grpcServerClient = pkAgent.grpcServerClient;
    proxy = pkAgent.proxy;
    status = pkAgent.status;
    const clientService = {
      keysKeyPairRenew: keysKeyPairRenew({
        authenticate,
        keyManager,
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
      nodeId: keyManager.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('renews the root key pair', async () => {
    const rootKeyPair1 = keyManager.getRootKeyPairPem();
    const nodeId1 = keyManager.getNodeId();
    // @ts-ignore - get protected property
    const fwdTLSConfig1 = proxy.tlsConfig;
    // @ts-ignore - get protected property
    const serverTLSConfig1 = grpcServerClient.tlsConfig;
    const expectedTLSConfig1: TLSConfig = {
      keyPrivatePem: rootKeyPair1.privateKey,
      certChainPem: await keyManager.getRootCertChainPem(),
    };
    const nodeIdStatus1 = (await status.readStatus())!.data.nodeId;
    expect(mockedRefreshBuckets).toHaveBeenCalledTimes(0);
    expect(fwdTLSConfig1).toEqual(expectedTLSConfig1);
    expect(serverTLSConfig1).toEqual(expectedTLSConfig1);
    expect(nodeId1.equals(nodeIdStatus1)).toBe(true);
    // Run command
    const request = new keysPB.Key();
    request.setName('somepassphrase');
    const response = await grpcClient.keysKeyPairRenew(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    const rootKeyPair2 = keyManager.getRootKeyPairPem();
    const nodeId2 = keyManager.getNodeId();
    // @ts-ignore - get protected property
    const fwdTLSConfig2 = proxy.tlsConfig;
    // @ts-ignore - get protected property
    const serverTLSConfig2 = grpcServerClient.tlsConfig;
    const expectedTLSConfig2: TLSConfig = {
      keyPrivatePem: rootKeyPair2.privateKey,
      certChainPem: await keyManager.getRootCertChainPem(),
    };
    const nodeIdStatus2 = (await status.readStatus())!.data.nodeId;
    expect(mockedRefreshBuckets).toHaveBeenCalled();
    expect(fwdTLSConfig2).toEqual(expectedTLSConfig2);
    expect(serverTLSConfig2).toEqual(expectedTLSConfig2);
    expect(rootKeyPair2.privateKey).not.toBe(rootKeyPair1.privateKey);
    expect(rootKeyPair2.publicKey).not.toBe(rootKeyPair1.publicKey);
    expect(nodeId1).not.toBe(nodeId2);
    expect(nodeIdStatus1).not.toBe(nodeIdStatus2);
    expect(nodeId2.equals(nodeIdStatus2)).toBe(true);
  });
});
