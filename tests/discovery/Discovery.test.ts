import type { ClaimLinkIdentity, ClaimLinkNode } from '@/claims/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { destroyed } from '@matrixai/async-init';
import { PolykeyAgent } from '@';
import { utils as claimsUtils } from '@/claims';
import { Discovery, errors as discoveryErrors } from '@/discovery';
import * as testNodesUtils from '../nodes/utils';
import TestProvider from '../identities/TestProvider';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('Discovery', () => {
  const password = 'password';
  const logger = new Logger('Discovery Tests', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };

  describe('Basic manager tests.', () => {
    // Managers
    let polykeyAgent: PolykeyAgent;
    let discovery: Discovery;

    // Directories
    let dataDirEach: string;
    let nodePath: string;

    beforeAll(async () => {
      // Creating directories and paths.
      dataDirEach = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      nodePath = path.join(dataDirEach, 'node');

      polykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath,
        logger,
      });
      discovery = polykeyAgent.discovery;
    });

    afterAll(async () => {
      await polykeyAgent.stop();
      await polykeyAgent.destroy();
      await fs.promises.rm(dataDirEach, {
        force: true,
        recursive: true,
      });
    });
    test('Constructs.', async () => {
      expect(discovery).toBeInstanceOf(Discovery);
    });
    test(
      'Starts and stops',
      async () => {
        // Not started.
        expect(discovery[destroyed]).toBeFalsy();

        // Starting.
        await discovery.destroy();
        expect(discovery[destroyed]).toBeTruthy();
      },
      global.polykeyStartupTimeout,
    );
  });
  describe('Discovery process', () => {
    let rootDataDir;
    // Nodes should form the chain A->B->C
    let nodeA: PolykeyAgent;
    let nodeB: PolykeyAgent;
    let nodeC: PolykeyAgent;
    let testProvider: TestProvider;
    let identityId: IdentityId;

    beforeAll(async () => {
      rootDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      // Setting up remote nodes
      nodeA = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(rootDataDir, 'nodeA'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });
      nodeB = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(rootDataDir, 'nodeB'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });
      nodeC = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(rootDataDir, 'nodeC'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });
      // Forming links
      // A->B->C
      // Adding connection details.
      await testNodesUtils.nodesConnect(nodeA, nodeB);
      await testNodesUtils.nodesConnect(nodeB, nodeA);
      await testNodesUtils.nodesConnect(nodeB, nodeC);
      await testNodesUtils.nodesConnect(nodeC, nodeB);
      // Adding sigchain details.
      const claimBtoC: ClaimLinkNode = {
        type: 'node',
        node1: nodeB.nodeManager.getNodeId(),
        node2: nodeC.nodeManager.getNodeId(),
      };
      const claimCtoB: ClaimLinkNode = {
        type: 'node',
        node1: nodeC.nodeManager.getNodeId(),
        node2: nodeB.nodeManager.getNodeId(),
      };
      await nodeB.sigchain.addClaim(claimBtoC);
      await nodeB.sigchain.addClaim(claimCtoB);
      await nodeC.sigchain.addClaim(claimCtoB);
      await nodeC.sigchain.addClaim(claimBtoC);

      testProvider = new TestProvider();
      nodeA.identitiesManager.registerProvider(testProvider);

      // Setting up identtiy.
      const gen = testProvider.authenticate();
      await gen.next();
      identityId = (await gen.next()).value as IdentityId;

      const claimIdentToB: ClaimLinkIdentity = {
        type: 'identity',
        node: nodeB.nodeManager.getNodeId(),
        provider: testProvider.id,
        identity: identityId,
      };
      const [, claimEncoded] = await nodeB.sigchain.addClaim(claimIdentToB);
      const claim = await claimsUtils.decodeClaim(claimEncoded);
      await testProvider.publishClaim(identityId, claim);
    }, global.polykeyStartupTimeout * 3);
    afterAll(async () => {
      await nodeC.stop();
      await nodeB.stop();
      await nodeA.stop();
      testProvider.links = {};
      testProvider.linkIdCounter = 0;
      await fs.promises.rm(rootDataDir, {
        force: true,
        recursive: true,
      });
    });
    beforeEach(async () => {
      await nodeA.gestaltGraph.clearDB();
      await nodeB.gestaltGraph.clearDB();
      await nodeC.gestaltGraph.clearDB();
    });
    test('discoverGestaltByNode by NodeId', async () => {
      // Time to do the test.
      const discoverProcess = nodeA.discovery.discoverGestaltByNode(
        nodeB.nodeManager.getNodeId(),
      );
      for await (const _step of discoverProcess) {
        // Waiting for the discovery process to finish.
      }

      // We expect to find a gestalt now.
      const gestalt = await nodeA.gestaltGraph.getGestalts();
      expect(gestalt.length).not.toBe(0);
      const gestaltString = JSON.stringify(gestalt);
      expect(gestaltString).toContain(nodeB.nodeManager.getNodeId());
      expect(gestaltString).toContain(nodeC.nodeManager.getNodeId());
      expect(gestaltString).toContain(identityId);
    });
    test('discoverGestaltByNode by IdentityId', async () => {
      // Time to do the test.
      const discoverProcess = nodeA.discovery.discoverGestaltByIdentity(
        testProvider.id,
        identityId,
      );
      for await (const _step of discoverProcess) {
        // Waiting for the discovery process to finish.
      }

      // We expect to find a gestalt now.
      const gestalt = await nodeA.gestaltGraph.getGestalts();
      expect(gestalt.length).not.toBe(0);
      const gestaltString = JSON.stringify(gestalt);
      expect(gestaltString).toContain(nodeB.nodeManager.getNodeId());
      expect(gestaltString).toContain(nodeC.nodeManager.getNodeId());
      expect(gestaltString).toContain(identityId);
    });
    test('discovery readiness', async () => {
      await nodeA.discovery.destroy();
      await expect(async () =>
        nodeA.discovery.discoverGestaltByNode(nodeB.nodeManager.getNodeId()),
      ).rejects.toThrow(discoveryErrors.ErrorDiscoveryDestroyed);
      await expect(async () =>
        nodeA.discovery.discoverGestaltByIdentity(testProvider.id, identityId),
      ).rejects.toThrow(discoveryErrors.ErrorDiscoveryDestroyed);
    });
  });
  describe('End-to-end discovery between two gestalts', () => {
    let rootDataDir;
    // Gestalt 1
    let nodeA: PolykeyAgent;
    let nodeB: PolykeyAgent;
    let identityIdA: IdentityId;
    // Gestalt 2
    let nodeC: PolykeyAgent;
    let nodeD: PolykeyAgent;
    let identityIdB: IdentityId;

    let testProvider: TestProvider;
    beforeAll(async () => {
      rootDataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      // Setting up remote nodes.
      nodeA = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(rootDataDir, 'nodeA'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });
      nodeB = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(rootDataDir, 'nodeB'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });
      nodeC = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(rootDataDir, 'nodeC'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });
      nodeD = await PolykeyAgent.createPolykeyAgent({
        password: 'password',
        nodePath: path.join(rootDataDir, 'nodeD'),
        keysConfig: {
          rootKeyPairBits: 2048,
        },
        logger,
      });

      // Adding connection details
      await testNodesUtils.nodesConnect(nodeA, nodeB);
      await testNodesUtils.nodesConnect(nodeA, nodeD);
      await testNodesUtils.nodesConnect(nodeB, nodeA);
      await testNodesUtils.nodesConnect(nodeC, nodeB);
      await testNodesUtils.nodesConnect(nodeC, nodeD);
      await testNodesUtils.nodesConnect(nodeD, nodeC);

      // Setting up identity provider
      testProvider = new TestProvider();
      nodeA.identitiesManager.registerProvider(testProvider);
      nodeC.identitiesManager.registerProvider(testProvider);

      // Forming gestalts.
      await nodeA.nodeManager.claimNode(nodeB.nodeManager.getNodeId());
      await nodeC.nodeManager.claimNode(nodeD.nodeManager.getNodeId());

      const gen1 = testProvider.authenticate();
      await gen1.next();
      identityIdA = (await gen1.next()).value as IdentityId;
      const gen2 = testProvider.authenticate();
      await gen2.next();
      identityIdB = (await gen2.next()).value as IdentityId;
    }, global.polykeyStartupTimeout * 4);
    afterAll(async () => {
      await nodeD.stop();
      await nodeC.stop();
      await nodeB.stop();
      await nodeA.stop();
      await fs.promises.rm(rootDataDir, {
        force: true,
        recursive: true,
      });
    });
    afterEach(async () => {
      await nodeA.gestaltGraph.clearDB();
      await nodeB.gestaltGraph.clearDB();
      await nodeC.gestaltGraph.clearDB();
      await nodeD.gestaltGraph.clearDB();
      testProvider.links = {};
      testProvider.linkIdCounter = 0;
    });
    test('Gestalt1 discovers Gestalt2', async () => {
      await nodeA.identitiesManager.putToken(
        testToken.providerId,
        identityIdA,
        testToken.tokenData,
      );

      const claimIdentToD: ClaimLinkIdentity = {
        type: 'identity',
        node: nodeD.nodeManager.getNodeId(),
        provider: testProvider.id,
        identity: identityIdB,
      };
      const [, claimBEncoded] = await nodeD.sigchain.addClaim(claimIdentToD);
      const claimB = claimsUtils.decodeClaim(claimBEncoded);
      await testProvider.publishClaim(identityIdB, claimB);

      // Time to do the test.
      const discoverProcess = nodeA.discovery.discoverGestaltByIdentity(
        testProvider.id,
        identityIdB,
      );
      for await (const _step of discoverProcess) {
        // Waiting for the discovery process to finish.
      }

      // We expect to find a gestalt now.
      const gestalt = await nodeA.gestaltGraph.getGestalts();
      expect(gestalt.length).not.toBe(0);
      const gestaltString = JSON.stringify(gestalt);
      expect(gestaltString).toContain(nodeC.nodeManager.getNodeId());
      expect(gestaltString).toContain(nodeD.nodeManager.getNodeId());
      expect(gestaltString).toContain(identityIdB);
      await nodeA.identitiesManager.delToken(testToken.providerId, identityIdA);
    });
    test('Gestalt2 discovers Gestalt1', async () => {
      await nodeC.identitiesManager.putToken(
        testToken.providerId,
        identityIdB,
        testToken.tokenData,
      );

      const claimIdentToB: ClaimLinkIdentity = {
        type: 'identity',
        node: nodeB.nodeManager.getNodeId(),
        provider: testProvider.id,
        identity: identityIdA,
      };
      const [, claimAEncoded] = await nodeB.sigchain.addClaim(claimIdentToB);
      const claimA = claimsUtils.decodeClaim(claimAEncoded);
      await testProvider.publishClaim(identityIdA, claimA);

      // Time to do the test.
      const discoverProcess = nodeC.discovery.discoverGestaltByIdentity(
        testProvider.id,
        identityIdA,
      );
      for await (const _step of discoverProcess) {
        // Waiting for the discovery process to finish.
      }

      // We expect to find a gestalt now.
      const gestalt = await nodeC.gestaltGraph.getGestalts();
      expect(gestalt.length).not.toBe(0);
      const gestaltString = JSON.stringify(gestalt);
      expect(gestaltString).toContain(nodeA.nodeManager.getNodeId());
      expect(gestaltString).toContain(nodeB.nodeManager.getNodeId());
      expect(gestaltString).toContain(identityIdA);
      await nodeC.identitiesManager.delToken(testToken.providerId, identityIdB);
    });
  });
});
