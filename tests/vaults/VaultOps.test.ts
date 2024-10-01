import type { VaultId } from '@/vaults/types';
import type { Vault } from '@/vaults/Vault';
import type KeyRing from '@/keys/KeyRing';
import type { LevelPath } from '@matrixai/db';
import type { FileTree } from '@/vaults/types';
import type { ContentNode, TreeNode } from '@/vaults/types';
import type { ErrorMessage } from '@/client/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EncryptedFS, Stat } from 'encryptedfs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import VaultInternal from '@/vaults/VaultInternal';
import * as fileTree from '@/vaults/fileTree';
import * as vaultOps from '@/vaults/VaultOps';
import * as vaultsErrors from '@/vaults/errors';
import * as vaultsUtils from '@/vaults/utils';
import * as keysUtils from '@/keys/utils';
import * as testNodesUtils from '../nodes/utils';

describe('VaultOps', () => {
  const logger = new Logger('VaultOps', LogLevel.WARN, [new StreamHandler()]);

  const secretName = 'secret';
  const secretNameNew = 'secret-new';
  const secretContent = 'secret-content';
  const secretContentNew = 'secret-content-new';
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

  async function writeSecret(secretPath: string, contents: string) {
    return await vault.writeF(async (efs) => {
      await vaultsUtils.mkdirExists(efs, path.dirname(secretPath));
      await efs.writeFile(secretPath, contents);
    });
  }

  async function readSecret(path: string) {
    return await vault.readF(async (efs) => {
      return await efs.readFile(path);
    });
  }

  async function expectSecret(path: string, contentsExpected: string) {
    const contentsSecretP = readSecret(path);
    await expect(contentsSecretP).resolves.toBeDefined();
    const contentsSecretValue = (await contentsSecretP).toString();
    expect(contentsSecretValue).toBe(contentsExpected);
  }

  async function expectSecretNot(path: string) {
    const contentsSecretP = readSecret(path);
    await expect(contentsSecretP).rejects.toThrow(
      'ENOENT: no such file or directory',
    );
  }

  async function mkdir(path: string) {
    return await vault.writeF(async (efs) => {
      await vaultsUtils.mkdirExists(efs, path);
    });
  }

  async function expectDirExists(path: string) {
    return await vault.readF(async (efs) => {
      const dirP = efs.readdir(path);
      await expect(dirP).resolves.toBeDefined();
    });
  }

  async function expectDirExistsNot(path: string) {
    return await vault.readF(async (efs) => {
      const dirP = efs.readdir(path);
      await expect(dirP).rejects.toThrow('ENOENT');
    });
  }

  // Adding secrets
  describe('addSecret', () => {
    test('adding a secret', async () => {
      await vaultOps.addSecret(vault, secretName, secretContent);
      await expectSecret(secretName, secretContent);
    });
    test('add a secret under an existing directory', async () => {
      await mkdir(dirName);
      const secretPath = path.join(dirName, secretName);
      await vaultOps.addSecret(vault, secretPath, secretContent);
      await expectSecret(secretPath, secretContent);
    });
    test('add a secret creating directory', async () => {
      const secretPath = path.join(dirName, secretName);
      await vaultOps.addSecret(vault, secretPath, secretContent);
      await expectSecret(secretPath, secretContent);
    });
    test(
      'adding a secret multiple times',
      async () => {
        for (let i = 0; i < 5; i++) {
          const name = `${secretName}+${i}`;
          await vaultOps.addSecret(vault, name, secretContent);
          await expectSecret(name, secretContent);
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
  });
  describe('updateSecret', () => {
    test('updating secret content', async () => {
      await writeSecret(secretName, secretContent);
      await vaultOps.updateSecret(vault, secretName, secretContentNew);
      await expectSecret(secretName, secretContentNew);
    });
    test('updating secret content within a directory', async () => {
      const secretPath = path.join(dirName, secretName);
      await writeSecret(secretPath, secretContent);
      await vaultOps.updateSecret(vault, secretPath, secretContentNew);
      await expectSecret(secretPath, secretContentNew);
    });
    test(
      'updating a secret multiple times',
      async () => {
        await vaultOps.addSecret(vault, 'secret-1', 'secret-content');
        await writeSecret(secretName, secretContent);
        for (let i = 0; i < 5; i++) {
          const contentNew = `${secretContentNew}${i}`;
          await vaultOps.updateSecret(vault, secretName, contentNew);
          await expectSecret(secretName, contentNew);
        }
      },
      globalThis.defaultTimeout * 2,
    );
    test('updating a secret that does not exist should fail', async () => {
      await expect(
        vaultOps.updateSecret(vault, secretName, secretContentNew),
      ).rejects.toThrow(vaultsErrors.ErrorSecretsSecretUndefined);
    });
  });
  describe('renameSecret', () => {
    test('renaming a secret', async () => {
      await writeSecret(secretName, secretContent);
      await vaultOps.renameSecret(vault, secretName, secretNameNew);
      await expectSecretNot(secretName);
      await expectSecret(secretNameNew, secretContent);
    });
    test('renaming a secret within a directory', async () => {
      const secretPath = path.join(dirName, secretName);
      const secretPathNew = path.join(dirName, secretNameNew);
      await writeSecret(secretPath, secretContent);
      await vaultOps.renameSecret(vault, secretPath, secretPathNew);
      await expectSecretNot(secretPath);
      await expectSecret(secretPathNew, secretContent);
    });
    test('renaming a secret that does not exist should fail', async () => {
      await expect(
        vaultOps.renameSecret(vault, secretName, secretNameNew),
      ).rejects.toThrow(vaultsErrors.ErrorSecretsSecretUndefined);
    });
  });
  describe('getSecret', () => {
    test('can get a secret', async () => {
      await writeSecret(secretName, secretContent);
      const secret = await vaultOps.getSecret(vault, secretName);
      expect(secret.toString()).toBe(secretContent);
    });
    test('getting a secret that does not exist should fail', async () => {
      await expect(vaultOps.getSecret(vault, secretName)).rejects.toThrow(
        vaultsErrors.ErrorSecretsSecretUndefined,
      );
    });
    test('getting a directory should fail', async () => {
      await mkdir(dirName);
      await expect(vaultOps.getSecret(vault, dirName)).rejects.toThrow(
        vaultsErrors.ErrorSecretsIsDirectory,
      );
    });
  });
  describe('statSecret', () => {
    test('can get stat of a secret', async () => {
      await writeSecret(secretName, secretContent);
      const stat = await vaultOps.statSecret(vault, secretName);
      expect(stat).toBeInstanceOf(Stat);
      expect(stat.nlink).toBe(1);
    });
    test('can get stat of a directory', async () => {
      await mkdir(dirName);
      const stat = await vaultOps.statSecret(vault, dirName);
      expect(stat).toBeInstanceOf(Stat);
    });
    test('getting stat of secret that does not exist should fail', async () => {
      await expect(vaultOps.statSecret(vault, secretName)).rejects.toThrow(
        vaultsErrors.ErrorSecretsSecretUndefined,
      );
    });
  });
  describe('deleteSecret', () => {
    test('deleting a secret', async () => {
      await writeSecret(secretName, secretContent);
      await vaultOps.deleteSecret(vault, [secretName]);
      await expectSecretNot(secretName);
    });
    test('deleting a secret in a directory', async () => {
      const secretPath = path.join(dirName, secretName);
      await writeSecret(secretPath, secretContent);
      await vaultOps.deleteSecret(vault, [secretPath]);
      await expectSecretNot(secretPath);
      await expectDirExists(dirName);
    });
    test('deleting a directory', async () => {
      await mkdir(dirName);
      await vaultOps.deleteSecret(vault, [dirName]);
      await expectDirExistsNot(dirName);
    });
    test('deleting a directory with a file should fail', async () => {
      const secretPath = path.join(dirName, secretName);
      await writeSecret(secretPath, secretContent);
      await expect(vaultOps.deleteSecret(vault, [dirName])).rejects.toThrow(
        vaultsErrors.ErrorVaultsRecursive,
      );
    });
    test('deleting a directory with force', async () => {
      const secretPath = path.join(dirName, secretName);
      await writeSecret(secretPath, secretContent);
      await vaultOps.deleteSecret(vault, [dirName], { recursive: true });
      await expectDirExistsNot(dirName);
    });
    test('deleting a secret that does not exist should fail', async () => {
      await expect(vaultOps.deleteSecret(vault, [secretName])).rejects.toThrow(
        vaultsErrors.ErrorSecretsSecretUndefined,
      );
    });
    test('deleting multiple secrets', async () => {
      const secretNames = ['secret1', 'secret2', 'secret3'];
      for (const secretName of secretNames) {
        await writeSecret(secretName, secretName);
      }
      await vaultOps.deleteSecret(vault, secretNames);
      for (const secretName of secretNames) {
        await expectSecretNot(secretName);
      }
    });
    test('deleting multiple secrets should add only one new log message', async () => {
      const secretNames = ['secret1', 'secret2', 'secret3'];
      for (const secretName of secretNames) {
        await writeSecret(secretName, secretName);
      }
      const logLength = (await vault.log()).length;
      await vaultOps.deleteSecret(vault, secretNames);
      for (const secretName of secretNames) {
        await expectSecretNot(secretName);
      }
      expect((await vault.log()).length).toBe(logLength + 1);
    });
  });
  describe('mkdir', () => {
    test('can create directory', async () => {
      const response = await vaultOps.mkdir(vault, dirName);
      expect(response.type).toEqual('success');
      await expectDirExists(dirName);
    });
    test('can create recursive directory', async () => {
      const dirPath = path.join(dirName, dirName);
      const response = await vaultOps.mkdir(vault, dirPath, {
        recursive: true,
      });
      expect(response.type).toEqual('success');
      await expectDirExists(dirPath);
    });
    test('creating directories fails without recursive', async () => {
      const dirPath = path.join(dirName, dirName);
      const response = await vaultOps.mkdir(vault, dirPath);
      expect(response.type).toEqual('error');
      const error = response as ErrorMessage;
      expect(error.code).toEqual('ENOENT');
      await expectDirExistsNot(dirPath);
    });
    test('creating existing directory should fail', async () => {
      await mkdir(dirName);
      const response = await vaultOps.mkdir(vault, dirName);
      expect(response.type).toEqual('error');
      const error = response as ErrorMessage;
      expect(error.code).toEqual('EEXIST');
    });
    test('creating existing secret should fail', async () => {
      await writeSecret(secretName, secretContent);
      const response = await vaultOps.mkdir(vault, secretName);
      expect(response.type).toEqual('error');
      const error = response as ErrorMessage;
      expect(error.code).toEqual('EEXIST');
      await expectSecret(secretName, secretContent);
    });
  });
  describe('addSecretDirectory', () => {
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
  describe('listSecrets', () => {
    test('can list secrets', async () => {
      const secretName1 = `${secretName}1`;
      const secretName2 = `${secretName}2`;
      await writeSecret(secretName1, secretContent);
      await writeSecret(secretName2, secretContent);

      const secretList = await vaultOps.listSecrets(vault);
      expect(secretList).toInclude(secretName1);
      expect(secretList).toInclude(secretName2);
    });
    test('empty directories are not listed', async () => {
      const dirName1 = `${dirName}1`;
      const dirName2 = `${dirName}2`;
      await mkdir(dirName1);
      await mkdir(dirName2);

      const secretList = await vaultOps.listSecrets(vault);
      expect(secretList).toHaveLength(0);
    });
    test('secrets in directories are listed', async () => {
      const secretPath1 = path.join(dirName, `${secretName}1`);
      const secretPath2 = path.join(dirName, `${secretName}2`);
      await writeSecret(secretPath1, secretContent);
      await writeSecret(secretPath2, secretContent);

      const secretList = await vaultOps.listSecrets(vault);
      expect(secretList).toInclude(secretPath1);
      expect(secretList).toInclude(secretPath2);
    });
    test('empty vault list no secrets', async () => {
      const secretList = await vaultOps.listSecrets(vault);
      expect(secretList).toHaveLength(0);
    });
  });
  describe('writeSecret', () => {
    const secretName = 'secret';
    const secretContent = 'secret-content';
    const newSecretContent = 'updated-secret-content';

    test('updates existing secret', async () => {
      await vaultOps.addSecret(vault, secretName, secretContent);
      await vaultOps.writeSecret(vault, secretName, newSecretContent);
      const result = await vaultOps.getSecret(vault, secretName);
      expect(result.toString()).toStrictEqual(newSecretContent);
    });

    test('creates new secret if it does not exist', async () => {
      await vaultOps.writeSecret(vault, secretName, newSecretContent);
      const result = await vaultOps.getSecret(vault, secretName);
      expect(result.toString()).toStrictEqual(newSecretContent);
    });
  });
  test('adding hidden files and directories', async () => {
    await vaultOps.addSecret(vault, '.hiddenSecret', 'hidden_contents');
    await vaultOps.mkdir(vault, '.hiddenDir', { recursive: true });
    await vaultOps.addSecret(
      vault,
      '.hiddenDir/.hiddenInSecret',
      'hidden_inside',
    );
    const list = await vaultOps.listSecrets(vault);
    expect(list.sort()).toStrictEqual(
      ['.hiddenSecret', '.hiddenDir/.hiddenInSecret'].sort(),
    );
  });
  test(
    'updating and deleting hidden files and directories',
    async () => {
      await vaultOps.addSecret(vault, '.hiddenSecret', 'hidden_contents');
      await vaultOps.mkdir(vault, '.hiddenDir', { recursive: true });
      await vaultOps.addSecret(
        vault,
        '.hiddenDir/.hiddenInSecret',
        'hidden_inside',
      );
      await vaultOps.updateSecret(vault, '.hiddenSecret', 'change_contents');
      await vaultOps.updateSecret(
        vault,
        '.hiddenDir/.hiddenInSecret',
        'change_inside',
      );
      await vaultOps.renameSecret(vault, '.hiddenSecret', '.hidingSecret');
      await vaultOps.renameSecret(vault, '.hiddenDir', '.hidingDir');
      let list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual(
        ['.hidingSecret', '.hidingDir/.hiddenInSecret'].sort(),
      );
      expect(
        (await vaultOps.getSecret(vault, '.hidingSecret')).toString(),
      ).toStrictEqual('change_contents');
      expect(
        (
          await vaultOps.getSecret(vault, '.hidingDir/.hiddenInSecret')
        ).toString(),
      ).toStrictEqual('change_inside');
      await vaultOps.deleteSecret(vault, ['.hidingSecret'], {
        recursive: true,
      });
      await vaultOps.deleteSecret(vault, ['.hidingDir'], { recursive: true });
      list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual([].sort());
    },
    globalThis.defaultTimeout * 4,
  );

  describe('fileTree', () => {
    const relativeBase = '.';
    const dir1: string = 'dir1';
    const dir11: string = path.join(dir1, 'dir11');
    const file0b: string = 'file0.b';
    const file1a: string = path.join(dir1, 'file1.a');
    const file2b: string = path.join(dir1, 'file2.b');
    const file3a: string = path.join(dir11, 'file3.a');
    const file4b: string = path.join(dir11, 'file4.b');

    beforeEach(async () => {
      await vault.writeF(async (fs) => {
        await fs.promises.mkdir(dir1);
        await fs.promises.mkdir(dir11);
        await fs.promises.writeFile(file0b, 'content-file0');
        await fs.promises.writeFile(file1a, 'content-file1');
        await fs.promises.writeFile(file2b, 'content-file2');
        await fs.promises.writeFile(file3a, 'content-file3');
        await fs.promises.writeFile(file4b, 'content-file4');
      });
    });

    test('globWalk works with efs', async () => {
      const files = await vault.readF(async (fs) => {
        const tree: FileTree = [];
        for await (const treeNode of fileTree.globWalk({
          fs: fs,
          basePath: '.',
          yieldDirectories: true,
          yieldFiles: true,
          yieldParents: true,
          yieldRoot: true,
        })) {
          tree.push(treeNode);
        }
        return tree.map((v) => v.path ?? '');
      });
      expect(files).toContainAllValues([
        relativeBase,
        dir1,
        dir11,
        file0b,
        file1a,
        file2b,
        file3a,
        file4b,
      ]);
    });
    test('serializer with content works with efs', async () => {
      const data = await vault.readF(async (fs) => {
        const fileTreeGen = fileTree.globWalk({
          fs,
          yieldStats: false,
          yieldRoot: false,
          yieldFiles: true,
          yieldParents: true,
          yieldDirectories: true,
        });
        const data: Array<TreeNode | ContentNode | Uint8Array> = [];
        const parserTransform = fileTree.parserTransformStreamFactory();
        const serializedStream = fileTree.serializerStreamFactory(
          fs,
          fileTreeGen,
          true,
        );
        const outputStream = serializedStream.pipeThrough(parserTransform);
        for await (const output of outputStream) {
          data.push(output);
        }
        return data;
      });
      const contents = data
        .filter((v) => v instanceof Uint8Array)
        .map((v) => Buffer.from(v as Uint8Array).toString());
      const contentHeaders = data.filter(
        (v) => !(v instanceof Uint8Array) && v.type === 'CONTENT',
      ) as Array<ContentNode>;
      expect(contents).toIncludeAllMembers([
        'content-file0',
        'content-file1',
        'content-file2',
        'content-file3',
        'content-file4',
      ]);
      for (const contentHeader of contentHeaders) {
        expect(contentHeader.dataSize).toBe(13n);
      }
    });
  });
});
