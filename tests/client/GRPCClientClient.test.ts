import type { NodeId } from '@/nodes/types';
import type { Host, Port } from '@/network/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as grpc from '@grpc/grpc-js';

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
  let server: grpc.Server;
  let port: number;

  let polykeyAgent: PolykeyAgent;
  let dataDir: string;
  let callCredentials: Partial<grpc.CallOptions>;

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

    await polykeyAgent.start({ password: 'password ' });

    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
    });

    client = new GRPCClientClient({
      nodeId: nodeId,
      host: '127.0.0.1' as Host,
      port: port as Port,
      logger: logger,
    });

    await client.start({});

    const token = await polykeyAgent.sessions.generateJWTToken();
    callCredentials = {
      credentials: grpc.CallCredentials.createFromMetadataGenerator(
        (_params, callback) => {
          const meta = new grpc.Metadata();
          meta.add('Authorization', `Bearer: ${token}`);
          callback(null, meta);
        },
      ),
    };
  });
  afterEach(async () => {
    await client.stop();
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
    const response = await client.echo(echoMessage, callCredentials);
    expect(response.getChallenge()).toBe('yes');
  });
});
