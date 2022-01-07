import type * as grpc from '@grpc/grpc-js';
import type { Host, Port } from '@/network/types';
import type { NodeId } from '@/nodes/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { GRPCClientClient } from '@/client';
import { PolykeyAgent } from '@';
import { utils as keysUtils } from '@/keys';
import { Status } from '@/status';
import { Session } from '@/sessions';
import { errors as clientErrors } from '@/client';
import config from '@/config';
import * as binProcessors from '@/bin/utils/processors';
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
    nodeId = pkAgent.nodeManager.getNodeId();
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
  test('can get status', async () => {
    client = await GRPCClientClient.createGRPCClientClient({
      nodeId: nodeId,
      host: '127.0.0.1' as Host,
      port: port as Port,
      tlsConfig: { keyPrivatePem: undefined, certChainPem: undefined },
      logger: logger,
      timeout: 10000,
      session: session,
    });
    await fs.promises.writeFile(path.join(dataDir, 'password'), password);
    const meta = await binProcessors.processAuthentication(
      path.join(dataDir, 'password'),
      fs,
    );
    const status = new Status({
      statusPath: path.join(nodePath, config.defaults.statusBase),
      statusLockPath: path.join(nodePath, config.defaults.statusLockBase),
      fs,
      logger,
    });
    const statusInfo = (await status.readStatus())!;
    const emptyMessage = new utilsPB.EmptyMessage();
    const response = await client.agentStatus(emptyMessage, meta);
    expect(typeof response.getPid()).toBe('number');
    expect(response.getNodeId()).toBe(statusInfo.data.nodeId);
    expect(response.getClientHost()).toBe(statusInfo.data.clientHost);
    expect(response.getClientPort()).toBe(statusInfo.data.clientPort);
    expect(response.getIngressHost()).toBe(statusInfo.data.ingressHost);
    expect(response.getIngressPort()).toBe(statusInfo.data.ingressPort);
    expect(typeof response.getEgressHost()).toBe('string');
    expect(typeof response.getEgressPort()).toBe('number');
    expect(typeof response.getAgentHost()).toBe('string');
    expect(typeof response.getAgentPort()).toBe('number');
    expect(typeof response.getProxyHost()).toBe('string');
    expect(typeof response.getProxyPort()).toBe('number');
    expect(typeof response.getRootPublicKeyPem()).toBe('string');
    expect(typeof response.getRootCertPem()).toBe('string');
    expect(typeof response.getRootCertChainPem()).toBe('string');
    await client.destroy();
  });
});
