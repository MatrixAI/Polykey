import type { EncryptedFS } from 'encryptedfs';
import type { ReadCommitResult } from 'isomorphic-git';
import type { ContextTimed, ContextTimedInput } from '@matrixai/contexts';
import type { DB, DBTransaction, LevelPath } from '@matrixai/db';
import type { RPCClient } from '@matrixai/rpc';
import type { ResourceAcquire, ResourceRelease } from '@matrixai/resources';
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
} from './types.js';
import type { POJO } from '../types.js';
import type { NodeId, NodeIdEncoded } from '../ids/types.js';
import type KeyRing from '../keys/KeyRing.js';
import type NodeManager from '../nodes/NodeManager.js';
import type { AgentClientManifest } from '../nodes/agent/callers/index.js';
import type agentClientManifest from '../nodes/agent/callers/index.js';
import path from 'node:path';
import git from 'isomorphic-git';
import Logger from '@matrixai/logger';
import { createDestroyStartStop } from '@matrixai/async-init';
import { RWLockWriter } from '@matrixai/async-locks';
import { decorators } from '@matrixai/contexts';
import { withF, withG } from '@matrixai/resources';
import { tagLast } from './types.js';
import * as vaultsErrors from './errors.js';
import * as vaultsEvents from './events.js';
import * as vaultsUtils from './utils.js';
import * as ids from '../ids/index.js';
import * as utils from '../utils/index.js';
import * as nodesUtils from '../nodes/utils.js';
import * as gitUtils from '../git/utils.js';

type RemoteInfo = {
  remoteNode: NodeIdEncoded;
  remoteVault: VaultIdEncoded;
};

interface VaultInternal extends createDestroyStartStop.CreateDestroyStartStop {}
@createDestroyStartStop.CreateDestroyStartStop(
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
   * Creates a VaultInternal.
   * If no state already exists then a new state for the vault is initialized.
   * If state already exists then this just creates the `VaultInternal`
   * instance for managing that state.
   */
  public static async createVaultInternal(
    {
      vaultId,
      vaultName,
      db,
      vaultsDbPath,
      keyRing,
      efs,
      fresh = false,
      logger = new Logger(this.name),
    }: {
      vaultId: VaultId;
      vaultName?: VaultName;
      db: DB;
      vaultsDbPath: LevelPath;
      keyRing: KeyRing;
      efs: EncryptedFS;
      fresh?: boolean;
      logger?: Logger;
    },
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<VaultInternal>;
  @decorators.timedCancellable(true)
  public static async createVaultInternal(
    {
      vaultId,
      vaultName,
      db,
      vaultsDbPath,
      keyRing,
      efs,
      fresh = false,
      logger = new Logger(this.name),
    }: {
      vaultId: VaultId;
      vaultName?: VaultName;
      db: DB;
      vaultsDbPath: LevelPath;
      keyRing: KeyRing;
      efs: EncryptedFS;
      fresh?: boolean;
      logger?: Logger;
    },
    tran: DBTransaction | undefined,
    @decorators.context ctx: ContextTimed,
  ): Promise<VaultInternal> {
    if (tran == null) {
      return await db.withTransactionF((tran) =>
        this.createVaultInternal(
          {
            vaultId,
            vaultName,
            db,
            vaultsDbPath,
            keyRing,
            efs,
            fresh,
            logger,
          },
          tran,
          ctx,
        ),
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
    await vault.start({ fresh, vaultName }, tran, ctx);
    logger.info(`Created ${this.name} - ${vaultIdEncoded}`);
    return vault;
  }

  /**
   * Will create a new vault by cloning the vault from a remote node.
   */
  public static async cloneVaultInternal(
    {
      targetNodeId,
      targetVaultNameOrId,
      vaultId,
      db,
      vaultsDbPath,
      efs,
      keyRing,
      nodeManager,
      logger = new Logger(this.name),
    }: {
      targetNodeId: NodeId;
      targetVaultNameOrId: VaultId | VaultName;
      vaultId: VaultId;
      db: DB;
      vaultsDbPath: LevelPath;
      efs: EncryptedFS;
      keyRing: KeyRing;
      nodeManager: NodeManager<AgentClientManifest>;
      logger?: Logger;
    },
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<VaultInternal>;
  @decorators.timedCancellable(true)
  public static async cloneVaultInternal(
    {
      targetNodeId,
      targetVaultNameOrId,
      vaultId,
      db,
      vaultsDbPath,
      efs,
      keyRing,
      nodeManager,
      logger = new Logger(this.name),
    }: {
      targetNodeId: NodeId;
      targetVaultNameOrId: VaultId | VaultName;
      vaultId: VaultId;
      db: DB;
      vaultsDbPath: LevelPath;
      efs: EncryptedFS;
      keyRing: KeyRing;
      nodeManager: NodeManager<AgentClientManifest>;
      logger?: Logger;
    },
    tran: DBTransaction | undefined,
    @decorators.context ctx: ContextTimed,
  ): Promise<VaultInternal> {
    if (tran == null) {
      return await db.withTransactionF((tran) =>
        this.cloneVaultInternal(
          {
            targetNodeId,
            targetVaultNameOrId,
            vaultId,
            db,
            vaultsDbPath,
            efs,
            keyRing,
            nodeManager,
            logger,
          },
          tran,
          ctx,
        ),
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
    // Make the directory where the .git files will be auto generated and where
    // the contents will be cloned to ('contents' file)
    await efs.mkdir(vault.vaultDataDir, { recursive: true });
    const [vaultName, remoteVaultId]: [VaultName, VaultId] =
      await nodeManager.withConnF(targetNodeId, ctx, async (connection) => {
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

    await vault.start({ vaultName }, tran, ctx);
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
   * @param fresh Should the state be cleared before starting?
   * @param vaultName Name of the vault. Only used when creating a new vault.
   * @param tran
   * @param ctx
   */
  public async start(
    {
      vaultName,
      fresh = false,
    }: {
      vaultName?: VaultName;
      fresh?: boolean;
    } = {},
    tran?: DBTransaction,
    ctx?: ContextTimed,
  ): Promise<void> {
    if (tran == null) {
      return await this.db.withTransactionF((tran) =>
        this.start_({ vaultName, fresh }, tran, ctx),
      );
    }
    return await this.start_({ vaultName, fresh }, tran, ctx);
  }

  /**
   * We use a protected start method to avoid the `async-init` lifecycle
   * deadlocking when doing the recursive call to create a DBTransaction.
   */
  protected async start_(
    {
      vaultName,
      fresh,
    }: {
      vaultName?: VaultName;
      fresh: boolean;
    },
    tran: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<void>;
  @decorators.timedCancellable(true)
  protected async start_(
    {
      vaultName,
      fresh,
    }: {
      vaultName?: VaultName;
      fresh: boolean;
    },
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): Promise<void> {
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
    await this.setupMeta({ vaultName }, tran);
    await this.setupGit(tran, ctx);
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
   * We use a protected destroy method to avoid the `async-init` lifecycle
   * deadlocking when doing the recursive call to create a DBTransaction.
   */
  protected async destroy_(tran: DBTransaction): Promise<void> {
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
    }
    this.logger.info(
      `Destroyed ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
  }

  public async log(
    ref?: string | VaultRef,
    limit?: number,
  ): Promise<Array<CommitLog>>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultNotRunning())
  public async log(
    ref: string | VaultRef = 'HEAD',
    limit: number,
  ): Promise<Array<CommitLog>> {
    vaultsUtils.assertRef(ref);
    if (ref === vaultsUtils.tagLast) {
      ref = vaultsUtils.canonicalBranch;
    }
    const commits = await git.log({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
      ref: ref,
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
   * Checks out the vault repository to specific commit ID or special tags.
   * This changes the working directory and updates the HEAD reference.
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultNotRunning())
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
        ref: ref,
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
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultNotRunning())
  public async readF<T>(f: (fs: FileSystemReadable) => Promise<T>): Promise<T> {
    return withF([this.lock.read()], async () => {
      return await f(this.efsVault);
    });
  }

  /**
   * With context handler for using a vault in a read-only context for a
   * generator.
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultNotRunning())
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
  public async writeF(
    f: (fs: FileSystemWritable) => Promise<void>,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<void>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultNotRunning())
  @decorators.timedCancellable(true)
  public async writeF(
    f: (fs: FileSystemWritable) => Promise<void>,
    tran: DBTransaction | undefined,
    @decorators.context ctx: ContextTimed,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.writeF(f, tran, ctx));
    }

    return withF([this.lock.write()], async () => {
      await tran.lock(
        [...this.vaultMetadataDbPath, VaultInternal.dirtyKey].join(''),
      );

      // This should really be an internal property. Check whether this is the
      // remote address. If it is, we consider this repo an "attached repo".
      // This vault is a "mirrored" vault.
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
        await this.createCommit(ctx);
      } catch (e) {
        // Error implies dirty state
        await this.cleanWorkingDirectory(ctx);
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
  public writeG<T, TReturn, TNext>(
    g: (fs: FileSystemWritable) => AsyncGenerator<T, TReturn, TNext>,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): AsyncGenerator<T, TReturn, TNext>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultNotRunning())
  @decorators.timed()
  public writeG<T, TReturn, TNext>(
    g: (fs: FileSystemWritable) => AsyncGenerator<T, TReturn, TNext>,
    tran: DBTransaction | undefined,
    @decorators.context ctx: ContextTimed,
  ): AsyncGenerator<T, TReturn, TNext> {
    if (tran == null) {
      return this.db.withTransactionG((tran) => this.writeG(g, tran, ctx));
    }

    const efsVault = this.efsVault;
    const vaultMetadataDbPath = this.vaultMetadataDbPath;
    // In AsyncGenerators, "this" refers to the generator itself, so we alias
    // "this" and use the alias to access protected methods.
    const parentThis = this;
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

      // Create the commit
      let result: TReturn;
      try {
        result = yield* g(efsVault);
        // After doing mutation we need to commit the new history. You need to
        // do this at the end of the generator.
        await parentThis.createCommit(ctx);
      } catch (e) {
        // Error implies dirty state
        await parentThis.cleanWorkingDirectory(ctx);
        throw e;
      }
      await tran.put([...vaultMetadataDbPath, VaultInternal.dirtyKey], false);
      return result;
    });
  }

  /**
   * Acquire a read-only lock on this vault.
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultNotRunning())
  public acquireRead(): ResourceAcquire<FileSystemReadable> {
    return async () => {
      const acquire = this.lock.read();
      const [release] = await acquire();
      return [
        async (e?: Error) => {
          await release(e);
        },
        this.efsVault,
      ];
    };
  }

  /**
   * Acquire a read-write lock on this vault.
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultNotRunning())
  public acquireWrite(
    tran: DBTransaction | undefined,
    ctx: ContextTimed,
  ): ResourceAcquire<FileSystemWritable> {
    return async () => {
      let releaseTran: ResourceRelease | undefined = undefined;
      const acquire = this.lock.write();
      const [release] = await acquire();

      if (tran == null) {
        const acquireTran = this.db.transaction();
        [releaseTran, tran] = await acquireTran();
        // The returned transaction should not be undefined in this case.
        if (tran == null) utils.never('Acquired transactions cannot be null');
      }

      await tran.lock(
        [...this.vaultMetadataDbPath, VaultInternal.dirtyKey].join(''),
      );
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
      return [
        async (e?: Error) => {
          if (e == null) {
            try {
              // After doing mutation we need to commit the new history
              await this.createCommit(ctx);
            } catch (e_) {
              e = e_;
              // Error implies dirty state
              await this.cleanWorkingDirectory(ctx);
            }
          }
          // For some reason, the transaction type doesn't properly waterfall
          // down to here.
          await tran!.put(
            [...this.vaultMetadataDbPath, VaultInternal.dirtyKey],
            false,
          );
          if (releaseTran != null) await releaseTran(e);
          await release(e);
        },
        this.efsVault,
      ];
    };
  }

  /**
   * Pulls changes to a vault from the vault's default remote. If `pullNodeId`
   * and `pullVaultNameOrId` it uses that for the remote instead.
   */
  public async pullVault(
    {
      nodeManager,
      pullNodeId,
      pullVaultNameOrId,
    }: {
      nodeManager: NodeManager<AgentClientManifest>;
      pullNodeId?: NodeId;
      pullVaultNameOrId?: VaultId | VaultName;
    },
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<void>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultNotRunning())
  @decorators.timedCancellable(true)
  public async pullVault(
    {
      nodeManager,
      pullNodeId,
      pullVaultNameOrId,
    }: {
      nodeManager: NodeManager<AgentClientManifest>;
      pullNodeId?: NodeId;
      pullVaultNameOrId?: VaultId | VaultName;
    },
    tran: DBTransaction | undefined,
    @decorators.context ctx: ContextTimed,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.pullVault(
          {
            nodeManager,
            pullNodeId,
            pullVaultNameOrId,
          },
          tran,
          ctx,
        ),
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
        ctx,
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
              author: { name: nodesUtils.encodeNodeId(pullNodeId!) },
            });
          });
          return remoteVaultId;
        },
      );
    } catch (e) {
      // If the error flag is set, and we have the generalised SmartHttpError from
      // isomorphic git, then we need to throw the Polykey error.
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
  protected async setupMeta(
    { vaultName }: { vaultName?: VaultName },
    tran: DBTransaction,
  ): Promise<void> {
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
    // Name: string | undefined
  }

  /**
   * Does an idempotent initialization of the git repository for the vault.
   * If the vault is in a dirty state then we clean up the working directory
   * or any history not part of the canonical branch.
   */
  protected async setupGit(
    tran: DBTransaction,
    ctx: ContextTimed,
  ): Promise<string> {
    // Initialization is idempotent. It works even with an existing git
    // repository.
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
      // Initialized repositories do not have any commits. It complains that
      // `refs/heads/master` file does not exist.
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
      // Checking for dirty state
      if (
        (await tran.get<boolean>([
          ...this.vaultMetadataDbPath,
          VaultInternal.dirtyKey,
        ])) === true
      ) {
        // Force checkout out to the latest commit. This ensures that any
        // uncommitted state is dropped. A global garbage collection is
        // executed immediately after.
        await this.cleanWorkingDirectory(ctx);
        await this.garbageCollectGitObjectsGlobal(ctx);

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
   * Creates a request arrow function that implements an API that `isomorphic-git`
   * expects to use when making a HTTP request. It makes RPC calls to
   * `vaultsGitInfoGet` for the ref advertisement phase and `vaultsGitPackGet`
   * for the git pack phase.
   *
   * `vaultsGitInfoGet` wraps a call to `gitHttp.advertiseRefGenerator` and
   * `vaultsGitPackGet` to `gitHttp.generatePackRequest`.
   *
   * ```
   *                                  ┌─────────┐    ┌───────────────────────────┐
   *                                  │         │    │                           │
   *  ┌──────────────────────┐        │  RPC    │    │                           │
   *  │                      │        │         │    │ *advertiseRefGenerator()  │
   *  │                      ├────────┼─────────┼────▶                           │
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
      vaultAction: vaultAction,
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
   * If the commit creates a branch from the canonical history. Then the new commit
   * becomes the new canonical history and the old history is removed from the old
   * canonical head to the branch point. This is to maintain the strict
   * non-branching linear history.
   */
  protected async createCommit(ctx: ContextTimed): Promise<void> {
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
      /**
       * Type StatusRow = [Filename, HeadStatus, WorkdirStatus, StageStatus].
       * The HeadStatus status is either absent (0) or present (1).
       * The WorkdirStatus status is either absent (0), identical to HEAD (1),
       * or different from HEAD (2).
       * The StageStatus status is either absent (0), identical to HEAD (1),
       * identical to WORKDIR (2), or different from WORKDIR (3).
       *
       * ```js
       * // Example StatusMatrix
       * [
       *    ["a.txt", 0, 2, 0], // new, untracked
       *    ["b.txt", 0, 2, 2], // added, staged
       *    ["c.txt", 0, 2, 3], // added, staged, unstaged changes
       *    ["d.txt", 1, 1, 1], // unmodified
       *    ["e.txt", 1, 2, 1], // modified, unstaged
       *    ["f.txt", 1, 2, 2], // modified, staged
       *    ["g.txt", 1, 2, 3], // modified, unstaged, unstaged changes
       *    ["h.txt", 1, 0, 1], // deleted, unstaged
       *    ["i.txt", 1, 0, 0], // deleted, staged
       * ]
       * ```
       */
      ctx.signal.throwIfAborted();
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
        case '101': // Deleted, unstaged
          // Need to stage the deletion with remove
          await git.remove({
            fs: this.efs,
            dir: this.vaultDataDir,
            gitdir: this.vaultGitDir,
            filepath: filePath,
          });
        // Fallthrough
        case '100': // Deleted, staged
          message.push(`${filePath} deleted`);
          break;
        default:
          // We don't handle untracked and partially staged files since we add
          // all files to staging before processing.
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
        author: { name: nodeIdEncoded },
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
        await this.garbageCollectGitObjectsLocal(masterRef, headRef, ctx);
      }
    }
  }

  /**
   * Cleans the git working directory by checking out the canonical branch.
   * This will remove any un-committed changes since any untracked or modified
   * files outside a commit is dirty state. Dirty state should only happen if
   * the usual commit procedure was interrupted ungracefully.
   */
  protected async cleanWorkingDirectory(ctx: ContextTimed): Promise<void> {
    // Check the status matrix for any un-staged file changes
    // which are considered dirty commits
    const statusMatrix = await git.statusMatrix({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
    });
    for (const [filePath, , workingDirStatus] of statusMatrix) {
      ctx.signal.throwIfAborted();
      // Stage all changes across all files. This is needed so that we can
      // checkout all untracked files as well.
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
   * This will walk the current canonical branch history and delete any objects
   * that are not a part of it. This is costly since it will compare the walked
   * tree with all existing objects.
   */
  protected async garbageCollectGitObjectsGlobal(
    ctx: ContextTimed,
  ): Promise<void> {
    const objectIdsAll = await gitUtils.listObjectsAll(
      {
        fs: this.efs,
        gitDir: this.vaultGitDir,
      },
      ctx,
    );
    const objects = new Set(objectIdsAll);
    const masterRef = await git.resolveRef({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
      ref: vaultsUtils.canonicalBranch,
    });
    const reachableObjects = await gitUtils.listObjects(
      {
        efs: this.efs,
        dir: this.vaultDataDir,
        gitDir: this.vaultGitDir,
        wants: [masterRef],
        haves: [],
      },
      ctx,
    );
    // Walk from head to all reachable objects
    for (const objectReachable of reachableObjects) {
      objects.delete(objectReachable);
    }
    // Any objects left in `objects` was unreachable, thus they are a part of
    // orphaned branches, so we want to delete them.
    const deletePs: Array<Promise<void>> = [];
    for (const objectId of objects) {
      deletePs.push(
        vaultsUtils.deleteObject(this.efs, this.vaultGitDir, objectId),
      );
    }
    await Promise.all(deletePs);
  }

  /**
   * This will walk from the `startId` to the `StopId` deleting objects as it
   * goes. This is smarter since it only walks over the old history and not
   * everything.
   */
  protected async garbageCollectGitObjectsLocal(
    startId: string,
    stopId: string,
    ctx: ContextTimed,
  ): Promise<void> {
    const objects = await gitUtils.listObjects(
      {
        efs: this.efs,
        dir: this.vaultDataDir,
        gitDir: this.vaultGitDir,
        wants: [startId],
        haves: [stopId],
      },
      ctx,
    );
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
