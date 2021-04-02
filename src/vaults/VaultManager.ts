import type { Vaults, VaultKeys } from './types';
import type { FileSystem } from '../types';
import type { NodeConnection } from '../nodes/types';

import path from 'path';
import level from 'level';
import { Mutex } from 'async-mutex';
import git from 'isomorphic-git';
import Logger from '@matrixai/logger';
import Vault from './Vault';
import * as utils from '../utils';
import * as errors from './errors';
import { generateVaultKey, fileExists } from './utils';
import { KeyManager } from '../keys';
import { GitFrontend } from '../git';

class VaultManager {
  public readonly baseDir: string;
  public readonly metadataPath: string;
  protected fs: FileSystem;
  protected leveldb;
  protected keyManager: KeyManager;
  protected logger: Logger;
  protected gitFrontend: GitFrontend;
  private vaults: Vaults;
  private vaultKeys: VaultKeys;
  private _started: boolean;

  // Concurrency for metadata
  private metadataMutex: Mutex = new Mutex();

  constructor({
    baseDir,
    keyManager,
    fs,
    logger,
  }: {
    baseDir: string;
    keyManager: KeyManager;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.baseDir = baseDir;
    this.metadataPath = path.join(this.baseDir, 'vaultKeys');
    this.keyManager = keyManager;
    this.fs = fs ?? require('fs/promises');
    this.logger = logger ?? new Logger('VaultManager');
    this.vaults = {};
    this.vaultKeys = {};
    this._started = false;

    // Git frontend
    const nodeConnection: NodeConnection = { placeholder: true };
    this.gitFrontend = new GitFrontend(() => nodeConnection);
  }

  public async start({ fresh = false }: { fresh?: boolean }) {
    await utils.mkdirExists(this.fs, this.baseDir, { recursive: true });
    await utils.mkdirExists(this.fs, this.metadataPath);
    this.leveldb = await level(this.metadataPath);
    await this.loadVaultData();
    this._started = true;
  }

  public async stop() {
    if (this.leveldb) {
      await this.leveldb.close();
    }
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
  public async addVault(vaultName: string): Promise<Vault> {
    if (this.vaults[vaultName]) {
      throw new errors.ErrorVaultDefined(`${vaultName} already exists`);
    }

    // generate a key
    const key = await generateVaultKey();
    const vault = new Vault({
      vaultName: vaultName,
      key: key,
      baseDir: this.baseDir,
    });
    vault.create();
    this.vaults[vaultName] = vault;
    this.vaultKeys[vaultName] = key;

    // write vault data
    await this.putValueLeveldb(vaultName, key);

    return vault;
  }

  /**
   * Rename an existing vault. Updates references to vault keys and
   * writes new encrypted vault metadata to disk.
   *
   * @throws ErrorVaultUndefined if vault currVaultName does not exist
   * @throws ErrorVaultDefined if newVaultName already exists
   * @param currVaultName Name of vault to be renamed
   * @param newVaultName New name of  vault
   * @returns true if success, false if the new vault path does not exist
   * or old vault path still exists
   */
  public async renameVault(
    currVaultName: string,
    newVaultName: string,
  ): Promise<boolean> {
    if (!this.vaults[currVaultName]) {
      throw new errors.ErrorVaultUndefined('vault does not exist');
    } else if (this.vaults[newVaultName]) {
      throw new errors.ErrorVaultDefined('new vault name already exists');
    }

    const vault = this.vaults[currVaultName];
    await vault.renameVault(newVaultName);

    // if old vault still exists or new vault does ot exist
    if (
      (await fileExists(this.fs, path.join(this.baseDir, currVaultName))) ||
      !(await fileExists(this.fs, path.join(this.baseDir, newVaultName)))
    ) {
      return false;
    }

    vault.vaultName = newVaultName;

    // update vaults
    this.vaults[newVaultName] = vault;
    delete this.vaults[currVaultName];

    // update vault keys
    this.vaultKeys[newVaultName] = this.vaultKeys[currVaultName];
    delete this.vaultKeys[currVaultName];

    await this.deleteValueLeveldb(currVaultName);
    await this.putValueLeveldb(newVaultName, this.vaultKeys[newVaultName]);

    return true;
  }

  /**
   * Delete an existing vault. Deletes file from filesystem and
   * updates mappings to vaults and vaultKeys. If it fails to delete
   * from the filesystem, it will not modify any mappings and reutrn false
   *
   * @throws ErrorVaultUndefined if vault name does not exist
   * @param vaultName Name of vault to be deleted
   * @returns true if successfil, false if vault path still exists
   */
  public async deleteVault(vaultName: string): Promise<boolean> {
    if (!this.vaults[vaultName]) {
      throw new errors.ErrorVaultUndefined(
        `vault name does not exist: '${vaultName}'`,
      );
    }
    // this is convenience function for removing all tags
    // and triggering garbage collection
    // destruction is a better word as we should ensure all traces are removed

    const vaultPath = path.join(this.baseDir, vaultName);
    // Remove directory on file system
    if (await fileExists(this.fs, vaultPath)) {
      await this.fs.rm(vaultPath, { recursive: true });
      this.logger.info(`Removed vault directory at '${vaultPath}'`);
    }

    if (await fileExists(this.fs, vaultPath)) {
      return false;
    }

    // Remove from mappings
    delete this.vaults[vaultName];
    delete this.vaultKeys[vaultName];

    await this.deleteValueLeveldb(vaultName);

    return true;
  }

  /**
   * Retrieve all the vaults for current node
   *
   * @returns Array of vault names managed currently by the vault manager
   */
  public listVaults(): Array<string> {
    const vaultNames: Array<string> = [];
    for (const vault in this.vaults) {
      vaultNames.push(vault);
    }
    return vaultNames;
  }

  /**
   * Retrieve all the vaults for a peers node
   *
   * @param nodeId identifier of node to scan vaults from
   * @returns a list of vault names from the connected node
   */
  public async scanNodeVaults(nodeId: string): Promise<Array<string>> {
    const gitRequest = this.gitFrontend.connectToNodeGit(nodeId);
    const vaultNameList = await gitRequest.scanVaults();
    return vaultNameList;
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
  public async pullVault(vaultName: string, nodeId: string): Promise<void> {
    if (this.vaults[vaultName]) {
      await this.vaults[vaultName].pullVault(nodeId);
    } else {
      const vault = await this.addVault(vaultName);
      const gitRequest = this.gitFrontend.connectToNodeGit(nodeId);
      const vaultUrl = `http://0.0.0.0/${vaultName}`;
      const info = await git.getRemoteInfo({
        http: gitRequest,
        url: vaultUrl,
      });

      if (!info.refs) {
        // node does not have vault
        throw new errors.ErrorRemoteVaultUndefined(
          `${vaultName} does not exist on connected node ${nodeId}`,
        );
      }

      await git.clone({
        fs: { promises: vault.EncryptedFS.promises },
        http: gitRequest,
        dir: path.join(this.baseDir, vaultName),
        url: vaultUrl,
        ref: 'master',
        singleBranch: true,
      });

      await this.writeVaultData();
    }
  }

  /**
   * Retreieves the Vault instance
   *
   * @throws ErrorVaultUndefined if vaultName does not exist
   * @param vaultName name of vault
   * @returns a vault instance.
   */
  public getVault(vaultName: string): Vault {
    if (!this.vaults[vaultName]) {
      throw new errors.ErrorVaultUndefined(`${vaultName} does not exist`);
    } else {
      return this.vaults[vaultName];
    }
  }

  /* === Helpers === */

  /**
   * Writes encrypted vault data to disk. This includes encrypted
   * vault keys and names. The encryption is done using the root key
   */
  private async writeVaultData(): Promise<void> {
    const release = await this.metadataMutex.acquire();

    await this.leveldb.clear();

    for (const vault in this.vaultKeys) {
      const encryptedVaultKey = await this.keyManager.encryptWithRootKeyPair(
        this.vaultKeys[vault],
      );
      await this.leveldb.put(vault, JSON.stringify(encryptedVaultKey));
    }

    this.logger.info(`Wrote metadata at ${this.metadataPath}`);

    release();
  }

  /**
   * Puts a vaultname, and encrypted vault key into the leveldb
   * @param vaultName name of vault
   * @param vaultKey vault key.
   */
  private async putValueLeveldb(
    vaultName: string,
    vaultKey: Buffer,
  ): Promise<void> {
    const release = await this.metadataMutex.acquire();

    const encryptedVaultKey = await this.keyManager.encryptWithRootKeyPair(
      vaultKey,
    );
    await this.leveldb.put(vaultName, encryptedVaultKey.toString('binary'));
    release();
  }

  /**
   * Deletes vault from metadata leveldb
   * @param vaultName name of vault to delete
   */
  private async deleteValueLeveldb(vaultName: string): Promise<void> {
    const release = await this.metadataMutex.acquire();

    await this.leveldb.del(vaultName);

    release();
  }

  /**
   * Load existing vaults data into memory from vault metadata path.
   * If metadata does not exist, does nothing.
   */
  private async loadVaultData(): Promise<void> {
    const release = await this.metadataMutex.acquire();

    this.logger.info(`Reading metadata from ${this.metadataPath}`);

    await new Promise<void>((resolve) => {
      this.leveldb
        .createReadStream()
        .on('data', async (data) => {
          const vaultName = await data.key;
          const vaultKey = await this.keyManager.decryptWithRootKeyPair(
            Buffer.from(data.value, 'binary'),
          );
          this.vaultKeys[vaultName] = vaultKey;
          this.vaults[vaultName] = new Vault({
            vaultName: data.key,
            key: vaultKey,
            baseDir: this.baseDir,
          });
        })
        .on('end', async () => {
          resolve();
        });
    });

    release();
  }
}

export default VaultManager;
