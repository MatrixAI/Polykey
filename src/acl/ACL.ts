import type {
  AbstractBatch,
  AbstractLevelDOWN,
  AbstractIterator,
} from 'abstract-leveldown';
import type { LevelDB } from 'level';
import type { LevelUp } from 'levelup';
import type { PermissionId, Permission, ACLOp, VaultActions } from './types';
import type { NodeId } from '../nodes/types';
import type { VaultAction, VaultId } from '../vaults/types';
import type { KeyManager } from '../keys';
import type { FileSystem, Ref } from '../types';

import path from 'path';
import level from 'level';
import subleveldown from 'subleveldown';
import sublevelprefixer from 'sublevel-prefixer';
import { Mutex } from 'async-mutex';
import Logger from '@matrixai/logger';
import * as aclUtils from './utils';
import * as aclErrors from './errors';
import { utils as keysUtils, errors as keysErrors } from '../keys';
import * as utils from '../utils';

class ACL {
  public readonly aclPath: string;
  public readonly aclDbPath: string;

  protected logger: Logger;
  protected fs: FileSystem;
  protected keyManager: KeyManager;
  protected aclDb: LevelDB<string, Buffer>;
  protected aclDbKey: Buffer;
  protected aclDbPrefixer: (domain: string, key: string) => string;
  protected aclPermsDb: LevelUp<
    AbstractLevelDOWN<PermissionId, Buffer>,
    AbstractIterator<PermissionId, Buffer>
  >;
  protected aclNodesDb: LevelUp<
    AbstractLevelDOWN<NodeId, Buffer>,
    AbstractIterator<NodeId, Buffer>
  >;
  protected aclVaultsDb: LevelUp<
    AbstractLevelDOWN<VaultId, Buffer>,
    AbstractIterator<VaultId, Buffer>
  >;
  protected aclDbMutex: Mutex = new Mutex();

  // protected _transacting: boolean = false;
  protected _started: boolean = false;

  constructor({
    aclPath,
    keyManager,
    fs,
    logger,
  }: {
    aclPath: string;
    keyManager: KeyManager;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.fs = fs ?? require('fs');
    this.aclPath = aclPath;
    this.keyManager = keyManager;
    this.aclDbPath = path.join(aclPath, 'acl_db');
  }

  get started(): boolean {
    return this._started;
  }

  get locked(): boolean {
    return this.aclDbMutex.isLocked();
  }

  public async start({
    bits = 256,
    fresh = false,
  }: {
    bits?: number;
    fresh?: boolean;
  } = {}): Promise<void> {
    try {
      if (this._started) {
        return;
      }
      this.logger.info('Starting ACL');
      this._started = true;
      if (!this.keyManager.started) {
        throw new keysErrors.ErrorKeyManagerNotStarted();
      }
      this.logger.info(`Setting ACL path to ${this.aclPath}`);
      if (fresh) {
        await this.fs.promises.rm(this.aclPath, {
          force: true,
          recursive: true,
        });
      }
      await utils.mkdirExists(this.fs, this.aclPath, { recursive: true });
      const {
        p: aclDbP,
        resolveP: resolveAclDbP,
        rejectP: rejectAclDbP,
      } = utils.promise<void>();
      const { p: aclPermsDbP, resolveP: resolveAclPermsDbP } =
        utils.promise<void>();
      const { p: aclNodesDbP, resolveP: resolveAclNodesDbP } =
        utils.promise<void>();
      const { p: aclVaultsDbP, resolveP: resolveAclVaultsDbP } =
        utils.promise<void>();
      const aclDb = level(this.aclDbPath, { valueEncoding: 'binary' }, (e) => {
        if (e) {
          rejectAclDbP(e);
        } else {
          resolveAclDbP();
        }
      });
      const aclDbKey = await this.setupAclDbKey(bits);
      const aclDbPrefixer = sublevelprefixer('!');
      // perms stores PermissionId -> Ref<Permission>
      const aclPermsDb = subleveldown<PermissionId, Buffer>(aclDb, 'perms', {
        valueEncoding: 'binary',
        open: (cb) => {
          cb(undefined);
          resolveAclPermsDbP();
        },
      });
      // nodes stores NodeId -> PermissionId
      const aclNodesDb = subleveldown<NodeId, Buffer>(aclDb, 'nodes', {
        valueEncoding: 'binary',
        open: (cb) => {
          cb(undefined);
          resolveAclNodesDbP();
        },
      });
      // vaults stores VaultId -> Array<NodeId>
      // note that the NodeId in each array must be in their own unique gestalt
      // the NodeId in each array may be missing if it had been previously deleted
      const aclVaultsDb = subleveldown<VaultId, Buffer>(aclDb, 'vaults', {
        valueEncoding: 'binary',
        open: (cb) => {
          cb(undefined);
          resolveAclVaultsDbP();
        },
      });
      await Promise.all([aclDbP, aclPermsDbP, aclNodesDbP, aclVaultsDbP]);
      this.aclDb = aclDb;
      this.aclDbKey = aclDbKey;
      this.aclDbPrefixer = aclDbPrefixer;
      this.aclPermsDb = aclPermsDb;
      this.aclNodesDb = aclNodesDb;
      this.aclVaultsDb = aclVaultsDb;
      this.logger.info('Started ACL');
    } catch (e) {
      this._started = false;
      throw e;
    }
  }

  async stop() {
    if (!this._started) {
      return;
    }
    this.logger.info('Stopping ACL');
    this._started = false;
    await this.aclDb.close();
    this.logger.info('Stopped ACL');
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(f: (acl: ACL) => Promise<T>): Promise<T> {
    const release = await this.aclDbMutex.acquire();
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
  protected async _transaction<T>(f: () => Promise<T>): Promise<T> {
    if (this.aclDbMutex.isLocked()) {
      return await f();
    } else {
      return await this.transaction(f);
    }
  }

  public async getNodePerms(): Promise<Array<Record<NodeId, Permission>>> {
    return await this._transaction(async () => {
      const permIds: Record<PermissionId, Record<NodeId, Permission>> = {};
      for await (const o of this.aclNodesDb.createReadStream()) {
        const nodeId = (o as any).key as NodeId;
        const data = (o as any).value;
        // we can identify unique gestalts by the permssion id
        const permId = aclUtils.unserializeDecrypt<PermissionId>(
          this.aclDbKey,
          data,
        );
        let nodePerm: Record<NodeId, Permission>;
        if (permId in permIds) {
          nodePerm = permIds[permId];
          // get the first existing perm object
          let perm: Permission;
          for (const nodeId_ in nodePerm) {
            perm = nodePerm[nodeId_];
            break;
          }
          // all perm objects are shared
          nodePerm[nodeId] = perm!;
        } else {
          const permRef = (await this.getAclDb(
            'perms',
            permId,
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

  public async getVaultPerms(): Promise<
    Record<VaultId, Record<NodeId, Permission>>
  > {
    return await this._transaction(async () => {
      const vaultPerms: Record<VaultId, Record<NodeId, Permission>> = {};
      const ops: Array<ACLOp> = [];
      for await (const o of this.aclVaultsDb.createReadStream()) {
        const vaultId = (o as any).key as VaultId;
        const data = (o as any).value;

        const nodeIds = aclUtils.unserializeDecrypt<Record<NodeId, null>>(
          this.aclDbKey,
          data,
        );
        const nodePerm: Record<NodeId, Permission> = {};
        const nodeIdsGc: Set<NodeId> = new Set();
        for (const nodeId in nodeIds) {
          const permId = await this.getAclDb('nodes', nodeId as NodeId);
          if (permId == null) {
            // invalid node id
            nodeIdsGc.add(nodeId as NodeId);
            continue;
          }
          const permRef = (await this.getAclDb(
            'perms',
            permId,
          )) as Ref<Permission>;
          if (!(vaultId in permRef.object.vaults)) {
            // vault id is missing from the perm
            nodeIdsGc.add(nodeId as NodeId);
            continue;
          }
          nodePerm[nodeId] = permRef.object;
        }
        if (nodeIdsGc.size > 0) {
          // remove invalid node ids
          for (const nodeId of nodeIdsGc) {
            delete nodeIds[nodeId];
          }
          ops.push({
            type: 'put',
            domain: 'vaults',
            key: vaultId,
            value: nodeIds,
          });
        }
        vaultPerms[vaultId] = nodePerm;
      }
      await this.batchAclDb(ops);
      return vaultPerms;
    });
  }

  /**
   * Gets the permission record for a given node id
   * Any node id is acceptable
   */
  public async getNodePerm(nodeId: NodeId): Promise<Permission | undefined> {
    return await this._transaction(async () => {
      const permId = await this.getAclDb('nodes', nodeId);
      if (permId == null) {
        return;
      }
      const perm = (await this.getAclDb('perms', permId)) as Ref<Permission>;
      return perm.object;
    });
  }

  /**
   * Gets the record of node ids to permission for a given vault id
   * The node ids in the record each represent a unique gestalt
   * If there are no permissions, then an empty record is returned
   */
  public async getVaultPerm(
    vaultId: VaultId,
  ): Promise<Record<NodeId, Permission>> {
    return await this._transaction(async () => {
      const nodeIds = await this.getAclDb('vaults', vaultId);
      if (nodeIds == null) {
        return {};
      }
      const perms: Record<NodeId, Permission> = {};
      const nodeIdsGc: Set<NodeId> = new Set();
      for (const nodeId in nodeIds) {
        const permId = await this.getAclDb('nodes', nodeId as NodeId);
        if (permId == null) {
          // invalid node id
          nodeIdsGc.add(nodeId as NodeId);
          continue;
        }
        const permRef = (await this.getAclDb(
          'perms',
          permId,
        )) as Ref<Permission>;
        if (!(vaultId in permRef.object.vaults)) {
          // vault id is missing from the perm
          nodeIdsGc.add(nodeId as NodeId);
          continue;
        }
        perms[nodeId] = permRef.object;
      }
      if (nodeIdsGc.size > 0) {
        // remove invalid node ids
        for (const nodeId of nodeIdsGc) {
          delete nodeIds[nodeId];
        }
        await this.putAclDb('vaults', vaultId, nodeIds);
      }
      return perms;
    });
  }

  public async setVaultAction(
    vaultId: VaultId,
    nodeId: NodeId,
    action: VaultAction,
  ): Promise<void> {
    return await this._transaction(async () => {
      const nodeIds = (await this.getAclDb('vaults', vaultId)) ?? {};
      const permId = await this.getAclDb('nodes', nodeId);
      if (permId == null) {
        throw new aclErrors.ErrorACLNodeIdMissing();
      }
      nodeIds[nodeId] = null;
      const permRef = (await this.getAclDb('perms', permId)) as Ref<Permission>;
      let actions: VaultActions | undefined = permRef.object.vaults[vaultId];
      if (actions == null) {
        actions = {};
        permRef.object.vaults[vaultId] = actions;
      }
      actions[action] = null;
      const ops: Array<ACLOp> = [
        {
          type: 'put',
          domain: 'perms',
          key: permId,
          value: permRef,
        },
        {
          type: 'put',
          domain: 'nodes',
          key: nodeId,
          value: permId,
        },
        {
          type: 'put',
          domain: 'vaults',
          key: vaultId,
          value: nodeIds,
        },
      ];
      await this.batchAclDb(ops);
    });
  }

  public async unsetVaultAction(
    vaultId: VaultId,
    nodeId: NodeId,
    action: VaultAction,
  ): Promise<void> {
    await this._transaction(async () => {
      const nodeIds = await this.getAclDb('vaults', vaultId);
      if (nodeIds == null || !(nodeId in nodeIds)) {
        return;
      }
      const permId = await this.getAclDb('nodes', nodeId);
      if (permId == null) {
        return;
      }
      const permRef = (await this.getAclDb('perms', permId)) as Ref<Permission>;
      const actions: VaultActions | undefined = permRef.object.vaults[vaultId];
      if (actions == null) {
        return;
      }
      delete actions[action];
      await this.putAclDb('perms', permId, permRef);
    });
  }

  public async setNodePerm(nodeId: NodeId, perm: Permission): Promise<void> {
    await this._transaction(async () => {
      const permId = await this.getAclDb('nodes', nodeId);
      const ops: Array<ACLOp> = [];
      if (permId == null) {
        const permId = await aclUtils.generatePermId();
        const permRef = {
          count: 1,
          object: perm,
        };
        ops.push(
          {
            type: 'put',
            domain: 'perms',
            key: permId,
            value: permRef,
          },
          {
            type: 'put',
            domain: 'nodes',
            key: nodeId,
            value: permId,
          },
        );
      } else {
        // the entire gestalt's perm gets replaced, therefore the count stays the same
        const permRef = (await this.getAclDb(
          'perms',
          permId,
        )) as Ref<Permission>;
        permRef.object = perm;
        ops.push({
          type: 'put',
          domain: 'perms',
          key: permId,
          value: permRef,
        });
      }
      await this.batchAclDb(ops);
    });
  }

  public async setNodesPerm(
    nodeIds: Array<NodeId>,
    perm: Permission,
  ): Promise<void> {
    await this._transaction(async () => {
      for (const nodeId of nodeIds) {
        // only new nodeIds are allowed
        if ((await this.getAclDb('nodes', nodeId)) != null) {
          throw new aclErrors.ErrorACLNodeIdExists();
        }
      }
      const ops: Array<ACLOp> = [];
      const permId = await aclUtils.generatePermId();
      const permRef = {
        count: nodeIds.length,
        object: perm,
      };
      ops.push({
        domain: 'perms',
        type: 'put',
        key: permId,
        value: permRef,
      });
      for (const nodeId of nodeIds) {
        ops.push({
          domain: 'nodes',
          type: 'put',
          key: nodeId,
          value: permId,
        });
      }
      await this.batchAclDb(ops);
    });
  }

  public async unsetNodePerm(nodeId: NodeId): Promise<void> {
    await this._transaction(async () => {
      const permId = await this.getAclDb('nodes', nodeId);
      if (permId == null) {
        return;
      }
      const ops: Array<ACLOp> = [];
      const perm = (await this.getAclDb('perms', permId)) as Ref<Permission>;
      const count = --perm.count;
      if (count === 0) {
        ops.push({
          type: 'del',
          domain: 'perms',
          key: permId,
        });
      } else {
        ops.push({
          type: 'put',
          domain: 'perms',
          key: permId,
          value: perm,
        });
      }
      ops.push({
        type: 'del',
        domain: 'nodes',
        key: nodeId,
      });
      // we do not remove the node id from the vaults
      // they can be removed later upon inspection
      await this.batchAclDb(ops);
    });
  }

  public async unsetVaultPerms(vaultId: VaultId): Promise<void> {
    await this._transaction(async () => {
      const nodeIds = await this.getAclDb('vaults', vaultId);
      if (nodeIds == null) {
        return;
      }
      const ops: Array<ACLOp> = [];
      for (const nodeId in nodeIds) {
        const permId = await this.getAclDb('nodes', nodeId as NodeId);
        // skip if the nodeId doesn't exist
        // this means that it previously been removed
        if (permId == null) {
          continue;
        }
        const perm = (await this.getAclDb('perms', permId)) as Ref<Permission>;
        delete perm.object.vaults[vaultId];
        ops.push({
          type: 'put',
          domain: 'perms',
          key: permId,
          value: perm,
        });
      }
      ops.push({
        type: 'del',
        domain: 'vaults',
        key: vaultId,
      });
      await this.batchAclDb(ops);
    });
  }

  public async joinNodePerm(
    nodeId: NodeId,
    nodeIdsJoin: Array<NodeId>,
  ): Promise<void> {
    await this._transaction(async () => {
      const permId = await this.getAclDb('nodes', nodeId);
      if (permId == null) {
        throw new aclErrors.ErrorACLNodeIdMissing();
      }
      const ops: Array<ACLOp> = [];
      const permRef = (await this.getAclDb('perms', permId)) as Ref<Permission>;
      for (const nodeIdJoin of nodeIdsJoin) {
        const permIdJoin = await this.getAclDb('nodes', nodeIdJoin);
        if (permIdJoin === permId) {
          continue;
        }
        ++permRef.count;
        if (permIdJoin != null) {
          const permJoin = (await this.getAclDb(
            'perms',
            permIdJoin,
          )) as Ref<Permission>;
          --permJoin.count;
          if (permJoin.count === 0) {
            ops.push({
              type: 'del',
              domain: 'perms',
              key: permIdJoin,
            });
          } else {
            ops.push({
              type: 'put',
              domain: 'perms',
              key: permIdJoin,
              value: permJoin,
            });
          }
        }
        ops.push({
          type: 'put',
          domain: 'nodes',
          key: nodeIdJoin,
          value: permId,
        });
      }
      ops.push({
        type: 'put',
        domain: 'perms',
        key: permId,
        value: permRef,
      });
      await this.batchAclDb(ops);
    });
  }

  public async joinVaultPerms(
    vaultId: VaultId,
    vaultIdsJoin: Array<VaultId>,
  ): Promise<void> {
    await this._transaction(async () => {
      const nodeIds = await this.getAclDb('vaults', vaultId);
      if (nodeIds == null) {
        throw new aclErrors.ErrorACLVaultIdMissing();
      }
      const ops: Array<ACLOp> = [];
      const nodeIdsGc: Set<NodeId> = new Set();
      for (const nodeId in nodeIds) {
        const permId = await this.getAclDb('nodes', nodeId as NodeId);
        if (permId == null) {
          // invalid node id
          nodeIdsGc.add(nodeId as NodeId);
          continue;
        }
        const permRef = (await this.getAclDb(
          'perms',
          permId,
        )) as Ref<Permission>;
        if (!(vaultId in permRef.object.vaults)) {
          // vault id is missing from the perm
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
          domain: 'perms',
          key: permId,
          value: permRef,
        });
      }
      for (const vaultIdJoin of vaultIdsJoin) {
        ops.push({
          type: 'put',
          domain: 'vaults',
          key: vaultIdJoin,
          value: nodeIds,
        });
      }
      if (nodeIdsGc.size > 0) {
        // remove invalid node ids
        for (const nodeId of nodeIdsGc) {
          delete nodeIds[nodeId];
        }
        ops.push({
          type: 'put',
          domain: 'vaults',
          key: vaultId,
          value: nodeIds,
        });
      }
      await this.batchAclDb(ops);
    });
  }

  protected async setupAclDbKey(bits: number = 256): Promise<Buffer> {
    let trustDbKey = await this.keyManager.getKey(this.constructor.name);
    if (trustDbKey != null) {
      return trustDbKey;
    }
    this.logger.info('Generating ACL db key');
    trustDbKey = await keysUtils.generateKey(bits);
    await this.keyManager.putKey(this.constructor.name, trustDbKey);
    return trustDbKey;
  }

  protected async getAclDb(
    domain: 'perms',
    key: PermissionId,
  ): Promise<Ref<Permission> | undefined>;
  protected async getAclDb(
    domain: 'nodes',
    key: NodeId,
  ): Promise<PermissionId | undefined>;
  protected async getAclDb(
    domain: 'vaults',
    key: VaultId,
  ): Promise<Record<NodeId, null> | undefined>;
  protected async getAclDb(domain: any, key: any): Promise<any> {
    if (!this._started) {
      throw new aclErrors.ErrorACLNotStarted();
    }
    let data: Buffer;
    try {
      data = await this.aclDb.get(this.aclDbPrefixer(domain, key));
    } catch (e) {
      if (e.notFound) {
        return undefined;
      }
      throw e;
    }
    return aclUtils.unserializeDecrypt(this.aclDbKey, data);
  }

  protected async putAclDb(
    domain: 'perms',
    key: PermissionId,
    value: Ref<Permission>,
  ): Promise<void>;
  protected async putAclDb(
    domain: 'nodes',
    key: NodeId,
    value: PermissionId,
  ): Promise<void>;
  protected async putAclDb(
    domain: 'vaults',
    key: VaultId,
    value: Record<NodeId, null>,
  ): Promise<void>;
  protected async putAclDb(domain: any, key: any, value: any): Promise<void> {
    if (!this._started) {
      throw new aclErrors.ErrorACLNotStarted();
    }
    const data = aclUtils.serializeEncrypt(this.aclDbKey, value);
    await this.aclDb.put(this.aclDbPrefixer(domain, key), data);
  }

  protected async delAclDb(domain: 'perms', key: PermissionId): Promise<void>;
  protected async delAclDb(domain: 'nodes', key: NodeId): Promise<void>;
  protected async delAclDb(domain: 'vaults', key: VaultId): Promise<void>;
  protected async delAclDb(domain: any, key: any): Promise<void> {
    if (!this._started) {
      throw new aclErrors.ErrorACLNotStarted();
    }
    await this.aclDb.del(this.aclDbPrefixer(domain, key));
  }

  protected async batchAclDb(ops: Array<ACLOp>): Promise<void> {
    if (!this._started) {
      throw new aclErrors.ErrorACLNotStarted();
    }
    const ops_: Array<AbstractBatch> = [];
    for (const op of ops) {
      if (op.type === 'del') {
        ops_.push({
          type: op.type,
          key: this.aclDbPrefixer(op.domain, op.key),
        });
      } else if (op.type === 'put') {
        const data = aclUtils.serializeEncrypt(this.aclDbKey, op.value);
        ops_.push({
          type: op.type,
          key: this.aclDbPrefixer(op.domain, op.key),
          value: data,
        });
      }
    }
    await this.aclDb.batch(ops_);
  }
}

export default ACL;
