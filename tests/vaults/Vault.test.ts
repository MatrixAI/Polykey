import os from 'os';
import path from 'path';
import fsPromises from 'fs/promises';
import fs from 'fs';
import { VirtualFS } from 'virtualfs';
import git from 'isomorphic-git';
import Vault from '@/vaults/Vault';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { generateVaultId, generateVaultKey } from '@/vaults/utils';
import { getRandomBytes } from '@/keys/utils';
import * as errors from '@/vaults/errors';

describe('Vault is', () => {
  let dataDir: string;
  let vault: Vault;
  let key: Buffer;
  let id: string;
  const logger = new Logger('Vault', LogLevel.WARN, [new StreamHandler()]);
  const name = 'vault-1';

  beforeEach(async () => {
    dataDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'polykey-test-'));
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
    await fsPromises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('type correct', async () => {
    expect(vault).toBeInstanceOf(Vault);
  });
  test('creating the vault directory', async () => {
    await vault.create();
    expect(fs.existsSync(path.join(dataDir, vault.vaultId))).toBe(true);
  });
  test('able to destroy an empty vault', async () => {
    await vault.create();
    expect(fs.existsSync(path.join(dataDir, vault.vaultId))).toBe(true);
    await vault.destroy();
    expect(fs.existsSync(path.join(dataDir, vault.vaultId))).toBe(false);
  });
  test('adding a secret', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));

      expect(fs.existsSync(path.join(dataDir, vault.vaultId, 'secret-1'))).toBe(
        true,
      );
    } finally {
      await vault.destroy();
    }
  });
  test('adding a secret on efs', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));

      expect(
        vault.EncryptedFS.existsSync(
          path.join(dataDir, vault.vaultId, 'secret-1'),
        ),
      ).toBe(true);
    } finally {
      await vault.destroy();
    }
  });
  test('adding a secret and getting it', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));

      expect(fs.existsSync(path.join(dataDir, vault.vaultId, 'secret-1'))).toBe(
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

      expect(fs.existsSync(path.join(dataDir, vault.vaultId, 'dir-1'))).toBe(
        true,
      );
      expect(fs.existsSync(path.join(dataDir, vault.vaultId, 'dir-2'))).toBe(
        true,
      );
      expect(
        fs.existsSync(path.join(dataDir, vault.vaultId, 'dir-3', 'dir-4')),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(dataDir, vault.vaultId, 'dir-3', 'dir-4', 'secret-1'),
        ),
      );
    } finally {
      await vault.destroy();
    }
  });
  test('adding 100 secrets on efs', async () => {
    jest.setTimeout(300000);
    try {
      await vault.create();
      const efs = vault.EncryptedFS;
      for (let i = 0; i < 100; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        const writePath = path.join(dataDir, vault.vaultId, name);
        await efs.promises.mkdir(path.dirname(writePath), {
          recursive: true,
        });
        await efs.promises.writeFile(writePath, content, {});
        await expect(vault.getSecret(name)).resolves.toStrictEqual(content);

        expect(
          vault.EncryptedFS.existsSync(path.join(dataDir, vault.vaultId, name)),
        ).toBe(true);
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
    try {
      await vault.create();
      await vault.initializeVault();
      for (let i = 0; i < 10; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        await vault.addSecret(name, content);
        await expect(vault.getSecret(name)).resolves.toStrictEqual(content);

        expect(
          vault.EncryptedFS.existsSync(path.join(dataDir, vault.vaultId, name)),
        ).toBe(true);
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
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await vault.deleteSecret('secret-1', false);

      expect(fs.existsSync(path.join(dataDir, vault.vaultId, 'secret-1'))).toBe(
        false,
      );
    } finally {
      await vault.destroy();
    }
  });
  test('deleting a secret efs', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await vault.deleteSecret('secret-1', false);

      expect(
        vault.EncryptedFS.existsSync(
          path.join(dataDir, vault.vaultId, 'secret-1'),
        ),
      ).toBe(false);
    } finally {
      await vault.destroy();
    }
  });
  test('deleting a secret within a directory', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.mkdir(path.join('dir-1', 'dir-2'), { recursive: true });
      await vault.addSecret(
        path.join('dir-1', 'dir-2', 'secret-1'),
        Buffer.from('secret-content'),
      );
      await vault.deleteSecret(path.join('dir-1', 'dir-2', 'secret-1'), true);

      expect(
        vault.EncryptedFS.existsSync(
          path.join(dataDir, vault.vaultId, 'dir-1', 'dir-2', 'secret-1'),
        ),
      ).toBe(false);
    } finally {
      await vault.destroy();
    }
  });
  test('deleting a secret 10 times', async () => {
    jest.setTimeout(100000);
    try {
      await vault.create();
      await vault.initializeVault();
      for (let i = 0; i < 10; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        await vault.addSecret(name, content);
        await expect(vault.getSecret(name)).resolves.toStrictEqual(content);
        await vault.deleteSecret(name, true);

        expect(
          vault.EncryptedFS.existsSync(path.join(dataDir, vault.vaultId, name)),
        ).toBe(false);
      }
    } finally {
      await vault.destroy();
    }
  });
  test('renaming a vault', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.renameVault('vault-change');

      expect(fs.existsSync(path.join(dataDir, vault.vaultId))).toBe(true);
    } finally {
      await vault.destroy();
    }
  });
  test('renaming a vault efs', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.renameVault('vault-change');

      expect(
        vault.EncryptedFS.existsSync(path.join(dataDir, vault.vaultId)),
      ).toBe(true);
    } finally {
      await vault.destroy();
    }
  });
  test('renaming a secret', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await vault.renameSecret('secret-1', 'secret-change');

      expect(
        fs.existsSync(path.join(dataDir, vault.vaultId, 'secret-change')),
      ).toBe(true);
    } finally {
      await vault.destroy();
    }
  });
  test('renaming a secret efs', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));
      await vault.renameSecret('secret-1', 'secret-change');

      expect(
        vault.EncryptedFS.existsSync(
          path.join(dataDir, vault.vaultId, 'secret-change'),
        ),
      ).toBe(true);
    } finally {
      await vault.destroy();
    }
  });
  test('renaming a secret within a directory', async () => {
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

      expect(
        vault.EncryptedFS.readdirSync(
          path.join(dataDir, vault.vaultId, 'dir-1', 'dir-2'),
        ),
      ).toEqual([`secret-change`]);
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
    const secretDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    try {
      for (let i = 0; i < 10; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        fs.writeFileSync(path.join(secretDir, name), content);
      }
      await vault.create();
      await vault.initializeVault();
      await vault.addSecretDirectory(secretDir);

      expect(await vault.listSecrets()).toStrictEqual([
        `secret 0`,
        `secret 1`,
        `secret 2`,
        `secret 3`,
        `secret 4`,
        `secret 5`,
        `secret 6`,
        `secret 7`,
        `secret 8`,
        `secret 9`,
      ]);
    } finally {
      await vault.destroy();
    }
  });
  test('adding and committing a secret 300 times on vfs', async () => {
    jest.setTimeout(300000);
    try {
      const vfs = new VirtualFS();
      const fileSystem = { promises: vfs.promises };
      if (!fileSystem) {
        throw Error();
      }
      const vaultName = vault.vaultId;
      vfs.mkdirpSync(path.join(dataDir, vaultName), {
        recursive: true,
      });
      await git.init({
        fs: vfs,
        dir: path.join(dataDir, vaultName),
      });
      await git.commit({
        fs: vfs,
        dir: path.join(dataDir, vaultName),
        author: {
          name: vaultName,
        },
        message: 'Initial Commit',
      });
      vfs.writeFileSync(
        path.join(path.join(dataDir, vaultName), '.git', 'packed-refs'),
        '# pack-refs with: peeled fully-peeled sorted',
      );
      for (let i = 0; i < 300; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        const writePath = path.join(dataDir, vaultName, name);
        await vfs.writeFileSync(writePath, content, {});
        await git.add({
          fs: vfs,
          dir: path.join(dataDir, vaultName),
          filepath: name,
        });
        await git.commit({
          fs: vfs,
          dir: path.join(dataDir, vaultName),
          author: {
            name: vaultName,
          },
          message: `Add secret: ${name}`,
        });

        expect(vfs.existsSync(path.join(dataDir, vaultName, name))).toBe(true);
      }
    } finally {
      await vault.destroy();
    }
  });
  test('adding a directory of 1 secret', async () => {
    const secretDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    try {
      const name = 'secret';
      const content = await getRandomBytes(5);
      fs.writeFileSync(path.join(secretDir, name), content);
      await vault.create();
      await vault.initializeVault();
      await vault.addSecretDirectory(path.join(secretDir));

      expect(
        vault.EncryptedFS.existsSync(
          path.join(dataDir, vault.vaultId, 'secret'),
        ),
      ).toBe(true);
    } finally {
      await fsPromises.rm(secretDir, {
        force: true,
        recursive: true,
      });
      await vault.destroy();
    }
  });
  test('adding a directory of 10 secrets', async () => {
    const secretDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    try {
      for (let i = 0; i < 10; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        fs.writeFileSync(path.join(secretDir, name), content);
      }
      await vault.create();
      await vault.initializeVault();
      await vault.addSecretDirectory(path.join(secretDir));

      for (let j = 0; j < 10; j++) {
        expect(
          vault.EncryptedFS.existsSync(
            path.join(dataDir, vault.vaultId, 'secret ' + j.toString()),
          ),
        ).toBe(true);
      }
    } finally {
      await fsPromises.rm(secretDir, {
        force: true,
        recursive: true,
      });
      await vault.destroy();
    }
  });
  test('adding a directory of 10 secrets with some secrets already existing', async () => {
    const secretDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    try {
      for (let i = 0; i < 10; i++) {
        const name = 'secret ' + i.toString();
        const content = 'this is secret ' + i.toString();
        fs.writeFileSync(path.join(secretDir, name), Buffer.from(content));
      }
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret 8', await getRandomBytes(5));
      await vault.addSecret('secret 9', await getRandomBytes(5));
      await vault.addSecretDirectory(path.join(secretDir));

      for (let j = 0; j < 8; j++) {
        expect(
          vault.EncryptedFS.existsSync(
            path.join(dataDir, vault.vaultId, 'secret ' + j.toString()),
          ),
        ).toBe(true);
      }

      expect(
        vault.EncryptedFS.readFileSync(
          path.join(dataDir, vault.vaultId, 'secret 8'),
        ),
      ).toStrictEqual(Buffer.from('this is secret 8'));
      expect(
        vault.EncryptedFS.readFileSync(
          path.join(dataDir, vault.vaultId, 'secret 9'),
        ),
      ).toStrictEqual(Buffer.from('this is secret 9'));
    } finally {
      await fsPromises.rm(secretDir, {
        force: true,
        recursive: true,
      });
      await vault.destroy();
    }
  });
  test('able to persist data across multiple vault objects', async () => {
    await vault.create();
    await vault.initializeVault();
    await vault.addSecret('secret-1', Buffer.from('secret-content'));

    expect(
      vault.EncryptedFS.existsSync(
        path.join(dataDir, vault.vaultId, 'secret-1'),
      ),
    ).toBe(true);

    const vault2 = new Vault({
      vaultId: id,
      vaultName: name,
      key: key,
      baseDir: dataDir,
      logger: logger,
    });

    const content = await vault2.getSecret('secret-1');
    expect(content.toString()).toBe('secret-content');

    vault.destroy();
    vault2.destroy();
  });
});
