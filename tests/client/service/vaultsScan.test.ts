import type { DB } from '@matrixai/db';
import type { Host, Port } from '@/network/types';
import type KeyRing from '@/keys/KeyRing';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type ACL from '@/acl/ACL';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type NotificationsManager from '@/notifications/NotificationsManager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { Metadata } from '@grpc/grpc-js';
import VaultManager from '@/vaults/VaultManager';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import vaultsScan from '@/client/service/vaultsScan';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as testUtils from '../../utils';

describe('vaultsScan', () => {
  const logger = new Logger('vaultsScan test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let dataDir: string;
  let vaultManager: VaultManager;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const vaultsPath = path.join(dataDir, 'vaults');
    vaultManager = await VaultManager.createVaultManager({
      vaultsPath,
      db: {} as DB,
      acl: {} as ACL,
      keyRing: {} as KeyRing,
      nodeConnectionManager: {} as NodeConnectionManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    const clientService = {
      vaultsScan: vaultsScan({
        authenticate,
        vaultManager,
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
      nodeId: testUtils.generateRandomNodeId(),
      host: '127.0.0.1' as Host,
      port: grpcServer.getPort(),
      logger,
    });
  });
  afterEach(async () => {
    await grpcClient.destroy();
    await grpcServer.stop();
    await vaultManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test.todo('scans a vault');
});
