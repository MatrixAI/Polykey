import type { NodeId } from '@/nodes/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as grpc from '@grpc/grpc-js';

import { PolykeyClient } from '@';
import { clientPB, GRPCClientClient } from '@/client';
import { utils as keyUtils } from '@/keys';
import { utils as networkUtils } from '@/network';
import { PolykeyAgent } from '@';

import * as testUtils from './utils';

describe('GRPCClientClient', () => {
  const logger = new Logger('GRPCClientClientTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: GRPCClientClient;
  let pkClient: PolykeyClient;
  let server: grpc.Server;
  let port: number;

  let dataDir: string;

  let polykeyAgent: PolykeyAgent;

  let nodeId: NodeId;

  beforeEach(async () => {
    const keyPair = await keyUtils.generateKeyPair(4096);
    const cert = keyUtils.generateCertificate(
      keyPair.publicKey,
      keyPair.privateKey,
      keyPair.privateKey,
      86400,
    );
    nodeId = networkUtils.certNodeId(cert);

    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    polykeyAgent = new PolykeyAgent({
      nodePath: dataDir,
      logger: logger,
    });

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
    });

    await polykeyAgent.lockfile.start({ nodeId });
    await polykeyAgent.lockfile.updateLockfile('host', '127.0.0.1');
    await polykeyAgent.lockfile.updateLockfile('port', port);
    await polykeyAgent.lockfile.updateLockfile('fwdProxyHost', '::');
    await polykeyAgent.lockfile.updateLockfile('fwdProxyPort', 0);

    pkClient = new PolykeyClient({
      nodePath: dataDir,
      fs: fs,
      logger: logger,
    });

    await pkClient.start({});

    client = pkClient.grpcClient;
    await client.start({});
  });
  afterEach(async () => {
    await client.stop();
    await pkClient.stop();
    await testUtils.closeTestClientServer(server);

    await polykeyAgent.lockfile.stop();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('echo', async () => {
    const echoMessage = new clientPB.EchoMessage();
    echoMessage.setChallenge('yes');
    await client.echo(echoMessage);
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
  });
});
