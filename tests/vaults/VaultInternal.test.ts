import type { VaultId } from '@/vaults/types';
import type { Vault } from '@/vaults/Vault';
import type { KeyManager } from '@/keys';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';
import { EncryptedFS } from 'encryptedfs';
import { VaultInternal } from '@/vaults';
import { generateVaultId } from '@/vaults/utils';
import * as vaultsErrors from '@/vaults/errors';
import { sleep } from '@/utils';
import { utils as keysUtils } from '@/keys';
import * as testsUtils from '../utils';

jest.mock('@/keys/utils', () => ({
  ...jest.requireActual('@/keys/utils'),
  generateDeterministicKeyPair:
    jest.requireActual('@/keys/utils').generateKeyPair,
}));

describe('VaultInternal', () => {
  let dataDir: string;
  let dbPath: string;

  let vault: VaultInternal;
  let dbKey: Buffer;
  let vaultId: VaultId;
  let efs: EncryptedFS;
  const logger = new Logger('Vault', LogLevel.WARN, [new StreamHandler()]);

  const fakeKeyManager = {
    getNodeId: () => {
      return testsUtils.generateRandomNodeId();
    },
  } as KeyManager;
  const secret1 = { name: 'secret-1', content: 'secret-content-1' };
  const secret2 = { name: 'secret-2', content: 'secret-content-2' };

  beforeAll(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    dbKey = await keysUtils.generateKey();
    dbPath = path.join(dataDir, 'db');
    await fs.promises.mkdir(dbPath);
    efs = await EncryptedFS.createEncryptedFS({
      dbPath,
      dbKey,
      logger,
    });
    await efs.start();
  });

  beforeEach(async () => {
    vaultId = generateVaultId();
    vault = await VaultInternal.create({
      vaultId,
      keyManager: fakeKeyManager,
      efs,
      logger,
      fresh: true,
    });
  });

  afterAll(async () => {
    await efs.stop();
    await efs.destroy();
    await fs.promises.rm(dataDir, {
      force: true,
      recursive: true,
    });
  });

  test('VaultInternal readiness', async () => {
    await vault.destroy();
    await expect(async () => {
      await vault.log();
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
    await vault.destroy();
    vault = await VaultInternal.create({
      vaultId,
      keyManager: fakeKeyManager,
      efs,
      logger,
      fresh: false,
    });
    await vault.readF(async (efs) => {
      expect((await efs.readFile('secret-1')).toString()).toStrictEqual(
        'secret-content',
      );
    });
  });
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
    await vault.version(initCommit);
    const endCommit = (await vault.log(undefined, 1))[0].commitId;
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
      vaultsErrors.ErrorVaultReferenceMissing,
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
    await vault.version(fourthCommit);
    await vault.writeF(async (efs) => {
      await efs.writeFile('test4', 'testdata4');
    });
  });
  test('can change to the HEAD commit', async () => {
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
    await vault.version('HEAD');
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
  test('adjusts HEAD after vault mutation, discarding forward and preserving backwards history', async () => {
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
  });
  test('write operation allowed', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content');
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
  test('write locks read', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content');
    });

    await Promise.all([
      vault.writeF(async (efs) => {
        await efs.writeFile('secret-1', 'SUPER-DUPER-SECRET-CONTENT');
      }),
      vault.readF(async (efs) => {
        expect((await efs.readFile('secret-1')).toString()).toEqual(
          'SUPER-DUPER-SECRET-CONTENT',
        );
      }),
    ]);
  });
  test('commit added if mutation in write', async () => {
    const commit = (await vault.log())[0].commitId;
    await vault.writeF(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content');
    });
    const log = await vault.log();
    expect(log).toHaveLength(2);
    expect(log[0].message).toContain('secret-1');
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
    // Checking changes.
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

    // Make sure secret1 wasn't written when the above commit failed.
    await vault.readF(async (efs) => {
      expect(await efs.readdir('.')).not.toContain(secret1.name);
    });

    // No new commit.
    expect(await vault.log()).toHaveLength(1);

    // Succeeding commit operation.
    await vault.writeF(async (efs) => {
      await efs.writeFile(secret2.name, secret2.content);
    });

    // Secret 1 shouldn't exist while secret2 exists.
    await vault.readF(async (efs) => {
      const directory = await efs.readdir('.');
      expect(directory).not.toContain(secret1.name); //
      expect(directory).toContain(secret2.name);
    });

    // Has a new commit.
    expect(await vault.log()).toHaveLength(2);
  });
  test('locking occurs when making a commit.', async () => {
    // We want to check if the locking is happening. so we need a way to see if an operation is being blocked.

    let resolveDelay;
    const delayPromise = new Promise((resolve, _reject) => {
      resolveDelay = resolve;
    });
    let firstCommitResolved = false;
    let firstCommitResolveTime;

    // @ts-ignore
    expect(vault.lock.isLocked()).toBeFalsy();

    const commit1 = vault.writeF(async (efs) => {
      await efs.writeFile(secret1.name, secret1.content);
      await delayPromise; // Hold the lock hostage.
      firstCommitResolved = true;
      firstCommitResolveTime = Date.now();
    });

    // Now that we are holding the lock hostage,
    // @ts-ignore
    expect(vault.lock.isLocked()).toBeTruthy();
    // We want to check if any action resolves before the lock is released.

    let secondCommitResolved = false;
    let secondCommitResolveTime;
    const commit2 = vault.writeF(async (efs) => {
      await efs.writeFile(secret2.name, secret2.content);
      secondCommitResolved = true;
      await sleep(2);
      secondCommitResolveTime = Date.now();
    });

    // Give plenty of time for a commit to resolve.
    await sleep(200);

    // Now we want to check for the expected conditions.
    // 1. Both commist have not completed.
    // commit 1 is holding the lock.
    expect(firstCommitResolved).toBeFalsy();
    expect(secondCommitResolved).toBeFalsy();

    // 2. We release the hostage so both should resolve.
    await sleep(200);
    resolveDelay();
    await commit1;
    await commit2;
    expect(firstCommitResolved).toBeTruthy();
    expect(secondCommitResolved).toBeTruthy();
    expect(secondCommitResolveTime).toBeGreaterThan(firstCommitResolveTime);
    // @ts-ignore
    expect(vault.lock.isLocked()).toBeFalsy();

    // Commit order should be commit2 -> commit1 -> init
    const log = await vault.log();
    expect(log[0].message).toContain(secret2.name);
    expect(log[1].message).toContain(secret1.name);
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
  test('read locks write', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile(secret1.name, secret1.content);
      await efs.writeFile(secret2.name, secret2.content);
    });
    await Promise.all([
      vault.readF(async (efs) => {
        expect((await efs.readFile(secret1.name)).toString()).toEqual(
          secret1.content,
        );
      }),
      vault.writeF(async (efs) => {
        await efs.writeFile(secret1.name, 'NEW-CONTENT');
      }),
      vault.readF(async (efs) => {
        expect((await efs.readFile(secret1.name)).toString()).toEqual(
          'NEW-CONTENT',
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
  test('locking occurs when making an access.', async () => {
    await vault.writeF(async (efs) => {
      await efs.writeFile(secret1.name, secret1.content);
      await efs.writeFile(secret2.name, secret2.content);
    });
    // We want to check if the locking is happening. so we need a way to see if an operation is being blocked.
    let resolveDelay;
    const delayPromise = new Promise((resolve, _reject) => {
      resolveDelay = resolve;
    });
    let firstCommitResolved = false;
    let firstCommitResolveTime;

    // @ts-ignore
    expect(vault.lock.isLocked()).toBeFalsy();

    const commit1 = vault.readF(async (efs) => {
      await efs.readFile(secret1.name);
      await delayPromise; // Hold the lock hostage.
      firstCommitResolved = true;
      firstCommitResolveTime = Date.now();
    });

    // Now that we are holding the lock hostage,
    // we want to check if any action resolves before the lock is released.
    // @ts-ignore
    expect(vault.lock.isLocked()).toBeTruthy();

    let secondCommitResolved = false;
    let secondCommitResolveTime;
    const commit2 = vault.readF(async (efs) => {
      await efs.readFile(secret2.name);
      secondCommitResolved = true;
      await sleep(10);
      secondCommitResolveTime = Date.now();
    });

    // Give plenty of time for a commit to resolve.
    await sleep(200);

    // Now we want to check for the expected conditions.
    // 1. Both commist have not completed.
    // commit 1 is holding the lock.
    expect(firstCommitResolved).toBeFalsy();
    expect(secondCommitResolved).toBeFalsy();

    // 2. We release the hostage so both should resolve.
    await sleep(200);
    resolveDelay();
    await commit1;
    await commit2;
    expect(firstCommitResolved).toBeTruthy();
    expect(secondCommitResolved).toBeTruthy();
    expect(secondCommitResolveTime).toBeGreaterThan(firstCommitResolveTime);
    // @ts-ignore
    expect(vault.lock.isLocked()).toBeFalsy();
  });
  test('only exposes limited commands of VaultInternal', async () => {
    // Converting a vault to the interface
    const vaultInterface = vault as Vault;

    // Using the avaliable functions.
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
    expect(vaultNormal.destroy).toBeTruthy(); // This exists again.
  });
  test('cannot commit when the remote field is set', async () => {
    await vault.destroy();
    vault = await VaultInternal.create({
      vaultId,
      keyManager: fakeKeyManager,
      efs,
      logger,
      remote: true,
      fresh: true,
    });
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
    ).rejects.toThrow(vaultsErrors.ErrorVaultImmutable);
  });
});
