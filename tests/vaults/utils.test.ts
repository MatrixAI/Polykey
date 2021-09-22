import type { VaultId } from '@/vaults/types';
import type { NodeId } from '@/nodes/types';

import fs from 'fs';
import os from 'os';
import path from 'path';
import { EncryptedFS } from 'encryptedfs';

import * as utils from '@/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as vaultsErrors from '@/vaults/errors';

describe('Vaults utils', () => {
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

  test('vaultIds can be split', async () => {
    const nodeId = 'alkjsddfjknacqqquiry32741834id';
    const id = vaultsUtils.generateVaultId(nodeId as NodeId);
    expect(id).toContain(nodeId);
    const vaultId = vaultsUtils.splitVaultId(id);
    expect(vaultId).not.toContain(nodeId);
  });
  test('EFS can be read recursively', async () => {
    const key = await vaultsUtils.generateVaultKey();
    const efs = await EncryptedFS.createEncryptedFS({
      dbKey: key,
      dbPath: dataDir,
    });
    const mkdir = utils.promisify(efs.mkdir).bind(efs);
    const writeFile = utils.promisify(efs.writeFile).bind(efs);
    await mkdir('dir', { recursive: true });
    await mkdir('dir/dir2/dir3', { recursive: true });
    await writeFile('dir/file', 'content');
    let files: string[] = [];
    for await (const file of vaultsUtils.readdirRecursivelyEFS(
      efs,
      '',
      false,
    )) {
      files.push(file);
    }
    expect(files.sort()).toStrictEqual(['dir/file'].sort());
    files = [];
    for await (const file of vaultsUtils.readdirRecursivelyEFS(efs, '', true)) {
      files.push(file);
    }
    expect(files.sort()).toStrictEqual(
      ['dir', 'dir/dir2', 'dir/dir2/dir3', 'dir/file'].sort(),
    );
  });
  // Test('a persisted EFS object can be read recursively', async () => {
  //   const key = await vaultsUtils.generateVaultKey();
  //   const efs = new EncryptedFS(key, fs, dataDir);
  //   const mkdir = utils.promisify(efs.mkdir).bind(efs);
  //   const writeFile = utils.promisify(efs.writeFile).bind(efs);
  //   await mkdir('dir', { recursive: true });
  //   await mkdir('dir/dir2/dir3', { recursive: true });
  //   await writeFile('dir/file', 'content');
  //   const efs2 = new EncryptedFS(key, fs, dataDir);
  //   let files: string[] = [];
  //   for await (const file of vaultsUtils.readdirRecursivelyEFS(
  //     efs2,
  //     '',
  //     false,
  //   )) {
  //     files.push(file);
  //   }
  //   expect(files.sort()).toStrictEqual(['dir/file'].sort());
  //   files = [];
  //   for await (const file of vaultsUtils.readdirRecursivelyEFS(
  //     efs2,
  //     '',
  //     true,
  //   )) {
  //     files.push(file);
  //   }
  //   expect(files.sort()).toStrictEqual(
  //     ['dir', 'dir/dir2', 'dir/dir2/dir3', 'dir/file'].sort(),
  //   );
  // });
  test('can search for a vault name', async () => {
    const vaultList = ['a\tb', 'b\ta', '', 'c\tc', 'e\tf'];
    expect(vaultsUtils.searchVaultName(vaultList, 'b' as VaultId)).toEqual('a');
    expect(vaultsUtils.searchVaultName(vaultList, 'a' as VaultId)).toEqual('b');
    expect(vaultsUtils.searchVaultName(vaultList, 'c' as VaultId)).toEqual('c');
    expect(vaultsUtils.searchVaultName(vaultList, 'f' as VaultId)).toEqual('e');
    expect(() =>
      vaultsUtils.searchVaultName(vaultList, 'd' as VaultId),
    ).toThrow(vaultsErrors.ErrorRemoteVaultUndefined);
  });
});

// Test('vaultIds are alphanumeric', async () => {
//   const id1 = utils.generateVaultId('abc');
//
//   expect(isAlphaNumeric(id1)).toBe(true);
// });
//
// function isAlphaNumeric(str) {
//   let code, i, len;
//
//   for (i = 0, len = str.length; i < len; i++) {
//     code = str.charCodeAt(i);
//     if (
//       !(code > 47 && code < 58) && // numeric (0-9)
//       !(code > 64 && code < 91) && // upper alpha (A-Z)
//       !(code > 96 && code < 123)
//     ) {
//       // lower alpha (a-z)
//       return false;
//     }
//   }
//   return true;
// }
