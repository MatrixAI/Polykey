import type { VaultId, Vaults } from './types';
import type { FileSystem } from '../types';
import type { WorkerManager } from '../workers';

import fs from 'fs';
import path from 'path';
import Logger from '@matrixai/logger';
import { Mutex } from 'async-mutex';
import Vault from './Vault';
import VaultMap from './VaultMap';

import { generateVaultKey, fileExists, generateVaultId } from './utils';
import { KeyManager, errors as keysErrors } from '../keys';
import { NodeManager } from '../nodes';
import { GitFrontend } from '../git';
import * as utils from '../utils';
import * as errors from './errors';

class VaultManager {
  public readonly vaultsPath: string;
  public readonly metadataPath: string;
  protected fs: FileSystem;
  protected vaultMap: VaultMap;
  protected keyManager: KeyManager;
  protected nodeManager: NodeManager;
  protected logger: Logger;
  protected gitFrontend: GitFrontend;
  protected workerManager?: WorkerManager;
  private vaults: Vaults;
  private _started: boolean;

  // Concurrency for metadata
  private metadataMutex: Mutex = new Mutex();

  /**
   * Construct a VaultManager object
   * @param vaultsPath path to store vault and vault data in. should be <polykey_folder>/vaults
   * @param keyManager Key Manager object
   * @param fs fs object
   * @param logger Logger
   */
  constructor({
    vaultsPath,
    keyManager,
    fs,
    logger,
  }: {
    vaultsPath: string;
    keyManager: KeyManager;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.vaultsPath = vaultsPath;
    this.metadataPath = path.join(this.vaultsPath, 'vaultMeta');
    this.keyManager = keyManager;
    this.fs = fs ?? require('fs');
    this.logger = logger ?? new Logger('VaultManager');
    this.vaults = {};
    this._started = false;
    this.vaultMap = new VaultMap({
      vaultMapPath: this.vaultsPath,
      keyManager: this.keyManager,
      fs: this.fs,
      logger: this.logger,
    });
    this.gitFrontend = new GitFrontend();
  }

  public setWorkerManager(workerManager: WorkerManager) {
    this.workerManager = workerManager;
    for (const id in this.vaults) {
      this.vaults[id].vault.EncryptedFS.setWorkerManager(workerManager);
    }
  }

  public unsetWorkerManager() {
    delete this.workerManager;
    for (const id in this.vaults) {
      this.vaults[id].vault.EncryptedFS.unsetWorkerManager();
    }
  }

  public async start({ fresh = false }: { fresh?: boolean }) {
    if (!this.keyManager.started) {
      throw new keysErrors.ErrorKeyManagerNotStarted();
    }
    if (fresh) {
      await this.fs.promises.rm(this.vaultsPath, {
        force: true,
        recursive: true,
      });
    }

    await utils.mkdirExists(this.fs, this.vaultsPath, { recursive: true });

    this.logger.info(`Creating metadataPath at ${this.metadataPath}`);
    await utils.mkdirExists(this.fs, this.metadataPath);

    await this.vaultMap.start();
    await this.loadVaultData();
    this._started = true;
  }

  public async stop() {
    this.logger.info('Stopping Vault Manager');
    if (this._started) {
      await this.vaultMap.stop();
    }
    this._started = false;
    this.logger.info('Stopped Vault Manager');
  }

  /**
   * Checks to see whether or not the current VaultManager instance has been started.
   *
   * Checks for: _started, keyManager and gitFrontend
   * @returns true if all vaultManager components have been constructed
   */
  public async started(): Promise<boolean> {
    if (this._started && this.keyManager && this.gitFrontend) {
      return true;
    }
    return false;
  }

  /**
   * Adds a new vault, given a vault name. Also generates a new vault key
   * and writes encrypted vault metadata to disk.
   *
   * @throws ErrorVaultDefined if vault with the same name already exists
   * @param vaultName Name of the new vault
   * @returns The newly created vault object
   */
  public async createVault(vaultName: string): Promise<Vault> {
    // generate a key
    let id = await generateVaultId();
    const i = 0;
    while (this.vaults[id]) {
      if (i > 50) {
        throw new errors.ErrorCreateVaultId(
          'Could not create a unique vaultId after 50 attempts',
        );
      }
      id = await generateVaultId();
    }
    const key = await generateVaultKey();
    const vault = new Vault({
      vaultId: id,
      vaultName: vaultName,
      key: key,
      baseDir: this.vaultsPath,
      logger: this.logger,
    });
    vault.create();
    this.vaults[id] = { vault: vault, vaultKey: key, vaultName: vaultName };

    // write vault data
    await this.vaultMap.setVault(vaultName, id as VaultId, key);

    return vault;
  }

  /**
   * Rename an existing vault. Updates references to vault keys and
   * writes new encrypted vault metadata to disk.
   *
   * @throws ErrorVaultUndefined if vault currVaultName does not exist
   * @throws ErrorVaultDefined if newVaultName already exists
   * @param vaultId Id of vault to be renamed
   * @param newVaultName New name of  vault
   * @returns true if success
   */
  public async renameVault(
    vaultId: string,
    newVaultName: string,
  ): Promise<boolean> {
    if (!this.vaults[vaultId]) {
      throw new errors.ErrorVaultUndefined();
    }

    const vault = this.vaults[vaultId].vault;

    await this.vaultMap.renameVault(vault.vaultName, newVaultName);

    await vault.renameVault(newVaultName);

    // update vaults
    this.vaults[vaultId].vaultName = newVaultName;

    return true;
  }

  /**
   * Retreives stats for a vault
   *
   * @returns the stats of the vault directory
   */
  public async vaultStats(vaultId: string): Promise<fs.Stats> {
    const vault = this.vaults[vaultId].vault;
    return vault.EncryptedFS.statSync(vault.vaultId);
  }

  /**
   * Delete an existing vault. Deletes file from filesystem and
   * updates mappings to vaults and vaultKeys. If it fails to delete
   * from the filesystem, it will not modify any mappings and reutrn false
   *
   * @throws ErrorVaultUndefined if vault name does not exist
   * @param vaultId Id of vault to be deleted
   * @returns true if successfil, false if vault path still exists
   */
  public async deleteVault(vaultId: string): Promise<boolean> {
    if (!this.vaults[vaultId]) {
      throw new errors.ErrorVaultUndefined(
        `Vault does not exist: '${vaultId}'`,
      );
    }
    // this is convenience function for removing all tags
    // and triggering garbage collection
    // destruction is a better word as we should ensure all traces are removed

    const vaultPath = path.join(this.vaultsPath, vaultId);
    // Remove directory on file system
    if (await fileExists(this.fs, vaultPath)) {
      await this.fs.promises.rm(vaultPath, { recursive: true });
      this.logger.info(`Removed vault directory at '${vaultPath}'`);
    }

    if (await fileExists(this.fs, vaultPath)) {
      return false;
    }
    const vault = this.vaults[vaultId].vault;

    // Remove from mappings
    delete this.vaults[vaultId];

    await this.vaultMap.delVault(vault.vaultName);

    return true;
  }

  /**
   * Retrieve all the vaults for current node
   *
   * @returns Array of VaultName and VaultIds managed currently by the vault manager
   */
  public listVaults(): Array<{ name: string; id: string }> {
    const vaults: Array<{ name: string; id: string }> = [];
    for (const id in this.vaults) {
      vaults.push({
        name: this.vaults[id].vaultName,
        id,
      });
    }
    return vaults;
  }

  /**
   * Gives vault ids given the vault name
   * @param vaultName The Vault name
   * @returns A list of all ids that match the given vault name. List is empty if nothing is found
   */
  public getVaultIds(vaultName: string): Array<string> {
    const result: Array<string> = [];
    for (const id in this.vaults) {
      if (vaultName === this.vaults[id].vaultName) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Retreieves the Vault instance
   *
   * @throws ErrorVaultUndefined if vaultId does not exist
   * @param vaultId Id of vault
   * @returns a vault instance.
   */
  public getVault(vaultId: string): Vault {
    if (!this.vaults[vaultId]) {
      throw new errors.ErrorVaultUndefined(`${vaultId} does not exist`);
    } else {
      return this.vaults[vaultId].vault;
    }
  }

  /**
   * Sets the Vault Id that the specified vault has been cloned from
   *
   * @throws ErrorVaultUndefined if vaultId does not exist
   * @param vaultId Id of vault
   * @param linkVault Id of the cloned vault
   */
  public async setLinkVault(vaultId: string, linkVault: string): Promise<void> {
    if (!this.vaults[vaultId]) {
      throw new errors.ErrorVaultUndefined(`${vaultId} does not exist`);
    } else {
      this.vaults[vaultId].vaultLink = linkVault;
      await this.vaultMap.setVaultLink(vaultId as VaultId, linkVault);
    }
  }

  /**
   * Gets the Vault that is associated with a cloned Vault ID
   *
   * @throws ErrorVaultUndefined if vaultId does not exist
   * @param vaultId Id of vault that has been cloned
   * @returns instance of the vault that is linked to the cloned vault
   */
  public getLinkVault(vaultId: string): Vault | undefined {
    for (const elem in this.vaults) {
      if (this.vaults[elem].vaultLink === vaultId) {
        return this.vaults[elem].vault;
      }
    }
  }

  /* === Helpers === */
  /**
   * Loads existing vaults data from the vaults db into memory.
   * If metadata does not exist, does nothing.
   */
  private async loadVaultData(): Promise<void> {
    const release = await this.metadataMutex.acquire();
    try {
      this.logger.info(`Reading metadata from ${this.metadataPath}`);
      const vaults = await this.vaultMap.loadVaultData();
      this.vaults = vaults;
    } catch (err) {
      release();
      throw err;
    }
    release();
  }
}

export default VaultManager;
