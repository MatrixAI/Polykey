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
import KeyManager from '@/keys/KeyManager';
import VaultManager from '@/vaults/VaultManager';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import vaultsCreate from '@/client/service/vaultsCreate';
import vaultsDelete from '@/client/service/vaultsDelete';
import vaultsList from '@/client/service/vaultsList';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as clientUtils from '@/client/utils/utils';
import * as testUtils from '../../utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';

describe('vaultsCreateDeleteList', () => {
  const logger = new Logger('vaultsCreateDeleteList test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  let dataDir: string;
  let keyManager: KeyManager;
  let db: DB;
  let vaultManager: VaultManager;
  let grpcServer: GRPCServer;
  let grpcClient: GRPCClientClient;
  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const keysPath = path.join(dataDir, 'keys');
    keyManager = await KeyManager.createKeyManager({
      password,
      keysPath,
      logger,
      privateKeyPemOverride: globalRootKeyPems[0],
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
      keyManager,
      nodeConnectionManager: {} as NodeConnectionManager,
      gestaltGraph: {} as GestaltGraph,
      notificationsManager: {} as NotificationsManager,
      logger,
    });
    const clientService = {
      vaultsCreate: vaultsCreate({
        authenticate,
        vaultManager,
        db,
        logger,
      }),
      vaultsDelete: vaultsDelete({
        authenticate,
        vaultManager,
        db,
        logger,
      }),
      vaultsList: vaultsList({
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
    await keyManager.stop();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });
  test('creates, lists, and deletes vaults', async () => {
    // Create vault
    const createRequest = new vaultsPB.Vault();
    createRequest.setNameOrId('test-vault');
    const createResponse = await grpcClient.vaultsCreate(
      createRequest,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(createResponse).toBeInstanceOf(vaultsPB.Vault);
    const vaultId = createResponse.getNameOrId();
    // List vault
    const emptyMessage = new utilsPB.EmptyMessage();
    const listResponse1 = grpcClient.vaultsList(
      emptyMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    const vaults1: Array<{ name: string; id: string }> = [];
    for await (const vault of listResponse1) {
      expect(vault).toBeInstanceOf(vaultsPB.List);
      vaults1.push({ name: vault.getVaultName(), id: vault.getVaultId() });
    }
    expect(vaults1).toHaveLength(1);
    expect(vaults1[0].name).toBe('test-vault');
    expect(vaults1[0].id).toBe(vaultId);
    // Delete vault
    const deleteRequest = createRequest;
    const deleteResponse = await grpcClient.vaultsDelete(
      deleteRequest,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(deleteResponse).toBeInstanceOf(utilsPB.StatusMessage);
    expect(deleteResponse.getSuccess()).toBeTruthy();
    // Check vault was deleted
    const listResponse2 = grpcClient.vaultsList(
      emptyMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    const vaults2: Array<{ name: string; id: string }> = [];
    for await (const vault of listResponse2) {
      expect(vault).toBeInstanceOf(vaultsPB.List);
      vaults2.push({ name: vault.getVaultName(), id: vault.getVaultId() });
    }
    expect(vaults2).toHaveLength(0);
  });
});
