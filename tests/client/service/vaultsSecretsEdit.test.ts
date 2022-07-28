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
import vaultsSecretsEdit from '@/client/service/vaultsSecretsEdit';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as secretsPB from '@/proto/js/polykey/v1/secrets/secrets_pb';
import * as clientUtils from '@/client/utils/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as testUtils from '../../utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';

describe('vaultsSecretsEdit', () => {
  const logger = new Logger('vaultsSecretsEdit test', LogLevel.WARN, [
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
      // @ts-ignore - version of js-logger is incompatible (remove when EFS logger updates to 3.*)
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
      vaultsSecretsEdit: vaultsSecretsEdit({
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
  test('edits secrets', async () => {
    const vaultName = 'test-vault';
    const secretName = 'test-secret';
    const vaultId = await vaultManager.createVault(vaultName);
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretName, secretName);
      });
    });
    const secretMessage = new secretsPB.Secret();
    const vaultMessage = new vaultsPB.Vault();
    vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
    secretMessage.setVault(vaultMessage);
    secretMessage.setSecretName(secretName);
    secretMessage.setSecretContent(Buffer.from('content-change'));
    const response = await grpcClient.vaultsSecretsEdit(
      secretMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(response).toBeInstanceOf(utilsPB.StatusMessage);
    expect(response.getSuccess()).toBeTruthy();
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect((await efs.readFile(secretName)).toString()).toStrictEqual(
          'content-change',
        );
      });
    });
  });
});
