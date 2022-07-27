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
import vaultsSecretsNewDir from '@/client/service/vaultsSecretsNewDir';
import vaultsSecretsList from '@/client/service/vaultsSecretsList';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as utilsPB from '@/proto/js/polykey/v1/utils/utils_pb';
import * as secretsPB from '@/proto/js/polykey/v1/secrets/secrets_pb';
import * as clientUtils from '@/client/utils/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as testUtils from '../../utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';

describe('vaultsSecretsNewDirList', () => {
  const logger = new Logger('vaultsSecretsNewDirList test', LogLevel.WARN, [
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
      vaultsSecretsNewDir: vaultsSecretsNewDir({
        authenticate,
        vaultManager,
        fs,
        db,
        logger,
      }),
      vaultsSecretsList: vaultsSecretsList({
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
  test('adds and lists a directory of secrets', async () => {
    // Add directory of secrets
    const vaultName = 'test-vault';
    const secretList = ['test-secret1', 'test-secret2', 'test-secret3'];
    const secretDir = path.join(dataDir, 'secretDir');
    await fs.promises.mkdir(secretDir);
    for (const secret of secretList) {
      const secretFile = path.join(secretDir, secret);
      // Write secret to file
      await fs.promises.writeFile(secretFile, secret);
    }
    const vaultId = await vaultManager.createVault(vaultName);
    const secretDirectoryMessage = new secretsPB.Directory();
    const vaultMessage = new vaultsPB.Vault();
    vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
    secretDirectoryMessage.setVault(vaultMessage);
    secretDirectoryMessage.setSecretDirectory(secretDir);
    const addResponse = await grpcClient.vaultsSecretsNewDir(
      secretDirectoryMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(addResponse).toBeInstanceOf(utilsPB.StatusMessage);
    expect(addResponse.getSuccess()).toBeTruthy();
    // List secrets
    const listResponse = grpcClient.vaultsSecretsList(
      vaultMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    const secrets: Array<string> = [];
    for await (const secret of listResponse) {
      expect(secret).toBeInstanceOf(secretsPB.Secret);
      secrets.push(secret.getSecretName());
    }
    expect(secrets.sort()).toStrictEqual(
      secretList.map((secret) => path.join('secretDir', secret)).sort(),
    );
  });
});
