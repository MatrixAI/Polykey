import type { FileSystem } from '../types';
import type {
  FileChanges,
  FileOptions,
  SecretList,
  SecretName,
  VaultIdRaw,
  VaultKey,
  VaultName,
  FileSystemReadable,
  FileSystemWritable,
  CommitLog, VaultId
} from "./types";
import type { NodeId } from '../nodes/types';
import type { WorkerManager } from '../workers';
import type { ReadCommitResult } from 'isomorphic-git';

import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';
import { Mutex } from 'async-mutex';
import { EncryptedFS } from 'encryptedfs';
import { PassThrough } from 'readable-stream';
import Logger from '@matrixai/logger';
import type { MutexInterface } from 'async-mutex';

import { GitRequest } from '../git';

import * as vaultsUtils from './utils';
import * as gitUtils from '../git/utils';
import * as vaultsErrors from './errors';
import * as gitErrors from '../git/errors';
import { CreateDestroy, ready } from "@matrixai/async-init/dist/CreateDestroy";
import { makeVaultId } from "./utils";

interface VaultInternal extends CreateDestroy {}
@CreateDestroy()
class VaultInternal {
  public readonly baseDir: string;
  public readonly gitDir: string;
  public readonly vaultId: VaultId;

  protected _efsRoot: EncryptedFS;
  protected _efsVault: EncryptedFS;
  protected _logger: Logger;
  protected _lock: MutexInterface;
  protected _workingDir: string;

  public static async create({
    vaultId,
    efsRoot,
    efsVault,
    logger,
    fresh = false,
  }: {
    vaultId: VaultId;
    efsRoot: EncryptedFS;
    efsVault: EncryptedFS;
    logger?: Logger;
    fresh?: boolean;
  }) {
    logger = logger ?? new Logger(this.constructor.name);
    if(fresh){
      // Creating a new vault.
      await git.init({
        fs: efsRoot,
        dir: path.join(vaultId, 'contents'),
        gitdir: path.join(vaultId, '.git'),
      });
      const workingDir = await git.commit({
        fs: efsRoot,
        dir: path.join(vaultId, 'contents'),
        gitdir: path.join(vaultId, '.git'),
        author: {
          name: vaultId,
        },
        message: 'Initial Commit',
      });
      await efsRoot.writeFile(
        path.join(vaultId, '.git', 'packed-refs'),
        '# pack-refs with: peeled fully-peeled sorted',
      );
      await efsRoot.writeFile(path.join(vaultId, '.git', 'workingDir'), workingDir);
      const vault = new VaultInternal({
        vaultId,
        efsRoot,
        efsVault,
        workingDir,
        logger,
      });
      logger.info(`Initialising vault at '${vaultId}'`);
      return vault;
    } else {
      // Loading an existing vault.
      const workingDir = (await efsRoot.readFile(path.join(vaultId, '.git', 'workingDir'), {
        encoding: 'utf8',
      })) as string;
      const vault = new VaultInternal({
        vaultId,
        efsRoot,
        efsVault,
        workingDir,
        logger,
      });
      logger.info(`Starting vault at '${vaultId}'`);
      return vault;
    }

  }

  constructor({
    vaultId,
    efsRoot,
    efsVault,
    workingDir,
    logger,
  }: {
    vaultId: VaultId;
    efsRoot: EncryptedFS;
    efsVault: EncryptedFS;
    workingDir: string;
    logger?: Logger;
  }) {
    this.baseDir = path.join(vaultId, 'contents');
    this.gitDir = path.join(vaultId, '.git');
    this.vaultId = vaultId;
    this._efsRoot = efsRoot;
    this._efsVault = efsVault;
    this._workingDir = workingDir;
    this._logger = logger ?? new Logger(this.constructor.name);
    this._lock = new Mutex();
  }

  public async destroy(): Promise<void> {
    const release = await this._lock.acquire();
    try {
      await this._efsRoot.writeFile(
        path.join(this.vaultId, '.git', 'workingDirectory'),
        this._workingDir,
      );
    } finally {
      release();
    }
    this._logger.info(`Destroying vault at '${this.vaultId}'`);
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async commit(f: (fs: FileSystemWritable) => Promise<void>): Promise<void> {
    const release = await this._lock.acquire();
    const message: string[] = [];
    await git.checkout({
      fs: this._efsRoot,
      dir: this.baseDir,
      gitdir: this.gitDir,
      ref: this._workingDir,
    });
    try {
      await f(this._efsVault);
      const statusMatrix = await git.statusMatrix({
        fs: this._efsRoot,
        dir: this.baseDir,
        gitdir: this.gitDir,
      });
      for await (const file of statusMatrix) {
        if (file[2] !== file[3]) {
          let status: 'added' | 'modified' | 'deleted';
          if (file[2] === 0) {
            status = 'deleted';
            await git.remove({
              fs: this._efsRoot,
              dir: this.baseDir,
              gitdir: this.gitDir,
              filepath: file[0],
            });
          } else {
            await git.add({
              fs: this._efsRoot,
              dir: this.baseDir,
              gitdir: this.gitDir,
              filepath: file[0],
            });
            if (file[1] === 1) {
              status = 'modified';
            } else {
              status = 'added';
            }
          }
          message.push(file[0] + ' ' + status)
        }
      }
      if (message.length !== 0) {
        this._workingDir = await git.commit({
          fs: this._efsRoot,
          dir: this.baseDir,
          gitdir: this.gitDir,
          author: {
            name: this.vaultId,
          },
          message: message.toString(),
        });
      }
    } finally {
      const statusMatrix = await git.statusMatrix({
        fs: this._efsRoot,
        dir: this.baseDir,
        gitdir: this.gitDir,
      });
      for await (const file of statusMatrix) {
        if (file[2] === 0) {
          await git.remove({
            fs: this._efsRoot,
            dir: this.baseDir,
            gitdir: this.gitDir,
            filepath: file[0],
          });
        } else {
          await git.add({
            fs: this._efsRoot,
            dir: this.baseDir,
            gitdir: this.gitDir,
            filepath: file[0],
          });
        }
      }
      await git.checkout({
        fs: this._efsRoot,
        dir: this.baseDir,
        gitdir: this.gitDir,
        ref: this._workingDir,
      });
      release();
    }
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async access<T>(f: (fs: FileSystemReadable) => Promise<T>): Promise<T> {
    const release = await this._lock.acquire();
    try {
      return await f(this._efsVault);
    } finally {
      release();
    }
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async log(
    depth?: number,
    commit?: string,
  ): Promise<Array<CommitLog>> {
    const log = await git.log({
      fs: this._efsRoot,
      dir: this.baseDir,
      gitdir: this.gitDir,
      depth: depth,
      ref: commit,
    });
    return log.map((readCommit) => {
      return {
        oid: readCommit.oid,
        committer: readCommit.commit.committer.name,
        message: readCommit.commit.message,
      };
    });
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async version(commit: string): Promise<void> {
    try {
      await git.checkout({
        fs: this._efsRoot,
        dir: this.baseDir,
        gitdir: this.gitDir,
        ref: commit,
        noUpdateHead: true,
      });
      this._workingDir = commit;
    } catch (err) {
      if (err.code === 'NotFoundError') throw new vaultsErrors.ErrorVaultCommitUndefined;
      throw err;
    }
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async applySchema(vs) {}
}

export default VaultInternal;
