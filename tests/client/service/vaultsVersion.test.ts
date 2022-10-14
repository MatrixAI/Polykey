import type { Host, Port } from '@/network/types';
import type { VaultId } from '@/vaults/types';
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
import vaultsVersion from '@/client/service/vaultsVersion';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as clientUtils from '@/client/utils/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as vaultsErrors from '@/vaults/errors';
import * as testUtils from '../../utils';
import * as keysUtils from '@/keys/utils/index';

describe('vaultsVersion', () => {
  const logger = new Logger('vaultsVersion test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const secretVer1 = {
    name: 'secret1v1',
    content: 'Secret-1-content-ver1',
  };
  const secretVer2 = {
    name: 'secret1v2',
    content: 'Secret-1-content-ver2',
  };
  const vaultName = 'test-vault';
  let vaultId: VaultId;
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
    vaultId = await vaultManager.createVault(vaultName);
    const clientService = {
      vaultsVersion: vaultsVersion({
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
  test('should switch a vault to a version', async () => {
    // Commit some history
    const ver1Oid = await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretVer1.name, secretVer1.content);
      });
      const ver1Oid = (await vault.log())[0].commitId;
      await vault.writeF(async (efs) => {
        await efs.writeFile(secretVer2.name, secretVer2.content);
      });
      return ver1Oid;
    });
    // Revert the version
    const vaultMessage = new vaultsPB.Vault();
    vaultMessage.setNameOrId(vaultName);
    const vaultVersionMessage = new vaultsPB.Version();
    vaultVersionMessage.setVault(vaultMessage);
    vaultVersionMessage.setVersionId(ver1Oid);
    const version = await grpcClient.vaultsVersion(
      vaultVersionMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    expect(version.getIsLatestVersion()).toBeFalsy();
    // Read old history
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.readF(async (efs) => {
        expect((await efs.readFile(secretVer1.name)).toString()).toStrictEqual(
          secretVer1.content,
        );
      });
    });
  });
  test('should fail to find a non existent version', async () => {
    // Revert the version
    const vaultMessage = new vaultsPB.Vault();
    vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultId));
    const vaultVersionMessage = new vaultsPB.Version();
    vaultVersionMessage.setVault(vaultMessage);
    vaultVersionMessage.setVersionId('invalidOid');
    const version = grpcClient.vaultsVersion(
      vaultVersionMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    await testUtils.expectRemoteError(
      version,
      vaultsErrors.ErrorVaultReferenceInvalid,
    );
    vaultVersionMessage.setVersionId(
      '7660aa9a2fee90e875c2d19e5deefe882ca1d4d9',
    );
    const version2 = grpcClient.vaultsVersion(
      vaultVersionMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    await testUtils.expectRemoteError(
      version2,
      vaultsErrors.ErrorVaultReferenceMissing,
    );
  });
});
