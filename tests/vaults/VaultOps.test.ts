import type { VaultId } from '@/vaults/types';
import type { Vault } from '@/vaults/Vault';
import type KeyManager from '@/keys/KeyManager';
import type { LevelPath } from '@matrixai/db';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EncryptedFS } from 'encryptedfs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { DB } from '@matrixai/db';
import * as errors from '@/vaults/errors';
import VaultInternal from '@/vaults/VaultInternal';
import * as vaultOps from '@/vaults/VaultOps';
import * as vaultsUtils from '@/vaults/utils';
import * as keysUtils from '@/keys/utils';
import * as testUtils from '../utils';
import * as testNodesUtils from '../nodes/utils';

describe('VaultOps', () => {
  const logger = new Logger('VaultOps', LogLevel.WARN, [new StreamHandler()]);

  let dataDir: string;
  let baseEfs: EncryptedFS;
  let vaultId: VaultId;
  let vaultInternal: VaultInternal;
  let vault: Vault;
  let db: DB;
  let vaultsDbPath: LevelPath;
  const dummyKeyManager = {
    getNodeId: () => {
      return testNodesUtils.generateRandomNodeId();
    },
  } as KeyManager;

  let mockedGenerateKeyPair: jest.SpyInstance;
  let mockedGenerateDeterministicKeyPair: jest.SpyInstance;

  beforeEach(async () => {
    const globalKeyPair = await testUtils.setupGlobalKeypair();
    mockedGenerateKeyPair = jest
      .spyOn(keysUtils, 'generateKeyPair')
      .mockResolvedValue(globalKeyPair);
    mockedGenerateDeterministicKeyPair = jest
      .spyOn(keysUtils, 'generateDeterministicKeyPair')
      .mockResolvedValue(globalKeyPair);

    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    const dbPath = path.join(dataDir, 'efsDb');
    const dbKey = await keysUtils.generateKey();
    baseEfs = await EncryptedFS.createEncryptedFS({
      dbKey,
      dbPath,
      logger,
    });
    await baseEfs.start();

    vaultId = vaultsUtils.generateVaultId();
    await baseEfs.mkdir(
      path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
      {
        recursive: true,
      },
    );
    db = await DB.createDB({ dbPath: path.join(dataDir, 'db'), logger });
    vaultsDbPath = ['vaults'];
    vaultInternal = await VaultInternal.createVaultInternal({
      keyManager: dummyKeyManager,
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
    mockedGenerateKeyPair.mockRestore();
    mockedGenerateDeterministicKeyPair.mockRestore();
    await baseEfs.stop();
    await baseEfs.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('adding a secret', async () => {
    await vaultOps.addSecret(vault, 'secret-1', 'secret-content');
    const dir = await vault.readF(async (efs) => {
      return await efs.readdir('.');
    });
    expect(dir).toContain('secret-1');
  });
  test('adding a secret and getting it', async () => {
    await vaultOps.addSecret(vault, 'secret-1', 'secret-content');
    const secret = await vaultOps.getSecret(vault, 'secret-1');
    expect(secret.toString()).toBe('secret-content');
    await expect(() =>
      vaultOps.getSecret(vault, 'doesnotexist'),
    ).rejects.toThrow(errors.ErrorSecretsSecretUndefined);
  });
  test('able to make directories', async () => {
    await vaultOps.mkdir(vault, 'dir-1', { recursive: true });
    await vaultOps.mkdir(vault, 'dir-2', { recursive: true });
    await vaultOps.mkdir(vault, path.join('dir-3', 'dir-4'), {
      recursive: true,
    });
    await vaultOps.addSecret(
      vault,
      path.join('dir-3', 'dir-4', 'secret-1'),
      'secret-content',
    );
    await vault.readF(async (efs) => {
      const dir = await efs.readdir('.');
      expect(dir).toContain('dir-1');
      expect(dir).toContain('dir-2');
      expect(dir).toContain('dir-3');

      expect(await efs.readdir('dir-3')).toContain('dir-4');
      expect(await efs.readdir(path.join('dir-3', 'dir-4'))).toContain(
        'secret-1',
      );
    });
  });
  test(
    'adding and committing a secret 10 times',
    async () => {
      const content = 'secret-content';
      for (let i = 0; i < 10; i++) {
        const name = 'secret ' + i.toString();
        await vaultOps.addSecret(vault, name, content);
        expect(
          (await vaultOps.getSecret(vault, name)).toString(),
        ).toStrictEqual(content);

        await expect(vault.readF((efs) => efs.readdir('.'))).resolves.toContain(
          name,
        );
      }
    },
    global.defaultTimeout * 4,
  );
  test(
    'updating secret content',
    async () => {
      await vaultOps.addSecret(vault, 'secret-1', 'secret-content');
      await vaultOps.updateSecret(vault, 'secret-1', 'secret-content-change');
      expect(
        (await vaultOps.getSecret(vault, 'secret-1')).toString(),
      ).toStrictEqual('secret-content-change');
    },
    global.defaultTimeout * 4,
  );
  test('updating secret content within a directory', async () => {
    await vaultOps.mkdir(vault, path.join('dir-1', 'dir-2'), {
      recursive: true,
    });
    await vaultOps.addSecret(
      vault,
      path.join('dir-1', 'dir-2', 'secret-1'),
      'secret-content',
    );
    await vaultOps.updateSecret(
      vault,
      path.join('dir-1', 'dir-2', 'secret-1'),
      'secret-content-change',
    );
    expect(
      (
        await vaultOps.getSecret(vault, path.join('dir-1', 'dir-2', 'secret-1'))
      ).toString(),
    ).toStrictEqual('secret-content-change');
  });
  test(
    'updating a secret 10 times',
    async () => {
      await vaultOps.addSecret(vault, 'secret-1', 'secret-content');
      for (let i = 0; i < 10; i++) {
        const content = 'secret-content';
        await vaultOps.updateSecret(vault, 'secret-1', content);
        expect(
          (await vaultOps.getSecret(vault, 'secret-1')).toString(),
        ).toStrictEqual(content);
      }
    },
    global.defaultTimeout * 2,
  );
  test('deleting a secret', async () => {
    await vaultOps.addSecret(vault, 'secret-1', 'secret-content');
    await vaultOps.mkdir(vault, 'dir-1');
    await vaultOps.addSecret(
      vault,
      path.join('dir-1', 'secret-2'),
      'secret-content',
    );
    await vaultOps.deleteSecret(vault, 'secret-1');
    await expect(() => vaultOps.deleteSecret(vault, 'dir-1')).rejects.toThrow();
    await vaultOps.deleteSecret(vault, path.join('dir-1', 'secret-2'));
    await vaultOps.deleteSecret(vault, 'dir-1');
    await expect(vault.readF((efs) => efs.readdir('.'))).resolves.not.toContain(
      'secret-1',
    );
  });
  test('deleting a secret within a directory', async () => {
    await expect(() =>
      vaultOps.mkdir(vault, path.join('dir-1', 'dir-2')),
    ).rejects.toThrow(errors.ErrorVaultsRecursive);
    await vaultOps.mkdir(vault, path.join('dir-1', 'dir-2'), {
      recursive: true,
    });
    await vaultOps.addSecret(
      vault,
      path.join('dir-1', 'dir-2', 'secret-1'),
      'secret-content',
    );
    await vaultOps.deleteSecret(vault, path.join('dir-1', 'dir-2'), {
      recursive: true,
    });
    await expect(
      vault.readF((efs) => efs.readdir('dir-1')),
    ).resolves.not.toContain('dir-2');
  });
  test(
    'deleting a secret 10 times',
    async () => {
      for (let i = 0; i < 10; i++) {
        const name = 'secret ' + i.toString();
        const content = 'secret-content';
        await vaultOps.addSecret(vault, name, content);
        expect(
          (await vaultOps.getSecret(vault, name)).toString(),
        ).toStrictEqual(content);
        await vaultOps.deleteSecret(vault, name, { recursive: true });
        await expect(
          vault.readF((efs) => efs.readdir('.')),
        ).resolves.not.toContain(name);
      }
    },
    global.defaultTimeout * 4,
  );
  test('renaming a secret', async () => {
    await vaultOps.addSecret(vault, 'secret-1', 'secret-content');
    await vaultOps.renameSecret(vault, 'secret-1', 'secret-change');
    const dir = vault.readF((efs) => efs.readdir('.'));
    await expect(dir).resolves.not.toContain('secret-1');
    await expect(dir).resolves.toContain('secret-change');
  });
  test('renaming a secret within a directory', async () => {
    const dirPath = path.join('dir-1', 'dir-2');
    await vaultOps.mkdir(vault, dirPath, { recursive: true });
    await vaultOps.addSecret(
      vault,
      path.join(dirPath, 'secret-1'),
      'secret-content',
    );
    await vaultOps.renameSecret(
      vault,
      path.join(dirPath, 'secret-1'),
      path.join(dirPath, 'secret-change'),
    );
    await expect(vault.readF((efs) => efs.readdir(dirPath))).resolves.toContain(
      `secret-change`,
    );
  });
  test('listing secrets', async () => {
    await vaultOps.addSecret(vault, 'secret-1', 'secret-content');
    await vaultOps.addSecret(vault, 'secret-2', 'secret-content');
    await vaultOps.mkdir(vault, path.join('dir1', 'dir2'), { recursive: true });
    await vaultOps.addSecret(
      vault,
      path.join('dir1', 'dir2', 'secret-3'),
      'secret-content',
    );
    expect((await vaultOps.listSecrets(vault)).sort()).toStrictEqual(
      ['secret-1', 'secret-2', 'dir1/dir2/secret-3'].sort(),
    );
  });
  test('listing secret directories', async () => {
    const secretDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    const content = 'CONTENT, LIKE AND SUBSCRIBE.';
    const secretDirName = path.basename(secretDir);
    for (let i = 0; i < 10; i++) {
      const name = 'secret ' + i.toString();
      await fs.promises.writeFile(path.join(secretDir, name), content);
    }

    await vaultOps.addSecretDirectory(vault, secretDir, fs);

    expect((await vaultOps.listSecrets(vault)).sort()).toStrictEqual(
      [
        path.join(secretDirName, `secret 0`),
        path.join(secretDirName, `secret 1`),
        path.join(secretDirName, `secret 2`),
        path.join(secretDirName, `secret 3`),
        path.join(secretDirName, `secret 4`),
        path.join(secretDirName, `secret 5`),
        path.join(secretDirName, `secret 6`),
        path.join(secretDirName, `secret 7`),
        path.join(secretDirName, `secret 8`),
        path.join(secretDirName, `secret 9`),
      ].sort(),
    );

    await fs.promises.rm(secretDir, {
      force: true,
      recursive: true,
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
      await expect(
        (
          await vaultOps.getSecret(vault, '.hidingDir/.hiddenInSecret')
        ).toString(),
      ).toStrictEqual('change_inside');
      await vaultOps.deleteSecret(vault, '.hidingSecret', { recursive: true });
      await vaultOps.deleteSecret(vault, '.hidingDir', { recursive: true });
      list = await vaultOps.listSecrets(vault);
      expect(list.sort()).toStrictEqual([].sort());
    },
    global.defaultTimeout * 4,
  );
  test('adding a directory of 1 secret', async () => {
    const secretDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    const secretDirName = path.basename(secretDir);
    const name = 'secret';
    const content = await keysUtils.getRandomBytes(5);
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
  test(
    'adding a directory of 100 secrets with some secrets already existing',
    async () => {
      const secretDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'secret-directory-'),
      );
      const secretDirName = path.basename(secretDir);
      for (let i = 0; i < 50; i++) {
        const name = 'secret ' + i.toString();
        const content = 'this is secret ' + i.toString();
        await fs.promises.writeFile(
          path.join(secretDir, name),
          Buffer.from(content),
        );
      }

      await vaultOps.mkdir(vault, secretDirName, { recursive: false });
      await vaultOps.addSecret(
        vault,
        path.join(secretDirName, 'secret 8'),
        'secret-content',
      );
      await vaultOps.addSecret(
        vault,
        path.join(secretDirName, 'secret 9'),
        'secret-content',
      );
      await vaultOps.addSecretDirectory(vault, secretDir, fs);

      for (let j = 0; j < 8; j++) {
        await expect(
          vault.readF((efs) => efs.readdir(secretDirName)),
        ).resolves.toContain('secret ' + j.toString());
      }
      expect(
        (
          await vaultOps.getSecret(vault, path.join(secretDirName, 'secret 8'))
        ).toString(),
      ).toStrictEqual('this is secret 8');
      expect(
        (
          await vaultOps.getSecret(vault, path.join(secretDirName, 'secret 9'))
        ).toString(),
      ).toStrictEqual('this is secret 9');

      await fs.promises.rm(secretDir, {
        force: true,
        recursive: true,
      });
    },
    global.defaultTimeout * 5,
  );
});
