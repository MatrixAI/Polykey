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

  test('VaultId type guard works', async () => {
    const vaultId = vaultsUtils.generateVaultId();
    expect(vaultsUtils.decodeVaultId(vaultId)).toBeTruthy();
  });
  test('EFS can be read recursively', async () => {
    const key = await keysUtils.generateKey(256);
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
    for await (const file of vaultsUtils.readdirRecursively(efs, './')) {
      files.push(file);
    }
    expect(files).toStrictEqual([filePath1]);
    files = [];
    const filePath2 = path.join('dir', 'dir2', 'dir3', 'file');
    await efs.promises.writeFile(filePath2, 'content');
    for await (const file of vaultsUtils.readdirRecursively(efs)) {
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
    for await (const file of vaultsUtils.readdirRecursively(fs, dataDir)) {
      files.push(file);
    }
    expect(files).toStrictEqual([filePath1]);
    files = [];
    const filePath2 = path.join(dataDir, 'dir', 'dir2', 'dir3', 'file');
    await fs.promises.writeFile(filePath2, 'content');
    for await (const file of vaultsUtils.readdirRecursively(fs, dataDir)) {
      files.push(file);
    }
    expect(files.sort()).toStrictEqual([filePath1, filePath2].sort());
  });
  test('makeVaultId converts a buffer', async () => {
    const randomIdGen = new IdRandom();
    Buffer.from(randomIdGen.get());
  });
});
