import type { ReadCommitResult } from 'isomorphic-git';
import type { EncryptedFS } from 'encryptedfs';
import type { DB, LevelPath } from '@matrixai/db';
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
import type GRPCClientAgent from '../agent/GRPCClientAgent';
import type { POJO } from '../types';
import path from 'path';
import { DBTransaction } from '@matrixai/db';
import git from 'isomorphic-git';
import * as grpc from '@grpc/grpc-js';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { withF, withG } from '@matrixai/resources';
import { RWLockWriter } from '@matrixai/async-locks';
import * as vaultsErrors from './errors';
import * as vaultsUtils from './utils';
import { tagLast } from './types';
import * as nodesUtils from '../nodes/utils';
import * as validationUtils from '../validation/utils';
import * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import { never } from '../utils/utils';

type RemoteInfo = {
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
    vaultsDbPath,
    keyManager,
    efs,
    logger = new Logger(this.name),
    fresh = false,
    tran,
  }: {
    vaultId: VaultId;
    vaultName?: VaultName;
    db: DB;
    vaultsDbPath: LevelPath;
    keyManager: KeyManager;
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
          keyManager,
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
      keyManager,
      efs,
      logger,
    });
    await vault.start({ fresh, vaultName, tran });
    logger.info(`Created ${this.name} - ${vaultIdEncoded}`);
    return vault;
  }

  public static async cloneVaultInternal({
    targetNodeId,
    targetVaultNameOrId,
    vaultId,
    db,
    vaultsDbPath,
    keyManager,
    nodeConnectionManager,
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
    keyManager: KeyManager;
    nodeConnectionManager: NodeConnectionManager;
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
          keyManager,
          nodeConnectionManager,
          efs,
          logger,
          tran,
        }),
      );
    }

    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    logger.info(`Cloning ${this.name} - ${vaultIdEncoded}`);
    const vault = new VaultInternal({
      vaultId,
      db,
      vaultsDbPath,
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
  protected keyManager: KeyManager;
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
    keyManager,
    efs,
    logger,
  }: {
    vaultId: VaultId;
    db: DB;
    vaultsDbPath: LevelPath;
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
    this.vaultsDbPath = vaultsDbPath;
    this.keyManager = keyManager;
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
    // Let's backup any metadata
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
    await this.mkdirExists(this.vaultIdEncoded);
    await this.mkdirExists(this.vaultDataDir);
    await this.mkdirExists(this.vaultGitDir);
    await this.setupMeta({ vaultName, tran });
    await this.setupGit(tran);
    this.efsVault = await this.efs.chroot(this.vaultDataDir);
    this.logger.info(
      `Started ${this.constructor.name} - ${this.vaultIdEncoded}`,
    );
  }

  protected async mkdirExists(directory: string) {
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

  public async destroy(tran?: DBTransaction): Promise<void> {
    if (tran == null) {
      return await this.db.withTransactionF((tran) => this.destroy_(tran));
    }
    return await this.destroy_(tran);
  }

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
  public async version(ref: string | VaultRef = tagLast): Promise<void> {
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

  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async readF<T>(f: (fs: FileSystemReadable) => Promise<T>): Promise<T> {
    return withF([this.lock.read()], async () => {
      return await f(this.efsVault);
    });
  }

  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public readG<T, TReturn, TNext>(
    g: (fs: FileSystemReadable) => AsyncGenerator<T, TReturn, TNext>,
  ): AsyncGenerator<T, TReturn, TNext> {
    const efsVault = this.efsVault;
    return withG([this.lock.read()], async function* () {
      return yield* g(efsVault);
    });
  }

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

      let result;
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

  @ready(new vaultsErrors.ErrorVaultNotRunning())
  public async pullVault({
    nodeConnectionManager,
    pullNodeId,
    pullVaultNameOrId,
    tran,
  }: {
    nodeConnectionManager: NodeConnectionManager;
    pullNodeId?: NodeId;
    pullVaultNameOrId?: VaultId | VaultName;
    tran?: DBTransaction;
  }): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.pullVault({
          nodeConnectionManager,
          pullNodeId,
          pullVaultNameOrId,
          tran,
        }),
      );
    }

    // This error flag will contain the error returned by the cloning grpc stream
    let error;
    // Keeps track of whether the metadata needs changing to avoid unnecessary db ops
    // 0 = no change, 1 = change with vault Id, 2 = change with vault name
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
      remoteVaultId = await nodeConnectionManager.withConnF(
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
        throw new vaultsErrors.ErrorVaultsMergeConflict(err.message, {
          cause: err,
        });
      }
      throw err;
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
   * Setup the vault metadata
   */
  protected async setupMeta({
    vaultName,
    tran,
  }: {
    vaultName?: VaultName;
    tran: DBTransaction;
  }): Promise<void> {
    // Setup the vault metadata
    // and you need to make certain preparations
    // the meta gets created first
    // if the SoT is the database
    // are we supposed to check this?

    // If this is not existing
    // setup default vaults db
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

    // Remote: [NodeId, VaultId] | undefined
    // dirty: boolean
    // name: string | undefined
  }

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
        await this.garbageCollectGitObjects();

        // Setting dirty back to false
        await tran.put(
          [...this.vaultMetadataDbPath, VaultInternal.dirtyKey],
          false,
        );
      }
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

  /**
   * Creates a commit while moving the canonicalBranch reference
   */
  protected async createCommit() {
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
    const nodeIdEncoded = nodesUtils.encodeNodeId(this.keyManager.getNodeId());
    // Staging changes and creating commit message
    const message: string[] = [];
    // Get the status of each file in the working directory
    // https://isomorphic-git.org/docs/en/statusMatrix
    const statusMatrix = await git.statusMatrix({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
    });
    for (let [
      filePath,
      HEADStatus,
      workingDirStatus,
      stageStatus,
    ] of statusMatrix) {
      // Reset the index of files that are marked as 'unmodified'
      // The working directory, HEAD and staging area are all the same
      // https://github.com/MatrixAI/js-polykey/issues/260
      if (HEADStatus === workingDirStatus && workingDirStatus === stageStatus) {
        await git.resetIndex({
          fs: this.efs,
          dir: this.vaultDataDir,
          gitdir: this.vaultGitDir,
          filepath: filePath,
        });
        // Check if the file is still 'unmodified' and leave
        // it out of the commit if it is
        [filePath, HEADStatus, workingDirStatus, stageStatus] = (
          await git.statusMatrix({
            fs: this.efs,
            dir: this.vaultDataDir,
            gitdir: this.vaultGitDir,
            filepaths: [filePath],
          })
        ).pop()!;
        if (
          HEADStatus === workingDirStatus &&
          workingDirStatus === stageStatus
        ) {
          continue;
        }
      }
      // We want files in the working directory that are both different
      // from the head commit and the staged changes
      // If working directory and stage status are not equal then filepath has un-staged
      // changes in the working directory relative to both the HEAD and staging
      // area that need to be added
      // https://isomorphic-git.org/docs/en/statusMatrix
      if (workingDirStatus !== stageStatus) {
        let status: 'added' | 'modified' | 'deleted';
        // If the working directory status is 0 then the file has
        // been deleted
        if (workingDirStatus === 0) {
          status = 'deleted';
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
          // Check whether the file already exists inside the HEAD
          // commit and if it does then it is unmodified
          if (HEADStatus === 1) {
            status = 'modified';
          } else {
            status = 'added';
          }
        }
        message.push(`${filePath} ${status}`);
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
        // Delete old commits following chain from masterRef -> headRef
        let currentRef = masterRef;
        while (currentRef !== headRef) {
          // Read commit info
          const commit = await git.readCommit({
            fs: this.efs,
            dir: this.vaultDataDir,
            gitdir: this.vaultGitDir,
            oid: currentRef,
          });
          // Delete commit
          await vaultsUtils.deleteObject(
            this.efs,
            this.vaultGitDir,
            commit.oid,
          );
          // Getting new ref
          const nextRef = commit.commit.parent.pop();
          if (nextRef == null) break;
          currentRef = nextRef;
        }
      }
    }
  }

  /**
   * Cleans the git working directory by checking out the canonicalBranch
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
   * Deletes any git objects that can't be reached from the canonicalBranch
   */
  protected async garbageCollectGitObjects() {
    // To garbage collect the git objects,
    // we need to walk all objects connected to the master branch
    // and delete the object files that are not touched by this walk
    const touchedOids = {};
    const masterRef = await git.resolveRef({
      fs: this.efs,
      dir: this.vaultDataDir,
      gitdir: this.vaultGitDir,
      ref: vaultsUtils.canonicalBranch,
    });
    const queuedOids: string[] = [masterRef];
    while (queuedOids.length > 0) {
      const currentOid = queuedOids.shift()!;
      if (touchedOids[currentOid] === null) continue;
      const result = await git.readObject({
        fs: this.efs,
        dir: this.vaultDataDir,
        gitdir: this.vaultGitDir,
        oid: currentOid,
      });
      touchedOids[result.oid] = result.type;
      if (result.format !== 'parsed') continue;
      switch (result.type) {
        case 'commit':
          {
            const object = result.object;
            queuedOids.push(...object.parent);
            queuedOids.push(object.tree);
          }
          break;
        case 'tree':
          {
            const object = result.object;
            for (const item of object) {
              touchedOids[item.oid] = item.type;
            }
          }
          break;
        default: {
          never();
        }
      }
    }
    // Walking all objects
    const objectPath = path.join(this.vaultGitDir, 'objects');
    const buckets = (await this.efs.readdir(objectPath)).filter((item) => {
      return item !== 'info' && item !== 'pack';
    });
    for (const bucket of buckets) {
      const bucketPath = path.join(objectPath, bucket.toString());
      const oids = await this.efs.readdir(bucketPath);
      for (const shortOid of oids) {
        const oidPath = path.join(bucketPath, shortOid.toString());
        const oid = bucket.toString() + shortOid.toString();
        if (touchedOids[oid] === undefined) {
          // Removing unused objects
          await this.efs.unlink(oidPath);
        }
      }
    }
  }
}

export default VaultInternal;
export type { RemoteInfo };
