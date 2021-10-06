import type { NodeId } from '@/nodes/types';
import type { VaultId, VaultKey, VaultName } from '@/vaults/types';

import os from 'os';
import path from 'path';
import fs from 'fs';
import git from 'isomorphic-git';
import { VaultInternal } from '@/vaults';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { generateVaultId, generateVaultKey } from '@/vaults/utils';
import { getRandomBytes } from '@/keys/utils';
import { EncryptedFS } from 'encryptedfs';
import * as vaultsErrors from '@/vaults/errors';
import * as utils from '@/utils';
import * as errors from "@/vaults/errors";
import Vault from "@/vaults/old/Vault";

describe('VaultInternal', () => {
  let dataDir: string;
  let dbPath: string;

  let vault: VaultInternal;
  let dbKey: VaultKey;
  let vaultId: VaultId;
  let efs: EncryptedFS;
  const logger = new Logger('Vault', LogLevel.WARN, [new StreamHandler()]);

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    dbKey = await generateVaultKey();
    dbPath = path.join(dataDir, 'db');
    await fs.promises.mkdir(dbPath);
    vaultId = generateVaultId('nodeId' as NodeId);
    efs = await EncryptedFS.createEncryptedFS({
      dbPath,
      dbKey,
      logger,
    });
    vault = await VaultInternal.create({
      vaultId,
      efs,
      logger,
    });
    await vault.start();
  });

  afterEach(async () => {
    await vault.stop();
    await vault.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('is type correct', async () => {
    expect(vault).toBeInstanceOf(VaultInternal);
  });

  describe('version', () => {
    test('can change to the current commit', async () => {
      let commit = (await vault.log(1))[0];
      await vault.version(commit.oid);
      await expect(efs.readdir('.')).resolves.toEqual(['.git']);
      await vault.commit(async (efs) => {
        await efs.writeFile('test', 'testdata');
      });
      commit = (await vault.log(1))[0];
      await vault.version(commit.oid);
      await expect(efs.readFile('test', { encoding: 'utf8' })).resolves.toBe('testdata');
    });
    test('can change commits and preserve the log with no intermediate vault mutation', async () => {
      const initCommit = (await vault.log(1))[0].oid;
      await vault.commit(async (efs) => {
        await efs.writeFile('test1', 'testdata1');
      });
      await vault.commit(async (efs) => {
        await efs.writeFile('test2', 'testdata2');
      });
      await vault.commit(async (efs) => {
        await efs.writeFile('test3', 'testdata3');
      });
      await vault.version(initCommit);
      const endCommit = (await vault.log(1))[0].oid;
      await expect(efs.readdir('.')).resolves.toEqual(['.git']);
      await vault.version(endCommit);
      await expect(efs.readdir('.')).resolves.toEqual(['.git', 'test1', 'test2', 'test3']);
    });
    test('does not allow changing to an unrecognised commit', async () => {
      await expect(() => vault.version('unrecognisedcommit')).rejects.toThrow(vaultsErrors.ErrorVaultCommitUndefined);
      await vault.commit(async (efs) => {
        await efs.writeFile('test1', 'testdata1');
      });
      const secondCommit = (await vault.log(1))[0].oid;
      await vault.commit(async (efs) => {
        await efs.writeFile('test2', 'testdata2');
      });
      await vault.commit(async (efs) => {
        await efs.writeFile('test3', 'testdata3');
      });
      const fourthCommit = (await vault.log(1))[0].oid;
      await vault.version(secondCommit);
      await vault.commit(async (efs) => {
        const fd = await efs.open('test3', 'w');
        await efs.write(fd, 'testdata6', 3, 6);
        await efs.close(fd);
      });
      // console.log(await efs.readFile('test3', { encoding: 'utf8' }));
      await vault.version(fourthCommit);
      // console.log(await vault.log(), await efs.readdir('.'));
      await vault.commit(async (efs) => {
        await efs.writeFile('test4', 'testdata4');
      });
      // console.log(await vault.log(), await efs.readdir('.'), await efs.readFile('test3', { encoding: 'utf8' }));
    });
    test('can change to the HEAD commit', async () => {
      const initCommit = (await vault.log(1))[0].oid;
      await vault.commit(async (efs) => {
        await efs.writeFile('test1', 'testdata1');
      });
      await vault.commit(async (efs) => {
        await efs.writeFile('test2', 'testdata2');
      });
      await vault.commit(async (efs) => {
        await efs.writeFile('test3', 'testdata3');
      });
      await vault.version(initCommit);
      await vault.version('HEAD');
      await expect(efs.readdir('.')).resolves.toEqual(['.git', 'test1', 'test2', 'test3']);
    });
    test('adjusts HEAD after vault mutation, discarding forward and preserving backwards history', async () => {
      const initCommit = (await vault.log(1))[0].oid;
      await vault.commit(async (efs) => {
        await efs.writeFile('test1', 'testdata1');
      });
      const secondCommit = (await vault.log(1))[0].oid;
      await vault.commit(async (efs) => {
        await efs.writeFile('test2', 'testdata2');
      });
      await vault.commit(async (efs) => {
        await efs.writeFile('test3', 'testdata3');
      });
      await vault.version(secondCommit);
      await vault.commit(async (efs) => {
        await efs.writeFile('test4', 'testdata4');
      });
      await expect(efs.readdir('.')).resolves.toEqual(['.git', 'test1', 'test4']);
      await vault.version(initCommit);
      await expect(efs.readdir('.')).resolves.toEqual(['.git']);
    });
  });

  test('creating state on disk', async () => {
    expect(await fs.promises.readdir(dataDir)).toContain('db');
  });
  test.todo('able to destroy an empty vault');
  test('adding a secret', async () => {
    await vault.commit(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content')
    })
  });
  test('adding a secret and getting it', async () => {
    await vault.commit(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content')
    })
    await vault.access(async (efs) => {
      expect((await efs.readFile('secret-1')).toString()).toEqual('secret-content')
    })
  });
  test('able to make directories', async () => {
    await vault.commit(async (efs) => {
      await efs.mkdirp('dir-1')
      await efs.mkdirp('dir-2')
      await efs.mkdirp(path.join('dir-3', 'dir-4'))
      await efs.writeFile(
        path.join('dir-3', 'dir-4', 'secret-1'),
        'secret-content',
      );
    })

    await vault.access(async (efs) => {
      expect(await efs.readdir('.')).toContain('dir-1');
      expect(await efs.readdir('.')).toContain('dir-2');
      expect(await efs.readdir('.')).toContain('dir-3');
      expect(await efs.readdir('dir-3')).toContain('dir-4');
      expect(await efs.readdir(path.join('dir-3', 'dir-4'))).toContain('secret-1');
    })
  });
  test('adding and committing a secret 10 times', async () => {
    for (let i = 0; i < 10; i++) {
      const name = 'secret ' + i.toString();
      const content = 'secret-content';
      await vault.commit(async (efs) => {
        await efs.writeFile(name, content)
      })

      await vault.access(async (efs) => {
        expect(await efs.readdir('.')).toContain(name);
        expect((await efs.readFile(name)).toString()).toEqual(content);
      })
    }
  });
  test('updating secret content', async () => {
    await vault.commit(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content')
    })
    await vault.commit(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content-change')
    })
    await vault.access(async (efs) => {
      expect((await efs.readFile('secret-1')).toString()).toEqual('secret-content-change');
    })
  });
  test('updating secret content within a directory', async () => {
    await vault.commit(async (efs) => {
      await efs.mkdirp(path.join('dir-1', 'dir-2'));
      await efs.writeFile(
        path.join('dir-1', 'dir-2', 'secret-1'),
        'secret-content',
      )
    })
    await vault.commit(async (efs) => {
      await efs.writeFile(
        path.join('dir-1', 'dir-2', 'secret-1'),
        'secret-content-change',
      )
    })

    await vault.access(async (efs) => {
      expect((await efs.readFile(path.join('dir-1', 'dir-2', 'secret-1'))).toString())
        .toEqual('secret-content-change');
    })
  });
  test('updating a secret 10 times', async () => {
    await vault.commit(async (efs) => {
        await efs.writeFile('secret-1', 'secret-content')
      })
    for (let i = 0; i < 10; i++) {
      const content = 'secret-content' + i.toString();
      await vault.commit(async (efs) => {
        await efs.writeFile('secret-1', content)
      })
      await vault.access(async (efs) => {
        expect((await efs.readFile('secret-1')).toString()).toStrictEqual(content);
      });
    }
  });
  test('deleting a secret', async () => {
    await vault.commit(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content');
      await efs.mkdir('dir-1');
      await efs.unlink('secret-1');
    });

    await vault.access(async (efs) => {
      expect(await efs.readdir('.')).not.toContain('secret-1')
    });
  });
  test('deleting a secret within a directory', async () => {
    await vault.commit(async (efs) => {
      await expect(() => efs.mkdir(path.join('dir-1', 'dir-2'))).rejects.toThrow();
      await efs.mkdirp(path.join('dir-1', 'dir-2'));
      await efs.writeFile(
        path.join('dir-1', 'dir-2', 'secret-1'),
        'secret-content',
        );
      await efs.unlink(path.join('dir-1', 'dir-2', 'secret-1'));
      await efs.rmdir(path.join('dir-1', 'dir-2'));
    });
    await vault.access(async (efs) => {
      expect(await efs.readdir('.')).toContain('dir-1')
    });
  });
  test('deleting a secret 10 times', async () => {
    for (let i = 0; i < 10; i++) {
      const name = 'secret ' + i.toString();
      const content = 'secret-content';
      await vault.commit(async (efs) => {
        await efs.writeFile(name, content);
      });
      await vault.access(async (efs) => {
        const secretContent = await efs.readFile(name);
        expect(secretContent.toString()).toStrictEqual(content);
      });
      await vault.commit(async (efs) => {
        await efs.unlink(name);
      })
      await vault.access(async (efs) => {
        expect (await efs.readdir('.')).not.toContain(name);
      });
    }
  }, 40000);

  // test('renaming a vault', async () => {
  //   await vault.start({ key });
  //   await vault.renameVault('vault-change' as VaultName);
  //   expect(vault.vaultName).toEqual('vault-change');
  //   await vault.stop();
  // });

  // test('renaming a secret', async () => {
  //   await vault.start({ key });
  //   await vault.addSecret('secret-1', 'secret-content');
  //   await vault.renameSecret('secret-1', 'secret-change');
  //   await expect(
  //     fs.promises.readdir(path.join(dataDir, vaultId)),
  //   ).resolves.not.toContain('secret-1.data');
  //   await expect(
  //     fs.promises.readdir(path.join(dataDir, vaultId)),
  //   ).resolves.toContain('secret-change.data');
  //   await vault.stop();
  // });

  // test('renaming a secret within a directory', async () => {
  //   await vault.start({ key });
  //   await vault.mkdir(path.join('dir-1', 'dir-2'), { recursive: true });
  //   await vault.addSecret(
  //     path.join('dir-1', 'dir-2', 'secret-1'),
  //     'secret-content',
  //   );
  //   await vault.renameSecret(
  //     path.join('dir-1', 'dir-2', 'secret-1'),
  //     path.join('dir-1', 'dir-2', 'secret-change'),
  //   );
  //   await expect(
  //     fs.promises.readdir(
  //       path.join(dataDir, vaultId, 'dir-1.data', 'dir-2.data'),
  //     ),
  //   ).resolves.toContain(`secret-change.data`);
  //   await vault.stop();
  // });

  // test('listing secrets', async () => {
  //   await vault.start({ key });
  //   await vault.addSecret('secret-1', 'secret-content');
  //   await vault.addSecret('secret-2', 'secret-content');
  //   await vault.mkdir(path.join('dir1', 'dir2'), { recursive: true });
  //   await vault.addSecret(
  //     path.join('dir1', 'dir2', 'secret-3'),
  //     'secret-content',
  //   );
  //   expect((await vault.listSecrets()).sort()).toStrictEqual(
  //     ['secret-1', 'secret-2', 'dir1/dir2/secret-3'].sort(),
  //   );
  //   await vault.stop();
  // });

  // test('listing secret directories', async () => {
  //   const secretDir = await fs.promises.mkdtemp(
  //     path.join(os.tmpdir(), 'secret-directory-'),
  //   );
  //   const secretDirName = path.basename(secretDir);
  //   for (let i = 0; i < 10; i++) {
  //     const name = 'secret ' + i.toString();
  //     const content = await getRandomBytes(5);
  //     await fs.promises.writeFile(path.join(secretDir, name), content);
  //   }
  //   await vault.start({ key });
  //   await vault.addSecretDirectory(secretDir);
  //   expect(await vault.listSecrets()).toStrictEqual([
  //     path.join(secretDirName, `secret 0`),
  //     path.join(secretDirName, `secret 1`),
  //     path.join(secretDirName, `secret 2`),
  //     path.join(secretDirName, `secret 3`),
  //     path.join(secretDirName, `secret 4`),
  //     path.join(secretDirName, `secret 5`),
  //     path.join(secretDirName, `secret 6`),
  //     path.join(secretDirName, `secret 7`),
  //     path.join(secretDirName, `secret 8`),
  //     path.join(secretDirName, `secret 9`),
  //   ]);
  //   await vault.stop();
  //   await fs.promises.rm(secretDir, {
  //     force: true,
  //     recursive: true,
  //   });
  // });

  // test('adding hidden files and directories', async () => {
  //   await vault.start({ key });
  //   await vault.addSecret('.hiddenSecret', 'hidden_contents');
  //   await vault.mkdir('.hiddenDir', { recursive: true });
  //   await vault.addSecret('.hiddenDir/.hiddenInSecret', 'hidden_inside');
  //   const list = await vault.listSecrets();
  //   expect(list.sort()).toStrictEqual(
  //     ['.hiddenSecret', '.hiddenDir/.hiddenInSecret'].sort(),
  //   );
  //   await vault.stop();
  // });

  // test('updating and deleting hidden files and directories', async () => {
  //   await vault.start({ key });
  //   await vault.addSecret('.hiddenSecret', 'hidden_contents');
  //   await vault.mkdir('.hiddenDir', { recursive: true });
  //   await vault.addSecret('.hiddenDir/.hiddenInSecret', 'hidden_inside');
  //   await vault.updateSecret('.hiddenSecret', 'change_contents');
  //   await vault.updateSecret('.hiddenDir/.hiddenInSecret', 'change_inside');
  //   await vault.renameSecret('.hiddenSecret', '.hidingSecret');
  //   await vault.renameSecret('.hiddenDir', '.hidingDir');
  //   let list = await vault.listSecrets();
  //   expect(list.sort()).toStrictEqual(
  //     ['.hidingSecret', '.hidingDir/.hiddenInSecret'].sort(),
  //   );
  //   await expect(vault.getSecret('.hidingSecret')).resolves.toStrictEqual(
  //     'change_contents',
  //   );
  //   await expect(
  //     vault.getSecret('.hidingDir/.hiddenInSecret'),
  //   ).resolves.toStrictEqual('change_inside');
  //   await vault.deleteSecret('.hidingSecret', { recursive: true });
  //   await vault.deleteSecret('.hidingDir', { recursive: true });
  //   list = await vault.listSecrets();
  //   expect(list.sort()).toStrictEqual([].sort());
  //   await vault.stop();
  // });

  // test(
  //   'adding and committing a secret 100 times on efs',
  //   async () => {
  //     const efs = await EncryptedFS.createEncryptedFS({
  //       dbKey: await getRandomBytes(32),
  //       dbPath: dataDir,
  //     });
  //     const exists = utils.promisify(efs.exists).bind(efs);
  //     const mkdir = utils.promisify(efs.mkdir).bind(efs);
  //     const writeFile = utils.promisify(efs.writeFile).bind(efs);
  //     const vaultId = vault.vaultId;
  //     await mkdir(path.join(dataDir, vaultId), {
  //       recursive: true,
  //     });
  //     await git.init({
  //       fs: efs,
  //       dir: path.join(dataDir, vaultId),
  //     });
  //     await git.commit({
  //       fs: efs,
  //       dir: path.join(dataDir, vaultId),
  //       author: {
  //         name: vaultId,
  //       },
  //       message: 'Initial Commit',
  //     });
  //     await writeFile(
  //       path.join(path.join(dataDir, vaultId), '.git', 'packed-refs'),
  //       '# pack-refs with: peeled fully-peeled sorted',
  //     );
  //     for (let i = 0; i < 100; i++) {
  //       const name = 'secret ' + i.toString();
  //       const content = await getRandomBytes(5);
  //       const writePath = path.join(dataDir, vaultId, name);
  //       await writeFile(writePath, content, {});
  //       await git.add({
  //         fs: efs,
  //         dir: path.join(dataDir, vaultId),
  //         filepath: name,
  //       });
  //       await git.commit({
  //         fs: efs,
  //         dir: path.join(dataDir, vaultId),
  //         author: {
  //           name: vaultId,
  //         },
  //         message: `Add secret: ${name}`,
  //       });
  //
  //       await expect(exists(path.join(dataDir, vaultId, name))).resolves.toBe(
  //         true,
  //       );
  //     }
  //   },
  //   global.defaultTimeout * 2,
  // );

  // test('adding a directory of 1 secret', async () => {
  //   const secretDir = await fs.promises.mkdtemp(
  //     path.join(os.tmpdir(), 'secret-directory-'),
  //   );
  //   const secretDirName = path.basename(secretDir);
  //   const name = 'secret';
  //   const content = await getRandomBytes(5);
  //   await fs.promises.writeFile(path.join(secretDir, name), content);
  //   await vault.start({ key });
  //   await vault.addSecretDirectory(path.join(secretDir));
  //   await expect(
  //     fs.promises.readdir(path.join(dataDir, vaultId, `${secretDirName}.data`)),
  //   ).resolves.toContain('secret.data');
  //   await vault.stop();
  //   await fs.promises.rm(secretDir, {
  //     force: true,
  //     recursive: true,
  //   });
  // });

  // test('getting the stats of a vault', async () => {
  //   await vault.start({ key });
  //   const stats = await vault.stats();
  //   expect(stats).toBeInstanceOf(fs.Stats);
  //   await vault.stop();
  // });

  // test('adding a directory with subdirectories and files', async () => {
  //   const secretDir = await fs.promises.mkdtemp(
  //     path.join(os.tmpdir(), 'secret-directory-'),
  //   );
  //   const secretDirName = path.basename(secretDir);
  //   await fs.promises.mkdir(path.join(secretDir, 'dir1'));
  //   await fs.promises.mkdir(path.join(secretDir, 'dir1', 'dir2'));
  //   await fs.promises.mkdir(path.join(secretDir, 'dir3'));
  //
  //   await fs.promises.writeFile(path.join(secretDir, 'secret1'), 'secret1');
  //   await fs.promises.writeFile(
  //     path.join(secretDir, 'dir1', 'secret2'),
  //     'secret2',
  //   );
  //   await fs.promises.writeFile(
  //     path.join(secretDir, 'dir1', 'dir2', 'secret3'),
  //     'secret3',
  //   );
  //   await fs.promises.writeFile(
  //     path.join(secretDir, 'dir3', 'secret4'),
  //     'secret4',
  //   );
  //   await fs.promises.writeFile(
  //     path.join(secretDir, 'dir3', 'secret5'),
  //     'secret5',
  //   );
  //   await vault.start({ key });
  //   await vault.addSecretDirectory(path.join(secretDir));
  //   const list = await vault.listSecrets();
  //   expect(list.sort()).toStrictEqual(
  //     [
  //       path.join(secretDirName, 'secret1'),
  //       path.join(secretDirName, 'dir1', 'secret2'),
  //       path.join(secretDirName, 'dir1', 'dir2', 'secret3'),
  //       path.join(secretDirName, 'dir3', 'secret4'),
  //       path.join(secretDirName, 'dir3', 'secret5'),
  //     ].sort(),
  //   );
  //   await vault.stop();
  //   await fs.promises.rm(secretDir, {
  //     force: true,
  //     recursive: true,
  //   });
  // });

  // test('testing the errors handling of adding secret directories', async () => {
  //   const secretDir = await fs.promises.mkdtemp(
  //     path.join(os.tmpdir(), 'secret-directory-'),
  //   );
  //   const secretDirName = path.basename(secretDir);
  //   await fs.promises.mkdir(path.join(secretDir, 'dir1'));
  //   await fs.promises.mkdir(path.join(secretDir, 'dir1', 'dir2'));
  //   await fs.promises.mkdir(path.join(secretDir, 'dir3'));
  //   await fs.promises.writeFile(path.join(secretDir, 'secret1'), 'secret1');
  //   await fs.promises.writeFile(
  //     path.join(secretDir, 'dir1', 'secret2'),
  //     'secret2',
  //   );
  //   await fs.promises.writeFile(
  //     path.join(secretDir, 'dir1', 'dir2', 'secret3'),
  //     'secret3',
  //   );
  //   await fs.promises.writeFile(
  //     path.join(secretDir, 'dir3', 'secret4'),
  //     'secret4',
  //   );
  //   await fs.promises.writeFile(
  //     path.join(secretDir, 'dir3', 'secret5'),
  //     'secret5',
  //   );
  //   await vault.start({ key });
  //   await vault.mkdir(secretDirName, { recursive: true });
  //   await vault.addSecret(
  //     path.join(secretDirName, 'secret1'),
  //     'blocking-secret',
  //   );
  //   await vault.addSecretDirectory(secretDir);
  //   const list = await vault.listSecrets();
  //   expect(list.sort()).toStrictEqual(
  //     [
  //       path.join(secretDirName, 'secret1'),
  //       path.join(secretDirName, 'dir1', 'secret2'),
  //       path.join(secretDirName, 'dir1', 'dir2', 'secret3'),
  //       path.join(secretDirName, 'dir3', 'secret4'),
  //       path.join(secretDirName, 'dir3', 'secret5'),
  //     ].sort(),
  //   );
  //   await vault.start({ key });
  //   await fs.promises.rm(secretDir, {
  //     force: true,
  //     recursive: true,
  //   });
  // });

  // test('adding a directory of 100 secrets with some secrets already existing', async () => {
  //   const secretDir = await fs.promises.mkdtemp(
  //     path.join(os.tmpdir(), 'secret-directory-'),
  //   );
  //   const secretDirName = path.basename(secretDir);
  //   for (let i = 0; i < 50; i++) {
  //     const name = 'secret ' + i.toString();
  //     const content = 'this is secret ' + i.toString();
  //     await fs.promises.writeFile(
  //       path.join(secretDir, name),
  //       Buffer.from(content),
  //     );
  //   }
  //   await vault.start({ key });
  //   await vault.mkdir(secretDirName, { recursive: false });
  //   await vault.addSecret(
  //     path.join(secretDirName, 'secret 8'),
  //     'secret-content',
  //   );
  //   await vault.addSecret(
  //     path.join(secretDirName, 'secret 9'),
  //     'secret-content',
  //   );
  //   await vault.addSecretDirectory(secretDir);
  //
  //   for (let j = 0; j < 8; j++) {
  //     await expect(
  //       fs.promises.readdir(
  //         path.join(dataDir, vaultId, `${secretDirName}.data`),
  //       ),
  //     ).resolves.toContain('secret ' + j.toString() + '.data');
  //   }
  //   await expect(
  //     vault.getSecret(path.join(secretDirName, 'secret 8')),
  //   ).resolves.toStrictEqual('this is secret 8');
  //   await expect(
  //     vault.getSecret(path.join(secretDirName, 'secret 9')),
  //   ).resolves.toStrictEqual('this is secret 9');
  //   await vault.stop();
  //   await fs.promises.rm(secretDir, {
  //     force: true,
  //     recursive: true,
  //   });
  // });

  // test('able to persist data across multiple vault objects', async () => {
  //   await vault.start({ key });
  //   await vault.addSecret('secret-1', 'secret-content');
  //   await expect(
  //     fs.promises.readdir(path.join(dataDir, vaultId)),
  //   ).resolves.toContain('secret-1.data');
  //   const vault2 = new Vault({
  //     vaultId: vaultId,
  //     vaultName: name,
  //     baseDir: efsDir,
  //     fs: fs,
  //     logger: logger,
  //   });
  //   await vault2.start({ key });
  //   const content = await vault2.getSecret('secret-1');
  //   expect(content).toBe('secret-content');
  //   await vault2.stop();
  // });

});
