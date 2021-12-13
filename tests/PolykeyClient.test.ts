import type * as grpc from '@grpc/grpc-js';
import type { GRPCClientClient } from '@/client';
import type { SessionToken } from '@/sessions/types';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as binProcessors from '@/bin/utils/processors';
import { PolykeyClient } from '@';
import { Status } from '@/status';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { PolykeyAgent } from '@';
import config from '@/config';
import * as testClientUtils from './client/utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('PolykeyClient', () => {
  const password = 'password';
  const logger = new Logger('GRPCClientClientTest', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let client: GRPCClientClient;
  let pkClient: PolykeyClient;
  let server: grpc.Server;
  let _port: number;
  let passwordFile: string;
  let meta: grpc.Metadata;
  let dataDir: string;
  let nodePath: string;
  let nodePath2: string;
  let clientPath: string;
  let clientPath2: string;
  let polykeyAgent: PolykeyAgent;
  let polykeyAgent2: PolykeyAgent;
  let sessionToken: SessionToken;
  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'keynode1');
    clientPath = path.join(dataDir, 'client1');
    nodePath2 = path.join(dataDir, 'keynode2');
    clientPath2 = path.join(dataDir, 'client2');
    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, password);
    meta = await binProcessors.processAuthentication(passwordFile, fs);
    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      logger: logger,
    });
    polykeyAgent2 = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: nodePath2,
      logger: logger.getChild(PolykeyAgent.name),
    });
    [server, _port] = await testClientUtils.openTestClientServer({
      polykeyAgent,
      secure: false,
    });
    pkClient = await PolykeyClient.createPolykeyClient({
      nodeId: polykeyAgent.keyManager.getNodeId(),
      host: polykeyAgent.grpcServerClient.host,
      port: polykeyAgent.grpcServerClient.port,
      nodePath: clientPath,
      fs: fs,
      logger: logger,
    });
    client = pkClient.grpcClient;
    sessionToken = await polykeyAgent.sessionManager.createToken();
    await pkClient.session.start({ sessionToken });
  });
  afterAll(async () => {
    await client.destroy();
    await pkClient.stop();
    await testClientUtils.closeTestClientServer(server);
    await polykeyAgent2.stop();
    await polykeyAgent2.destroy();
    await polykeyAgent.stop();
    await polykeyAgent.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('can get status', async () => {
    const status = new Status({
      statusPath: path.join(nodePath, config.defaults.statusBase),
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
  });
  test('can get status over TLS', async () => {
    // Starting client.
    const pkClient = await PolykeyClient.createPolykeyClient({
      nodeId: polykeyAgent2.keyManager.getNodeId(),
      host: polykeyAgent2.grpcServerClient.host,
      port: polykeyAgent2.grpcServerClient.port,
      nodePath: clientPath2,
      fs: fs,
      logger: logger.getChild(PolykeyClient.name),
    });
    await pkClient.session.start({ sessionToken });
    const meta = await binProcessors.processAuthentication(passwordFile, fs);

    const status = new Status({
      statusPath: path.join(nodePath2, config.defaults.statusBase),
      fs,
      logger,
    });
    const statusInfo = (await status.readStatus())!;

    const emptyMessage = new utilsPB.EmptyMessage();
    const response = await pkClient.grpcClient.agentStatus(emptyMessage, meta);
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
    expect(pkClient.grpcClient.secured).toBeTruthy();
  });
});
