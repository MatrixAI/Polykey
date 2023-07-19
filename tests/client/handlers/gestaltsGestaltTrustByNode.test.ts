import type { TLSConfig } from '@/network/types';
import type { IdentityId, NodeId, NodeIdEncoded, ClaimId } from '@/ids/index';
import type { SignedClaim } from '@/claims/types';
import type { ClaimLinkIdentity } from '@/claims/payloads';
import type { Host, Port } from '@/network/types';
import type { Host as QUICHost } from '@matrixai/quic/dist/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { QUICSocket } from '@matrixai/quic';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import TaskManager from '@/tasks/TaskManager';
import { GestaltsGestaltTrustByNodeHandler } from '@/client/handlers/gestaltsGestaltTrustByNode';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import { encodeProviderIdentityId } from '@/ids/index';
import * as nodesUtils from '@/nodes/utils';
import PolykeyAgent from '@/PolykeyAgent';
import { gestaltsGestaltTrustByNode } from '@/client';
import * as tlsTestsUtils from '../../utils/tls';
import Discovery from '../../../src/discovery/Discovery';
import NodeConnectionManager from '../../../src/nodes/NodeConnectionManager';
import NodeManager from '../../../src/nodes/NodeManager';
import IdentitiesManager from '../../../src/identities/IdentitiesManager';
import Sigchain from '../../../src/sigchain/Sigchain';
import NodeGraph from '../../../src/nodes/NodeGraph';
import TestProvider from '../../identities/TestProvider';

describe('gestaltsGestaltTrustByNode', () => {
  const logger = new Logger('gestaltsGestaltTrustByNode test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  let dataDir: string;
  let db: DB;
  let keyRing: KeyRing;
  let taskManager: TaskManager;
  let webSocketClient: WebSocketClient;
  let webSocketServer: WebSocketServer;
  let tlsConfig: TLSConfig;
  let acl: ACL;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let nodeManager: NodeManager;
  let quicSocket: QUICSocket;
  let nodeConnectionManager: NodeConnectionManager;
  let discovery: Discovery;
  let testProvider: TestProvider;
  const connectedIdentity = 'trusted-node' as IdentityId;
  const nodeChainData: Record<ClaimId, SignedClaim> = {};
  let nodeIdRemote: NodeId;
  let nodeIdEncodedRemote: NodeIdEncoded;
  let node: PolykeyAgent;
  let mockedRequestChainData: jest.SpyInstance;
  let nodeDataDir: string;

  beforeEach(async () => {
    testProvider = new TestProvider();
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    mockedRequestChainData = jest
      .spyOn(NodeManager.prototype, 'requestChainData')
      .mockResolvedValue(nodeChainData);
    nodeDataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'trusted-node-'),
    );
    const nodePath = path.join(nodeDataDir, 'polykey');
    node = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      networkConfig: {
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      logger,
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    nodeIdRemote = node.keyRing.getNodeId();
    nodeIdEncodedRemote = nodesUtils.encodeNodeId(nodeIdRemote);
    node.identitiesManager.registerProvider(testProvider);
    await node.identitiesManager.putToken(testProvider.id, connectedIdentity, {
      accessToken: 'abc123',
    });
    testProvider.users['trusted-node'] = {};
    const identityClaim = {
      typ: 'ClaimLinkIdentity',
      iss: nodeIdEncodedRemote,
      sub: encodeProviderIdentityId([testProvider.id, connectedIdentity]),
    };
    const [claimId, claim] = await node.sigchain.addClaim(identityClaim);
    nodeChainData[claimId] = claim;
    await testProvider.publishClaim(
      connectedIdentity,
      claim as SignedClaim<ClaimLinkIdentity>,
    );

    const keysPath = path.join(dataDir, 'keys');
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    taskManager = await TaskManager.createTaskManager({
      db,
      logger,
      lazy: true,
    });
    tlsConfig = await tlsTestsUtils.createTLSConfig(keyRing.keyPair);
    acl = await ACL.createACL({
      db,
      logger,
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      acl,
      db,
      logger,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      keyRing,
      sigchain,
      db,
      gestaltGraph,
      logger,
    });
    identitiesManager.registerProvider(testProvider);
    await identitiesManager.putToken(testProvider.id, connectedIdentity, {
      accessToken: 'abc123',
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
    const crypto = tlsTestsUtils.createCrypto();
    quicSocket = new QUICSocket({
      logger,
    });
    await quicSocket.start({
      host: '127.0.0.1' as QUICHost,
    });
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      quicClientConfig: {
        // @ts-ignore: TLS not needed for this test
        key: undefined,
        // @ts-ignore: TLS not needed for this test
        cert: undefined,
      },
      crypto,
      quicSocket,
      connConnectTime: 2000,
      connTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      sigchain,
      taskManager,
      gestaltGraph,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({ nodeManager });
    await nodeManager.setNode(nodeIdRemote, {
      host: node.quicServerAgent.host as unknown as Host,
      port: node.quicServerAgent.port as unknown as Port,
    });
    discovery = await Discovery.createDiscovery({
      db,
      gestaltGraph,
      identitiesManager,
      keyRing,
      logger,
      nodeManager,
      taskManager,
    });
    await taskManager.startProcessing();
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await discovery.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await quicSocket.stop();
    await nodeManager.stop();
    await sigchain.stop();
    await identitiesManager.stop();
    await webSocketServer.stop(true);
    await webSocketClient.destroy(true);
    await acl.stop();
    await gestaltGraph.stop();
    await taskManager.stop();
    await keyRing.stop();
    await db.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    await node.stop();
    await fs.promises.rm(nodeDataDir, {
      force: true,
      recursive: true,
    });
    mockedRequestChainData.mockRestore();
  });
  test('trusts a node (already set in gestalt graph)', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        gestaltsGestaltTrustByNode: new GestaltsGestaltTrustByNodeHandler({
          db,
          gestaltGraph,
          discovery,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => rpcServer.handleStream(streamPair),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.getPort(),
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByNode,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await gestaltGraph.setNode({ nodeId: nodeIdRemote });
    const request = {
      nodeIdEncoded: nodeIdEncodedRemote,
    };
    await rpcClient.methods.gestaltsGestaltTrustByNode(request);
    expect(
      await gestaltGraph.getGestaltActions(['node', nodeIdRemote!]),
    ).toEqual({
      notify: null,
    });
  });
  test('trusts a node (new node)', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        gestaltsGestaltTrustByNode: new GestaltsGestaltTrustByNodeHandler({
          db,
          gestaltGraph,
          discovery,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => rpcServer.handleStream(streamPair),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.getPort(),
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByNode,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const request = {
      nodeIdEncoded: nodeIdEncodedRemote,
    };
    await rpcClient.methods.gestaltsGestaltTrustByNode(request);
    expect(
      await gestaltGraph.getGestaltActions(['node', nodeIdRemote]),
    ).toEqual({
      notify: null,
    });
  });
  test('trust extends to entire gestalt', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        gestaltsGestaltTrustByNode: new GestaltsGestaltTrustByNodeHandler({
          db,
          gestaltGraph,
          discovery,
        }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair) => rpcServer.handleStream(streamPair),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.getPort(),
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByNode,
      },
      streamFactory: (ctx) => webSocketClient.startConnection(ctx),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const request = {
      nodeIdEncoded: nodeIdEncodedRemote,
    };
    await rpcClient.methods.gestaltsGestaltTrustByNode(request);
    expect(
      await gestaltGraph.getGestaltActions(['node', nodeIdRemote]),
    ).toEqual({
      notify: null,
    });
    // Give discovery process time to complete before checking identity actions
    // Wait for both identity and node to be set in GG
    while ((await discovery.waitForDiscoveryTasks()) > 0) {
      // Waiting for tasks
    }
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
  });
});
