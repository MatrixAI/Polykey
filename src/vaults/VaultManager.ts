import type { LockRequest } from '@matrixai/async-locks';
import type { ContextTimed, ContextTimedInput } from '@matrixai/contexts';
import type { DBTransaction, LevelPath } from '@matrixai/db';
import type {
  VaultId,
  VaultName,
  VaultActions,
  VaultIdString,
  VaultIdEncoded,
} from './types.js';
import type { Vault } from './Vault.js';
import type { FileSystem } from '../types.js';
import type { NodeId } from '../ids/types.js';
import type KeyRing from '../keys/KeyRing.js';
import type NodeManager from '../nodes/NodeManager.js';
import type GestaltGraph from '../gestalts/GestaltGraph.js';
import type NotificationsManager from '../notifications/NotificationsManager.js';
import type ACL from '../acl/ACL.js';
import type { PolykeyWorkerManager } from '../workers/types.js';
import type { RemoteInfo } from './VaultInternal.js';
import type { VaultAction } from './types.js';
import type { AgentClientManifest } from '#nodes/agent/callers/index.js';
import path from 'node:path';
import { DB } from '@matrixai/db';
import { EncryptedFS, errors as encryptedFsErrors } from 'encryptedfs';
import { createDestroyStartStop } from '@matrixai/async-init';
import { IdInternal } from '@matrixai/id';
import { withF, withG } from '@matrixai/resources';
import { LockBox, RWLockWriter } from '@matrixai/async-locks';
import { decorators } from '@matrixai/contexts';
import Logger from '@matrixai/logger';
import VaultInternal from './VaultInternal.js';
import * as vaultsEvents from './events.js';
import * as vaultsUtils from './utils.js';
import * as vaultsErrors from './errors.js';
import config from '../config.js';
import { mkdirExists } from '../utils/utils.js';
import * as gitHttp from '../git/http.js';
import * as nodesUtils from '../nodes/utils.js';
import * as keysUtils from '../keys/utils/index.js';
import { polykeyWorkerManifest } from '../workers/index.js';
import * as utils from '../utils/index.js';

/**
 * Object map pattern for each vault.
 */
type VaultMap = Map<VaultIdString, VaultInternal>;

type VaultList = Map<VaultName, VaultId>;
type VaultMetadata = {
  dirty: boolean;
  vaultName: VaultName;
  remoteInfo?: RemoteInfo;
};

interface VaultManager extends createDestroyStartStop.CreateDestroyStartStop {}
@createDestroyStartStop.CreateDestroyStartStop(
  new vaultsErrors.ErrorVaultManagerRunning(),
  new vaultsErrors.ErrorVaultManagerDestroyed(),
  {
    eventStart: vaultsEvents.EventVaultManagerStart,
    eventStarted: vaultsEvents.EventVaultManagerStarted,
    eventStop: vaultsEvents.EventVaultManagerStop,
    eventStopped: vaultsEvents.EventVaultManagerStopped,
    eventDestroy: vaultsEvents.EventVaultManagerDestroy,
    eventDestroyed: vaultsEvents.EventVaultManagerDestroyed,
  },
)
class VaultManager {
  static async createVaultManager({
    vaultsPath,
    db,
    acl,
    keyRing,
    nodeManager,
    gestaltGraph,
    notificationsManager,
    fs,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    vaultsPath: string;
    db: DB;
    acl: ACL;
    keyRing: KeyRing;
    nodeManager: NodeManager<AgentClientManifest>;
    gestaltGraph: GestaltGraph;
    notificationsManager: NotificationsManager;
    fs?: FileSystem;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<VaultManager> {
    logger.info(`Creating ${this.name}`);
    logger.info(`Setting vaults path to ${vaultsPath}`);
    fs = await utils.importFS(fs);
    const vaultManager = new this({
      vaultsPath,
      db,
      acl,
      keyRing,
      nodeManager,
      gestaltGraph,
      notificationsManager,
      fs,
      logger,
    });
    await vaultManager.start({ fresh });
    logger.info(`Created ${this.name}`);
    return vaultManager;
  }

  public readonly vaultsPath: string;
  public readonly efsPath: string;

  protected fs: FileSystem;
  protected logger: Logger;
  protected db: DB;
  protected acl: ACL;
  protected keyRing: KeyRing;
  protected nodeManager: NodeManager<AgentClientManifest>;
  protected gestaltGraph: GestaltGraph;
  protected notificationsManager: NotificationsManager;
  protected vaultsDbPath: LevelPath = [this.constructor.name];
  protected vaultsNamesDbPath: LevelPath = [this.constructor.name, 'names'];
  // VaultId -> VaultMetadata
  protected vaultMap: VaultMap = new Map();
  protected vaultLocks: LockBox<RWLockWriter> = new LockBox();
  protected vaultKey: Buffer;
  protected efsDb: DB;
  protected efs: EncryptedFS;
  protected vaultIdGenerator = vaultsUtils.createVaultIdGenerator();

  constructor({
    vaultsPath,
    db,
    acl,
    keyRing,
    nodeManager,
    gestaltGraph,
    notificationsManager,
    fs,
    logger,
  }: {
    vaultsPath: string;
    db: DB;
    acl: ACL;
    keyRing: KeyRing;
    nodeManager: NodeManager<AgentClientManifest>;
    gestaltGraph: GestaltGraph;
    notificationsManager: NotificationsManager;
    fs: FileSystem;
    logger: Logger;
  }) {
    this.logger = logger;
    this.vaultsPath = vaultsPath;
    this.efsPath = path.join(this.vaultsPath, config.paths.efsBase);
    this.db = db;
    this.acl = acl;
    this.keyRing = keyRing;
    this.nodeManager = nodeManager;
    this.gestaltGraph = gestaltGraph;
    this.notificationsManager = notificationsManager;
    this.fs = fs;
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    await this.db.withTransactionF(async (tran) => {
      try {
        this.logger.info(`Starting ${this.constructor.name}`);
        if (fresh) {
          await tran.clear(this.vaultsDbPath);
          await this.fs.promises.rm(this.vaultsPath, {
            force: true,
            recursive: true,
          });
        }
        await mkdirExists(this.fs, this.vaultsPath);
        const vaultKey = await this.setupKey(tran);
        let efsDb: DB;
        let efs: EncryptedFS;
        try {
          efsDb = await DB.createDB({
            crypto: {
              key: vaultKey,
              ops: polykeyWorkerManifest,
            },
            dbPath: this.efsPath,
            logger: this.logger.getChild('EFS Database'),
            fresh: fresh,
          });
          efs = await EncryptedFS.createEncryptedFS({
            db: efsDb,
            logger: this.logger.getChild('EncryptedFileSystem'),
            fresh: fresh,
          });
        } catch (e) {
          if (e instanceof encryptedFsErrors.ErrorEncryptedFSKey) {
            throw new vaultsErrors.ErrorVaultManagerKey(e.message, {
              cause: e,
            });
          }
          throw new vaultsErrors.ErrorVaultManagerEFS(e.message, {
            data: {
              errno: e.errno,
              syscall: e.syscall,
              code: e.code,
              path: e.path,
            },
            cause: e,
          });
        }
        this.vaultKey = vaultKey;
        this.efsDb = efsDb;
        this.efs = efs;
        this.logger.info(`Started ${this.constructor.name}`);
      } catch (e) {
        this.logger.warn(`Failed starting ${this.constructor.name}`);
        await this.efs?.stop();
        await this.efsDb?.stop();
        throw e;
      }
    });
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    // Iterate over vaults in memory and destroy them, ensuring that the working
    // directory commit state is saved.
    const promises: Array<Promise<void>> = [];
    for (const vaultIdString of this.vaultMap.keys()) {
      const vaultId = IdInternal.fromString<VaultId>(vaultIdString);
      promises.push(
        withF(
          [this.vaultLocks.lock([vaultId.toString(), RWLockWriter, 'write'])],
          async () => {
            const vault = this.vaultMap.get(vaultIdString);
            if (vault == null) return;
            await vault.stop();
            this.vaultMap.delete(vaultIdString);
          },
        ),
      );
    }
    await Promise.all(promises);
    await this.efs.stop();
    await this.efsDb.stop();
    this.vaultMap = new Map();
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy(): Promise<void> {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.efsDb.start({
      crypto: {
        key: this.vaultKey,
        ops: polykeyWorkerManifest,
      },
      fresh: false,
    });
    await this.efs.destroy();
    await this.efsDb.stop();
    await this.efsDb.destroy();
    // Clearing all vaults db data
    await this.db.clear(this.vaultsDbPath);
    // Is it necessary to remove the vaults' domain?
    await this.fs.promises.rm(this.vaultsPath, {
      force: true,
      recursive: true,
    });
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  public setWorkerManager(workerManager: PolykeyWorkerManager) {
    this.efs.setWorkerManager(workerManager);
  }

  public unsetWorkerManager() {
    this.efs.unsetWorkerManager();
  }

  /**
   * Constructs a new Vault instance with a given name and stores it in memory.
   */
  public async createVault(
    vaultName: VaultName,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<VaultId>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  @decorators.timedCancellable(true)
  public async createVault(
    vaultName: VaultName,
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): Promise<VaultId> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.createVault(vaultName, tran, ctx),
      );
    }
    // Adding vault to name map
    const vaultId = await this.generateVaultId();
    await tran.lock([...this.vaultsNamesDbPath, vaultName].join(''));
    const vaultIdBuffer = await tran.get(
      [...this.vaultsNamesDbPath, vaultName],
      true,
    );
    // Check if the vault name already exists;
    if (vaultIdBuffer != null) {
      throw new vaultsErrors.ErrorVaultsVaultDefined();
    }
    await tran.put(
      [...this.vaultsNamesDbPath, vaultName],
      vaultId.toBuffer(),
      true,
    );
    const vaultIdString = vaultId.toString() as VaultIdString;
    return await this.vaultLocks.withF(
      [vaultId.toString(), RWLockWriter, 'write'],
      async () => {
        // Creating vault
        const vault = await VaultInternal.createVaultInternal(
          {
            vaultId: vaultId,
            vaultName: vaultName,
            keyRing: this.keyRing,
            efs: this.efs,
            db: this.db,
            vaultsDbPath: this.vaultsDbPath,
            fresh: true,
            logger: this.logger.getChild(VaultInternal.name),
          },
          tran,
          ctx,
        );
        // Adding vault to object map
        this.vaultMap.set(vaultIdString, vault);
        return vault.vaultId;
      },
    );
  }

  /**
   * Retrieves the vault metadata using the VaultId and parses it to return the
   * associated vault name.
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultMeta(
    vaultId: VaultId,
    tran?: DBTransaction,
  ): Promise<VaultMetadata | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getVaultMeta(vaultId, tran),
      );
    }

    // First check if the metadata exists
    const vaultIdEncoded = vaultsUtils.encodeVaultId(vaultId);
    const vaultDbPath: LevelPath = [...this.vaultsDbPath, vaultIdEncoded];
    // Return if metadata has no data
    if ((await tran.count(vaultDbPath)) === 0) return;
    // Obtain the metadata;
    const dirty = (await tran.get<boolean>([
      ...vaultDbPath,
      VaultInternal.dirtyKey,
    ]))!;
    const vaultName = (await tran.get<VaultName>([
      ...vaultDbPath,
      VaultInternal.nameKey,
    ]))!;
    const remoteInfo = await tran.get<RemoteInfo>([
      ...vaultDbPath,
      VaultInternal.remoteKey,
    ]);
    return {
      dirty,
      vaultName,
      remoteInfo,
    };
  }

  /**
   * Removes the metadata and EFS state of a vault using a given VaultId.
   */
  public async destroyVault(
    vaultId: VaultId,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimed>,
  ): Promise<void>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  @decorators.timedCancellable(true)
  public async destroyVault(
    vaultId: VaultId,
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.destroyVault(vaultId, tran, ctx),
      );
    }

    await this.vaultLocks.withF(
      [vaultId.toString(), RWLockWriter, 'write'],
      async () => {
        await tran.lock([...this.vaultsDbPath, vaultId].join(''));
        // Ensure protection from write skew
        await tran.getForUpdate([
          ...this.vaultsDbPath,
          vaultsUtils.encodeVaultId(vaultId),
          VaultInternal.nameKey,
        ]);
        const vaultMeta = await this.getVaultMeta(vaultId, tran);
        if (vaultMeta == null) return;
        const vaultName = vaultMeta.vaultName;
        this.logger.info(
          `Destroying Vault ${vaultsUtils.encodeVaultId(vaultId)}`,
        );
        const vaultIdString = vaultId.toString() as VaultIdString;
        const vault = await this.getVault(vaultId, tran, ctx);
        // Destroying vault state and metadata
        await vault.stop();
        await vault.destroy(tran);
        // Removing from map
        this.vaultMap.delete(vaultIdString);
        // Removing name->id mapping
        await tran.del([...this.vaultsNamesDbPath, vaultName]);
      },
    );
    this.logger.info(`Destroyed Vault ${vaultsUtils.encodeVaultId(vaultId)}`);
  }

  /**
   * Removes a vault from the vault map.
   */
  public async closeVault(
    vaultId: VaultId,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<void>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  @decorators.timedCancellable(true)
  public async closeVault(
    vaultId: VaultId,
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.closeVault(vaultId, tran, ctx),
      );
    }

    if ((await this.getVaultName(vaultId, tran)) == null) {
      throw new vaultsErrors.ErrorVaultsVaultUndefined();
    }
    const vaultIdString = vaultId.toString() as VaultIdString;
    await this.vaultLocks.withF(
      [vaultId.toString(), RWLockWriter, 'write'],
      async () => {
        await tran.lock([...this.vaultsDbPath, vaultId].join(''));
        const vault = await this.getVault(vaultId, tran, ctx);
        await vault.stop();
        this.vaultMap.delete(vaultIdString);
      },
    );
  }

  /**
   * Lists the vault name and associated VaultId of all the stored vaults.
   */
  public async listVaults(
    ctx?: Partial<ContextTimed>,
    tran?: DBTransaction,
  ): Promise<VaultList>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  @decorators.timedCancellable(true)
  public async listVaults(
    @decorators.context ctx: ContextTimed,
    tran?: DBTransaction,
  ): Promise<VaultList> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.listVaults(ctx, tran));
    }

    const vaults: VaultList = new Map();
    // Stream of vaultName VaultId key value pairs
    for await (const [vaultNameBuffer, vaultIdBuffer] of tran.iterator(
      this.vaultsNamesDbPath,
    )) {
      if (ctx.signal.aborted) throw ctx.signal.reason;
      const vaultName = vaultNameBuffer.toString() as VaultName;
      const vaultId = IdInternal.fromBuffer<VaultId>(vaultIdBuffer);
      vaults.set(vaultName, vaultId);
    }
    return vaults;
  }

  /**
   * Changes the vault name metadata of a VaultId.
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async renameVault(
    vaultId: VaultId,
    newVaultName: VaultName,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.renameVault(vaultId, newVaultName, tran),
      );
    }

    await this.vaultLocks.withF(
      [vaultId.toString(), RWLockWriter, 'write'],
      async () => {
        await tran.lock(
          [...this.vaultsNamesDbPath, newVaultName]
            .map((v) => v.toString())
            .join(''),
          [...this.vaultsDbPath, vaultId].map((v) => v.toString()).join(''),
        );
        this.logger.info(
          `Renaming Vault ${vaultsUtils.encodeVaultId(vaultId)}`,
        );
        // Checking if new name exists
        if (await this.getVaultId(newVaultName, tran)) {
          throw new vaultsErrors.ErrorVaultsVaultDefined();
        }
        // Ensure protection from write skew
        await tran.getForUpdate([
          ...this.vaultsDbPath,
          vaultsUtils.encodeVaultId(vaultId),
          VaultInternal.nameKey,
        ]);
        // Checking if vault exists
        const vaultMetadata = await this.getVaultMeta(vaultId, tran);
        if (vaultMetadata == null) {
          throw new vaultsErrors.ErrorVaultsVaultUndefined();
        }
        const oldVaultName = vaultMetadata.vaultName;
        // Updating metadata with new name;
        const vaultDbPath = [
          ...this.vaultsDbPath,
          vaultsUtils.encodeVaultId(vaultId),
        ];
        await tran.put([...vaultDbPath, VaultInternal.nameKey], newVaultName);
        // Updating name->id map
        await tran.del([...this.vaultsNamesDbPath, oldVaultName]);
        await tran.put(
          [...this.vaultsNamesDbPath, newVaultName],
          vaultId.toBuffer(),
          true,
        );
      },
    );
  }

  /**
   * Retrieves the VaultId associated with a vault name.
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultId(
    vaultName: VaultName,
    tran?: DBTransaction,
  ): Promise<VaultId | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getVaultId(vaultName, tran),
      );
    }

    await tran.lock([...this.vaultsNamesDbPath, vaultName].join(''));
    const vaultIdBuffer = await tran.get(
      [...this.vaultsNamesDbPath, vaultName],
      true,
    );
    if (vaultIdBuffer == null) return;
    return IdInternal.fromBuffer<VaultId>(vaultIdBuffer);
  }

  /**
   * Retrieves the vault name associated with a VaultId.
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultName(
    vaultId: VaultId,
    tran?: DBTransaction,
  ): Promise<VaultName | undefined> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getVaultName(vaultId, tran),
      );
    }
    const metadata = await this.getVaultMeta(vaultId, tran);
    return metadata?.vaultName;
  }

  /**
   * Returns a dictionary of VaultActions for each node
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async getVaultPermission(
    vaultId: VaultId,
    tran?: DBTransaction,
  ): Promise<Record<NodeId, VaultActions>> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getVaultPermission(vaultId, tran),
      );
    }

    const rawPermissions = await this.acl.getVaultPerm(vaultId, tran);
    const permissions: Record<NodeId, VaultActions> = {};
    // Getting the relevant information
    for (const nodeId in rawPermissions) {
      permissions[nodeId] = rawPermissions[nodeId].vaults[vaultId];
    }
    return permissions;
  }

  /**
   * Sets clone, pull and scan permissions of a vault for a gestalt and send a
   * notification to this gestalt.
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async shareVault(
    vaultId: VaultId,
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.shareVault(vaultId, nodeId, tran),
      );
    }

    const vaultMeta = await this.getVaultMeta(vaultId, tran);
    if (vaultMeta == null) throw new vaultsErrors.ErrorVaultsVaultUndefined();
    // NodeId permissions translated to other nodes in a gestalt by other domains
    await this.gestaltGraph.setGestaltAction(['node', nodeId], 'scan', tran);
    await this.acl.setVaultAction(vaultId, nodeId, 'pull', tran);
    await this.acl.setVaultAction(vaultId, nodeId, 'clone', tran);
    await this.notificationsManager.sendNotification({
      nodeId: nodeId,
      data: {
        type: 'VaultShare',
        vaultId: vaultsUtils.encodeVaultId(vaultId),
        vaultName: vaultMeta.vaultName,
        actions: {
          clone: null,
          pull: null,
        },
      },
    });
  }

  /**
   * Unsets clone, pull and scan permissions of a vault for a gestalt.
   */
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  public async unshareVault(
    vaultId: VaultId,
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unshareVault(vaultId, nodeId, tran),
      );
    }

    const vaultMeta = await this.getVaultMeta(vaultId, tran);
    if (!vaultMeta) throw new vaultsErrors.ErrorVaultsVaultUndefined();
    await this.gestaltGraph.unsetGestaltAction(['node', nodeId], 'scan', tran);
    await this.acl.unsetVaultAction(vaultId, nodeId, 'pull', tran);
    await this.acl.unsetVaultAction(vaultId, nodeId, 'clone', tran);
  }

  /**
   * Clones the contents of a remote vault into a new local
   * vault instance
   */
  public async cloneVault(
    nodeId: NodeId,
    vaultNameOrId: VaultId | VaultName,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<VaultId>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  @decorators.timedCancellable(true)
  public async cloneVault(
    nodeId: NodeId,
    vaultNameOrId: VaultId | VaultName,
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): Promise<VaultId> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.cloneVault(nodeId, vaultNameOrId, tran, ctx),
      );
    }

    const vaultId = await this.generateVaultId();
    const vaultIdString = vaultId.toString() as VaultIdString;
    this.logger.info(
      `Cloning Vault ${vaultsUtils.encodeVaultId(vaultId)} on Node ${nodeId}`,
    );
    return await this.vaultLocks.withF(
      [vaultId.toString(), RWLockWriter, 'write'],
      ctx,
      async () => {
        const vault = await VaultInternal.cloneVaultInternal(
          {
            targetNodeId: nodeId,
            targetVaultNameOrId: vaultNameOrId,
            vaultId: vaultId,
            db: this.db,
            nodeManager: this.nodeManager,
            vaultsDbPath: this.vaultsDbPath,
            keyRing: this.keyRing,
            efs: this.efs,
            logger: this.logger.getChild(VaultInternal.name),
          },
          tran,
          ctx,
        );
        this.vaultMap.set(vaultIdString, vault);
        const vaultMetadata = (await this.getVaultMeta(vaultId, tran))!;
        const baseVaultName = vaultMetadata.vaultName;
        // Need to check if the name is taken, 10 attempts
        let newVaultName = baseVaultName;
        let attempts = 1;
        while (true) {
          const existingVaultId = await tran.get(
            [...this.vaultsNamesDbPath, newVaultName],
            true,
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
        await tran.put(
          [...this.vaultsNamesDbPath, newVaultName],
          vaultId.toBuffer(),
          true,
        );
        // Update vault metadata
        await tran.put(
          [
            ...this.vaultsDbPath,
            vaultsUtils.encodeVaultId(vaultId),
            VaultInternal.nameKey,
          ],
          newVaultName,
        );
        this.logger.info(
          `Cloned Vault ${vaultsUtils.encodeVaultId(
            vaultId,
          )} on Node ${nodeId}`,
        );
        return vault.vaultId;
      },
    );
  }

  /**
   * Pulls the contents of a remote vault into an existing vault instance.
   */
  public async pullVault(
    {
      vaultId,
      pullNodeId,
      pullVaultNameOrId,
    }: {
      vaultId: VaultId;
      pullNodeId?: NodeId;
      pullVaultNameOrId?: VaultId | VaultName;
    },
    tran?: DBTransaction,
    ctx?: Partial<ContextTimed>,
  ): Promise<void>;
  @decorators.timedCancellable(true)
  public async pullVault(
    {
      vaultId,
      pullNodeId,
      pullVaultNameOrId,
    }: {
      vaultId: VaultId;
      pullNodeId?: NodeId;
      pullVaultNameOrId?: VaultId | VaultName;
    },
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.pullVault({ vaultId, pullNodeId, pullVaultNameOrId }, tran, ctx),
      );
    }

    if ((await this.getVaultName(vaultId, tran)) == null) return;
    await this.vaultLocks.withF(
      [vaultId.toString(), RWLockWriter, 'write'],
      async () => {
        await tran.lock([...this.vaultsDbPath, vaultId].join(''));
        const vault = await this.getVault(vaultId, tran, ctx);
        await vault.pullVault(
          {
            nodeManager: this.nodeManager,
            pullNodeId: pullNodeId,
            pullVaultNameOrId: pullVaultNameOrId,
          },
          tran,
          ctx,
        );
      },
    );
  }

  /**
   * Handler for receiving http GET requests when being cloned or pulled from.
   */
  public handleInfoRequest(
    vaultId: VaultId,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): AsyncGenerator<Buffer, void, void>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  @decorators.timed()
  public async *handleInfoRequest(
    vaultId: VaultId,
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): AsyncGenerator<Buffer, void, void> {
    if (tran == null) {
      const handleInfoRequest = (tran: DBTransaction) =>
        this.handleInfoRequest(vaultId, tran, ctx);
      return yield* this.db.withTransactionG(async function* (tran) {
        return yield* handleInfoRequest(tran);
      });
    }

    const efs = this.efs;
    const vault = await this.getVault(vaultId, tran, ctx);
    return yield* withG(
      [
        this.vaultLocks.lock([vaultId.toString(), RWLockWriter, 'read'], ctx),
        vault.getLock().read(),
      ],
      async function* (): AsyncGenerator<Buffer, void, void> {
        ctx.signal.throwIfAborted();
        // Read the commit state of the vault
        yield* gitHttp.advertiseRefGenerator(
          {
            efs: efs,
            dir: path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
            gitDir: path.join(vaultsUtils.encodeVaultId(vaultId), '.git'),
          },
          ctx,
        );
      },
    );
  }

  /**
   * Handler for receiving http POST requests when being cloned or pulled from.
   */
  public handlePackRequest(
    vaultId: VaultId,
    body: Array<Buffer>,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): AsyncGenerator<Buffer, void, void>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  @decorators.timed()
  public async *handlePackRequest(
    vaultId: VaultId,
    body: Array<Buffer>,
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): AsyncGenerator<Buffer, void, void> {
    if (tran == null) {
      // Lambda to maintain `this` decorators.context
      const handlePackRequest = (tran: DBTransaction) =>
        this.handlePackRequest(vaultId, body, tran, ctx);
      return yield* this.db.withTransactionG(async function* (tran) {
        return yield* handlePackRequest(tran);
      });
    }

    const vault = await this.getVault(vaultId, tran, ctx);
    const efs = this.efs;
    yield* withG(
      [
        this.vaultLocks.lock([vaultId.toString(), RWLockWriter, 'read'], ctx),
        vault.getLock().read(ctx),
      ],
      async function* (): AsyncGenerator<Buffer, void, void> {
        ctx.signal.throwIfAborted();
        yield* gitHttp.generatePackRequest(
          {
            efs: efs,
            dir: path.join(vaultsUtils.encodeVaultId(vaultId), 'contents'),
            gitDir: path.join(vaultsUtils.encodeVaultId(vaultId), '.git'),
            body: body,
          },
          ctx,
        );
      },
    );
  }

  /**
   * Retrieves all the vaults for a peer's node.
   */
  public scanVaults(
    targetNodeId: NodeId,
    ctx?: Partial<ContextTimedInput>,
  ): AsyncGenerator<{
    vaultName: VaultName;
    vaultIdEncoded: VaultIdEncoded;
    vaultPermissions: VaultAction[];
  }>;
  @decorators.timed()
  public async *scanVaults(
    targetNodeId: NodeId,
    @decorators.context ctx: ContextTimed,
  ): AsyncGenerator<{
    vaultName: VaultName;
    vaultIdEncoded: VaultIdEncoded;
    vaultPermissions: VaultAction[];
  }> {
    // Create a connection to another node
    return yield* this.nodeManager.withConnG(
      targetNodeId,
      ctx,
      async function* (connection): AsyncGenerator<{
        vaultName: VaultName;
        vaultIdEncoded: VaultIdEncoded;
        vaultPermissions: VaultAction[];
      }> {
        const client = connection.getClient();
        const genReadable = await client.methods.vaultsScan({}, ctx);
        for await (const vault of genReadable) {
          ctx.signal.throwIfAborted();
          yield {
            vaultName: vault.vaultName,
            vaultIdEncoded: vault.vaultIdEncoded,
            vaultPermissions: vault.vaultPermissions,
          };
        }
      },
    );
  }

  /**
   * Returns all the shared vaults for a NodeId.
   */
  public handleScanVaults(
    nodeId: NodeId,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): AsyncGenerator<{
    vaultId: VaultId;
    vaultName: VaultName;
    vaultPermissions: VaultAction[];
  }>;
  @decorators.timed()
  public async *handleScanVaults(
    nodeId: NodeId,
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): AsyncGenerator<{
    vaultId: VaultId;
    vaultName: VaultName;
    vaultPermissions: VaultAction[];
  }> {
    if (tran == null) {
      // Lambda to maintain `this` decorators.context
      const handleScanVaults = (tran: DBTransaction) =>
        this.handleScanVaults(nodeId, tran, ctx);
      return yield* this.db.withTransactionG(async function* (tran) {
        return yield* handleScanVaults(tran);
      });
    }

    // Checking permission
    const nodeIdEncoded = nodesUtils.encodeNodeId(nodeId);
    const permissions = await this.acl.getNodePerm(nodeId, tran);
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
      ctx.signal.throwIfAborted();
      // Getting vault permissions
      const vaultId = IdInternal.fromString<VaultId>(vaultIdString);
      const vaultPermissions = Object.keys(
        vaults[vaultIdString],
      ) as VaultAction[];
      // Getting the vault name
      const metadata = await this.getVaultMeta(vaultId, tran);
      const vaultName = metadata!.vaultName;
      const element = {
        vaultId,
        vaultName,
        vaultPermissions,
      };
      yield element;
    }
  }

  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  protected async generateVaultId(): Promise<VaultId> {
    let vaultId = this.vaultIdGenerator();
    let i = 0;
    while (await this.efs.exists(vaultsUtils.encodeVaultId(vaultId))) {
      i++;
      if (i > 50) {
        throw new vaultsErrors.ErrorVaultsCreateVaultId(
          'Could not create a unique vaultId after 50 attempts',
        );
      }
      vaultId = this.vaultIdGenerator();
    }
    return vaultId;
  }

  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  protected async getVault(
    vaultId: VaultId,
    tran: DBTransaction,
    ctx: ContextTimed,
  ): Promise<VaultInternal> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getVault(vaultId, tran, ctx),
      );
    }

    const vaultIdString = vaultId.toString() as VaultIdString;
    // 1. Try to get the vault. If it exists then return that.
    const vault = this.vaultMap.get(vaultIdString);
    if (vault != null) return vault;
    // If no vault or state exists, then we throw an error
    if ((await this.getVaultMeta(vaultId, tran)) == null) {
      throw new vaultsErrors.ErrorVaultsVaultUndefined(
        `Vault ${vaultsUtils.encodeVaultId(vaultId)} doesn't exist`,
      );
    }
    // 2. If the state doesn't exist then create it, add to map and return that.
    const newVault = await VaultInternal.createVaultInternal(
      {
        vaultId: vaultId,
        keyRing: this.keyRing,
        efs: this.efs,
        db: this.db,
        vaultsDbPath: this.vaultsDbPath,
        logger: this.logger.getChild(VaultInternal.name),
      },
      tran,
      ctx,
    );
    this.vaultMap.set(vaultIdString, newVault);
    return newVault;
  }

  /**
   * Takes a function and runs it with the listed vaults. Locking is handled
   * automatically.
   * @param vaultIds List of vault ID for vaults you wish to use
   * @param f Function you wish to run with the provided vaults
   * @param tran
   * @param ctx
   */
  public async withVaults<T>(
    vaultIds: VaultId[],
    f: (...args: Vault[]) => Promise<T>,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): Promise<T>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  @decorators.timedCancellable(true)
  public async withVaults<T>(
    vaultIds: VaultId[],
    f: (...args: Vault[]) => Promise<T>,
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): Promise<T> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.withVaults(vaultIds, f, tran, ctx),
      );
    }

    // Obtaining locks
    const vaultLocks: Array<LockRequest<RWLockWriter>> = vaultIds.map(
      (vaultId) => {
        return [vaultId.toString(), RWLockWriter, 'read'];
      },
    );
    // Running the function with locking
    return await this.vaultLocks.withF(...vaultLocks, async () => {
      // Getting the vaults while locked
      const vaults = await Promise.all(
        vaultIds.map(async (vaultId) => {
          return await this.getVault(vaultId, tran, ctx);
        }),
      );
      return await f(...vaults);
    });
  }

  /**
   * Takes a generator and runs it with the listed vaults. Locking is handled
   * automatically.
   * @param vaultIds List of vault ID for vaults you wish to use
   * @param g Generator you wish to run with the provided vaults
   * @param tran
   * @param ctx
   */
  public withVaultsG<T, TReturn, TNext>(
    vaultIds: Array<VaultId>,
    g: (...args: Array<Vault>) => AsyncGenerator<T, TReturn, TNext>,
    tran?: DBTransaction,
    ctx?: Partial<ContextTimedInput>,
  ): AsyncGenerator<T, TReturn, TNext>;
  @createDestroyStartStop.ready(new vaultsErrors.ErrorVaultManagerNotRunning())
  @decorators.timed()
  public async *withVaultsG<T, TReturn, TNext>(
    vaultIds: Array<VaultId>,
    g: (...args: Array<Vault>) => AsyncGenerator<T, TReturn, TNext>,
    tran: DBTransaction,
    @decorators.context ctx: ContextTimed,
  ): AsyncGenerator<T, TReturn, TNext> {
    if (tran == null) {
      return yield* this.db.withTransactionG((tran) =>
        this.withVaultsG(vaultIds, g, tran),
      );
    }

    // Obtaining locks
    const vaultLocks: Array<LockRequest<RWLockWriter>> = vaultIds.map(
      (vaultId) => {
        return [vaultId.toString(), RWLockWriter, 'read'];
      },
    );
    // Running the function with locking
    const vaultThis = this;
    return yield* this.vaultLocks.withG(
      ...vaultLocks,
      async function* (): AsyncGenerator<T, TReturn, TNext> {
        // Getting the vaults while locked
        const vaults = await Promise.all(
          vaultIds.map(async (vaultId) => {
            return await vaultThis.getVault(vaultId, tran, ctx);
          }),
        );
        return yield* g(...vaults);
      },
    );
  }

  protected async setupKey(tran: DBTransaction): Promise<Buffer> {
    let key: Buffer | undefined;
    key = await tran.get([...this.vaultsDbPath, 'key'], true);
    // If the EFS already exists, but the key doesn't, then we have lost the key
    if (key == null && (await this.existsEFS())) {
      throw new vaultsErrors.ErrorVaultManagerKey();
    }
    if (key != null) {
      return key;
    }
    this.logger.info('Generating vaults key');
    key = keysUtils.generateKey();
    await tran.put([...this.vaultsDbPath, 'key'], key, true);
    return key;
  }

  protected async existsEFS(): Promise<boolean> {
    try {
      return (await this.fs.promises.readdir(this.efsPath)).length > 0;
    } catch (e) {
      if (e.code === 'ENOENT') {
        return false;
      }
      throw new vaultsErrors.ErrorVaultManagerEFS(e.message, {
        data: {
          errno: e.errno,
          syscall: e.syscall,
          code: e.code,
          path: e.path,
        },
        cause: e,
      });
    }
  }
}

export default VaultManager;
