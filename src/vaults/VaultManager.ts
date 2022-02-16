import type { DB, DBDomain, DBLevel } from '@matrixai/db';
import type {
  VaultId,
  VaultName,
  VaultActions,
  VaultIdString,
  VaultIdEncoded,
} from './types';
import type { Vault } from './Vault';
import type { FileSystem } from '../types';
import type { PolykeyWorkerManagerInterface } from '../workers/types';
import type { NodeId } from '../nodes/types';
import type KeyManager from '../keys/KeyManager';
import type NodeConnectionManager from '../nodes/NodeConnectionManager';
import type GestaltGraph from '../gestalts/GestaltGraph';
import type NotificationsManager from '../notifications/NotificationsManager';
import type ACL from '../acl/ACL';

import type { RemoteInfo } from './VaultInternal';
import type { ResourceAcquire } from '../utils/context';
import type { VaultAction } from './types';
import path from 'path';
import { PassThrough } from 'readable-stream';
import { EncryptedFS, errors as encryptedFsErrors } from 'encryptedfs';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { IdInternal } from '@matrixai/id';
import VaultInternal from './VaultInternal';
import * as vaultsUtils from '../vaults/utils';
import * as vaultsErrors from '../vaults/errors';
import * as gitUtils from '../git/utils';
import * as gitErrors from '../git/errors';
import * as nodesUtils from '../nodes/utils';
import * as keysUtils from '../keys/utils';
import config from '../config';
import { mkdirExists } from '../utils/utils';
import { RWLock } from '../utils/locks';
import { withF, withG } from '../utils/context';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';

/**
 * Object map pattern for each vault
 */
type VaultMap = Map<
  VaultIdString,
  {
    vault?: VaultInternal;
    lock: RWLock;
  }
>;

type VaultList = Map<VaultName, VaultId>;
type VaultMetadata = {
  dirty: boolean;
  vaultName: VaultName;
  remoteInfo?: RemoteInfo;
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
  protected nodeConnectionManager: NodeConnectionManager;
  protected gestaltGraph: GestaltGraph;
  protected notificationsManager: NotificationsManager;
  protected vaultsDbDomain: DBDomain = [this.constructor.name];
  protected vaultsDb: DBLevel;
  protected vaultsNamesDbDomain: DBDomain = [...this.vaultsDbDomain, 'names'];
  protected vaultsNamesDb: DBLevel;
  protected vaultsNamesLock: RWLock = new RWLock();
  // VaultId -> VaultMetadata
  protected vaultMap: VaultMap = new Map();
  protected vaultKey: Buffer;
  protected efs: EncryptedFS;

  constructor({
    vaultsPath,
    db,
    acl,
    keyManager,
    nodeConnectionManager,
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
      const vaultsNamesDb = await this.db.level(
        this.vaultsNamesDbDomain[1],
        vaultsDb,
      );
      if (fresh) {
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
        if (e instanceof encryptedFsErrors.ErrorEncryptedFSKey) {
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
      this.vaultsNamesDb = vaultsNamesDb;
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

    for (const [vaultIdString, vaultAndLock] of this.vaultMap) {
      const vaultId = IdInternal.fromString<VaultId>(vaultIdString);
      await withF([this.getWriteLock(vaultId)], async () => {
        await vaultAndLock.vault?.stop();
      });
      this.vaultMap.delete(vaultIdString);
    }

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
    // Clearing all vaults db data
    await vaultsDb.clear();
    // Is it necessary to remove the vaults domain?
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

  protected getLock(vaultId: VaultId): RWLock {
    const vaultIdString = vaultId.toString() as VaultIdString;
    const vaultAndLock = this.vaultMap.get(vaultIdString);
    if (vaultAndLock != null) return vaultAndLock.lock;
    const lock = new RWLock();
    this.vaultMap.set(vaultIdString, { lock });
    return lock;
  }

  protected getReadLock(vaultId: VaultId): ResourceAcquire {
    const lock = this.getLock(vaultId);
    return async () => {
      const release = await lock.acquireRead();
      return [async () => release()];
    };
  }

  protected getWriteLock(vaultId: VaultId): ResourceAcquire {
    const lock = this.getLock(vaultId);
    return async () => {
      const release = await lock.acquireWrite();
      return [async () => release()];
    };
  }

  /**
   * Constructs a new vault instance with a given name and
   * stores it in memory
   */

  // this should actually

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async createVault(vaultName: VaultName): Promise<VaultId> {
    // Adding vault to name map
    const vaultId = await this.generateVaultId();
    await this.vaultsNamesLock.withWrite(async () => {
      const vaultIdBuffer = await this.db.get(
        this.vaultsNamesDbDomain,
        vaultName,
        true,
      );
      // Check if the vault name already exists;
      if (vaultIdBuffer != null) {
        throw new vaultsErrors.ErrorVaultsVaultDefined();
      }
      await this.db.put(
        this.vaultsNamesDbDomain,
        vaultName,
        vaultId.toBuffer(),
        true,
      );
    });
    const lock = new RWLock();
    const vaultIdString = vaultId.toString() as VaultIdString;
    this.vaultMap.set(vaultIdString, { lock });
    return await withF([this.getWriteLock(vaultId)], async () => {
      // Creating vault
      const vault = await VaultInternal.createVaultInternal({
        vaultId,
        vaultName,
        keyManager: this.keyManager,
        efs: this.efs,
        logger: this.logger.getChild(VaultInternal.name),
        db: this.db,
        vaultsDb: this.vaultsDb,
        vaultsDbDomain: this.vaultsDbDomain,
        fresh: true,
      });
      // Adding vault to object map
      this.vaultMap.set(vaultIdString, { lock, vault });
      return vault.vaultId;
    });
  }

  /**
   * Retreives the vault metadata using the vault Id
   * and parses it to return the associated vault name
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultMeta(
    vaultId: VaultId,
  ): Promise<VaultMetadata | undefined> {
    // First check if the metadata exists
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const vaultDbDomain = [...this.vaultsDbDomain, vaultIdEncoded];
    const vaultDb = await this.db.level(vaultIdEncoded, this.vaultsDb);
    // Return if metadata has no data
    if ((await this.db.count(vaultDb)) === 0) return;
    // Obtain the metadata;
    const dirty = (await this.db.get<boolean>(
      vaultDbDomain,
      VaultInternal.dirtyKey,
    ))!;
    const vaultName = (await this.db.get<VaultName>(
      vaultDbDomain,
      VaultInternal.nameKey,
    ))!;
    const remoteInfo = await this.db.get<RemoteInfo>(
      vaultDbDomain,
      VaultInternal.remoteKey,
    );
    return {
      dirty,
      vaultName,
      remoteInfo,
    };
  }

  /**
   * Removes the metadata and EFS state of a vault using a
   * given vault Id
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async destroyVault(vaultId: VaultId) {
    const vaultMeta = await this.getVaultMeta(vaultId);
    if (vaultMeta == null) return;
    const vaultName = vaultMeta.vaultName;
    this.logger.info(`Destroying Vault ${vaultsUtils.encodeVaultId(vaultId)}`);
    const vaultIdString = vaultId.toString() as VaultIdString;
    await withF([this.getWriteLock(vaultId)], async () => {
      const vault = await this.getVault(vaultId);
      // Destroying vault state and metadata
      await vault.stop();
      await vault.destroy();
      // Removing from map
      this.vaultMap.delete(vaultIdString);
      // Removing name->id mapping
      await this.vaultsNamesLock.withWrite(async () => {
        await this.db.del(this.vaultsNamesDbDomain, vaultName);
      });
    });
    this.logger.info(`Destroyed Vault ${vaultsUtils.encodeVaultId(vaultId)}`);
  }

  /**
   * Removes vault from the vault map
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async closeVault(vaultId: VaultId) {
    if ((await this.getVaultName(vaultId)) == null) {
      throw new vaultsErrors.ErrorVaultsVaultUndefined();
    }
    const vaultIdString = vaultId.toString() as VaultIdString;
    await withF([this.getWriteLock(vaultId)], async () => {
      const vault = await this.getVault(vaultId);
      await vault.stop();
      this.vaultMap.delete(vaultIdString);
    });
  }

  /**
   * Lists the vault name and associated vault Id of all
   * the vaults stored
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async listVaults(): Promise<VaultList> {
    const vaults: VaultList = new Map();
    // Stream of vaultName VaultId key value pairs
    for await (const vaultNameBuffer of this.vaultsNamesDb.createKeyStream()) {
      const vaultName = vaultNameBuffer.toString() as VaultName;
      const vaultId = (await this.getVaultId(vaultName))!;
      vaults.set(vaultName, vaultId);
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
    await withF([this.getWriteLock(vaultId)], async () => {
      this.logger.info(`Renaming Vault ${vaultsUtils.encodeVaultId(vaultId)}`);
      // Checking if new name exists
      if (await this.getVaultId(newVaultName)) {
        throw new vaultsErrors.ErrorVaultsVaultDefined();
      }
      // Checking if vault exists
      const vaultMetadata = await this.getVaultMeta(vaultId);
      if (vaultMetadata == null) {
        throw new vaultsErrors.ErrorVaultsVaultUndefined();
      }
      const oldVaultName = vaultMetadata.vaultName;
      // Updating metadata with new name;
      const vaultDbDomain = [
        ...this.vaultsDbDomain,
        vaultsUtils.encodeVaultId(vaultId),
      ];
      await this.db.put(vaultDbDomain, VaultInternal.nameKey, newVaultName);
      // Updating name->id map
      await this.vaultsNamesLock.withWrite(async () => {
        await this.db.del(this.vaultsNamesDbDomain, oldVaultName);
        await this.db.put(
          this.vaultsNamesDbDomain,
          newVaultName,
          vaultId.toBuffer(),
          true,
        );
      });
    });
  }

  /**
   * Retreives the vault Id associated with a vault name
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultId(vaultName: VaultName): Promise<VaultId | undefined> {
    return await this.vaultsNamesLock.withWrite(async () => {
      const vaultIdBuffer = await this.db.get(
        this.vaultsNamesDbDomain,
        vaultName,
        true,
      );
      if (vaultIdBuffer == null) return;
      return IdInternal.fromBuffer<VaultId>(vaultIdBuffer);
    });
  }

  /**
   * Retreives the vault name associated with a vault Id
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultName(vaultId: VaultId): Promise<VaultName | undefined> {
    const metadata = await this.getVaultMeta(vaultId);
    return metadata?.vaultName;
  }

  /**
   * Returns a dictionary of VaultActions for each node
   * @param vaultId
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultPermission(
    vaultId: VaultId,
  ): Promise<Record<NodeId, VaultActions>> {
    const rawPermissions = await this.acl.getVaultPerm(vaultId);
    const permissions: Record<NodeId, VaultActions> = {};
    // Getting the relevant information
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
    // Node Id permissions translated to other nodes in
    // a gestalt by other domains
    await this.gestaltGraph.setGestaltActionByNode(nodeId, 'scan');
    await this.acl.setVaultAction(vaultId, nodeId, 'pull');
    await this.acl.setVaultAction(vaultId, nodeId, 'clone');
    await this.notificationsManager.sendNotification(nodeId, {
      type: 'VaultShare',
      vaultId: vaultsUtils.encodeVaultId(vaultId),
      vaultName: vaultMeta.vaultName,
      actions: {
        clone: null,
        pull: null,
      },
    });
  }

  /**
   * Unsets clone, pull and scan permissions of a vault for a
   * gestalt
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async unshareVault(vaultId: VaultId, nodeId: NodeId): Promise<void> {
    const vaultMeta = await this.getVaultMeta(vaultId);
    if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
    await this.gestaltGraph.unsetGestaltActionByNode(nodeId, 'scan');
    await this.acl.unsetVaultAction(vaultId, nodeId, 'pull');
    await this.acl.unsetVaultAction(vaultId, nodeId, 'clone');
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
    const vaultId = await this.generateVaultId();
    const lock = new RWLock();
    const vaultIdString = vaultId.toString() as VaultIdString;
    this.vaultMap.set(vaultIdString, { lock });
    this.logger.info(
      `Cloning Vault ${vaultsUtils.encodeVaultId(vaultId)} on Node ${nodeId}`,
    );
    return await withF([this.getWriteLock(vaultId)], async () => {
      const vault = await VaultInternal.cloneVaultInternal({
        targetNodeId: nodeId,
        targetVaultNameOrId: vaultNameOrId,
        vaultId,
        db: this.db,
        nodeConnectionManager: this.nodeConnectionManager,
        vaultsDb: this.vaultsDb,
        vaultsDbDomain: this.vaultsDbDomain,
        keyManager: this.keyManager,
        efs: this.efs,
        logger: this.logger.getChild(VaultInternal.name),
      });
      this.vaultMap.set(vaultIdString, { lock, vault });
      const vaultMetadata = (await this.getVaultMeta(vaultId))!;
      const baseVaultName = vaultMetadata.vaultName;
      // Need to check if the name is taken, 10 attempts
      let newVaultName = baseVaultName;
      let attempts = 1;
      while (true) {
        const existingVaultId = await this.db.get(
          this.vaultsNamesDbDomain,
          newVaultName,
        );
        if (existingVaultId == null) break;
        newVaultName = `${baseVaultName}-${attempts}`;
        if (attempts >= 50) {
          throw new vaultsErrors.ErrorVaultsNameConflict(
            `Too many copies of ${baseVaultName}`,
          );
        }
        attempts++;
      }
      // Set the vaultName -> vaultId mapping
      await this.db.put(
        this.vaultsNamesDbDomain,
        newVaultName,
        vaultId.toBuffer(),
        true,
      );
      // Update vault metadata
      await this.db.put(
        [...this.vaultsDbDomain, vaultsUtils.encodeVaultId(vaultId)],
        VaultInternal.nameKey,
        newVaultName,
      );
      this.logger.info(
        `Cloned Vault ${vaultsUtils.encodeVaultId(vaultId)} on Node ${nodeId}`,
      );
      return vault.vaultId;
    });
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
  }): Promise<void> {
    if ((await this.getVaultName(vaultId)) == null) return;
    await withF([this.getWriteLock(vaultId)], async () => {
      const vault = await this.getVault(vaultId);
      await vault.pullVault({
        nodeConnectionManager: this.nodeConnectionManager,
        pullNodeId,
        pullVaultNameOrId,
      });
    });
  }

  /**
   * Handler for receiving http GET requests when being
   * cloned or pulled from
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async *handleInfoRequest(vaultId: VaultId): AsyncGenerator<Buffer> {
    const efs = this.efs;
    const vault = await this.getVault(vaultId);
    return yield* withG(
      [this.getReadLock(vaultId), vault.readLock],
      async function* (): AsyncGenerator<Buffer, void> {
        // Adherence to git protocol
        yield Buffer.from(
          gitUtils.createGitPacketLine('# service=git-upload-pack\n'),
        );
        yield Buffer.from('0000');
        // Read the commit state of the vault
        const uploadPack = await gitUtils.uploadPack({
          fs: efs,
          dir: path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
          gitdir: path.join(vaultsUtils.encodeVaultId(vaultId), '.git'),
          advertiseRefs: true,
        });
        for (const buffer of uploadPack) {
          yield buffer;
        }
      },
    );
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
    const vault = await this.getVault(vaultId);
    return await withF(
      [this.getReadLock(vaultId), vault.readLock],
      async () => {
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
      },
    );
  }

  /**
   * Retrieves all the vaults for a peers node
   */
  public async *scanVaults(targetNodeId: NodeId): AsyncGenerator<{
    vaultName: VaultName;
    vaultIdEncoded: VaultIdEncoded;
    vaultPermissions: VaultAction[];
  }> {
    // Create a connection to another node
    return yield* this.nodeConnectionManager.withConnG(
      targetNodeId,
      async function* (connection): AsyncGenerator<{
        vaultName: VaultName;
        vaultIdEncoded: VaultIdEncoded;
        vaultPermissions: VaultAction[];
      }> {
        const client = connection.getClient();
        const genReadable = client.vaultsScan(new utilsPB.EmptyMessage());
        for await (const vault of genReadable) {
          const vaultName = vault.getVaultName() as VaultName;
          const vaultIdEncoded = vault.getVaultId() as VaultIdEncoded;
          const vaultPermissions =
            vault.getVaultPermissionsList() as VaultAction[];
          yield { vaultName, vaultIdEncoded, vaultPermissions };
        }
      },
    );
  }

  /**
   * Returns all the shared vaults for a NodeId.
   */
  public async *handleScanVaults(
    nodeId: NodeId,
  ): AsyncGenerator<{
    vaultId: VaultId;
    vaultName: VaultName;
    vaultPermissions: VaultAction[];
  }> {
    // Checking permission
    const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
    const permissions = await this.acl.getNodePerm(nodeId);
    if (permissions == null) {
      throw new vaultsErrors.ErrorVaultsPermissionDenied(
        `No permissions found for ${nodeIdEncoded}`,
      );
    }
    if (permissions.gestalt.scan === undefined) {
      throw new vaultsErrors.ErrorVaultsPermissionDenied(
        `Scanning is not allowed for ${nodeIdEncoded}`,
      );
    }

    // Getting the list of vaults
    const vaults = permissions.vaults;
    for (const vaultIdString of Object.keys(vaults)) {
      // Getting vault permissions
      const vaultId = IdInternal.fromString<VaultId>(vaultIdString);
      const vaultPermissions = Object.keys(
        vaults[vaultIdString],
      ) as VaultAction[];
      // Getting the vault name
      const metadata = await this.getVaultMeta(vaultId);
      const vaultName = metadata!.vaultName;
      const element = {
        vaultId,
        vaultName,
        vaultPermissions,
      };
      yield element;
    }
  }

  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  protected async generateVaultId(): Promise<VaultId> {
    let vaultId = vaultsUtils.generateVaultId();
    let i = 0;
    while (await this.efs.exists(vaultsUtils.encodeVaultId(vaultId))) {
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
    let lock: RWLock;
    const vaultIdString = vaultId.toString() as VaultIdString;
    let vaultAndLock = this.vaultMap.get(vaultIdString);
    if (vaultAndLock != null) {
      ({ vault, lock } = vaultAndLock);
      // Lock and vault exist
      if (vault != null) {
        return vault;
      }
      // Only lock exists
      let release;
      try {
        release = await lock.acquireWrite();
        ({ vault } = vaultAndLock);
        if (vault != null) {
          return vault;
        }
        // Only create if the vault state already exists
        if ((await this.getVaultMeta(vaultId)) == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined(
            `Vault ${vaultsUtils.encodeVaultId(vaultId)} doesn't exist`,
          );
        }
        vault = await VaultInternal.createVaultInternal({
          vaultId,
          keyManager: this.keyManager,
          efs: this.efs,
          logger: this.logger.getChild(VaultInternal.name),
          db: this.db,
          vaultsDb: this.vaultsDb,
          vaultsDbDomain: this.vaultsDbDomain,
        });
        vaultAndLock.vault = vault;
        this.vaultMap.set(vaultIdString, vaultAndLock);
        return vault;
      } finally {
        release();
      }
    } else {
      // Neither vault nor lock exists
      lock = new RWLock();
      vaultAndLock = { lock };
      this.vaultMap.set(vaultIdString, vaultAndLock);
      let release;
      try {
        release = await lock.acquireWrite();
        // Only create if the vault state already exists
        if ((await this.getVaultMeta(vaultId)) == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined(
            `Vault ${vaultsUtils.encodeVaultId(vaultId)} doesn't exist`,
          );
        }
        vault = await VaultInternal.createVaultInternal({
          vaultId,
          keyManager: this.keyManager,
          efs: this.efs,
          db: this.db,
          vaultsDb: this.vaultsDb,
          vaultsDbDomain: this.vaultsDbDomain,
          logger: this.logger.getChild(VaultInternal.name),
        });
        vaultAndLock.vault = vault;
        this.vaultMap.set(vaultIdString, vaultAndLock);
        return vault;
      } finally {
        release();
      }
    }
  }

  // THIS can also be replaced with generic withF and withG

  /**
   * Takes a function and runs it with the listed vaults. locking is handled automatically
   * @param vaultIds List of vault ID for vaults you wish to use
   * @param f Function you wish to run with the provided vaults
   */
  @ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async withVaults<T>(
    vaultIds: VaultId[],
    f: (...args: Vault[]) => Promise<T>,
  ): Promise<T> {
    // Stages:
    // 1. Obtain vaults
    // 2. Call function with vaults while locking the vaults
    // 3. Catch any problems and preform clean up in finally
    // 4. return result

    const vaults = await Promise.all(
      vaultIds.map(async (vaultId) => {
        return await this.getVault(vaultId);
      }),
    );

    // Obtaining locks
    const vaultLocks = vaultIds.map((vaultId) => {
      return this.getReadLock(vaultId);
    });

    // Running the function with locking
    return await withF(vaultLocks, () => {
      return f(...vaults);
    });
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
