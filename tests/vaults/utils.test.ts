import type { VaultId } from '@/vaults/types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EncryptedFS } from 'encryptedfs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { IdRandom } from '@matrixai/id';
import * as vaultsUtils from '@/vaults/utils';
import * as keysUtils from '@/keys/utils';

describe('Vaults utils', () => {
  const logger = new Logger('Vaults utils tests', LogLevel.WARN, [
    new StreamHandler(),
  ]);
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
  });
  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('EFS can be read recursively', async () => {
    const key = keysUtils.generateKey();
    const efs = await EncryptedFS.createEncryptedFS({
      dbKey: key,
      dbPath: dataDir,
      logger,
    });
    await efs.promises.mkdir(path.join('dir', 'dir2', 'dir3'), {
      recursive: true,
    });
    const filePath1 = path.join('dir', 'file');
    await efs.promises.writeFile(filePath1, 'content');
    let files: string[] = [];
    for await (const file of vaultsUtils.readDirRecursively(efs, './')) {
      files.push(file);
    }
    expect(files).toStrictEqual([filePath1]);
    files = [];
    const filePath2 = path.join('dir', 'dir2', 'dir3', 'file');
    await efs.promises.writeFile(filePath2, 'content');
    for await (const file of vaultsUtils.readDirRecursively(efs)) {
      files.push(file);
    }
    expect(files.sort()).toStrictEqual([filePath1, filePath2].sort());
  });
  test('fs can be read recursively', async () => {
    await fs.promises.mkdir(path.join(dataDir, 'dir'), { recursive: true });
    await fs.promises.mkdir(path.join(dataDir, 'dir', 'dir2', 'dir3'), {
      recursive: true,
    });
    const filePath1 = path.join(dataDir, 'dir', 'file');
    await fs.promises.writeFile(filePath1, 'content');
    let files: string[] = [];
    for await (const file of vaultsUtils.readDirRecursively(fs, dataDir)) {
      files.push(file);
    }
    expect(files).toStrictEqual([filePath1]);
    files = [];
    const filePath2 = path.join(dataDir, 'dir', 'dir2', 'dir3', 'file');
    await fs.promises.writeFile(filePath2, 'content');
    for await (const file of vaultsUtils.readDirRecursively(fs, dataDir)) {
      files.push(file);
    }
    expect(files.sort()).toStrictEqual([filePath1, filePath2].sort());
  });
  test('decodeNodeId does not throw an error', async () => {
    const randomIdGen = new IdRandom<VaultId>();
    const vaultId = randomIdGen.get();
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);

    expect(vaultsUtils.decodeVaultId(vaultIdEncoded)).toBeDefined();
    expect(vaultsUtils.decodeVaultId('invalidVaultIdEncoded')).toBeUndefined();
    expect(
      vaultsUtils.decodeVaultId('zF4VfF3uRhSqgxTOOLONGxTRdVKauV9'),
    ).toBeUndefined();
    expect(vaultsUtils.decodeVaultId('zF4VfxTOOSHORTxTV9')).toBeUndefined();
  });
});
