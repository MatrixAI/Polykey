import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as grpc from '@grpc/grpc-js';

import { PolykeyClient } from '@';
import { clientPB, GRPCClientClient } from '@/client';
import { PolykeyAgent } from '@';

import * as testUtils from './utils';

describe('GRPCClientClient', () => {
  const logger = new Logger('GRPCClientClientTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: GRPCClientClient;
  let pkClient: PolykeyClient;
  let server: grpc.Server;
  let _port: number;

  let dataDir: string;

  let polykeyAgent: PolykeyAgent;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );

    polykeyAgent = await PolykeyAgent.createPolykey({
      nodePath: dataDir,
      logger: logger,
    });

    await polykeyAgent.start({ password: 'password' });

    [server, _port] = await testUtils.openTestClientServer({
      polykeyAgent,
    });

    pkClient = new PolykeyClient({
      nodePath: dataDir,
      fs: fs,
      logger: logger,
    });

    await pkClient.start({});

    client = pkClient.grpcClient;
    await client.start({});

    const token = await polykeyAgent.sessions.generateToken();
    await pkClient.session.start({ token });
  });
  afterEach(async () => {
    await client.stop();
    await pkClient.stop();
    await testUtils.closeTestClientServer(server);

    await polykeyAgent.stop();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('echo', async () => {
    const echoMessage = new clientPB.EchoMessage();
    echoMessage.setChallenge('yes');
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
  });
});

describe('TLS tests', () => {
  const logger = new Logger('PolykeyAgent TLS', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'password';
  let dataDir: string;
  let nodePath: string;
  let polykeyAgent: PolykeyAgent;
  let token;

  beforeAll(async () => {
    //Setting up paths and dirs.
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode');

    //Starting an agent.
    polykeyAgent = await PolykeyAgent.createPolykey({
      nodePath,
      logger: logger.getChild('agent'),
      clientGrpcPort: 55555,
    });

    await polykeyAgent.start({ password });
    token = await polykeyAgent.sessions.generateToken();
  }, global.defaultTimeout * 3);
  afterAll(async () => {
    await polykeyAgent.stop();
  });
  test('Can connect and echo over TLS', async () => {
    //Starting client.
    const pkClient = new PolykeyClient({
      nodePath,
      fs: fs,
      logger: logger.getChild('client'),
    });

    await pkClient.start({});
    const client = pkClient.grpcClient;
    await pkClient.session.start({ token });

    const echoMessage = new clientPB.EchoMessage();
    echoMessage.setChallenge('yes');
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
    expect(pkClient.grpcClient.secured).toBeTruthy();
  });
});
