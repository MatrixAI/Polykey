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
  });

  afterEach(async () => {
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
});
