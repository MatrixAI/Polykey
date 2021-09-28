import type { FileSystem } from '../types';
import type {
  FileChanges,
  FileOptions,
  SecretList,
  SecretName,
  VaultId,
  VaultKey,
  VaultName,
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

  public vaultName: VaultName;
  protected efs: EncryptedFS;
  protected logger: Logger;
  protected _lock: MutexInterface;
  protected _started: boolean;

  public static async create({
    vaultId,
    vaultName,
    efs,
    logger,
  }: {
    vaultId: VaultId;
    vaultName: VaultName;
    efs: EncryptedFS;
    logger?: Logger;
  }) {
    logger = logger ?? new Logger(this.constructor.name);
    const vault = new VaultInternal({
      vaultId,
      vaultName,
      efs,
      logger,
    })
    await git.init({
      fs: efs,
      dir: '.',
    });
    await efs.writeFile(
      path.join('.git', 'packed-refs'),
      '# pack-refs with: peeled fully-peeled sorted',
    );
    logger.info(`Initialising vault at '${vaultId}'`);
    return vault;
  }

  constructor({
    vaultId,
    vaultName,
    efs,
    logger,
  }: {
    vaultId: VaultId;
    vaultName: VaultName;
    efs: EncryptedFS;
    logger?: Logger;
  }) {
    this.vaultId = vaultId;
    this.vaultName = vaultName;
    this.efs = efs;
    this.logger = logger ?? new Logger(this.constructor.name);
    this._lock = new Mutex();
    this._started = false;
  }

  get started(): boolean {
    return this._started;
  }

  public async start(): Promise<void> {
  }

  public async destroy(): Promise<void> {
  }

  public async commit(
    f: (fs: EncryptedFS) => Promise<void>,
  ) {
    const release = await this._lock.acquire();
    const message: string[] = [];
    try {
      await f(this.efs);
      for await (const file of vaultsUtils.readdirRecursivelyEFS(this.efs, '.', false)) {
        await git.add({
          fs: this.efs,
          dir: '.',
          filepath: file,
        });
        const status = await git.status({
          fs: this.efs,
          dir: '.',
          filepath: file,
        });
        if (status === 'added' || status === 'deleted' || status === 'modified') {
          message.push(file + ' ' + status);
        }
      }
      await git.commit({
        fs: this.efs,
        dir: '.',
        author: {
          name: this.vaultId,
        },
        message: message.toString(),
      });
    } finally {
      await git.checkout({
        fs: this.efs,
        dir: '.',
      });
      release();
    }
  }

  public async log(): Promise<Array<String>> {
    const log = await git.log({
      fs: this.efs,
      dir: '.'
    });
    return log.map((readCommit) => {
      return `commit ${readCommit.oid}\n
      Author: ${readCommit.commit.author.name} <${readCommit.commit.author.email}>\n
      Date: ${readCommit.commit.author.timestamp}\n
      ${readCommit.commit.message}`
    })
  }

  public async revert(commit: string) {
  }

  public async applySchema(vs) {
  }
}

export default VaultInternal;
