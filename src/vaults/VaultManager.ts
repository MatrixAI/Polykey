import type { DB, DBLevel, DBOp } from '@matrixai/db';
import type {
  VaultId,
  VaultName,
  VaultMap,
  VaultPermissions,
  VaultKey,
  VaultList,
} from './types';
import type { FileSystem } from '../types';
import type { WorkerManager } from '../workers';
import type { NodeId } from '../nodes/types';

import fs from 'fs';
import path from 'path';
import Logger from '@matrixai/logger';
import { Mutex, MutexInterface } from 'async-mutex';

import { KeyManager } from '../keys';
import { NodeManager } from '../nodes';
import { GestaltGraph } from '../gestalts';
import { ACL } from '../acl';
import { GitRequest } from '../git';
import { agentPB } from '../agent';

import * as utils from '../utils';
import * as vaultsUtils from './utils';
import * as vaultsErrors from './errors';
import * as keysErrors from '../keys/errors';
import * as gitErrors from '../git/errors';
import * as nodesErrors from '../nodes/errors';
import * as aclErrors from '../acl/errors';
import * as gestaltErrors from '../gestalts/errors';
import { errors as dbErrors } from '@matrixai/db';
import { EncryptedFS } from 'encryptedfs';
import VaultInternal from './VaultInternal';
import { CreateDestroy, ready } from "@matrixai/async-init/dist/CreateDestroy";

interface VaultManager extends CreateDestroy {}
@CreateDestroy()
class VaultManager {
  public readonly vaultsPath: string;

  protected fs: FileSystem;
  protected nodeManager: NodeManager;
  protected efs: EncryptedFS;
  protected db: DB;
  protected logger: Logger;
  protected workerManager?: WorkerManager;
  protected vaultsKey: VaultKey;
  protected vaultsMap: VaultMap;
  protected vaultsDbDomain: string;
  protected vaultsNamesDbDomain: Array<string>;
  protected vaultsDb: DBLevel;
  protected vaultsNamesDb: DBLevel;

  public static async create({
    fresh = false,
    vaultsPath,
    nodeManager,
    db,
    fs,
    logger,
  }: {
    fresh?: boolean
    vaultsPath: string;
    nodeManager: NodeManager;
    db: DB;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    logger = logger ?? new Logger(this.constructor.name);
    const fileSystem = fs ?? require('fs');
    logger.info('Creating Vault Manager');
    const vaultsDbDomain = 'VaultManager';
    const vaultsDb = await db.level(vaultsDbDomain);
    const vaultsNamesDbDomain = [vaultsDbDomain, 'names']
    const vaultsNamesDb = await db.level(
      vaultsNamesDbDomain[1],
      vaultsDb,
    );
    if (fresh) {
      await vaultsDb.clear();
      await fileSystem.promises.rm(vaultsPath, {
        force: true,
        recursive: true,
      });
      logger.info(`Removing vaults directory at '${vaultsPath}'`);
    }
    await utils.mkdirExists(fileSystem, vaultsPath, { recursive: true });
    const vaultsKey = await vaultsUtils.generateVaultKey();
    const efs = await EncryptedFS.createEncryptedFS({
      dbPath: vaultsPath,
      dbKey: vaultsKey,
    });
    await efs.start();
    logger.info('Created Vault Manager');
    return new VaultManager({
      vaultsPath,
      nodeManager,
      vaultsKey,
      db,
      vaultsDbDomain,
      vaultsNamesDbDomain,
      vaultsDb,
      vaultsNamesDb,
      efs,
      fs,
      logger,
    });
  }

  constructor({
    vaultsPath,
    nodeManager,
    vaultsKey,
    db,
    vaultsDbDomain,
    vaultsNamesDbDomain,
    vaultsDb,
    vaultsNamesDb,
    efs,
    fs,
    logger,
  }: {
    vaultsPath: string;
    nodeManager: NodeManager;
    vaultsKey: VaultKey;
    db: DB;
    vaultsDbDomain: string;
    vaultsNamesDbDomain: Array<string>;
    vaultsDb: DBLevel;
    vaultsNamesDb: DBLevel;
    efs: EncryptedFS;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.vaultsPath = vaultsPath;
    this.nodeManager = nodeManager;
    this.db = db;
    this.vaultsDbDomain = vaultsDbDomain;
    this.vaultsNamesDbDomain = vaultsNamesDbDomain;
    this.vaultsDb = vaultsDb;
    this.vaultsNamesDb = vaultsNamesDb;
    this.vaultsMap = new Map();
    this.efs = efs;
    this.fs = fs ?? require('fs');
    this.vaultsKey = vaultsKey;
    this.logger = logger ?? new Logger(this.constructor.name);
  }

  public async transaction<T>(
    f: (vaultManager: VaultManager) => Promise<T>,
    lock: MutexInterface
  ): Promise<T> {
    const release = await lock.acquire();
    try {
      return await f(this);
    } finally {
      release();
    }
  }

  public async _transaction<T>(f: () => Promise<T>, lock: MutexInterface): Promise<T> {
    if (lock.isLocked()) {
      return await f();
    } else {
      return await this.transaction(f, lock);
    }
  }

  public async destroy(): Promise<void> {
    this.logger.info('Destroying Vault Manager');
    // Destroying managed vaults.
    for (const vault of this.vaultsMap.values()) {
      vault.vault?.destroy()
    }
    await this.efs.stop();
    // We shouldn't delete the saved state when destroying.
    // await this.fs.promises.rm(this.vaultsPath, {
    //   force: true,
    //   recursive: true,
    // });
    // this.logger.info(`Removing vaults directory at '${this.vaultsPath}'`);
    this.logger.info('Destroyed Vault Manager');
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async getVaultId(
    vaultName: VaultName,
  ): Promise<VaultId | undefined> {
    const vaultId = await this.db.get<VaultId>(
      this.vaultsNamesDbDomain,
      vaultName,
    );
    return vaultId;
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async createVault(vaultName: VaultName): Promise<VaultInternal> {
    let vault;
    const lock = new Mutex();
    await this._transaction(async () => {
      const existingId = await this.getVaultId(vaultName);
      if (existingId != null) throw new vaultsErrors.ErrorVaultDefined();
      const vaultId = await this.generateVaultId();
      this.vaultsMap.set(vaultId, { lock });
      await this.db.put(this.vaultsNamesDbDomain, vaultName, vaultId);
      await this.efs.mkdir(vaultId);
      vault = await VaultInternal.create({
        vaultId,
        efs: await this.efs.chroot(vaultId),
        logger: this.logger.getChild(VaultInternal.name),
        fresh: true,
      });
      this.vaultsMap.set(vaultId, { lock, vault });
    }, lock);
    return vault;
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async destroyVault(vaultId: VaultId) {
    const lock = await this.getLock(vaultId);
    await this._transaction(async () => {
      const vaultName = await this.getVaultName(vaultId);
      if (!vaultName) return;
      await this.db.del(
        this.vaultsNamesDbDomain,
        vaultName,
      );
      await this.efs.rmdir(vaultId);
      const vaultLock = this.vaultsMap.get(vaultId);
      await vaultLock?.vault?.destroy();
      this.vaultsMap.delete(vaultId);
    }, lock);
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async openVault(vaultId: VaultId): Promise<VaultInternal> {
    return await this.getVault(vaultId);
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async closeVault(vaultId: VaultId) {
    const vault = await this.getVault(vaultId);
    await vault.destroy();
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async listVaults(nodeId: NodeId): Promise<VaultList> {
    const vaults: VaultList = new Map();
    for await (const o of this.vaultsNamesDb.createReadStream({})) {
      const dbId = (o as any).value;
      const dbName = (o as any).key.toString() as VaultName;
      const vaultId = await this.db.deserializeDecrypt<VaultId>(dbId, false);
      if (nodeId === this.nodeManager.getNodeId()) {
        vaults.set(dbName, vaultId);
      } else {
        // TODO: Handle what other nodes can see with their permissions
      }
    }
    return vaults;
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async renameVault(
    vaultId: VaultId,
    newVaultName: VaultName,
  ): Promise<void> {
    const lock = await this.getLock(vaultId);
    await this._transaction(async () => {
      const vaultName = await this.getVaultName(vaultId);
      if (!vaultName) throw new vaultsErrors.ErrorVaultUndefined();
      const ops: Array<DBOp> = [
        {
          type: 'del',
          domain: this.vaultsNamesDbDomain,
          key: vaultName,
        },
        {
          type: 'put',
          domain: this.vaultsNamesDbDomain,
          key: newVaultName,
          value: vaultId,
        },
      ];
      await this.db.batch(ops);
    }, lock);
  }

  protected async generateVaultId(): Promise<VaultId> {
    let vaultId = vaultsUtils.generateVaultId(this.nodeManager.getNodeId());
    let i = 0;
    while (await this.efs.exists(vaultId)) {
      i++;
      if (i > 50) {
        throw new vaultsErrors.ErrorCreateVaultId(
          'Could not create a unique vaultId after 50 attempts',
        );
      }
      vaultId = vaultsUtils.generateVaultId(this.nodeManager.getNodeId());
    }
    return vaultId;
  }

  protected async getVault(vaultId: VaultId): Promise<VaultInternal> {
    let vault: VaultInternal | undefined;
    let lock: MutexInterface;
    let vaultAndLock = this.vaultsMap.get(vaultId);
    if (vaultAndLock != null) {
      ({ vault, lock } = vaultAndLock);
      if (vault != null) {
        return vault;
      }
      let release;
      try {
        release = await lock.acquire();
        ({ vault, lock } = vaultAndLock);
        if (vault != null) {
          return vault;
        }
        vault = await VaultInternal.create({
          vaultId,
          efs: await this.efs.chroot(vaultId),
          logger: this.logger.getChild(VaultInternal.name),
        });
        vaultAndLock.vault = vault;
        this.vaultsMap.set(vaultId, vaultAndLock);
        return vault;
      } finally {
        release();
      }
    } else {
      lock = new Mutex();
      vaultAndLock = { lock };
      this.vaultsMap.set(vaultId, vaultAndLock);
      let release;
      try {
        release = await lock.acquire();
        vault = await VaultInternal.create({
          vaultId,
          efs: await this.efs.chroot(vaultId),
          logger: this.logger.getChild(VaultInternal.name),
        });
        vaultAndLock.vault = vault;
        this.vaultsMap.set(vaultId, vaultAndLock);
        return vault;
      } finally {
        release();
      }
    }
  }

  protected async getLock(vaultId: VaultId): Promise<MutexInterface> {
    const vaultLock = this.vaultsMap.get(vaultId);
    let lock = vaultLock?.lock;
    if (!lock) {
      lock = new Mutex();
      this.vaultsMap.set(vaultId, { lock });
    }
    return lock;
  }

  protected async getVaultName(vaultId: VaultId): Promise<VaultName | undefined> {
    const lock = await this.getLock(vaultId);
    return await this._transaction(async () => {
      for await (const o of this.vaultsNamesDb.createReadStream({})) {
        const dbId = (o as any).value;
        const dbName = (o as any).key as VaultName;
        const dbIdDecrypted = await this.db.deserializeDecrypt<VaultId>(dbId, false);
        if (vaultId === dbIdDecrypted) {
          return dbName;
        }
      }
    }, lock);
  }
}

export default VaultManager;
