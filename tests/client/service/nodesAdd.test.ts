import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import KeyManager from '@/keys/KeyManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import Sigchain from '@/sigchain/Sigchain';
import ForwardProxy from '@/network/ForwardProxy';
import ReverseProxy from '@/network/ReverseProxy';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import nodesAdd from '@/client/service/nodesAdd';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as nodesUtils from '@/nodes/utils';
import * as clientUtils from '@/client/utils/utils';
import * as keysUtils from '@/keys/utils';
import * as validationErrors from '@/validation/errors';
import * as testUtils from '../../utils';

describe('nodesAdd', () => {
  const logger = new Logger('nodesAdd test', LogLevel.WARN, [
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
  let nodeGraph: NodeGraph;
  let nodeConnectionManager: NodeConnectionManager;
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
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyManager,
      logger: logger.getChild('NodeGraph'),
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyManager,
      nodeGraph,
      fwdProxy,
      revProxy,
      connConnectTime: 2000,
      connTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    await nodeConnectionManager.start();
    nodeManager = new NodeManager({
      db,
      keyManager,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      logger,
    });
    const clientService = {
      nodesAdd: nodesAdd({
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
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
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
  test('adds a node', async () => {
    const addressMessage = new nodesPB.Address();
    addressMessage.setHost('127.0.0.1');
    addressMessage.setPort(11111);
    const request = new nodesPB.NodeAddress();
    request.setNodeId('vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0');
    request.setAddress(addressMessage);
    const response = await grpcClient.nodesAdd(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    const result = await nodeGraph.getNode(
      nodesUtils.decodeNodeId(
        'vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0',
      )!,
    );
    expect(result).toBeDefined();
    expect(result!.host).toBe('127.0.0.1');
    expect(result!.port).toBe(11111);
  });
  test('cannot add invalid node', async () => {
    // Invalid host
    const addressMessage = new nodesPB.Address();
    addressMessage.setHost('');
    addressMessage.setPort(11111);
    const request = new nodesPB.NodeAddress();
    request.setNodeId('vrsc24a1er424epq77dtoveo93meij0pc8ig4uvs9jbeld78n9nl0');
    request.setAddress(addressMessage);
    await expect(
      grpcClient.nodesAdd(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
    ).rejects.toThrow(validationErrors.ErrorValidation);
    // Invalid port
    addressMessage.setHost('127.0.0.1');
    addressMessage.setPort(111111);
    await expect(
      grpcClient.nodesAdd(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
    ).rejects.toThrow(validationErrors.ErrorValidation);
    // Invalid nodeid
    addressMessage.setPort(11111);
    request.setNodeId('nodeId');
    await expect(
      grpcClient.nodesAdd(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
    ).rejects.toThrow(validationErrors.ErrorValidation);
  });
});
