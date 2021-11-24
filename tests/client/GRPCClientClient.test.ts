import type * as grpc from '@grpc/grpc-js';
import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { GRPCClientClient } from '@/client';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { PolykeyAgent } from '@';
import * as parsers from '@/bin/parsers';
import { Session } from '@/sessions';
import { errors as clientErrors } from '@/client';
import * as testUtils from './utils';

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
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      logger: logger,
    });

    nodeId = polykeyAgent.nodeManager.getNodeId();
    [server, port] = await testUtils.openTestClientServer({
      polykeyAgent,
    });
    const sessionTokenPath = path.join(nodePath, 'sessionToken');
    const session = new Session({ sessionTokenPath, fs, logger });
    const sessionToken = await polykeyAgent.sessionManager.createToken();
    await session.start({
      sessionToken,
    });
    client = await GRPCClientClient.createGRPCClientClient({
      nodeId: nodeId,
      host: '127.0.0.1' as Host,
      port: port as Port,
      tlsConfig: { keyPrivatePem: undefined, certChainPem: undefined },
      logger: logger,
      timeout: 10000,
      session: session,
    });
  }, global.polykeyStartupTimeout * 3);
  afterEach(async () => {
    await client.destroy();
    await testUtils.closeTestClientServer(server);

    await polykeyAgent.stop();
    await polykeyAgent.destroy();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('cannot be called when destroyed', async () => {
    await client.destroy();
    await expect(async () => {
      await client.agentStatus(new utilsPB.EmptyMessage());
    }).rejects.toThrow(clientErrors.ErrorClientClientDestroyed);
  });
  test('can get status', async () => {
    await fs.promises.writeFile(path.join(dataDir, 'password'), password);
    const meta = await parsers.parseAuth({
      passwordFile: path.join(dataDir, 'password'),
      fs: fs,
    });
    const emptyMessage = new utilsPB.EmptyMessage();
    const response = await client.agentStatus(emptyMessage, meta);
    expect(response.getAddress()).toBeTruthy();
    await client.destroy();
  });
});
