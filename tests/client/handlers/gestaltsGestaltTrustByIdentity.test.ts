import type { TLSConfig } from '@/network/types';
import type { IdentityId, ClaimId, ProviderIdentityClaimId } from '@/ids/index';
import type { SignedClaim } from '@/claims/types';
import type { ClaimLinkIdentity } from '@/claims/payloads';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { formatting, LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import KeyRing from '@/keys/KeyRing';
import * as keysUtils from '@/keys/utils';
import RPCServer from '@/rpc/RPCServer';
import TaskManager from '@/tasks/TaskManager';
import { GestaltsGestaltTrustByIdentityHandler } from '@/client/handlers/gestaltsGestaltTrustByIdentity';
import RPCClient from '@/rpc/RPCClient';
import WebSocketServer from '@/websockets/WebSocketServer';
import WebSocketClient from '@/websockets/WebSocketClient';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import { encodeProviderIdentityId } from '@/ids/index';
import * as nodesUtils from '@/nodes/utils';
import * as gestaltsErrors from '@/gestalts/errors';
import { sleep } from '@/utils';
import { gestaltsGestaltTrustByIdentity } from '@/client';
import * as testsUtils from '../../utils';
import Discovery from '../../../src/discovery/Discovery';
import NodeConnectionManager from '../../../src/nodes/NodeConnectionManager';
import NodeManager from '../../../src/nodes/NodeManager';
import IdentitiesManager from '../../../src/identities/IdentitiesManager';
import Proxy from '../../../src/network/Proxy';
import Sigchain from '../../../src/sigchain/Sigchain';
import NodeGraph from '../../../src/nodes/NodeGraph';
import TestProvider from '../../identities/TestProvider';
import * as testUtils from '../../utils';

describe('gestaltsGestaltTrustByIdentity', () => {
  const logger = new Logger('agentUnlock test', LogLevel.WARN, [
    new StreamHandler(
      formatting.format`${formatting.level}:${formatting.keys}:${formatting.msg}`,
    ),
  ]);
  const password = 'helloWorld';
  const host = '127.0.0.1';
  const authToken = 'abc123';
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
  let proxy: Proxy;
  let nodeManager: NodeManager;
  let nodeConnectionManager: NodeConnectionManager;
  let discovery: Discovery;
  let testProvider: TestProvider;
  const connectedIdentity = 'trusted-node' as IdentityId;
  let claimId: ClaimId;
  const nodeChainData: Record<ClaimId, SignedClaim> = {};

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
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
    tlsConfig = await testsUtils.createTLSConfig(keyRing.keyPair);
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
    proxy = new Proxy({
      authToken,
      logger,
    });
    await proxy.start({
      serverHost: '127.0.0.1' as Host,
      serverPort: 0 as Port,
      tlsConfig: await testsUtils.createTLSConfig(keyRing.keyPair),
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
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      proxy,
      taskManager,
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

    testProvider = new TestProvider();
    identitiesManager.registerProvider(testProvider);
    await identitiesManager.putToken(testProvider.id, connectedIdentity, {
      accessToken: 'abc123',
    });
    testProvider.users['trusted-node'] = {};
    const identityClaim = {
      typ: 'ClaimLinkIdentity',
      iss: nodesUtils.encodeNodeId(keyRing.getNodeId()),
      sub: encodeProviderIdentityId([testProvider.id, connectedIdentity]),
    };
    const [claimId_, claim] = await sigchain.addClaim(identityClaim);
    claimId = claimId_;
    nodeChainData[claimId_] = claim;
    await testProvider.publishClaim(
      connectedIdentity,
      claim as SignedClaim<ClaimLinkIdentity>,
    );
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await discovery.stop();
    await nodeGraph.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await sigchain.stop();
    await proxy.stop();
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
  });
  test('trusts an identity (already set in gestalt graph)', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        gestaltsGestaltTrustByIdentity:
          new GestaltsGestaltTrustByIdentityHandler({
            db,
            gestaltGraph,
            discovery,
          }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    testProvider.users['disconnected-user'] = {};
    await gestaltGraph.linkNodeAndIdentity(
      { nodeId: keyRing.getNodeId() },
      {
        providerId: testProvider.id,
        identityId: connectedIdentity,
      },
      {
        claim: nodeChainData[claimId] as SignedClaim<ClaimLinkIdentity>,
        meta: {
          providerIdentityClaimId: '' as ProviderIdentityClaimId,
        },
      },
    );
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    await rpcClient.methods.gestaltsGestaltTrustByIdentity(request);
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
  });
  test('trusts an identity (new identity)', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        gestaltsGestaltTrustByIdentity:
          new GestaltsGestaltTrustByIdentityHandler({
            db,
            gestaltGraph,
            discovery,
          }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    // Should fail on first attempt - need to allow time for the identity to be
    // linked to a node via discovery
    await testUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait for both identity and node to be set in GG
    let existingTasks: number = 0;
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    await rpcClient.methods.gestaltsGestaltTrustByIdentity(request);
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
  });
  test('cannot trust a disconnected identity', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        gestaltsGestaltTrustByIdentity:
          new GestaltsGestaltTrustByIdentityHandler({
            db,
            gestaltGraph,
            discovery,
          }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    testProvider.users['disconnected-user'] = {};
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    // Should fail on first attempt - attempt to find a connected node
    await testUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait and try again - should fail again because the identity has no
    // linked nodes we can trust
    await testUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
  });
  test('trust extends to entire gestalt', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        gestaltsGestaltTrustByIdentity:
          new GestaltsGestaltTrustByIdentityHandler({
            db,
            gestaltGraph,
            discovery,
          }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await gestaltGraph.linkNodeAndIdentity(
      { nodeId: keyRing.getNodeId() },
      {
        providerId: testProvider.id,
        identityId: connectedIdentity,
      },
      {
        claim: nodeChainData[claimId] as SignedClaim<ClaimLinkIdentity>,
        meta: {
          providerIdentityClaimId: '' as ProviderIdentityClaimId,
        },
      },
    );
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    await rpcClient.methods.gestaltsGestaltTrustByIdentity(request);
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
    expect(
      await gestaltGraph.getGestaltActions(['node', keyRing.getNodeId()]),
    ).toEqual({
      notify: null,
    });
  });
  test('links trusted identity to an existing node', async () => {
    // Setup
    const rpcServer = await RPCServer.createRPCServer({
      manifest: {
        gestaltsGestaltTrustByIdentity:
          new GestaltsGestaltTrustByIdentityHandler({
            db,
            gestaltGraph,
            discovery,
          }),
      },
      logger,
    });
    webSocketServer = await WebSocketServer.createWebSocketServer({
      connectionCallback: (streamPair, connectionInfo) =>
        rpcServer.handleStream(streamPair, connectionInfo),
      host,
      tlsConfig,
      logger: logger.getChild('server'),
    });
    webSocketClient = await WebSocketClient.createWebSocketClient({
      expectedNodeIds: [keyRing.getNodeId()],
      host,
      logger: logger.getChild('client'),
      port: webSocketServer.port,
    });
    const rpcClient = await RPCClient.createRPCClient({
      manifest: {
        gestaltsGestaltTrustByIdentity,
      },
      streamFactory: async () => webSocketClient.startConnection(),
      logger: logger.getChild('clientRPC'),
    });

    // Doing the test
    await gestaltGraph.setNode({
      nodeId: keyRing.getNodeId(),
    });
    const request = {
      providerId: testProvider.id,
      identityId: connectedIdentity,
    };
    // Should fail on first attempt - need to allow time for the identity to be
    // linked to a node via discovery
    await testUtils.expectRemoteError(
      rpcClient.methods.gestaltsGestaltTrustByIdentity(request),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait and try again - should succeed second time
    await sleep(2000);
    await rpcClient.methods.gestaltsGestaltTrustByIdentity(request);
    // Wait for both identity and node to be set in GG
    let existingTasks: number = 0;
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    await rpcClient.methods.gestaltsGestaltTrustByIdentity(request);
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
    expect(
      await gestaltGraph.getGestaltActions(['node', keyRing.getNodeId()]),
    ).toEqual({
      notify: null,
    });
  });
});
