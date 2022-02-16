import type { ReadCommitResult } from 'isomorphic-git';
import type { EncryptedFS } from 'encryptedfs';
import type { DB, DBDomain, DBLevel } from '@matrixai/db';
import type {
  CommitId,
  CommitLog,
  FileSystemReadable,
  FileSystemWritable,
  VaultAction,
  VaultId,
  VaultIdEncoded,
  VaultName,
  VaultRef,
} from './types';
import type KeyManager from '../keys/KeyManager';
import type { NodeId, NodeIdEncoded } from '../nodes/types';
import type NodeConnectionManager from '../nodes/NodeConnectionManager';
import type { ResourceAcquire } from '../utils/context';
import type GRPCClientAgent from '../agent/GRPCClientAgent';
import type { POJO } from '../types';
import path from 'path';
import git from 'isomorphic-git';
import * as grpc from '@grpc/grpc-js';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as vaultsErrors from './errors';
import * as vaultsUtils from './utils';
import * as nodesUtils from '../nodes/utils';
import * as validationUtils from '../validation/utils';
import { withF, withG } from '../utils/context';
import { RWLock } from '../utils/locks';
import * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import { never } from '../utils/utils';

// TODO: this might be temp?
export type RemoteInfo = {
  remoteNode: NodeIdEncoded;
  remoteVault: VaultIdEncoded;
};

interface VaultInternal extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new vaultsErrors.ErrorVaultRunning(),
  new vaultsErrors.ErrorVaultDestroyed(),
)
class VaultInternal {
  public static async createVaultInternal({
    vaultId,
    vaultName,
    db,
    vaultsDb,
    vaultsDbDomain,
    keyManager,
    efs,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    vaultId: VaultId;
    vaultName?: VaultName;
    db: DB;
    vaultsDb: DBLevel;
    vaultsDbDomain: DBDomain;
    keyManager: KeyManager;
    efs: EncryptedFS;
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
    await vault.start({ fresh, vaultName });
    logger.info(`Created ${this.name} - ${vaultIdEncoded}`);
    return vault;
  }

  public static async cloneVaultInternal({
    targetNodeId,
    targetVaultNameOrId,
    vaultId,
    db,
    vaultsDb,
    vaultsDbDomain,
    keyManager,
    nodeConnectionManager,
    efs,
    logger = new Logger(this.name),
  }: {
    targetNodeId: NodeId;
    targetVaultNameOrId: VaultId | VaultName;
    vaultId: VaultId;
    db: DB;
    vaultsDb: DBLevel;
    vaultsDbDomain: DBDomain;
    efs: EncryptedFS;
    keyManager: KeyManager;
    nodeConnectionManager: NodeConnectionManager;
    logger?: Logger;
  }): Promise<VaultInternal> {
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    logger.info(`Cloning ${this.name} - ${vaultIdEncoded}`);
    const vault = new VaultInternal({
      vaultId,
      db,
      vaultsDb,
      vaultsDbDomain,
      keyManager,
      efs,
      logger,
    });
    // This error flag will contain the error returned by the cloning grpc stream
    let error;
    // Make the directory where the .git files will be auto generated and
    // where the contents will be cloned to ('contents' file)
    await efs.mkdir(vault.vaultDataDir, { recursive: true });
    let vaultName: VaultName;
    let remoteVaultId: VaultId;
    let remote: RemoteInfo;
    try {
      [vaultName, remoteVaultId] = await nodeConnectionManager.withConnF(
        targetNodeId,
        async (connection) => {
          const client = connection.getClient();
          const [request, vaultName, remoteVaultId] = await vault.request(
            client,
            targetVaultNameOrId,
            'clone',
          );
          await git.clone({
            fs: efs,
            http: { request },
            dir: vault.vaultDataDir,
            gitdir: vault.vaultGitDir,
            url: 'http://',
            singleBranch: true,
          });
          return [vaultName, remoteVaultId];
        },
      );
      remote = {
        remoteNode: nodesUtils.encodeNodeId(targetNodeId),
        remoteVault: vaultsUtils.encodeVaultId(remoteVaultId),
      };
    } catch (e) {
      // If the error flag set and we have the generalised SmartHttpError from
      // isomorphic git then we need to throw the polykey error
      if (e instanceof git.Errors.SmartHttpError && error) {
        throw error;
      }
      throw e;
    }

    await vault.start({ vaultName });
    // Setting the remote in the metadata
    await vault.db.put(
      vault.vaultMetadataDbDomain,
      VaultInternal.remoteKey,
      remote,
    );
    logger.info(`Cloned ${this.name} - ${vaultIdEncoded}`);
    return vault;
  }

  static dirtyKey = 'dirty';
  static remoteKey = 'remote';
  static nameKey = 'key';

  public readonly vaultId: VaultId;
  public readonly vaultIdEncoded: string;
  public readonly vaultDataDir: string;
  public readonly vaultGitDir: string;

  protected logger: Logger;
  protected db: DB;
  protected vaultsDbDomain: DBDomain;
  protected vaultsDb: DBLevel;
  protected vaultMetadataDbDomain: DBDomain;
  protected vaultMetadataDb: DBLevel;
  protected keyManager: KeyManager;
  protected vaultsNamesDomain: DBDomain;
  protected efs: EncryptedFS;
  protected efsVault: EncryptedFS;
  protected lock: RWLock = new RWLock();

  public readLock: ResourceAcquire = async () => {
    const release = await this.lock.acquireRead();
    return [async () => release()];
  };

  public writeLock: ResourceAcquire = async () => {
    const release = await this.lock.acquireWrite();
    return [async () => release()];
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

  /**
   *
   * @param fresh Clears all state before starting
   * @param vaultName Name of the vault, Only used when creating a new vault
   */
  public async start({
    fresh = false,
    vaultName,
  }: {
    fresh?: boolean;
    vaultName?: VaultName;
  } = {}): Promise<void> {
    this.logger.info(
      `Starting ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
    this.vaultMetadataDbDomain = [...this.vaultsDbDomain, this.vaultIdEncoded];
    this.vaultsNamesDomain = [...this.vaultsDbDomain, 'names'];
    this.vaultMetadataDb = await this.db.level(
      this.vaultIdEncoded,
      this.vaultsDb,
    );
    // Let's backup any metadata.

    if (fresh) {
      await this.vaultMetadataDb.clear();
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
    await this.mkdirExists(this.vaultIdEncoded);
    await this.mkdirExists(this.vaultDataDir);
    await this.mkdirExists(this.vaultGitDir);
    await this.setupMeta({ vaultName });
    await this.setupGit();
    this.efsVault = await this.efs.chroot(this.vaultDataDir);
    this.logger.info(
      `Started ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
  }

  private async mkdirExists(directory: string) {
    try {
      await this.efs.mkdir(directory, { recursive: true });
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
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
    try {
      await this.efs.rmdir(this.vaultIdEncoded, {
        recursive: true,
      });
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      // Otherwise ignore
    }
    this.logger.info(
      `Destroyed ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
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
    return withF([this.readLock], async () => {
      return await f(this.efsVault);
    });
  }

  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public readG<T, TReturn, TNext>(
    g: (fs: FileSystemReadable) => AsyncGenerator<T, TReturn, TNext>,
  ): AsyncGenerator<T, TReturn, TNext> {
    const efsVault = this.efsVault;
    return withG([this.readLock], async function* () {
      return yield* g(efsVault);
    });
  }

  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async writeF(
    f: (fs: FileSystemWritable) => Promise<void>,
  ): Promise<void> {
    // This should really be an internal property
    // get whether this is remote, and the remote address
    // if it is, we consider this repo an "attached repo"
    // this vault is a "mirrored" vault
    if (
      (await this.db.get(
        this.vaultMetadataDbDomain,
        VaultInternal.remoteKey,
      )) != null
    ) {
      // Mirrored vaults are immutable
      throw new vaultsErrors.ErrorVaultRemoteDefined();
    }
    return withF([this.writeLock], async () => {
      await this.db.put(
        this.vaultMetadataDbDomain,
        VaultInternal.dirtyKey,
        true,
      );

      // We have to chroot it
      // and then remove it
      // but this is done by itself?
      await f(this.efsVault);
      await this.db.put(
        this.vaultMetadataDbDomain,
        VaultInternal.dirtyKey,
        false,
      );
    });

    //   Const message: string[] = [];
    //   try {
    //
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
    const efsVault = this.efsVault;
    const db = this.db;
    const vaultDbDomain = this.vaultMetadataDbDomain;
    return withG([this.writeLock], async function* () {
      if ((await db.get(vaultDbDomain, VaultInternal.remoteKey)) != null) {
        // Mirrored vaults are immutable
        throw new vaultsErrors.ErrorVaultRemoteDefined();
      }
      await db.put(vaultDbDomain, VaultInternal.dirtyKey, true);
      const result = yield* g(efsVault);
      // At the end of the generator
      // you need to do this
      // but just before
      // you need to finish it up

      // DO what you need to do here, create the commit
      await db.put(vaultDbDomain, VaultInternal.dirtyKey, false);
      return result;
    });
  }

  // TODO: this needs to respect the write lock since we are writing to the EFS
  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async pullVault({
    nodeConnectionManager,
    pullNodeId,
    pullVaultNameOrId,
  }: {
    nodeConnectionManager: NodeConnectionManager;
    pullNodeId?: NodeId;
    pullVaultNameOrId?: VaultId | VaultName;
  }) {
    // This error flag will contain the error returned by the cloning grpc stream
    let error;
    // Keeps track of whether the metadata needs changing to avoid unnecessary db ops
    // 0 = no change, 1 = change with vault Id, 2 = change with vault name
    let metaChange = 0;
    const remoteInfo = await this.db.get<RemoteInfo>(
      this.vaultMetadataDbDomain,
      VaultInternal.remoteKey,
    );
    if (remoteInfo == null) throw new vaultsErrors.ErrorVaultRemoteUndefined();

    if (pullNodeId == null) {
      pullNodeId = nodesUtils.decodeNodeId(remoteInfo.remoteNode)!;
    } else {
      metaChange = 1;
      remoteInfo.remoteNode = nodesUtils.encodeNodeId(pullNodeId);
    }
    if (pullVaultNameOrId == null) {
      pullVaultNameOrId = vaultsUtils.decodeVaultId(remoteInfo.remoteVault!)!;
    } else {
      metaChange = 1;
      if (typeof pullVaultNameOrId === 'string') {
        metaChange = 2;
      } else {
        remoteInfo.remoteVault = vaultsUtils.encodeVaultId(pullVaultNameOrId);
      }
    }
    this.logger.info(
      `Pulling Vault ${vaultsUtils.encodeVaultId(
        this.vaultId,
      )} from Node ${pullNodeId}`,
    );
    let remoteVaultId: VaultId;
    try {
      remoteVaultId = await nodeConnectionManager.withConnF(
        pullNodeId!,
        async (connection) => {
          const client = connection.getClient();
          const [request, , remoteVaultId] = await this.request(
            client,
            pullVaultNameOrId!,
            'pull',
          );
          await withF([this.writeLock], async () => {
            await git.pull({
              fs: this.efs,
              http: { request },
              dir: this.vaultDataDir,
              gitdir: this.vaultGitDir,
              url: `http://`,
              ref: 'HEAD',
              singleBranch: true,
              author: {
                name: nodesUtils.encodeNodeId(pullNodeId!),
              },
            });
          });
          return remoteVaultId;
        },
      );
    } catch (err) {
      // If the error flag set and we have the generalised SmartHttpError from
      // isomorphic git then we need to throw the polykey error
      if (err instanceof git.Errors.SmartHttpError && error) {
        throw error;
      } else if (err instanceof git.Errors.MergeNotSupportedError) {
        throw new vaultsErrors.ErrorVaultsMergeConflict();
      }
      throw err;
    }
    if (metaChange !== 0) {
      if (metaChange === 2) {
        remoteInfo.remoteVault = vaultsUtils.encodeVaultId(remoteVaultId);
      }
      await this.db.put(
        this.vaultMetadataDbDomain,
        VaultInternal.remoteKey,
        remoteInfo,
      );
    }
    this.logger.info(
      `Pulled Vault ${vaultsUtils.encodeVaultId(
        this.vaultId,
      )} from Node ${pullNodeId}`,
    );
  }

  /**
   * Setup the vault metadata
   */
  protected async setupMeta({
    vaultName,
  }: {
    vaultName?: VaultName;
  }): Promise<void> {
    // Setup the vault metadata
    // and you need to make certain preparations
    // the meta gets created first
    // if the SoT is the database
    // are we supposed to check this?

    // If this is not existing
    // setup default vaults db
    if (
      (await this.db.get<boolean>(
        this.vaultMetadataDbDomain,
        VaultInternal.dirtyKey,
      )) == null
    ) {
      await this.db.put(
        this.vaultMetadataDbDomain,
        VaultInternal.dirtyKey,
        true,
      );
    }

    // Set up vault Name
    if (
      (await this.db.get<string>(
        this.vaultMetadataDbDomain,
        VaultInternal.nameKey,
      )) == null &&
      vaultName != null
    ) {
      await this.db.put(
        this.vaultMetadataDbDomain,
        VaultInternal.nameKey,
        vaultName,
      );
    }

    // Remote: [NodeId, VaultId] | undefined
    // dirty: boolean
    // name: string | undefined
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
        ref: 'HEAD',
      })) as CommitId;
      // Update master ref
      await git.writeRef({
        fs: this.efs,
        dir: this.vaultDataDir,
        gitdir: this.vaultGitDir,
        ref: vaultsUtils.canonicalBranchRef,
        value: commitIdLatest,
        force: true,
      });
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

  protected async request(
    client: GRPCClientAgent,
    vaultNameOrId: VaultId | VaultName,
    vaultAction: VaultAction,
  ): Promise<any[]> {
    const requestMessage = new vaultsPB.InfoRequest();
    const vaultMessage = new vaultsPB.Vault();
    requestMessage.setAction(vaultAction);
    if (typeof vaultNameOrId === 'string') {
      vaultMessage.setNameOrId(vaultNameOrId);
    } else {
      // To have consistency between GET and POST, send the user
      // readable form of the vault Id
      vaultMessage.setNameOrId(vaultsUtils.encodeVaultId(vaultNameOrId));
    }
    requestMessage.setVault(vaultMessage);
    const response = client.vaultsGitInfoGet(requestMessage);
    let vaultName, remoteVaultId;
    response.stream.on('metadata', async (meta) => {
      // Receive the Id of the remote vault
      vaultName = meta.get('vaultName').pop();
      if (vaultName) vaultName = vaultName.toString();
      const vId = meta.get('vaultId').pop();
      if (vId) remoteVaultId = validationUtils.parseVaultId(vId.toString());
    });
    // Collect the response buffers from the GET request
    const infoResponse: Uint8Array[] = [];
    for await (const resp of response) {
      infoResponse.push(resp.getChunk_asU8());
    }
    const metadata = new grpc.Metadata();
    metadata.set('vaultAction', vaultAction);
    if (typeof vaultNameOrId === 'string') {
      metadata.set('vaultNameOrId', vaultNameOrId);
    } else {
      // Metadata only accepts the user readable form of the vault Id
      // as the string form has illegal characters
      metadata.set('vaultNameOrId', vaultsUtils.encodeVaultId(vaultNameOrId));
    }
    return [
      async function ({
        url,
        method = 'GET',
        headers = {},
        body = [Buffer.from('')],
      }: {
        url: string;
        method: string;
        headers: POJO;
        body: Buffer[];
      }) {
        if (method === 'GET') {
          // Send back the GET request info response
          return {
            url: url,
            method: method,
            body: infoResponse,
            headers: headers,
            statusCode: 200,
            statusMessage: 'OK',
          };
        } else if (method === 'POST') {
          const responseBuffers: Array<Uint8Array> = [];
          const stream = client.vaultsGitPackGet(metadata);
          const chunk = new vaultsPB.PackChunk();
          // Body is usually an async generator but in the cases we are using,
          // only the first value is used
          chunk.setChunk(body[0]);
          // Tell the server what commit we need
          await stream.write(chunk);
          let packResponse = (await stream.read()).value;
          while (packResponse != null) {
            responseBuffers.push(packResponse.getChunk_asU8());
            packResponse = (await stream.read()).value;
          }
          return {
            url: url,
            method: method,
            body: responseBuffers,
            headers: headers,
            statusCode: 200,
            statusMessage: 'OK',
          };
        } else {
          never();
        }
      },
      vaultName,
      remoteVaultId,
    ];
  }
}

export default VaultInternal;
