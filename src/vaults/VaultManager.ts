import type { Vaults } from './types';
import type { FileSystem } from '../types';
import type { WorkerManager } from '../workers';

import fs from 'fs';
import path from 'path';
import level from 'level';
import git from 'isomorphic-git';
import Logger from '@matrixai/logger';
import { Mutex } from 'async-mutex';
import Vault from './Vault';
import { generateVaultKey, fileExists, generateVaultId } from './utils';
import { KeyManager, errors as keysErrors } from '../keys';
import { GitFrontend, GitRequest } from '../git';
import * as utils from '../utils';
import * as errors from './errors';

class VaultManager {
  public readonly vaultsPath: string;
  public readonly metadataPath: string;
  protected fs: FileSystem;
  protected leveldb;
  protected keyManager: KeyManager;
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

    // Git frontend
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

    this.leveldb = await level(this.metadataPath, { valueEncoding: 'json' });
    await this.loadVaultData();
    this._started = true;
  }

  public async stop() {
    await this.leveldb?.close();
    this._started = false;
  }

  /**
   * Checks to see whether or not the current VaultManager instance has been started.
   *
   * Checks for: _started, keyManager, gitFrontend, leveldb and existance of vault metadata
   * @returns true if all vaultManager components have been constructed
   */
  public async started(): Promise<boolean> {
    if (
      this._started &&
      this.keyManager &&
      this.gitFrontend &&
      this.leveldb.isOpen() &&
      (await fileExists(this.fs, this.metadataPath))
    ) {
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
    await this.putValueLeveldb(id, { vaultKey: key, vaultName: vaultName });

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
      throw new errors.ErrorVaultUndefined('vault does not exist');
    }

    const vault = this.vaults[vaultId].vault;
    await vault.renameVault(newVaultName);

    // update vaults
    this.vaults[vaultId].vaultName = newVaultName;

    await this.putValueLeveldb(vaultId, { vaultName: newVaultName });
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

    // Remove from mappings
    delete this.vaults[vaultId];

    await this.deleteValueLeveldb(vaultId);

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
   * Retrieve all the vaults for a peers node
   *
   * @param nodeId identifier of node to scan vaults from
   * @returns a list of vault names from the connected node
   */
  public async scanNodeVaults(): Promise<Array<string>> {
    throw new Error('Not implemented');
    // const gitRequest = this.gitFrontend.connectToNodeGit(nodeId);
    // const vaultNameList = await gitRequest.scanVaults();
    // return vaultNameList;
  }

  /**
   * Pull a vault from another node, clones it if the vault does not already
   * exist locally
   *
   * @throws ErrorRemoteVaultUndefined if vaultName does not exist on
   * connected node
   * @param vaultName name of vault
   * @param nodeId identifier of node to pull/clone from
   */
  public async pullVault(vaultId: string, nodeId: string): Promise<void> {
    // const gitRequest = new GitRequest(
    //   async () => Buffer.from(''),
    //   async () => Buffer.from(''),
    //   async () => [''],
    // );
    // if (this.vaults[vaultId]) {
    //   await this.vaults[vaultId].vault.pullVault(gitRequest);
    // } else {
    //   const vault = await this.createVault(vaultId);
    //   const vaultUrl = `http://0.0.0.0/${vaultId}`;
    //   const info = await git.getRemoteInfo({
    //     http: gitRequest,
    //     url: vaultUrl,
    //   });
    //   if (!info.refs) {
    //     // node does not have vault
    //     throw new errors.ErrorRemoteVaultUndefined(
    //       `${vaultId} does not exist on connected node ${nodeId}`,
    //     );
    //   }
    //   await git.clone({
    //     fs: vault.EncryptedFS,
    //     http: gitRequest,
    //     dir: path.join(this.vaultsPath, vaultId),
    //     url: vaultUrl,
    //     ref: 'master',
    //     singleBranch: true,
    //   });
    //   await this.writeVaultData();
    // }
  }

  /**
   * Retreieves the Vault instance
   *
   * @throws ErrorVaultUndefined if vaultName does not exist
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

  /* === Helpers === */

  /**
   * Writes encrypted vault data to disk. This includes encrypted
   * vault keys and names. The encryption is done using the root key
   */
  private async writeVaultData(): Promise<void> {
    const release = await this.metadataMutex.acquire();
    try {
      await this.leveldb.clear();

      for (const id in this.vaults) {
        const encryptedVaultKey = await this.keyManager.encryptWithRootKeyPair(
          this.vaults[id].vaultKey,
        );
        const stringifiedEncryptedKey = JSON.stringify(encryptedVaultKey);
        const vaultName = this.vaults[id].vaultName;
        await new Promise<void>((resolve) => {
          this.leveldb.put(id, {
            vaultName: vaultName,
            vaultKey: stringifiedEncryptedKey,
          });
          resolve();
        });
      }

      this.logger.info(`Wrote metadata at ${this.metadataPath}`);
    } catch (err) {
      release();
      throw err;
    }
    release();
  }

  /**
   * Puts a vaultname, and encrypted vault key into the leveldb
   * @param vaultName name of vault
   * @param vaultKey vault key.
   */
  private async putValueLeveldb(
    id: string,
    { vaultName, vaultKey }: { vaultName?: string; vaultKey?: Buffer },
  ): Promise<void> {
    const release = await this.metadataMutex.acquire();

    let encryptedVaultKey: undefined | string = undefined;
    if (vaultKey) {
      encryptedVaultKey = (
        await this.keyManager.encryptWithRootKeyPair(vaultKey)
      ).toString('binary');
    }

    let data = {
      vaultName: vaultName ?? '',
      vaultKey: encryptedVaultKey ?? '',
    };

    if (vaultName && encryptedVaultKey) {
      await new Promise<void>((resolve) => {
        this.leveldb.put(id, data);
        resolve();
      });
      release();
      return;
    }

    await new Promise<void>((resolve) => {
      this.leveldb.get(id, function (err, value) {
        if (err) {
          if (err.notFound) {
            release();
            throw new errors.ErrorVaults(
              'Vault does not yet exist, please specify both vaultName and vaultKey',
            );
          }
          release();
          throw err;
        }

        data = value;
        if (encryptedVaultKey) {
          data.vaultKey = encryptedVaultKey;
        }
        if (vaultName) {
          data.vaultName = vaultName;
        }
        resolve();
      });
    });

    if (data.vaultKey === '') {
      release();
      throw new errors.ErrorMalformedVaultDBValue(
        'Attempting to put an empty string as the vaultKey',
      );
    }
    if (data.vaultName === '') {
      release();
      throw new errors.ErrorMalformedVaultDBValue(
        'Attempting to put an empty string as the vaultName',
      );
    }

    await new Promise<void>((resolve) => {
      this.leveldb.put(id, data);
      resolve();
    });
    release();
  }

  /**
   * Deletes vault from metadata leveldb
   * @param vaultName name of vault to delete
   */
  private async deleteValueLeveldb(vaultId: string): Promise<void> {
    const release = await this.metadataMutex.acquire();

    await this.leveldb.del(vaultId);

    release();
  }

  /**
   * Load existing vaults data into memory from vault metadata path.
   * If metadata does not exist, does nothing.
   */
  private async loadVaultData(): Promise<void> {
    const release = await this.metadataMutex.acquire();
    try {
      this.logger.info(`Reading metadata from ${this.metadataPath}`);

      await new Promise<void>((resolve) => {
        this.leveldb
          .createReadStream()
          .on('data', async (data) => {
            const id = await data.key;
            const vaultMeta = data.value;
            const vaultKey = await this.keyManager.decryptWithRootKeyPair(
              Buffer.from(vaultMeta.vaultKey, 'binary'),
            );
            this.vaults[id] = {
              vault: new Vault({
                vaultId: id,
                vaultName: data.key,
                key: vaultKey,
                baseDir: this.vaultsPath,
                logger: this.logger,
              }),
              vaultName: vaultMeta.vaultName,
              vaultKey: vaultKey,
            };
          })
          .on('end', async () => {
            resolve();
          });
      });
    } catch (err) {
      release();
      throw err;
    }
    release();
  }
}

export default VaultManager;
