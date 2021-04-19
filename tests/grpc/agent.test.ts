import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import * as grpc from '@grpc/grpc-js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { agentPB, GRPCClientAgent } from '@/agent';
import { VaultManager } from '@/vaults';
import { NodeManager } from '@/nodes';
import * as testUtils from './utils';
import { KeyManager } from '@/keys';

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

  let keyManager: KeyManager;
  let vaultManager: VaultManager;
  let nodeManager: NodeManager;

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
    keysPath = path.join(dataDir, 'keys');
    vaultsPath = path.join(dataDir, 'vaults');

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
      fs: fs,
      logger: logger,
    });

    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    await nodeManager.start();

    [server, port] = await testUtils.openTestAgentServer({
      keyManager,
      vaultManager,
      nodeManager,
    });

    client = await testUtils.openTestAgentClient(port);
  });
  afterAll(async () => {
    await testUtils.closeTestAgentClient(client);
    await testUtils.closeTestAgentServer(server);

    await nodeManager.stop();
    await vaultManager.stop();
    await keyManager.stop();

    await fs.rm(dataDir, {
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
