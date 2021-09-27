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
  public efs: EncryptedFS;
  protected logger: Logger;
  protected _started: boolean;

  constructor({
    vaultId,
    vaultName,
    baseDir,
    logger,
  }: {
    vaultId: VaultId;
    vaultName: VaultName;
    baseDir: string;
    logger?: Logger;
  }) {
    this.vaultId = vaultId;
    this.vaultName = vaultName;
    this.baseDir = baseDir;
    this.logger = logger ?? new Logger(this.constructor.name);
    this._started = false;
  }

  get started(): boolean {
    return this._started;
  }

  public async start({ key }: { key: VaultKey }): Promise<void> {
    this.efs = await EncryptedFS.createEncryptedFS({
      dbKey: key,
      dbPath: this.baseDir,
      logger: this.logger.getChild('EncryptedFS'),
    });
    await git.init({
      fs: this.efs,
      dir: '.',
    });
  }

  public async stop(): Promise<void> {
  }

  public async commit(
    f: (fs: EncryptedFS) => Promise<void>,
    vaultLock: MutexInterface
  ) {
    const release = await vaultLock.acquire();
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
      release();
    }
  }

  public async log(): Promise<Array<ReadCommitResult>> {
    return await git.log({
      fs: this.efs,
      dir: '.'
    });
  }

  public async revert(commit: string) {
  }

  public async applySchema(vs) {

  }
}

export default VaultInternal;
