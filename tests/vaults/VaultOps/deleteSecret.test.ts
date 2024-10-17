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

describe('deleteSecret', () => {
  const logger = new Logger('VaultOps', LogLevel.WARN, [new StreamHandler()]);

  const secretName = 'secret';
  const secretNameHidden = '.secret';
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

  test('deleting a secret', async () => {
    await testVaultsUtils.writeSecret(vault, secretName, secretContent);
    await vaultOps.deleteSecret(vault, [secretName]);
    await testVaultsUtils.expectSecretNot(vault, secretName);
  });
  test('deleting a secret in a directory', async () => {
    const secretPath = path.join(dirName, secretName);
    await testVaultsUtils.writeSecret(vault, secretPath, secretContent);
    await vaultOps.deleteSecret(vault, [secretPath]);
    await testVaultsUtils.expectSecretNot(vault, secretPath);
    await testVaultsUtils.expectDirExists(vault, dirName);
  });
  test('deleting a directory', async () => {
    await testVaultsUtils.mkdir(vault, dirName);
    await vaultOps.deleteSecret(vault, [dirName]);
    await testVaultsUtils.expectDirExistsNot(vault, dirName);
  });
  test('deleting a directory with a file should fail', async () => {
    const secretPath = path.join(dirName, secretName);
    await testVaultsUtils.writeSecret(vault, secretPath, secretContent);
    await expect(vaultOps.deleteSecret(vault, [dirName])).rejects.toThrow(
      vaultsErrors.ErrorVaultsRecursive,
    );
  });
  test('deleting a directory with force', async () => {
    const secretPath = path.join(dirName, secretName);
    await testVaultsUtils.writeSecret(vault, secretPath, secretContent);
    await vaultOps.deleteSecret(vault, [dirName], { recursive: true });
    await testVaultsUtils.expectDirExistsNot(vault, dirName);
  });
  test('deleting a secret that does not exist should fail', async () => {
    await expect(vaultOps.deleteSecret(vault, [secretName])).rejects.toThrow(
      vaultsErrors.ErrorSecretsSecretUndefined,
    );
  });
  test('deleting multiple secrets', async () => {
    const secretNames = ['secret1', 'secret2', 'secret3'];
    for (const secretName of secretNames) {
      await testVaultsUtils.writeSecret(vault, secretName, secretName);
    }
    await vaultOps.deleteSecret(vault, secretNames);
    for (const secretName of secretNames) {
      await testVaultsUtils.expectSecretNot(vault, secretName);
    }
  });
  test('deleting multiple secrets should add only one new log message', async () => {
    const secretNames = ['secret1', 'secret2', 'secret3'];
    for (const secretName of secretNames) {
      await testVaultsUtils.writeSecret(vault, secretName, secretName);
    }
    const logLength = (await vault.log()).length;
    await vaultOps.deleteSecret(vault, secretNames);
    for (const secretName of secretNames) {
      await testVaultsUtils.expectSecretNot(vault, secretName);
    }
    expect((await vault.log()).length).toBe(logLength + 1);
  });
  test('deleting a hidden secret', async () => {
    await testVaultsUtils.writeSecret(vault, secretNameHidden, secretContent);
    await vaultOps.deleteSecret(vault, [secretNameHidden]);
    await testVaultsUtils.expectSecretNot(vault, secretNameHidden);
  });
  test('deleting a hidden secret in a hidden directory', async () => {
    const secretPathHidden = path.join(dirNameHidden, secretNameHidden);
    await testVaultsUtils.writeSecret(vault, secretPathHidden, secretContent);
    await vaultOps.deleteSecret(vault, [secretPathHidden]);
    await testVaultsUtils.expectSecretNot(vault, secretPathHidden);
    await testVaultsUtils.expectDirExists(vault, dirNameHidden);
  });
  test('deleting a hidden directory', async () => {
    await testVaultsUtils.mkdir(vault, dirNameHidden);
    await vaultOps.deleteSecret(vault, [dirNameHidden]);
    await testVaultsUtils.expectDirExistsNot(vault, dirNameHidden);
  });
});
