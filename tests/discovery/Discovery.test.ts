import Logger, { LogLevel } from '@matrixai/logger';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Discovery } from '@/discovery';
import PolykeyAgent from '@/PolykeyAgent';
import {
  addRemoteDetails,
  cleanupRemoteKeynode,
  setupRemoteKeynode,
} from '../utils';
import { ClaimLinkIdentity, ClaimLinkNode } from '@/claims/types';
import TestProvider from '../identities/TestProvider';
import { IdentityId } from '@/identities/types';
import { createPrivateKey } from 'crypto';

describe('Discovery', () => {
  //Constants.
  const password = 'password';
  const logger = new Logger('Discovery Tests', LogLevel.WARN);

  describe('Basic manager tests.', () => {
    //Managers
    let polykeyAgent: PolykeyAgent;
    let discovery: Discovery;

    //Directories
    let dataDirEach: string;
    let nodePath: string;

    beforeAll(async () => {
      //creating directories and paths.
      dataDirEach = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      nodePath = path.join(dataDirEach, 'node');

      polykeyAgent = new PolykeyAgent({
        nodePath,
        logger,
      });
      discovery = polykeyAgent.discovery;
    });

    afterAll(async () => {
      await polykeyAgent.stop();
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
        await polykeyAgent.start({ password });

        //Not started.
        await polykeyAgent.discovery.stop();
        expect(discovery.started).toBeFalsy();

        //starting.
        await discovery.start();
        expect(discovery.started).toBeTruthy();
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

      //Forming links
      //A->B->C
      //Adding connection details.
      await addRemoteDetails(nodeA, nodeB);
      await addRemoteDetails(nodeB, nodeA);
      await addRemoteDetails(nodeB, nodeC);
      await addRemoteDetails(nodeC, nodeB);
      //Adding sigchain details.
      const claimBtoC: ClaimLinkNode = {
        type: 'node',
        node1: nodeB.nodes.getNodeId(),
        node2: nodeC.nodes.getNodeId(),
      };
      const claimCtoB: ClaimLinkNode = {
        type: 'node',
        node1: nodeC.nodes.getNodeId(),
        node2: nodeB.nodes.getNodeId(),
      };
      await nodeB.sigchain.addClaim(claimBtoC);
      await nodeB.sigchain.addClaim(claimCtoB);
      await nodeC.sigchain.addClaim(claimCtoB);
      await nodeC.sigchain.addClaim(claimBtoC);

      testProvider = new TestProvider();
      nodeA.identities.registerProvider(testProvider);

      //Setting up identtiy.
      const gen = await testProvider.authenticate();
      await gen.next();
      identityId = (await gen.next()).value as IdentityId;

      const claimIdentToB: ClaimLinkIdentity = {
        type: 'identity',
        node: nodeB.nodes.getNodeId(),
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
      await nodeA.gestalts.clearDB();
      await nodeB.gestalts.clearDB();
      await nodeC.gestalts.clearDB();
    });
    test('discoverGestaltByNode by NodeId', async () => {
      //Time to do the test.
      const discoverProcess = nodeA.discovery.discoverGestaltByNode(
        nodeB.nodes.getNodeId(),
      );
      for await (const step of discoverProcess) {
      }

      //We expect to find a gestalt now.
      const gestalt = await nodeA.gestalts.getGestalts();
      expect(gestalt.length).not.toBe(0);
      const gestaltString = JSON.stringify(gestalt);
      expect(gestaltString).toContain(nodeB.nodes.getNodeId());
      expect(gestaltString).toContain(nodeC.nodes.getNodeId());
      expect(gestaltString).toContain(identityId);
    });
    test('discoverGestaltByNode by IdentityId', async () => {
      await testProvider.overrideLinks(
        nodeB.nodes.getNodeId(),
        nodeB.keys.getRootKeyPairPem().privateKey,
      );
      // Time to do the test.
      const discoverProcess = nodeA.discovery.discoverGestaltByIdentity(
        testProvider.id,
        identityId,
      );
      for await (const step of discoverProcess) {
      }

      //We expect to find a gestalt now.
      const gestalt = await nodeA.gestalts.getGestalts();
      expect(gestalt.length).not.toBe(0);
      const gestaltString = JSON.stringify(gestalt);
      expect(gestaltString).toContain(nodeB.nodes.getNodeId());
      expect(gestaltString).toContain(nodeC.nodes.getNodeId());
      expect(gestaltString).toContain(identityId);
    });
  });
});
