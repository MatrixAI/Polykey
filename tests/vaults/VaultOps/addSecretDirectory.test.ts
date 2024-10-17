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

describe('addSecretDirectory', () => {
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

  test('adding a directory of 1 secret', async () => {
    const secretDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    const secretDirName = path.basename(secretDir);
    const name = 'secret';
    const content = keysUtils.getRandomBytes(5);
    await fs.promises.writeFile(path.join(secretDir, name), content);

    await vaultOps.addSecretDirectory(vault, secretDir, fs);
    await expect(
      vault.readF((efs) => efs.readdir(secretDirName)),
    ).resolves.toContain('secret');

    await fs.promises.rm(secretDir, {
      force: true,
      recursive: true,
    });
  });
  test('adding a directory with subdirectories and files', async () => {
    const secretDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    const secretDirName = path.basename(secretDir);
    await fs.promises.mkdir(path.join(secretDir, 'dir1'));
    await fs.promises.mkdir(path.join(secretDir, 'dir1', 'dir2'));
    await fs.promises.mkdir(path.join(secretDir, 'dir3'));

    await fs.promises.writeFile(path.join(secretDir, 'secret1'), 'secret1');
    await fs.promises.writeFile(
      path.join(secretDir, 'dir1', 'secret2'),
      'secret2',
    );
    await fs.promises.writeFile(
      path.join(secretDir, 'dir1', 'dir2', 'secret3'),
      'secret3',
    );
    await fs.promises.writeFile(
      path.join(secretDir, 'dir3', 'secret4'),
      'secret4',
    );
    await fs.promises.writeFile(
      path.join(secretDir, 'dir3', 'secret5'),
      'secret5',
    );

    await vaultOps.addSecretDirectory(vault, path.join(secretDir), fs);
    const list = await vaultOps.listSecrets(vault);
    expect(list.sort()).toStrictEqual(
      [
        path.join(secretDirName, 'secret1'),
        path.join(secretDirName, 'dir1', 'secret2'),
        path.join(secretDirName, 'dir1', 'dir2', 'secret3'),
        path.join(secretDirName, 'dir3', 'secret4'),
        path.join(secretDirName, 'dir3', 'secret5'),
      ].sort(),
    );

    await fs.promises.rm(secretDir, {
      force: true,
      recursive: true,
    });
  });
  test('testing the errors handling of adding secret directories', async () => {
    const secretDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    const secretDirName = path.basename(secretDir);
    await fs.promises.mkdir(path.join(secretDir, 'dir1'));
    await fs.promises.mkdir(path.join(secretDir, 'dir1', 'dir2'));
    await fs.promises.mkdir(path.join(secretDir, 'dir3'));
    await fs.promises.writeFile(path.join(secretDir, 'secret1'), 'secret1');
    await fs.promises.writeFile(
      path.join(secretDir, 'dir1', 'secret2'),
      'secret2',
    );
    await fs.promises.writeFile(
      path.join(secretDir, 'dir1', 'dir2', 'secret3'),
      'secret3',
    );
    await fs.promises.writeFile(
      path.join(secretDir, 'dir3', 'secret4'),
      'secret4',
    );
    await fs.promises.writeFile(
      path.join(secretDir, 'dir3', 'secret5'),
      'secret5',
    );

    await vaultOps.mkdir(vault, secretDirName, { recursive: true });
    await vaultOps.addSecret(
      vault,
      path.join(secretDirName, 'secret1'),
      'blocking-secret',
    );
    await vaultOps.addSecretDirectory(vault, secretDir, fs);
    const list = await vaultOps.listSecrets(vault);
    expect(list.sort()).toStrictEqual(
      [
        path.join(secretDirName, 'secret1'),
        path.join(secretDirName, 'dir1', 'secret2'),
        path.join(secretDirName, 'dir1', 'dir2', 'secret3'),
        path.join(secretDirName, 'dir3', 'secret4'),
        path.join(secretDirName, 'dir3', 'secret5'),
      ].sort(),
    );

    await fs.promises.rm(secretDir, {
      force: true,
      recursive: true,
    });
  });
});
