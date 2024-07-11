import type { FileTree, VaultId } from '@/vaults/types';
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

  describe('globWalk', () => {
    let cwd: string;

    const relativeBase = '.';
    const dir1: string = 'dir1';
    const dir2: string = 'dir2';
    const dir11: string = path.join(dir1, 'dir11');
    const dir12: string = path.join(dir1, 'dir12');
    const dir21: string = path.join(dir2, 'dir21');
    const dir22: string = path.join(dir2, 'dir22');
    const file0b: string = 'file0.b';
    const file1a: string = path.join(dir11, 'file1.a');
    const file2b: string = path.join(dir11, 'file2.b');
    const file3a: string = path.join(dir12, 'file3.a');
    const file4b: string = path.join(dir12, 'file4.b');
    const file5a: string = path.join(dir21, 'file5.a');
    const file6b: string = path.join(dir21, 'file6.b');
    const file7a: string = path.join(dir22, 'file7.a');
    const file8b: string = path.join(dir22, 'file8.b');
    const file9a: string = path.join(dir22, 'file9.a');

    beforeEach(async () => {
      await fs.promises.mkdir(path.join(dataDir, dir1));
      await fs.promises.mkdir(path.join(dataDir, dir11));
      await fs.promises.mkdir(path.join(dataDir, dir12));
      await fs.promises.mkdir(path.join(dataDir, dir2));
      await fs.promises.mkdir(path.join(dataDir, dir21));
      await fs.promises.mkdir(path.join(dataDir, dir22));
      await fs.promises.writeFile(path.join(dataDir, file0b), 'content-file0');
      await fs.promises.writeFile(path.join(dataDir, file1a), 'content-file1');
      await fs.promises.writeFile(path.join(dataDir, file2b), 'content-file2');
      await fs.promises.writeFile(path.join(dataDir, file3a), 'content-file3');
      await fs.promises.writeFile(path.join(dataDir, file4b), 'content-file4');
      await fs.promises.writeFile(path.join(dataDir, file5a), 'content-file5');
      await fs.promises.writeFile(path.join(dataDir, file6b), 'content-file6');
      await fs.promises.writeFile(path.join(dataDir, file7a), 'content-file7');
      await fs.promises.writeFile(path.join(dataDir, file8b), 'content-file8');
      await fs.promises.writeFile(path.join(dataDir, file9a), 'content-file9');
      cwd = process.cwd();
      process.chdir(dataDir);
    });
    afterEach(async () => {
      process.chdir(cwd);
    });

    test('Works with relative base path `.`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        yieldDirectories: true,
        yieldFiles: true,
        yieldParents: true,
        yieldRoot: true,
        yieldContents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path ?? '');
      expect(files).toContainAllValues([
        relativeBase,
        dir1,
        dir2,
        dir11,
        dir12,
        dir21,
        dir22,
        file0b,
        file1a,
        file2b,
        file3a,
        file4b,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
    });
    test('Works with relative base path `./`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: './',
        yieldDirectories: true,
        yieldFiles: true,
        yieldParents: true,
        yieldRoot: true,
        yieldContents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path ?? '');
      expect(files).toContainAllValues([
        './',
        dir1,
        dir2,
        dir11,
        dir12,
        dir21,
        dir22,
        file0b,
        file1a,
        file2b,
        file3a,
        file4b,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
    });
    test('Works with relative base path `./dir1`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: './dir1',
        yieldDirectories: true,
        yieldFiles: true,
        yieldParents: true,
        yieldRoot: true,
        yieldContents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path ?? '');
      expect(files).toContainAllValues([
        dir1,
        dir11,
        dir12,
        file1a,
        file2b,
        file3a,
        file4b,
      ]);
    });
    test('Works with absolute base path', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: dataDir,
        yieldDirectories: true,
        yieldFiles: true,
        yieldParents: true,
        yieldRoot: true,
        yieldContents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path ?? '');
      expect(files).toContainAllValues(
        [
          relativeBase,
          dir1,
          dir2,
          dir11,
          dir12,
          dir21,
          dir22,
          file0b,
          file1a,
          file2b,
          file3a,
          file4b,
          file5a,
          file6b,
          file7a,
          file8b,
          file9a,
        ].map((v) => path.join(dataDir, v)),
      );
    });
    test('Yields parent directories with `yieldParents`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        yieldParents: true,
        yieldFiles: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).toContainAllValues([
        relativeBase,
        dir2,
        dir1,
        dir11,
        dir12,
        dir21,
        dir22,
      ]);
    });
    test('Does not yield the base path with `yieldParents` and `yieldRoot`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        yieldRoot: false,
        yieldParents: true,
        yieldFiles: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toInclude(relativeBase);
      expect(files).toContainAllValues([
        dir2,
        dir1,
        dir11,
        dir12,
        dir21,
        dir22,
      ]);
    });
    test('Does not yield the base path with `yieldParents` and `yieldRoot` and absolute paths', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: dataDir,
        yieldRoot: false,
        yieldParents: true,
        yieldFiles: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toInclude(dataDir);
      expect(files).toContainAllValues(
        [dir2, dir1, dir11, dir12, dir21, dir22].map((v) =>
          path.join(dataDir, v),
        ),
      );
    });
    test('Yields file contents directories with `yieldContents`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        yieldFiles: false,
        yieldDirectories: false,
        yieldContents: true,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => (v.type === 'content' ? v.contents : ''));
      expect(files).toContainAllValues([
        'content-file0',
        'content-file9',
        'content-file1',
        'content-file2',
        'content-file3',
        'content-file4',
        'content-file5',
        'content-file6',
        'content-file7',
        'content-file8',
      ]);
    });
    test('Yields stats with `yieldStats`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        yieldStats: true,
        yieldFiles: true,
        yieldDirectories: true,
        yieldContents: false,
      })) {
        tree.push(treeNode);
      }
      tree.forEach((v) =>
        v.type === 'directory' || v.type === 'file'
          ? expect(v.stat).toBeDefined()
          : '',
      );
    });
    // Globbing examples
    test('glob with wildcard', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '*',
        yieldFiles: true,
        yieldDirectories: true,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).toContainAllValues([dir1, dir2, file0b]);
    });
    test('glob with wildcard ignores directories with `yieldDirectories: false`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '*',
        yieldFiles: true,
        yieldDirectories: false,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toContainAllValues([relativeBase, dir1, dir2]);
      expect(files).toContainAllValues([file0b]);
    });
    test('glob with wildcard ignores files with `yieldFiles: false`', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '*',
        yieldFiles: false,
        yieldDirectories: true,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toContainAllValues([file0b]);
      expect(files).toContainAllValues([dir1, dir2]);
    });
    test('glob with globstar', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '**',
        yieldFiles: true,
        yieldDirectories: true,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toInclude(relativeBase);
      expect(files).toContainAllValues([
        dir1,
        dir2,
        file0b,
        dir11,
        dir12,
        dir21,
        dir22,
        file1a,
        file2b,
        file3a,
        file4b,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
    });
    test('glob with globstar and directory pattern', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '**/dir2/**',
        yieldFiles: true,
        yieldDirectories: true,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toContainAllValues([
        relativeBase,
        dir1,
        dir2,
        file0b,
        dir11,
        dir12,
        file1a,
        file2b,
        file3a,
        file4b,
      ]);
      expect(files).toContainAllValues([
        dir21,
        dir22,
        file5a,
        file6b,
        file7a,
        file8b,
        file9a,
      ]);
    });
    test('glob with globstar and wildcard', async () => {
      const tree: FileTree = [];
      for await (const treeNode of vaultsUtils.globWalk({
        fs: fs,
        basePath: relativeBase,
        pattern: '**/*.a',
        yieldFiles: true,
        yieldDirectories: true,
        yieldParents: false,
      })) {
        tree.push(treeNode);
      }
      const files = tree.map((v) => v.path);
      expect(files).not.toContainAllValues([
        relativeBase,
        dir1,
        dir2,
        file0b,
        dir11,
        dir12,
        dir21,
        dir22,
        file2b,
        file4b,
        file6b,
        file8b,
      ]);
      expect(files).toContainAllValues([
        file1a,
        file3a,
        file5a,
        file7a,
        file9a,
      ]);
    });
  });
});
