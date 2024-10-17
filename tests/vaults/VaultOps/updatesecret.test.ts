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

describe('updateSecret', () => {
  const logger = new Logger('VaultOps', LogLevel.WARN, [new StreamHandler()]);

  const secretName = 'secret';
  const secretNameHidden = '.secret';
  const secretContent = 'secret-content';
  const secretContentNew = 'secret-content-new';
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

  test('updating secret content', async () => {
    await testVaultsUtils.writeSecret(vault, secretName, secretContent);
    await vaultOps.updateSecret(vault, secretName, secretContentNew);
    await testVaultsUtils.expectSecret(vault, secretName, secretContentNew);
  });
  test('updating secret content within a directory', async () => {
    const secretPath = path.join(dirName, secretName);
    await testVaultsUtils.writeSecret(vault, secretPath, secretContent);
    await vaultOps.updateSecret(vault, secretPath, secretContentNew);
    await testVaultsUtils.expectSecret(vault, secretPath, secretContentNew);
  });
  test(
    'updating a secret multiple times',
    async () => {
      await vaultOps.addSecret(vault, 'secret-1', 'secret-content');
      await testVaultsUtils.writeSecret(vault, secretName, secretContent);
      for (let i = 0; i < 5; i++) {
        const contentNew = `${secretContentNew}${i}`;
        await vaultOps.updateSecret(vault, secretName, contentNew);
        await testVaultsUtils.expectSecret(vault, secretName, contentNew);
      }
    },
    globalThis.defaultTimeout * 2,
  );
  test('updating a secret that does not exist should fail', async () => {
    await expect(
      vaultOps.updateSecret(vault, secretName, secretContentNew),
    ).rejects.toThrow(vaultsErrors.ErrorSecretsSecretUndefined);
  });
  test('updating hidden secret content', async () => {
    await testVaultsUtils.writeSecret(vault, secretNameHidden, secretContent);
    await vaultOps.updateSecret(vault, secretNameHidden, secretContentNew);
    await testVaultsUtils.expectSecret(
      vault,
      secretNameHidden,
      secretContentNew,
    );
  });
  test('updating hidden secret content within a hidden directory', async () => {
    const secretPathHidden = path.join(dirNameHidden, secretNameHidden);
    await testVaultsUtils.writeSecret(vault, secretPathHidden, secretContent);
    await vaultOps.updateSecret(vault, secretPathHidden, secretContentNew);
    await testVaultsUtils.expectSecret(
      vault,
      secretPathHidden,
      secretContentNew,
    );
  });
});
