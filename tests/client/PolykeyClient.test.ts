import type * as grpc from '@grpc/grpc-js';
import type { GRPCClientClient } from '@/client';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import * as binProcessors from '@/bin/utils/processors';

import { PolykeyClient } from '@';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { PolykeyAgent } from '@';

import * as testUtils from './utils';

// Mocks.
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
  let clientPath: string;

  let polykeyAgent: PolykeyAgent;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'node');
    clientPath = path.join(dataDir, 'client');
    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, password);
    meta = await binProcessors.processAuthentication(passwordFile, fs);

    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      logger: logger,
    });

    [server, _port] = await testUtils.openTestClientServer({
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

    const sessionToken = await polykeyAgent.sessionManager.createToken();
    await pkClient.session.start({ sessionToken });
  });
  afterEach(async () => {
    await client.destroy();
    await pkClient.stop();
    await testUtils.closeTestClientServer(server);

    await polykeyAgent.stop();
    await polykeyAgent.destroy();

    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('can get status', async () => {
    const emptyMessage = new utilsPB.EmptyMessage();
    const response = await client.agentStatus(emptyMessage, meta);
    expect(response.getNodeId()).toBeTruthy();
    expect(response.getAddress()).toBeTruthy();
    expect(response.getCert()).toBeTruthy();
  });
  describe('TLS tests', () => {
    const password = 'password';
    const logger = new Logger('PolykeyAgent TLS', LogLevel.WARN, [
      new StreamHandler(),
    ]);
    let dataDir: string;
    let nodePath2: string;
    let clientPath2: string;
    let polykeyAgent2: PolykeyAgent;
    let sessionToken;

    beforeAll(async () => {
      // Setting up paths and dirs.
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      nodePath2 = path.join(dataDir, 'keynode');
      clientPath2 = path.join(dataDir, 'client2');

      // Starting an agent.
      polykeyAgent2 = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath: nodePath2,
        logger: logger.getChild(PolykeyAgent.name),
      });

      sessionToken = await polykeyAgent2.sessionManager.createToken();
    }, global.defaultTimeout * 3);
    afterAll(async () => {
      await polykeyAgent2.stop();
      await polykeyAgent2.destroy();
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

      const emptyMessage = new utilsPB.EmptyMessage();
      const response = await pkClient.grpcClient.agentStatus(
        emptyMessage,
        meta,
      );
      expect(response.getNodeId()).toBeTruthy();
      expect(response.getAddress()).toBeTruthy();
      expect(response.getCert()).toBeTruthy();
      expect(pkClient.grpcClient.secured).toBeTruthy();
    });
  });
});
