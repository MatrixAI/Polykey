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

describe('addSecret', () => {
  const logger = new Logger('VaultOps', LogLevel.WARN, [new StreamHandler()]);

  const secretName = 'secret';
  const secretNameHidden = '.secret';
  const secretContent = 'secret-content';
  const dirName = 'dir';

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

  test('adding a secret', async () => {
    await vaultOps.addSecret(vault, secretName, secretContent);
    await testVaultsUtils.expectSecret(vault, secretName, secretContent);
  });
  test('add a secret under an existing directory', async () => {
    await testVaultsUtils.mkdir(vault, dirName);
    const secretPath = path.join(dirName, secretName);
    await vaultOps.addSecret(vault, secretPath, secretContent);
    await testVaultsUtils.expectSecret(vault, secretPath, secretContent);
  });
  test('add a secret creating directory', async () => {
    const secretPath = path.join(dirName, secretName);
    await vaultOps.addSecret(vault, secretPath, secretContent);
    await testVaultsUtils.expectSecret(vault, secretPath, secretContent);
  });
  test(
    'adding a secret multiple times',
    async () => {
      for (let i = 0; i < 5; i++) {
        const name = `${secretName}+${i}`;
        await vaultOps.addSecret(vault, name, secretContent);
        await testVaultsUtils.expectSecret(vault, name, secretContent);
      }
    },
    globalThis.defaultTimeout * 4,
  );
  test('adding a secret that already exists should fail', async () => {
    await vaultOps.addSecret(vault, secretName, secretContent);
    const addSecretP = vaultOps.addSecret(vault, secretName, secretContent);
    await expect(addSecretP).rejects.toThrow(
      vaultsErrors.ErrorSecretsSecretDefined,
    );
  });
  test('adding a hidden secret', async () => {
    await vaultOps.addSecret(vault, secretNameHidden, secretContent);
    const list = await vaultOps.listSecrets(vault);
    expect(list).toContain(secretNameHidden);
  });
});
