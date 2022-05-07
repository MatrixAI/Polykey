import type { DB, DBTransaction, KeyPath, LevelPath } from '@matrixai/db';
import type {
  PermissionId,
  PermissionIdString,
  Permission,
  VaultActions,
} from './types';
import type { NodeId } from '../nodes/types';
import type { GestaltAction } from '../gestalts/types';
import type { VaultAction, VaultId } from '../vaults/types';
import type { Ref } from '../types';

import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { utils as dbUtils } from '@matrixai/db';
import { Lock, LockBox } from '@matrixai/async-locks';
import { withF } from '@matrixai/resources';
import * as aclUtils from './utils';
import * as aclErrors from './errors';

interface ACL extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new aclErrors.ErrorACLRunning(),
  new aclErrors.ErrorACLDestroyed(),
)
class ACL {
  static async createACL({
    db,
    logger = new Logger(this.name),
    fresh = false,
  }: {
    db: DB;
    logger?: Logger;
    fresh?: boolean;
  }): Promise<ACL> {
    logger.info(`Creating ${this.name}`);
    const acl = new ACL({ db, logger });
    await acl.start({ fresh });
    logger.info(`Created ${this.name}`);
    return acl;
  }

  protected logger: Logger;
  protected db: DB;
  protected locks: LockBox<Lock> = new LockBox();

  protected aclDbPath: LevelPath = [this.constructor.name];
  /**
   * Perms stores PermissionId -> Ref<Permission>
   */
  protected aclPermsDbPath: LevelPath = [this.constructor.name, 'perms'];
  /**
   * Nodes stores NodeId -> PermissionId
   */
  protected aclNodesDbPath: LevelPath = [this.constructor.name, 'nodes'];
  /**
   * Vaults stores VaultIdString -> Record<NodeId, null>
   * note that the NodeId in each record must be in their own unique gestalt
   * the NodeId in each record may be missing if it had been previously deleted
   */
  protected aclVaultsDbPath: LevelPath = [this.constructor.name, 'vaults'];

  // Lock across the usages of the DB
  // it makes sense to use
  // Symbol.for("key")
  // symbol for is found in teh global registry, if it doesn't exist, it is added to the global registry and returned
  // we can identify our locks by this
  // to do this, we should have a global lock system in case we want to LOCK across multiple domains
  // then other domains can also ensure those locks are being done as well
  // and it is a like a PATH for a specific domain
  // we can pass a keyPath
  // and we can lock a level path
  // well right now it can only be a keypath
  // this.acquireLock(key: Buffer)
  // and we identify our key buffer into a collection
  // we can do a collection struce
  // the symbols don't quite make sense, since we cannot attach a lock there anyway
  // so we have to do this as well
  // if it is not the DB problem we can just do this
  // this.acquireLock()

  // KeyPath | string | Buffer
  // locking an entire level is an interesting idea
  // then you could have a very specific locking system
  // No more single mutex
  // protected lock: Mutex = new Mutex();

  protected generatePermId: () => PermissionId;

  constructor({ db, logger }: { db: DB; logger: Logger }) {
    this.logger = logger;
    this.db = db;
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    if (fresh) {
      await this.db.clear(this.aclDbPath);
    }
    this.generatePermId = aclUtils.createPermIdGenerator();
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await this.db.clear(this.aclDbPath);
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async withTransactionF<T>(
    ...params: [
      ...keyPaths: Array<KeyPath>,
      f: (tran: DBTransaction) => Promise<T>,
    ]
  ): Promise<T> {
    const f = params.pop() as (tran: DBTransaction) => Promise<T>;
    const lockRequests = (params as Array<KeyPath>).map<
      [KeyPath, typeof Lock]
    >((keyPath) => [keyPath, Lock]);
    return withF(
      [this.db.transaction(), this.locks.lock(...lockRequests)],
      ([tran]) => f(tran),
    );
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async sameNodePerm(
    nodeId1: NodeId,
    nodeId2: NodeId,
    tran?: DBTransaction,
  ): Promise<boolean> {
    const nodeId1Path = [
      ...this.aclNodesDbPath,
      nodeId1.toBuffer(),
    ] as unknown as KeyPath;
    const nodeId2Path = [
      ...this.aclNodesDbPath,
      nodeId2.toBuffer(),
    ] as unknown as KeyPath;
    if (tran == null) {
      return this.withTransactionF(nodeId1Path, nodeId2Path, async (tran) =>
        this.sameNodePerm(nodeId1, nodeId2, tran),
      );
    }
    const permId1 = await tran.get(nodeId1Path, true);
    const permId2 = await tran.get(nodeId2Path, true);
    if (permId1 != null && permId2 != null) {
      return IdInternal.fromBuffer(permId1).equals(
        IdInternal.fromBuffer(permId2),
      );
    }
    return false;
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async getNodePerms(tran?: DBTransaction): Promise<Array<Record<NodeId, Permission>>> {
    return await this._transaction(async () => {
      const permIds: Record<
        PermissionIdString,
        Record<NodeId, Permission>
      > = {};
      for await (const o of this.aclNodesDb.createReadStream()) {
        const nodeId = IdInternal.fromBuffer<NodeId>((o as any).key);
        const data = (o as any).value as Buffer;
        const permId = IdInternal.fromBuffer<PermissionId>(
          await this.db.deserializeDecrypt(data, true),
        );
        let nodePerm: Record<NodeId, Permission>;
        if (permId in permIds) {
          nodePerm = permIds[permId];
          // Get the first existing perm object
          let perm: Permission;
          for (const nodeId_ in nodePerm) {
            perm = nodePerm[nodeId_];
            break;
          }
          // All perm objects are shared
          nodePerm[nodeId] = perm!;
        } else {
          const permRef = (await this.db.get(
            this.aclPermsDbDomain,
            permId.toBuffer(),
          )) as Ref<Permission>;
          nodePerm = { [nodeId]: permRef.object };
          permIds[permId] = nodePerm;
        }
      }
      const nodePerms_: Array<Record<NodeId, Permission>> = [];
      for (const permId in permIds) {
        nodePerms_.push(permIds[permId]);
      }
      return nodePerms_;
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async getVaultPerms(tran?: DBTransaction): Promise<
    Record<VaultId, Record<NodeId, Permission>>
  > {
    return await this._transaction(async () => {
      const vaultPerms: Record<VaultId, Record<NodeId, Permission>> = {};
      const ops: Array<DBOp> = [];
      for await (const o of this.aclVaultsDb.createReadStream()) {
        const vaultIdBuffer = (o as any).key as Buffer;
        const vaultId = IdInternal.fromBuffer<VaultId>(vaultIdBuffer);
        const data = (o as any).value as Buffer;
        const nodeIds = await this.db.deserializeDecrypt<Record<NodeId, null>>(
          data,
          false,
        );
        const nodePerm: Record<NodeId, Permission> = {};
        const nodeIdsGc: Set<NodeId> = new Set();
        for (const nodeIdString in nodeIds) {
          const nodeId: NodeId = IdInternal.fromString(nodeIdString);
          const permId = await this.db.get(
            this.aclNodesDbDomain,
            nodeId.toBuffer(),
            true,
          );
          if (permId == null) {
            // Invalid node id
            nodeIdsGc.add(nodeId);
            continue;
          }
          const permRef = (await this.db.get(
            this.aclPermsDbDomain,
            permId,
          )) as Ref<Permission>;
          if (!(vaultId in permRef.object.vaults)) {
            // Vault id is missing from the perm
            nodeIdsGc.add(nodeId);
            continue;
          }
          nodePerm[nodeId] = permRef.object;
        }
        if (nodeIdsGc.size > 0) {
          // Remove invalid node ids
          for (const nodeId of nodeIdsGc) {
            delete nodeIds[nodeId];
          }
          ops.push({
            type: 'put',
            domain: this.aclVaultsDbDomain,
            key: vaultId.toBuffer(),
            value: nodeIds,
          });
        }
        vaultPerms[vaultId] = nodePerm;
      }
      await this.db.batch(ops);
      return vaultPerms;
    });
  }

  /**
   * Gets the permission record for a given node id
   * Any node id is acceptable
   */
  @ready(new aclErrors.ErrorACLNotRunning())
  public async getNodePerm(
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<Permission | undefined> {
    const nodeIdPath = [
      ...this.aclNodesDbPath,
      nodeId.toBuffer(),
    ] as unknown as KeyPath;
    if (tran == null) {
      return this.withTransactionF(nodeIdPath, async (tran) =>
        this.getNodePerm(nodeId, tran),
      );
    }
    const permId = await tran.get(nodeIdPath, true);
    if (permId == null) {
      return;
    }
    const permIdPath = [
      ...this.aclPermsDbPath,
      permId,
    ] as unknown as KeyPath;
    const perm = (await tran.get(permIdPath)) as Ref<Permission>;
    return perm.object;
  }

  /**
   * Gets the record of node ids to permission for a given vault id
   * The node ids in the record each represent a unique gestalt
   * If there are no permissions, then an empty record is returned
   */
  @ready(new aclErrors.ErrorACLNotRunning())
  public async getVaultPerm(
    vaultId: VaultId,
    tran?: DBTransaction,
  ): Promise<Record<NodeId, Permission>> {
    const vaultIdPath = [
      ...this.aclVaultsDbPath,
      vaultId.toBuffer(),
    ] as unknown as KeyPath;
    if (tran == null) {
      return this.withTransactionF(vaultIdPath, async (tran) =>
        this.getVaultPerm(vaultId, tran),
      );
    }
    const nodeIds = await tran.get<Record<NodeId, null>>(
      vaultIdPath
    );
    if (nodeIds == null) {
      return {};
    }
    const perms: Record<NodeId, Permission> = {};
    const nodeIdsGc: Set<NodeId> = new Set();
    for (const nodeIdString in nodeIds) {
      const nodeId: NodeId = IdInternal.fromString(nodeIdString);
      const nodeIdPath = [
        ...this.aclNodesDbPath,
        nodeId.toBuffer(),
      ] as unknown as KeyPath;
      const permId = await tran.get(
        nodeIdPath,
        true,
      );
      if (permId == null) {
        // Invalid node id
        nodeIdsGc.add(nodeId);
        continue;
      }
      const permIdPath = [
        ...this.aclPermsDbPath,
        permId,
      ] as unknown as KeyPath;
      const permRef = (await tran.get(
        permIdPath,
      )) as Ref<Permission>;
      if (!(vaultId in permRef.object.vaults)) {
        // Vault id is missing from the perm
        nodeIdsGc.add(nodeId);
        continue;
      }
      perms[nodeId] = permRef.object;
    }
    if (nodeIdsGc.size > 0) {
      // Remove invalid node ids
      for (const nodeId of nodeIdsGc) {
        delete nodeIds[nodeId];
      }
      await tran.put(vaultIdPath, nodeIds);
    }
    return perms;
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setNodeAction(
    nodeId: NodeId,
    action: GestaltAction,
    tran?: DBTransaction,
  ): Promise<void> {
    const nodeIdPath = [
      ...this.aclNodesDbPath,
      nodeId.toBuffer(),
    ] as unknown as KeyPath;
    if (tran == null) {
      return this.withTransactionF(nodeIdPath, async (tran) =>
        this.setNodeAction(nodeId, action, tran),
      );
    }
    const permId = await tran.get(
      nodeIdPath,
      true,
    );
    if (permId == null) {
      const permId = this.generatePermId();
      const permRef = {
        count: 1,
        object: {
          gestalt: {
            [action]: null,
          },
          vaults: {},
        },
      };
      const permIdPath = [
        ...this.aclPermsDbPath,
        permId.toBuffer(),
      ] as unknown as KeyPath;
      await tran.put(permIdPath, permRef);
      await tran.put(nodeIdPath, permId.toBuffer());
    } else {
      const permIdPath = [
        ...this.aclPermsDbPath,
        permId,
      ] as unknown as KeyPath;
      const permRef = (await tran.get(
        permIdPath
      )) as Ref<Permission>;
      permRef.object.gestalt[action] = null;
      await tran.put(permIdPath, permRef);
    }
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetNodeAction(
    nodeId: NodeId,
    action: GestaltAction,
    tran?: DBTransaction,
  ): Promise<void> {
    const nodeIdPath = [
      ...this.aclNodesDbPath,
      nodeId.toBuffer(),
    ] as unknown as KeyPath;
    if (tran == null) {
      return this.withTransactionF(nodeIdPath, async (tran) =>
        this.unsetNodeAction(nodeId, action, tran),
      );
    }
    const permId = await tran.get(
      nodeIdPath,
      true,
    );
    if (permId == null) {
      return;
    }
    const permIdPath = [
      ...this.aclPermsDbPath,
      permId,
    ] as unknown as KeyPath;
    const permRef = (await tran.get(
      permIdPath
    )) as Ref<Permission>;
    delete permRef.object.gestalt[action];
    await tran.put(permIdPath, permRef);
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setVaultAction(
    vaultId: VaultId,
    nodeId: NodeId,
    action: VaultAction,
    tran?: DBTransaction,
  ): Promise<void> {
    const vaultIdPath = [
      ...this.aclVaultsDbPath,
      vaultId.toBuffer(),
    ] as unknown as KeyPath;
    const nodeIdPath = [
      ...this.aclNodesDbPath,
      nodeId.toBuffer(),
    ] as unknown as KeyPath;
    if (tran == null) {
      return this.withTransactionF(vaultIdPath, nodeIdPath, async (tran) =>
        this.setVaultAction(vaultId, nodeId, action, tran),
      );
    }
    const nodeIds =
      (await tran.get<Record<NodeId, null>>(
        vaultIdPath
      )) ?? {};
    const permId = await tran.get(
      nodeIdPath,
      true,
    );
    if (permId == null) {
      throw new aclErrors.ErrorACLNodeIdMissing();
    }
    nodeIds[nodeId] = null;
    const permIdPath = [
      ...this.aclPermsDbPath,
      permId,
    ] as unknown as KeyPath;
    const permRef = (await this.db.get(
      permIdPath,
    )) as Ref<Permission>;
    let actions: VaultActions | undefined = permRef.object.vaults[vaultId];
    if (actions == null) {
      actions = {};
      permRef.object.vaults[vaultId] = actions;
    }
    actions[action] = null;
    await tran.put(permIdPath, permRef);
    await tran.put(nodeIdPath, permId);
    await tran.put(vaultIdPath, nodeIds);
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetVaultAction(
    vaultId: VaultId,
    nodeId: NodeId,
    action: VaultAction,
    tran?: DBTransaction,
  ): Promise<void> {
    const vaultIdPath = [
      ...this.aclVaultsDbPath,
      vaultId.toBuffer(),
    ] as unknown as KeyPath;
    const nodeIdPath = [
      ...this.aclNodesDbPath,
      nodeId.toBuffer(),
    ] as unknown as KeyPath;
    if (tran == null) {
      return this.withTransactionF(vaultIdPath, nodeIdPath, async (tran) =>
        this.unsetVaultAction(vaultId, nodeId, action, tran),
      );
    }
    const nodeIds = await tran.get<Record<NodeId, null>>(
      vaultIdPath
    );
    if (nodeIds == null || !(nodeId in nodeIds)) {
      return;
    }
    const permId = await tran.get(
      nodeIdPath,
      true,
    );
    if (permId == null) {
      return;
    }
    const permIdPath = [
      ...this.aclPermsDbPath,
      permId,
    ] as unknown as KeyPath;
    const permRef = (await tran.get(
      permIdPath
    )) as Ref<Permission>;
    const actions: VaultActions | undefined = permRef.object.vaults[vaultId];
    if (actions == null) {
      return;
    }
    delete actions[action];
    await tran.put(permIdPath, permRef);
  }

  /**
   * Sets an array of node ids to a new permission record
   * This is intended for completely new gestalts
   * Or for gestalt splitting.
   */
  @ready(new aclErrors.ErrorACLNotRunning())
  public async setNodesPerm(
    nodeIds: Array<NodeId>,
    perm: Permission,
    tran?: DBTransaction,
  ): Promise<void> {
    const nodeIdPaths = nodeIds.map((nodeId) => [
      ...this.aclNodesDbPath,
      nodeId.toBuffer(),
    ] as unknown as KeyPath);
    if (tran == null) {
      return this.withTransactionF(...nodeIdPaths, async (tran) =>
        this.setNodesPerm(nodeIds, perm, tran),
      );
    }
    const permIdCounts: Record<PermissionIdString, number> = {};
    for (const nodeIdPath of nodeIdPaths) {
      const permIdBuffer = await tran.get(
        nodeIdPath,
        true,
      );
      if (permIdBuffer == null) {
        continue;
      }
      const permId = IdInternal.fromBuffer<PermissionId>(permIdBuffer);
      permIdCounts[permId] = (permIdCounts[permId] ?? 0) + 1;
    }
    for (const permIdString in permIdCounts) {
      const permId = IdInternal.fromString<PermissionId>(permIdString);
      const permIdPath = [
        ...this.aclPermsDbPath,
        permId.toBuffer(),
      ] as unknown as KeyPath;
      const permRef = (await tran.get(
        permIdPath,
      )) as Ref<Permission>;
      permRef.count = permRef.count - permIdCounts[permId];
      if (permRef.count === 0) {
        await tran.del(permIdPath);
      } else {
        await tran.put(permIdPath, permRef);
      }
    }
    const permId = this.generatePermId();
    const permRef = {
      count: nodeIds.length,
      object: perm,
    };
    const permIdPath = [
      ...this.aclPermsDbPath,
      permId.toBuffer(),
    ] as unknown as KeyPath;
    await tran.put(permIdPath, permRef);
    for (const nodeIdPath of nodeIdPaths) {
      await tran.put(nodeIdPath, permId.toBuffer());
    }
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setNodePerm(
    nodeId: NodeId,
    perm: Permission,
    tran?: DBTransaction,
  ): Promise<void> {
    const nodeIdPath = [
      ...this.aclNodesDbPath,
      nodeId.toBuffer(),
    ] as unknown as KeyPath;
    if (tran == null) {
      return this.withTransactionF(nodeIdPath, async (tran) =>
        this.setNodePerm(nodeId, perm, tran),
      );
    }
    const permId = await tran.get(
      nodeIdPath,
      true,
    );
    if (permId == null) {
      const permId = this.generatePermId();
      const permRef = {
        count: 1,
        object: perm,
      };
      const permIdPath = [
        ...this.aclPermsDbPath,
        permId.toBuffer(),
      ] as unknown as KeyPath;
      await tran.put(permIdPath, permRef);
      await tran.put(nodeIdPath, permId.toBuffer());
    } else {
      // The entire gestalt's perm gets replaced, therefore the count stays the same
      const permIdPath = [
        ...this.aclPermsDbPath,
        permId,
      ] as unknown as KeyPath;
      const permRef = (await tran.get(
        permIdPath,
      )) as Ref<Permission>;
      permRef.object = perm;
      await tran.put(permIdPath, permRef);
    }
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetNodePerm(
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<void> {
    const nodeIdPath = [
      ...this.aclNodesDbPath,
      nodeId.toBuffer(),
    ] as unknown as KeyPath;
    if (tran == null) {
      return this.withTransactionF(nodeIdPath, async (tran) =>
        this.unsetNodePerm(nodeId, tran),
      );
    }
    const permId = await tran.get(
      nodeIdPath,
      true,
    );
    if (permId == null) {
      return;
    }
    const permIdPath = [
      ...this.aclNodesDbPath,
      permId,
    ] as unknown as KeyPath;
    const permRef = (await tran.get(
      permIdPath,
    )) as Ref<Permission>;
    const count = --permRef.count;
    if (count === 0) {
      await tran.del(permIdPath);
    } else {
      await tran.put(permIdPath, permRef);
    }
    await tran.del(nodeIdPath);
    // We do not remove the node id from the vaults
    // they can be removed later upon inspection
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetVaultPerms(
    vaultId: VaultId,
    tran?: DBTransaction,
  ): Promise<void> {
    const vaultIdPath = [
      ...this.aclVaultsDbPath,
      vaultId.toBuffer(),
    ] as unknown as KeyPath;
    if (tran == null) {
      return this.withTransactionF(vaultIdPath, async (tran) =>
        this.unsetVaultPerms(vaultId, tran),
      );
    }
    const nodeIds = await tran.get<Record<NodeId, null>>(
      vaultIdPath,
    );
    if (nodeIds == null) {
      return;
    }
    for (const nodeIdString in nodeIds) {
      const nodeId: NodeId = IdInternal.fromString(nodeIdString);
      const nodeIdPath = [
        ...this.aclNodesDbPath,
        nodeId.toBuffer(),
      ] as unknown as KeyPath;
      const permId = await tran.get(
        nodeIdPath,
        true,
      );
      // Skip if the nodeId doesn't exist
      // this means that it previously been removed
      if (permId == null) {
        continue;
      }
      const permIdPath = [
        ...this.aclPermsDbPath,
        permId,
      ] as unknown as KeyPath;
      const perm = (await tran.get(
        permIdPath,
      )) as Ref<Permission>;
      delete perm.object.vaults[vaultId];
      await tran.put(permIdPath, perm);
    }
    await tran.del(vaultIdPath);
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async joinNodePerm(
    nodeId: NodeId,
    nodeIdsJoin: Array<NodeId>,
    perm?: Permission,
    tran?: DBTransaction,
  ): Promise<void> {
    await this._transaction(async () => {
      const ops = await this.joinNodePermOps(nodeId, nodeIdsJoin, perm);
      await this.db.batch(ops);
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async joinNodePermOps(
    nodeId: NodeId,
    nodeIdsJoin: Array<NodeId>,
    perm?: Permission,
    tran?: DBTransaction,
  ): Promise<Array<DBOp>> {
    const permId = await this.db.get(
      this.aclNodesDbDomain,
      nodeId.toBuffer(),
      true,
    );
    if (permId == null) {
      throw new aclErrors.ErrorACLNodeIdMissing();
    }
    const ops: Array<DBOp> = [];
    const permRef = (await this.db.get(
      this.aclPermsDbDomain,
      permId,
    )) as Ref<Permission>;
    // Optionally replace the permission record for the target
    if (perm != null) {
      permRef.object = perm;
    }
    for (const nodeIdJoin of nodeIdsJoin) {
      const permIdJoin = await this.db.get(
        this.aclNodesDbDomain,
        nodeIdJoin.toBuffer(),
        true,
      );
      if (permIdJoin === permId) {
        continue;
      }
      ++permRef.count;
      if (permIdJoin != null) {
        const permJoin = (await this.db.get(
          this.aclPermsDbDomain,
          permIdJoin,
        )) as Ref<Permission>;
        --permJoin.count;
        if (permJoin.count === 0) {
          ops.push({
            type: 'del',
            domain: this.aclPermsDbDomain,
            key: permIdJoin,
          });
        } else {
          ops.push({
            type: 'put',
            domain: this.aclPermsDbDomain,
            key: permIdJoin,
            value: permJoin,
          });
        }
      }
      ops.push({
        type: 'put',
        domain: this.aclNodesDbDomain,
        key: nodeIdJoin.toBuffer(),
        value: permId,
        raw: true,
      });
    }
    ops.push({
      type: 'put',
      domain: this.aclPermsDbDomain,
      key: permId,
      value: permRef,
    });
    return ops;
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async joinVaultPerms(
    vaultId: VaultId,
    vaultIdsJoin: Array<VaultId>,
    tran?: DBTransaction,
  ): Promise<void> {
    await this._transaction(async () => {
      const ops = await this.joinVaultPermsOps(vaultId, vaultIdsJoin);
      await this.db.batch(ops);
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  private async joinVaultPermsOps(
    vaultId: VaultId,
    vaultIdsJoin: Array<VaultId>,
    tran: DBTransaction,
  ): Promise<Array<DBOp>> {
    const nodeIds = await this.db.get<Record<NodeId, null>>(
      this.aclVaultsDbDomain,
      vaultId.toBuffer(),
    );
    if (nodeIds == null) {
      throw new aclErrors.ErrorACLVaultIdMissing();
    }
    const ops: Array<DBOp> = [];
    const nodeIdsGc: Set<NodeId> = new Set();
    for (const nodeIdString in nodeIds) {
      const nodeId: NodeId = IdInternal.fromString(nodeIdString);
      const permId = await this.db.get(
        this.aclNodesDbDomain,
        nodeId.toBuffer(),
        true,
      );
      if (permId == null) {
        // Invalid node id
        nodeIdsGc.add(nodeId);
        continue;
      }
      const permRef = (await this.db.get(
        this.aclPermsDbDomain,
        permId,
      )) as Ref<Permission>;
      if (!(vaultId in permRef.object.vaults)) {
        // Vault id is missing from the perm
        nodeIdsGc.add(nodeId);
        continue;
      }
      const vaultActions: VaultActions | undefined =
        permRef.object.vaults[vaultId];
      for (const vaultIdJoin of vaultIdsJoin) {
        permRef.object.vaults[vaultIdJoin] = vaultActions;
      }
      ops.push({
        type: 'put',
        domain: this.aclPermsDbDomain,
        key: permId,
        value: permRef,
      });
    }
    for (const vaultIdJoin of vaultIdsJoin) {
      ops.push({
        type: 'put',
        domain: this.aclVaultsDbDomain,
        key: vaultIdJoin.toBuffer(),
        value: nodeIds,
      });
    }
    if (nodeIdsGc.size > 0) {
      // Remove invalid node ids
      for (const nodeId of nodeIdsGc) {
        delete nodeIds[nodeId];
      }
      ops.push({
        type: 'put',
        domain: this.aclVaultsDbDomain,
        key: vaultId.toBuffer(),
        value: nodeIds,
      });
    }
    return ops;
  }
}

export default ACL;
