import type { Host, Port } from '@/network/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import { running } from '@matrixai/async-init';
import PolykeyAgent from '@/PolykeyAgent';
import Status from '@/status/Status';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import agentStop from '@/client/service/agentStop';
import config from '@/config';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '@/client/utils/utils';
import { globalRootKeyPems } from '../../globalRootKeyPems';

describe('agentStop', () => {
  const logger = new Logger('agentStop test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
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
      keysConfig: {
        privateKeyPemOverride: globalRootKeyPems[0],
      },
    });
    const clientService = {
      agentStop: agentStop({
        authenticate,
        pkAgent: pkAgent as unknown as PolykeyAgent,
        logger,
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
      port: grpcServer.getPort(),
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
  test('stops the agent', async () => {
    const statusPath = path.join(nodePath, config.defaults.statusBase);
    const statusLockPath = path.join(nodePath, config.defaults.statusLockBase);
    const status = new Status({
      statusPath,
      statusLockPath,
      fs,
      logger,
    });
    const request = new utilsPB.EmptyMessage();
    const response = await grpcClient.agentStop(
      request,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.EmptyMessage);
    // It may already be stopping
    expect(await status.readStatus()).toMatchObject({
      status: expect.stringMatching(/LIVE|STOPPING|DEAD/),
    });
    await status.waitFor('DEAD');
    expect(pkAgent[running]).toBe(false);
  });
});
