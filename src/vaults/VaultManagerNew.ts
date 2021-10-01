import type { DB, DBLevel, DBOp } from '@matrixai/db';
import type {
  VaultId,
  Vaults,
  VaultName,
  VaultMap,
  VaultPermissions,
  VaultKey,
} from './types';
import type { FileSystem } from '../types';
import type { WorkerManager } from '../workers';
import type { NodeId } from '../nodes/types';

import fs from 'fs';
import path from 'path';
import Logger from '@matrixai/logger';
import { Mutex, MutexInterface } from 'async-mutex';
import Vault from './Vault';

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

  protected _started: boolean;

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
    this._started = true;
  }

  get started(): boolean {
    if (this._started) {
      return true;
    }
    return false;
  }

  public async destroy(): Promise<void> {
    this.logger.info('Destroying Vault Manager');
    await this.efs.stop();
    await this.fs.promises.rm(this.vaultsPath, {
      force: true,
      recursive: true,
    });
    this.logger.info(`Removing vaults directory at '${this.vaultsPath}'`);
    this._started = false;
    this.logger.info('Destroyed Vault Manager');
  }

  protected async getVaultId(
    vaultName: VaultName,
  ): Promise<VaultId | undefined> {
    const vaultId = await this.db.get<VaultId>(
      this.vaultsNamesDbDomain,
      vaultName,
    );
    return vaultId;
  }

  public async createVault(vaultName: VaultName): Promise<VaultInternal> {
    const lock = new Mutex();
    const release = await lock.acquire();
    try {
      const existingId = await this.getVaultId(vaultName);
      if (existingId != null) {
        throw new vaultsErrors.ErrorVaultDefined(
          'Vault Name already exists in Polykey, specify a new Vault Name',
        );
      }
      const vaultId = await this.generateVaultId();
      await this.db.put(this.vaultsNamesDbDomain, vaultName, vaultId);
      await this.efs.mkdir(vaultId);
      const vault = await VaultInternal.create({
        vaultId,
        vaultName,
        efs: await this.efs.chroot(vaultId),
        logger: this.logger.getChild(VaultInternal.name),
      });
      this.vaultsMap.set(vaultId, { lock, vault });
      return vault;
    } finally {
      release();
    }
  }

  public async destroyVault(vaultName: VaultName) {
    const vaultId = await this.getVaultId(vaultName);
    if (vaultId == null) {
      return
    }
    const vaultLock = this.vaultsMap.get(vaultId);
    if (vaultLock == null) {
      return
    }
    const release = await vaultLock.lock.acquire();
    try {
      await this.db.del(
        this.vaultsNamesDbDomain,
        vaultName,
      );
      await this.efs.rmdir(vaultId);
      await vaultLock.vault?.destroy();
      this.vaultsMap.delete(vaultId);
    } finally {
      release();
    }
  }

  public async openVault(vaultName: VaultName): Promise<VaultInternal> {
    return await this.getVault(vaultName);
  }

  public async closeVault(vaultName: VaultName) {
    const vault = await this.getVault(vaultName);
    await vault.stop();
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

  protected async getVault(vaultName: VaultName): Promise<VaultInternal> {
    let vault: VaultInternal | undefined;
    let lock: MutexInterface;
    const vaultId = await this.getVaultId(vaultName);
    if (vaultId == null) {
      throw new vaultsErrors.ErrorVaultUndefined(
        `Vault name ${vaultName} does not exist`,
      );
    }
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
        vault = await VaultInternal.start({
          vaultId,
          vaultName,
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
        vault = await VaultInternal.start({
          vaultId,
          vaultName,
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
}

export default VaultManager;
