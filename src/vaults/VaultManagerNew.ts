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
import { Mutex } from 'async-mutex';
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
  protected logger: Logger;
  protected workerManager?: WorkerManager;
  protected vaultsKey: VaultKey;

  protected _started: boolean;

  public static async createVaultManager({
    vaultsPath,
    nodeManager,
    fs,
    logger,
  }: {
    vaultsPath: string;
    nodeManager: NodeManager;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    const vaultsKey = await vaultsUtils.generateVaultKey();
    return new VaultManager({
      vaultsPath,
      nodeManager,
      vaultsKey,
      fs,
      logger,
    });
  }

  constructor({
    vaultsPath,
    nodeManager,
    vaultsKey,
    fs,
    logger,
  }: {
    vaultsPath: string;
    nodeManager: NodeManager;
    vaultsKey: VaultKey;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.vaultsPath = vaultsPath;
    this.nodeManager = nodeManager;
    this.fs = fs ?? require('fs');
    this.vaultsKey = vaultsKey;
    this.logger = logger ?? new Logger(this.constructor.name);
    this._started = false;
  }

  get started(): boolean {
    if (
      this._started
    ) {
      return true;
    }
    return false;
  }

  public async create({ fresh = false }: { fresh?: boolean }): Promise<void> {
    this.logger.info('Creating Vault Manager');
    if (fresh) {
      await this.fs.promises.rm(this.vaultsPath, {
        force: true,
        recursive: true,
      });
      this.logger.info(`Removing vaults directory at '${this.vaultsPath}'`);
    }
    await utils.mkdirExists(this.fs, this.vaultsPath, { recursive: true });
    this.efs = await EncryptedFS.createEncryptedFS({
      dbPath: this.vaultsPath,
      dbKey: this.vaultsKey,
    });
    await this.efs.start();
    this._started = true;
    this.logger.info('Created Vault Manager');
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

  public async openVault(vaultName: VaultName): Promise<VaultInternal> {
    let vaultId = vaultsUtils.generateVaultId(this.nodeManager.getNodeId());
    let i = 0;
    while (1) {
      try {
        // Get the vault using the vault Id
      } catch (e) {
        if (e instanceof vaultsErrors.ErrorVaultUndefined) {
          break;
        }
      }
      i++;
      if (i > 50) {
        // Throw an error if a unique id cannot be generated after 50 attempts
        throw new vaultsErrors.ErrorCreateVaultId(
          'Could not create a unique vaultId after 50 attempts',
        );
      }
      vaultId = vaultsUtils.generateVaultId(this.nodeManager.getNodeId());
    }
    await this.efs.mkdir(vaultId);
    return new VaultInternal({
      vaultId,
      vaultName,
      efs: await this.efs.chroot(vaultId),
      logger: this.logger.getChild(VaultInternal.name),
    });
  }
}

export default VaultManager;
