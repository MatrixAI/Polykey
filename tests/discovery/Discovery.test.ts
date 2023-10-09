import type { IdentityId, ProviderId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
import type { Key } from '@/keys/types';
import type { SignedClaim } from '../../src/claims/types';
import type { ClaimLinkIdentity } from '@/claims/payloads';
import type { NodeId } from '../../src/ids/index';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { PromiseCancellable } from '@matrixai/async-cancellable';
import { AsyncIterableX as AsyncIterable } from 'ix/asynciterable';
import TaskManager from '@/tasks/TaskManager';
import PolykeyAgent from '@/PolykeyAgent';
import Discovery from '@/discovery/Discovery';
import GestaltGraph from '@/gestalts/GestaltGraph';
import IdentitiesManager from '@/identities/IdentitiesManager';
import NodeConnectionManager from '@/nodes/NodeConnectionManager';
import NodeGraph from '@/nodes/NodeGraph';
import NodeManager from '@/nodes/NodeManager';
import KeyRing from '@/keys/KeyRing';
import ACL from '@/acl/ACL';
import Sigchain from '@/sigchain/Sigchain';
import * as utils from '@/utils';
import * as nodesUtils from '@/nodes/utils';
import * as discoveryErrors from '@/discovery/errors';
import * as keysUtils from '@/keys/utils';
import * as gestaltsUtils from '@/gestalts/utils';
import * as testNodesUtils from '../nodes/utils';
import TestProvider from '../identities/TestProvider';
import { encodeProviderIdentityId } from '../../src/ids/index';
import 'ix/add/asynciterable-operators/toarray';
import { createTLSConfig } from '../utils/tls';

describe('Discovery', () => {
  const password = 'password';
  const localhost = '127.0.0.1';
  const logger = new Logger(`${Discovery.name} Test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    providerToken: {
      accessToken: 'abc123',
    },
  };
  /**
   * Shared GestaltGraph, IdentitiesManager, NodeManager for all tests
   */
  let dataDir: string;
  let gestaltGraph: GestaltGraph;
  let identitiesManager: IdentitiesManager;
  let nodeGraph: NodeGraph;
  let taskManager: TaskManager;
  let nodeConnectionManager: NodeConnectionManager;
  let nodeManager: NodeManager;
  let db: DB;
  let acl: ACL;
  let keyRing: KeyRing;
  let sigchain: Sigchain;
  // Other gestalt
  let nodeA: PolykeyAgent;
  let nodeB: PolykeyAgent;
  let identityId: IdentityId;
  let nodeIdA: NodeId;
  let nodeIdB: NodeId;
  let testProvider: TestProvider;

  const mockedRefreshBucket = jest.spyOn(
    NodeManager.prototype,
    'refreshBucket',
  );

  beforeEach(async () => {
    testProvider = new TestProvider();
    mockedRefreshBucket.mockImplementation(
      () => new PromiseCancellable((resolve) => resolve()),
    );
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      options: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
      logger: logger.getChild('KeyRing'),
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger: logger.getChild('db'),
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
      fresh: true,
    });
    acl = await ACL.createACL({
      db,
      logger: logger.getChild('acl'),
    });
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger: logger.getChild('gestaltGraph'),
      fresh: true,
    });
    identitiesManager = await IdentitiesManager.createIdentitiesManager({
      keyRing,
      db,
      gestaltGraph,
      sigchain,
      logger: logger.getChild('identities'),
    });
    identitiesManager.registerProvider(testProvider);
    await identitiesManager.putToken(
      testToken.providerId,
      testToken.identityId,
      testToken.providerToken,
    );
    sigchain = await Sigchain.createSigchain({
      db,
      keyRing,
      logger: logger.getChild('sigChain'),
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
    const tlsConfig = await createTLSConfig(keyRing.keyPair);
    nodeConnectionManager = new NodeConnectionManager({
      keyRing,
      nodeGraph,
      tlsConfig,
      options: {
        connectionConnectTimeoutTime: 2000,
        connectionIdleTimeoutTime: 2000,
      },
      logger: logger.getChild('NodeConnectionManager'),
    });
    nodeManager = new NodeManager({
      db,
      keyRing,
      nodeConnectionManager,
      nodeGraph,
      gestaltGraph,
      sigchain,
      taskManager,
      logger,
    });
    await nodeManager.start();
    await nodeConnectionManager.start({
      host: localhost as Host,
    });
    // Set up other gestalt
    nodeA = await PolykeyAgent.createPolykeyAgent({
      password: password,
      options: {
        nodePath: path.join(dataDir, 'nodeA'),
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger: logger.getChild('nodeA'),
    });
    nodeB = await PolykeyAgent.createPolykeyAgent({
      password: password,
      options: {
        nodePath: path.join(dataDir, 'nodeB'),
        agentServiceHost: localhost,
        clientServiceHost: localhost,
        keys: {
          passwordOpsLimit: keysUtils.passwordOpsLimits.min,
          passwordMemLimit: keysUtils.passwordMemLimits.min,
          strictMemoryLock: false,
        },
      },
      logger: logger.getChild('nodeB'),
    });
    nodeIdA = nodeA.keyRing.getNodeId();
    nodeIdB = nodeB.keyRing.getNodeId();
    await testNodesUtils.nodesConnect(nodeA, nodeB);
    await nodeGraph.setNode(nodeA.keyRing.getNodeId(), {
      host: nodeA.agentServiceHost as Host,
      port: nodeA.agentServicePort as Port,
    });
    await nodeB.acl.setNodeAction(nodeA.keyRing.getNodeId(), 'claim');
    await nodeA.nodeManager.claimNode(nodeB.keyRing.getNodeId());
    nodeA.identitiesManager.registerProvider(testProvider);
    identityId = 'other-gestalt' as IdentityId;
    await nodeA.identitiesManager.putToken(testToken.providerId, identityId, {
      accessToken: 'def456',
    });
    testProvider.users[identityId] = {};
    await nodeA.identitiesManager.handleClaimIdentity(
      testProvider.id,
      identityId,
    );
  });
  afterEach(async () => {
    await taskManager.stopProcessing();
    await taskManager.stopTasks();
    await nodeA.stop();
    await nodeB.stop();
    await nodeConnectionManager.stop();
    await nodeManager.stop();
    await nodeGraph.stop();
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
    mockedRefreshBucket.mockRestore();
  });
  test('discovery readiness', async () => {
    const discovery = await Discovery.createDiscovery({
      db,
      keyRing,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      taskManager,
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
      discovery.queueDiscoveryByNode(testNodesUtils.generateRandomNodeId()),
    ).rejects.toThrow(discoveryErrors.ErrorDiscoveryNotRunning);
  });
  test('discovery by node', async () => {
    const discovery = await Discovery.createDiscovery({
      db,
      keyRing,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      taskManager,
      logger,
      fresh: true,
    });
    await taskManager.startProcessing();
    await discovery.queueDiscoveryByNode(nodeA.keyRing.getNodeId());
    let existingTasks: number = 0;
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    const gestalts = await AsyncIterable.as(
      gestaltGraph.getGestalts(),
    ).toArray();
    const gestalt = gestalts[0];
    const gestaltMatrix = gestalt.matrix;
    const gestaltNodes = gestalt.nodes;
    const gestaltIdentities = gestalt.identities;
    expect(Object.keys(gestaltMatrix)).toHaveLength(3);
    expect(Object.keys(gestaltNodes)).toHaveLength(2);
    expect(Object.keys(gestaltIdentities)).toHaveLength(1);
    const gestaltString = JSON.stringify(gestalt);
    expect(gestaltString).toContain(
      gestaltsUtils.encodeGestaltId(['node', nodeIdA]),
    );
    expect(gestaltString).toContain(
      gestaltsUtils.encodeGestaltId(['node', nodeIdB]),
    );
    expect(gestaltString).toContain(identityId);
    await taskManager.stopProcessing();
    await discovery.stop();
    await discovery.destroy();
  });
  test('discovery by identity', async () => {
    const discovery = await Discovery.createDiscovery({
      db,
      keyRing,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      taskManager,
      logger,
    });
    await taskManager.startProcessing();
    await discovery.queueDiscoveryByIdentity(testToken.providerId, identityId);
    let existingTasks: number = 0;
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    const gestalts = await AsyncIterable.as(
      gestaltGraph.getGestalts(),
    ).toArray();
    const gestalt = gestalts[0];
    const gestaltMatrix = gestalt.matrix;
    const gestaltNodes = gestalt.nodes;
    const gestaltIdentities = gestalt.identities;
    expect(Object.keys(gestaltMatrix)).toHaveLength(3);
    expect(Object.keys(gestaltNodes)).toHaveLength(2);
    expect(Object.keys(gestaltIdentities)).toHaveLength(1);
    const gestaltString = JSON.stringify(gestalt);
    expect(gestaltString).toContain(
      nodesUtils.encodeNodeId(nodeA.keyRing.getNodeId()),
    );
    expect(gestaltString).toContain(
      nodesUtils.encodeNodeId(nodeB.keyRing.getNodeId()),
    );
    expect(gestaltString).toContain(identityId);
    await taskManager.stopProcessing();
    await discovery.stop();
    await discovery.destroy();
  });
  test('updates previously discovered gestalts', async () => {
    const discovery = await Discovery.createDiscovery({
      db,
      keyRing,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      taskManager,
      logger,
    });
    await taskManager.startProcessing();
    await discovery.queueDiscoveryByNode(nodeA.keyRing.getNodeId());
    let existingTasks: number = 0;
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    const gestalts1 = await AsyncIterable.as(
      gestaltGraph.getGestalts(),
    ).toArray();
    const gestalt1 = gestalts1[0];
    const gestaltMatrix1 = gestalt1.matrix;
    const gestaltNodes1 = gestalt1.nodes;
    const gestaltIdentities1 = gestalt1.identities;
    expect(Object.keys(gestaltMatrix1)).toHaveLength(3);
    expect(Object.keys(gestaltNodes1)).toHaveLength(2);
    expect(Object.keys(gestaltIdentities1)).toHaveLength(1);
    const gestaltString1 = JSON.stringify(gestalt1);
    expect(gestaltString1).toContain(
      nodesUtils.encodeNodeId(nodeA.keyRing.getNodeId()),
    );
    expect(gestaltString1).toContain(
      nodesUtils.encodeNodeId(nodeB.keyRing.getNodeId()),
    );
    expect(gestaltString1).toContain(identityId);
    // Add another linked identity
    const identityId2 = 'other-gestalt2' as IdentityId;
    await nodeA.identitiesManager.putToken(testToken.providerId, identityId2, {
      accessToken: 'ghi789',
    });
    testProvider.users[identityId2] = {};
    const identityClaim = {
      typ: 'ClaimLinkIdentity',
      iss: nodesUtils.encodeNodeId(nodeA.keyRing.getNodeId()),
      sub: encodeProviderIdentityId([testProvider.id, identityId2]),
    };
    const [, signedClaim] = await nodeA.sigchain.addClaim(identityClaim);
    await testProvider.publishClaim(
      identityId2,
      signedClaim as SignedClaim<ClaimLinkIdentity>,
    );
    // Note that eventually we would like to add in a system of revisiting
    // already discovered vertices, however for now we must do this manually.
    await discovery.queueDiscoveryByNode(nodeA.keyRing.getNodeId());
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    const gestalts2 = await AsyncIterable.as(
      gestaltGraph.getGestalts(),
    ).toArray();
    const gestalt2 = gestalts2[0];
    const gestaltMatrix2 = gestalt2.matrix;
    const gestaltNodes2 = gestalt2.nodes;
    const gestaltIdentities2 = gestalt2.identities;
    expect(Object.keys(gestaltMatrix2)).toHaveLength(4);
    expect(Object.keys(gestaltNodes2)).toHaveLength(2);
    expect(Object.keys(gestaltIdentities2)).toHaveLength(2);
    const gestaltString2 = JSON.stringify(gestalt2);
    expect(gestaltString2).toContain(
      nodesUtils.encodeNodeId(nodeA.keyRing.getNodeId()),
    );
    expect(gestaltString2).toContain(
      nodesUtils.encodeNodeId(nodeB.keyRing.getNodeId()),
    );
    expect(gestaltString2).toContain(identityId);
    expect(gestaltString2).toContain(identityId2);
    // Can just remove the user that the claim is for as this will cause the
    // claim to be dropped during discovery
    delete testProvider.users[identityId2];
    await taskManager.stopProcessing();
    await discovery.stop();
    await discovery.destroy();
  });
  test('discovery persistence across restarts', async () => {
    const discovery = await Discovery.createDiscovery({
      db,
      keyRing,
      gestaltGraph,
      identitiesManager,
      nodeManager,
      taskManager,
      logger,
    });
    await discovery.queueDiscoveryByNode(nodeA.keyRing.getNodeId());
    await discovery.stop();
    await discovery.start();
    await taskManager.startProcessing();
    let existingTasks: number = 0;
    do {
      existingTasks = await discovery.waitForDiscoveryTasks();
    } while (existingTasks > 0);
    const gestalts = await AsyncIterable.as(
      gestaltGraph.getGestalts(),
    ).toArray();
    const gestalt = gestalts[0];
    const gestaltMatrix = gestalt.matrix;
    const gestaltNodes = gestalt.nodes;
    const gestaltIdentities = gestalt.identities;
    expect(Object.keys(gestaltMatrix)).toHaveLength(3);
    expect(Object.keys(gestaltNodes)).toHaveLength(2);
    expect(Object.keys(gestaltIdentities)).toHaveLength(1);
    const gestaltString = JSON.stringify(gestalt);
    expect(gestaltString).toContain(
      nodesUtils.encodeNodeId(nodeA.keyRing.getNodeId()),
    );
    expect(gestaltString).toContain(
      nodesUtils.encodeNodeId(nodeB.keyRing.getNodeId()),
    );
    expect(gestaltString).toContain(identityId);
    await taskManager.stopProcessing();
    await discovery.stop();
    await discovery.destroy();
  });
});
