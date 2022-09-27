import type * as grpc from '@grpc/grpc-js';
import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/ids/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import GRPCClientClient from '@/client/GRPCClientClient';
import PolykeyAgent from '@/PolykeyAgent';
import Session from '@/sessions/Session';
import * as clientErrors from '@/client/errors';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { timerStart } from '@/utils';
import * as testClientUtils from './utils';
import { globalRootKeyPems } from '../fixtures/globalRootKeyPems';

describe(GRPCClientClient.name, () => {
  const password = 'password';
  const logger = new Logger(`${GRPCClientClient.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: GRPCClientClient;
  let server: grpc.Server;
  let port: number;
  let pkAgent: PolykeyAgent;
  let dataDir: string;
  let nodePath: string;
  let nodeId: NodeId;
  let session: Session;
  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'node');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      logger: logger,
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
    });
    nodeId = pkAgent.keyManager.getNodeId();
    [server, port] = await testClientUtils.openTestClientServer({
      pkAgent,
    });
    const sessionTokenPath = path.join(nodePath, 'sessionToken');
    const session = new Session({ sessionTokenPath, fs, logger });
    const sessionToken = await pkAgent.sessionManager.createToken();
    await session.start({
      sessionToken,
    });
  });
  afterAll(async () => {
    await client.destroy();
    await testClientUtils.closeTestClientServer(server);
    await pkAgent.stop();
    await pkAgent.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('cannot be called when destroyed', async () => {
    client = await GRPCClientClient.createGRPCClientClient({
      nodeId: nodeId,
      host: '127.0.0.1' as Host,
      port: port as Port,
      tlsConfig: { keyPrivatePem: undefined, certChainPem: undefined },
      logger: logger,
      timer: timerStart(10000),
      session: session,
    });
    await client.destroy();
    await expect(async () => {
      await client.agentStatus(new utilsPB.EmptyMessage());
    }).rejects.toThrow(clientErrors.ErrorClientClientDestroyed);
  });
});
