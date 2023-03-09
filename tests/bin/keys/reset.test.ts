import type { Host } from '@/network/types';
import type { NodeId } from '@/ids';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import PolykeyAgent from '@/PolykeyAgent';
import * as keysUtils from '@/keys/utils';
import * as nodesUtils from '@/nodes/utils';
import * as testUtils from '../../utils';

describe('reset', () => {
  const logger = new Logger('reset test', LogLevel.WARN, [new StreamHandler()]);
  const password = 'helloworld';
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
  let oldNodeId: NodeId;
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
      logger,
      keyRingConfig: {
        passwordOpsLimit: keysUtils.passwordOpsLimits.min,
        passwordMemLimit: keysUtils.passwordMemLimits.min,
        strictMemoryLock: false,
      },
    });
    oldNodeId = pkAgent.keyRing.getNodeId();
  }, globalThis.defaultTimeout * 2);
  afterEach(async () => {
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  testUtils.testIf(testUtils.isTestPlatformEmpty)(
    'resets the keypair',
    async () => {
      // Can't test with target executable due to mocking
      // Get previous keypair and nodeId
      let { exitCode, stdout } = await testUtils.pkStdio(
        ['keys', 'keypair', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
            PK_PASSWORD_NEW: 'some-password',
          },
          cwd: dataDir,
        },
      );
      expect(exitCode).toBe(0);
      const prevPublicKey = JSON.parse(stdout).publicKey;
      const prevPrivateKey = JSON.parse(stdout).privateKey;
      ({ exitCode, stdout } = await testUtils.pkStdio(
        ['agent', 'status', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      ));
      expect(exitCode).toBe(0);
      const prevNodeId = JSON.parse(stdout).nodeId;
      // Reset keypair
      const passPath = path.join(dataDir, 'reset-password');
      await fs.promises.writeFile(passPath, 'password-new');
      ({ exitCode } = await testUtils.pkStdio(
        ['keys', 'reset', '--password-new-file', passPath],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: password,
          },
          cwd: dataDir,
        },
      ));
      expect(exitCode).toBe(0);
      // Get new keypair and nodeId and compare against old
      ({ exitCode, stdout } = await testUtils.pkStdio(
        ['keys', 'keypair', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: 'password-new',
            PK_PASSWORD_NEW: 'some-password',
            // Client server still using old nodeId, this should be removed if
            // this is fixed.
            PK_NODE_ID: nodesUtils.encodeNodeId(oldNodeId),
            PK_CLIENT_HOST: '127.0.0.1',
            PK_CLIENT_PORT: `${pkAgent.webSocketServer.port}`,
          },
          cwd: dataDir,
        },
      ));
      expect(exitCode).toBe(0);
      const newPublicKey = JSON.parse(stdout).publicKey;
      const newPrivateKey = JSON.parse(stdout).privateKey;
      ({ exitCode, stdout } = await testUtils.pkStdio(
        ['agent', 'status', '--format', 'json'],
        {
          env: {
            PK_NODE_PATH: nodePath,
            PK_PASSWORD: 'password-new',
            // Client server still using old nodeId, this should be removed if
            // this is fixed.
            PK_NODE_ID: nodesUtils.encodeNodeId(oldNodeId),
            PK_CLIENT_HOST: '127.0.0.1',
            PK_CLIENT_PORT: `${pkAgent.webSocketServer.port}`,
          },
          cwd: dataDir,
        },
      ));
      expect(exitCode).toBe(0);
      const newNodeId = JSON.parse(stdout).nodeId;
      expect(newPublicKey).not.toBe(prevPublicKey);
      expect(newPrivateKey).not.toBe(prevPrivateKey);
      expect(newNodeId).not.toBe(prevNodeId);
    },
  );
});
