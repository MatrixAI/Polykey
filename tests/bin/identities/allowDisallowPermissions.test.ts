import type { Host, Port } from '@/network/types';
import type { IdentityId, ProviderId } from '@/identities/types';
import type { ClaimLinkIdentity } from '@/claims/types';
import type { Gestalt } from '@/gestalts/types';
import type { NodeId } from '@/nodes/types';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import { poll, sysexits } from '@/utils';
import * as nodesUtils from '@/nodes/utils';
import * as claimsUtils from '@/claims/utils';
import * as identitiesUtils from '@/identities/utils';
import * as execUtils from '../../utils/exec';
import TestProvider from '../../identities/TestProvider';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';
import { testIf } from '../../utils';
import {
  isTestPlatformDocker,
  isTestPlatformEmpty,
} from '../../utils/platform';

describe('allow/disallow/permissions', () => {
  const logger = new Logger('allow/disallow/permissions test', LogLevel.WARN, [
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
      path.join(global.tmpDir, 'polykey-test-'),
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
    // Set up a gestalt to modify the permissions of
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
  testIf(isTestPlatformEmpty)(
    'allows/disallows/gets gestalt permissions by node',
    async () => {
      let exitCode, stdout;
      // Add the node to our node graph, otherwise we won't be able to contact it
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
      // Must first trust node before we can set permissions
      // This is because trusting the node sets it in our gestalt graph, which
      // we need in order to set permissions
      await execUtils.pkStdio(
        ['identities', 'trust', nodesUtils.encodeNodeId(nodeId)],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
      // We should now have the 'notify' permission, so we'll set the 'scan'
      // permission as well
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'allow', nodesUtils.encodeNodeId(nodeId), 'scan'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // Check that both permissions are set
      ({ exitCode, stdout } = await execUtils.pkStdio(
        [
          'identities',
          'permissions',
          nodesUtils.encodeNodeId(nodeId),
          '--format',
          'json',
        ],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        permissions: ['notify', 'scan'],
      });
      // Disallow both permissions
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'disallow', nodesUtils.encodeNodeId(nodeId), 'notify'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'disallow', nodesUtils.encodeNodeId(nodeId), 'scan'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // Check that both permissions were unset
      ({ exitCode, stdout } = await execUtils.pkStdio(
        [
          'identities',
          'permissions',
          nodesUtils.encodeNodeId(nodeId),
          '--format',
          'json',
        ],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        permissions: [],
      });
    },
  );
  testIf(isTestPlatformEmpty)(
    'allows/disallows/gets gestalt permissions by identity',
    async () => {
      // Can't test with target executable due to mocking
      let exitCode, stdout;
      // Add the node to our node graph, otherwise we won't be able to contact it
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
      // Authenticate our own identity in order to query the provider
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
      // Must first trust identity before we can set permissions
      // This is because trusting the identity sets it in our gestalt graph,
      // which we need in order to set permissions
      // This command should fail first time since the identity won't be linked
      // to any nodes. It will trigger this process via discovery and we must
      // wait and then retry
      await execUtils.pkStdio(
        ['identities', 'trust', providerString],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      );
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
          if (Object.keys(result.matrix).length === 2) return true;
          return false;
        },
        100,
      );
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'trust', providerString],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // We should now have the 'notify' permission, so we'll set the 'scan'
      // permission as well
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'allow', providerString, 'scan'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // Check that both permissions are set
      ({ exitCode, stdout } = await execUtils.pkStdio(
        ['identities', 'permissions', providerString, '--format', 'json'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        permissions: ['notify', 'scan'],
      });
      // Disallow both permissions
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'disallow', providerString, 'notify'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'disallow', providerString, 'scan'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      // Check that both permissions were unset
      ({ exitCode, stdout } = await execUtils.pkStdio(
        ['identities', 'permissions', providerString, '--format', 'json'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(0);
      expect(JSON.parse(stdout)).toEqual({
        permissions: [],
      });
    },
  );
  testIf(isTestPlatformEmpty || isTestPlatformDocker)(
    'should fail on invalid inputs',
    async () => {
      let exitCode;
      // Allow
      // Invalid gestalt id
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'allow', 'invalid', 'notify'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(sysexits.USAGE);
      // Invalid permission
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'allow', nodesUtils.encodeNodeId(nodeId), 'invalid'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(sysexits.USAGE);
      // Permissions
      // Invalid gestalt id
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'permissions', 'invalid'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(sysexits.USAGE);
      // Disallow
      // Invalid gestalt id
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'disallow', 'invalid', 'notify'],
        {
          PK_NODE_PATH: nodePath,
          PK_PASSWORD: password,
        },
        dataDir,
      ));
      expect(exitCode).toBe(sysexits.USAGE);
      // Invalid permission
      ({ exitCode } = await execUtils.pkStdio(
        ['identities', 'disallow', nodesUtils.encodeNodeId(nodeId), 'invalid'],
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
