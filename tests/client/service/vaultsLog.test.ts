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
import KeyManager from '@/keys/KeyManager';
import VaultManager from '@/vaults/VaultManager';
import GRPCServer from '@/grpc/GRPCServer';
import GRPCClientClient from '@/client/GRPCClientClient';
import vaultsLog from '@/client/service/vaultsLog';
import { ClientServiceService } from '@/proto/js/polykey/v1/client_service_grpc_pb';
import * as vaultsPB from '@/proto/js/polykey/v1/vaults/vaults_pb';
import * as clientUtils from '@/client/utils/utils';
import * as testUtils from '../../utils';
import { globalRootKeyPems } from '../../fixtures/globalRootKeyPems';

describe('vaultsLog', () => {
  const logger = new Logger('vaultsLog test', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  const password = 'helloworld';
  const authenticate = async (metaClient, metaServer = new Metadata()) =>
    metaServer;
  const vaultName = 'test-vault';
  const secret1 = { name: 'secret1', content: 'Secret-1-content' };
  const secret2 = { name: 'secret2', content: 'Secret-2-content' };
  let dataDir: string;
  let vaultId: VaultId;
  let commit1Oid: string;
  let commit2Oid: string;
  let commit3Oid: string;
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
    vaultId = await vaultManager.createVault(vaultName);
    await vaultManager.withVaults([vaultId], async (vault) => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
      });
      commit1Oid = (await vault.log(undefined, 0))[0].commitId;
      await vault.writeF(async (efs) => {
        await efs.writeFile(secret2.name, secret2.content);
      });
      commit2Oid = (await vault.log(undefined, 0))[0].commitId;
      await vault.writeF(async (efs) => {
        await efs.unlink(secret2.name);
      });
      commit3Oid = (await vault.log(undefined, 0))[0].commitId;
    });
    const clientService = {
      vaultsLog: vaultsLog({
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
  }, globalThis.defaultTimeout * 2);
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
  test('should get the full log', async () => {
    const vaultsLogMessage = new vaultsPB.Log();
    const vaultMessage = new vaultsPB.Vault();
    vaultMessage.setNameOrId(vaultName);
    vaultsLogMessage.setVault(vaultMessage);
    const logStream = grpcClient.vaultsLog(
      vaultsLogMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    const logMessages: vaultsPB.LogEntry[] = [];
    for await (const log of logStream) {
      expect(log).toBeInstanceOf(vaultsPB.LogEntry);
      logMessages.push(log);
    }
    // Checking commits exist in order.
    expect(logMessages[2].getOid()).toEqual(commit1Oid);
    expect(logMessages[1].getOid()).toEqual(commit2Oid);
    expect(logMessages[0].getOid()).toEqual(commit3Oid);
  });
  test('should get a part of the log', async () => {
    const vaultsLogMessage = new vaultsPB.Log();
    const vaultMessage = new vaultsPB.Vault();
    vaultMessage.setNameOrId(vaultName);
    vaultsLogMessage.setVault(vaultMessage);
    vaultsLogMessage.setLogDepth(2);
    const logStream = grpcClient.vaultsLog(
      vaultsLogMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    const logMessages: vaultsPB.LogEntry[] = [];
    for await (const log of logStream) {
      expect(log).toBeInstanceOf(vaultsPB.LogEntry);
      logMessages.push(log);
    }
    // Checking commits exist in order.
    expect(logMessages[1].getOid()).toEqual(commit2Oid);
    expect(logMessages[0].getOid()).toEqual(commit3Oid);
  });
  test('should get a specific commit', async () => {
    const vaultsLogMessage = new vaultsPB.Log();
    const vaultMessage = new vaultsPB.Vault();
    vaultMessage.setNameOrId(vaultName);
    vaultsLogMessage.setVault(vaultMessage);
    vaultsLogMessage.setCommitId(commit2Oid);
    const logStream = grpcClient.vaultsLog(
      vaultsLogMessage,
      clientUtils.encodeAuthFromPassword(password),
    );
    const logMessages: vaultsPB.LogEntry[] = [];
    for await (const log of logStream) {
      expect(log).toBeInstanceOf(vaultsPB.LogEntry);
      logMessages.push(log);
    }
    // Checking commits exist in order.
    expect(logMessages[0].getOid()).toEqual(commit2Oid);
  });
});
