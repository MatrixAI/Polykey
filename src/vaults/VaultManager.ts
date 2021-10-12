import type { DB, DBLevel, DBOp } from '@matrixai/db';
import type {
  VaultId,
  VaultName,
  VaultMap,
  VaultPermissions,
  VaultKey,
  VaultList, VaultFacade
} from "./types";
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
import { EncryptedFS, POJO } from 'encryptedfs';
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
  protected vaultCreation: Map<VaultName, MutexInterface>;
  protected vaultsDbDomain: string;
  protected vaultsNamesDbDomain: Array<string>;
  protected vaultsDb: DBLevel;
  protected vaultsNamesDb: DBLevel;

  static async createVaultManager({
    fresh = false,
    vaultsPath,
    vaultsKey,
    nodeManager,
    db,
    fs,
    logger,
  }: {
    fresh?: boolean
    vaultsPath: string;
    vaultsKey: VaultKey;
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
    const efs = await EncryptedFS.createEncryptedFS({
      dbPath: vaultsPath,
      dbKey: vaultsKey,
      logger: logger,
    });
    await efs.start();
    logger.info('Created Vault Manager');
    return new VaultManager({
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
    this.nodeManager = nodeManager;
    this.db = db;
    this.vaultsDbDomain = vaultsDbDomain;
    this.vaultsNamesDbDomain = vaultsNamesDbDomain;
    this.vaultsDb = vaultsDb;
    this.vaultsNamesDb = vaultsNamesDb;
    this.vaultsMap = new Map();
    this.vaultCreation = new Map();
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

  protected async _transaction<T>(f: () => Promise<T>, vaults: Array<VaultId> = []): Promise<T> {
      const releases: Array<MutexInterface.Releaser> = [];
      for (const vault of vaults) {
          const lock = this.vaultsMap.get(vault);
          if (lock) releases.push(await lock.lock.acquire());
      }
      try {
          return await f();
      }
      finally {
        // Release them in the opposite order
        releases.reverse();
        for (const r of releases) {
            r();
      }
    }
  }

  public async destroy(): Promise<void> {
    this.logger.info('Destroying Vault Manager');
    // Destroying managed vaults.
    for (const vault of this.vaultsMap.values()) {
      await vault.vault?.destroy();
    }
    await this.efs.stop();
    this.logger.info('Destroyed Vault Manager');
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async getVaultName(
    vaultId: VaultId,
  ): Promise<VaultName | undefined> {
    const vaultMeta = await this.db.get<POJO>(
      this.vaultsNamesDbDomain,
      vaultId,
    );
    if (vaultMeta == null) throw new vaultsErrors.ErrorVaultUndefined();
    return vaultMeta.name;
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async createVault(vaultName: VaultName): Promise<VaultFacade> {
    // let lock = this.vaultCreation.get(vaultName);
    // if (!lock) lock = new Mutex();
    // this.vaultCreation.set(vaultName, lock);
    // const release = await lock.acquire();
    // try {
      // const existingId = await this.getVaultId(vaultName);
      // if (existingId != null) throw new vaultsErrors.ErrorVaultDefined();
      const vaultId = await this.generateVaultId();
      const lock = new Mutex();
      this.vaultsMap.set(vaultId, { lock });
      return await this._transaction(async () => {
        await this.db.put(this.vaultsNamesDbDomain, vaultId, { name: vaultName });
        await this.efs.mkdir(path.join(vaultId, 'contents'), { recursive: true });
        const efs = await this.efs.chroot(path.join(vaultId, 'contents'));
        await efs.start();
        const vault = await VaultInternal.create({
          vaultId,
          efsRoot: this.efs,
          efsVault: efs,
          logger: this.logger.getChild(VaultInternal.name),
          fresh: true,
        });
        this.vaultsMap.set(vaultId, { lock, vault });
        return vault;
      }, [vaultId]);
    // } finally {
    //   release();
    //   this.vaultCreation.delete(vaultName);
    // }
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async destroyVault(vaultId: VaultId) {
    const lock = await this.getLock(vaultId);
    await this._transaction(async () => {
      const vaultName = await this.getVaultName(vaultId);
      if (!vaultName) return;
      await this.db.del(
        this.vaultsNamesDbDomain,
        vaultId,
      );
      this.vaultsMap.delete(vaultId);
      await this.efs.rmdir(vaultId, { recursive: true });
    }, [vaultId]);
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async openVault(vaultId: VaultId): Promise<VaultFacade> {
    const vaultName = await this.getVaultName(vaultId);
    if (!vaultName) throw new vaultsErrors.ErrorVaultUndefined();
    return await this.getVault(vaultId);
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async closeVault(vaultId: VaultId) {
    const vaultName = await this.getVaultName(vaultId);
    if (!vaultName) throw new vaultsErrors.ErrorVaultUndefined();
    const vault = await this.getVault(vaultId);
    await vault.destroy();
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async listVaults(nodeId?: NodeId): Promise<VaultList> {
    const vaults: VaultList = new Map();
    for await (const o of this.vaultsNamesDb.createReadStream({})) {
      const dbMeta = (o as any).value;
      const dbId = (o as any).key;
      const vaultMeta = await this.db.deserializeDecrypt<POJO>(dbMeta, false);
      if (!nodeId) {
        vaults.set(vaultMeta.name, dbId.toString());
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
    await this._transaction(async () => {
      const meta = await this.db.get<POJO>(this.vaultsNamesDbDomain, vaultId);
      if (!meta) throw new vaultsErrors.ErrorVaultUndefined();
      meta.name = newVaultName;
      await this.db.put(this.vaultsNamesDbDomain, vaultId, meta);
    }, [vaultId]);
  }

  @ready(new vaultsErrors.ErrorVaultManagerDestroyed())
  public async getVaultId(vaultName: VaultName): Promise<VaultId | undefined> {
    for await (const o of this.vaultsNamesDb.createReadStream({})) {
      const dbMeta = (o as any).value;
      const dbId = (o as any).key;
      const vaultMeta = await this.db.deserializeDecrypt<POJO>(dbMeta, false);
      if (vaultName === vaultMeta.name) {
        return dbId.toString();
      }
    }
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
        const efs = await this.efs.chroot(path.join(vaultId, 'contents'));
        await efs.start();
        vault = await VaultInternal.create({
          vaultId,
          efsRoot: this.efs,
          efsVault: efs,
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
        const efs = await this.efs.chroot(path.join(vaultId, 'contents'));
        await efs.start();
        vault = await VaultInternal.create({
          vaultId,
          efsRoot: this.efs,
          efsVault: efs,
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
}

export default VaultManager;
