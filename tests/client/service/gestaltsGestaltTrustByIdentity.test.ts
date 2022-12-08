import type { NodeId, ProviderIdentityClaimId } from '@/ids/types';
import type { IdentityId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
import type { Key } from '@/keys/types';
import type { ClaimId } from '@/ids/types';
import type { SignedClaim } from '@/claims/types';
import type { ClaimLinkIdentity } from '@/claims/payloads/index';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import TaskManager from '@/tasks/TaskManager';
import PolykeyAgent from '@/PolykeyAgent';
import KeyRing from '@/keys/KeyRing';
import Discovery from '@/discovery/Discovery';
import IdentitiesManager from '@/identities/IdentitiesManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import Sigchain from '@/sigchain/Sigchain';
import Proxy from '@/network/Proxy';
import GestaltGraph from '@/gestalts/GestaltGraph';
import ACL from '@/acl/ACL';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import gestaltsGestaltTrustByIdentity from '@/client/service/gestaltsGestaltTrustByIdentity';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as identitiesPB from '@/proto/js/polykey/v1/identities/identities_pb';
import * as gestaltsErrors from '@/gestalts/errors';
import * as keysUtils from '@/keys/utils';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';
import * as utils from '@/utils/index';
import { encodeProviderIdentityId } from '@/ids/index';
import { sleep } from '@/utils/index';
import * as testsUtils from '../../utils/index';
import TestProvider from '../../identities/TestProvider';
import * as testUtils from '../../utils';

describe('gestaltsGestaltTrustByIdentity', () => {
  const logger = new Logger(
    'gestaltsGestaltTrustByIdentity test',
    LogLevel.WARN,
    [new StreamHandler()],
  );
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let testProvider: TestProvider;
  // Create node to trust
  const connectedIdentity = 'trusted-node' as IdentityId;
  let nodeDataDir: string;
  let node: PolykeyAgent;
  let nodeId: NodeId;
  let claimId: ClaimId;
  const nodeChainData: Record<ClaimId, SignedClaim> = {};
  let mockedRequestChainData: jest.SpyInstance;
  const authToken = 'abc123';
  let dataDir: string;
  let discovery: Discovery;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let taskManager: TaskManager;
  let nodeManager: NodeManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeGraph: NodeGraph;
  let sigchain: Sigchain;
  let proxy: Proxy;
  let acl: ACL;
  let db: DB;
  let keyRing: KeyRing;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    testProvider = new TestProvider();
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
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
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
    nodeId = node.keyRing.getNodeId();
    node.identitiesManager.registerProvider(testProvider);
    await node.identitiesManager.putToken(testProvider.id, connectedIdentity, {
      accessToken: 'abc123',
    });
    testProvider.users['trusted-node'] = {};
    const identityClaim = {
      typ: 'ClaimLinkIdentity',
      iss: nodesUtils.encodeNodeId(node.keyRing.getNodeId()),
      sub: encodeProviderIdentityId([testProvider.id, connectedIdentity]),
    };
    const [claimId_, claim] = await node.sigchain.addClaim(identityClaim);
    claimId = claimId_;
    nodeChainData[claimId_] = claim;
    await testProvider.publishClaim(
      connectedIdentity,
      claim as SignedClaim<ClaimLinkIdentity>,
    );

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
      strictMemoryLock: false,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
      crypto: {
        key: keyRing.dbKey,
        ops: {
          encrypt: async (key, plainText) => {
            return keysUtils.encryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(plainText),
            );
          },
          decrypt: async (key, cipherText) => {
            return keysUtils.decryptWithKey(
              utils.bufferWrap(key) as Key,
              utils.bufferWrap(cipherText),
            );
          },
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
      keyRing,
      sigchain,
      db,
      gestaltGraph,
      logger,
    });
    identitiesManager.registerProvider(testProvider);
    await identitiesManager.putToken(
      testProvider.id,
      'test-user' as IdentityId,
      {
        accessToken: 'def456',
      },
    );
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
    await nodeManager.setNode(nodeId, {
      host: node.proxy.getProxyHost(),
      port: node.proxy.getProxyPort(),
    });
    discovery = await Discovery.createDiscovery({
      db,
      keyRing,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      taskManager,
      logger,
    });
    await taskManager.startProcessing();
    const clientService = {
      gestaltsGestaltTrustByIdentity: gestaltsGestaltTrustByIdentity({
        authenticate,
        gestaltGraph,
        discovery,
        logger,
        db,
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
    await discovery.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await nodeGraph.stop();
    await proxy.stop();
    await sigchain.stop();
    await identitiesManager.stop();
    await gestaltGraph.stop();
    await acl.stop();
    await db.stop();
    await keyRing.stop();
    await taskManager.stop();
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
  test('trusts an identity (already set in gestalt graph)', async () => {
    testProvider.users['disconnected-user'] = {};
    await gestaltGraph.linkNodeAndIdentity(
      { nodeId: nodeId },
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
    const request = new identitiesPB.Provider();
    request.setProviderId(testProvider.id);
    request.setIdentityId(connectedIdentity);
    const response = await grpcClient.gestaltsGestaltTrustByIdentity(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
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
    const request = new identitiesPB.Provider();
    request.setProviderId(testProvider.id);
    request.setIdentityId(connectedIdentity);
    // Should fail on first attempt - need to allow time for the identity to be
    // linked to a node via discovery
    await testUtils.expectRemoteError(
      grpcClient.gestaltsGestaltTrustByIdentity(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait for both identity and node to be set in GG
    let existingTasks: number = 0;
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    const response = await grpcClient.gestaltsGestaltTrustByIdentity(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
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
    testProvider.users['disconnected-user'] = {};
    const request = new identitiesPB.Provider();
    request.setProviderId(testProvider.id);
    request.setIdentityId('disconnected-user');
    // Should fail on first attempt - attempt to find a connected node
    await testUtils.expectRemoteError(
      grpcClient.gestaltsGestaltTrustByIdentity(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait and try again - should fail again because the identity has no
    // linked nodes we can trust
    await testUtils.expectRemoteError(
      grpcClient.gestaltsGestaltTrustByIdentity(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
  });
  test('trust extends to entire gestalt', async () => {
    await gestaltGraph.linkNodeAndIdentity(
      { nodeId: nodeId },
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
    const request = new identitiesPB.Provider();
    request.setProviderId(testProvider.id);
    request.setIdentityId(connectedIdentity);
    const response = await grpcClient.gestaltsGestaltTrustByIdentity(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
    expect(await gestaltGraph.getGestaltActions(['node', nodeId])).toEqual({
      notify: null,
    });
  });
  test('links trusted identity to an existing node', async () => {
    await gestaltGraph.setNode({
      nodeId: nodeId,
    });
    const request = new identitiesPB.Provider();
    request.setProviderId(testProvider.id);
    request.setIdentityId(connectedIdentity);
    // Should fail on first attempt - need to allow time for the identity to be
    // linked to a node via discovery
    await testUtils.expectRemoteError(
      grpcClient.gestaltsGestaltTrustByIdentity(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait and try again - should succeed second time
    await sleep(2000);
    await grpcClient.gestaltsGestaltTrustByIdentity(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    // Wait for both identity and node to be set in GG
    let existingTasks: number = 0;
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    const response = await grpcClient.gestaltsGestaltTrustByIdentity(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    expect(
      await gestaltGraph.getGestaltActions([
        'identity',
        [testProvider.id, connectedIdentity],
      ]),
    ).toEqual({
      notify: null,
    });
    expect(await gestaltGraph.getGestaltActions(['node', nodeId])).toEqual({
      notify: null,
    });
  });
});
