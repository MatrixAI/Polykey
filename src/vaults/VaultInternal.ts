import type { ReadCommitResult } from 'isomorphic-git';
import type { EncryptedFS } from 'encryptedfs';
import type { DB, DBTransaction, LevelPath } from '@matrixai/db';
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
import type KeyRing from '../keys/KeyRing';
import type { NodeId, NodeIdEncoded } from '../ids/types';
import type NodeManager from '../nodes/NodeManager';
import type { RPCClient } from '@matrixai/rpc';
import type agentClientManifest from '../nodes/agent/callers';
import type { POJO } from '../types';
import path from 'path';
import git from 'isomorphic-git';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { withF, withG } from '@matrixai/resources';
import { RWLockWriter } from '@matrixai/async-locks';
import * as vaultsUtils from './utils';
import * as vaultsErrors from './errors';
import * as vaultsEvents from './events';
import { tagLast } from './types';
import * as ids from '../ids';
import * as nodesUtils from '../nodes/utils';
import * as gitUtils from '../git/utils';
import * as utils from '../utils';

type RemoteInfo = {
  remoteNode: NodeIdEncoded;
  remoteVault: VaultIdEncoded;
};

interface VaultInternal extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new vaultsErrors.ErrorVaultRunning(),
  new vaultsErrors.ErrorVaultDestroyed(),
  {
    eventStart: vaultsEvents.EventVaultInternalStart,
    eventStarted: vaultsEvents.EventVaultInternalStarted,
    eventStop: vaultsEvents.EventVaultInternalStop,
    eventStopped: vaultsEvents.EventVaultInternalStopped,
    eventDestroy: vaultsEvents.EventVaultInternalDestroy,
    eventDestroyed: vaultsEvents.EventVaultInternalDestroyed,
  },
)
class VaultInternal {
  /**
   *  Creates a VaultInternal.
   *  If no state already exists then state for the vault is initialized.
   *  If state already exists then this just creates the `VaultInternal` instance for managing that state.
   */
  public static async createVaultInternal({
    vaultId,
    vaultName,
    db,
    vaultsDbPath,
    keyRing,
    efs,
    logger = new Logger(this.name),
    fresh = false,
    tran,
  }: {
    vaultId: VaultId;
    vaultName?: VaultName;
    db: DB;
    vaultsDbPath: LevelPath;
    keyRing: KeyRing;
    efs: EncryptedFS;
    logger?: Logger;
    fresh?: boolean;
    tran?: DBTransaction;
  }): Promise<VaultInternal> {
    if (tran == null) {
      return await db.withTransactionF((tran) =>
        this.createVaultInternal({
          vaultId,
          vaultName,
          db,
          vaultsDbPath,
          keyRing,
          efs,
          logger,
          fresh,
          tran,
        }),
      );
    }

    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    logger.info(`Creating ${this.name} - ${vaultIdEncoded}`);
    const vault = new this({
      vaultId,
      db,
      vaultsDbPath,
      keyRing,
      efs,
      logger,
    });
    await vault.start({ fresh, vaultName, tran });
    logger.info(`Created ${this.name} - ${vaultIdEncoded}`);
    return vault;
  }

  /**
   * Will create a new vault by cloning the vault from a remote node.
   */
  public static async cloneVaultInternal({
    targetNodeId,
    targetVaultNameOrId,
    vaultId,
    db,
    vaultsDbPath,
    keyRing,
    nodeManager,
    efs,
    logger = new Logger(this.name),
    tran,
  }: {
    targetNodeId: NodeId;
    targetVaultNameOrId: VaultId | VaultName;
    vaultId: VaultId;
    db: DB;
    vaultsDbPath: LevelPath;
    efs: EncryptedFS;
    keyRing: KeyRing;
    nodeManager: NodeManager;
    logger?: Logger;
    tran?: DBTransaction;
  }): Promise<VaultInternal> {
    if (tran == null) {
      return await db.withTransactionF((tran) =>
        this.cloneVaultInternal({
          targetNodeId,
          targetVaultNameOrId,
          vaultId,
          db,
          vaultsDbPath,
          keyRing,
          nodeManager,
          efs,
          logger,
          tran,
        }),
      );
    }
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    logger.info(`Cloning ${this.name} - ${vaultIdEncoded}`);
    const vault = new this({
      vaultId,
      db,
      vaultsDbPath,
      keyRing,
      efs,
      logger,
    });
    // Make the directory where the .git files will be auto generated and
    // where the contents will be cloned to ('contents' file)
    await efs.mkdir(vault.vaultDataDir, { recursive: true });
    const [vaultName, remoteVaultId]: [VaultName, VaultId] =
      await nodeManager.withConnF(targetNodeId, async (connection) => {
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
          ref: vaultsUtils.canonicalBranchRef,
        });
        return [vaultName, remoteVaultId];
      });
    const remote: RemoteInfo = {
      remoteNode: nodesUtils.encodeNodeId(targetNodeId),
      remoteVault: vaultsUtils.encodeVaultId(remoteVaultId),
    };

    await vault.start({ vaultName, tran });
    // Setting the remote in the metadata
    await tran.put(
      [...vault.vaultMetadataDbPath, VaultInternal.remoteKey],
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
  protected vaultsDbPath: LevelPath;
  protected vaultMetadataDbPath: LevelPath;
  protected keyRing: KeyRing;
  protected vaultsNamesPath: LevelPath;
  protected efs: EncryptedFS;
  protected efsVault: EncryptedFS;
  protected lock: RWLockWriter = new RWLockWriter();

  public getLock(): RWLockWriter {
    return this.lock;
  }

  constructor({
    vaultId,
    db,
    vaultsDbPath,
    keyRing,
    efs,
    logger,
  }: {
    vaultId: VaultId;
    db: DB;
    vaultsDbPath: LevelPath;
    keyRing: KeyRing;
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
    this.vaultsDbPath = vaultsDbPath;
    this.keyRing = keyRing;
    this.efs = efs;
  }

  /**
   *
   * @param fresh Clears all state before starting
   * @param vaultName Name of the vault, Only used when creating a new vault
   * @param tran
   */
  public async start({
    fresh = false,
    vaultName,
    tran,
  }: {
    fresh?: boolean;
    vaultName?: VaultName;
    tran?: DBTransaction;
  } = {}): Promise<void> {
    if (tran == null) {
      return await this.db.withTransactionF((tran) =>
        this.start_(fresh, tran, vaultName),
      );
    }
    return await this.start_(fresh, tran, vaultName);
  }

  /**
   * We use a protected start method to avoid the `async-init` lifecycle deadlocking when doing the recursive call to
   * create a DBTransaction.
   */
  protected async start_(
    fresh: boolean,
    tran: DBTransaction,
    vaultName?: VaultName,
  ) {
    this.logger.info(
      `Starting ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
    this.vaultMetadataDbPath = [...this.vaultsDbPath, this.vaultIdEncoded];
    this.vaultsNamesPath = [...this.vaultsDbPath, 'names'];
    if (fresh) {
      await tran.clear(this.vaultMetadataDbPath);
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
    await vaultsUtils.mkdirExists(this.efs, this.vaultIdEncoded);
    await vaultsUtils.mkdirExists(this.efs, this.vaultDataDir);
    await vaultsUtils.mkdirExists(this.efs, this.vaultGitDir);
    await this.setupMeta({ vaultName, tran });
    await this.setupGit(tran);
    this.efsVault = await this.efs.chroot(this.vaultDataDir);
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

  public async destroy(tran?: DBTransaction): Promise<void> {
    if (tran == null) {
      return await this.db.withTransactionF((tran) => this.destroy_(tran));
    }
    return await this.destroy_(tran);
  }

  /**
   * We use a protected destroy method to avoid the `async-init` lifecycle deadlocking when doing the recursive call to
   * create a DBTransaction.
   */
  protected async destroy_(tran: DBTransaction) {
    this.logger.info(
      `Destroying ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
    await tran.clear(this.vaultMetadataDbPath);
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
    vaultsUtils.assertRef(ref);
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
  public async version(ref: string | VaultRef = tagLast): Promise<void> {
    vaultsUtils.assertRef(ref);
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
      if (
        e instanceof git.Errors.NotFoundError ||
        e instanceof git.Errors.CommitNotFetchedError
      ) {
        throw new vaultsErrors.ErrorVaultReferenceMissing(e.message, {
          cause: e,
        });
      }
      throw e;
    }
  }

  /**
   * With context handler for using a vault in a read-only context.
   */
  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async readF<T>(f: (fs: FileSystemReadable) => Promise<T>): Promise<T> {
    return withF([this.lock.read()], async () => {
      return await f(this.efsVault);
    });
  }

  /**
   * With context handler for using a vault in a read-only context for a generator.
   */
  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public readG<T, TReturn, TNext>(
    g: (fs: FileSystemReadable) => AsyncGenerator<T, TReturn, TNext>,
  ): AsyncGenerator<T, TReturn, TNext> {
    const efsVault = this.efsVault;
    return withG([this.lock.read()], async function* () {
      return yield* g(efsVault);
    });
  }

  /**
   * With context handler for using a vault in a writable context.
   */
  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async writeF(
    f: (fs: FileSystemWritable) => Promise<void>,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.writeF(f, tran));
    }

    return withF([this.lock.write()], async () => {
      await tran.lock(
        [...this.vaultMetadataDbPath, VaultInternal.dirtyKey].join(''),
      );

      // This should really be an internal property
      // get whether this is remote, and the remote address
      // if it is, we consider this repo an "attached repo"
      // this vault is a "mirrored" vault
      if (
        (await tran.get([
          ...this.vaultMetadataDbPath,
          VaultInternal.remoteKey,
        ])) != null
      ) {
        // Mirrored vaults are immutable
        throw new vaultsErrors.ErrorVaultRemoteDefined();
      }
      await tran.put(
        [...this.vaultMetadataDbPath, VaultInternal.dirtyKey],
        true,
      );
      try {
        await f(this.efsVault);
        // After doing mutation we need to commit the new history
        await this.createCommit();
      } catch (e) {
        // Error implies dirty state
        await this.cleanWorkingDirectory();
        throw e;
      }
      await tran.put(
        [...this.vaultMetadataDbPath, VaultInternal.dirtyKey],
        false,
      );
    });
  }

  /**
   * With context handler for using a vault in a writable context for a generator.
   */
  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public writeG<T, TReturn, TNext>(
    g: (fs: FileSystemWritable) => AsyncGenerator<T, TReturn, TNext>,
    tran?: DBTransaction,
  ): AsyncGenerator<T, TReturn, TNext> {
    if (tran == null) {
      return this.db.withTransactionG((tran) => this.writeG(g, tran));
    }

    const efsVault = this.efsVault;
    const vaultMetadataDbPath = this.vaultMetadataDbPath;
    const createCommit = () => this.createCommit();
    const cleanWorkingDirectory = () => this.cleanWorkingDirectory();
    return withG([this.lock.write()], async function* () {
      if (
        (await tran.get([...vaultMetadataDbPath, VaultInternal.remoteKey])) !=
        null
      ) {
        // Mirrored vaults are immutable
        throw new vaultsErrors.ErrorVaultRemoteDefined();
      }
      await tran.lock(
        [...vaultMetadataDbPath, VaultInternal.dirtyKey].join(''),
      );
      await tran.put([...vaultMetadataDbPath, VaultInternal.dirtyKey], true);

      let result: TReturn;
      // Do what you need to do here, create the commit
      try {
        result = yield* g(efsVault);
        // At the end of the generator
        // you need to do this
        // but just before
        // you need to finish it up
        // After doing mutation we need to commit the new history
        await createCommit();
      } catch (e) {
        // Error implies dirty state
        await cleanWorkingDirectory();
        throw e;
      }
      await tran.put([...vaultMetadataDbPath, VaultInternal.dirtyKey], false);
      return result;
    });
  }

  /**
   * Pulls changes to a vault from the vault's default remote.
   * If `pullNodeId` and `pullVaultNameOrId` it uses that for the remote instead.
   */
  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async pullVault({
    nodeManager,
    pullNodeId,
    pullVaultNameOrId,
    tran,
  }: {
    nodeManager: NodeManager;
    pullNodeId?: NodeId;
    pullVaultNameOrId?: VaultId | VaultName;
    tran?: DBTransaction;
  }): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.pullVault({
          nodeManager,
          pullNodeId,
          pullVaultNameOrId,
          tran,
        }),
      );
    }

    // Keeps track of whether the metadata needs changing to avoid unnecessary db ops
    // 0 = no change, 1 = change with vault ID, 2 = change with vault name
    let metaChange = 0;
    const remoteInfo = await tran.get<RemoteInfo>([
      ...this.vaultMetadataDbPath,
      VaultInternal.remoteKey,
    ]);
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
      remoteVaultId = await nodeManager.withConnF(
        pullNodeId!,
        async (connection) => {
          const client = connection.getClient();
          const [request, , remoteVaultId] = await this.request(
            client,
            pullVaultNameOrId!,
            'pull',
          );
          await withF([this.lock.write()], async () => {
            await git.pull({
              fs: this.efs,
              http: { request },
              dir: this.vaultDataDir,
              gitdir: this.vaultGitDir,
              url: `http://`,
              ref: vaultsUtils.canonicalBranchRef,
              singleBranch: true,
              fastForward: true,
              fastForwardOnly: true,
              author: {
                name: nodesUtils.encodeNodeId(pullNodeId!),
              },
            });
          });
          return remoteVaultId;
        },
      );
    } catch (e) {
      // If the error flag set, and we have the generalised SmartHttpError from
      // isomorphic git then we need to throw the polykey error
      if (e instanceof git.Errors.MergeNotSupportedError) {
        throw new vaultsErrors.ErrorVaultsMergeConflict(e.message, {
          cause: e,
        });
      }
      throw e;
    }
    if (metaChange !== 0) {
      if (metaChange === 2) {
        remoteInfo.remoteVault = vaultsUtils.encodeVaultId(remoteVaultId);
      }
      await tran.put(
        [...this.vaultMetadataDbPath, VaultInternal.remoteKey],
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
   * Sets up the vault metadata.
   * Creates a `dirty` boolean in the database to track dirty state of the vault.
   * Also adds the vault's name to the database.
   */
  protected async setupMeta({
    vaultName,
    tran,
  }: {
    vaultName?: VaultName;
    tran: DBTransaction;
  }): Promise<void> {
    // Set up dirty key defaulting to false
    if (
      (await tran.get<boolean>([
        ...this.vaultMetadataDbPath,
        VaultInternal.dirtyKey,
      ])) == null
    ) {
      await tran.put(
        [...this.vaultMetadataDbPath, VaultInternal.dirtyKey],
        false,
      );
    }

    // Set up vault Name
    if (
      (await tran.get<string>([
        ...this.vaultMetadataDbPath,
        VaultInternal.nameKey,
      ])) == null &&
      vaultName != null
    ) {
      await tran.put(
        [...this.vaultMetadataDbPath, VaultInternal.nameKey],
        vaultName,
      );
    }

    // Dirty: boolean
    // name: string | undefined
  }

  /**
   * Does an idempotent initialization of the git repository for the vault.
   * If the vault is in a dirty state then we clean up the working directory
   * or any history not part of the canonicalBranch.
   */
  protected async setupGit(tran: DBTransaction): Promise<string> {
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
        author: vaultsUtils.commitAuthor(this.keyRing.getNodeId()),
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
      // Checking for dirty
      if (
        (await tran.get<boolean>([
          ...this.vaultMetadataDbPath,
          VaultInternal.dirtyKey,
        ])) === true
      ) {
        // Force checkout out to the latest commit
        // This ensures that any uncommitted state is dropped
        await this.cleanWorkingDirectory();
        // Do global GC operation
        await this.garbageCollectGitObjectsGlobal();

        // Setting dirty back to false
        await tran.put(
          [...this.vaultMetadataDbPath, VaultInternal.dirtyKey],
          false,
        );
      }
    }
    return commitIdLatest;
  }

  /**
   * Creates a request arrow function that implements an api that `isomorphic-git` expects to use when making a http
   * request. It makes RPC calls to `vaultsGitInfoGet` for the ref advertisement phase and `vaultsGitPackGet` for the
   * git pack phase.
   *
   * `vaultsGitInfoGet` wraps a call to `gitHttp.advertiseRefGenerator` and `vaultsGitPackGet` to
   * `gitHttp.generatePackRequest`.
   *
   * ```
   *                                  ┌─────────┐    ┌───────────────────────────┐
   *                                  │         │    │                           │
   *  ┌──────────────────────┐        │  RPC    │    │                           │
   *  │                      │        │         │    │ *advertiseRefGenerator()  │
   *  │                      ├────────┼─────────┼────►                           │
   *  │     vault.request()  │        │         │    │                           │
   *  │                      │        │         │    └────┬──────────────────────┘
   *  │                      ├──┐     │         │         │
   *  │                      │  │     │         │    ┌────▼──────────────────────┐
   *  └──────────────────────┘  │     │         │    │                           │
   *                            │     │         │    │ *referenceListGenerator() │
   *                            │     │         │    │                           │
   *                            │     │         │    └───────────────────────────┘
   *                            │     │         │
   *                            │     │         │    ┌───────────────────────────┐
   *                            └─────┼─────────┼────┤                           │
   *                                  │         │    │ *generatePackRequest()    │
   *                                  │         │    │                           │
   *                                  │         │    └────┬──────────────────────┘
   *                                  └─────────┘         │
   *                                                 ┌────▼──────────────────────┐
   *                                                 │                           │
   *                                                 │ *generatePackData()       │
   *                                                 │                           │
   *                                                 └───────────────────────────┘
   *
   * ```
   */
  protected async request(
    client: RPCClient<typeof agentClientManifest>,
    vaultNameOrId: VaultId | VaultName,
    vaultAction: VaultAction,
  ): Promise<any[]> {
    const vaultNameOrId_ =
      typeof vaultNameOrId === 'string'
        ? vaultNameOrId
        : vaultsUtils.encodeVaultId(vaultNameOrId);
    const vaultsGitInfoGetStream = await client.methods.vaultsGitInfoGet({
      vaultNameOrId: vaultNameOrId_,
      action: vaultAction,
    });

    const result = vaultsGitInfoGetStream.meta?.result;
    if (result == null || !utils.isObject(result)) {
      utils.never('"result" must be a defined object');
    }
    if (!('vaultName' in result) || typeof result.vaultName !== 'string') {
      utils.never('"vaultName" must be defined and a string');
    }
    if (
      !('vaultIdEncoded' in result) ||
      typeof result.vaultIdEncoded !== 'string'
    ) {
      utils.never('"vaultIdEncoded" must be defined and a string');
    }
    const vaultName = result.vaultName;
    const remoteVaultId = ids.parseVaultId(result.vaultIdEncoded);

    const vaultsGitPackGetStream = await client.methods.vaultsGitPackGet({
      nameOrId: result.vaultIdEncoded as string,
      vaultAction,
    });

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
        body: Array<Buffer>;
      }) {
        switch (method) {
          case 'GET': {
            // Send back the GET request info response
            return {
              url: url,
              method: method,
              body: vaultsGitInfoGetStream.readable,
              headers: headers,
              statusCode: 200,
              statusMessage: 'OK',
            };
          }
          case 'POST': {
            const writer = vaultsGitPackGetStream.writable.getWriter();
            await writer.write(body[0]);
            await writer.close();
            return {
              url: url,
              method: method,
              body: vaultsGitPackGetStream.readable,
              headers: headers,
              statusCode: 200,
              statusMessage: 'OK',
            };
          }
          default:
            utils.never(`method must be "GET" or "POST" got "${method}"`);
        }
      },
      vaultName,
      remoteVaultId,
    ];
  }

  /**
   * Creates a commit while moving the canonicalBranch reference to that new commit.
   * If the commit creates a branch from the canonical history. Then the new commit becomes the new canonical history
   * and the old history is removed from the old canonical head to the branch point. This is to maintain the strict
   * non-branching linear history.
   */
  protected async createCommit() {
    // Forced wait for 1 ms to allow difference in mTime between file changes
    await utils.sleep(1);
    // Checking if commit is appending or branching
    const headRef = await git.resolveRef({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
      ref: 'HEAD',
    });
    const masterRef = await git.resolveRef({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
      ref: vaultsUtils.canonicalBranchRef,
    });
    const nodeIdEncoded = nodesUtils.encodeNodeId(this.keyRing.getNodeId());
    // Staging changes and creating commit message
    const message: string[] = [];
    // Get the status of each file in the working directory
    // https://isomorphic-git.org/docs/en/statusMatrix
    await git.add({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
      filepath: '.',
    });
    const statusMatrix = await git.statusMatrix({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
    });
    for (const [
      filePath,
      HEADStatus,
      workingDirStatus,
      stageStatus,
    ] of statusMatrix) {
      /*
        Type StatusRow     = [Filename, HeadStatus, WorkdirStatus, StageStatus]
        The HeadStatus status is either absent (0) or present (1).
        The WorkdirStatus status is either absent (0), identical to HEAD (1), or different from HEAD (2).
        The StageStatus status is either absent (0), identical to HEAD (1), identical to WORKDIR (2), or different from WORKDIR (3).

        ```js
        // example StatusMatrix
        [
          ["a.txt", 0, 2, 0], // new, untracked
          ["b.txt", 0, 2, 2], // added, staged
          ["c.txt", 0, 2, 3], // added, staged, with unstaged changes
          ["d.txt", 1, 1, 1], // unmodified
          ["e.txt", 1, 2, 1], // modified, unstaged
          ["f.txt", 1, 2, 2], // modified, staged
          ["g.txt", 1, 2, 3], // modified, staged, with unstaged changes
          ["h.txt", 1, 0, 1], // deleted, unstaged
          ["i.txt", 1, 0, 0], // deleted, staged
        ]
        ```
       */
      const status = `${HEADStatus}${workingDirStatus}${stageStatus}`;
      switch (status) {
        case '022': // Added, staged
          message.push(`${filePath} added`);
          break;
        case '111': // Unmodified
          break;
        case '122': // Modified, staged
          message.push(`${filePath} modified`);
          break;
        case '101': // Deleted, unStaged
          // need to stage the deletion with remove
          await git.remove({
            fs: this.efs,
            dir: this.vaultDataDir,
            gitdir: this.vaultGitDir,
            filepath: filePath,
          });
        // Fall through
        case '100': // Deleted, staged
          message.push(`${filePath} deleted`);
          break;
        default:
          // We don't handle untracked and partially staged files since we add all files to staging before processing
          utils.never(
            `Status ${status} is unhandled because it was unexpected state`,
          );
      }
    }
    // Skip commit if no changes were made
    if (message.length !== 0) {
      // Creating commit
      const commitRef = await git.commit({
        fs: this.efs,
        dir: this.vaultDataDir,
        gitdir: this.vaultGitDir,
        author: {
          name: nodeIdEncoded,
        },
        message: message.toString(),
        ref: 'HEAD',
      });
      // Updating branch pointer
      await git.writeRef({
        fs: this.efs,
        dir: this.vaultDataDir,
        gitdir: this.vaultGitDir,
        ref: vaultsUtils.canonicalBranchRef,
        value: commitRef,
        force: true,
      });
      // We clean old history if a commit was made on previous version
      if (headRef !== masterRef) {
        await this.garbageCollectGitObjectsLocal(masterRef, headRef);
      }
    }
  }

  /**
   * Cleans the git working directory by checking out the canonicalBranch.
   * This will remove any un-committed changes since any untracked or modified files outside a commit is dirty state.
   * Dirty state should only happen if the usual commit procedure was interrupted ungracefully.
   */
  protected async cleanWorkingDirectory() {
    // Check the status matrix for any un-staged file changes
    // which are considered dirty commits
    const statusMatrix = await git.statusMatrix({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
    });
    for await (const [filePath, , workingDirStatus] of statusMatrix) {
      // For all files stage all changes, this is needed
      // so that we can check out all untracked files as well
      if (workingDirStatus === 0) {
        await git.remove({
          fs: this.efs,
          dir: this.vaultDataDir,
          gitdir: this.vaultGitDir,
          filepath: filePath,
        });
      } else {
        await git.add({
          fs: this.efs,
          dir: this.vaultDataDir,
          gitdir: this.vaultGitDir,
          filepath: filePath,
        });
      }
    }
    // Remove the staged dirty commits by checking out
    await git.checkout({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
      ref: vaultsUtils.canonicalBranchRef,
      force: true,
    });
  }

  /**
   * This will walk the current canonicalBranch history and delete any objects that are not a part of it.
   * This is costly since it will compare the walked tree with all existing objects.
   */
  protected async garbageCollectGitObjectsGlobal() {
    const objectIdsAll = await gitUtils.listObjectsAll({
      fs: this.efs,
      gitDir: this.vaultGitDir,
    });
    const objects = new Set(objectIdsAll);
    const masterRef = await git.resolveRef({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
      ref: vaultsUtils.canonicalBranch,
    });
    const reachableObjects = await gitUtils.listObjects({
      efs: this.efs,
      dir: this.vaultDataDir,
      gitDir: this.vaultGitDir,
      wants: [masterRef],
      haves: [],
    });
    // Walk from head to all reachable objects
    for (const objectReachable of reachableObjects) {
      objects.delete(objectReachable);
    }
    // Any objects left in `objects` was unreachable, thus they are a part of orphaned branches
    // So we want to delete them.
    const deletePs: Array<Promise<void>> = [];
    for (const objectId of objects) {
      deletePs.push(
        vaultsUtils.deleteObject(this.efs, this.vaultGitDir, objectId),
      );
    }
    await Promise.all(deletePs);
  }

  /**
   * This will walk from the `startId` to the `StopId` deleting objects as it goes.
   * This is smarter since it only walks over the old history and not everything.
   */
  protected async garbageCollectGitObjectsLocal(
    startId: string,
    stopId: string,
  ) {
    const objects = await gitUtils.listObjects({
      efs: this.efs,
      dir: this.vaultDataDir,
      gitDir: this.vaultGitDir,
      wants: [startId],
      haves: [stopId],
    });
    const deletePs: Array<Promise<void>> = [];
    for (const objectId of objects) {
      deletePs.push(
        vaultsUtils.deleteObject(this.efs, this.vaultGitDir, objectId),
      );
    }
    await Promise.all(deletePs);
  }
}

export default VaultInternal;
export type { RemoteInfo };
