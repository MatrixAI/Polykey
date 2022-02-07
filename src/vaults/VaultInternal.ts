import type { ReadCommitResult } from 'isomorphic-git';
import type { EncryptedFS } from 'encryptedfs';
import type { DB, DBDomain, DBLevel } from '@matrixai/db';
import type {
  VaultId,
  VaultRef,
  CommitId,
  CommitLog,
  FileSystemReadable,
  FileSystemWritable,
} from './types';
import type { KeyManager } from '../keys';
import type { NodeId } from '../nodes/types';
import type { ResourceAcquire } from '../utils';
import path from 'path';
import git from 'isomorphic-git';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as vaultsUtils from './utils';
import * as vaultsErrors from './errors';
import { withF, withG } from '../utils';

interface VaultInternal extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new vaultsErrors.ErrorVaultRunning(),
  new vaultsErrors.ErrorVaultDestroyed(),
)
class VaultInternal {
  public static async createVaultInternal({
    vaultId,
    db,
    vaultsDb,
    vaultsDbDomain,
    keyManager,
    efs,
    remote = false,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    vaultId: VaultId;
    db: DB;
    vaultsDb: DBLevel;
    vaultsDbDomain: DBDomain;
    keyManager: KeyManager;
    efs: EncryptedFS;
    remote?: boolean;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<VaultInternal> {
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    logger.info(`Creating ${this.name} - ${vaultIdEncoded}`);
    const vault = new VaultInternal({
      vaultId,
      db,
      vaultsDb,
      vaultsDbDomain,
      keyManager,
      efs,
      logger,
    });
    await vault.start({ fresh });
    logger.info(`Created ${this.name} - ${vaultIdEncoded}`);
    return vault;
  }

  public static async cloneVaultInternal({
    vaultId,
    db,
    vaultsDb,
    vaultsDbDomain,
    keyManager,
    efs,
    logger = new Logger(this.name),
  }: {
    vaultId: VaultId;
    db: DB;
    vaultsDb: DBLevel;
    vaultsDbDomain: DBDomain;
    efs: EncryptedFS;
    keyManager: KeyManager;
    remote?: boolean;
    logger?: Logger;
  }): Promise<VaultInternal> {
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    logger.info(`Cloning ${this.name} - ${vaultIdEncoded}`);
    // TODO:
    // Perform the cloning operation to preseed state
    // and also seed the remote state
    const vault = new VaultInternal({
      vaultId,
      db,
      vaultsDb,
      vaultsDbDomain,
      keyManager,
      efs,
      logger,
    });
    await vault.start();
    logger.info(`Cloned ${this.name} - ${vaultIdEncoded}`);
    return vault;
  }

  public readonly vaultId: VaultId;
  public readonly vaultIdEncoded: string;
  public readonly vaultDataDir: string;
  public readonly vaultGitDir: string;

  protected logger: Logger;
  protected db: DB;
  protected vaultsDbDomain: DBDomain;
  protected vaultsDb: DBLevel;
  protected vaultDbDomain: DBDomain;
  protected vaultDb: DBLevel;
  protected keyManager: KeyManager;
  protected efs: EncryptedFS;
  protected efsVault: EncryptedFS;
  protected remote: boolean;
  protected _lock: Mutex = new Mutex();

  public lock: ResourceAcquire<Mutex> = async () => {
    const release = await this._lock.acquire();
    return [async () => release(), this._lock];
  };

  constructor({
    vaultId,
    db,
    vaultsDbDomain,
    vaultsDb,
    keyManager,
    efs,
    logger,
  }: {
    vaultId: VaultId;
    db: DB;
    vaultsDbDomain: DBDomain;
    vaultsDb: DBLevel;
    keyManager: KeyManager;
    efs: EncryptedFS;
    logger: Logger;
  }) {
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    this.logger = logger;
    this.vaultId = vaultId;
    this.vaultIdEncoded = vaultIdEncoded;
    this.vaultDataDir = path.join(vaultIdEncoded, 'data');
    this.vaultGitDir = path.join(vaultIdEncoded, '.git');
    this.db = db;
    this.vaultsDbDomain = vaultsDbDomain;
    this.vaultsDb = vaultsDb;
    this.keyManager = keyManager;
    this.efs = efs;
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(
      `Starting ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
    const vaultDbDomain = [...this.vaultsDbDomain, this.vaultIdEncoded];
    const vaultDb = await this.db.level(this.vaultIdEncoded, this.vaultsDb);
    if (fresh) {
      await vaultDb.clear();
      try {
        await this.efs.rmdir(this.vaultIdEncoded, {
          recursive: true,
        });
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
    }
    await this.efs.mkdir(this.vaultIdEncoded, { recursive: true });
    await this.efs.mkdir(this.vaultDataDir, { recursive: true });
    await this.efs.mkdir(this.vaultGitDir, { recursive: true });
    await this.setupMeta();
    await this.setupGit();
    const efsVault = await this.efs.chroot(this.vaultDataDir);
    this.vaultDbDomain = vaultDbDomain;
    this.vaultDb = vaultDb;
    this.efsVault = efsVault;
    this.logger.info(
      `Started ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
  }

  public async stop(): Promise<void> {
    this.logger.info(
      `Stopping ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
    this.logger.info(
      `Stopped ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
  }

  public async destroy(): Promise<void> {
    this.logger.info(
      `Destroying ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
    const vaultDb = await this.db.level(this.vaultIdEncoded, this.vaultsDb);
    await vaultDb.clear();
    await this.efs.rmdir(this.vaultIdEncoded, {
      recursive: true,
    });
    this.logger.info(
      `Destroyed ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
  }

  // Is remote?
  // well we don't just get remote
  // we keep track of it
  public async getRemote(): Promise<[NodeId, VaultId]> {
    // Get the remote if exists
    // if undefined you consider this to be not remote
    // and therefore can proceed
    // return Promise of [NodeId, VaultId]
    throw Error('Not implemented');
  }

  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async log(
    ref: string | VaultRef = 'HEAD',
    limit?: number,
  ): Promise<Array<CommitLog>> {
    if (!vaultsUtils.validateRef(ref)) {
      throw new vaultsErrors.ErrorVaultReferenceInvalid();
    }
    if (ref === vaultsUtils.tagLast) {
      ref = vaultsUtils.canonicalBranch;
    }
    const commits = await git.log({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
      ref,
      depth: limit,
    });
    return commits.map(({ oid, commit }: ReadCommitResult) => {
      return {
        commitId: oid as CommitId,
        parent: commit.parent as Array<CommitId>,
        author: {
          name: commit.author.name,
          timestamp: new Date(commit.author.timestamp * 1000),
        },
        committer: {
          name: commit.committer.name,
          timestamp: new Date(commit.committer.timestamp * 1000),
        },
        message: commit.message,
      };
    });
  }

  /**
   * Checks out the vault repository to specific commit ID or special tags
   * This changes the working directory and updates the HEAD reference
   */
  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async version(ref: string | VaultRef = 'HEAD'): Promise<void> {
    if (!vaultsUtils.validateRef(ref)) {
      throw new vaultsErrors.ErrorVaultReferenceInvalid();
    }
    if (ref === vaultsUtils.tagLast) {
      ref = vaultsUtils.canonicalBranch;
    }
    try {
      await git.checkout({
        fs: this.efs,
        dir: this.vaultDataDir,
        gitdir: this.vaultGitDir,
        ref,
        force: true,
      });
    } catch (e) {
      if (e instanceof git.Errors.NotFoundError) {
        throw new vaultsErrors.ErrorVaultReferenceMissing();
      }
      throw e;
    }
  }

  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async readF<T>(f: (fs: FileSystemReadable) => Promise<T>): Promise<T> {
    return withF([this.lock], async () => {
      return await f(this.efsVault);
    });
  }

  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public readG<T, TReturn, TNext>(
    g: (fs: FileSystemReadable) => AsyncGenerator<T, TReturn, TNext>,
  ): AsyncGenerator<T, TReturn, TNext> {
    return withG([this.lock], async function* () {
      return yield* g(this.efsVault);
    });
  }

  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async writeF(
    f: (fs: FileSystemWritable) => Promise<void>,
  ): Promise<void> {
    return withF([this.lock], async () => {
      await this.db.put(this.vaultsDbDomain, 'dirty', true);
      // This should really be an internal property
      // get whether this is remote, and the remote address
      // if it is, we consider this repo an "attached repo"
      // this vault is a "mirrored" vault
      if (this.remote) {
        // Mirrored vaults are immutable
        throw new vaultsErrors.ErrorVaultImmutable();
      }

      // We have to chroot it
      // and then remove it
      // but this is done byitself?

      await f(this.efsVault);

      await this.db.put(this.vaultsDbDomain, 'dirty', false);
    });

    //   Const message: string[] = [];
    //   try {

    //     // If the version of the vault has been changed, checkout the working
    //     // directory to this point in history and discard any unlinked commits
    //     await git.checkout({
    //       fs: this.efs,
    //       dir: this.vaultDataDir,
    //       gitdir: this.vaultGitDir,
    //       ref: this.workingDirIndex,
    //     });
    //
    //     // Efs/someVaultId/contents
    //     await f(this.efsVault);
    //     // Get the status of each file in the working directory
    //     // https://isomorphic-git.org/docs/en/statusMatrix
    //     const statusMatrix = await git.statusMatrix({
    //       fs: this.efsRoot,
    //       dir: this.baseDir,
    //       gitdir: this.gitDir,
    //     });
    //     for (let [
    //       filePath,
    //       HEADStatus,
    //       workingDirStatus,
    //       stageStatus,
    //     ] of statusMatrix) {
    //       // Reset the index of files that are marked as 'unmodified'
    //       // The working directory, HEAD and staging area are all the same
    //       // https://github.com/MatrixAI/js-polykey/issues/260
    //       if (
    //         HEADStatus === workingDirStatus &&
    //         workingDirStatus === stageStatus
    //       ) {
    //         await git.resetIndex({
    //           fs: this.efsRoot,
    //           dir: this.baseDir,
    //           gitdir: this.gitDir,
    //           filepath: filePath,
    //         });
    //         // Check if the file is still 'unmodified' and leave
    //         // it out of the commit if it is
    //         [filePath, HEADStatus, workingDirStatus, stageStatus] = (
    //           await git.statusMatrix({
    //             fs: this.efsRoot,
    //             dir: this.baseDir,
    //             gitdir: this.gitDir,
    //             filepaths: [filePath],
    //           })
    //         ).pop()!;
    //         if (
    //           HEADStatus === workingDirStatus &&
    //           workingDirStatus === stageStatus
    //         )
    //           continue;
    //       }
    //       // We want files in the working directory that are both different
    //       // from the head commit and the staged changes
    //       // If working directory and stage status are not equal then filepath has unstaged
    //       // changes in the working directory relative to both the HEAD and staging
    //       // area that need to be added
    //       // https://isomorphic-git.org/docs/en/statusMatrix
    //       if (workingDirStatus !== stageStatus) {
    //         let status: 'added' | 'modified' | 'deleted';
    //         // If the working directory status is 0 then the file has
    //         // been deleted
    //         if (workingDirStatus === 0) {
    //           status = 'deleted';
    //           await git.remove({
    //             fs: this.efsRoot,
    //             dir: this.baseDir,
    //             gitdir: this.gitDir,
    //             filepath: filePath,
    //           });
    //         } else {
    //           await git.add({
    //             fs: this.efsRoot,
    //             dir: this.baseDir,
    //             gitdir: this.gitDir,
    //             filepath: filePath,
    //           });
    //           // Check whether the file already exists inside the HEAD
    //           // commit and if it does then it is unmodified
    //           if (HEADStatus === 1) {
    //             status = 'modified';
    //           } else {
    //             status = 'added';
    //           }
    //         }
    //         message.push(filePath + ' ' + status);
    //       }
    //     }
    //     // Check if there were actual changes made to any files
    //     if (message.length !== 0) {
    //       this.logger.info(
    //         `Committing to Vault '${vaultsUtils.makeVaultIdPretty(
    //           this.vaultId,
    //         )}'`,
    //       );
    //       this.workingDirIndex = await git.commit({
    //         fs: this.efsRoot,
    //         dir: this.baseDir,
    //         gitdir: this.gitDir,
    //         author: {
    //           name: this.keyManager.getNodeId(),
    //         },
    //         message: message.toString(),
    //       });
    //     }
    //   } finally {
    //     // Check the status matrix for any unstaged file changes
    //     // which are considered dirty commits
    //     const statusMatrix = await git.statusMatrix({
    //       fs: this.efsRoot,
    //       dir: this.baseDir,
    //       gitdir: this.gitDir,
    //     });
    //     for await (const [filePath, _, workingDirStatus] of statusMatrix) {
    //       // For all files stage all changes, this is needed
    //       // so that we can check out all untracked files as well
    //       if (workingDirStatus === 0) {
    //         await git.remove({
    //           fs: this.efsRoot,
    //           dir: this.baseDir,
    //           gitdir: this.gitDir,
    //           filepath: filePath,
    //         });
    //       } else {
    //         await git.add({
    //           fs: this.efsRoot,
    //           dir: this.baseDir,
    //           gitdir: this.gitDir,
    //           filepath: filePath,
    //         });
    //       }
    //     }
    //     // Remove the staged dirty commits by checking out
    //     await git.checkout({
    //       fs: this.efsRoot,
    //       dir: this.baseDir,
    //       gitdir: this.gitDir,
    //       ref: this.workingDirIndex,
    //     });
    //     release();
    //   }
  }

  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public writeG<T, TReturn, TNext>(
    g: (fs: FileSystemWritable) => AsyncGenerator<T, TReturn, TNext>,
  ): AsyncGenerator<T, TReturn, TNext> {
    return withG([this.lock], async function* () {
      const result = yield* g(this.efsVault);
      // At the end of the geneartor
      // you need to do this
      // but just before
      // you need to finish it up

      // DO what you need to do here, create the commit
      return result;
    });
  }

  /**
   * Setup the vault metadata
   */
  protected async setupMeta(): Promise<void> {
    // Setup the vault metadata
    // setup metadata
    // and you need to make certain preparations
    // the meta gets created first
    // if the SoT is the database
    // are we suposed to check this?

    if ((await this.db.get<boolean>(this.vaultDbDomain, 'remote')) == null) {
      await this.db.put(this.vaultDbDomain, 'remote', true);
    }

    // If this is not existing
    // setup default vaults db
    await this.db.get<boolean>(this.vaultsDbDomain, 'dirty');

    // Remote: [NodeId, VaultId] | undefined
    // dirty: boolean
    // name: string
  }

  /**
   * TODO: review what happens when you are cloning
   * Or you need to load a particular commit object ID here
   */
  protected async setupGit(): Promise<string> {
    // Initialization is idempotent
    // It works even with an existing git repository
    await git.init({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
      defaultBranch: vaultsUtils.canonicalBranch,
    });
    let commitIdLatest: CommitId | undefined;
    try {
      const commits = await git.log({
        fs: this.efs,
        dir: this.vaultDataDir,
        gitdir: this.vaultGitDir,
        ref: vaultsUtils.canonicalBranch,
        depth: 1,
      });
      commitIdLatest = commits[0]?.oid as CommitId | undefined;
    } catch (e) {
      // Initialized repositories do not have any commits
      // It complains that `refs/heads/master` file does not exist
      if (!(e instanceof git.Errors.NotFoundError)) {
        throw e;
      }
    }
    if (commitIdLatest == null) {
      // All vault repositories start with an initial commit
      commitIdLatest = (await git.commit({
        fs: this.efs,
        dir: this.vaultDataDir,
        gitdir: this.vaultGitDir,
        author: vaultsUtils.commitAuthor(this.keyManager.getNodeId()),
        message: 'Initial Commit',
      })) as CommitId;
    } else {
      // Force checkout out to the latest commit
      // This ensures that any uncommitted state is dropped
      await git.checkout({
        fs: this.efs,
        dir: this.vaultDataDir,
        gitdir: this.vaultGitDir,
        ref: vaultsUtils.canonicalBranch,
        force: true,
      });
    }
    return commitIdLatest;
  }
}

export default VaultInternal;
