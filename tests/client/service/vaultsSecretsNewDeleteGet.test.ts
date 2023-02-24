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
import vaultsSecretsNew from '@/client/service/vaultsSecretsNew';
import vaultsSecretsDelete from '@/client/service/vaultsSecretsDelete';
import vaultsSecretsGet from '@/client/service/vaultsSecretsGet';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as secretsPB from '@/proto/js/polykey/v1/secrets/secrets_pb';
import * as clientUtils from '@/client/utils/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as vaultsErrors from '@/vaults/errors';
import * as keysUtils from '@/keys/utils/index';
import * as testUtils from '../../utils';

describe('vaultsSecretsNewDeleteGet', () => {
  const logger = new Logger('vaultsSecretsNewDeleteGet test', LogLevel.WARN, [
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
      vaultsSecretsNew: vaultsSecretsNew({
        authenticate,
        vaultManager,
        db,
        logger,
      }),
      vaultsSecretsDelete: vaultsSecretsDelete({
        authenticate,
        vaultManager,
        db,
        logger,
      }),
      vaultsSecretsGet: vaultsSecretsGet({
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
  test('creates, gets, and deletes secrets', async () => {
    // Create secret
    const secret = 'test-secret';
    const vaultId = await vaultManager.createVault('test-vault');
    const secretMessage = new secretsPB.Secret();
    const vaultMessage = new vaultsPB.Vault();
    vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
    secretMessage.setVault(vaultMessage);
    secretMessage.setSecretName(secret);
    secretMessage.setSecretContent(Buffer.from(secret));
    const createResponse = await grpcClient.vaultsSecretsNew(
      secretMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(createResponse).toBeInstanceOf(utilsPB.StatusMessage);
    expect(createResponse.getSuccess()).toBeTruthy();
    // Get secret
    const getResponse1 = await grpcClient.vaultsSecretsGet(
      secretMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(getResponse1).toBeInstanceOf(secretsPB.Secret);
    const secretContent = Buffer.from(
      getResponse1.getSecretContent(),
    ).toString();
    expect(secretContent).toStrictEqual(secret);
    // Delete secret
    const deleteResponse = await grpcClient.vaultsSecretsDelete(
      secretMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(deleteResponse).toBeInstanceOf(utilsPB.StatusMessage);
    expect(deleteResponse.getSuccess()).toBeTruthy();
    // Check secret was deleted
    await testUtils.expectRemoteErrorOLD(
      grpcClient.vaultsSecretsGet(
        secretMessage,
        clientUtils.encodeAuthFromPassword(password),
      ),
      vaultsErrors.ErrorSecretsSecretUndefined,
    );
  });
});
