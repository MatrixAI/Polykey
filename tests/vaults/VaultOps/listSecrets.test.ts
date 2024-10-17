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
import * as testVaultsUtils from '../utils';

describe('listSecrets', () => {
  const logger = new Logger('VaultOps', LogLevel.WARN, [new StreamHandler()]);

  const secretName = 'secret';
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

  test('can list secrets', async () => {
    const secretName1 = `${secretName}1`;
    const secretName2 = `${secretName}2`;
    await testVaultsUtils.writeSecret(vault, secretName1, secretContent);
    await testVaultsUtils.writeSecret(vault, secretName2, secretContent);

    const secretList = await vaultOps.listSecrets(vault);
    expect(secretList).toInclude(secretName1);
    expect(secretList).toInclude(secretName2);
  });
  test('empty directories are not listed', async () => {
    const dirName1 = `${dirName}1`;
    const dirName2 = `${dirName}2`;
    await testVaultsUtils.mkdir(vault, dirName1);
    await testVaultsUtils.mkdir(vault, dirName2);

    const secretList = await vaultOps.listSecrets(vault);
    expect(secretList).toHaveLength(0);
  });
  test('secrets in directories are listed', async () => {
    const secretPath1 = path.join(dirName, `${secretName}1`);
    const secretPath2 = path.join(dirName, `${secretName}2`);
    await testVaultsUtils.writeSecret(vault, secretPath1, secretContent);
    await testVaultsUtils.writeSecret(vault, secretPath2, secretContent);

    const secretList = await vaultOps.listSecrets(vault);
    expect(secretList).toInclude(secretPath1);
    expect(secretList).toInclude(secretPath2);
  });
  test('empty vault list no secrets', async () => {
    const secretList = await vaultOps.listSecrets(vault);
    expect(secretList).toHaveLength(0);
  });
});
