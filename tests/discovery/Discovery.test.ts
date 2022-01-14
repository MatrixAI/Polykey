import type { ClaimLinkIdentity } from '@/claims/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { destroyed } from '@matrixai/async-init';
import { DB } from '@matrixai/db';
import { PolykeyAgent } from '@';
import { utils as claimsUtils } from '@/claims';
import { Discovery, errors as discoveryErrors } from '@/discovery';
import { GestaltGraph } from '@/gestalts';
import { IdentitiesManager } from '@/identities';
import { NodeManager } from '@/nodes';
import { KeyManager, utils as keysUtils } from '@/keys';
import { ACL } from '@/acl';
import { Sigchain } from '@/sigchain';
import { ForwardProxy, ReverseProxy } from '@/network';
import TestProvider from '../identities/TestProvider';
import * as testUtils from '../utils';
import * as testNodesUtils from '../nodes/utils';

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
  let nodeManager: NodeManager;
  let db: DB;
  let acl: ACL;
  let keyManager: KeyManager;
  let sigchain: Sigchain;
  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;
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
    sigchain = await Sigchain.createSigchain({
      db,
      keyManager,
      logger,
    });
    fwdProxy = new ForwardProxy({
      authToken: 'abc123',
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
      serverHost: '127.0.0.1' as Host,
      serverPort: 55555 as Port,
      tlsConfig: {
        keyPrivatePem: keyManager.getRootKeyPairPem().privateKey,
        certChainPem: await keyManager.getRootCertChainPem(),
      },
    });
    nodeManager = await NodeManager.createNodeManager({
      db,
      keyManager,
      sigchain,
      fwdProxy,
      revProxy,
      logger,
    });
    // Set up other gestalt
    nodeA = await PolykeyAgent.createPolykeyAgent({
      password: password,
      nodePath: path.join(dataDir, 'nodeA'),
      keysConfig: {
        rootKeyPairBits: 2048,
      },
      logger,
    });
    nodeB = await PolykeyAgent.createPolykeyAgent({
      password: password,
      nodePath: path.join(dataDir, 'nodeB'),
      keysConfig: {
        rootKeyPairBits: 2048,
      },
      logger,
    });
    await testNodesUtils.nodesConnect(nodeA, nodeB);
    await nodeManager.setNode(nodeA.nodeManager.getNodeId(), {
      host: nodeA.revProxy.getIngressHost(),
      port: nodeA.revProxy.getIngressPort(),
    });
    await nodeA.nodeManager.claimNode(nodeB.nodeManager.getNodeId());
    nodeA.identitiesManager.registerProvider(testProvider);
    identityId = 'other-gestalt' as IdentityId;
    await nodeA.identitiesManager.putToken(testToken.providerId, identityId, {
      accessToken: 'def456',
    });
    const identityClaim: ClaimLinkIdentity = {
      type: 'identity',
      node: nodeB.nodeManager.getNodeId(),
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
    await nodeManager.stop();
    await revProxy.stop();
    await fwdProxy.stop();
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
      gestaltGraph,
      identitiesManager,
      nodeManager,
      logger,
    });
    expect(discovery[destroyed]).toBeFalsy();
    await discovery.destroy();
    expect(discovery[destroyed]).toBeTruthy();
    expect(() => {
      discovery.discoverGestaltByIdentity('' as ProviderId, '' as IdentityId);
    }).toThrow(discoveryErrors.ErrorDiscoveryDestroyed);
    expect(() => {
      discovery.discoverGestaltByNode('' as NodeId);
    }).toThrow(discoveryErrors.ErrorDiscoveryDestroyed);
  });
  test('discovery by node', async () => {
    const discovery = await Discovery.createDiscovery({
      gestaltGraph,
      identitiesManager,
      nodeManager,
      logger,
    });
    const discoverProcess = discovery.discoverGestaltByNode(
      nodeA.nodeManager.getNodeId(),
    );
    for await (const _step of discoverProcess) {
      // Waiting for the discovery process to finish.
    }
    const gestalt = await gestaltGraph.getGestalts();
    expect(gestalt.length).not.toBe(0);
    const gestaltString = JSON.stringify(gestalt);
    expect(gestaltString).toContain(nodeA.nodeManager.getNodeId());
    expect(gestaltString).toContain(nodeB.nodeManager.getNodeId());
    expect(gestaltString).toContain(identityId);
    await discovery.destroy();
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
  });
  test('discovery by identity', async () => {
    const discovery = await Discovery.createDiscovery({
      gestaltGraph,
      identitiesManager,
      nodeManager,
      logger,
    });
    const discoverProcess = discovery.discoverGestaltByNode(
      nodeA.nodeManager.getNodeId(),
    );
    for await (const _step of discoverProcess) {
      // Waiting for the discovery process to finish.
    }
    const gestalt = await gestaltGraph.getGestalts();
    expect(gestalt.length).not.toBe(0);
    const gestaltString = JSON.stringify(gestalt);
    expect(gestaltString).toContain(nodeA.nodeManager.getNodeId());
    expect(gestaltString).toContain(nodeB.nodeManager.getNodeId());
    expect(gestaltString).toContain(identityId);
    await discovery.destroy();
    await gestaltGraph.stop();
    await gestaltGraph.destroy();
    gestaltGraph = await GestaltGraph.createGestaltGraph({
      db,
      acl,
      logger,
    });
  });
});
