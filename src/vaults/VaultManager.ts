import type { MutexInterface } from 'async-mutex';
import type { DB, DBDomain, DBLevel } from '@matrixai/db';
import type { VaultId, VaultName, VaultActions } from './types';
import type { Vault } from './Vault';

import type { FileSystem } from '../types';
import type { PolykeyWorkerManagerInterface } from '../workers/types';
import type { NodeId } from '../nodes/types';

import type { KeyManager } from '../keys';
import type { NodeConnectionManager, NodeManager } from '../nodes';
import type { GestaltGraph } from '../gestalts';
import type { ACL } from '../acl';
import type { NotificationsManager } from '../notifications';

import path from 'path';
import { PassThrough } from 'readable-stream';
import { Mutex } from 'async-mutex';
import git from 'isomorphic-git';
import { EncryptedFS, errors as encryptedfsErrors } from 'encryptedfs';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal, utils as idUtils } from '@matrixai/id';
import VaultInternal from './VaultInternal';
import * as vaultsUtils from '../vaults/utils';
import * as vaultsErrors from '../vaults/errors';
import * as gitUtils from '../git/utils';
import * as gitErrors from '../git/errors';
import { utils as nodesUtils } from '../nodes';
import { utils as keysUtils } from '../keys';
import * as validationUtils from '../validation/utils';
import config from '../config';
import { mkdirExists } from '../utils';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';

/**
 * Object map pattern for each vault
 */
type VaultMap = Map<
  VaultId,
  {
    vault?: VaultInternal;
    lock: MutexInterface;
  }
>;

type VaultList = Map<VaultName, VaultId>;

// FIXME: this will be removed when moved into VaultInternal.
type VaultMetadata = {
  name: VaultName;
  workingDirectoryIndex: string;
  remoteNode?: NodeId;
  remoteVault?: string;
};

interface VaultManager extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new vaultsErrors.ErrorVaultManagerRunning(),
  new vaultsErrors.ErrorVaultManagerDestroyed(),
)
class VaultManager {
  static async createVaultManager({
    vaultsPath,
    db,
    acl,
    keyManager,
    nodeConnectionManager,
    nodeManager,
    gestaltGraph,
    notificationsManager,
    keyBits = 256,
    fs = require('fs'),
    logger = new Logger(this.name),
    fresh = false,
  }: {
    vaultsPath: string;
    db: DB;
    acl: ACL;
    keyManager: KeyManager;
    nodeConnectionManager: NodeConnectionManager;
    nodeManager: NodeManager;
    gestaltGraph: GestaltGraph;
    notificationsManager: NotificationsManager;
    keyBits?: 128 | 192 | 256;
    fs?: FileSystem;
    logger?: Logger;
    fresh?: boolean;
  }) {
    logger.info(`Creating ${this.name}`);
    logger.info(`Setting vaults path to ${vaultsPath}`);
    const vaultManager = new VaultManager({
      vaultsPath,
      db,
      acl,
      keyManager,
      nodeConnectionManager,
      nodeManager,
      gestaltGraph,
      notificationsManager,
      keyBits,
      fs,
      logger,
    });
    await vaultManager.start({ fresh });
    logger.info(`Created ${this.name}`);
    return vaultManager;
  }

  public readonly vaultsPath: string;
  public readonly efsPath: string;
  public readonly keyBits: 128 | 192 | 256;

  protected fs: FileSystem;
  protected logger: Logger;
  protected db: DB;
  protected acl: ACL;
  protected keyManager: KeyManager;
  // FIXME, add this to create and constructor
  protected nodeConnectionManager: NodeConnectionManager;
  protected nodeManager: NodeManager;
  protected gestaltGraph: GestaltGraph;
  protected notificationsManager: NotificationsManager;
  protected vaultsDbDomain: DBDomain = [this.constructor.name];
  protected vaultsDb: DBLevel;
  // VaultId -> VaultMetadata
  protected vaultsMetaDbDomain: DBDomain = [this.vaultsDbDomain[0], 'meta'];
  protected vaultsMetaDb: DBLevel;
  protected vaultMap: VaultMap = new Map();
  protected vaultKey: Buffer;
  protected efs: EncryptedFS;

  constructor({
    vaultsPath,
    db,
    acl,
    keyManager,
    nodeConnectionManager,
    nodeManager,
    gestaltGraph,
    notificationsManager,
    keyBits,
    fs,
    logger,
  }: {
    vaultsPath: string;
    db: DB;
    acl: ACL;
    keyManager: KeyManager;
    nodeConnectionManager: NodeConnectionManager;
    nodeManager: NodeManager;
    gestaltGraph: GestaltGraph;
    notificationsManager: NotificationsManager;
    keyBits: 128 | 192 | 256;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.vaultsPath = vaultsPath;
    this.efsPath = path.join(this.vaultsPath, config.defaults.efsBase);
    this.db = db;
    this.acl = acl;
    this.keyManager = keyManager;
    this.nodeConnectionManager = nodeConnectionManager;
    this.nodeManager = nodeManager;
    this.gestaltGraph = gestaltGraph;
    this.notificationsManager = notificationsManager;
    this.keyBits = keyBits;
    this.fs = fs;
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    try {
      this.logger.info(`Starting ${this.constructor.name}`);
      const vaultsDb = await this.db.level(this.vaultsDbDomain[0]);
      const vaultsMetaDb = await this.db.level(
        this.vaultsMetaDbDomain[1],
        this.vaultsDb,
      );
      if (fresh) {
        await vaultsMetaDb.clear();
        await vaultsDb.clear();
        await this.fs.promises.rm(this.vaultsPath, {
          force: true,
          recursive: true,
        });
      }
      await mkdirExists(this.fs, this.vaultsPath);
      const vaultKey = await this.setupKey(this.keyBits);
      let efs;
      try {
        efs = await EncryptedFS.createEncryptedFS({
          dbPath: this.efsPath,
          dbKey: vaultKey,
          logger: this.logger.getChild('EncryptedFileSystem'),
        });
      } catch (e) {
        if (e instanceof encryptedfsErrors.ErrorEncryptedFSKey) {
          throw new vaultsErrors.ErrorVaultManagerKey();
        }
        throw new vaultsErrors.ErrorVaultManagerEFS(e.message, {
          errno: e.errno,
          syscall: e.syscall,
          code: e.code,
          path: e.path,
        });
      }
      this.vaultsDb = vaultsDb;
      this.vaultsMetaDb = vaultsMetaDb;
      this.vaultKey = vaultKey;
      this.efs = efs;
      this.logger.info(`Started ${this.constructor.name}`);
    } catch (e) {
      this.logger.warn(`Failed Starting ${this.constructor.name}`);
      await this.efs?.stop();
      throw e;
    }
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);

    // Iterate over vaults in memory and destroy them, ensuring that
    // the working directory commit state is saved

    for (const [vaultId, vaultAndLock] of this.vaultMap) {
      // This is locking each vault... before it tries to do this
      // but if we are calling stop now
      // we will have blocked all the other methods
      // so in this sense, it actually waits for all vault locks to be relinquished
      // before attempting to do anything here
      // now if start stop has their own lock
      // this this applies already just be calling stop
      // in that it waits for stop to finish

      await this.transact(async () => {
        // Think about it, maybe we should use stop instead
        // it will be clearer!!
        // await vaultAndLock.vault?.stop();

        await vaultAndLock.vault?.destroy();
      }, [vaultId]);
    }

    // Need to figure out if this id thing is a good idea
    // the id should already be workable as a string
    // i forgot if it also works under map

    await this.efs.stop();
    this.vaultMap = new Map();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.efs.destroy();
    // If the DB was stopped, the existing sublevel `this.vaultsDb` will not be valid
    // Therefore we recreate the sublevel here
    const vaultsDb = await this.db.level(this.vaultsDbDomain[0]);
    await vaultsDb.clear();
    await this.fs.promises.rm(this.vaultsPath, {
      force: true,
      recursive: true,
    });
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  public setWorkerManager(workerManager: PolykeyWorkerManagerInterface) {
    this.efs.setWorkerManager(workerManager);
  }

  public unsetWorkerManager() {
    this.efs.unsetWorkerManager();
  }

  // The with locks thing
  // can be generalised a bit
  // we can address the with locking mechanism in general
  // with withF and withG
  // this will become our generic of way locking anything

  // REPLACE THE FOLLOWING 3 functions
  // replace this transact with our new withF and withG mechanisms
  // all we need to do is create `ResourceAcquire` types in this domain

  /**
   * By default will not lock anything
   */
  public async transact<T>(f: () => Promise<T>, vaults: Array<VaultId> = []) {
    // Will lock nothing by default
    return await this.withLocks(f, vaults.map(this.getLock.bind(this)));
  }

  protected async withLocks<T>(
    f: () => Promise<T>,
    locks: Array<MutexInterface> = [],
  ): Promise<T> {
    const releases: Array<MutexInterface.Releaser> = [];
    for (const lock of locks) {
      // Take the lock for each vault in memory and acquire it
      releases.push(await lock.acquire());
    }
    try {
      return await f();
    } finally {
      // Release the vault locks in the opposite order
      releases.reverse();
      for (const r of releases) {
        r();
      }
    }
  }

  protected getLock(vaultId: VaultId): MutexInterface {
    const vaultAndLock = this.vaultMap.get(vaultId);
    if (vaultAndLock != null) return vaultAndLock.lock;
    const lock = new Mutex();
    this.vaultMap.set(vaultId, { lock });
    return lock;
  }

  /**
   * Constructs a new vault instance with a given name and
   * stores it in memory
   */

  // this should actually

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async createVault(vaultName: VaultName): Promise<VaultId> {
    const vaultId = await this.generateVaultId();
    const lock = new Mutex();
    this.vaultMap.set(vaultId, { lock });
    return await this.transact(async () => {
      this.logger.info(
        `Storing metadata for Vault ${vaultsUtils.encodeVaultId(vaultId)}`,
      );
      await this.db.put(this.vaultsMetaDbDomain, idUtils.toBuffer(vaultId), {
        name: vaultName,
      });
      const vault = await VaultInternal.create({
        vaultId,
        keyManager: this.keyManager,
        efs: this.efs,
        logger: this.logger.getChild(VaultInternal.name),
        fresh: true,
      });
      this.vaultMap.set(vaultId, { lock, vault });
      return vault.vaultId;
    }, [vaultId]);
  }

  /**
   * Retreives the vault metadata using the vault Id
   * and parses it to return the associated vault name
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultMeta(vaultId: VaultId): Promise<VaultMetadata> {
    const vaultMeta = await this.db.get<VaultMetadata>(
      this.vaultsMetaDbDomain,
      idUtils.toBuffer(vaultId),
    );
    if (vaultMeta == null) throw new vaultsErrors.ErrorVaultsVaultUndefined();
    return vaultMeta;
  }

  /**
   * Removes the metadata and EFS state of a vault using a
   * given vault Id
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async destroyVault(vaultId: VaultId) {
    this.logger.info(`Destroying Vault ${vaultsUtils.encodeVaultId(vaultId)}`);
    await this.transact(async () => {
      const vaultMeta = await this.getVaultMeta(vaultId);
      if (!vaultMeta) return;
      await this.db.del(this.vaultsMetaDbDomain, idUtils.toBuffer(vaultId));
      this.vaultMap.delete(vaultId);
      await this.efs.rmdir(vaultsUtils.encodeVaultId(vaultId), {
        recursive: true,
      });
    }, [vaultId]);
  }

  // /**
  //  * Constructs or returns the in-memory instance of a vault
  //  * from metadata using a given vault Id
  //  */
  // @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  // private async openVault(vaultId: VaultId): Promise<Vault> {
  //   const vaultMeta = await this.getVaultMeta(vaultId);
  //   if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
  //   return await this.getVault(vaultId);
  // }

  /**
   * Writes the working directory commit state of a vault Id
   * and removes the vault from memory
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async closeVault(vaultId: VaultId) {
    const vaultMeta = await this.getVaultMeta(vaultId);
    if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
    const vault = await this.getVault(vaultId);
    // Updating workingDirectoryIndex in the vault metadata.
    vaultMeta.workingDirectoryIndex = vault.getworkingDirIndex();
    await this.db.put(
      this.vaultsMetaDbDomain,
      idUtils.toBuffer(vaultId),
      vaultMeta,
    );
    await vault.destroy();
    this.vaultMap.delete(vaultId);
  }

  /**
   * Lists the vault name and associated vault Id of all
   * the vaults stored
   */
  // FIXME: this will have to peek into the vaults metadata.
  //  This will be inside the vaultInternal now. Need to work this out.
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async listVaults(): Promise<VaultList> {
    const vaults: VaultList = new Map();
    // Stream all the vault Id and associated metadata values
    for await (const o of this.vaultsMetaDb.createReadStream({})) {
      const dbMeta = (o as any).value;
      const dbId = (o as any).key;
      // Manually decrypt the vault metadata
      const vaultMeta = await this.db.deserializeDecrypt<VaultMetadata>(
        dbMeta,
        false,
      );
      vaults.set(vaultMeta.name, IdInternal.fromBuffer<VaultId>(dbId));
    }
    return vaults;
  }

  /**
   * Changes the vault name metadata of a vault Id
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async renameVault(
    vaultId: VaultId,
    newVaultName: VaultName,
  ): Promise<void> {
    this.logger.info(`Renaming Vault ${vaultsUtils.encodeVaultId(vaultId)}`);
    await this.transact(async () => {
      const meta = await this.db.get<VaultMetadata>(
        this.vaultsMetaDbDomain,
        idUtils.toBuffer(vaultId),
      );
      if (!meta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
      meta.name = newVaultName;
      await this.db.put(
        this.vaultsMetaDbDomain,
        idUtils.toBuffer(vaultId),
        meta,
      );
    }, [vaultId]);
  }

  /**
   * Retreives the vault Id associated with a vault name
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultId(vaultName: VaultName): Promise<VaultId | undefined> {
    // Stream all the metadata and associated vault Id values
    for await (const o of this.vaultsMetaDb.createReadStream({})) {
      const dbMeta = (o as any).value;
      const dbId = (o as any).key;
      // Manually decrypt the vault metadata
      const vaultMeta = await this.db.deserializeDecrypt<VaultMetadata>(
        dbMeta,
        false,
      );
      // If the name metadata matches the given name, return the associated vault Id
      if (vaultName === vaultMeta.name) {
        return IdInternal.fromBuffer<VaultId>(dbId);
      }
    }
  }

  /**
   * Returns a dictionary of VaultActions for each node.
   * @param vaultId
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultPermission(
    vaultId: VaultId,
  ): Promise<Record<NodeId, VaultActions>> {
    const rawPermissions = await this.acl.getVaultPerm(vaultId);
    const permissions: Record<NodeId, VaultActions> = {};
    // Getting the relevant information.
    for (const nodeId in rawPermissions) {
      permissions[nodeId] = rawPermissions[nodeId].vaults[vaultId];
    }
    return permissions;
  }

  /**
   * Sets clone, pull and scan permissions of a vault for a
   * gestalt and send a notification to this gestalt
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async shareVault(vaultId: VaultId, nodeId: NodeId): Promise<void> {
    const vaultMeta = await this.getVaultMeta(vaultId);
    if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
    await this.transact(async () => {
      await this.gestaltGraph._transaction(async () => {
        await this.acl._transaction(async () => {
          // Node Id permissions translated to other nodes in
          // a gestalt by other domains
          await this.gestaltGraph.setGestaltActionByNode(nodeId, 'scan');
          await this.acl.setVaultAction(vaultId, nodeId, 'pull');
          await this.acl.setVaultAction(vaultId, nodeId, 'clone');
          await this.notificationsManager.sendNotification(nodeId, {
            type: 'VaultShare',
            vaultId: vaultId.toString(),
            vaultName: vaultMeta.name,
            actions: {
              clone: null,
              pull: null,
            },
          });
        });
      });
    }, [vaultId]);
  }

  /**
   * Unsets clone, pull and scan permissions of a vault for a
   * gestalt
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async unshareVault(vaultId: VaultId, nodeId: NodeId): Promise<void> {
    const vaultMeta = await this.getVaultMeta(vaultId);
    if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
    return await this.gestaltGraph._transaction(async () => {
      return await this.acl._transaction(async () => {
        await this.gestaltGraph.unsetGestaltActionByNode(nodeId, 'scan');
        await this.acl.unsetVaultAction(vaultId, nodeId, 'pull');
        await this.acl.unsetVaultAction(vaultId, nodeId, 'clone');
      });
    });
  }

  /**
   * Clones the contents of a remote vault into a new local
   * vault instance
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async cloneVault(
    nodeId: NodeId,
    vaultNameOrId: VaultId | VaultName,
  ): Promise<VaultId> {
    // This error flag will contain the error returned by the cloning grpc stream
    let error;
    // Let vaultName, remoteVaultId;
    const thisNodeId = this.keyManager.getNodeId();
    const nodeConnection = await this.nodeManager.getConnectionToNode(nodeId);
    const client = nodeConnection.getClient();
    const vaultId = await this.generateVaultId();
    const lock = new Mutex();
    this.vaultMap.set(vaultId, { lock });
    this.logger.info(
      `Cloning Vault ${vaultsUtils.encodeVaultId(vaultId)} on Node ${nodeId}`,
    );
    return await this.transact(async () => {
      // Make the directory where the .git files will be auto generated and
      // where the contents will be cloned to ('contents' file)
      await this.efs.mkdir(
        path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
        { recursive: true },
      );
      const [request, vaultName, remoteVaultId] = await vaultsUtils.request(
        client,
        thisNodeId,
        vaultNameOrId,
      );
      try {
        await git.clone({
          fs: this.efs,
          http: { request },
          dir: path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
          gitdir: path.join(vaultsUtils.encodeVaultId(vaultId), '.git'),
          url: 'http://',
          singleBranch: true,
        });
      } catch (err) {
        // If the error flag set and we have the generalised SmartHttpError from
        // isomorphic git then we need to throw the polykey error
        if (err instanceof git.Errors.SmartHttpError && error) {
          throw error;
        }
        throw err;
      }
      const workingDirIndex = (
        await git.log({
          fs: this.efs,
          dir: path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
          gitdir: path.join(vaultsUtils.encodeVaultId(vaultId), '.git'),
          depth: 1,
        })
      ).pop()!;
      // Store the node and vault Id to be used as default remote values when pulling
      await this.db.put(this.vaultsMetaDbDomain, idUtils.toBuffer(vaultId), {
        name: vaultName,
        workingDirectoryIndex: workingDirIndex.oid,
        remoteNode: nodeId,
        remoteVault: remoteVaultId.toString(),
      } as VaultMetadata);
      const vault = await VaultInternal.create({
        vaultId,
        keyManager: this.keyManager,
        efs: this.efs,
        logger: this.logger.getChild(VaultInternal.name),
        remote: true,
      });
      this.vaultMap.set(vaultId, { lock, vault });
      this.logger.info(
        `Cloned Vault ${vaultsUtils.encodeVaultId(vaultId)} on Node ${nodeId}`,
      );
      return vault.vaultId;
    }, [vaultId]);
  }

  /**
   * Pulls the contents of a remote vault into an existing vault
   * instance
   */
  public async pullVault({
    vaultId,
    pullNodeId,
    pullVaultNameOrId,
  }: {
    vaultId: VaultId;
    pullNodeId?: NodeId;
    pullVaultNameOrId?: VaultId | VaultName;
  }): Promise<VaultId> {
    return await this.transact(async () => {
      // This error flag will contain the error returned by the cloning grpc stream
      let error;
      // Keeps track of whether the metadata needs changing to avoid unnecessary db ops
      // 0 = no change, 1 = change with vault Id, 2 = change with vault name
      let metaChange = 0;
      const thisNodeId = this.keyManager.getNodeId();
      const vaultMeta = await this.db.get<VaultMetadata>(
        this.vaultsMetaDbDomain,
        idUtils.toBuffer(vaultId),
      );
      if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUnlinked();
      if (pullNodeId == null) {
        pullNodeId = vaultMeta.remoteNode;
      } else {
        metaChange = 1;
        vaultMeta.remoteNode = pullNodeId;
      }
      if (pullVaultNameOrId == null) {
        pullVaultNameOrId = IdInternal.fromString<VaultId>(
          vaultMeta.remoteVault!,
        );
      } else {
        metaChange = 1;
        if (typeof pullVaultNameOrId === 'string') {
          metaChange = 2;
        } else {
          vaultMeta.remoteVault = pullVaultNameOrId.toString();
        }
      }
      this.logger.info(
        `Pulling Vault ${vaultsUtils.encodeVaultId(
          vaultId,
        )} from Node ${pullNodeId}`,
      );
      const nodeConnection = await this.nodeManager.getConnectionToNode(
        pullNodeId!,
      );
      const client = nodeConnection.getClient();
      const [request,, remoteVaultId] = await vaultsUtils.request(
        client,
        thisNodeId,
        pullVaultNameOrId!,
      );
      try {
        await git.pull({
          fs: this.efs,
          http: { request },
          dir: path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
          gitdir: path.join(vaultsUtils.encodeVaultId(vaultId), '.git'),
          url: `http://`,
          ref: 'HEAD',
          singleBranch: true,
          author: {
            name: nodesUtils.encodeNodeId(pullNodeId!),
          },
        });
      } catch (err) {
        // If the error flag set and we have the generalised SmartHttpError from
        // isomorphic git then we need to throw the polykey error
        if (err instanceof git.Errors.SmartHttpError && error) {
          throw error;
        } else if (err instanceof git.Errors.MergeNotSupportedError) {
          throw new vaultsErrors.ErrorVaultsMergeConflict(
            'Merge Conflicts are not supported yet',
          );
        }
        throw err;
      }
      if (metaChange !== 0) {
        if (metaChange === 2) vaultMeta.remoteVault = remoteVaultId;
        await this.db.put(
          this.vaultsMetaDbDomain,
          idUtils.toBuffer(vaultId),
          vaultMeta,
        );
      }
      const vault = await this.getVault(vaultId);
      // Store the working directory commit state in the '.git' directory
      this.logger.info(
        `Pulled Vault ${vaultsUtils.encodeVaultId(
          vaultId,
        )} from Node ${pullNodeId}`,
      );
      return vault.vaultId;
    }, [vaultId]);
  }

  /**
   * Handler for receiving http GET requests when being
   * cloned or pulled from
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async *handleInfoRequest(
    vaultId: VaultId,
  ): AsyncGenerator<Buffer | null> {
    // Adehrance to git protocol
    yield Buffer.from(
      gitUtils.createGitPacketLine('# service=git-upload-pack\n'),
    );
    yield Buffer.from('0000');
    // Read the commit state of the vault
    const uploadPack = await gitUtils.uploadPack({
      fs: this.efs,
      dir: path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
      gitdir: path.join(vaultsUtils.encodeVaultId(vaultId), '.git'),
      advertiseRefs: true,
    });
    for (const buffer of uploadPack) {
      yield buffer;
    }
  }

  /**
   * Handler for receiving http POST requests when being
   * cloned or pulled from
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async handlePackRequest(
    vaultId: VaultId,
    body: Buffer,
  ): Promise<[PassThrough, PassThrough]> {
    if (body.toString().slice(4, 8) === 'want') {
      // Parse the request to get the wanted git object
      const wantedObjectId = body.toString().slice(9, 49);
      const packResult = await gitUtils.packObjects({
        fs: this.efs,
        dir: path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
        gitdir: path.join(vaultsUtils.encodeVaultId(vaultId), '.git'),
        refs: [wantedObjectId],
      });
      // Generate a contents and progress stream
      const readable = new PassThrough();
      const progressStream = new PassThrough();
      const sideBand = gitUtils.mux(
        'side-band-64',
        readable,
        packResult.packstream,
        progressStream,
      );
      return [sideBand, progressStream];
    } else {
      throw new gitErrors.ErrorGitUnimplementedMethod(
        `Request of type '${body
          .toString()
          .slice(4, 8)}' not valid, expected 'want'`,
      );
    }
  }

  /**
   * Retrieves all the vaults for a peers node
   */
  public async scanNodeVaults(
    nodeId: NodeId,
  ): Promise<Array<[VaultName, VaultId]>> {
    // Create a connection to another node
    return await this.nodeConnectionManager.withConnF(
      nodeId,
      async (connection) => {
        const client = connection.getClient();
        const nodeIdMessage = new nodesPB.Node();
        nodeIdMessage.setNodeId(
          nodesUtils.encodeNodeId(this.keyManager.getNodeId()),
        );
        const vaults: Array<[VaultName, VaultId]> = [];
        const genReadable = client.vaultsScan(nodeIdMessage);
        for await (const vault of genReadable) {
          vaults.push([
            vault.getVaultName() as VaultName,
            validationUtils.parseVaultId(vault.getVaultId()),
          ]);
        }
        return vaults;
      },
    );
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  protected async generateVaultId(): Promise<VaultId> {
    let vaultId = vaultsUtils.generateVaultId();
    let i = 0;
    while (await this.efs.exists(idUtils.toString(vaultId))) {
      i++;
      if (i > 50) {
        throw new vaultsErrors.ErrorVaultsCreateVaultId(
          'Could not create a unique vaultId after 50 attempts',
        );
      }
      vaultId = vaultsUtils.generateVaultId();
    }
    return vaultId;
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  protected async getVault(vaultId: VaultId): Promise<VaultInternal> {
    let vault: VaultInternal | undefined;
    let lock: MutexInterface;
    let vaultAndLock = this.vaultMap.get(vaultId);
    if (vaultAndLock != null) {
      ({ vault, lock } = vaultAndLock);
      // Lock and vault exist
      if (vault != null) {
        return vault;
      }
      // Only lock exists
      let release;
      try {
        release = await lock.acquire();
        ({ vault, lock } = vaultAndLock);
        if (vault != null) {
          return vault;
        }
        const vaultMeta = await this.db.get<VaultMetadata>(
          this.vaultsMetaDbDomain,
          idUtils.toBuffer(vaultId),
        );
        let remote;
        if (vaultMeta) {
          if (vaultMeta.remoteVault || vaultMeta.remoteNode) {
            remote = true;
          }
        }
        vault = await VaultInternal.create({
          vaultId,
          keyManager: this.keyManager,
          efs: this.efs,
          logger: this.logger.getChild(VaultInternal.name),
          remote,
        });
        vaultAndLock.vault = vault;
        this.vaultMap.set(vaultId, vaultAndLock);
        return vault;
      } finally {
        release();
      }
    } else {
      // Neither vault nor lock exists
      lock = new Mutex();
      vaultAndLock = { lock };
      this.vaultMap.set(vaultId, vaultAndLock);
      let release;
      try {
        release = await lock.acquire();
        const vaultMeta = await this.db.get<VaultMetadata>(
          this.vaultsMetaDbDomain,
          idUtils.toBuffer(vaultId),
        );
        let remote;
        if (vaultMeta) {
          if (vaultMeta.remoteVault || vaultMeta.remoteNode) {
            remote = true;
          }
        }
        vault = await VaultInternal.create({
          vaultId,
          keyManager: this.keyManager,
          efs: this.efs,
          workingDirIndex: vaultMeta?.workingDirectoryIndex,
          logger: this.logger.getChild(VaultInternal.name),
          remote,
        });
        vaultAndLock.vault = vault;
        this.vaultMap.set(vaultId, vaultAndLock);
        return vault;
      } finally {
        release();
      }
    }
  }

  // THIS can also be replaced with generic withF and withG

  /**
   * Takes a function and runs it with the listed vaults. locking is handled automatically.
   * @param vaultIds List of vault ID for vaults you wish to use.
   * @param f Function you wish to run with the provided vaults.
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async withVaults<T>(
    vaultIds: VaultId[],
    f: (...args: Vault[]) => Promise<T>,
  ): Promise<T> {
    // Stages:
    // 1. Obtain vaults,
    // 2. Call function with vaults while locking the vaults.
    // 3. Catch any problems and preform clean up in finally.
    // 4. return result.

    const vaults = await Promise.all(
      vaultIds.map(async (vaultId) => {
        return await this.getVault(vaultId);
      }),
    );

    // Obtaining locks.
    const vaultLocks = vaultIds.map((vaultId) => {
      return this.getLock(vaultId);
    });

    // Running the function with locking.
    return await this.withLocks(() => {
      return f(...vaults);
    }, vaultLocks);
  }

  protected async setupKey(bits: 128 | 192 | 256): Promise<Buffer> {
    let key: Buffer | undefined;
    key = await this.db.get(this.vaultsDbDomain, 'key', true);
    // If the EFS already exists, but the key doesn't, then we have lost the key
    if (key == null && (await this.existsEFS())) {
      throw new vaultsErrors.ErrorVaultManagerKey();
    }
    if (key != null) {
      return key;
    }
    this.logger.info('Generating vaults key');
    key = await this.generateKey(bits);
    await this.db.put(this.vaultsDbDomain, 'key', key, true);
    return key;
  }

  protected async generateKey(bits: 128 | 192 | 256): Promise<Buffer> {
    return await keysUtils.generateKey(bits);
  }

  protected async existsEFS(): Promise<boolean> {
    try {
      return (await this.fs.promises.readdir(this.efsPath)).length > 0;
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw new vaultsErrors.ErrorVaultManagerEFS(e.message, {
        errno: e.errno,
        syscall: e.syscall,
        code: e.code,
        path: e.path,
      });
    }
  }
}

export default VaultManager;
