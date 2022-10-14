import type { Host, Port } from '@/network/types';
import type NodeConnectionManager from '@/nodes/NodeConnectionManager';
import type ACL from '@/acl/ACL';
import type GestaltGraph from '@/gestalts/GestaltGraph';
import type NotificationsManager from '@/notifications/NotificationsManager';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import { Metadata } from '@grpc/grpc-js';
import KeyRing from '@/keys/KeyRing';
import VaultManager from '@/vaults/VaultManager';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import vaultsRename from '@/client/service/vaultsRename';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as clientUtils from '@/client/utils/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as testUtils from '../../utils';
import * as keysUtils from '@/keys/utils/index';

describe('vaultsRename', () => {
  const logger = new Logger('vaultsRename test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let dataDir: string;
  let keyRing: KeyRing;
  let db: DB;
  let vaultManager: VaultManager;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyRing = await KeyRing.createKeyRing({
      password,
      keysPath,
      logger,
      passwordOpsLimit: keysUtils.passwordOpsLimits.min,
      passwordMemLimit: keysUtils.passwordMemLimits.min,
      strictMemoryLock: false,
    });
    const dbPath = path.join(dataDir, 'db');
    db = await DB.createDB({
      dbPath,
      logger,
    });
    const vaultsPath = path.join(dataDir, 'vaults');
    vaultManager = await VaultManager.createVaultManager({
      vaultsPath,
      db,
      acl: {} as ACL,
      keyRing,
      nodeConnectionManager: {} as NodeConnectionManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    const clientService = {
      vaultsRename: vaultsRename({
        authenticate,
        vaultManager,
        db,
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
    await db.stop();
    await keyRing.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('should rename vault', async () => {
    const vaultId1 = await vaultManager.createVault('test-vault1');
    const vaultRenameMessage = new vaultsPB.Rename();
    const vaultMessage = new vaultsPB.Vault();
    vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId1));
    vaultRenameMessage.setVault(vaultMessage);
    vaultRenameMessage.setNewName('test-vault2');
    const vaultId2 = await grpcClient.vaultsRename(
      vaultRenameMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(vaultId2).toBeInstanceOf(vaultsPB.Vault);
    expect(vaultsUtils.decodeVaultId(vaultId2.getNameOrId())).toStrictEqual(
      vaultId1,
    );
    const renamedVaultId = await vaultManager.getVaultId('test-vault2');
    expect(renamedVaultId).toEqual(vaultId1);
  });
});
