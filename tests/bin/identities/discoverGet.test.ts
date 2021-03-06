import type { IdentityId, ProviderId } from '@/identities/types';
import type { ClaimLinkIdentity } from '@/claims/types';
import type { Gestalt } from '@/gestalts/types';
import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { poll, sysexits } from '@/utils';
import * as identitiesUtils from '@/identities/utils';
import * as claimsUtils from '@/claims/utils';
import * as nodesUtils from '@/nodes/utils';
import * as keysUtils from '@/keys/utils';
import * as testBinUtils from '../utils';
import * as testUtils from '../../utils';
import * as testNodesUtils from '../../nodes/utils';
import TestProvider from '../../identities/TestProvider';

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
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
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
        rootKeyPairBits: 2048,
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
        rootKeyPairBits: 2048,
      },
      logger,
    });
    nodeBId = nodeB.keyManager.getNodeId();
    await testNodesUtils.nodesConnect(nodeA, nodeB);
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValueOnce(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValueOnce(globalKeyPair);
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
  }, global.maxTimeout);
  afterAll(async () => {
    await pkAgent.stop();
    await nodeB.stop();
    await nodeA.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  test('discovers and gets gestalt by node', async () => {
    // Need an authenticated identity
    const mockedBrowser = jest
      .spyOn(identitiesUtils, 'browser')
      .mockImplementation(() => {});
    await testBinUtils.pkStdio(
      [
        'identities',
        'authenticate',
        testToken.providerId,
        testToken.identityId,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    // Add one of the nodes to our gestalt graph so that we'll be able to
    // contact the gestalt during discovery
    await testBinUtils.pkStdio(
      [
        'nodes',
        'add',
        nodesUtils.encodeNodeId(nodeAId),
        nodeAHost,
        `${nodeAPort}`,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    // Discover gestalt by node
    const discoverResponse = await testBinUtils.pkStdio(
      ['identities', 'discover', nodesUtils.encodeNodeId(nodeAId)],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
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
    const getResponse = await testBinUtils.pkStdio(
      ['identities', 'get', nodesUtils.encodeNodeId(nodeAId)],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
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
  });
  test('discovers and gets gestalt by identity', async () => {
    // Need an authenticated identity
    const mockedBrowser = jest
      .spyOn(identitiesUtils, 'browser')
      .mockImplementation(() => {});
    await testBinUtils.pkStdio(
      [
        'identities',
        'authenticate',
        testToken.providerId,
        testToken.identityId,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    // Add one of the nodes to our gestalt graph so that we'll be able to
    // contact the gestalt during discovery
    await testBinUtils.pkStdio(
      [
        'nodes',
        'add',
        nodesUtils.encodeNodeId(nodeAId),
        nodeAHost,
        `${nodeAPort}`,
      ],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    );
    // Discover gestalt by node
    const discoverResponse = await testBinUtils.pkStdio(
      ['identities', 'discover', providerString],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
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
    const getResponse = await testBinUtils.pkStdio(
      ['identities', 'get', providerString],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
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
  });
  test('should fail on invalid inputs', async () => {
    let exitCode;
    // Discover
    ({ exitCode } = await testBinUtils.pkStdio(
      ['identities', 'discover', 'invalid'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
    expect(exitCode).toBe(sysexits.USAGE);
    // Get
    ({ exitCode } = await testBinUtils.pkStdio(
      ['identities', 'get', 'invalid'],
      {
        PK_NODE_PATH: nodePath,
        PK_PASSWORD: password,
      },
      dataDir,
    ));
  });
});
