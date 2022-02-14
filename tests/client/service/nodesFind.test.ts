import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import { DB } from '@matrixai/db';
import { KeyManager, utils as keysUtils } from '@/keys';
import { GRPCServer } from '@/grpc';
import { NodeManager } from '@/nodes';
import { Sigchain } from '@/sigchain';
import { ForwardProxy, ReverseProxy } from '@/network';
import {
  GRPCClientClient,
  ClientServiceService,
  utils as clientUtils,
} from '@/client';
import nodesFind from '@/client/service/nodesFind';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as validationErrors from '@/validation/errors';
import * as testUtils from '../../utils';

describe('nodesFind', () => {
  const logger = new Logger('nodesFind test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let mockedFindNode: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedFindNode = jest
      .spyOn(NodeManager.prototype, 'findNode')
      .mockResolvedValue({
        host: '127.0.0.1' as Host,
        port: 11111 as Port,
      });
  });
  afterAll(async () => {
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
    mockedFindNode.mockRestore();
  });
  const authToken = 'abc123';
  let dataDir: string;
  let nodeManager: NodeManager;
  let sigchain: Sigchain;
  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;
  let db: DB;
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
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    fwdProxy = new ForwardProxy({
      authToken,
      logger,
    });
    await fwdProxy.start({
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
    });
    revProxy = new ReverseProxy({ logger });
    await revProxy.start({
      serverHost: '1.1.1.1' as Host,
      serverPort: 1 as Port,
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyManager,
      logger,
    });
    nodeManager = await NodeManager.createNodeManager({
      db,
      keyManager,
      sigchain,
      fwdProxy,
      revProxy,
      logger,
    });
    const clientService = {
      nodesFind: nodesFind({
        authenticate,
        nodeManager,
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
      port: grpcServer.port,
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await nodeManager.stop();
    await sigchain.stop();
    await revProxy.stop();
    await fwdProxy.stop();
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('finds a node', async () => {
    const request = new nodesPB.Node();
    request.setNodeId('vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0');
    const response = await grpcClient.nodesFind(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(nodesPB.NodeAddress);
    expect(response.getNodeId()).toBe(
      'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
    );
    expect(response.getAddress()!.getHost()).toBe('127.0.0.1');
    expect(response.getAddress()!.getPort()).toBe(11111);
  });
  test('cannot find an invalid node', async () => {
    const request = new nodesPB.Node();
    request.setNodeId('nodeId');
    await expect(
      grpcClient.nodesFind(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
    ).rejects.toThrow(validationErrors.ErrorValidation);
  });
});
