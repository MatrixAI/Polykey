import type { VaultId, Vaults, VaultAction } from './types';
import type { FileSystem } from '../types';
import type { WorkerManager } from '../workers';
import { NodeId } from '../nodes/types';

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
import { GestaltGraph } from '../gestalts';
import { ACL } from '../acl';
import { DB } from '../db';

import * as utils from '../utils';
import * as errors from './errors';
import * as aclErrors from '../acl/errors';

class VaultManager {
  public readonly vaultsPath: string;
  public readonly metadataPath: string;
  protected acl: ACL;
  protected gestaltGraph: GestaltGraph;
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
    db,
    acl,
    gestaltGraph,
    fs,
    logger,
  }: {
    vaultsPath: string;
    keyManager: KeyManager;
    db: DB;
    acl: ACL;
    gestaltGraph: GestaltGraph;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.vaultsPath = vaultsPath;
    this.metadataPath = path.join(this.vaultsPath, 'vaultMeta');
    this.keyManager = keyManager;
    this.acl = acl;
    this.gestaltGraph = gestaltGraph;
    this.fs = fs ?? require('fs');
    this.logger = logger ?? new Logger('VaultManager');
    this.vaults = {};
    this._started = false;
    this.vaultMap = new VaultMap({
      db: db,
      vaultMapPath: this.vaultsPath,
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

    // write vault data
    await this.vaultMap.setVault(vaultName, id as VaultId, key);

    const vault = new Vault({
      vaultId: id,
      vaultName: vaultName,
      key: key,
      baseDir: this.vaultsPath,
      logger: this.logger,
    });
    vault.create();
    this.vaults[id] = { vault: vault, vaultKey: key, vaultName: vaultName };

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
    return await this.acl._transaction(async () => {
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

      await this.acl.unsetVaultPerms(vault.vaultId as VaultId);

      return true;
    });
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
   * Scans all the vaults for current node which a node Id has permissions for
   *
   * @returns Array of VaultName and VaultIds managed currently by the vault manager
   */
  public async scanVaults(
    nodeId: string,
  ): Promise<Array<{ name: string; id: string }>> {
    return await this.acl._transaction(async () => {
      const vaults: Array<{ name: string; id: string }> = [];
      for (const id in this.vaults) {
        const list = await this.acl.getVaultPerm(id as VaultId);
        if (list[nodeId]) {
          if (list[nodeId].vaults[id]['pull'] !== undefined) {
            vaults.push({
              name: this.vaults[id].vaultName,
              id: id,
            });
          }
        }
      }
      return vaults;
    });
  }

  /**
   * Gives vault id given the vault name
   * @param vaultName The Vault name
   * @returns the id that matches the given vault name. undefined if nothing is found
   */
  public getVaultId(vaultName: string): string | undefined {
    for (const id in this.vaults) {
      if (vaultName === this.vaults[id].vaultName) {
        return id;
      }
    }
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

  /**
   * Gives pulling permissions for a vault to one or more nodes
   *
   * @param nodeIds Id(s) of the nodes to share with
   * @param vaultId Id of the vault that the permissions are for
   */
  private async setVaultAction(
    nodeIds: string[],
    vaultId: string,
  ): Promise<void> {
    return await this.acl._transaction(async () => {
      for (const nodeId of nodeIds) {
        try {
          await this.acl.setVaultAction(
            vaultId as VaultId,
            nodeId as NodeId,
            'pull',
          );
        } catch (err) {
          if (err instanceof aclErrors.ErrorACLNodeIdMissing) {
            await this.acl.setNodePerm(nodeId as NodeId, {
              gestalt: {
                notify: null,
              },
              vaults: {},
            });
            await this.acl.setVaultAction(
              vaultId as VaultId,
              nodeId as NodeId,
              'pull',
            );
          }
        }
      }
    });
  }

  /**
   * Removes pulling permissions for a vault for one or more nodes
   *
   * @param nodeIds Id(s) of the nodes to remove permissions from
   * @param vaultId Id of the vault that the permissions are for
   */
  private async unsetVaultAction(
    nodeIds: string[],
    vaultId: string,
  ): Promise<void> {
    return await this.acl._transaction(async () => {
      for (const nodeId of nodeIds) {
        try {
          await this.acl.unsetVaultAction(
            vaultId as VaultId,
            nodeId as NodeId,
            'pull',
          );
        } catch (err) {
          if (err instanceof aclErrors.ErrorACLNodeIdMissing) {
            return;
          }
        }
      }
    });
  }

  /**
   * Sets the permissions of a gestalt using a provided nodeId
   * This should take in a nodeId representing a gestalt, and remove
   * all permissions for all nodeIds that are associated in the gestalt graph
   *
   * @param nodeId Identifier for gestalt as NodeId
   * @param vaultId Id of the vault to set permissions for
   */
  public async setVaultPerm(nodeId: string, vaultId: string): Promise<void> {
    return await this.gestaltGraph._transaction(async () => {
      return await this.acl._transaction(async () => {
        const gestalt = await this.gestaltGraph.getGestaltByNode(
          nodeId as NodeId,
        );
        const nodes = gestalt?.nodes;
        for (const node in nodes) {
          await this.setVaultAction([nodes[node].id], vaultId as VaultId);
        }
      });
    });
  }

  /**
   * Unsets the permissions of a gestalt using a provided nodeId
   * This should take in a nodeId representing a gestalt, and remove
   * all permissions for all nodeIds that are associated in the gestalt graph
   *
   * @param nodeId Identifier for gestalt as NodeId
   * @param vaultId Id of the vault to unset permissions for
   */
  public async unsetVaultPerm(nodeId: string, vaultId: string): Promise<void> {
    return await this.gestaltGraph._transaction(async () => {
      return await this.acl._transaction(async () => {
        const gestalt = await this.gestaltGraph.getGestaltByNode(
          nodeId as NodeId,
        );
        const nodes = gestalt?.nodes;
        for (const node in nodes) {
          await this.unsetVaultAction([nodes[node].id], vaultId as VaultId);
        }
      });
    });
  }

  /**
   * Gets the permissions of a vault for a single or all nodes
   *
   * @param nodeId Id of the specific node to look up permissions for
   * @param vaultId Id of the vault to look up permissions for
   * @returns a record of the permissions for the vault
   */
  public async getVaultPermissions(
    vaultId: string,
    nodeId?: string,
  ): Promise<Record<NodeId, VaultAction>> {
    return await this.acl._transaction(async () => {
      const record: Record<NodeId, VaultAction> = {};
      const perms = await this.acl.getVaultPerm(vaultId as VaultId);
      for (const node in perms) {
        if (nodeId && nodeId === node) {
          record[node] = perms[node].vaults[vaultId];
        } else if (!nodeId) {
          record[node] = perms[node].vaults[vaultId];
        }
      }
      return record;
    });
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
