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
import * as vaultsErrors from '@/vaults/errors';
import * as vaultsUtils from '@/vaults/utils';
import * as keysUtils from '@/keys/utils';
import * as testNodesUtils from '../../nodes/utils';
import * as testVaultsUtils from '../utils';

describe('renameSecret', () => {
  const logger = new Logger('VaultOps', LogLevel.WARN, [new StreamHandler()]);

  const secretName = 'secret';
  const secretNameHidden = '.secret';
  const secretNameNew = 'secret-new';
  const secretContent = 'secret-content';
  const dirName = 'dir';
  const dirNameHidden = '.dir';

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

  test('renaming a secret', async () => {
    await testVaultsUtils.writeSecret(vault, secretName, secretContent);
    await vaultOps.renameSecret(vault, secretName, secretNameNew);
    await testVaultsUtils.expectSecretNot(vault, secretName);
    await testVaultsUtils.expectSecret(vault, secretNameNew, secretContent);
  });
  test('renaming a secret within a directory', async () => {
    const secretPath = path.join(dirName, secretName);
    const secretPathNew = path.join(dirName, secretNameNew);
    await testVaultsUtils.writeSecret(vault, secretPath, secretContent);
    await vaultOps.renameSecret(vault, secretPath, secretPathNew);
    await testVaultsUtils.expectSecretNot(vault, secretPath);
    await testVaultsUtils.expectSecret(vault, secretPathNew, secretContent);
  });
  test('renaming a secret that does not exist should fail', async () => {
    await expect(
      vaultOps.renameSecret(vault, secretName, secretNameNew),
    ).rejects.toThrow(vaultsErrors.ErrorSecretsSecretUndefined);
  });
  test('renaming a hidden secret', async () => {
    await testVaultsUtils.writeSecret(vault, secretNameHidden, secretContent);
    await vaultOps.renameSecret(vault, secretNameHidden, secretNameNew);
    await testVaultsUtils.expectSecretNot(vault, secretNameHidden);
    await testVaultsUtils.expectSecret(vault, secretNameNew, secretContent);
  });
  test('renaming a hidden secret within a hidden directory', async () => {
    const secretPathHidden = path.join(dirNameHidden, secretNameHidden);
    const secretPathNew = path.join(dirNameHidden, secretNameNew);
    await testVaultsUtils.writeSecret(vault, secretPathHidden, secretContent);
    await vaultOps.renameSecret(vault, secretPathHidden, secretPathNew);
    await testVaultsUtils.expectSecretNot(vault, secretPathHidden);
    await testVaultsUtils.expectSecret(vault, secretPathNew, secretContent);
  });
});
