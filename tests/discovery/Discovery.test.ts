import type { ClaimLinkIdentity, ClaimLinkNode } from '@/claims/types';
import type { IdentityId } from '@/identities/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel } from '@matrixai/logger';
import { Discovery } from '@/discovery';
import PolykeyAgent from '@/PolykeyAgent';
import * as discoveryErrors from '@/discovery/errors';
import TestProvider from '../identities/TestProvider';
import {
  addRemoteDetails,
  cleanupRemoteKeynode,
  setupRemoteKeynode,
} from '../utils';

// Mocks.
jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('Discovery', () => {
  // Constants.
  const password = 'password';
  const logger = new Logger('Discovery Tests', LogLevel.WARN);

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
        expect(discovery.destroyed).toBeFalsy();

        // Starting.
        await discovery.destroy();
        expect(discovery.destroyed).toBeTruthy();
      },
      global.polykeyStartupTimeout,
    );
  });
  describe('Discovery process', () => {
    // Nodes should form the chain A->B->C
    let nodeA: PolykeyAgent;
    let nodeB: PolykeyAgent;
    let nodeC: PolykeyAgent;
    let testProvider: TestProvider;
    let identityId: IdentityId;

    beforeAll(async () => {
      // Setting up remote nodes.
      nodeA = await setupRemoteKeynode({ logger });
      nodeB = await setupRemoteKeynode({ logger });
      nodeC = await setupRemoteKeynode({ logger });

      // Forming links
      // A->B->C
      // Adding connection details.
      await addRemoteDetails(nodeA, nodeB);
      await addRemoteDetails(nodeB, nodeA);
      await addRemoteDetails(nodeB, nodeC);
      await addRemoteDetails(nodeC, nodeB);
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
      const gen = await testProvider.authenticate();
      await gen.next();
      identityId = (await gen.next()).value as IdentityId;

      const claimIdentToB: ClaimLinkIdentity = {
        type: 'identity',
        node: nodeB.nodeManager.getNodeId(),
        provider: testProvider.id,
        identity: identityId,
      };
      await nodeB.sigchain.addClaim(claimIdentToB);
    }, global.polykeyStartupTimeout * 3);
    afterAll(async () => {
      await cleanupRemoteKeynode(nodeA);
      await cleanupRemoteKeynode(nodeB);
      await cleanupRemoteKeynode(nodeC);
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
      await testProvider.overrideLinks(
        nodeB.nodeManager.getNodeId(),
        nodeB.keyManager.getRootKeyPairPem().privateKey,
      );
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
      // Setting up remote nodes.
      nodeA = await setupRemoteKeynode({ logger });
      nodeB = await setupRemoteKeynode({ logger });
      nodeC = await setupRemoteKeynode({ logger });
      nodeD = await setupRemoteKeynode({ logger });

      // Adding connection details
      await addRemoteDetails(nodeA, nodeB);
      await addRemoteDetails(nodeA, nodeD);
      await addRemoteDetails(nodeB, nodeA);
      await addRemoteDetails(nodeC, nodeB);
      await addRemoteDetails(nodeC, nodeD);
      await addRemoteDetails(nodeD, nodeC);

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

      const claimIdentToB: ClaimLinkIdentity = {
        type: 'identity',
        node: nodeB.nodeManager.getNodeId(),
        provider: testProvider.id,
        identity: identityIdA,
      };
      await nodeB.sigchain.addClaim(claimIdentToB);

      const claimIdentToD: ClaimLinkIdentity = {
        type: 'identity',
        node: nodeD.nodeManager.getNodeId(),
        provider: testProvider.id,
        identity: identityIdB,
      };
      await nodeD.sigchain.addClaim(claimIdentToD);
    }, global.polykeyStartupTimeout * 4);
    afterAll(async () => {
      await cleanupRemoteKeynode(nodeA);
      await cleanupRemoteKeynode(nodeB);
      await cleanupRemoteKeynode(nodeC);
      await cleanupRemoteKeynode(nodeD);
    });
    beforeEach(async () => {
      await nodeA.gestaltGraph.clearDB();
      await nodeB.gestaltGraph.clearDB();
      await nodeC.gestaltGraph.clearDB();
      await nodeD.gestaltGraph.clearDB();
    });
    test('Gestalt1 discovers Gestalt2', async () => {
      await testProvider.overrideLinks(
        nodeD.nodeManager.getNodeId(),
        nodeD.keyManager.getRootKeyPairPem().privateKey,
      );
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
    });
    test('Gestalt2 discovers Gestalt1', async () => {
      await testProvider.overrideLinks(
        nodeB.nodeManager.getNodeId(),
        nodeB.keyManager.getRootKeyPairPem().privateKey,
      );
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
    });
  });
});
