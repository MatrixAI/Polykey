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
    expect(vault.EncryptedFS.existsSync(vault.vaultId)).toBe(true);
  });
  test('able to destroy an empty vault', async () => {
    await vault.create();
    expect(vault.EncryptedFS.existsSync(vault.vaultId)).toBe(true);
    await vault.destroy();
    expect(vault.EncryptedFS.existsSync(vault.vaultId)).toBe(false);
  });
  test('adding a secret', async () => {
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret-1', Buffer.from('secret-content'));

      expect(
        vault.EncryptedFS.existsSync(path.join(vault.vaultId, 'secret-1')),
      ).toBe(true);
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
        vault.EncryptedFS.existsSync(path.join(vault.vaultId, 'secret-1')),
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

      expect(
        vault.EncryptedFS.existsSync(path.join(vault.vaultId, 'secret-1')),
      ).toBe(true);
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

      expect(
        vault.EncryptedFS.existsSync(path.join(vault.vaultId, 'dir-1')),
      ).toBe(true);
      expect(
        vault.EncryptedFS.existsSync(path.join(vault.vaultId, 'dir-2')),
      ).toBe(true);
      expect(
        vault.EncryptedFS.existsSync(
          path.join(vault.vaultId, 'dir-3', 'dir-4'),
        ),
      ).toBe(true);
      expect(
        vault.EncryptedFS.existsSync(
          path.join(vault.vaultId, 'dir-3', 'dir-4', 'secret-1'),
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
        const writePath = path.join(vault.vaultId, name);
        efs.mkdirSync(path.dirname(writePath), {
          recursive: true,
        });
        efs.writeFileSync(writePath, content, {});
        await expect(vault.getSecret(name)).resolves.toStrictEqual(content);

        expect(
          vault.EncryptedFS.existsSync(path.join(vault.vaultId, name)),
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
          vault.EncryptedFS.existsSync(path.join(vault.vaultId, name)),
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
        vault.EncryptedFS.existsSync(path.join(vault.vaultId, 'secret-1')),
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
          path.join(vault.vaultId, 'dir-1', 'dir-2', 'secret-1'),
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
          vault.EncryptedFS.existsSync(path.join(vault.vaultId, name)),
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

      expect(vault.EncryptedFS.existsSync(path.join(vault.vaultId))).toBe(true);
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
        vault.EncryptedFS.existsSync(path.join(vault.vaultId, 'secret-change')),
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
          path.join(vault.vaultId, 'dir-1', 'dir-2'),
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
      await vault.create();
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
  test('adding and committing a secret 300 times on efs', async () => {
    jest.setTimeout(300000);
    try {
      await vault.create();
      const efs = vault.EncryptedFS;
      const fileSystem = efs;
      if (!fileSystem) {
        throw Error();
      }
      const vaultId = vault.vaultId;
      efs.mkdirSync(path.join(dataDir, vaultId), {
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
      efs.writeFileSync(
        path.join(path.join(dataDir, vaultId), '.git', 'packed-refs'),
        '# pack-refs with: peeled fully-peeled sorted',
      );
      for (let i = 0; i < 300; i++) {
        const name = 'secret ' + i.toString();
        const content = await getRandomBytes(5);
        const writePath = path.join(dataDir, vaultId, name);
        efs.writeFileSync(writePath, content, {});
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

        expect(efs.existsSync(path.join(dataDir, vaultId, name))).toBe(true);
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
        vault.EncryptedFS.existsSync(path.join(vault.vaultId, 'secret')),
      ).toBe(true);
    } finally {
      await fsPromises.rm(secretDir, {
        force: true,
        recursive: true,
      });
      await vault.destroy();
    }
  });
  test('a directory of 100 secrets', async () => {
    jest.setTimeout(300000);
    try {
      await vault.create();
      await vault.initializeVault();
      await vault.addSecret('secret', Buffer.from('content'));
      for (let i = 0; i < 100; i++) {
        await vault.updateSecret(
          'secret',
          Buffer.from('this is secret ' + i.toString()),
        );
        expect(
          vault.EncryptedFS.readFileSync(path.join(vault.vaultId, 'secret'), {
            encoding: 'utf8',
          }),
        ).toBe('this is secret ' + i.toString());
      }
    } finally {
      vault.destroy();
    }
  });
  test('adding a directory of 100 secrets with some secrets already existing', async () => {
    jest.setTimeout(300000);
    const secretDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), 'secret-directory-'),
    );
    try {
      for (let i = 0; i < 100; i++) {
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
            path.join(vault.vaultId, 'secret ' + j.toString()),
          ),
        ).toBe(true);
      }

      expect(
        vault.EncryptedFS.readFileSync(path.join(vault.vaultId, 'secret 8')),
      ).toStrictEqual(Buffer.from('this is secret 8'));
      expect(
        vault.EncryptedFS.readFileSync(path.join(vault.vaultId, 'secret 9')),
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
      vault.EncryptedFS.existsSync(path.join(vault.vaultId, 'secret-1')),
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

    await vault.destroy();
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
