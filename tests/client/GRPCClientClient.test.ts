import type { NodeId } from '@/nodes/types';
import type { Host, Port } from '@/network/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as grpc from '@grpc/grpc-js';

import { messages, GRPCClientClient } from '@/client';
import { PolykeyAgent } from '@';

import * as testUtils from './utils';
import { Session } from '@/sessions';

describe('GRPCClientClient', () => {
  const password = 'password';
  const logger = new Logger('GRPCClientClientTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: GRPCClientClient;
  let server: grpc.Server;
  let port: number;

  let polykeyAgent: PolykeyAgent;
  let dataDir: string;
  let nodePath: string;

  let nodeId: NodeId;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'node');
    polykeyAgent = await PolykeyAgent.createPolykey({
      password,
      nodePath,
      logger: logger,
      cores: 1,
      workerManager: null,
    });

    await polykeyAgent.start({});
    nodeId = polykeyAgent.nodes.getNodeId();
    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
    });

    client = await GRPCClientClient.createGRPCCLientClient({
      nodeId: nodeId,
      host: '127.0.0.1' as Host,
      port: port as Port,
      logger: logger,
    });
    const clientPath = path.join(nodePath, 'client');
    const session = new Session({ clientPath, logger });
    const token = await polykeyAgent.sessions.generateToken();
    await session.start({ token });
    await client.start({ timeout: 10000, session });
  }, global.polykeyStartupTimeout * 3);
  afterEach(async () => {
    await client.stop();
    await testUtils.closeTestClientServer(server);

    await polykeyAgent.stop();
    await polykeyAgent.destroy();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('echo', async () => {
    const echoMessage = new messages.EchoMessage();
    echoMessage.setChallenge('yes');
    const response = await client.echo(echoMessage);
    expect(response.getChallenge()).toBe('yes');
    await client.stop();
    await client.destroy();
  });
});
