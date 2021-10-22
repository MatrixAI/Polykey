import type {
  VaultId,
  FileSystemReadable,
  FileSystemWritable,
  CommitLog,
} from './types';

import path from 'path';
import git from 'isomorphic-git';
import { Mutex } from 'async-mutex';
import { EncryptedFS } from 'encryptedfs';
import Logger from '@matrixai/logger';
import type { MutexInterface } from 'async-mutex';

import * as vaultsUtils from './utils';
import * as vaultsErrors from './errors';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import { makeVaultIdPretty } from './utils';
import { KeyManager } from '../keys';

const lastTag = 'last';

interface VaultInternal extends CreateDestroy {}
@CreateDestroy()
class VaultInternal {
  public readonly baseDir: string;
  public readonly gitDir: string;
  public readonly vaultId: VaultId;

  protected efsRoot: EncryptedFS;
  protected efsVault: EncryptedFS;
  protected logger: Logger;
  protected lock: MutexInterface;
  protected workingDir: string;
  protected keyManager: KeyManager;

  public static async create({
    vaultId,
    keyManager,
    efs,
    logger,
    fresh = false,
  }: {
    vaultId: VaultId;
    keyManager: KeyManager;
    efs: EncryptedFS;
    logger?: Logger;
    fresh?: boolean;
  }) {
    logger = logger ?? new Logger(this.constructor.name);
    if (fresh) {
      try {
        await efs.rmdir(makeVaultIdPretty(vaultId), { recursive: true });
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
      await efs.mkdir(path.join(makeVaultIdPretty(vaultId), 'contents'), {
        recursive: true,
      });
      const efsVault = await efs.chroot(
        path.join(makeVaultIdPretty(vaultId), 'contents'),
      );
      await efsVault.start();
      // Creating a new vault.
      await git.init({
        fs: efs,
        dir: path.join(makeVaultIdPretty(vaultId), 'contents'),
        gitdir: path.join(makeVaultIdPretty(vaultId), '.git'),
      });
      const workingDir = await git.commit({
        fs: efs,
        dir: path.join(makeVaultIdPretty(vaultId), 'contents'),
        gitdir: path.join(makeVaultIdPretty(vaultId), '.git'),
        author: {
          name: makeVaultIdPretty(vaultId),
        },
        message: 'Initial Commit',
      });
      await efs.writeFile(
        path.join(makeVaultIdPretty(vaultId), '.git', 'packed-refs'),
        '# pack-refs with: peeled fully-peeled sorted',
      );
      await efs.writeFile(
        path.join(makeVaultIdPretty(vaultId), '.git', 'workingDir'),
        workingDir,
      );
      const vault = new VaultInternal({
        vaultId,
        keyManager,
        efs,
        efsVault,
        workingDir,
        logger,
      });
      logger.info(`Initialising vault at '${makeVaultIdPretty(vaultId)}'`);
      return vault;
    } else {
      // Loading an existing vault.
      const efsVault = await efs.chroot(
        path.join(makeVaultIdPretty(vaultId), 'contents'),
      );
      await efsVault.start();
      const workingDir = (await efs.readFile(
        path.join(makeVaultIdPretty(vaultId), '.git', 'workingDir'),
        {
          encoding: 'utf8',
        },
      )) as string;
      const vault = new VaultInternal({
        vaultId,
        keyManager,
        efs,
        efsVault,
        workingDir,
        logger,
      });
      logger.info(`Starting vault at '${makeVaultIdPretty(vaultId)}'`);
      return vault;
    }
  }

  constructor({
    vaultId,
    keyManager,
    efs,
    efsVault,
    workingDir,
    logger,
  }: {
    vaultId: VaultId;
    keyManager: KeyManager;
    efs: EncryptedFS;
    efsVault: EncryptedFS;
    workingDir: string;
    logger?: Logger;
  }) {
    this.baseDir = path.join(makeVaultIdPretty(vaultId), 'contents');
    this.gitDir = path.join(makeVaultIdPretty(vaultId), '.git');
    this.vaultId = vaultId;
    this.keyManager = keyManager;
    this.efsRoot = efs;
    this.efsVault = efsVault;
    this.workingDir = workingDir;
    this.logger = logger ?? new Logger(this.constructor.name);
    this.lock = new Mutex();
  }

  public async destroy(): Promise<void> {
    const release = await this.lock.acquire();
    try {
      await this.efsRoot.writeFile(
        path.join(makeVaultIdPretty(this.vaultId), '.git', 'workingDirectory'),
        this.workingDir,
      );
    } finally {
      release();
    }
    this.logger.info(
      `Destroying vault at '${makeVaultIdPretty(this.vaultId)}'`,
    );
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async commit(
    f: (fs: FileSystemWritable) => Promise<void>,
  ): Promise<void> {
    const release = await this.lock.acquire();
    const message: string[] = [];
    try {
      await git.checkout({
        fs: this.efsRoot,
        dir: this.baseDir,
        gitdir: this.gitDir,
        ref: this.workingDir,
      });
      await f(this.efsVault);
      for await (const file of vaultsUtils.readdirRecursivelyEFS(this.efsVault, '.', true)) {
        await git.resetIndex({
          fs: this.efsRoot,
          dir: this.baseDir,
          gitdir: this.gitDir,
          filepath: file,
        });
      }
      const statusMatrix = await git.statusMatrix({
        fs: this.efsRoot,
        dir: this.baseDir,
        gitdir: this.gitDir,
      });
      for await (const file of statusMatrix) {
        if (file[2] !== file[3]) {
          let status: 'added' | 'modified' | 'deleted';
          if (file[2] === 0) {
            status = 'deleted';
            await git.remove({
              fs: this.efsRoot,
              dir: this.baseDir,
              gitdir: this.gitDir,
              filepath: file[0],
            });
          } else {
            await git.add({
              fs: this.efsRoot,
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
          message.push(file[0] + ' ' + status);
        }
      }
      if (message.length !== 0) {
        this.workingDir = await git.commit({
          fs: this.efsRoot,
          dir: this.baseDir,
          gitdir: this.gitDir,
          author: {
            name: this.keyManager.getNodeId(),
          },
          message: message.toString(),
        });
      }
    } finally {
      const statusMatrix = await git.statusMatrix({
        fs: this.efsRoot,
        dir: this.baseDir,
        gitdir: this.gitDir,
      });
      for await (const file of statusMatrix) {
        if (file[2] === 0) {
          await git.remove({
            fs: this.efsRoot,
            dir: this.baseDir,
            gitdir: this.gitDir,
            filepath: file[0],
          });
        } else {
          await git.add({
            fs: this.efsRoot,
            dir: this.baseDir,
            gitdir: this.gitDir,
            filepath: file[0],
          });
        }
      }
      await git.checkout({
        fs: this.efsRoot,
        dir: this.baseDir,
        gitdir: this.gitDir,
        ref: this.workingDir,
      });
      release();
    }
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async access<T>(
    f: (fs: FileSystemReadable) => Promise<T>,
  ): Promise<T> {
    const release = await this.lock.acquire();
    try {
      return await f(this.efsVault);
    } finally {
      release();
    }
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async log(depth?: number, commit?: string): Promise<Array<CommitLog>> {
    const commit_ = commit?.toLowerCase() === lastTag ? 'HEAD' : commit;
    const log = await git.log({
      fs: this.efsRoot,
      dir: this.baseDir,
      gitdir: this.gitDir,
      depth: depth,
      ref: commit_,
    });
    return log.map((readCommit) => {
      return {
        oid: readCommit.oid,
        committer: readCommit.commit.committer.name,
        timeStamp: readCommit.commit.committer.timestamp * 1000, // Needs to be in milliseconds for Date.
        message: readCommit.commit.message,
      };
    });
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async version(commit: string): Promise<void> {
    // Checking for special tags.
    const commit_ = commit.toLowerCase() === lastTag ? 'HEAD' : commit;
    // TODO: add a tag for the start of the histoy so we can use that as the operator.

    try {
      await git.checkout({
        fs: this.efsRoot,
        dir: this.baseDir,
        gitdir: this.gitDir,
        ref: commit_,
        noUpdateHead: true,
      });
      this.workingDir = commit_;
    } catch (err) {
      if (err.code === 'NotFoundError')
        throw new vaultsErrors.ErrorVaultCommitUndefined();
      throw err;
    }
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async readWorkingDirectory(): Promise<void> {
    const workingDir = (
      await git.log({
        fs: this.efsRoot,
        dir: path.join(vaultsUtils.makeVaultIdPretty(this.vaultId), 'contents'),
        gitdir: path.join(vaultsUtils.makeVaultIdPretty(this.vaultId), '.git'),
        depth: 1,
      })
    ).pop()!;
    await this.efsRoot.writeFile(
      path.join(
        vaultsUtils.makeVaultIdPretty(this.vaultId),
        '.git',
        'workingDir',
      ),
      workingDir.oid,
    );
  }

  @ready(new vaultsErrors.ErrorVaultDestroyed())
  public async applySchema(vs) {}
}

export default VaultInternal;
