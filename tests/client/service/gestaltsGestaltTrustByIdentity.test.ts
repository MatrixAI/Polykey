import type { NodeIdEncoded } from '@/nodes/types';
import type { ClaimLinkIdentity } from '@/claims/types';
import type { ChainData } from '@/sigchain/types';
import type { IdentityId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import PolykeyAgent from '@/PolykeyAgent';
import KeyManager from '@/keys/KeyManager';
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
import * as claimsUtils from '@/claims/utils';
import * as gestaltsErrors from '@/gestalts/errors';
import * as keysUtils from '@/keys/utils';
import * as clientUtils from '@/client/utils/utils';
import * as nodesUtils from '@/nodes/utils';
import * as testUtils from '../../utils';
import TestProvider from '../../identities/TestProvider';
import { expectRemoteError } from '../../utils';

describe('gestaltsGestaltTrustByIdentity', () => {
  const logger = new Logger(
    'gestaltsGestaltTrustByIdentity test',
    LogLevel.WARN,
    [new StreamHandler()],
  );
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const testProvider = new TestProvider();
  // Create node to trust
  const connectedIdentity = 'trusted-node' as IdentityId;
  let nodeDataDir: string;
  let node: PolykeyAgent;
  let nodeId: NodeIdEncoded;
  const nodeChainData: ChainData = {};
  let mockedRequestChainData: jest.SpyInstance;
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    const nodeKeyPair = await keysUtils.generateKeyPair(2048);
    mockedRequestChainData = jest
      .spyOn(NodeManager.prototype, 'requestChainData')
      .mockResolvedValue(nodeChainData);
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValueOnce(nodeKeyPair)
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValueOnce(nodeKeyPair)
      .mockResolvedValue(globalKeyPair);
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
    });
    nodeId = nodesUtils.encodeNodeId(node.keyManager.getNodeId());
    node.identitiesManager.registerProvider(testProvider);
    await node.identitiesManager.putToken(testProvider.id, connectedIdentity, {
      accessToken: 'abc123',
    });
    testProvider.users['trusted-node'] = {};
    const identityClaim: ClaimLinkIdentity = {
      type: 'identity',
      node: nodesUtils.encodeNodeId(node.keyManager.getNodeId()),
      provider: testProvider.id,
      identity: connectedIdentity,
    };
    const [claimId, claimEncoded] = await node.sigchain.addClaim(identityClaim);
    const claim = claimsUtils.decodeClaim(claimEncoded);
    nodeChainData[claimId] = claim;
    await testProvider.publishClaim(connectedIdentity, claim);
  }, global.maxTimeout);
  afterAll(async () => {
    await node.stop();
    await fs.promises.rm(nodeDataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
    mockedRequestChainData.mockRestore();
  });
  const authToken = 'abc123';
  let dataDir: string;
  let discovery: Discovery;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let nodeManager: NodeManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeGraph: NodeGraph;
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
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
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
      proxy,
      connConnectTime: 2000,
      connTimeoutTime: 2000,
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyManager,
      sigchain,
      nodeGraph,
      nodeConnectionManager,
      logger: logger.getChild('nodeManager'),
    });
    await nodeManager.start();
    await nodeConnectionManager.start({ nodeManager });
    await nodeManager.setNode(nodesUtils.decodeNodeId(nodeId)!, {
      host: node.proxy.getProxyHost(),
      port: node.proxy.getProxyPort(),
    });
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
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await nodeGraph.stop();
    await proxy.stop();
    await sigchain.stop();
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
  test('trusts an identity (already set in gestalt graph)', async () => {
    testProvider.users['disconnected-user'] = {};
    await gestaltGraph.linkNodeAndIdentity(
      {
        id: nodeId,
        chain: {},
      },
      {
        providerId: testProvider.id,
        identityId: connectedIdentity,
        claims: {},
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
      await gestaltGraph.getGestaltActionsByIdentity(
        testProvider.id,
        connectedIdentity,
      ),
    ).toEqual({
      notify: null,
    });
    // Reverse side effects
    await gestaltGraph.unsetNode(nodesUtils.decodeNodeId(nodeId)!);
    await gestaltGraph.unsetIdentity(testProvider.id, connectedIdentity);
  });
  test('trusts an identity (new identity)', async () => {
    const request = new identitiesPB.Provider();
    request.setProviderId(testProvider.id);
    request.setIdentityId(connectedIdentity);
    // Should fail on first attempt - need to allow time for the identity to be
    // linked to a node via discovery
    await expectRemoteError(
      grpcClient.gestaltsGestaltTrustByIdentity(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait for both identity and node to be set in GG
    await discovery.waitForDrained();
    const response = await grpcClient.gestaltsGestaltTrustByIdentity(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    expect(
      await gestaltGraph.getGestaltActionsByIdentity(
        testProvider.id,
        connectedIdentity,
      ),
    ).toEqual({
      notify: null,
    });
    // Reverse side effects
    await gestaltGraph.unsetNode(nodesUtils.decodeNodeId(nodeId)!);
    await gestaltGraph.unsetIdentity(testProvider.id, connectedIdentity);
  });
  test('cannot trust a disconnected identity', async () => {
    testProvider.users['disconnected-user'] = {};
    const request = new identitiesPB.Provider();
    request.setProviderId(testProvider.id);
    request.setIdentityId('disconnected-user');
    // Should fail on first attempt - attempt to find a connected node
    await expectRemoteError(
      grpcClient.gestaltsGestaltTrustByIdentity(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait and try again - should fail again because the identity has no
    // linked nodes we can trust
    await expectRemoteError(
      grpcClient.gestaltsGestaltTrustByIdentity(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
  });
  test('trust extends to entire gestalt', async () => {
    await gestaltGraph.linkNodeAndIdentity(
      {
        id: nodeId,
        chain: {},
      },
      {
        providerId: testProvider.id,
        identityId: connectedIdentity,
        claims: {},
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
      await gestaltGraph.getGestaltActionsByIdentity(
        testProvider.id,
        connectedIdentity,
      ),
    ).toEqual({
      notify: null,
    });
    expect(
      await gestaltGraph.getGestaltActionsByNode(
        nodesUtils.decodeNodeId(nodeId)!,
      ),
    ).toEqual({
      notify: null,
    });
    // Reverse side effects
    await gestaltGraph.unsetNode(nodesUtils.decodeNodeId(nodeId)!);
    await gestaltGraph.unsetIdentity(testProvider.id, connectedIdentity);
  });
  test('links trusted identity to an existing node', async () => {
    await gestaltGraph.setNode({
      id: nodeId,
      chain: {},
    });
    const request = new identitiesPB.Provider();
    request.setProviderId(testProvider.id);
    request.setIdentityId(connectedIdentity);
    // Should fail on first attempt - need to allow time for the identity to be
    // linked to a node via discovery
    await expectRemoteError(
      grpcClient.gestaltsGestaltTrustByIdentity(
        request,
        clientUtils.encodeAuthFromPassword(password),
      ),
      gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
    );
    // Wait and try again - should succeed second time
    // Wait for both identity and node to be set in GG
    await discovery.waitForDrained();
    const response = await grpcClient.gestaltsGestaltTrustByIdentity(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    expect(
      await gestaltGraph.getGestaltActionsByIdentity(
        testProvider.id,
        connectedIdentity,
      ),
    ).toEqual({
      notify: null,
    });
    expect(
      await gestaltGraph.getGestaltActionsByNode(
        nodesUtils.decodeNodeId(nodeId)!,
      ),
    ).toEqual({
      notify: null,
    });
    // Reverse side effects
    await gestaltGraph.unsetNode(nodesUtils.decodeNodeId(nodeId)!);
    await gestaltGraph.unsetIdentity(testProvider.id, connectedIdentity);
  });
});
