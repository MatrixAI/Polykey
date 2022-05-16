import type { ClaimLinkIdentity } from '@/claims/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { PolykeyAgent } from '@';
import { Discovery } from '@/discovery';
import { GestaltGraph } from '@/gestalts';
import { IdentitiesManager } from '@/identities';
import { NodeConnectionManager, NodeGraph, NodeManager } from '@/nodes';
import { KeyManager } from '@/keys';
import { ACL } from '@/acl';
import { Sigchain } from '@/sigchain';
import Proxy from '@/network/Proxy';
import * as nodesUtils from '@/nodes/utils';
import * as claimsUtils from '@/claims/utils';
import * as discoveryErrors from '@/discovery/errors';
import * as keysUtils from '@/keys/utils';
import * as testNodesUtils from '../nodes/utils';
import * as testUtils from '../utils';
import TestProvider from '../identities/TestProvider';

describe('Discovery', () => {
  const password = 'password';
  const logger = new Logger(`${Discovery.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const testProvider = new TestProvider();
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  /**
   * Shared GestaltGraph, IdentitiesManager, NodeManager for all tests
   */
  let dataDir: string;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let nodeGraph: NodeGraph;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let db: DB;
  let acl: ACL;
  let keyManager: KeyManager;
  let sigchain: Sigchain;
  let proxy: Proxy;
  // Other gestalt
  let nodeA: PolykeyAgent;
  let nodeB: PolykeyAgent;
  let identityId: IdentityId;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValueOnce(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValueOnce(globalKeyPair);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger: logger.getChild('KeyManager'),
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger: logger.getChild('db'),
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
      logger: logger.getChild('acl'),
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger: logger.getChild('gestaltGraph'),
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      db,
      logger: logger.getChild('identities'),
    });
    identitiesManager.registerProvider(testProvider);
    await identitiesManager.putToken(
      testToken.providerId,
      testToken.identityId,
      testToken.tokenData,
    );
    sigchain = await Sigchain.createSigchain({
      db,
      keyManager,
      logger: logger.getChild('sigChain'),
    });
    proxy = new Proxy({
      authToken: 'abc123',
      logger: logger.getChild('fwxProxy'),
    });
    await proxy.start({
      forwardHost: '127.0.0.1' as Host,
      serverHost: '127.0.0.1' as Host,
      serverPort: 0 as Port,
      proxyHost: '127.0.0.1' as Host,
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
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
    await nodeConnectionManager.start();
    nodeManager = new NodeManager({
      db,
      keyManager,
      sigchain,
      nodeGraph,
      nodeConnectionManager,
      logger: logger.getChild('nodeManager'),
    });
    // Set up other gestalt
    nodeA = await PolykeyAgent.createPolykeyAgent({
      password: password,
      nodePath: path.join(dataDir, 'nodeA'),
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        rootKeyPairBits: 2048,
      },
      logger: logger.getChild('nodeA'),
    });
    nodeB = await PolykeyAgent.createPolykeyAgent({
      password: password,
      nodePath: path.join(dataDir, 'nodeB'),
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        rootKeyPairBits: 2048,
      },
      logger: logger.getChild('nodeB'),
    });
    await testNodesUtils.nodesConnect(nodeA, nodeB);
    await nodeGraph.setNode(nodeA.keyManager.getNodeId(), {
      host: nodeA.proxy.getProxyHost(),
      port: nodeA.proxy.getProxyPort(),
    });
    await nodeA.nodeManager.claimNode(nodeB.keyManager.getNodeId());
    nodeA.identitiesManager.registerProvider(testProvider);
    identityId = 'other-gestalt' as IdentityId;
    await nodeA.identitiesManager.putToken(testToken.providerId, identityId, {
      accessToken: 'def456',
    });
    testProvider.users[identityId] = {};
    const identityClaim: ClaimLinkIdentity = {
      type: 'identity',
      node: nodesUtils.encodeNodeId(nodeB.keyManager.getNodeId()),
      provider: testProvider.id,
      identity: identityId,
    };
    const [, claimEncoded] = await nodeB.sigchain.addClaim(identityClaim);
    const claim = claimsUtils.decodeClaim(claimEncoded);
    await testProvider.publishClaim(identityId, claim);
  }, global.maxTimeout);
  afterAll(async () => {
    await nodeA.stop();
    await nodeB.stop();
    await nodeConnectionManager.stop();
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
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  test('discovery readiness', async () => {
    const discovery = await Discovery.createDiscovery({
      db,
      keyManager,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      sigchain,
      logger,
    });
    await expect(discovery.destroy()).rejects.toThrow(
      discoveryErrors.ErrorDiscoveryRunning,
    );
    await discovery.start();
    await discovery.stop();
    await discovery.destroy();
    await expect(
      discovery.queueDiscoveryByIdentity('' as ProviderId, '' as IdentityId),
    ).rejects.toThrow(discoveryErrors.ErrorDiscoveryNotRunning);
    await expect(
      discovery.queueDiscoveryByNode(testUtils.generateRandomNodeId()),
    ).rejects.toThrow(discoveryErrors.ErrorDiscoveryNotRunning);
  });
  test('discovery by node', async () => {
    const discovery = await Discovery.createDiscovery({
      db,
      keyManager,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      sigchain,
      logger,
    });
    await discovery.queueDiscoveryByNode(nodeA.keyManager.getNodeId());
    await discovery.waitForDrained();
    const gestalt = await gestaltGraph.getGestalts();
    const gestaltMatrix = gestalt[0].matrix;
    const gestaltNodes = gestalt[0].nodes;
    const gestaltIdentities = gestalt[0].identities;
    expect(Object.keys(gestaltMatrix)).toHaveLength(3);
    expect(Object.keys(gestaltNodes)).toHaveLength(2);
    expect(Object.keys(gestaltIdentities)).toHaveLength(1);
    const gestaltString = JSON.stringify(gestalt[0]);
    expect(gestaltString).toContain(
      nodesUtils.encodeNodeId(nodeA.keyManager.getNodeId()),
    );
    expect(gestaltString).toContain(
      nodesUtils.encodeNodeId(nodeB.keyManager.getNodeId()),
    );
    expect(gestaltString).toContain(identityId);
    // Reverse side-effects
    await gestaltGraph.unsetNode(nodeA.keyManager.getNodeId());
    await gestaltGraph.unsetNode(nodeB.keyManager.getNodeId());
    await gestaltGraph.unsetIdentity(testToken.providerId, identityId);
    await discovery.stop();
    await discovery.destroy();
  });
  test('discovery by identity', async () => {
    const discovery = await Discovery.createDiscovery({
      db,
      keyManager,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      sigchain,
      logger,
    });
    await discovery.queueDiscoveryByIdentity(testToken.providerId, identityId);
    await discovery.waitForDrained();
    const gestalt = (await gestaltGraph.getGestalts())[0];
    const gestaltMatrix = gestalt.matrix;
    const gestaltNodes = gestalt.nodes;
    const gestaltIdentities = gestalt.identities;
    expect(Object.keys(gestaltMatrix)).toHaveLength(3);
    expect(Object.keys(gestaltNodes)).toHaveLength(2);
    expect(Object.keys(gestaltIdentities)).toHaveLength(1);
    const gestaltString = JSON.stringify(gestalt);
    expect(gestaltString).toContain(
      nodesUtils.encodeNodeId(nodeA.keyManager.getNodeId()),
    );
    expect(gestaltString).toContain(
      nodesUtils.encodeNodeId(nodeB.keyManager.getNodeId()),
    );
    expect(gestaltString).toContain(identityId);
    // Reverse side-effects
    await gestaltGraph.unsetNode(nodeA.keyManager.getNodeId());
    await gestaltGraph.unsetNode(nodeB.keyManager.getNodeId());
    await gestaltGraph.unsetIdentity(testToken.providerId, identityId);
    await discovery.stop();
    await discovery.destroy();
  });
  test('updates previously discovered gestalts', async () => {
    const discovery = await Discovery.createDiscovery({
      db,
      keyManager,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      sigchain,
      logger,
    });
    await discovery.queueDiscoveryByNode(nodeA.keyManager.getNodeId());
    await discovery.waitForDrained();
    const gestalt1 = (await gestaltGraph.getGestalts())[0];
    const gestaltMatrix1 = gestalt1.matrix;
    const gestaltNodes1 = gestalt1.nodes;
    const gestaltIdentities1 = gestalt1.identities;
    expect(Object.keys(gestaltMatrix1)).toHaveLength(3);
    expect(Object.keys(gestaltNodes1)).toHaveLength(2);
    expect(Object.keys(gestaltIdentities1)).toHaveLength(1);
    const gestaltString1 = JSON.stringify(gestalt1);
    expect(gestaltString1).toContain(
      nodesUtils.encodeNodeId(nodeA.keyManager.getNodeId()),
    );
    expect(gestaltString1).toContain(
      nodesUtils.encodeNodeId(nodeB.keyManager.getNodeId()),
    );
    expect(gestaltString1).toContain(identityId);
    // Add another linked identity
    const identityId2 = 'other-gestalt2' as IdentityId;
    await nodeA.identitiesManager.putToken(testToken.providerId, identityId2, {
      accessToken: 'ghi789',
    });
    testProvider.users[identityId2] = {};
    const identityClaim: ClaimLinkIdentity = {
      type: 'identity',
      node: nodesUtils.encodeNodeId(nodeA.keyManager.getNodeId()),
      provider: testProvider.id,
      identity: identityId2,
    };
    const [, claimEncoded] = await nodeA.sigchain.addClaim(identityClaim);
    const claim = claimsUtils.decodeClaim(claimEncoded);
    await testProvider.publishClaim(identityId2, claim);
    // Note that eventually we would like to add in a system of revisiting
    // already discovered vertices, however for now we must do this manually.
    await discovery.queueDiscoveryByNode(nodeA.keyManager.getNodeId());
    await discovery.waitForDrained();
    const gestalt2 = (await gestaltGraph.getGestalts())[0];
    const gestaltMatrix2 = gestalt2.matrix;
    const gestaltNodes2 = gestalt2.nodes;
    const gestaltIdentities2 = gestalt2.identities;
    expect(Object.keys(gestaltMatrix2)).toHaveLength(4);
    expect(Object.keys(gestaltNodes2)).toHaveLength(2);
    expect(Object.keys(gestaltIdentities2)).toHaveLength(2);
    const gestaltString2 = JSON.stringify(gestalt2);
    expect(gestaltString2).toContain(
      nodesUtils.encodeNodeId(nodeA.keyManager.getNodeId()),
    );
    expect(gestaltString2).toContain(
      nodesUtils.encodeNodeId(nodeB.keyManager.getNodeId()),
    );
    expect(gestaltString2).toContain(identityId);
    expect(gestaltString2).toContain(identityId2);
    // Reverse side-effects
    await gestaltGraph.unsetNode(nodeA.keyManager.getNodeId());
    await gestaltGraph.unsetNode(nodeB.keyManager.getNodeId());
    await gestaltGraph.unsetIdentity(testToken.providerId, identityId);
    await gestaltGraph.unsetIdentity(testToken.providerId, identityId2);
    // Can just remove the user that the claim is for as this will cause the
    // claim to be dropped during discovery
    delete testProvider.users[identityId2];
    await discovery.stop();
    await discovery.destroy();
  });
  test('discovery persistence across restarts', async () => {
    const discovery = await Discovery.createDiscovery({
      db,
      keyManager,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      sigchain,
      logger,
    });
    await discovery.queueDiscoveryByNode(nodeA.keyManager.getNodeId());
    await discovery.stop();
    await discovery.start();
    await discovery.waitForDrained();
    const gestalt = (await gestaltGraph.getGestalts())[0];
    const gestaltMatrix = gestalt.matrix;
    const gestaltNodes = gestalt.nodes;
    const gestaltIdentities = gestalt.identities;
    expect(Object.keys(gestaltMatrix)).toHaveLength(3);
    expect(Object.keys(gestaltNodes)).toHaveLength(2);
    expect(Object.keys(gestaltIdentities)).toHaveLength(1);
    const gestaltString = JSON.stringify(gestalt);
    expect(gestaltString).toContain(
      nodesUtils.encodeNodeId(nodeA.keyManager.getNodeId()),
    );
    expect(gestaltString).toContain(
      nodesUtils.encodeNodeId(nodeB.keyManager.getNodeId()),
    );
    expect(gestaltString).toContain(identityId);
    // Reverse side-effects
    await gestaltGraph.unsetNode(nodeA.keyManager.getNodeId());
    await gestaltGraph.unsetNode(nodeB.keyManager.getNodeId());
    await gestaltGraph.unsetIdentity(testToken.providerId, identityId);
    await discovery.stop();
    await discovery.destroy();
  });
});
