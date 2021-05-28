import type { NodeId } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import * as grpc from '@grpc/grpc-js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { agentPB, GRPCClientAgent } from '@/agent';
import { VaultManager } from '@/vaults';
import { NodeManager } from '@/nodes';
import { KeyManager } from '@/keys';
import * as testUtils from './utils';
import { GitBackend } from '../../src/git';
import { ForwardProxy, ReverseProxy } from '@/network';

describe('GRPC agent', () => {
  const logger = new Logger('AgentServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: GRPCClientAgent;
  let server: grpc.Server;
  let port: number;

  let dataDir: string;
  let keysPath: string;
  let vaultsPath: string;
  let nodesPath: string;

  let keyManager: KeyManager;
  let vaultManager: VaultManager;
  let nodeManager: NodeManager;
  let gitBackend: GitBackend;

  let fwdProxy: ForwardProxy;
  let revProxy: ReverseProxy;

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    keysPath = path.join(dataDir, 'keys');
    vaultsPath = path.join(dataDir, 'vaults');
    nodesPath = path.join(dataDir, 'nodes');

    fwdProxy = new ForwardProxy({
      authToken: 'abc',
      logger: logger,
    });

    revProxy = new ReverseProxy({
      logger: logger,
    });

    keyManager = new KeyManager({
      keysPath,
      fs: fs,
      logger: logger,
    });

    vaultManager = new VaultManager({
      vaultsPath: vaultsPath,
      keyManager: keyManager,
      fs: fs,
      logger: logger,
    });

    nodeManager = new NodeManager({
      nodesPath: nodesPath,
      keyManager: keyManager,
      fwdProxy: fwdProxy,
      revProxy: revProxy,
      fs: fs,
      logger: logger,
    });

    gitBackend = new GitBackend({
      getVault: vaultManager.getVault.bind(vaultManager),
      getVaultID: vaultManager.getVaultIds.bind(vaultManager),
      getVaultNames: vaultManager.listVaults.bind(vaultManager),
      logger: logger,
    });

    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    await nodeManager.start({ nodeId: 'NODEID' as NodeId });

    [server, port] = await testUtils.openTestAgentServer({
      keyManager,
      vaultManager,
      nodeManager,
      gitBackend,
    });

    client = await testUtils.openTestAgentClient(port);
  });
  afterAll(async () => {
    await testUtils.closeTestAgentClient(client);
    await testUtils.closeTestAgentServer(server);

    await nodeManager.stop();
    await vaultManager.stop();
    await keyManager.stop();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('echo', async () => {
    const echoMessage = new agentPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.echo(echoMessage);
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
  });
});
