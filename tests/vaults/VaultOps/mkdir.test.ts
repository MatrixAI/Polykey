import type { VaultId } from '@/vaults/types';
import type { Vault } from '@/vaults/Vault';
import type KeyRing from '@/keys/KeyRing';
import type { LevelPath } from '@matrixai/db';
import type { ErrorMessage } from '@/client/types';
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

describe('mkdir', () => {
  const logger = new Logger('VaultOps', LogLevel.WARN, [new StreamHandler()]);

  const secretName = 'secret';
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

  test('can create directory', async () => {
    const response = await vaultOps.mkdir(vault, dirName);
    expect(response.type).toEqual('success');
    await testVaultsUtils.expectDirExists(vault, dirName);
  });
  test('can create recursive directory', async () => {
    const dirPath = path.join(dirName, dirName);
    const response = await vaultOps.mkdir(vault, dirPath, {
      recursive: true,
    });
    expect(response.type).toEqual('success');
    await testVaultsUtils.expectDirExists(vault, dirPath);
  });
  test('creating directories fails without recursive', async () => {
    const dirPath = path.join(dirName, dirName);
    const response = await vaultOps.mkdir(vault, dirPath);
    expect(response.type).toEqual('error');
    const error = response as ErrorMessage;
    expect(error.code).toEqual('ENOENT');
    await testVaultsUtils.expectDirExistsNot(vault, dirPath);
  });
  test('creating existing directory should fail', async () => {
    await testVaultsUtils.mkdir(vault, dirName);
    const response = await vaultOps.mkdir(vault, dirName);
    expect(response.type).toEqual('error');
    const error = response as ErrorMessage;
    expect(error.code).toEqual('EEXIST');
  });
  test('creating existing secret should fail', async () => {
    await testVaultsUtils.writeSecret(vault, secretName, secretContent);
    const response = await vaultOps.mkdir(vault, secretName);
    expect(response.type).toEqual('error');
    const error = response as ErrorMessage;
    expect(error.code).toEqual('EEXIST');
    await testVaultsUtils.expectSecret(vault, secretName, secretContent);
  });
  test('can create a hidden directory', async () => {
    await vaultOps.mkdir(vault, dirNameHidden, { recursive: true });
    const list = await vaultOps.listSecrets(vault);
    expect(list).toContain(dirNameHidden);
  });
});
