import type { NodeInfo } from '@/nodes/types';
import type {
  IdentityId,
  IdentityInfo,
  ProviderId,
} from '../../src/identities/types';
import * as testUtils from './utils';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { PolykeyAgent } from '@';
import { identityString } from '../../src/bin/identities/utils';
import * as utils from './utils';
import TestProvider from '../identities/TestProvider';
import {
  addRemoteDetails,
  cleanupRemoteKeynode,
  setupRemoteKeynode,
} from '../utils';
import { ClaimLinkIdentity, ClaimLinkNode } from '@/claims/types';
import { makeNodeId } from '@/nodes/utils';

/**
 * This test file has been optimised to use only one instance of PolykeyAgent where posible.
 * Setting up the PolykeyAgent has been done in a beforeAll block.
 * Keep this in mind when adding or editing tests.
 * Any side effects need to be undone when the test has completed.
 * Preferably within a `afterEach()` since any cleanup will be skipped inside a failing test.
 *
 * - left over state can cause a test to fail in certain cases.
 * - left over state can cause similar tests to succeed when they should fail.
 * - starting or stopping the agent within tests should be done on a new instance of the polykey agent.
 * - when in doubt test each modified or added test on it's own as well as the whole file.
 * - Looking into adding a way to safely clear each domain's DB information with out breaking modules.
 */
describe('CLI Identities', () => {
  // Test dependent variables
  let dataDir: string;
  let nodePath: string;
  let passwordFile: string;
  let polykeyAgent: PolykeyAgent;
  let testProvider: TestProvider;

  // Defining constants
  const logger = new Logger('pkWithStdio Test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const node1: NodeInfo = {
    id: makeNodeId('1'.repeat(44)),
    chain: {},
  };
  const keynode: NodeInfo = {
    id: makeNodeId('2'.repeat(44)),
    chain: {},
  };
  const node2: NodeInfo = {
    id: makeNodeId('3'.repeat(44)),
    chain: {},
  };
  const node3: NodeInfo = {
    id: makeNodeId('4'.repeat(44)),
    chain: {},
  };
  const invaldNode: NodeInfo = {
    id: makeNodeId('invalid' + 'A'.repeat(37)),
    chain: {},
  };
  const identity1: IdentityInfo = {
    providerId: 'github.com' as ProviderId,
    identityId: 'abc' as IdentityId,
    claims: {},
  };
  const invalidIdentity: IdentityInfo = {
    providerId: 'github.com' as ProviderId,
    identityId: 'onetwothree' as IdentityId,
    claims: {},
  };
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
    tokenData: {
      accessToken: 'abc123',
    },
  };

  // Helper functions
  function genCommands(options: Array<string>) {
    return ['identities', ...options, '-np', nodePath];
  }

  // Setup and teardown
  beforeAll(async () => {
    //This handles the expensive setting up of the polykey agent.
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');
    passwordFile = path.join(dataDir, 'passwordFile');
    await fs.promises.writeFile(passwordFile, 'password');
    polykeyAgent = new PolykeyAgent({
      nodePath: nodePath,
      logger: logger,
    });
    await polykeyAgent.start({
      password: 'password',
    });
    keynode.id = polykeyAgent.nodes.getNodeId();

    testProvider = new TestProvider();
    await polykeyAgent.identities.registerProvider(testProvider);

    // Authorize session
    await utils.pkWithStdio([
      'agent',
      'unlock',
      '-np',
      nodePath,
      '--password-file',
      passwordFile,
    ]);
  }, global.polykeyStartupTimeout);
  afterAll(async () => {
    await polykeyAgent.stop();
    await fs.promises.rmdir(dataDir, { recursive: true });
  });
  beforeEach(async () => {
    //Setting up gestalt state
    await polykeyAgent.gestalts.setNode(keynode);
    await polykeyAgent.gestalts.setNode(node1);
    await polykeyAgent.gestalts.setNode(node2);
    await polykeyAgent.gestalts.setNode(node3);
    await polykeyAgent.gestalts.setIdentity(identity1);
    await polykeyAgent.gestalts.linkNodeAndIdentity(node1, identity1);
  });
  afterEach(async () => {
    //This handles the cheap teardown between tests.
    //Clean up any dangling permissions.
    await polykeyAgent.gestalts.clearDB();
  });

  // Tests
  describe('commandAllowGestalts', () => {
    test('Should allow permissions on node.', async () => {
      const commands = genCommands(['allow', node1.id, 'notify']);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.
      const actions = await polykeyAgent.gestalts.getGestaltActionsByNode(
        node1.id,
      );
      const actionKeys = Object.keys(actions!);
      expect(actionKeys).toContain('notify');

      const command2 = genCommands(['allow', node1.id, 'scan']);
      const result2 = await testUtils.pkWithStdio(command2);
      expect(result2.code).toBe(0); //Succeeds.

      const actions2 = await polykeyAgent.gestalts.getGestaltActionsByNode(
        node1.id,
      );
      const actionKeys2 = Object.keys(actions2!);
      expect(actionKeys2).toContain('notify');
      expect(actionKeys2).toContain('scan');

      //Should fail for invalid action.
      const command3 = genCommands(['allow', node1.id, 'invalid']);
      const result3 = await testUtils.pkWithStdio(command3);
      expect(result3.code).toBe(1); //Should fail.

      //Cleaning up changes to state.
      await polykeyAgent.gestalts.unsetGestaltActionByNode(node1.id, 'notify');
      await polykeyAgent.gestalts.unsetGestaltActionByNode(node1.id, 'scan');
    });
    test('Should allow permissions on Identity.', async () => {
      const commands = genCommands([
        'allow',
        identityString(identity1.providerId, identity1.identityId),
        'notify',
      ]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.

      const actions = await polykeyAgent.gestalts.getGestaltActionsByIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      const actionKeys = Object.keys(actions!);
      expect(actionKeys).toContain('notify');

      const command2 = genCommands([
        'allow',
        identityString(identity1.providerId, identity1.identityId),
        'scan',
      ]);
      const result2 = await testUtils.pkWithStdio(command2);
      expect(result2.code).toBe(0); //Succeedes.

      const actions2 = await polykeyAgent.gestalts.getGestaltActionsByIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      const actionKeys2 = Object.keys(actions2!);
      expect(actionKeys2).toContain('notify');
      expect(actionKeys2).toContain('scan');

      //Should fail for invalid action.
      const command3 = genCommands([
        'allow',
        identityString(identity1.providerId, identity1.identityId),
        'invalid',
      ]);
      const result3 = await testUtils.pkWithStdio(command3);
      expect(result3.code).toBe(1); //Should fail.

      //Cleaning up changes to state.
      await polykeyAgent.gestalts.unsetGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'notify',
      );
      await polykeyAgent.gestalts.unsetGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'scan',
      );
    });
    test('Should fail on invalid inputs.', async () => {
      let result;
      //Invalid node.
      result = await testUtils.pkWithStdio(
        genCommands(['allow', invaldNode.id, 'scan']),
      );
      expect(result.code === 0).toBeFalsy(); //Fails..

      //invalid identity
      result = await testUtils.pkWithStdio(
        genCommands([
          'allow',
          identityString(
            invalidIdentity.providerId,
            invalidIdentity.identityId,
          ),
          'scan',
        ]),
      );
      expect(result.code === 0).toBeFalsy(); //Fails..

      //invalid permission.
      result = await testUtils.pkWithStdio(
        genCommands(['allow', invaldNode.id, 'invalidPermission']),
      );
      expect(result.code === 0).toBeFalsy(); //Fails..
    });
  });
  describe('commandDisallowGestalts', () => {
    test('Should disallow permissions on Node.', async () => {
      //Setting permissions.
      await polykeyAgent.gestalts.setGestaltActionByNode(node1.id, 'notify');
      await polykeyAgent.gestalts.setGestaltActionByNode(node1.id, 'scan');

      const commands = genCommands(['disallow', node1.id, 'notify']);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.

      const actions = await polykeyAgent.gestalts.getGestaltActionsByNode(
        node1.id,
      );
      const actionKeys = Object.keys(actions!);
      expect(actionKeys).toContain('scan');
      expect(actionKeys).not.toContain('notify');
    });
    test('Should disallow permissions on Identity.', async () => {
      //Setting permissions.
      await polykeyAgent.gestalts.setGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'notify',
      );
      await polykeyAgent.gestalts.setGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'scan',
      );

      const commands = genCommands([
        'disallow',
        identityString(identity1.providerId, identity1.identityId),
        'scan',
      ]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.

      const actions = await polykeyAgent.gestalts.getGestaltActionsByIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      const actionKeys = Object.keys(actions!);
      expect(actionKeys).toContain('notify');
      expect(actionKeys).not.toContain('scan');
    });
    test('Should fail on invalid inputs.', async () => {
      let result;
      //Invalid node.
      result = await testUtils.pkWithStdio(
        genCommands(['disallow', invaldNode.id, 'scan']),
      );
      expect(result.code === 0).toBeFalsy(); //Fails..

      //invalid identity
      result = await testUtils.pkWithStdio(
        genCommands([
          'disallow',
          identityString(
            invalidIdentity.providerId,
            invalidIdentity.identityId,
          ),
          'scan',
        ]),
      );
      expect(result.code === 0).toBeFalsy(); //Fails..

      //invalid permission.
      result = await testUtils.pkWithStdio(
        genCommands(['disallow', node1.id, 'invalidPermission']),
      );
      expect(result.code === 0).toBeFalsy(); //Fails..
    });
  });
  describe('commandPermissionsGestalts', () => {
    test('Should get permissions on Node.', async () => {
      //Setting permissions.
      await polykeyAgent.gestalts.setGestaltActionByNode(node1.id, 'notify');
      await polykeyAgent.gestalts.setGestaltActionByNode(node1.id, 'scan');

      const commands = genCommands(['perms', node1.id]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.
      //Print result.
      expect(result.stdout).toContain('notify');
      expect(result.stdout).toContain('scan');
    });
    test('Should get permissions on Identity.', async () => {
      //Setting permissions.
      await polykeyAgent.gestalts.setGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'notify',
      );
      await polykeyAgent.gestalts.setGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'scan',
      );

      const commands = genCommands([
        'perms',
        identityString(identity1.providerId, identity1.identityId),
      ]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.
      //Print result.
      expect(result.stdout).toContain('scan');
      expect(result.stdout).toContain('notify');
    });
  });
  describe('commandTrustGestalts', () => {
    test('Should set trust on Node.', async () => {
      const commands = genCommands(['trust', node1.id]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.

      const actions = await polykeyAgent.gestalts.getGestaltActionsByNode(
        node1.id,
      );
      const actionKeys = Object.keys(actions!);
      expect(actionKeys).toContain('notify');
    });
    test('Should set trust on Identity.', async () => {
      const commands = genCommands([
        'trust',
        identityString(identity1.providerId, identity1.identityId),
      ]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.

      const actions = await polykeyAgent.gestalts.getGestaltActionsByIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      const actionKeys = Object.keys(actions!);
      expect(actionKeys).toContain('notify');
    });
    test('Should fail on invalid inputs.', async () => {
      let result;
      //Invalid node.
      result = await testUtils.pkWithStdio(
        genCommands(['trust', invaldNode.id]),
      );
      expect(result.code === 0).toBeFalsy(); //Fails..

      //invalid identity
      result = await testUtils.pkWithStdio(
        genCommands([
          'trust',
          identityString(
            invalidIdentity.providerId,
            invalidIdentity.identityId,
          ),
        ]),
      );
      expect(result.code === 0).toBeFalsy(); //Fails..
    });
  });
  describe('commandUntrustGestalts', () => {
    test('Should unset trust on Node.', async () => {
      //Setting permissions.
      await polykeyAgent.gestalts.setGestaltActionByNode(node1.id, 'notify');
      await polykeyAgent.gestalts.setGestaltActionByNode(node1.id, 'scan');

      const commands = genCommands(['untrust', node1.id]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.

      const actions = await polykeyAgent.gestalts.getGestaltActionsByNode(
        node1.id,
      );
      const actionKeys = Object.keys(actions!);
      expect(actionKeys).toContain('scan');
      expect(actionKeys).not.toContain('notify');
    });
    test('Should unset trust on Identity.', async () => {
      //Setting permissions.
      await polykeyAgent.gestalts.setGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'notify',
      );
      await polykeyAgent.gestalts.setGestaltActionByIdentity(
        identity1.providerId,
        identity1.identityId,
        'scan',
      );

      const commands = genCommands([
        'untrust',
        identityString(identity1.providerId, identity1.identityId),
      ]);
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.

      const actions = await polykeyAgent.gestalts.getGestaltActionsByIdentity(
        identity1.providerId,
        identity1.identityId,
      );
      const actionKeys = Object.keys(actions!);
      expect(actionKeys).toContain('scan');
      expect(actionKeys).not.toContain('notify');
    });
    test('Should fail on invalid inputs.', async () => {
      let result;
      //Invalid node.
      result = await testUtils.pkWithStdio(
        genCommands(['trust', invaldNode.id]),
      );
      expect(result.code === 0).toBeFalsy(); //Fails..

      //invalid identity
      result = await testUtils.pkWithStdio(
        genCommands([
          'untrust',
          identityString(
            invalidIdentity.providerId,
            invalidIdentity.identityId,
          ),
        ]),
      );
      expect(result.code === 0).toBeFalsy(); //Fails..
    });
  });
  describe('commandClaimKeynode', () => {
    test('Should claim a keynode.', async () => {
      const commands = [
        'identities',
        'claim',
        '-np',
        nodePath,
        testToken.providerId,
        testToken.identityId,
      ];
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.

      const gestalt = await polykeyAgent.gestalts.getGestaltByIdentity(
        testToken.providerId,
        testToken.identityId,
      );
      const gestaltString = JSON.stringify(gestalt);
      expect(gestaltString).toContain(testToken.providerId);
      expect(gestaltString).toContain(testToken.identityId);
      expect(gestaltString).toContain(keynode.id);
    });
  });
  describe('commandAuthenticateProvider', () => {
    test('Should authenticate an identity with a provider.', async () => {
      //Attempt to authenticate.
      const commands = [
        'identities',
        'authenticate',
        '-np',
        nodePath,
        testToken.providerId,
        testToken.identityId,
      ];
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.
      expect(result.stdout).toContain('randomtestcode');
      expect(result.stdout).toContain('test_user');
    });
  });
  describe('commandGetGestalts', () => {
    test('Should list gestalt by Node', async () => {
      const commands = ['identities', 'get', '-np', nodePath, node1.id];
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain(node1.id);
      expect(result.stdout).toContain(identity1.providerId);
      expect(result.stdout).toContain(identity1.identityId);
    });
    test('Should list gestalt by Identity', async () => {
      const commands = [
        'identities',
        'get',
        '-np',
        nodePath,
        identityString(identity1.providerId, identity1.identityId),
      ];
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain(node1.id);
      expect(result.stdout).toContain(identity1.providerId);
      expect(result.stdout).toContain(identity1.identityId);
    });
  });
  describe('commandListGestalts', () => {
    //FIXME: Breaking because the gestalt contains no Nodes, this should not be possible.
    test('Should list gestalts with permissions.', async () => {
      await polykeyAgent.gestalts.setGestaltActionByNode(node1.id, 'notify');
      await polykeyAgent.gestalts.setGestaltActionByNode(node1.id, 'scan');
      await polykeyAgent.gestalts.setGestaltActionByNode(node2.id, 'scan');

      const commands = ['identities', 'list', '-np', nodePath];
      const result = await testUtils.pk(commands);
      expect(result.code).toBe(0); //Succeeds.
      expect(result.stdout).toContain('notify');
      expect(result.stdout).toContain('scan');
      expect(result.stdout).toContain(node1.id);
      expect(result.stdout).toContain(node2.id);
      expect(result.stdout).toContain(node3.id);
      expect(result.stdout).toContain(identity1.providerId);
      expect(result.stdout).toContain(identity1.identityId);

      const commands2 = [
        'identities',
        'list',
        '-np',
        nodePath,
        '--format',
        'json',
      ];
      const result2 = await testUtils.pkWithStdio(commands2);
      expect(result2.code).toBe(0); //Succeeds.
      expect(result2.stdout).toContain('notify');
      expect(result2.stdout).toContain('scan');
      expect(result2.stdout).toContain(node1.id);
      expect(result2.stdout).toContain(node2.id);
      expect(result2.stdout).toContain(node3.id);
      expect(result2.stdout).toContain(identity1.providerId);
      expect(result2.stdout).toContain(identity1.identityId);
    });
  });
  describe('commandSearchIdentities', () => {
    test('Should find a connected identity.', async () => {
      //Create an identity
      await polykeyAgent.identities.putToken(
        testToken.providerId,
        testToken.identityId,
        testToken.tokenData,
      );
      const commands = [
        'identities',
        'search',
        '-np',
        nodePath,
        testToken.providerId,
      ];
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0); //Succeeds.
      expect(result.stdout).toContain(testToken.providerId);
      expect(result.stdout).toContain(testToken.identityId);
    });
  });
  describe('commandDiscoverGestalts', () => {
    // Test variables
    let nodeB: PolykeyAgent;
    let nodeC: PolykeyAgent;
    // Let testProvider: TestProvider;
    let identityId: IdentityId;

    beforeAll(async () => {
      // Setup the remote gestalt state here
      // Setting up remote nodes.
      nodeB = await setupRemoteKeynode({ logger });
      nodeC = await setupRemoteKeynode({ logger });

      //Forming links
      //B->C
      //Adding connection details.
      await addRemoteDetails(polykeyAgent, nodeB);
      await addRemoteDetails(nodeB, polykeyAgent);
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
    }, global.polykeyStartupTimeout);
    afterAll(async () => {
      // Clean up the remote gestalt state here.
      await cleanupRemoteKeynode(nodeB);
      await cleanupRemoteKeynode(nodeC);
    });
    afterEach(async () => {
      // Clean the local nodes gestalt graph here.
      await polykeyAgent.gestalts.clearDB();
      await nodeB.gestalts.clearDB();
      await nodeC.gestalts.clearDB();
    });
    test('Should start discovery by Node', async () => {
      const commands = [
        'identities',
        'discover',
        '-np',
        nodePath,
        nodeB.nodes.getNodeId(),
      ];
      const result = await testUtils.pkWithStdio(commands);
      expect(result.code).toBe(0);

      //We expect to find a gestalt now.
      const gestalt = await polykeyAgent.gestalts.getGestalts();
      expect(gestalt.length).not.toBe(0);
      const gestaltString = JSON.stringify(gestalt);
      expect(gestaltString).toContain(nodeB.nodes.getNodeId());
      expect(gestaltString).toContain(nodeC.nodes.getNodeId());
      expect(gestaltString).toContain(identityId);
    });
    test('Should start discovery by Identity', async () => {
      await testProvider.overrideLinks(
        nodeB.nodes.getNodeId(),
        nodeB.keys.getRootKeyPairPem().privateKey,
      );

      const commands = [
        'identities',
        'discover',
        '-np',
        nodePath,
        identityString(testProvider.id, identityId),
      ];
      const result = await testUtils.pk(commands);
      expect(result).toBe(0); //Nothing to discover.

      //We expect to find a gestalt now.
      const gestalt = await polykeyAgent.gestalts.getGestalts();
      expect(gestalt.length).not.toBe(0);
      const gestaltString = JSON.stringify(gestalt);
      expect(gestaltString).toContain(nodeB.nodes.getNodeId());
      expect(gestaltString).toContain(nodeC.nodes.getNodeId());
      expect(gestaltString).toContain(identityId);
    });
  });
});
