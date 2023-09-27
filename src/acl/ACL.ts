import type { DB, DBTransaction, LevelPath } from '@matrixai/db';
import type {
  PermissionId,
  PermissionIdString,
  Permission,
  VaultActions,
} from './types';
import type { NodeId } from '../ids/types';
import type { GestaltAction } from '../gestalts/types';
import type { VaultAction, VaultId } from '../vaults/types';
import type { Ref } from '../types';
import Logger from '@matrixai/logger';
import { IdInternal } from '@matrixai/id';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import * as aclUtils from './utils';
import * as aclErrors from './errors';
import * as events from './events';

interface ACL extends CreateDestroyStartStop {}
@CreateDestroyStartStop(
  new aclErrors.ErrorACLRunning(),
  new aclErrors.ErrorACLDestroyed(),
  {
    eventStart: events.EventACLStart,
    eventStarted: events.EventACLStarted,
    eventStop: events.EventACLStop,
    eventStopped: events.EventACLStopped,
    eventDestroy: events.EventACLDestroy,
    eventDestroyed: events.EventACLDestroyed,
  },
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
    const acl = new this({ db, logger });
    await acl.start({ fresh });
    logger.info(`Created ${this.name}`);
    return acl;
  }

  protected logger: Logger;
  protected db: DB;

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
  public async sameNodePerm(
    nodeId1: NodeId,
    nodeId2: NodeId,
    tran?: DBTransaction,
  ): Promise<boolean> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.sameNodePerm(nodeId1, nodeId2, tran),
      );
    }
    const permId1 = await tran.get(
      [...this.aclNodesDbPath, nodeId1.toBuffer()],
      true,
    );
    const permId2 = await tran.get(
      [...this.aclNodesDbPath, nodeId2.toBuffer()],
      true,
    );
    if (permId1 != null && permId2 != null) {
      return IdInternal.fromBuffer(permId1).equals(
        IdInternal.fromBuffer(permId2),
      );
    }
    return false;
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async getNodePerms(
    tran?: DBTransaction,
  ): Promise<Array<Record<NodeId, Permission>>> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getNodePerms(tran));
    }
    const permIds: Record<PermissionIdString, Record<NodeId, Permission>> = {};
    for await (const [keyPath, value] of tran.iterator([
      ...this.aclNodesDbPath,
    ])) {
      const key = keyPath[0] as Buffer;
      const nodeId = IdInternal.fromBuffer<NodeId>(key);
      const permId = IdInternal.fromBuffer<PermissionId>(value);
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
        const permRef = (await tran.get(
          [...this.aclPermsDbPath, permId.toBuffer()],
          false,
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
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async getVaultPerms(
    tran?: DBTransaction,
  ): Promise<Record<VaultId, Record<NodeId, Permission>>> {
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getVaultPerms(tran));
    }
    const vaultPerms: Record<VaultId, Record<NodeId, Permission>> = {};
    for await (const [keyPath, nodeIds] of tran.iterator<Record<NodeId, null>>(
      [...this.aclVaultsDbPath],
      { valueAsBuffer: false },
    )) {
      const key = keyPath[0] as Buffer;
      const vaultId = IdInternal.fromBuffer<VaultId>(key);
      const nodePerm: Record<NodeId, Permission> = {};
      const nodeIdsGc: Set<NodeId> = new Set();
      for (const nodeIdString in nodeIds) {
        const nodeId: NodeId = IdInternal.fromString(nodeIdString);
        const permId = await tran.get(
          [...this.aclNodesDbPath, nodeId.toBuffer()],
          true,
        );
        if (permId == null) {
          // Invalid node id
          nodeIdsGc.add(nodeId);
          continue;
        }
        const permRef = (await tran.get(
          [...this.aclPermsDbPath, permId],
          false,
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
        await tran.put([...this.aclVaultsDbPath, vaultId.toBuffer()], nodeIds);
      }
      vaultPerms[vaultId] = nodePerm;
    }
    return vaultPerms;
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
    if (tran == null) {
      return this.db.withTransactionF((tran) => this.getNodePerm(nodeId, tran));
    }
    const permId = await tran.get(
      [...this.aclNodesDbPath, nodeId.toBuffer()],
      true,
    );
    if (permId == null) {
      return;
    }
    const perm = (await tran.get(
      [...this.aclPermsDbPath, permId],
      false,
    )) as Ref<Permission>;
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
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.getVaultPerm(vaultId, tran),
      );
    }
    const nodeIds = await tran.get<Record<NodeId, null>>(
      [...this.aclVaultsDbPath, vaultId.toBuffer()],
      false,
    );
    if (nodeIds == null) {
      return {};
    }
    const perms: Record<NodeId, Permission> = {};
    const nodeIdsGc: Set<NodeId> = new Set();
    for (const nodeIdString in nodeIds) {
      const nodeId: NodeId = IdInternal.fromString(nodeIdString);
      const permId = await tran.get(
        [...this.aclNodesDbPath, nodeId.toBuffer()],
        true,
      );
      if (permId == null) {
        // Invalid node id
        nodeIdsGc.add(nodeId);
        continue;
      }
      const permRef = (await tran.get(
        [...this.aclPermsDbPath, permId],
        false,
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
      await tran.put(
        [...this.aclVaultsDbPath, vaultId.toBuffer()],
        nodeIds,
        false,
      );
    }
    return perms;
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setNodeAction(
    nodeId: NodeId,
    action: GestaltAction,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setNodeAction(nodeId, action, tran),
      );
    }
    const permId = await tran.get(
      [...this.aclNodesDbPath, nodeId.toBuffer()],
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
      await tran.put(
        [...this.aclPermsDbPath, permId.toBuffer()],
        permRef,
        false,
      );
      await tran.put(
        [...this.aclNodesDbPath, nodeId.toBuffer()],
        permId.toBuffer(),
        true,
      );
    } else {
      const permRef = (await tran.get(
        [...this.aclPermsDbPath, permId],
        false,
      )) as Ref<Permission>;
      permRef.object.gestalt[action] = null;
      await tran.put([...this.aclPermsDbPath, permId], permRef, false);
    }
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetNodeAction(
    nodeId: NodeId,
    action: GestaltAction,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unsetNodeAction(nodeId, action, tran),
      );
    }
    const permId = await tran.get(
      [...this.aclNodesDbPath, nodeId.toBuffer()],
      true,
    );
    if (permId == null) {
      return;
    }
    const permRef = (await tran.get(
      [...this.aclPermsDbPath, permId],
      false,
    )) as Ref<Permission>;
    delete permRef.object.gestalt[action];
    await tran.put([...this.aclPermsDbPath, permId], permRef, false);
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setVaultAction(
    vaultId: VaultId,
    nodeId: NodeId,
    action: VaultAction,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setVaultAction(vaultId, nodeId, action, tran),
      );
    }
    const nodeIds =
      (await tran.get<Record<NodeId, null>>(
        [...this.aclVaultsDbPath, vaultId.toBuffer()],
        false,
      )) ?? {};
    const permId = await tran.get(
      [...this.aclNodesDbPath, nodeId.toBuffer()],
      true,
    );
    if (permId == null) {
      throw new aclErrors.ErrorACLNodeIdMissing();
    }
    nodeIds[nodeId] = null;
    const permRef = (await tran.get(
      [...this.aclPermsDbPath, permId],
      false,
    )) as Ref<Permission>;
    let actions: VaultActions | undefined = permRef.object.vaults[vaultId];
    if (actions == null) {
      actions = {};
      permRef.object.vaults[vaultId] = actions;
    }
    actions[action] = null;
    await tran.put([...this.aclPermsDbPath, permId], permRef, false);
    await tran.put([...this.aclNodesDbPath, nodeId.toBuffer()], permId, true);
    await tran.put(
      [...this.aclVaultsDbPath, vaultId.toBuffer()],
      nodeIds,
      false,
    );
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetVaultAction(
    vaultId: VaultId,
    nodeId: NodeId,
    action: VaultAction,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unsetVaultAction(vaultId, nodeId, action, tran),
      );
    }
    const nodeIds = await tran.get<Record<NodeId, null>>(
      [...this.aclVaultsDbPath, vaultId.toBuffer()],
      false,
    );
    if (nodeIds == null || !(nodeId in nodeIds)) {
      return;
    }
    const permId = await tran.get(
      [...this.aclNodesDbPath, nodeId.toBuffer()],
      true,
    );
    if (permId == null) {
      return;
    }
    const permRef = (await tran.get(
      [...this.aclPermsDbPath, permId],
      false,
    )) as Ref<Permission>;
    const actions: VaultActions | undefined = permRef.object.vaults[vaultId];
    if (actions == null) {
      return;
    }
    delete actions[action];
    await tran.put([...this.aclPermsDbPath, permId], permRef, false);
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
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setNodesPerm(nodeIds, perm, tran),
      );
    }
    const permIdCounts: Record<PermissionIdString, number> = {};
    for (const nodeId of nodeIds) {
      const permIdBuffer = await tran.get(
        [...this.aclNodesDbPath, nodeId.toBuffer()],
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
      const permRef = (await tran.get(
        [...this.aclPermsDbPath, permId.toBuffer()],
        false,
      )) as Ref<Permission>;
      permRef.count = permRef.count - permIdCounts[permId];
      if (permRef.count === 0) {
        await tran.del([...this.aclPermsDbPath, permId.toBuffer()]);
      } else {
        await tran.put(
          [...this.aclPermsDbPath, permId.toBuffer()],
          permRef,
          false,
        );
      }
    }
    const permId = this.generatePermId();
    const permRef = {
      count: nodeIds.length,
      object: perm,
    };
    await tran.put([...this.aclPermsDbPath, permId.toBuffer()], permRef, false);
    for (const nodeId of nodeIds) {
      await tran.put(
        [...this.aclNodesDbPath, nodeId.toBuffer()],
        permId.toBuffer(),
        true,
      );
    }
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async setNodePerm(
    nodeId: NodeId,
    perm: Permission,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.setNodePerm(nodeId, perm, tran),
      );
    }
    const permId = await tran.get(
      [...this.aclNodesDbPath, nodeId.toBuffer()],
      true,
    );
    if (permId == null) {
      const permId = this.generatePermId();
      const permRef = {
        count: 1,
        object: perm,
      };
      await tran.put(
        [...this.aclPermsDbPath, permId.toBuffer()],
        permRef,
        false,
      );
      await tran.put(
        [...this.aclNodesDbPath, nodeId.toBuffer()],
        permId.toBuffer(),
        true,
      );
    } else {
      // The entire gestalt's perm gets replaced, therefore the count stays the same
      const permRef = (await tran.get(
        [...this.aclPermsDbPath, permId],
        false,
      )) as Ref<Permission>;
      permRef.object = perm;
      await tran.put([...this.aclPermsDbPath, permId], permRef, false);
    }
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetNodePerm(
    nodeId: NodeId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unsetNodePerm(nodeId, tran),
      );
    }
    const permId = await tran.get(
      [...this.aclNodesDbPath, nodeId.toBuffer()],
      true,
    );
    if (permId == null) {
      return;
    }
    const permRef = (await tran.get(
      [...this.aclPermsDbPath, permId],
      false,
    )) as Ref<Permission>;
    const count = --permRef.count;
    if (count === 0) {
      await tran.del([...this.aclPermsDbPath, permId]);
    } else {
      await tran.put([...this.aclPermsDbPath, permId], permRef, false);
    }
    await tran.del([...this.aclNodesDbPath, nodeId.toBuffer()]);
    // We do not remove the node id from the vaults
    // they can be removed later upon inspection
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async unsetVaultPerms(
    vaultId: VaultId,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.unsetVaultPerms(vaultId, tran),
      );
    }
    const nodeIds = await tran.get<Record<NodeId, null>>(
      [...this.aclVaultsDbPath, vaultId.toBuffer()],
      false,
    );
    if (nodeIds == null) {
      return;
    }
    for (const nodeIdString in nodeIds) {
      const nodeId: NodeId = IdInternal.fromString(nodeIdString);
      const permId = await tran.get(
        [...this.aclNodesDbPath, nodeId.toBuffer()],
        true,
      );
      // Skip if the nodeId doesn't exist
      // this means that it previously been removed
      if (permId == null) {
        continue;
      }
      const perm = (await tran.get(
        [...this.aclPermsDbPath, permId],
        false,
      )) as Ref<Permission>;
      delete perm.object.vaults[vaultId];
      await tran.put([...this.aclPermsDbPath, permId], perm, false);
    }
    await tran.del([...this.aclVaultsDbPath, vaultId.toBuffer()]);
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async joinNodePerm(
    nodeId: NodeId,
    nodeIdsJoin: Array<NodeId>,
    perm?: Permission,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.joinNodePerm(nodeId, nodeIdsJoin, perm, tran),
      );
    }
    const permId = await tran.get(
      [...this.aclNodesDbPath, nodeId.toBuffer()],
      true,
    );
    if (permId == null) {
      throw new aclErrors.ErrorACLNodeIdMissing();
    }
    const permRef = (await tran.get(
      [...this.aclPermsDbPath, permId],
      false,
    )) as Ref<Permission>;
    // Optionally replace the permission record for the target
    if (perm != null) {
      permRef.object = perm;
    }
    for (const nodeIdJoin of nodeIdsJoin) {
      const permIdJoin = await tran.get(
        [...this.aclNodesDbPath, nodeIdJoin.toBuffer()],
        true,
      );
      if (permIdJoin === permId) {
        continue;
      }
      ++permRef.count;
      if (permIdJoin != null) {
        const permJoin = (await tran.get(
          [...this.aclPermsDbPath, permIdJoin],
          false,
        )) as Ref<Permission>;
        --permJoin.count;
        if (permJoin.count === 0) {
          await tran.del([...this.aclPermsDbPath, permIdJoin]);
        } else {
          await tran.put([...this.aclPermsDbPath, permIdJoin], permJoin, false);
        }
      }
      await tran.put(
        [...this.aclNodesDbPath, nodeIdJoin.toBuffer()],
        permId,
        true,
      );
    }
    await tran.put([...this.aclPermsDbPath, permId], permRef, false);
  }

  @ready(new aclErrors.ErrorACLNotRunning())
  public async joinVaultPerms(
    vaultId: VaultId,
    vaultIdsJoin: Array<VaultId>,
    tran?: DBTransaction,
  ): Promise<void> {
    if (tran == null) {
      return this.db.withTransactionF((tran) =>
        this.joinVaultPerms(vaultId, vaultIdsJoin, tran),
      );
    }
    const nodeIds = await tran.get<Record<NodeId, null>>(
      [...this.aclVaultsDbPath, vaultId.toBuffer()],
      false,
    );
    if (nodeIds == null) {
      throw new aclErrors.ErrorACLVaultIdMissing();
    }
    const nodeIdsGc: Set<NodeId> = new Set();
    for (const nodeIdString in nodeIds) {
      const nodeId: NodeId = IdInternal.fromString(nodeIdString);
      const permId = await tran.get(
        [...this.aclNodesDbPath, nodeId.toBuffer()],
        true,
      );
      if (permId == null) {
        // Invalid node id
        nodeIdsGc.add(nodeId);
        continue;
      }
      const permRef = (await tran.get(
        [...this.aclPermsDbPath, permId],
        false,
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
      await tran.put([...this.aclPermsDbPath, permId], permRef, false);
    }
    for (const vaultIdJoin of vaultIdsJoin) {
      await tran.put(
        [...this.aclVaultsDbPath, vaultIdJoin.toBuffer()],
        nodeIds,
        false,
      );
    }
    if (nodeIdsGc.size > 0) {
      // Remove invalid node ids
      for (const nodeId of nodeIdsGc) {
        delete nodeIds[nodeId];
      }
      await tran.put(
        [...this.aclVaultsDbPath, vaultId.toBuffer()],
        nodeIds,
        false,
      );
    }
  }
}

export default ACL;
