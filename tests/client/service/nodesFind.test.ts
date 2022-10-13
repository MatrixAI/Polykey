import type { Host, Port } from '@/network/types';
import type NodeManager from '@/nodes/NodeManager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import TaskManager from '@/tasks/TaskManager';
import KeyRing from '@/keys/KeyRing';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import Sigchain from '@/sigchain/Sigchain';
import Proxy from '@/network/Proxy';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import nodesFind from '@/client/service/nodesFind';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as clientUtils from '@/client/utils/utils';
import * as validationErrors from '@/validation/errors';
import * as testUtils from '../../utils';
import * as keysUtils from '@/keys/utils/index';
import { CertificatePEMChain } from '@/keys/types';
import * as testsUtils from '../../utils/index';

describe('nodesFind', () => {
  const logger = new Logger('nodesFind test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let mockedFindNode: jest.SpyInstance;
  beforeAll(async () => {
    mockedFindNode = jest
      .spyOn(NodeConnectionManager.prototype, 'findNode')
      .mockResolvedValue({
        host: '127.0.0.1' as Host,
        port: 11111 as Port,
      });
  });
  afterAll(async () => {
    mockedFindNode.mockRestore();
  });
  const authToken = 'abc123';
  let dataDir: string;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let sigchain: Sigchain;
  let proxy: Proxy;

  let db: DB;
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
      memoryLocked: false,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    proxy = new Proxy({
      authToken,
      logger,
    });
    await proxy.start({
      tlsConfig: await testsUtils.createTLSConfig(keyRing.keyPair),
      serverHost: '127.0.0.1' as Host,
      serverPort: 0 as Port,
    });
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger,
    });
    nodeGraph = await NodeGraph.createNodeGraph({
      db,
      keyRing,
      logger: logger.getChild('NodeGraph'),
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      proxy,
      taskManager,
      connConnectTime: 2000,
      connTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    await nodeConnectionManager.start({ nodeManager: {} as NodeManager });
    await taskManager.startProcessing();
    const clientService = {
      nodesFind: nodesFind({
        authenticate,
        nodeConnectionManager,
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
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await grpcClient.destroy();
    await grpcServer.stop();
    await sigchain.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await proxy.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
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
    await testUtils.expectRemoteError(
      grpcClient.nodesFind(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      validationErrors.ErrorValidation,
    );
  });
});
