import type { NodeId } from '@/nodes/types';
import type { Vault, VaultId, VaultKey, VaultName } from "@/vaults/types";

import os from 'os';
import path from 'path';
import fs from 'fs';
import git from 'isomorphic-git';
import { VaultInternal } from '@/vaults';
import Logger, { LogLevel, StreamHandler } from '@matrixai/logger';

import { generateVaultId, generateVaultKey, makeVaultIdPretty } from '@/vaults/utils';
import { getRandomBytes } from '@/keys/utils';
import { EncryptedFS } from 'encryptedfs';
import * as vaultsErrors from '@/vaults/errors';
import * as utils from '@/utils';
import * as errors from "@/vaults/errors";
import { FileSystemReadable, FileSystemWritable } from "@/vaults/types";
import { first } from 'cheerio/lib/api/traversing';
import { sleep } from '@/utils';

describe('VaultInternal', () => {
  let dataDir: string;
  let dbPath: string;
  let vaultPath: string;

  let vault: VaultInternal;
  let dbKey: VaultKey;
  let vaultId: VaultId;
  let efs: EncryptedFS;
  const logger = new Logger('Vault', LogLevel.WARN, [new StreamHandler()]);
  const nodeId = 'DummyNodeId' as NodeId;

  beforeEach(async () => {
    dataDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'polykey-test-'),
    );
    dbKey = await generateVaultKey();
    dbPath = path.join(dataDir, 'db');
    await fs.promises.mkdir(dbPath);
    vaultId = generateVaultId();
    vaultPath = path.join(makeVaultIdPretty(vaultId), 'contents');
    efs = await EncryptedFS.createEncryptedFS({
      dbPath,
      dbKey,
      logger,
    });
    await efs.start();
    // await efsRoot.mkdir(vaultPath, { recursive: true });
    // efsVault = await efsRoot.chroot(vaultPath);
    // await efsVault.start();
    vault = await VaultInternal.create({
      vaultId,
      nodeId,
      efs,
      logger,
      fresh: true,
    });
  });

  afterEach(async () => {
    await vault.destroy();
    // await efsVault.stop();
    await efs.stop();
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
      const files = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(files).toEqual([]);
      await vault.commit(async (efs) => {
        await efs.writeFile('test', 'testdata');
      });
      commit = (await vault.log(1))[0];
      await vault.version(commit.oid);
      const file = await vault.access(async (efs) => {
        return await efs.readFile('test', { encoding: 'utf8' });
      });
      expect(file).toBe('testdata');
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
      let files = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(files).toEqual([]);
      await vault.version(endCommit);
      files = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(files).toEqual(['test1', 'test2', 'test3']);
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
      let files = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(files).toEqual(['test1', 'test2', 'test3']);
      await vault.version(initCommit);
      await vault.version('end');
      files = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(files).toEqual(['test1', 'test2', 'test3']);
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
      let files = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(files).toEqual(['test1', 'test4']);
      await vault.version(initCommit);
      files = await vault.access(async (efs) => {
        return await efs.readdir('.');
      });
      expect(files).toEqual([]);
    });
  });

  test('creating state on disk', async () => {
    expect(await fs.promises.readdir(dataDir)).toContain('db');
  });
  test('Accessing a change', async () => {
    await vault.commit(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content')
    })
    await vault.access(async (efs) => {
      expect(await efs.readdir('.')).toContain('secret-1');
      expect((await efs.readFile('secret-1')).toString()).toStrictEqual('secret-content')
    })
  });
  test('Vault maintains data across VaultInternal instances', async () => {
    await vault.commit(async (efs) => {
      await efs.writeFile('secret-1', 'secret-content')
    })
    await vault.destroy();
    vault = await VaultInternal.create({
      vaultId,
      nodeId,
      efs,
      logger,
      fresh: false,
    });
    await vault.access(async (efs) => {
      expect((await efs.readFile('secret-1')).toString()).toStrictEqual('secret-content');
    })
  })
  describe('Writing operations', () => {
    const secret1 = {name: 'secret-1', content: 'secret-content-1'}
    const secret2 = {name: 'secret-2', content: 'secret-content-2'}
    test('Write operation allowed', async () => {
      await vault.commit(async (efs) => {
        await efs.writeFile('secret-1', 'secret-content')
      })
    });
    test('Concurrent write operations prevented', async () => {
      await Promise.all([
        vault.commit(async (efs) => {
          await efs.writeFile('secret-1', 'secret-content-1')
        }),
        vault.commit(async (efs) => {
          await efs.writeFile('secret-2', 'secret-content-2')
        }),
        vault.commit(async (efs) => {
          await efs.writeFile('secret-3', 'secret-content-3')
        }),
      ])

      await vault.access(async (efs) => {
        const directory = await efs.readdir('.');
        expect(directory).toContain('secret-1');
        expect(directory).toContain('secret-2');
        expect(directory).toContain('secret-3');
      })
      const log = await vault.log();
      expect(log.length).toEqual(4);
    });
    test('Write locks read', async () => {
      await vault.commit(async (efs) => {
        await efs.writeFile('secret-1', 'secret-content')
      })

      await Promise.all([
        vault.commit(async (efs) => {
          await efs.writeFile('secret-1', 'SUPER-DUPER-SECRET-CONTENT')
        }),
        vault.access(async (efs) => {
          expect((await efs.readFile('secret-1')).toString()).toEqual('SUPER-DUPER-SECRET-CONTENT')
        })
      ]);
    });
    test('Commit added if mutation in write', async () => {
      const commit = (await vault.log())[0].oid;
      await vault.commit(async (efs) => {
        await efs.writeFile('secret-1', 'secret-content')
      });
      const log = await vault.log();
      expect(log).toHaveLength(2);
      expect(log[0].message).toContain('secret-1');
      expect(log[0].oid).not.toStrictEqual(commit);
    });
    test('No commit added if no mutation in write', async () => {
      const commit = (await vault.log())[0].oid;
      await vault.commit(async (_efs) => {
      });
      const log = await vault.log();
      expect(log).toHaveLength(1);
      expect(log[0].message).not.toContain('secret-1');
      expect(log[0].oid).toStrictEqual(commit);
    });
    test('Commit message contains all actions made in the commit', async () => {
      // adding
      await vault.commit(async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
        await efs.writeFile(secret2.name, secret2.content);
      });
      let log = await vault.log();
      expect(log[0].message).toContain(`${secret1.name} added`);
      expect(log[0].message).toContain(`${secret2.name} added`);

      // Modifying
      await vault.commit(async (efs) => {
        await efs.writeFile(secret2.name, `${secret2.content} new content`);
      });
      log = await vault.log();
      expect(log[0].message).toContain(`${secret2.name} modified`);

      // moving and removing
      await vault.commit(async (efs) => {
        await efs.rename(secret1.name, secret1.name + '-new');
        await efs.unlink(secret2.name);
      });

      log = await vault.log();
      expect(log[0].message).toContain(`${secret1.name}-new added`)
      expect(log[0].message).toContain(`${secret1.name} deleted`)
      expect(log[0].message).toContain(`${secret2.name} deleted`)
      //TODO: update this with all the expected messages.
    })
    test('No mutation to vault when part of a commit operation fails', async () => {
      // Failing commit operation
      await expect( () => vault.commit(async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
        await efs.rename('notValid', 'randomName'); // throws
      })).rejects.toThrow()

      // Make sure secret1 wasn't written when the above commit failed.
      await vault.access(async (efs) => {
        expect(await efs.readdir('.')).not.toContain(secret1.name);
      })

      // No new commit.
      expect(await vault.log()).toHaveLength(1);

      // Succeeding commit operation.
      await vault.commit(async (efs) => {
        await efs.writeFile(secret2.name, secret2.content);
      })

      // Secret 1 shouldn't exist while secret2 exists.
      await vault.access(async (efs) => {
        const directory = await efs.readdir('.');
        expect(directory).not.toContain(secret1.name); //
        expect(directory).toContain(secret2.name);
      })

      // Has a new commit.
      expect(await vault.log()).toHaveLength(2);

    })
    test('Locking occurs when making a commit.', async () => {
      // We want to check if the locking is happening. so we need a way to see if an operation is being blocked.

      let resolveDelay;
      const delayPromise = new Promise((resolve, _reject) => {
        resolveDelay = resolve;
      })
      let firstCommitResolved = false;
      let firstCommitResolveTime;

      const commit1 = vault.commit(async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
        await delayPromise; // Hold the lock hostage.
        firstCommitResolved = true;
        firstCommitResolveTime = Date.now()
      });

      // Now that we are holding the lock hostage,
      // we want to check if any action resolves before the lock is released.

      let secondCommitResolved = false;
      let secondCommitResolveTime;
      const commit2 = vault.commit(async (efs) => {
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

      // Commit order should be commit2 -> commit1 -> init
      const log = await vault.log();
      expect(log[0].message).toContain(secret2.name);
      expect(log[1].message).toContain(secret1.name);
      console.log(log);

    })
  });
  describe('Reading operations', () => {
    const secret1 = {name: 'secret-1', content: 'secret-content-1'}
    const secret2 = {name: 'secret-2', content: 'secret-content-2'}

    beforeEach(async () => {
      await vault.commit( async (efs) => {
        await efs.writeFile(secret1.name, secret1.content);
        await efs.writeFile(secret2.name, secret2.content);
      });
    });
    test('Read operation allowed', async () => {
      await vault.access(async (efs) => {
        expect((await efs.readFile(secret1.name)).toString()).toEqual(secret1.content)
      })
    });
    test('Concurrent read operations allowed', async () => {
      await vault.access(async (efs) => {
        expect((await efs.readFile(secret1.name)).toString()).toEqual(secret1.content)
        expect((await efs.readFile(secret2.name)).toString()).toEqual(secret2.content)
        expect((await efs.readFile(secret1.name)).toString()).toEqual(secret1.content)
      })

      await Promise.all([
        vault.access(async (efs) => {
          expect((await efs.readFile(secret1.name)).toString()).toEqual(secret1.content)
        }),
        vault.access(async (efs) => {
          expect((await efs.readFile(secret2.name)).toString()).toEqual(secret2.content)
        }),
        vault.access(async (efs) => {
          expect((await efs.readFile(secret1.name)).toString()).toEqual(secret1.content)
        }),
      ]);
    });
    test('Read locks write', async () => {
      await Promise.all([
        vault.access(async (efs) => {
          expect((await efs.readFile(secret1.name)).toString()).toEqual(secret1.content)
        }),
        vault.commit(async (efs) => {
          await efs.writeFile(secret1.name, 'NEW-CONTENT');
        }),
        vault.access(async (efs) => {
          expect((await efs.readFile(secret1.name)).toString()).toEqual('NEW-CONTENT')
        }),
      ]);
    });
    test('No commit after read', async () => {
      const commit = (await vault.log())[0].oid;
      await vault.access(async (efs) => {
        expect((await efs.readFile(secret1.name)).toString()).toEqual(secret1.content)
      });
      const log = await vault.log();
      expect(log).toHaveLength(2);
      expect(log[0].oid).toStrictEqual(commit);
    });
    test('Locking occurs when making an access.', async () => {
      // We want to check if the locking is happening. so we need a way to see if an operation is being blocked.
      let resolveDelay;
      const delayPromise = new Promise((resolve, _reject) => {
        resolveDelay = resolve;
      })
      let firstCommitResolved = false;
      let firstCommitResolveTime;

      const commit1 = vault.access(async (efs) => {
        await efs.readFile(secret1.name);
        await delayPromise; // Hold the lock hostage.
        firstCommitResolved = true;
        firstCommitResolveTime = Date.now()
      });

      // Now that we are holding the lock hostage,
      // we want to check if any action resolves before the lock is released.

      let secondCommitResolved = false;
      let secondCommitResolveTime;
      const commit2 = vault.access(async (efs) => {
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
    })
  });
  test('Vault only exposes limited commands of VaultInternal', async () => {
    // converting a vault to the interface
    const vaultInterface = vault as Vault;

    // Using the avaliable functions.
    await vaultInterface.commit(async efs => {
      await efs.writeFile('test', 'testContent');
    })

    await vaultInterface.access(async efs => {
      const content = (await efs.readFile('test')).toString();
      expect(content).toStrictEqual('testContent');
    })

    expect(vaultInterface.baseDir).toBeTruthy();
    expect(vaultInterface.gitDir).toBeTruthy();
    expect(vaultInterface.vaultId).toBeTruthy();
    expect(vaultInterface.commit).toBeTruthy();
    expect(vaultInterface.access).toBeTruthy();
    expect(vaultInterface.log).toBeTruthy();
    expect(vaultInterface.version).toBeTruthy();

    // can we convert back?
    const vaultNormal = vaultInterface as VaultInternal;
    expect(vaultNormal.destroy).toBeTruthy(); // This exists again.
  });
});
