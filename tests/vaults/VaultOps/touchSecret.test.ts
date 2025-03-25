import type { VaultId } from '#vaults/types.js';
import type { Vault } from '#vaults/Vault.js';
import type KeyRing from '#keys/KeyRing.js';
import type { LevelPath } from '@matrixai/db';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EncryptedFS } from 'encryptedfs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import * as testNodesUtils from '../../nodes/utils.js';
import * as testVaultsUtils from '../utils.js';
import VaultInternal from '#vaults/VaultInternal.js';
import * as vaultOps from '#vaults/VaultOps.js';
import * as vaultsErrors from '#vaults/errors.js';
import * as vaultsUtils from '#vaults/utils.js';
import * as keysUtils from '#keys/utils/index.js';

describe('touchSecret', () => {
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
    baseEfs = await EncryptedFS.createEncryptedFS({ dbKey, dbPath, logger });
    await baseEfs.start();

    vaultId = vaultIdGenerator();
    await baseEfs.mkdir(
      path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
      { recursive: true },
    );
    db = await DB.createDB({
      dbPath: path.join(dataDir, 'db'),
      logger: logger,
    });
    vaultsDbPath = ['vaults'];
    vaultInternal = await VaultInternal.createVaultInternal({
      keyRing: dummyKeyRing,
      vaultId: vaultId,
      efs: baseEfs,
      logger: logger.getChild(VaultInternal.name),
      fresh: true,
      db: db,
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

  test('creating a secret', async () => {
    await vaultOps.touchSecret(vault, secretName);
    await testVaultsUtils.expectSecret(vault, secretName);
  });
  test('creating a secret in a directory', async () => {
    const secretPath = path.join(dirName, secretName);
    await testVaultsUtils.mkdir(vault, dirName);
    await vaultOps.touchSecret(vault, secretPath);
    await testVaultsUtils.expectDirExists(vault, dirName);
    await testVaultsUtils.expectSecret(vault, secretPath);
  });
  test('fails without parent directory', async () => {
    const secretPath = path.join(dirName, secretName);
    await expect(vaultOps.touchSecret(vault, secretPath)).rejects.toThrow(
      vaultsErrors.ErrorSecretsSecretUndefined,
    );
    await testVaultsUtils.expectDirExistsNot(vault, dirName);
    await testVaultsUtils.expectSecretNot(vault, secretPath);
  });
  test('touching an existing file should update its mtime', async () => {
    await testVaultsUtils.writeSecret(vault, secretName, secretContent);
    const oldMtime = (
      await vault.readF(async (efs) => await efs.stat(secretName))
    ).mtime;
    const startTime = new Date();
    await vaultOps.touchSecret(vault, secretName);
    const endTime = new Date();
    await vault.readF(async (efs) =>
      expect((await efs.readFile(secretName)).toString()).toEqual(
        secretContent,
      ),
    );
    const stat = await vault.readF(async (efs) => await efs.stat(secretName));
    expect(
      stat.mtime >= startTime &&
        stat.mtime <= endTime &&
        stat.mtime !== oldMtime,
    ).toBeTruthy();
  });
  test('touching a directory should update its mtime', async () => {
    await testVaultsUtils.mkdir(vault, dirName);
    const oldMtime = (await vault.readF(async (efs) => await efs.stat(dirName)))
      .mtime;
    const startTime = new Date();
    await vaultOps.touchSecret(vault, dirName);
    const endTime = new Date();
    const stat = await vault.readF(async (efs) => await efs.stat(dirName));
    expect(
      stat.mtime >= startTime &&
        stat.mtime <= endTime &&
        stat.mtime !== oldMtime,
    ).toBeTruthy();
  });
});
