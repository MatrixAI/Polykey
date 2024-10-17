import type { VaultId } from '@/vaults/types';
import type { Vault } from '@/vaults/Vault';
import type KeyRing from '@/keys/KeyRing';
import type { LevelPath } from '@matrixai/db';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EncryptedFS } from 'encryptedfs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import VaultInternal from '@/vaults/VaultInternal';
import * as vaultOps from '@/vaults/VaultOps';
import * as vaultsUtils from '@/vaults/utils';
import * as keysUtils from '@/keys/utils';
import * as testNodesUtils from '../../nodes/utils';

describe('writeSecret', () => {
  const logger = new Logger('VaultOps', LogLevel.WARN, [new StreamHandler()]);

  let dataDir: string;
  let baseEfs: EncryptedFS;
  let vaultId: VaultId;
  let vaultInternal: VaultInternal;
  let vault: Vault;
  let db: DB;
  let vaultsDbPath: LevelPath;
  const vaultIdGenerator = vaultsUtils.createVaultIdGenerator();
  const dummyKeyRing = {
    getNodeId: () => {
      return testNodesUtils.generateRandomNodeId();
    },
  } as KeyRing;
  const secretName = 'secret';
  const secretNameHidden = '.secret';
  const secretContent = 'secret-content';
  const newSecretContent = 'updated-secret-content';

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbPath = path.join(dataDir, 'efsDb');
    const dbKey = keysUtils.generateKey();
    baseEfs = await EncryptedFS.createEncryptedFS({
      dbKey,
      dbPath,
      logger,
    });
    await baseEfs.start();

    vaultId = vaultIdGenerator();
    await baseEfs.mkdir(
      path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
      {
        recursive: true,
      },
    );
    db = await DB.createDB({
      dbPath: path.join(dataDir, 'db'),
      logger,
    });
    vaultsDbPath = ['vaults'];
    vaultInternal = await VaultInternal.createVaultInternal({
      keyRing: dummyKeyRing,
      vaultId,
      efs: baseEfs,
      logger: logger.getChild(VaultInternal.name),
      fresh: true,
      db,
      vaultsDbPath: vaultsDbPath,
      vaultName: 'VaultName',
    });
    vault = vaultInternal as Vault;
  });
  afterEach(async () => {
    await vaultInternal.stop();
    await vaultInternal.destroy();
    await db.stop();
    await db.destroy();
    await baseEfs.stop();
    await baseEfs.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('updates existing secret', async () => {
    await vaultOps.addSecret(vault, secretName, secretContent);
    await vaultOps.writeSecret(vault, secretName, newSecretContent);
    const result = await vaultOps.getSecret(vault, secretName);
    expect(result.toString()).toStrictEqual(newSecretContent);
  });
  test('creates new secret if it does not exist', async () => {
    await vaultOps.writeSecret(vault, secretName, newSecretContent);
    const result = await vaultOps.getSecret(vault, secretName);
    expect(result.toString()).toStrictEqual(newSecretContent);
  });
  test('updates existing hidden secret', async () => {
    await vaultOps.addSecret(vault, secretNameHidden, secretContent);
    await vaultOps.writeSecret(vault, secretNameHidden, newSecretContent);
    const result = await vaultOps.getSecret(vault, secretNameHidden);
    expect(result.toString()).toStrictEqual(newSecretContent);
  });
});
