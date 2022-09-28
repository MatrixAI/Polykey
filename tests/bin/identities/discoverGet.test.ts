import type { IdentityId, ProviderId } from '@/identities/types';
import type { ClaimLinkIdentity } from '@/claims/types';
import type { Gestalt } from '@/gestalts/types';
import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/ids/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { poll, sysexits } from '@/utils';
import * as identitiesUtils from '@/identities/utils';
import * as claimsUtils from '@/claims/utils';
import * as nodesUtils from '@/nodes/utils';
import * as testNodesUtils from '../../nodes/utils';
import TestProvider from '../../identities/TestProvider';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import * as testUtils from '../../utils';

describe('discover/get', () => {
  const logger = new Logger('discover/get test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const testProvider = new TestProvider();
  const identityId = 'abc' as IdentityId;
  const providerString = `${testProvider.id}:${identityId}`;
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
  };
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
  let nodeA: PolykeyAgent;
  let nodeB: PolykeyAgent;
  let nodeAId: NodeId;
  let nodeBId: NodeId;
  let nodeAHost: Host;
  let nodeAPort: Port;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
    // Setup the remote gestalt state here
    // Setting up remote nodes
    nodeA = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir, 'nodeA'),
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
      logger,
    });
    nodeAId = nodeA.keyManager.getNodeId();
    nodeAHost = nodeA.proxy.getProxyHost();
    nodeAPort = nodeA.proxy.getProxyPort();
    nodeB = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: path.join(dataDir, 'nodeB'),
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[1],
      },
      logger,
    });
    nodeBId = nodeB.keyManager.getNodeId();
    await testNodesUtils.nodesConnect(nodeA, nodeB);
    nodePath = path.join(dataDir, 'polykey');
    // Cannot use global shared agent since we need to register a provider
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      networkConfig: {
        proxyHost: '127.0.0.1' as Host,
        forwardHost: '127.0.0.1' as Host,
        agentHost: '127.0.0.1' as Host,
        clientHost: '127.0.0.1' as Host,
      },
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[2],
      },
      logger,
    });
    pkAgent.identitiesManager.registerProvider(testProvider);
    // Add node claim to gestalt
    await nodeA.nodeManager.claimNode(nodeBId);
    // Add identity claim to gestalt
    testProvider.users[identityId] = {};
    nodeA.identitiesManager.registerProvider(testProvider);
    await nodeA.identitiesManager.putToken(testProvider.id, identityId, {
      accessToken: 'abc123',
    });
    const identityClaim: ClaimLinkIdentity = {
      type: 'identity',
      node: nodesUtils.encodeNodeId(nodeAId),
      provider: testProvider.id,
      identity: identityId,
    };
    const [, claimEncoded] = await nodeA.sigchain.addClaim(identityClaim);
    const claim = claimsUtils.decodeClaim(claimEncoded);
    await testProvider.publishClaim(identityId, claim);
  });
  afterEach(async () => {
    await pkAgent.stop();
    await nodeB.stop();
    await nodeA.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'discovers and gets gestalt by node',
    async () => {
      // Need an authenticated identity
      const mockedBrowser = jest
        .spyOn(identitiesUtils, 'browser')
        .mockImplementation(() => {});
      await testUtils.pkStdio(
        [
          'identities',
          'authenticate',
          testToken.providerId,
          testToken.identityId,
        ],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      // Add one of the nodes to our gestalt graph so that we'll be able to
      // contact the gestalt during discovery
      await testUtils.pkStdio(
        [
          'nodes',
          'add',
          nodesUtils.encodeNodeId(nodeAId),
          nodeAHost,
          `${nodeAPort}`,
        ],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      // Discover gestalt by node
      const discoverResponse = await testUtils.pkStdio(
        ['identities', 'discover', nodesUtils.encodeNodeId(nodeAId)],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(discoverResponse.exitCode).toBe(0);
      // Since discovery is a background process we need to wait for the
      // gestalt to be discovered
      await poll<Gestalt>(
        async () => {
          const gestalts = await poll<Array<Gestalt>>(
            async () => {
              return await pkAgent.gestaltGraph.getGestalts();
            },
            (_, result) => {
              if (result.length === 1) return true;
              return false;
            },
            100,
          );
          return gestalts[0];
        },
        (_, result) => {
          if (result === undefined) return false;
          if (Object.keys(result.matrix).length === 3) return true;
          return false;
        },
        100,
      );
      // Now we can get the gestalt
      const getResponse = await testUtils.pkStdio(
        ['identities', 'get', nodesUtils.encodeNodeId(nodeAId)],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(getResponse.exitCode).toBe(0);
      expect(getResponse.stdout).toContain(nodesUtils.encodeNodeId(nodeAId));
      expect(getResponse.stdout).toContain(nodesUtils.encodeNodeId(nodeBId));
      expect(getResponse.stdout).toContain(providerString);
      // Revert side effects
      await pkAgent.gestaltGraph.unsetNode(nodeAId);
      await pkAgent.gestaltGraph.unsetNode(nodeBId);
      await pkAgent.gestaltGraph.unsetIdentity(testProvider.id, identityId);
      await pkAgent.nodeGraph.unsetNode(nodeAId);
      await pkAgent.identitiesManager.delToken(
        testToken.providerId,
        testToken.identityId,
      );
      mockedBrowser.mockRestore();
      // @ts-ignore - get protected property
      pkAgent.discovery.visitedVertices.clear();
    },
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'discovers and gets gestalt by identity',
    async () => {
      // Need an authenticated identity
      const mockedBrowser = jest
        .spyOn(identitiesUtils, 'browser')
        .mockImplementation(() => {});
      await testUtils.pkStdio(
        [
          'identities',
          'authenticate',
          testToken.providerId,
          testToken.identityId,
        ],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      // Add one of the nodes to our gestalt graph so that we'll be able to
      // contact the gestalt during discovery
      await testUtils.pkStdio(
        [
          'nodes',
          'add',
          nodesUtils.encodeNodeId(nodeAId),
          nodeAHost,
          `${nodeAPort}`,
        ],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      // Discover gestalt by node
      const discoverResponse = await testUtils.pkStdio(
        ['identities', 'discover', providerString],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(discoverResponse.exitCode).toBe(0);
      // Since discovery is a background process we need to wait for the
      // gestalt to be discovered
      await poll<Gestalt>(
        async () => {
          const gestalts = await poll<Array<Gestalt>>(
            async () => {
              return await pkAgent.gestaltGraph.getGestalts();
            },
            (_, result) => {
              if (result.length === 1) return true;
              return false;
            },
            100,
          );
          return gestalts[0];
        },
        (_, result) => {
          if (result === undefined) return false;
          if (Object.keys(result.matrix).length === 3) return true;
          return false;
        },
        100,
      );
      // Now we can get the gestalt
      const getResponse = await testUtils.pkStdio(
        ['identities', 'get', providerString],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      );
      expect(getResponse.exitCode).toBe(0);
      expect(getResponse.stdout).toContain(nodesUtils.encodeNodeId(nodeAId));
      expect(getResponse.stdout).toContain(nodesUtils.encodeNodeId(nodeBId));
      expect(getResponse.stdout).toContain(providerString);
      // Revert side effects
      await pkAgent.gestaltGraph.unsetNode(nodeAId);
      await pkAgent.gestaltGraph.unsetNode(nodeBId);
      await pkAgent.gestaltGraph.unsetIdentity(testProvider.id, identityId);
      await pkAgent.nodeGraph.unsetNode(nodeAId);
      await pkAgent.identitiesManager.delToken(
        testToken.providerId,
        testToken.identityId,
      );
      mockedBrowser.mockRestore();
      // @ts-ignore - get protected property
      pkAgent.discovery.visitedVertices.clear();
    },
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'should fail on invalid inputs',
    async () => {
      let exitCode;
      // Discover
      ({ exitCode } = await testUtils.pkStdio(
        ['identities', 'discover', 'invalid'],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      ));
      expect(exitCode).toBe(sysexits.USAGE);
      // Get
      ({ exitCode } = await testUtils.pkStdio(
        ['identities', 'get', 'invalid'],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      ));
    },
  );
});
