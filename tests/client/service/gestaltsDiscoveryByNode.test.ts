import type { NodeInfo } from '@/nodes/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import Queue from '@/nodes/Queue';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import KeyManager from '@/keys/KeyManager';
import Discovery from '@/discovery/Discovery';
import IdentitiesManager from '@/identities/IdentitiesManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import Sigchain from '@/sigchain/Sigchain';
import Proxy from '@/network/Proxy';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import gestaltsDiscoveryByNode from '@/client/service/gestaltsDiscoveryByNode';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as nodesPB from '@/proto/js/polykey/v1/nodes/nodes_pb';
import * as clientUtils from '@/client/utils/utils';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as testNodesUtils from '../../nodes/utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';

describe('gestaltsDiscoveryByNode', () => {
  const logger = new Logger('gestaltsDiscoveryByNode test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const node: NodeInfo = {
    id: nodesUtils.encodeNodeId(testNodesUtils.generateRandomNodeId()),
    chain: {},
  };
  const authToken = 'abc123';
  let dataDir: string;
  let discovery: Discovery;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let nodeGraph: NodeGraph;
  let queue: Queue;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let sigchain: Sigchain;
  let proxy: Proxy;
  let acl: ACL;
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
      privateKeyPemOverride: globalRootKeyPems[0],
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      // @ts-ignore - version of js-logger is incompatible (remove when EFS logger updates to 3.*)
      logger,
      crypto: {
        key: keyManager.dbKey,
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
    });
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      logger,
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
    queue = new Queue({
      logger: logger.getChild('queue'),
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyManager,
      nodeGraph,
      proxy,
      queue,
      connConnectTime: 2000,
      connTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyManager,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      queue,
      logger,
    });
    await queue.start();
    await nodeManager.start();
    await nodeConnectionManager.start({ nodeManager });
    discovery = await Discovery.createDiscovery({
      db,
      keyManager,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      sigchain,
      logger,
    });
    const clientService = {
      gestaltsDiscoveryByNode: gestaltsDiscoveryByNode({
        authenticate,
        discovery,
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
    await discovery.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await queue.stop();
    await sigchain.stop();
    await proxy.stop();
    await identitiesManager.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await db.stop();
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('discovers by node', async () => {
    const mockDiscoveryByNode = jest
      .spyOn(Discovery.prototype, 'queueDiscoveryByNode')
      .mockResolvedValue();
    const request = new nodesPB.Node();
    request.setNodeId(node.id);
    const response = await grpcClient.gestaltsDiscoveryByNode(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    expect(mockDiscoveryByNode).toHaveBeenCalled();
    mockDiscoveryByNode.mockRestore();
  });
});
