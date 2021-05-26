import type { NodeId } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import * as grpc from '@grpc/grpc-js';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import PolykeyClient from '@/PolykeyClient';
import { VaultManager } from '@/vaults';
import { NodeManager } from '@/nodes';
import { KeyManager } from '@/keys';
import { clientPB } from '@/client';
import * as testUtils from './utils';
import { ForwardProxy, ReverseProxy } from '@/network';

describe('GRPC client', () => {
  const logger = new Logger('ClientServerTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: PolykeyClient;
  let server: grpc.Server;
  let port: number;

  let dataDir: string;
  let keysPath: string;
  let vaultsPath: string;
  let nodesPath: string;

  let keyManager: KeyManager;
  let vaultManager: VaultManager;
  let nodeManager: NodeManager;

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

    await keyManager.start({ password: 'password' });
    await vaultManager.start({});
    await nodeManager.start({ nodeId: 'NODEID' as NodeId });

    [server, port] = await testUtils.openTestClientServer({
      keyManager,
      vaultManager,
      nodeManager,
    });

    // MOCK A LOCKFILE FOR POLYKEYCLIENT
    await fs.promises.writeFile(
      path.join(dataDir, 'agent-lock.json'),
      JSON.stringify({
        grpcHost: '127.0.0.1',
        grpcPort: port,
      }),
    );

    client = await testUtils.openTestClientClient(dataDir);
  });
  afterAll(async () => {
    await testUtils.closeTestClientClient(client);
    await testUtils.closeTestClientServer(server);

    await nodeManager.stop();
    await vaultManager.stop();
    await keyManager.stop();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('echo', async () => {
    const echoMessage = new clientPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.grpcClient.echo(echoMessage);
    const response = await client.grpcClient.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
  });
  test('vault create', async () => {
    const vaultMessage = new clientPB.VaultMessage();
    vaultMessage.setName('TestVault');
    const response = await client.grpcClient.vaultsCreate(vaultMessage);
    expect(response.getSuccess()).toBe(true);
  });
});
