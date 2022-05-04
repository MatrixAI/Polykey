import type * as grpc from '@grpc/grpc-js';
import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import GRPCClientClient from '@/client/GRPCClientClient';
import PolykeyAgent from '@/PolykeyAgent';
import Session from '@/sessions/Session';
import * as keysUtils from '@/keys/utils';
import * as clientErrors from '@/client/errors';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as testClientUtils from './utils';
import * as testUtils from '../utils';

describe(GRPCClientClient.name, () => {
  const password = 'password';
  const logger = new Logger(`${GRPCClientClient.name} test`, LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  let client: GRPCClientClient;
  let server: grpc.Server;
  let port: number;
  let pkAgent: PolykeyAgent;
  let dataDir: string;
  let nodePath: string;
  let nodeId: NodeId;
  let session: Session;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'node');
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      logger: logger,
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
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  test('cannot be called when destroyed', async () => {
    client = await GRPCClientClient.createGRPCClientClient({
      nodeId: nodeId,
      host: '127.0.0.1' as Host,
      port: port as Port,
      tlsConfig: { keyPrivatePem: undefined, certChainPem: undefined },
      logger: logger,
      timeout: 10000,
      session: session,
    });
    await client.destroy();
    await expect(async () => {
      await client.agentStatus(new utilsPB.EmptyMessage());
    }).rejects.toThrow(clientErrors.ErrorClientClientDestroyed);
  });
});
