import type { FileSystem } from '../types';
import type {
  FileChanges,
  FileOptions,
  SecretList,
  SecretName,
  VaultId,
  VaultKey,
  VaultName,
  FileSystemReadable,
  FileSystemWritable,
} from './types';
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

class VaultInternal {
  public readonly baseDir: string;
  public readonly vaultId: VaultId;

  protected _efs: EncryptedFS;
  protected _logger: Logger;
  protected _lock: MutexInterface;
  protected _started: boolean;
  protected _workingDir: string;

  public static async create({
    vaultId,
    efs,
    logger,
  }: {
    vaultId: VaultId;
    efs: EncryptedFS;
    logger?: Logger;
  }) {
    logger = logger ?? new Logger(this.constructor.name);
    await git.init({
      fs: efs,
      dir: '.',
    });
    const workingDir = await git.commit({
      fs: efs,
      dir: '.',
      author: {
        name: vaultId,
      },
      message: 'Initial Commit',
    });
    await efs.writeFile(
      path.join('.git', 'packed-refs'),
      '# pack-refs with: peeled fully-peeled sorted',
    );
    await efs.writeFile(path.join('.git', 'workingDir'), workingDir);
    const vault = new VaultInternal({
      vaultId,
      efs,
      workingDir,
      logger,
    });
    logger.info(`Initialising vault at '${vaultId}'`);
    return vault;
  }

  public static async start({
    vaultId,
    efs,
    logger,
  }: {
    vaultId: VaultId;
    efs: EncryptedFS;
    logger?: Logger;
  }): Promise<VaultInternal> {
    logger = logger ?? new Logger(this.constructor.name);
    const workingDir = (await efs.readFile(path.join('.git', 'workingDir'), {
      encoding: 'utf8',
    })) as string;
    const vault = new VaultInternal({
      vaultId,
      efs,
      workingDir,
      logger,
    });
    logger.info(`Starting vault at '${vaultId}'`);
    return vault;
  }

  constructor({
    vaultId,
    efs,
    workingDir,
    logger,
  }: {
    vaultId: VaultId;
    efs: EncryptedFS;
    workingDir: string;
    logger?: Logger;
  }) {
    this.vaultId = vaultId;
    this._efs = efs;
    this._workingDir = workingDir;
    this._logger = logger ?? new Logger(this.constructor.name);
    this._lock = new Mutex();
    this._started = true;
  }

  get started(): boolean {
    return this._started;
  }

  public async stop(): Promise<void> {
    const release = await this._lock.acquire();
    try {
      await this._efs.writeFile(
        path.join('.git', 'workingDirectory'),
        this._workingDir,
      );
    } finally {
      release();
      this._logger.info(`Stopping vault at '${this.vaultId}'`);
      this._started = false;
    }
  }

  public async destroy(): Promise<void> {
    this._logger.info(`Destroying vault at '${this.vaultId}'`);
  }

  public async commit(f: (fs: FileSystemWritable) => Promise<void>) {
    const release = await this._lock.acquire();
    const message: string[] = [];
    await git.checkout({
      fs: this._efs,
      dir: '.',
      ref: this._workingDir,
    });
    try {
      await f(this._efs);
      for await (const file of vaultsUtils.readdirRecursivelyEFS(
        this._efs,
        '.',
        false,
      )) {
        await git.add({
          fs: this._efs,
          dir: '.',
          filepath: file,
        });
        const status = await git.status({
          fs: this._efs,
          dir: '.',
          filepath: file,
        });
        if (
          status === 'added' ||
          status === 'deleted' ||
          status === 'modified'
        ) {
          message.push(file + ' ' + status);
        }
      }
      this._workingDir = await git.commit({
        fs: this._efs,
        dir: '.',
        author: {
          name: this.vaultId,
        },
        message: message.toString(),
      });
    } finally {
      for await (const file of vaultsUtils.readdirRecursivelyEFS(
        this._efs,
        '.',
        false,
      )) {
        await git.add({
          fs: this._efs,
          dir: '.',
          filepath: file,
        });
      }
      await git.checkout({
        fs: this._efs,
        dir: '.',
        ref: this._workingDir,
      });
      release();
    }
  }

  public async access<T>(f: (fs: FileSystemReadable) => Promise<T>): Promise<T> {
    const release = await this._lock.acquire();
    try {
      return await f(this._efs);
    } finally {
      release();
    }
  }

  public async log(depth: 1, commit?: string): Promise<string>;
  public async log(depth?: number, commit?: string): Promise<Array<string>>;
  public async log(
    depth?: number,
    commit?: string,
  ): Promise<Array<string> | string> {
    const log = await git.log({
      fs: this._efs,
      dir: '.',
      depth: depth,
      ref: commit,
    });
    return log.map((readCommit) => {
      return (
        `commit ${readCommit.oid}\n` +
        `Author: ${readCommit.commit.author.name}\n` +
        `Date: ${new Date(readCommit.commit.author.timestamp * 1000)}\n` +
        `${readCommit.commit.message}\n`
      );
    });
  }

  public async versionCheckout(commit: string): Promise<void> {
    await git.checkout({
      fs: this._efs,
      dir: '.',
      ref: commit,
      noUpdateHead: true,
    });
    this._workingDir = commit;
  }

  public async applySchema(vs) {}
}

export default VaultInternal;
