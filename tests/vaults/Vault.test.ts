import os from 'os';
import path from 'path';
import fs from 'fs';
import { VirtualFS } from 'virtualfs';
import git from 'isomorphic-git';
import Vault from '@/vaults/Vault';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { generateVaultId, generateVaultKey } from '@/vaults/utils';
import { getRandomBytes } from '@/keys/utils';
import { WorkerManager } from '@/workers';
import * as errors from '@/vaults/errors';
import * as utils from '@/utils';

describe('Vault is', () => {
  let dataDir: string;
  let vault: Vault;
  let key: Buffer;
  let id: string;
  const logger = new Logger('Vault', LogLevel.WARN, [new StreamHandler()]);
  const name = 'vault-1';

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    key = await generateVaultKey();
    id = await generateVaultId();
    vault = new Vault({
      vaultId: id,
      vaultName: name,
      key: key,
      baseDir: dataDir,
      logger: logger,
    });
  });

  afterEach(async () => {
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('type correct', async () => {
    expect(vault).toBeInstanceOf(Vault);
  });
  test('creating the vault directory', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    await vault.create();
    await expect(exists(vault.vaultId)).resolves.toBe(true);
  });
  test('able to destroy an empty vault', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    await vault.create();
    await expect(exists(vault.vaultId)).resolves.toBe(true);
    await vault.destroy();
    await expect(exists(vault.vaultId)).resolves.toBe(false);
  });
  test('adding a secret', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));

      await expect(exists(path.join(vault.vaultId, 'secret-1'))).resolves.toBe(
        true,
      );
    } finally {
      await vault.destroy();
    }
  });
  test('adding a secret on efs', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));

      await expect(exists(path.join(vault.vaultId, 'secret-1'))).resolves.toBe(
        true,
      );
    } finally {
      await vault.destroy();
    }
  });
  test('adding a secret and getting it', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));

      await expect(exists(path.join(vault.vaultId, 'secret-1'))).resolves.toBe(
        true,
      );
      const secret = (await vault.getSecret('secret-1')).toString();
      expect(secret).toBe('secret-content');
      await expect(vault.getSecret('doesnotexist')).rejects.toThrow(
        errors.ErrorSecretUndefined,
      );
    } finally {
      await vault.destroy();
    }
  });
  test('able to make directories', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.mkdir('dir-1', { recursive: true });
      await vault.mkdir('dir-2', { recursive: true });
      await vault.mkdir(path.join('dir-3', 'dir-4'), { recursive: true });
      await vault.addSecret(
        path.join('dir-3', 'dir-4', 'secret-1'),
        Buffer.from('secret-content'),
      );

      await expect(exists(path.join(vault.vaultId, 'dir-1'))).resolves.toBe(
        true,
      );
      await expect(exists(path.join(vault.vaultId, 'dir-2'))).resolves.toBe(
        true,
      );
      await expect(
        exists(path.join(vault.vaultId, 'dir-3', 'dir-4')),
      ).resolves.toBe(true);
      await expect(
        exists(path.join(vault.vaultId, 'dir-3', 'dir-4', 'secret-1')),
      ).resolves.toBe(true);
    } finally {
      await vault.destroy();
    }
  });
  test('adding 100 secrets on efs', async () => {
    jest.setTimeout(300000);
    const efs = vault.EncryptedFS;
    const exists = utils.promisify(efs.exists).bind(efs);
    const mkdir = utils.promisify(efs.mkdir).bind(efs);
    const writeFile = utils.promisify(efs.writeFile).bind(efs);
    try {
      await vault.create();
      for (let i = 0; i < 100; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        const writePath = path.join(vault.vaultId, name);
        await mkdir(path.dirname(writePath), {
          recursive: true,
        });
        await writeFile(writePath, content, {});
        await expect(vault.getSecret(name)).resolves.toStrictEqual(content);

        await expect(exists(path.join(vault.vaultId, name))).resolves.toBe(
          true,
        );
      }
    } finally {
      await vault.destroy();
    }
  });
  test('throwing an error when adding a secret to uninitialised vault', async () => {
    try {
      await vault.create();
      const name = 'secret';
      const content = await getRandomBytes(5);

      await expect(vault.addSecret(name, content)).rejects.toThrow(
        errors.ErrorVaultUninitialised,
      );
    } finally {
      await vault.destroy();
    }
  });
  test('adding and committing a secret 10 times', async () => {
    jest.setTimeout(300000);
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      for (let i = 0; i < 10; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        await vault.addSecret(name, content);
        await expect(vault.getSecret(name)).resolves.toStrictEqual(content);

        await expect(exists(path.join(vault.vaultId, name))).resolves.toBe(
          true,
        );
      }
    } finally {
      await vault.destroy();
    }
  });
  test('adding secret content', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));

      await expect(vault.getSecret('secret-1')).resolves.toStrictEqual(
        Buffer.from('secret-content'),
      );
    } finally {
      await vault.destroy();
    }
  });
  test('updating secret content', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await vault.updateSecret(
        'secret-1',
        Buffer.from('secret-content-change'),
      );

      await expect(vault.getSecret('secret-1')).resolves.toStrictEqual(
        Buffer.from('secret-content-change'),
      );
    } finally {
      await vault.destroy();
    }
  });
  test('updating secret content within a directory', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.mkdir(path.join('dir-1', 'dir-2'), { recursive: true });
      await vault.addSecret(
        path.join('dir-1', 'dir-2', 'secret-1'),
        Buffer.from('secret-content'),
      );
      await vault.updateSecret(
        path.join('dir-1', 'dir-2', 'secret-1'),
        Buffer.from('secret-content-change'),
      );

      await expect(
        vault.getSecret(path.join('dir-1', 'dir-2', 'secret-1')),
      ).resolves.toStrictEqual(Buffer.from('secret-content-change'));
    } finally {
      await vault.destroy();
    }
  });
  test('updating a secret 10 times', async () => {
    jest.setTimeout(300000);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      for (let i = 0; i < 10; i++) {
        const content = await getRandomBytes(5);
        await vault.updateSecret('secret-1', content);

        await expect(vault.getSecret('secret-1')).resolves.toStrictEqual(
          content,
        );
      }
    } finally {
      await vault.destroy();
    }
  });
  test('deleting a secret', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await vault.deleteSecret('secret-1', false);

      await expect(exists(path.join(vault.vaultId, 'secret-1'))).resolves.toBe(
        false,
      );
    } finally {
      await vault.destroy();
    }
  });
  test('deleting a secret efs', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await vault.deleteSecret('secret-1', false);

      await expect(exists(path.join(vault.vaultId, 'secret-1'))).resolves.toBe(
        false,
      );
    } finally {
      await vault.destroy();
    }
  });
  test('deleting a secret within a directory', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.mkdir(path.join('dir-1', 'dir-2'), { recursive: true });
      await vault.addSecret(
        path.join('dir-1', 'dir-2', 'secret-1'),
        Buffer.from('secret-content'),
      );
      await vault.deleteSecret(path.join('dir-1', 'dir-2', 'secret-1'), true);

      await expect(
        exists(path.join(vault.vaultId, 'dir-1', 'dir-2', 'secret-1')),
      ).resolves.toBe(false);
    } finally {
      await vault.destroy();
    }
  });
  test('deleting a secret 10 times', async () => {
    jest.setTimeout(100000);
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      for (let i = 0; i < 10; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        await vault.addSecret(name, content);
        await expect(vault.getSecret(name)).resolves.toStrictEqual(content);
        await vault.deleteSecret(name, true);

        await expect(exists(path.join(vault.vaultId, name))).resolves.toBe(
          false,
        );
      }
    } finally {
      await vault.destroy();
    }
  });
  test('renaming a vault', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.renameVault('vault-change');

      await expect(exists(path.join(vault.vaultId))).resolves.toBe(true);
    } finally {
      await vault.destroy();
    }
  });
  test('renaming a secret', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await vault.renameSecret('secret-1', 'secret-change');

      await expect(
        exists(path.join(vault.vaultId, 'secret-change')),
      ).resolves.toBe(true);
    } finally {
      await vault.destroy();
    }
  });
  test('renaming a secret within a directory', async () => {
    const readdir = utils
      .promisify(vault.EncryptedFS.readdir)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.mkdir(path.join('dir-1', 'dir-2'), { recursive: true });
      await vault.addSecret(
        path.join('dir-1', 'dir-2', 'secret-1'),
        Buffer.from('secret-content'),
      );
      await vault.renameSecret(
        path.join('dir-1', 'dir-2', 'secret-1'),
        path.join('dir-1', 'dir-2', 'secret-change'),
      );

      await expect(
        readdir(path.join(vault.vaultId, 'dir-1', 'dir-2')),
      ).resolves.toEqual([`secret-change`]);
    } finally {
      await vault.destroy();
    }
  });
  test('listing secrets', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await vault.addSecret('secret-2', Buffer.from('secret-content'));
      await vault.mkdir(path.join('dir1', 'dir2'), { recursive: true });
      await vault.addSecret(
        path.join('dir1', 'dir2', 'secret-3'),
        Buffer.from('secret-content'),
      );

      expect((await vault.listSecrets()).sort()).toStrictEqual(
        ['secret-1', 'secret-2', 'dir1/dir2/secret-3'].sort(),
      );
    } finally {
      await vault.destroy();
    }
  });
  test('listing secret directories', async () => {
    const secretDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    const secretDirName = path.basename(secretDir);
    try {
      for (let i = 0; i < 10; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        await fs.promises.writeFile(path.join(secretDir, name), content);
      }
      await vault.create();
      await vault.initializeVault();
      await vault.addSecretDirectory(secretDir);

      expect(await vault.listSecrets()).toStrictEqual([
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
      ]);
    } finally {
      await vault.destroy();
      await fs.promises.rm(secretDir, {
        force: true,
        recursive: true,
      });
    }
  });
  test('adding hidden files and directories', async () => {
    try {
      await vault.create();
      await vault.initializeVault();

      await vault.addSecret('.hiddenSecret', Buffer.from('hidden_contents'));
      await vault.mkdir('.hiddenDir', { recursive: true });
      await vault.addSecret(
        '.hiddenDir/.hiddenInSecret',
        Buffer.from('hidden_inside'),
      );

      const list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(
        ['.hiddenSecret', '.hiddenDir/.hiddenInSecret'].sort(),
      );
    } finally {
      await vault.destroy();
    }
  });
  test('updating and deleting hidden files and directories', async () => {
    try {
      await vault.create();
      await vault.initializeVault();

      await vault.addSecret('.hiddenSecret', Buffer.from('hidden_contents'));
      await vault.mkdir('.hiddenDir', { recursive: true });
      await vault.addSecret(
        '.hiddenDir/.hiddenInSecret',
        Buffer.from('hidden_inside'),
      );

      await vault.updateSecret('.hiddenSecret', Buffer.from('change_contents'));
      await vault.updateSecret(
        '.hiddenDir/.hiddenInSecret',
        Buffer.from('change_inside'),
      );

      await vault.renameSecret('.hiddenSecret', '.hidingSecret');
      await vault.renameSecret('.hiddenDir', '.hidingDir');

      let list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(
        ['.hidingSecret', '.hidingDir/.hiddenInSecret'].sort(),
      );

      await expect(vault.getSecret('.hidingSecret')).resolves.toStrictEqual(
        Buffer.from('change_contents'),
      );
      await expect(
        vault.getSecret('.hidingDir/.hiddenInSecret'),
      ).resolves.toStrictEqual(Buffer.from('change_inside'));

      await vault.deleteSecret('.hidingSecret', true);
      await vault.deleteSecret('.hidingDir', true);

      list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual([].sort());
    } finally {
      await vault.destroy();
    }
  });
  test('adding and committing a secret 150 times on vfs', async () => {
    jest.setTimeout(300000);
    const vfs = new VirtualFS();
    const mkdirp = utils.promisify(vfs.mkdirp).bind(vfs);
    const writeFile = utils.promisify(vfs.writeFile).bind(vfs);
    const exists = utils.promisify(vfs.exists).bind(vfs);
    try {
      await vault.create();
      const fileSystem = { promises: vfs.promises };
      if (!fileSystem) {
        throw Error();
      }
      const vaultId = vault.vaultId;
      await mkdirp(path.join(dataDir, vaultId), {
        recursive: true,
      });
      await git.init({
        fs: vfs,
        dir: path.join(dataDir, vaultId),
      });
      await git.commit({
        fs: vfs,
        dir: path.join(dataDir, vaultId),
        author: {
          name: vaultId,
        },
        message: 'Initial Commit',
      });
      await writeFile(
        path.join(path.join(dataDir, vaultId), '.git', 'packed-refs'),
        '# pack-refs with: peeled fully-peeled sorted',
      );
      for (let i = 0; i < 150; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        const writePath = path.join(dataDir, vaultId, name);
        await writeFile(writePath, content, {});
        await git.add({
          fs: vfs,
          dir: path.join(dataDir, vaultId),
          filepath: name,
        });
        await git.commit({
          fs: vfs,
          dir: path.join(dataDir, vaultId),
          author: {
            name: vaultId,
          },
          message: `Add secret: ${name}`,
        });
        await expect(exists(path.join(dataDir, vaultId))).rejects.toBe(true);
      }
    } finally {
      await vault.destroy();
    }
  });
  test('adding and committing a secret 150 times on efs', async () => {
    jest.setTimeout(300000);
    const efs = vault.EncryptedFS;
    const exists = utils.promisify(efs.exists).bind(efs);
    const mkdir = utils.promisify(efs.mkdir).bind(efs);
    const writeFile = utils.promisify(efs.writeFile).bind(efs);
    try {
      await vault.create();
      const fileSystem = efs;
      if (!fileSystem) {
        throw Error();
      }
      const vaultId = vault.vaultId;
      await mkdir(path.join(dataDir, vaultId), {
        recursive: true,
      });
      await git.init({
        fs: efs,
        dir: path.join(dataDir, vaultId),
      });
      await git.commit({
        fs: efs,
        dir: path.join(dataDir, vaultId),
        author: {
          name: vaultId,
        },
        message: 'Initial Commit',
      });
      await writeFile(
        path.join(path.join(dataDir, vaultId), '.git', 'packed-refs'),
        '# pack-refs with: peeled fully-peeled sorted',
      );
      for (let i = 0; i < 150; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        const writePath = path.join(dataDir, vaultId, name);
        await writeFile(writePath, content, {});
        await git.add({
          fs: efs,
          dir: path.join(dataDir, vaultId),
          filepath: name,
        });
        await git.commit({
          fs: efs,
          dir: path.join(dataDir, vaultId),
          author: {
            name: vaultId,
          },
          message: `Add secret: ${name}`,
        });

        await expect(exists(path.join(dataDir, vaultId, name))).resolves.toBe(
          true,
        );
      }
    } finally {
      await vault.destroy();
    }
  });
  test('adding a directory of 1 secret', async () => {
    const secretDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    const secretDirName = path.basename(secretDir);
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      const name = 'secret';
      const content = await getRandomBytes(5);
      await fs.promises.writeFile(path.join(secretDir, name), content);
      await vault.create();
      await vault.initializeVault();
      await vault.addSecretDirectory(path.join(secretDir));

      await expect(
        exists(path.join(vault.vaultId, secretDirName, 'secret')),
      ).resolves.toBe(true);
    } finally {
      await vault.destroy();
      await fs.promises.rm(secretDir, {
        force: true,
        recursive: true,
      });
    }
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

    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecretDirectory(path.join(secretDir));

      const list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(
        [
          path.join(secretDirName, 'secret1'),
          path.join(secretDirName, 'dir1', 'secret2'),
          path.join(secretDirName, 'dir1', 'dir2', 'secret3'),
          path.join(secretDirName, 'dir3', 'secret4'),
          path.join(secretDirName, 'dir3', 'secret5'),
        ].sort(),
      );
    } finally {
      await vault.destroy();
      await fs.promises.rm(secretDir, {
        force: true,
        recursive: true,
      });
    }
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

    try {
      await vault.create();
      await vault.initializeVault();
      await vault.mkdir(secretDirName, { recursive: true });
      await vault.addSecret(
        path.join(secretDirName, 'secret1'),
        Buffer.from('blocking-secret'),
      );
      await vault.addSecretDirectory(secretDir);

      const list = await vault.listSecrets();
      expect(list.sort()).toStrictEqual(
        [
          path.join(secretDirName, 'secret1'),
          path.join(secretDirName, 'dir1', 'secret2'),
          path.join(secretDirName, 'dir1', 'dir2', 'secret3'),
          path.join(secretDirName, 'dir3', 'secret4'),
          path.join(secretDirName, 'dir3', 'secret5'),
        ].sort(),
      );
    } finally {
      await vault.destroy();
      await fs.promises.rm(secretDir, {
        force: true,
        recursive: true,
      });
    }
  });
  test('a directory of 100 secrets', async () => {
    jest.setTimeout(300000);
    const readFile = utils
      .promisify(vault.EncryptedFS.readFile)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret', Buffer.from('content'));
      for (let i = 0; i < 100; i++) {
        await vault.updateSecret(
          'secret',
          Buffer.from('this is secret ' + i.toString()),
        );
        await expect(
          readFile(path.join(vault.vaultId, 'secret'), {
            encoding: 'utf8',
          }),
        ).resolves.toBe('this is secret ' + i.toString());
      }
    } finally {
      vault.destroy();
    }
  });
  test('adding a directory of 100 secrets with some secrets already existing', async () => {
    jest.setTimeout(300000);
    const secretDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    const secretDirName = path.basename(secretDir);
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    const readFile = utils
      .promisify(vault.EncryptedFS.readFile)
      .bind(vault.EncryptedFS);
    try {
      for (let i = 0; i < 50; i++) {
        const name = 'secret ' + i.toString();
        const content = 'this is secret ' + i.toString();
        await fs.promises.writeFile(
          path.join(secretDir, name),
          Buffer.from(content),
        );
      }
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret 8', await getRandomBytes(5));
      await vault.addSecret('secret 9', await getRandomBytes(5));
      await vault.addSecretDirectory(path.join(secretDir));

      for (let j = 0; j < 8; j++) {
        await expect(
          exists(
            path.join(vault.vaultId, secretDirName, 'secret ' + j.toString()),
          ),
        ).resolves.toBe(true);
      }

      await expect(
        readFile(path.join(vault.vaultId, secretDirName, 'secret 8')),
      ).resolves.toStrictEqual(Buffer.from('this is secret 8'));
      await expect(
        readFile(path.join(vault.vaultId, secretDirName, 'secret 9')),
      ).resolves.toStrictEqual(Buffer.from('this is secret 9'));
    } finally {
      await vault.destroy();
      await fs.promises.rm(secretDir, {
        force: true,
        recursive: true,
      });
    }
  });
  test('able to persist data across multiple vault objects', async () => {
    const exists = utils
      .promisify(vault.EncryptedFS.exists)
      .bind(vault.EncryptedFS);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));

      await expect(exists(path.join(vault.vaultId, 'secret-1'))).resolves.toBe(
        true,
      );

      const vault2 = new Vault({
        vaultId: id,
        vaultName: name,
        key: key,
        baseDir: dataDir,
        logger: logger,
      });

      const content = await vault2.getSecret('secret-1');
      expect(content.toString()).toBe('secret-content');
    } finally {
      await vault.destroy();
    }
  });
  test('able to encrypt and decrypt using workers - read/write', async () => {
    await vault.create();
    await vault.initializeVault();
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
    const plainBuf = Buffer.from('very important secret');
    const deciphered = Buffer.from(plainBuf).fill(0);
    const fd = vault.EncryptedFS.openSync('test', 'w+');
    vault.EncryptedFS.setWorkerManager(workerManager);
    await utils.promisify(vault.EncryptedFS.write.bind(vault.EncryptedFS))(
      fd,
      plainBuf,
      0,
      plainBuf.length,
      0,
    );
    await utils.promisify(vault.EncryptedFS.read.bind(vault.EncryptedFS))(
      fd,
      deciphered,
      0,
      deciphered.length,
      0,
    );
    expect(deciphered).toStrictEqual(plainBuf);
    vault.EncryptedFS.unsetWorkerManager();
    await workerManager.stop();
    await vault.destroy();
  });
  test('able to encrypt and decrypt using workers', async () => {
    await vault.create();
    await vault.initializeVault();
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
    const plainBuf = Buffer.from('very important secret');
    vault.EncryptedFS.setWorkerManager(workerManager);
    await utils.promisify(vault.EncryptedFS.writeFile.bind(vault.EncryptedFS))(
      `test`,
      plainBuf,
      {},
    );
    const deciphered = await utils.promisify(
      vault.EncryptedFS.readFile.bind(vault.EncryptedFS),
    )(`test`, {});
    expect(deciphered).toStrictEqual(plainBuf);
    vault.EncryptedFS.unsetWorkerManager();
    await workerManager.stop();
    await vault.destroy();
  });
  test('able to encrypt and decrypt using workers for encryption but not decryption', async () => {
    await vault.create();
    await vault.initializeVault();
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
    const plainBuf = Buffer.from('very important secret');
    vault.EncryptedFS.setWorkerManager(workerManager);
    await utils.promisify(vault.EncryptedFS.writeFile.bind(vault.EncryptedFS))(
      'test',
      plainBuf,
      {},
    );
    vault.EncryptedFS.unsetWorkerManager();
    await workerManager.stop();
    const deciphered = await utils.promisify(
      vault.EncryptedFS.readFile.bind(vault.EncryptedFS),
    )(`test`, {});
    expect(deciphered).toStrictEqual(plainBuf);
    await vault.destroy();
  });

  test('able to encrypt and decrypt using workers for decryption but not encryption', async () => {
    await vault.create();
    await vault.initializeVault();
    const workerManager = new WorkerManager({ logger });
    await workerManager.start();
    const plainBuf = Buffer.from('very important secret');
    await utils.promisify(vault.EncryptedFS.writeFile.bind(vault.EncryptedFS))(
      'test',
      plainBuf,
      {},
    );
    vault.EncryptedFS.setWorkerManager(workerManager);
    const deciphered = await utils.promisify(
      vault.EncryptedFS.readFile.bind(vault.EncryptedFS),
    )(`test`, {});
    expect(deciphered).toStrictEqual(plainBuf);
    vault.EncryptedFS.unsetWorkerManager();
    await workerManager.stop();
    await vault.destroy();
  });
});
