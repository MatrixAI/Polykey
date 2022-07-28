import type { VaultId } from '@/vaults/types';
import type { Vault } from '@/vaults/Vault';
import type KeyManager from '@/keys/KeyManager';
import type { LevelPath } from '@matrixai/db';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { DB } from '@matrixai/db';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { EncryptedFS } from 'encryptedfs';
import git from 'isomorphic-git';
import { tagLast } from '@/vaults/types';
import VaultInternal from '@/vaults/VaultInternal';
import * as vaultsErrors from '@/vaults/errors';
import { sleep } from '@/utils';
import * as keysUtils from '@/keys/utils';
import * as vaultsUtils from '@/vaults/utils';
import * as nodeTestUtils from '../nodes/utils';

describe('VaultInternal', () => {
  const logger = new Logger('Vault', LogLevel.WARN, [new StreamHandler()]);

  let dataDir: string;
  let efsDbPath: string;

  let vault: VaultInternal;
  let dbKey: Buffer;
  let vaultId: VaultId;
  let efs: EncryptedFS;

  let db: DB;
  let vaultsDbPath: LevelPath;

  const fakeKeyManager = {
    getNodeId: () => {
      return nodeTestUtils.generateRandomNodeId();
    },
  } as KeyManager;
  const secret1 = { name: 'secret-1', content: 'secret-content-1' };
  const secret2 = { name: 'secret-2', content: 'secret-content-2' };
  const secret3 = { name: 'secret-3', content: 'secret-content-3' };

  const runGen = async (gen) => {
    for await (const _ of gen) {
      // Do nothing
    }
  };

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    dbKey = await keysUtils.generateKey();
    efsDbPath = path.join(dataDir, 'efsDb');
    await fs.promises.mkdir(efsDbPath);
    efs = await EncryptedFS.createEncryptedFS({
      dbPath: efsDbPath,
      dbKey,
      // @ts-ignore - version of js-logger is incompatible (remove when EFS logger updates to 3.*)
      logger,
    });
    await efs.start();

    db = await DB.createDB({
      crypto: {
        key: await keysUtils.generateKey(),
        ops: {
          encrypt: keysUtils.encryptWithKey,
          decrypt: keysUtils.decryptWithKey,
        },
      },
      dbPath: path.join(dataDir, 'db'),
      fs: fs,
      // @ts-ignore - version of js-logger is incompatible (remove when EFS logger updates to 3.*)
      logger: logger,
    });
    vaultsDbPath = ['vaults'];

    vaultId = vaultsUtils.generateVaultId();
    vault = await VaultInternal.createVaultInternal({
      vaultId,
      keyManager: fakeKeyManager,
      efs,
      logger,
      fresh: true,
      db,
      vaultsDbPath,
      vaultName: 'testVault',
    });
  });

  afterEach(async () => {
    await vault.stop();
    await vault.destroy();
    await db.stop();
    await db.destroy();
    await efs.stop();
    await efs.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('VaultInternal readiness', async () => {
    await vault.stop();
    await expect(async () => {
      await vault.log();
    }).rejects.toThrow(vaultsErrors.ErrorVaultNotRunning);
    await vault.destroy();
    await expect(async () => {
      await vault.start();
    }).rejects.toThrow(vaultsErrors.ErrorVaultDestroyed);
  });
  test('is type correct', async () => {
    expect(vault).toBeInstanceOf(VaultInternal);
  });
  test('creating state on disk', async () => {
    expect(await fs.promises.readdir(dataDir)).toContain('db');
  });
  test('accessing a change', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content');
    });
    await vault.readF(async (efs) => {
      expect(await efs.readdir('.')).toContain('secret-1');
      expect((await efs.readFile('secret-1')).toString()).toStrictEqual(
        'secret-content',
      );
    });
  });
  test('maintains data across VaultInternal instances', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content');
    });
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-2', 'secret-content');
    });
    await vault.stop();
    vault = await VaultInternal.createVaultInternal({
      vaultId,
      keyManager: fakeKeyManager,
      efs,
      logger,
      fresh: false,
      db,
      vaultName: 'testVault1',
      vaultsDbPath,
    });
    await vault.readF(async (efs) => {
      expect((await efs.readFile('secret-1')).toString()).toStrictEqual(
        'secret-content',
      );
    });
  });
  // Mutation and history
  test('can change to the current commit', async () => {
    let commit = (await vault.log(undefined, 1))[0];
    await vault.version(commit.commitId);
    const files = await vault.readF(async (efs) => {
      return await efs.readdir('.');
    });
    expect(files).toEqual([]);
    await vault.writeF(async (efs) => {
      await efs.writeFile('test', 'testdata');
    });
    commit = (await vault.log(undefined, 1))[0];
    await vault.version(commit.commitId);
    const file = await vault.readF(async (efs) => {
      return await efs.readFile('test', { encoding: 'utf8' });
    });
    expect(file).toBe('testdata');
  });
  test('can change commits and preserve the log with no intermediate vault mutation', async () => {
    const initCommit = (await vault.log(undefined, 1))[0].commitId;
    await vault.writeF(async (efs) => {
      await efs.writeFile('test1', 'testdata1');
    });
    await vault.writeF(async (efs) => {
      await efs.writeFile('test2', 'testdata2');
    });
    await vault.writeF(async (efs) => {
      await efs.writeFile('test3', 'testdata3');
    });
    const endCommit = (await vault.log(undefined, 1))[0].commitId;
    await vault.version(initCommit);
    let files = await vault.readF(async (efs) => {
      return await efs.readdir('.');
    });
    expect(files).toEqual([]);
    await vault.version(endCommit);
    files = await vault.readF(async (efs) => {
      return await efs.readdir('.');
    });
    expect(files).toEqual(['test1', 'test2', 'test3']);
  });
  test('does not allow changing to an unrecognised commit', async () => {
    await expect(() => vault.version('unrecognisedcommit')).rejects.toThrow(
      vaultsErrors.ErrorVaultReferenceInvalid,
    );
    await vault.writeF(async (efs) => {
      await efs.writeFile('test1', 'testdata1');
    });
    const secondCommit = (await vault.log(undefined, 1))[0].commitId;
    await vault.writeF(async (efs) => {
      await efs.writeFile('test2', 'testdata2');
    });
    await vault.writeF(async (efs) => {
      await efs.writeFile('test3', 'testdata3');
    });
    const fourthCommit = (await vault.log(undefined, 1))[0].commitId;
    await vault.version(secondCommit);
    await vault.writeF(async (efs) => {
      const fd = await efs.open('test3', 'w');
      await efs.write(fd, 'testdata6', 3, 6);
      await efs.close(fd);
    });
    await expect(vault.version(fourthCommit)).rejects.toThrow(
      vaultsErrors.ErrorVaultReferenceMissing,
    );
  });
  test('can change to the latest commit', async () => {
    const initCommit = (await vault.log(undefined, 1))[0].commitId;
    await vault.writeF(async (efs) => {
      await efs.writeFile('test1', 'testdata1');
    });
    await vault.writeF(async (efs) => {
      await efs.writeFile('test2', 'testdata2');
    });
    await vault.writeF(async (efs) => {
      await efs.writeFile('test3', 'testdata3');
    });
    await vault.version(initCommit);
    await vault.version(tagLast);
    let files = await vault.readF(async (efs) => {
      return await efs.readdir('.');
    });
    expect(files).toEqual(['test1', 'test2', 'test3']);
    await vault.version(initCommit);
    await vault.version('last');
    files = await vault.readF(async (efs) => {
      return await efs.readdir('.');
    });
    expect(files).toEqual(['test1', 'test2', 'test3']);
  });
  test(
    'adjusts HEAD after vault mutation, discarding forward and preserving backwards history',
    async () => {
      const initCommit = (await vault.log(undefined, 1))[0].commitId;
      await vault.writeF(async (efs) => {
        await efs.writeFile('test1', 'testdata1');
      });
      const secondCommit = (await vault.log(undefined, 1))[0].commitId;
      await vault.writeF(async (efs) => {
        await efs.writeFile('test2', 'testdata2');
      });
      await vault.writeF(async (efs) => {
        await efs.writeFile('test3', 'testdata3');
      });
      await vault.version(secondCommit);
      await vault.writeF(async (efs) => {
        await efs.writeFile('test4', 'testdata4');
      });
      let files = await vault.readF(async (efs) => {
        return await efs.readdir('.');
      });
      expect(files).toEqual(['test1', 'test4']);
      await vault.version(initCommit);
      files = await vault.readF(async (efs) => {
        return await efs.readdir('.');
      });
      expect(files).toEqual([]);
    },
    global.defaultTimeout * 2,
  );
  test('write operation allowed', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content');
    });
  });
  test('read operation allowed', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile(secret1.name, secret1.content);
      await efs.writeFile(secret2.name, secret2.content);
    });
    await vault.readF(async (efs) => {
      expect((await efs.readFile(secret1.name)).toString()).toEqual(
        secret1.content,
      );
    });
  });
  test('concurrent write operations prevented', async () => {
    await Promise.all([
      vault.writeF(async (efs) => {
        await efs.writeFile('secret-1', 'secret-content-1');
      }),
      vault.writeF(async (efs) => {
        await efs.writeFile('secret-2', 'secret-content-2');
      }),
      vault.writeF(async (efs) => {
        await efs.writeFile('secret-3', 'secret-content-3');
      }),
    ]);

    await vault.readF(async (efs) => {
      const directory = await efs.readdir('.');
      expect(directory).toContain('secret-1');
      expect(directory).toContain('secret-2');
      expect(directory).toContain('secret-3');
    });
    const log = await vault.log();
    expect(log.length).toEqual(4);
  });
  test('commit added if mutation in writeF', async () => {
    const commit = (await vault.log())[0].commitId;
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content');
    });
    const log = await vault.log();
    expect(log).toHaveLength(2);
    expect(log[0].commitId).not.toStrictEqual(commit);
  });
  test('no commit added if no mutation in write', async () => {
    const commit = (await vault.log())[0].commitId;
    await vault.writeF(async (_efs) => {});
    const log = await vault.log();
    expect(log).toHaveLength(1);
    expect(log[0].message).not.toContain('secret-1');
    expect(log[0].commitId).toStrictEqual(commit);
  });
  test('commit message contains all actions made in the commit', async () => {
    // Adding
    await vault.writeF(async (efs) => {
      await efs.writeFile(secret1.name, secret1.content);
      await efs.writeFile(secret2.name, secret2.content);
    });
    let log = await vault.log();
    expect(log[0].message).toContain(`${secret1.name} added`);
    expect(log[0].message).toContain(`${secret2.name} added`);
    // Checking contents
    await vault.readF(async (efs) => {
      expect((await efs.readFile(secret1.name)).toString()).toEqual(
        secret1.content,
      );
      expect((await efs.readFile(secret2.name)).toString()).toEqual(
        secret2.content,
      );
    });

    // Modifying
    await vault.writeF(async (efs) => {
      await efs.writeFile(secret2.name, `${secret2.content} new content`);
    });
    log = await vault.log();
    expect(log[0].message).toContain(`${secret2.name} modified`);
    // Checking changes
    await vault.readF(async (efs) => {
      expect((await efs.readFile(secret2.name)).toString()).toEqual(
        `${secret2.content} new content`,
      );
    });

    // Moving and removing
    await vault.writeF(async (efs) => {
      await efs.rename(secret1.name, `${secret1.name}-new`);
      await efs.unlink(secret2.name);
    });
    // Checking changes
    await vault.readF(async (efs) => {
      expect(await efs.exists(secret1.name)).toBeFalsy();
      expect(await efs.exists(`${secret1.name}-new`)).toBeTruthy();
      expect(await efs.exists(secret2.name)).toBeFalsy();
    });

    log = await vault.log();
    expect(log[0].message).toContain(`${secret1.name}-new added`);
    expect(log[0].message).toContain(`${secret1.name} deleted`);
    expect(log[0].message).toContain(`${secret2.name} deleted`);
  });
  test('no mutation to vault when part of a commit operation fails', async () => {
    // Failing commit operation
    await expect(() =>
      vault.writeF(async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
        await efs.rename('notValid', 'randomName'); // Throws
      }),
    ).rejects.toThrow();

    // Make sure secret1 wasn't written when the above commit failed
    await vault.readF(async (efs) => {
      expect(await efs.readdir('.')).not.toContain(secret1.name);
    });

    // No new commit
    expect(await vault.log()).toHaveLength(1);

    // Succeeding commit operation
    await vault.writeF(async (efs) => {
      await efs.writeFile(secret2.name, secret2.content);
    });

    // Secret 1 shouldn't exist while secret2 exists
    await vault.readF(async (efs) => {
      const directory = await efs.readdir('.');
      expect(directory).not.toContain(secret1.name); //
      expect(directory).toContain(secret2.name);
    });

    // Has a new commit
    expect(await vault.log()).toHaveLength(2);
  });
  test('concurrent read operations allowed', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile(secret1.name, secret1.content);
      await efs.writeFile(secret2.name, secret2.content);
    });
    await vault.readF(async (efs) => {
      expect((await efs.readFile(secret1.name)).toString()).toEqual(
        secret1.content,
      );
      expect((await efs.readFile(secret2.name)).toString()).toEqual(
        secret2.content,
      );
      expect((await efs.readFile(secret1.name)).toString()).toEqual(
        secret1.content,
      );
    });

    await Promise.all([
      vault.readF(async (efs) => {
        expect((await efs.readFile(secret1.name)).toString()).toEqual(
          secret1.content,
        );
      }),
      vault.readF(async (efs) => {
        expect((await efs.readFile(secret2.name)).toString()).toEqual(
          secret2.content,
        );
      }),
      vault.readF(async (efs) => {
        expect((await efs.readFile(secret1.name)).toString()).toEqual(
          secret1.content,
        );
      }),
    ]);
  });
  test('no commit after read', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile(secret1.name, secret1.content);
      await efs.writeFile(secret2.name, secret2.content);
    });
    const commit = (await vault.log())[0].commitId;
    await vault.readF(async (efs) => {
      expect((await efs.readFile(secret1.name)).toString()).toEqual(
        secret1.content,
      );
    });
    const log = await vault.log();
    expect(log).toHaveLength(2);
    expect(log[0].commitId).toStrictEqual(commit);
  });
  test('only exposes limited commands of VaultInternal', async () => {
    // Converting a vault to the interface
    const vaultInterface = vault as Vault;

    // Using the avaliable functions
    await vaultInterface.writeF(async (efs) => {
      await efs.writeFile('test', 'testContent');
    });

    await vaultInterface.readF(async (efs) => {
      const content = (await efs.readFile('test')).toString();
      expect(content).toStrictEqual('testContent');
    });

    expect(vaultInterface.vaultDataDir).toBeTruthy();
    expect(vaultInterface.vaultGitDir).toBeTruthy();
    expect(vaultInterface.vaultId).toBeTruthy();
    expect(vaultInterface.writeF).toBeTruthy();
    expect(vaultInterface.writeG).toBeTruthy();
    expect(vaultInterface.readF).toBeTruthy();
    expect(vaultInterface.readG).toBeTruthy();
    expect(vaultInterface.log).toBeTruthy();
    expect(vaultInterface.version).toBeTruthy();

    // Can we convert back?
    const vaultNormal = vaultInterface as VaultInternal;
    expect(vaultNormal.destroy).toBeTruthy(); // This exists again
  });
  test('cannot commit when the remote field is set', async () => {
    // Write remote metadata
    await db.put(
      [
        ...vaultsDbPath,
        vaultsUtils.encodeVaultId(vaultId),
        VaultInternal.remoteKey,
      ],
      { remoteNode: '', remoteVault: '' },
    );
    const commit = (await vault.log(undefined, 1))[0];
    await vault.version(commit.commitId);
    const files = await vault.readF(async (efs) => {
      return await efs.readdir('.');
    });
    expect(files).toEqual([]);
    await expect(
      vault.writeF(async (efs) => {
        await efs.writeFile('test', 'testdata');
      }),
    ).rejects.toThrow(vaultsErrors.ErrorVaultRemoteDefined);
  });
  test(
    'cannot checkout old commits after branching commit',
    async () => {
      await vault.writeF(async (efs) => {
        await efs.writeFile('test1', 'testdata1');
      });
      const secondCommit = (await vault.log(undefined, 1))[0].commitId;
      await vault.writeF(async (efs) => {
        await efs.writeFile('test2', 'testdata2');
      });
      const thirdCommit = (await vault.log(undefined, 1))[0].commitId;
      await vault.writeF(async (efs) => {
        await efs.writeFile('test3', 'testdata3');
      });
      const fourthCommit = (await vault.log(undefined, 1))[0].commitId;
      await vault.version(secondCommit);
      await vault.writeF(async (efs) => {
        await efs.writeFile('test4', 'testdata4');
      });
      await expect(() => {
        return vault.version(thirdCommit);
      }).rejects.toThrow();
      await expect(() => {
        return vault.version(fourthCommit);
      }).rejects.toThrow();
    },
    global.defaultTimeout,
  );
  test('can recover from dirty state', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content');
    });
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-2', 'secret-content');
    });
    // Write files to the working directory
    // @ts-ignore: kidnap vault EFS
    const vaultEFS = vault.efsVault;
    await vaultEFS.writeFile('dirty', 'dirtyData');
    await vaultEFS.writeFile('secret-1', 'dirtyData');
    // Setting dirty flag true
    const vaultMetadataDbPath = [
      ...vaultsDbPath,
      vaultsUtils.encodeVaultId(vaultId),
    ];
    await db.put([...vaultMetadataDbPath, VaultInternal.dirtyKey], true);

    // Restarting vault
    await vault.stop();
    await vault.start({});

    // Checking if working directory was cleaned
    // and head was moved to latest commit
    await vault.readF(async (efs) => {
      const files = await efs.readdir('.');
      expect(files).toContain('secret-1');
      expect((await efs.readFile('secret-1')).toString()).toEqual(
        'secret-content',
      );
      expect(files).toContain('secret-2');
      expect(files).not.toContain('dirty');
    });
  });
  test('clean errant commits recovering from dirty state', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content');
    });
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-2', 'secret-content');
    });
    // Creating out of history commits
    // @ts-ignore: kidnap vault EFS
    const vaultEFS = vault.efs;
    const log = await vault.log();
    const ref = log[1].commitId;
    await efs.writeFile(path.join(vault.vaultDataDir, 'newfile1'), 'hello');
    const newRef1 = await git.commit({
      fs: vaultEFS,
      dir: vault.vaultDataDir,
      gitdir: vault.vaultGitDir,
      author: {
        name: 'test',
        email: 'test',
      },
      message: 'test',
      ref: ref,
    });
    await efs.writeFile(path.join(vault.vaultDataDir, 'newfile2'), 'world');
    const newRef2 = await git.commit({
      fs: vaultEFS,
      dir: vault.vaultDataDir,
      gitdir: vault.vaultGitDir,
      author: {
        name: 'test',
        email: 'test',
      },
      message: 'test',
      ref: newRef1,
    });

    // Setting dirty flag true
    const vaultMetadataDbPath = [
      ...vaultsDbPath,
      vaultsUtils.encodeVaultId(vaultId),
    ];
    await db.put([...vaultMetadataDbPath, VaultInternal.dirtyKey], true);

    // Restarting vault
    await vault.stop();
    await vault.start({});

    // Checking if errant commits were cleaned up
    await expect(vault.version(newRef1)).rejects.toThrow();
    await expect(vault.version(newRef2)).rejects.toThrow();
  });
  test('commit added if mutation in writeG', async () => {
    const commit = (await vault.log())[0].commitId;
    const gen = vault.writeG(async function* (efs): AsyncGenerator {
      yield await efs.writeFile('secret-1', 'secret-content');
    });
    for await (const _ of gen) {
      // Do nothing
    }
    const log = await vault.log();
    expect(log).toHaveLength(2);
    expect(log[0].commitId).not.toStrictEqual(commit);
  });
  test('no commit added if no mutation in writeG', async () => {
    const commit = (await vault.log())[0].commitId;
    const gen = vault.writeG(async function* (_efs): AsyncGenerator {});
    for await (const _ of gen) {
      // Do nothing
    }
    const log = await vault.log();
    expect(log).toHaveLength(1);
    expect(log[0].message).not.toContain('secret-1');
    expect(log[0].commitId).toStrictEqual(commit);
  });
  test('no mutation to vault when part of a commit operation fails in writeG', async () => {
    const gen = vault.writeG(async function* (efs): AsyncGenerator {
      yield await efs.writeFile(secret1.name, secret1.content);
      yield await efs.rename('notValid', 'randomName'); // Throws
    });
    // Failing commit operation
    await expect(() => runGen(gen)).rejects.toThrow();

    // Make sure secret1 wasn't written when the above commit failed
    await vault.readF(async (efs) => {
      expect(await efs.readdir('.')).not.toContain(secret1.name);
    });
    // No new commit
    expect(await vault.log()).toHaveLength(1);
  });
  test('no commit after readG', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile(secret1.name, secret1.content);
      await efs.writeFile(secret2.name, secret2.content);
    });
    const commit = (await vault.log())[0].commitId;
    const gen = vault.readG(async function* (efs): AsyncGenerator {
      yield expect((await efs.readFile(secret1.name)).toString()).toEqual(
        secret1.content,
      );
    });
    await runGen(gen);
    const log = await vault.log();
    expect(log).toHaveLength(2);
    expect(log[0].commitId).toStrictEqual(commit);
  });
  test(
    'garbage collection',
    async () => {
      await vault.writeF(async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
      });
      await vault.writeF(async (efs) => {
        await efs.writeFile(secret2.name, secret2.content);
      });
      await vault.writeF(async (efs) => {
        await efs.writeFile(secret3.name, secret3.content);
      });
      // @ts-ignore: kidnap efs
      const vaultEfs = vault.efs;
      // @ts-ignore: kidnap efs
      const vaultEfsData = vault.efsVault;
      const quickCommit = async (ref: string, secret: string) => {
        await vaultEfsData.writeFile(secret, secret);
        await git.add({
          fs: vaultEfs,
          dir: vault.vaultDataDir,
          gitdir: vault.vaultGitDir,
          filepath: secret,
        });
        return await git.commit({
          fs: vaultEfs,
          dir: vault.vaultDataDir,
          gitdir: vault.vaultGitDir,
          author: {
            name: 'test',
            email: 'test',
          },
          message: 'test',
          ref: ref,
        });
      };
      const log = await vault.log();
      let num = 5;
      const refs: string[] = [];
      for (const logElement of log) {
        refs.push(await quickCommit(logElement.commitId, `secret-${num++}`));
      }
      // @ts-ignore: private method
      await vault.garbageCollectGitObjects();

      for (const ref of refs) {
        await expect(
          git.checkout({
            fs: vaultEfs,
            dir: vault.vaultDataDir,
            gitdir: vault.vaultGitDir,
            ref,
          }),
        ).rejects.toThrow(git.Errors.CommitNotFetchedError);
      }
    },
    global.defaultTimeout * 2,
  );
  // Locking tests
  const waitDelay = 200;
  test('writeF respects read and write locking', async () => {
    // @ts-ignore: kidnap lock
    const lock = vault.lock;
    // Hold a write lock
    const [releaseWrite] = await lock.write()();

    let finished = false;
    const writeP = vault.writeF(async () => {
      finished = true;
    });
    await sleep(waitDelay);
    expect(finished).toBe(false);
    await releaseWrite();
    await writeP;
    expect(finished).toBe(true);

    const [releaseRead] = await lock.read()();
    finished = false;
    const writeP2 = vault.writeF(async () => {
      finished = true;
    });
    await sleep(waitDelay);
    await releaseRead();
    await writeP2;
    expect(finished).toBe(true);
  });
  test('writeG respects read and write locking', async () => {
    // @ts-ignore: kidnap lock
    const lock = vault.lock;
    // Hold a write lock
    const [releaseWrite] = await lock.write()();

    let finished = false;
    const writeGen = vault.writeG(async function* () {
      yield;
      finished = true;
      yield;
    });
    const runP = runGen(writeGen);
    await sleep(waitDelay);
    expect(finished).toBe(false);
    await releaseWrite();
    await runP;
    expect(finished).toBe(true);

    const [releaseRead] = await lock.read()();
    finished = false;
    const writeGen2 = vault.writeG(async function* () {
      yield;
      finished = true;
      yield;
    });
    const runP2 = runGen(writeGen2);
    await sleep(waitDelay);
    await releaseRead();
    await runP2;
    expect(finished).toBe(true);
  });
  test('readF respects write locking', async () => {
    // @ts-ignore: kidnap lock
    const lock = vault.lock;
    // Hold a write lock
    const [releaseWrite] = await lock.write()();

    let finished = false;
    const writeP = vault.readF(async () => {
      finished = true;
    });
    await sleep(waitDelay);
    expect(finished).toBe(false);
    await releaseWrite();
    await writeP;
    expect(finished).toBe(true);
  });
  test('readG respects write locking', async () => {
    // @ts-ignore: kidnap lock
    const lock = vault.lock;
    // Hold a write lock
    const [releaseWrite] = await lock.write()();
    let finished = false;
    const writeGen = vault.readG(async function* () {
      yield;
      finished = true;
      yield;
    });
    const runP = runGen(writeGen);
    await sleep(waitDelay);
    expect(finished).toBe(false);
    await releaseWrite();
    await runP;
    expect(finished).toBe(true);
  });
  test('readF allows concurrent reads', async () => {
    // @ts-ignore: kidnap lock
    const lock = vault.lock;
    // Hold a write lock
    const [releaseRead] = await lock.read()();
    const finished: boolean[] = [];
    const doThing = async () => {
      finished.push(true);
    };
    await Promise.all([
      vault.readF(doThing),
      vault.readF(doThing),
      vault.readF(doThing),
      vault.readF(doThing),
    ]);
    expect(finished.length).toBe(4);
    await releaseRead();
  });
  test('readG allows concurrent reads', async () => {
    // @ts-ignore: kidnap lock
    const lock = vault.lock;
    // Hold a write lock
    const [releaseRead] = await lock.read()();
    const finished: boolean[] = [];
    const doThing = async function* () {
      yield;
      finished.push(true);
      yield;
    };
    await Promise.all([
      runGen(vault.readG(doThing)),
      runGen(vault.readG(doThing)),
      runGen(vault.readG(doThing)),
      runGen(vault.readG(doThing)),
    ]);
    expect(finished.length).toBe(4);
    await releaseRead();
  });
  // Life-cycle
  test('can create with CreateVaultInternal', async () => {
    let vault1: VaultInternal | undefined;
    try {
      const vaultId1 = vaultsUtils.generateVaultId();
      vault1 = await VaultInternal.createVaultInternal({
        db,
        efs,
        keyManager: fakeKeyManager,
        vaultId: vaultId1,
        vaultsDbPath,
        logger,
      });
      // Data exists for vault now
      expect(await efs.readdir('.')).toContain(
        vaultsUtils.encodeVaultId(vaultId1),
      );
    } finally {
      await vault1?.stop();
      await vault1?.destroy();
    }
  });
  test('can create an existing vault with CreateVaultInternal', async () => {
    let vault1: VaultInternal | undefined;
    let vault2: VaultInternal | undefined;
    try {
      const vaultId1 = vaultsUtils.generateVaultId();
      vault1 = await VaultInternal.createVaultInternal({
        db,
        efs,
        keyManager: fakeKeyManager,
        vaultId: vaultId1,
        vaultsDbPath,
        logger,
      });
      // Data exists for vault now
      expect(await efs.readdir('.')).toContain(
        vaultsUtils.encodeVaultId(vaultId1),
      );
      await vault1.stop();
      // Data persists
      expect(await efs.readdir('.')).toContain(
        vaultsUtils.encodeVaultId(vaultId1),
      );

      // Re-opening the vault
      vault2 = await VaultInternal.createVaultInternal({
        db,
        efs,
        keyManager: fakeKeyManager,
        vaultId: vaultId1,
        vaultsDbPath,
        logger,
      });

      // Data still exists and no new data was created
      expect(await efs.readdir('.')).toContain(
        vaultsUtils.encodeVaultId(vaultId1),
      );
      expect(await efs.readdir('.')).toHaveLength(2);
    } finally {
      await vault1?.stop();
      await vault1?.destroy();
      await vault2?.stop();
      await vault2?.destroy();
    }
  });
  test('stop is idempotent', async () => {
    // Should complete with no errors
    await vault.stop();
    await vault.stop();
  });
  test('destroy is idempotent', async () => {
    await vault.stop();
    await vault.destroy();
    await vault.destroy();
  });
});
