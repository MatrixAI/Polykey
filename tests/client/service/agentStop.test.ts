import type { Host, Port } from '@/network/types';
import type { SessionToken } from '@/sessions/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { running } from '@matrixai/async-init';
import { PolykeyAgent } from '@';
import { utils as keysUtils } from '@/keys';
import { GRPCServer } from '@/grpc';
import { Status } from '@/status';
import {
  GRPCClientClient,
  ClientServiceService,
  utils as clientUtils,
  errors as clientErrors,
} from '@/client';
import agentStop from '@/client/service/agentStop';
import config from '@/config';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as testUtils from '../../utils';

describe('agentStop', () => {
  const logger = new Logger('agentStop test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;
  beforeAll(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);
  });
  afterAll(async () => {
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
  });
  let dataDir: string;
  let nodePath: string;
  let pkAgent: PolykeyAgent;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    nodePath = path.join(dataDir, 'polykey');
    // Note that by doing this, the agent the call is stopping is a separate agent
    pkAgent = await PolykeyAgent.createPolykeyAgent({
      password,
      nodePath,
      logger,
    });
    const authenticate = clientUtils.authenticator(
      pkAgent.sessionManager,
      pkAgent.keyManager,
    );
    const clientService = {
      agentStop: agentStop({
        authenticate,
        pkAgent: pkAgent as unknown as PolykeyAgent,
      }),
    };
    grpcServer = new GRPCServer({ logger });
    await grpcServer.start({
      services: [[ClientServiceService, clientService]],
      host: '127.0.0.1' as Host,
      port: 0 as Port,
    });
    grpcClient = await GRPCClientClient.createGRPCClientClient({
      nodeId: pkAgent.keyManager.getNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.port,
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await pkAgent.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('stops the agent with password', async () => {
    const statusPath = path.join(nodePath, config.defaults.statusBase);
    const status = new Status({
      statusPath,
      fs,
      logger,
    });
    const request = new utilsPB.EmptyMessage();
    const response = await grpcClient.agentStop(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    // While the `agentStop` is asynchronous
    // There is a synchronous switch to `running`
    expect(pkAgent[running]).toBe(false);
    // It may already be stopping
    expect(await status.readStatus()).toMatchObject({
      status: expect.stringMatching(/LIVE|STOPPING|DEAD/),
    });
    await status.waitFor('DEAD');
    expect(pkAgent[running]).toBe(false);
  });
  test('stops the agent with token', async () => {
    const token = await pkAgent.sessionManager.createToken();
    const statusPath = path.join(nodePath, config.defaults.statusBase);
    const status = new Status({
      statusPath,
      fs,
      logger,
    });
    const request = new utilsPB.EmptyMessage();
    const response = await grpcClient.agentStop(
      request,
      clientUtils.encodeAuthFromSession(token),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    // While the `agentStop` is asynchronous
    // There is a synchronous switch to `running`
    expect(pkAgent[running]).toBe(false);
    // It may already be stopping
    expect(await status.readStatus()).toMatchObject({
      status: expect.stringMatching(/LIVE|STOPPING|DEAD/),
    });
    await status.waitFor('DEAD');
    expect(pkAgent[running]).toBe(false);
  });
  test('cannot stop the agent if not authenticated', async () => {
    const statusPath = path.join(nodePath, config.defaults.statusBase);
    const status = new Status({
      statusPath,
      fs,
      logger,
    });
    const request = new utilsPB.EmptyMessage();
    await expect(async () => {
      await grpcClient.agentStop(request);
    }).rejects.toThrow(clientErrors.ErrorClientAuthMissing);
    expect(pkAgent[running]).toBe(true);
    await expect(async () => {
      await grpcClient.agentStop(
        request,
        clientUtils.encodeAuthFromPassword('wrong password'),
      );
    }).rejects.toThrow(clientErrors.ErrorClientAuthDenied);
    expect(pkAgent[running]).toBe(true);
    await expect(async () => {
      await grpcClient.agentStop(
        request,
        clientUtils.encodeAuthFromSession('wrong token' as SessionToken),
      );
    }).rejects.toThrow(clientErrors.ErrorClientAuthDenied);
    expect(pkAgent[running]).toBe(true);
    expect(await status.readStatus()).toMatchObject({
      status: 'LIVE',
    });
  });
});
