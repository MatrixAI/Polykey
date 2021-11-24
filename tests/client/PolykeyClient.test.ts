import type * as grpc from '@grpc/grpc-js';
import type { GRPCClientClient } from '@/client';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import * as parsers from '@/bin/parsers';

import { PolykeyClient } from '@';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import { PolykeyAgent } from '@';

import * as testUtils from './utils';

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

  let polykeyAgent: PolykeyAgent;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    passwordFile = path.join(dataDir, 'password');
    await fs.promises.writeFile(passwordFile, password);
    meta = await parsers.parseAuth({ passwordFile: passwordFile, fs: fs });

    polykeyAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath: dataDir,
      logger: logger,
    });

    [server, _port] = await testUtils.openTestClientServer({
      polykeyAgent,
      secure: false,
    });

    pkClient = await PolykeyClient.createPolykeyClient({
      nodePath: dataDir,
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
    let nodePath: string;
    let polykeyAgent: PolykeyAgent;
    let sessionToken;

    beforeAll(async () => {
      // Setting up paths and dirs.
      dataDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'polykey-test-'),
      );
      nodePath = path.join(dataDir, 'keynode');

      // Starting an agent.
      polykeyAgent = await PolykeyAgent.createPolykeyAgent({
        password,
        nodePath,
        logger: logger.getChild(PolykeyAgent.name),
      });

      sessionToken = await polykeyAgent.sessionManager.createToken();
    }, global.defaultTimeout * 3);
    afterAll(async () => {
      await polykeyAgent.stop();
      await polykeyAgent.destroy();
    });
    test('can get status over TLS', async () => {
      // Starting client.
      const pkClient = await PolykeyClient.createPolykeyClient({
        nodePath,
        fs: fs,
        logger: logger.getChild(PolykeyClient.name),
      });
      await pkClient.session.start({ sessionToken });
      const meta = await parsers.parseAuth({
        passwordFile: passwordFile,
        fs: fs,
      });

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
