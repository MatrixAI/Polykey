import type { Host, Port } from '@/network/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import type { ClaimLinkIdentity } from '@/claims/types';
import type { NodeId } from '@/nodes/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { sysexits } from '@/utils';
import * as nodesUtils from '@/nodes/utils';
import * as claimsUtils from '@/claims/utils';
import * as identitiesUtils from '@/identities/utils';
import * as execUtils from '../../utils/exec';
import TestProvider from '../../identities/TestProvider';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import * as testUtils from '../../utils';

describe('trust/untrust/list', () => {
  const logger = new Logger('trust/untrust/list test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  const provider = new TestProvider();
  const identity = 'abc' as IdentityId;
  const providerString = `${provider.id}:${identity}`;
  const testToken = {
    providerId: 'test-provider' as ProviderId,
    identityId: 'test_user' as IdentityId,
  };
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
  let node: PolykeyAgent;
  let nodeId: NodeId;
  let nodeHost: Host;
  let nodePort: Port;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(globalThis.tmpDir, 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'polykey');
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
        privateKeyPemOverride: globalRootKeyPems[0],
      },
      logger,
    });
    pkAgent.identitiesManager.registerProvider(provider);
    // Set up a gestalt to trust
    const nodePathGestalt = path.join(dataDir, 'gestalt');
    node = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: nodePathGestalt,
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
    nodeId = node.keyManager.getNodeId();
    nodeHost = node.proxy.getProxyHost();
    nodePort = node.proxy.getProxyPort();
    node.identitiesManager.registerProvider(provider);
    await node.identitiesManager.putToken(provider.id, identity, {
      accessToken: 'def456',
    });
    provider.users[identity] = {};
    const identityClaim: ClaimLinkIdentity = {
      type: 'identity',
      node: nodesUtils.encodeNodeId(node.keyManager.getNodeId()),
      provider: provider.id,
      identity: identity,
    };
    const [, claimEncoded] = await node.sigchain.addClaim(identityClaim);
    const claim = claimsUtils.decodeClaim(claimEncoded);
    await provider.publishClaim(identity, claim);
  });
  afterEach(async () => {
    await node.stop();
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'trusts and untrusts a gestalt by node, adds it to the gestalt graph, and lists the gestalt with notify permission',
    async () => {
      let exitCode, stdout;
      // Add the node to our node graph and authenticate an identity on the
      // provider
      // This allows us to contact the members of the gestalt we want to trust
      await execUtils.pkStdio(
        [
          'nodes',
          'add',
          nodesUtils.encodeNodeId(nodeId),
          nodeHost,
          `${nodePort}`,
        ],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      const mockedBrowser = jest
        .spyOn(identitiesUtils, 'browser')
        .mockImplementation(() => {});
      await execUtils.pkStdio(
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
      mockedBrowser.mockRestore();
      // Trust node - this should trigger discovery on the gestalt the node
      // belongs to and add it to our gestalt graph
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'trust', nodesUtils.encodeNodeId(nodeId)],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // Since discovery is a background process we need to wait for the
      // gestalt to be discovered
      await pkAgent.discovery.waitForDrained();
      // Check that gestalt was discovered and permission was set
      ({ exitCode, stdout } = await execUtils.pkStdio(
        ['identities', 'list', '--format', 'json'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toHaveLength(1);
      expect(JSON.parse(stdout)[0]).toEqual({
        permissions: ['notify'],
        nodes: [{ id: nodesUtils.encodeNodeId(nodeId) }],
        identities: [
          {
            providerId: provider.id,
            identityId: identity,
          },
        ],
      });
      // Untrust the gestalt by node
      // This should remove the permission, but not the gestalt (from the gestalt
      // graph)
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'untrust', nodesUtils.encodeNodeId(nodeId)],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // Check that gestalt still exists but has no permissions
      ({ exitCode, stdout } = await execUtils.pkStdio(
        ['identities', 'list', '--format', 'json'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toHaveLength(1);
      expect(JSON.parse(stdout)[0]).toEqual({
        permissions: null,
        nodes: [{ id: nodesUtils.encodeNodeId(nodeId) }],
        identities: [
          {
            providerId: provider.id,
            identityId: identity,
          },
        ],
      });
      // Revert side-effects
      await pkAgent.gestaltGraph.unsetNode(nodeId);
      await pkAgent.gestaltGraph.unsetIdentity(provider.id, identity);
      await pkAgent.nodeGraph.unsetNode(nodeId);
      await pkAgent.identitiesManager.delToken(
        testToken.providerId,
        testToken.identityId,
      );
      // @ts-ignore - get protected property
      pkAgent.discovery.visitedVertices.clear();
    },
    globalThis.defaultTimeout * 2,
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'trusts and untrusts a gestalt by identity, adds it to the gestalt graph, and lists the gestalt with notify permission',
    async () => {
      let exitCode, stdout;
      // Add the node to our node graph and authenticate an identity on the
      // provider
      // This allows us to contact the members of the gestalt we want to trust
      await execUtils.pkStdio(
        [
          'nodes',
          'add',
          nodesUtils.encodeNodeId(nodeId),
          nodeHost,
          `${nodePort}`,
        ],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      const mockedBrowser = jest
        .spyOn(identitiesUtils, 'browser')
        .mockImplementation(() => {});
      await execUtils.pkStdio(
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
      mockedBrowser.mockRestore();
      // Trust identity - this should trigger discovery on the gestalt the node
      // belongs to and add it to our gestalt graph
      // This command should fail first time as we need to allow time for the
      // identity to be linked to a node in the node graph
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'trust', providerString],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(sysexits.NOUSER);
      // Since discovery is a background process we need to wait for the
      // gestalt to be discovered
      await pkAgent.discovery.waitForDrained();
      // This time the command should succeed
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'trust', providerString],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // Check that gestalt was discovered and permission was set
      ({ exitCode, stdout } = await execUtils.pkStdio(
        ['identities', 'list', '--format', 'json'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toHaveLength(1);
      expect(JSON.parse(stdout)[0]).toEqual({
        permissions: ['notify'],
        nodes: [{ id: nodesUtils.encodeNodeId(nodeId) }],
        identities: [
          {
            providerId: provider.id,
            identityId: identity,
          },
        ],
      });
      // Untrust the gestalt by node
      // This should remove the permission, but not the gestalt (from the gestalt
      // graph)
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'untrust', providerString],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // Check that gestalt still exists but has no permissions
      ({ exitCode, stdout } = await execUtils.pkStdio(
        ['identities', 'list', '--format', 'json'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toHaveLength(1);
      expect(JSON.parse(stdout)[0]).toEqual({
        permissions: null,
        nodes: [{ id: nodesUtils.encodeNodeId(nodeId) }],
        identities: [
          {
            providerId: provider.id,
            identityId: identity,
          },
        ],
      });
      // Revert side-effects
      await pkAgent.gestaltGraph.unsetNode(nodeId);
      await pkAgent.gestaltGraph.unsetIdentity(provider.id, identity);
      await pkAgent.nodeGraph.unsetNode(nodeId);
      await pkAgent.identitiesManager.delToken(
        testToken.providerId,
        testToken.identityId,
      );
      // @ts-ignore - get protected property
      pkAgent.discovery.visitedVertices.clear();
    },
    globalThis.defaultTimeout * 2,
  );
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'should fail on invalid inputs',
    async () => {
      let exitCode;
      // Trust
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'trust', 'invalid'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(sysexits.USAGE);
      // Untrust
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'untrust', 'invalid'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(sysexits.USAGE);
    },
  );
});
