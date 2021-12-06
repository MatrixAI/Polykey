import type { Permission, VaultActions, PermissionIdString } from './types';
import type { DB, DBLevel, DBOp } from '@matrixai/db';
import type { NodeId } from '../nodes/types';
import type { GestaltAction } from '../gestalts/types';
import type { VaultAction, VaultId } from '../vaults/types';
import type { Ref } from '../types';

import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import { utils as idUtils } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as aclUtils from './utils';
import * as aclErrors from './errors';
import { makePermissionId } from './utils';

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
  protected aclDbDomain: string = this.constructor.name;
  protected aclPermsDbDomain: Array<string> = [this.aclDbDomain, 'perms'];
  protected aclNodesDbDomain: Array<string> = [this.aclDbDomain, 'nodes'];
  protected aclVaultsDbDomain: Array<string> = [this.aclDbDomain, 'vaults'];
  protected aclDb: DBLevel;
  protected aclPermsDb: DBLevel;
  protected aclNodesDb: DBLevel;
  protected aclVaultsDb: DBLevel;
  protected lock: Mutex = new Mutex();

  constructor({ db, logger }: { db: DB; logger: Logger }) {
    this.logger = logger;
    this.db = db;
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  public async start({
    fresh = false,
  }: {
    fresh?: boolean;
  } = {}): Promise<void> {
    this.logger.info(`Starting ${this.constructor.name}`);
    const aclDb = await this.db.level(this.aclDbDomain);
    // Perms stores PermissionId -> Ref<Permission>
    const aclPermsDb = await this.db.level(this.aclPermsDbDomain[1], aclDb);
    // Nodes stores NodeId -> PermissionId
    const aclNodesDb = await this.db.level(this.aclNodesDbDomain[1], aclDb);
    // Vaults stores VaultIdString -> Record<NodeId, null>
    // note that the NodeId in each array must be in their own unique gestalt
    // the NodeId in each array may be missing if it had been previously deleted
    const aclVaultsDb = await this.db.level(this.aclVaultsDbDomain[1], aclDb);
    if (fresh) {
      await aclDb.clear();
    }
    this.aclDb = aclDb;
    this.aclPermsDb = aclPermsDb;
    this.aclNodesDb = aclNodesDb;
    this.aclVaultsDb = aclVaultsDb;
    this.logger.info(`Started ${this.constructor.name}`);
  }

  public async stop(): Promise<void> {
    this.logger.info(`Stopping ${this.constructor.name}`);
    this.logger.info(`Stopped ${this.constructor.name}`);
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    const aclDb = await this.db.level(this.aclDbDomain);
    await aclDb.clear();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  @ready(new aclErrors.ErrorACLNotRunning())
  public async transaction<T>(f: (acl: ACL) => Promise<T>): Promise<T> {
    const release = await this.lock.acquire();
    try {
      return await f(this);
    } finally {
      release();
    }
  }

  /**
   * Transaction wrapper that will not lock if the operation was executed
   * within a transaction context
   */
  @ready(new aclErrors.ErrorACLNotRunning())
  public async _transaction<T>(f: () => Promise<T>): Promise<T> {
    if (this.lock.isLocked()) {
      return await f();
    } else {
      return await this.transaction(f);
    }
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async sameNodePerm(
    nodeId1: NodeId,
    nodeId2: NodeId,
  ): Promise<boolean> {
    return await this._transaction(async () => {
      const permId1 = await this.db.get(this.aclNodesDbDomain, nodeId1, true);
      const permId2 = await this.db.get(this.aclNodesDbDomain, nodeId2, true);
      if (permId1 != null && permId2 != null && permId1 === permId2) {
        return true;
      }
      return false;
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async getNodePerms(): Promise<Array<Record<NodeId, Permission>>> {
    return await this._transaction(async () => {
      const permIds: Record<
        PermissionIdString,
        Record<NodeId, Permission>
      > = {};
      for await (const o of this.aclNodesDb.createReadStream()) {
        const nodeId = (o as any).key as NodeId;
        const data = (o as any).value as Buffer;
        const permId = makePermissionId(
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
            idUtils.toBuffer(permId),
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
  public async getVaultPerms(): Promise<
    Record<VaultId, Record<NodeId, Permission>>
  > {
    return await this._transaction(async () => {
      const vaultPerms: Record<VaultId, Record<NodeId, Permission>> = {};
      const ops: Array<DBOp> = [];
      for await (const o of this.aclVaultsDb.createReadStream()) {
        const vaultId = (o as any).key as VaultId;
        const data = (o as any).value as Buffer;
        const nodeIds = await this.db.deserializeDecrypt<Record<NodeId, null>>(
          data,
          false,
        );
        const nodePerm: Record<NodeId, Permission> = {};
        const nodeIdsGc: Set<NodeId> = new Set();
        for (const nodeId in nodeIds) {
          const permId = await this.db.get(
            this.aclNodesDbDomain,
            nodeId as NodeId,
            true,
          );
          if (permId == null) {
            // Invalid node id
            nodeIdsGc.add(nodeId as NodeId);
            continue;
          }
          const permRef = (await this.db.get(
            this.aclPermsDbDomain,
            permId,
          )) as Ref<Permission>;
          if (!(vaultId in permRef.object.vaults)) {
            // Vault id is missing from the perm
            nodeIdsGc.add(nodeId as NodeId);
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
            key: idUtils.toBuffer(vaultId),
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
  public async getNodePerm(nodeId: NodeId): Promise<Permission | undefined> {
    return await this._transaction(async () => {
      const permId = await this.db.get(this.aclNodesDbDomain, nodeId, true);
      if (permId == null) {
        return;
      }
      const perm = (await this.db.get(
        this.aclPermsDbDomain,
        permId,
      )) as Ref<Permission>;
      return perm.object;
    });
  }

  /**
   * Gets the record of node ids to permission for a given vault id
   * The node ids in the record each represent a unique gestalt
   * If there are no permissions, then an empty record is returned
   */
  @ready(new aclErrors.ErrorACLNotRunning())
  public async getVaultPerm(
    vaultId: VaultId,
  ): Promise<Record<NodeId, Permission>> {
    return await this._transaction(async () => {
      const nodeIds = await this.db.get<Record<NodeId, null>>(
        this.aclVaultsDbDomain,
        idUtils.toBuffer(vaultId),
      );
      if (nodeIds == null) {
        return {};
      }
      const perms: Record<NodeId, Permission> = {};
      const nodeIdsGc: Set<NodeId> = new Set();
      for (const nodeId in nodeIds) {
        const permId = await this.db.get(
          this.aclNodesDbDomain,
          nodeId as NodeId,
          true,
        );
        if (permId == null) {
          // Invalid node id
          nodeIdsGc.add(nodeId as NodeId);
          continue;
        }
        const permRef = (await this.db.get(
          this.aclPermsDbDomain,
          permId,
        )) as Ref<Permission>;
        if (!(vaultId in permRef.object.vaults)) {
          // Vault id is missing from the perm
          nodeIdsGc.add(nodeId as NodeId);
          continue;
        }
        perms[nodeId] = permRef.object;
      }
      if (nodeIdsGc.size > 0) {
        // Remove invalid node ids
        for (const nodeId of nodeIdsGc) {
          delete nodeIds[nodeId];
        }
        await this.db.put(
          this.aclVaultsDbDomain,
          idUtils.toBuffer(vaultId),
          nodeIds,
        );
      }
      return perms;
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setNodeAction(
    nodeId: NodeId,
    action: GestaltAction,
  ): Promise<void> {
    return await this._transaction(async () => {
      const permId = await this.db.get(this.aclNodesDbDomain, nodeId, true);
      const ops: Array<DBOp> = [];
      if (permId == null) {
        const permId = await aclUtils.generatePermId();
        const permRef = {
          count: 1,
          object: {
            gestalt: {
              [action]: null,
            },
            vaults: {},
          },
        };
        ops.push(
          {
            type: 'put',
            domain: this.aclPermsDbDomain,
            key: idUtils.toBuffer(permId),
            value: permRef,
          },
          {
            type: 'put',
            domain: this.aclNodesDbDomain,
            key: nodeId,
            value: idUtils.toBuffer(permId),
            raw: true,
          },
        );
      } else {
        const permRef = (await this.db.get(
          this.aclPermsDbDomain,
          permId,
        )) as Ref<Permission>;
        permRef.object.gestalt[action] = null;
        ops.push({
          type: 'put',
          domain: this.aclPermsDbDomain,
          key: permId,
          value: permRef,
        });
      }
      await this.db.batch(ops);
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetNodeAction(
    nodeId: NodeId,
    action: GestaltAction,
  ): Promise<void> {
    return await this._transaction(async () => {
      const permId = await this.db.get(this.aclNodesDbDomain, nodeId, true);
      if (permId == null) {
        return;
      }
      const permRef = (await this.db.get(
        this.aclPermsDbDomain,
        permId,
      )) as Ref<Permission>;
      delete permRef.object.gestalt[action];
      await this.db.put(this.aclPermsDbDomain, permId, permRef);
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setVaultAction(
    vaultId: VaultId,
    nodeId: NodeId,
    action: VaultAction,
  ): Promise<void> {
    return await this._transaction(async () => {
      const nodeIds =
        (await this.db.get<Record<NodeId, null>>(
          this.aclVaultsDbDomain,
          idUtils.toBuffer(vaultId),
        )) ?? {};
      const permId = await this.db.get(this.aclNodesDbDomain, nodeId, true);
      if (permId == null) {
        throw new aclErrors.ErrorACLNodeIdMissing();
      }
      nodeIds[nodeId] = null;
      const permRef = (await this.db.get(
        this.aclPermsDbDomain,
        permId,
      )) as Ref<Permission>;
      let actions: VaultActions | undefined = permRef.object.vaults[vaultId];
      if (actions == null) {
        actions = {};
        permRef.object.vaults[vaultId] = actions;
      }
      actions[action] = null;
      const ops: Array<DBOp> = [
        {
          type: 'put',
          domain: this.aclPermsDbDomain,
          key: permId,
          value: permRef,
        },
        {
          type: 'put',
          domain: this.aclNodesDbDomain,
          key: nodeId,
          value: permId,
          raw: true,
        },
        {
          type: 'put',
          domain: this.aclVaultsDbDomain,
          key: idUtils.toBuffer(vaultId),
          value: nodeIds,
        },
      ];
      await this.db.batch(ops);
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetVaultAction(
    vaultId: VaultId,
    nodeId: NodeId,
    action: VaultAction,
  ): Promise<void> {
    await this._transaction(async () => {
      const nodeIds = await this.db.get<Record<NodeId, null>>(
        this.aclVaultsDbDomain,
        idUtils.toBuffer(vaultId),
      );
      if (nodeIds == null || !(nodeId in nodeIds)) {
        return;
      }
      const permId = await this.db.get(this.aclNodesDbDomain, nodeId, true);
      if (permId == null) {
        return;
      }
      const permRef = (await this.db.get(
        this.aclPermsDbDomain,
        permId,
      )) as Ref<Permission>;
      const actions: VaultActions | undefined = permRef.object.vaults[vaultId];
      if (actions == null) {
        return;
      }
      delete actions[action];
      await this.db.put(this.aclPermsDbDomain, permId, permRef);
    });
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
  ): Promise<void> {
    await this._transaction(async () => {
      const ops = await this.setNodesPermOps(nodeIds, perm);
      await this.db.batch(ops);
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setNodesPermOps(
    nodeIds: Array<NodeId>,
    perm: Permission,
  ): Promise<Array<DBOp>> {
    const ops: Array<DBOp> = [];
    const permIdCounts: Record<PermissionIdString, number> = {};
    for (const nodeId of nodeIds) {
      const permIdBuffer = await this.db.get(
        this.aclNodesDbDomain,
        nodeId,
        true,
      );
      if (permIdBuffer == null) {
        continue;
      }
      const permId = makePermissionId(permIdBuffer);
      permIdCounts[permId] = (permIdCounts[permId] ?? 0) + 1;
    }
    for (const permIdString in permIdCounts) {
      const permId = makePermissionId(idUtils.fromString(permIdString));
      const permRef = (await this.db.get(
        this.aclPermsDbDomain,
        idUtils.toBuffer(permId),
      )) as Ref<Permission>;
      permRef.count = permRef.count - permIdCounts[permId];
      if (permRef.count === 0) {
        ops.push({
          type: 'del',
          domain: this.aclPermsDbDomain,
          key: idUtils.toBuffer(permId),
        });
      } else {
        ops.push({
          type: 'put',
          domain: this.aclPermsDbDomain,
          key: idUtils.toBuffer(permId),
          value: permRef,
        });
      }
    }
    const permId = await aclUtils.generatePermId();
    const permRef = {
      count: nodeIds.length,
      object: perm,
    };
    ops.push({
      domain: this.aclPermsDbDomain,
      type: 'put',
      key: idUtils.toBuffer(permId),
      value: permRef,
    });
    for (const nodeId of nodeIds) {
      ops.push({
        domain: this.aclNodesDbDomain,
        type: 'put',
        key: nodeId,
        value: idUtils.toBuffer(permId),
        raw: true,
      });
    }
    return ops;
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setNodePerm(nodeId: NodeId, perm: Permission): Promise<void> {
    await this._transaction(async () => {
      const ops = await this.setNodePermOps(nodeId, perm);
      await this.db.batch(ops);
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setNodePermOps(
    nodeId: NodeId,
    perm: Permission,
  ): Promise<Array<DBOp>> {
    const permId = await this.db.get(this.aclNodesDbDomain, nodeId, true);
    const ops: Array<DBOp> = [];
    if (permId == null) {
      const permId = await aclUtils.generatePermId();
      const permRef = {
        count: 1,
        object: perm,
      };
      ops.push(
        {
          type: 'put',
          domain: this.aclPermsDbDomain,
          key: idUtils.toBuffer(permId),
          value: permRef,
        },
        {
          type: 'put',
          domain: this.aclNodesDbDomain,
          key: nodeId,
          value: idUtils.toBuffer(permId),
          raw: true,
        },
      );
    } else {
      // The entire gestalt's perm gets replaced, therefore the count stays the same
      const permRef = (await this.db.get(
        this.aclPermsDbDomain,
        permId,
      )) as Ref<Permission>;
      permRef.object = perm;
      ops.push({
        type: 'put',
        domain: this.aclPermsDbDomain,
        key: permId,
        value: permRef,
      });
    }
    return ops;
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetNodePerm(nodeId: NodeId): Promise<void> {
    await this._transaction(async () => {
      const ops = await this.unsetNodePermOps(nodeId);
      await this.db.batch(ops);
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetNodePermOps(nodeId: NodeId): Promise<Array<DBOp>> {
    const permId = await this.db.get(this.aclNodesDbDomain, nodeId, true);
    if (permId == null) {
      return [];
    }
    const ops: Array<DBOp> = [];
    const permRef = (await this.db.get(
      this.aclPermsDbDomain,
      permId,
    )) as Ref<Permission>;
    const count = --permRef.count;
    if (count === 0) {
      ops.push({
        type: 'del',
        domain: this.aclPermsDbDomain,
        key: permId,
      });
    } else {
      ops.push({
        type: 'put',
        domain: this.aclPermsDbDomain,
        key: permId,
        value: permRef,
      });
    }
    ops.push({
      type: 'del',
      domain: this.aclNodesDbDomain,
      key: nodeId,
    });
    // We do not remove the node id from the vaults
    // they can be removed later upon inspection
    return ops;
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetVaultPerms(vaultId: VaultId): Promise<void> {
    await this._transaction(async () => {
      const nodeIds = await this.db.get<Record<NodeId, null>>(
        this.aclVaultsDbDomain,
        idUtils.toBuffer(vaultId),
      );
      if (nodeIds == null) {
        return;
      }
      const ops: Array<DBOp> = [];
      for (const nodeId in nodeIds) {
        const permId = await this.db.get(
          this.aclNodesDbDomain,
          nodeId as NodeId,
          true,
        );
        // Skip if the nodeId doesn't exist
        // this means that it previously been removed
        if (permId == null) {
          continue;
        }
        const perm = (await this.db.get(
          this.aclPermsDbDomain,
          permId,
        )) as Ref<Permission>;
        delete perm.object.vaults[vaultId];
        ops.push({
          type: 'put',
          domain: this.aclPermsDbDomain,
          key: permId,
          value: perm,
        });
      }
      ops.push({
        type: 'del',
        domain: this.aclVaultsDbDomain,
        key: idUtils.toBuffer(vaultId),
      });
      await this.db.batch(ops);
    });
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async joinNodePerm(
    nodeId: NodeId,
    nodeIdsJoin: Array<NodeId>,
    perm?: Permission,
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
  ): Promise<Array<DBOp>> {
    const permId = await this.db.get(this.aclNodesDbDomain, nodeId, true);
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
        nodeIdJoin,
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
        key: nodeIdJoin,
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
  ): Promise<Array<DBOp>> {
    const nodeIds = await this.db.get<Record<NodeId, null>>(
      this.aclVaultsDbDomain,
      idUtils.toBuffer(vaultId),
    );
    if (nodeIds == null) {
      throw new aclErrors.ErrorACLVaultIdMissing();
    }
    const ops: Array<DBOp> = [];
    const nodeIdsGc: Set<NodeId> = new Set();
    for (const nodeId in nodeIds) {
      const permId = await this.db.get(
        this.aclNodesDbDomain,
        nodeId as NodeId,
        true,
      );
      if (permId == null) {
        // Invalid node id
        nodeIdsGc.add(nodeId as NodeId);
        continue;
      }
      const permRef = (await this.db.get(
        this.aclPermsDbDomain,
        permId,
      )) as Ref<Permission>;
      if (!(vaultId in permRef.object.vaults)) {
        // Vault id is missing from the perm
        nodeIdsGc.add(nodeId as NodeId);
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
        key: idUtils.toBuffer(vaultIdJoin),
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
        key: idUtils.toBuffer(vaultId),
        value: nodeIds,
      });
    }
    return ops;
  }
}

export default ACL;
