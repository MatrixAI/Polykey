import type { DB, DBLevel, DBOp } from '@matrixai/db';
import type {
  VaultId,
  VaultName,
  VaultMap,
  VaultPermissions,
  VaultKey,
} from '../types';
import type { FileSystem } from '../../types';
import type { WorkerManager } from '../../workers';
import type { NodeId } from '../../nodes/types';

import fs from 'fs';
import path from 'path';
import Logger from '@matrixai/logger';
import { Mutex } from 'async-mutex';
import Vault from './Vault';

import { KeyManager } from '../../keys';
import { NodeManager } from '../../nodes';
import { GestaltGraph } from '../../gestalts';
import { ACL } from '../../acl';
import { GitRequest } from '../../git';
import { agentPB } from '../../agent';

import * as utils from '../../utils';
import * as vaultsUtils from '../utils';
import * as vaultsErrors from '../errors';
import * as keysErrors from '../../keys/errors';
import * as gitErrors from '../../git/errors';
import * as nodesErrors from '../../nodes/errors';
import * as aclErrors from '../../acl/errors';
import * as gestaltErrors from '../../gestalts/errors';
import { errors as dbErrors } from '@matrixai/db';

type Vaults = {
  [vaultId: string]: Vault;
};

class VaultManager {
  public readonly vaultsPath: string;
  public readonly vaultsDbPath: string;

  protected fs: FileSystem;

  protected keyManager: KeyManager;
  protected nodeManager: NodeManager;
  protected db: DB;
  protected acl: ACL;
  protected gestaltGraph: GestaltGraph;

  protected vaultsDbDomain: string = this.constructor.name;
  protected vaultsKeysDbDomain: Array<string> = [this.vaultsDbDomain, 'keys'];
  protected vaultsNamesDbDomain: Array<string> = [this.vaultsDbDomain, 'names'];
  protected vaultsNodesDbDomain: Array<string> = [this.vaultsDbDomain, 'nodes'];
  protected vaultsDb: DBLevel;
  protected vaultsKeysDb: DBLevel;
  protected vaultsNamesDb: DBLevel;
  protected vaultsNodesDb: DBLevel;
  protected lock: Mutex = new Mutex();

  protected vaults: Vaults;
  protected logger: Logger;
  protected workerManager?: WorkerManager;

  protected _started: boolean;

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
    nodeManager,
    db,
    acl,
    gestaltGraph,
    fs,
    logger,
  }: {
    vaultsPath: string;
    keyManager: KeyManager;
    nodeManager: NodeManager;
    db: DB;
    acl: ACL;
    gestaltGraph: GestaltGraph;
    fs?: FileSystem;
    logger?: Logger;
  }) {
    this.vaultsPath = vaultsPath;
    this.vaultsDbPath = path.join(this.vaultsPath, 'vaultsDb');

    this.keyManager = keyManager;
    this.db = db;
    this.nodeManager = nodeManager;
    this.acl = acl;
    this.gestaltGraph = gestaltGraph;

    this.fs = fs ?? require('fs');

    this.vaults = {};
    this.logger = logger ?? new Logger(this.constructor.name);
    this._started = false;
  }

  // TODO: Add in node manager started in here (currently is a function not a getter)
  get started(): boolean {
    if (
      this._started &&
      !this.keyManager.destroyed &&
      this.db.running &&
      this.acl.destroyed &&
      this.gestaltGraph.destroyed
    ) {
      return true;
    }
    return false;
  }

  get locked(): boolean {
    return this.lock.isLocked();
  }

  public setWorkerManager(workerManager: WorkerManager): void {
    this.workerManager = workerManager;
    for (const vaultId in this.vaults) {
      this.vaults[vaultId].setWorkerManager(workerManager);
    }
  }

  public unsetWorkerManager(): void {
    delete this.workerManager;
    for (const vaultId in this.vaults) {
      this.vaults[vaultId].unsetWorkerManager();
    }
  }

  public async start({ fresh = false }: { fresh?: boolean }): Promise<void> {
    if (this.keyManager.destroyed) {
      throw new keysErrors.ErrorKeyManagerDestroyed();
    } else if (!this.db.running) {
      throw new dbErrors.ErrorDBNotRunning();
    } else if (!this.nodeManager.running) {
      throw new nodesErrors.ErrorNodeManagerNotStarted();
    } else if (this.acl.destroyed) {
      throw new aclErrors.ErrorACLDestroyed();
    } else if (this.gestaltGraph.destroyed) {
      throw new gestaltErrors.ErrorGestaltsGraphDestroyed();
    }
    this.logger.info('Starting Vault Manager');
    if (fresh) {
      await this.fs.promises.rm(this.vaultsPath, {
        force: true,
        recursive: true,
      });
      this.logger.info(`Removing vaults directory at '${this.vaultsPath}'`);
    }
    await utils.mkdirExists(this.fs, this.vaultsPath, { recursive: true });
    this.vaultsDb = await this.db.level(this.vaultsDbDomain);
    // Stores VaultId -> VaultKey
    this.vaultsKeysDb = await this.db.level(
      this.vaultsKeysDbDomain[1],
      this.vaultsDb,
    );
    // Stores VaultName -> VaultId
    this.vaultsNamesDb = await this.db.level(
      this.vaultsNamesDbDomain[1],
      this.vaultsDb,
    );
    // Stores VaultId -> NodeId
    this.vaultsNodesDb = await this.db.level(
      this.vaultsNodesDbDomain[1],
      this.vaultsDb,
    );
    if (fresh) {
      await this.vaultsDb.clear();
    }
    this._started = true;
    this.logger.info('Started Vault Manager');
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping Vault Manager');
    this._started = false;
    this.logger.info('Stopped Vault Manager');
  }

  /**
   * Run several operations within the same lock
   * This does not ensure atomicity of the underlying database
   * Database atomicity still depends on the underlying operation
   */
  public async transaction<T>(
    f: (vaultManager: VaultManager) => Promise<T>,
  ): Promise<T> {
    const release = await this.lock.acquire();
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
  public async _transaction<T>(f: () => Promise<T>): Promise<T> {
    if (this.lock.isLocked()) {
      return await f();
    } else {
      return await this.transaction(f);
    }
  }

  /**
   * Adds a new vault, given a vault name. Also generates a new vault key
   * and writes encrypted vault metadata to disk.
   *
   * @throws ErrorVaultDefined if vault with the same name already exists
   * @param vaultName Name of the new vault
   * @returns The newly created vault object
   */
  public async createVault(vaultName: VaultName): Promise<Vault> {
    // Generate a unique vault Id
    const vaultId = await this.generateVaultId();

    // Create the Vault instance and path
    await this.fs.promises.mkdir(path.join(this.vaultsPath, vaultId));
    this.logger.info(
      `Creating new vault directory at '${path.join(this.vaultsPath, vaultId)}`,
    );
    const vault = new Vault({
      vaultId: vaultId,
      vaultName: vaultName,
      baseDir: path.join(this.vaultsPath, vaultId),
      fs: fs,
      logger: this.logger,
    });

    // Generate the key and store the vault in memory and on disk
    const key = await vaultsUtils.generateVaultKey();
    await this.createVaultOps(vaultName, vaultId, key);
    await vault.start({ key: key });
    this.vaults[vaultId] = vault;
    return vault;
  }

  /**
   * Retreieves the Vault instance
   *
   * @throws ErrorVaultUndefined if vaultId does not exist
   * @param vaultId Id of vault
   * @returns a vault instance.
   */
  public async getVault(vaultId: VaultId): Promise<Vault> {
    // If the vault does not already exist in the memory map, set up the vault
    if (!this.vaults[vaultId]) {
      await this.setupVault(vaultId);
    }
    return this.vaults[vaultId];
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
    vaultId: VaultId,
    newVaultName: VaultName,
  ): Promise<boolean> {
    // If the vault does not already exist in the memory map, set up the vault
    if (!this.vaults[vaultId]) {
      await this.setupVault(vaultId);
    }
    const vault = this.vaults[vaultId];
    await this.renameVaultOps(vault.vaultName, newVaultName);
    await vault.renameVault(newVaultName);
    return true;
  }

  /**
   * Retreives stats for a vault
   *
   * @returns the stats of the vault directory
   */
  public async vaultStats(vaultId: VaultId): Promise<fs.Stats> {
    // If the vault does not already exist in the memory map, set up the vault
    if (!this.vaults[vaultId]) {
      await this.setupVault(vaultId);
    }
    const vault = this.vaults[vaultId];
    return await vault.stats();
  }

  /**
   * Delete an existing vault. Deletes file from filesystem and
   * updates mappings to vaults and vaultKeys. If it fails to delete
   * from the filesystem, it will not modify any mappings and reutrn false
   *
   * @throws ErrorVaultUndefined if vault name does not exist
   * @param vaultId Id of vault to be deleted
   * @returns true if successful delete, false if vault path still exists
   */
  public async deleteVault(vaultId: VaultId): Promise<boolean> {
    return await this._transaction(async () => {
      return await this.acl._transaction(async () => {
        // If the vault does not already exist in the memory map, set up the vault
        if (!this.vaults[vaultId]) {
          await this.setupVault(vaultId);
        }
        // Delete the vault state
        await this.vaults[vaultId].stop();
        const vaultPath = this.vaults[vaultId].baseDir;
        this.logger.info(`Removed vault directory at '${vaultPath}'`);

        // Return if the vault was not successfully deleted
        if (await vaultsUtils.fileExists(this.fs, vaultPath)) {
          return false;
        }
        // Remove vault from the database
        const name = this.vaults[vaultId].vaultName;
        await this.deleteVaultOps(name);

        // Remove vault permissions from the database
        await this.acl.unsetVaultPerms(vaultId);

        // Remove vault from in memory map
        delete this.vaults[vaultId];
        return true;
      });
    });
  }

  /**
   * Retrieve all the vaults for current node
   *
   * @returns Array of VaultName and VaultIds managed currently by the vault manager
   */
  public async listVaults(): Promise<VaultMap> {
    const vaults: VaultMap = new Map();
    // Read all vault objects from the database
    for await (const o of this.vaultsNamesDb.createReadStream({})) {
      const id = (o as any).value;
      const name = (o as any).key.toString() as string;
      const vaultId = await this.db.deserializeDecrypt<VaultId>(id, false);
      // vaults.push({
      //   name: name,
      //   id: vaultId,
      // });
    }
    return vaults;
  }

  /**
   * Gives vault id given the vault name
   * @param vaultName The Vault name
   * @returns the id that matches the given vault name. undefined if nothing is found
   */
  public async getVaultId(vaultName: VaultName): Promise<VaultId | undefined> {
    return await this.getVaultIdByVaultName(vaultName);
  }

  /**
   * Scans all the vaults for current node which a node Id has permissions for
   *
   * @returns Array of VaultName and VaultIds managed currently by the vault manager
   */
  public async scanVaults(nodeId: NodeId): Promise<VaultMap> {
    return await this.acl._transaction(async () => {
      // List all vaults
      const vaults = await this.listVaults();
      const scan: VaultMap = new Map();
      for (const vault of vaults) {
        // // Check if the vault has valid permissions
        // const list = await this.acl.getVaultPerm(vault.id);
        // if (list[nodeId]) {
        //   if (list[nodeId].vaults[vault.id]['pull'] !== undefined) {
        //     scan.push(vault);
        //   }
        // }
      }
      return scan;
    });
  }

  /**
   * Sets the default pull node of a vault
   *
   * @throws ErrorVaultUndefined if vaultId does not exist
   * @param vaultId Id of vault
   * @param linkVault Id of the cloned vault
   */
  public async setDefaultNode(vaultId: VaultId, nodeId: NodeId): Promise<void> {
    // If the vault does not already exist in the memory map, set up the vault
    if (!this.vaults[vaultId]) {
      await this.setupVault(vaultId);
    }
    await this.setVaultNodebyVaultId(vaultId, nodeId);
  }

  /**
   * Gets the Vault that is associated with a cloned Vault ID
   *
   * @throws ErrorVaultUndefined if vaultId does not exist
   * @param vaultId Id of vault that has been cloned
   * @returns instance of the vault that is linked to the cloned vault
   */
  public async getDefaultNode(vaultId: VaultId): Promise<NodeId | undefined> {
    return await this.getVaultNodeByVaultId(vaultId);
  }

  /**
   * Sets the permissions of a gestalt using a provided nodeId
   * This should take in a nodeId representing a gestalt, and remove
   * all permissions for all nodeIds that are associated in the gestalt graph
   *
   * @param nodeId Identifier for gestalt as NodeId
   * @param vaultId Id of the vault to set permissions for
   */
  public async setVaultPermissions(
    nodeId: NodeId,
    vaultId: VaultId,
  ): Promise<void> {
    return await this.gestaltGraph._transaction(async () => {
      return await this.acl._transaction(async () => {
        // Obtain the gestalt from the provided node
        const gestalt = await this.gestaltGraph.getGestaltByNode(nodeId);
        if (gestalt == null) {
          // Throw an error if the gestalt does not exist
          throw new gestaltErrors.ErrorGestaltsGraphNodeIdMissing();
        }
        // Set the vault permissions for each node in the gestalt
        const nodes = gestalt?.nodes;
        for (const node in nodes) {
          await this.setVaultAction([nodes[node].id], vaultId);
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
  public async unsetVaultPermissions(
    nodeId: NodeId,
    vaultId: VaultId,
  ): Promise<void> {
    return await this.gestaltGraph._transaction(async () => {
      return await this.acl._transaction(async () => {
        // Obtain the gestalt from the provided node
        const gestalt = await this.gestaltGraph.getGestaltByNode(nodeId);
        if (gestalt == null) {
          // If no gestalt for the given node is found, return
          return;
        }
        // Unset the vault permissions for each node in the gestalt
        const nodes = gestalt?.nodes;
        for (const node in nodes) {
          await this.unsetVaultAction([nodes[node].id], vaultId);
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
    vaultId: VaultId,
    nodeId?: NodeId,
  ): Promise<VaultPermissions> {
    return await this.acl._transaction(async () => {
      const record: VaultPermissions = {};
      // Get the permissions for the provided vault
      const perms = await this.acl.getVaultPerm(vaultId);

      // Set the return message based on the permissions for a node
      for (const node in perms) {
        if (nodeId && nodeId === node) {
          record[node] = perms[node].vaults[vaultId];
        } else if (nodeId == null) {
          record[node] = perms[node].vaults[vaultId];
        }
      }
      return record;
    });
  }

  /**
   * Clones a vault from another node
   *
   * @throws ErrorRemoteVaultUndefined if vaultName does not exist on
   * connected node
   * @throws ErrorNodeConnectionNotExist if the address of the node to connect to
   * does not exist
   * @throws ErrorRGitPermissionDenied if the node cannot access the desired vault
   * @param vaultId Id of remote vault
   * @param nodeId identifier of node to clone from
   */
  public async cloneVault(vaultId: VaultId, nodeId: NodeId): Promise<void> {
    // Create a connection to the specified node
    await this.nodeManager.getConnectionToNode(nodeId);
    const client = await this.nodeManager.getClient(nodeId);

    // Compile the vault Id
    const id = `${vaultsUtils.splitVaultId(vaultId)}:${nodeId}`;

    // Send a message to the connected agent to see if the clone can occur
    const vaultPermMessage = new agentPB.VaultPermMessage();
    vaultPermMessage.setNodeId(this.nodeManager.getNodeId());
    vaultPermMessage.setVaultId(id);
    const permission = await client.vaultsPermisssionsCheck(vaultPermMessage);
    if (permission.getPermission() === false) {
      // Throw an error if the permissions for the node are not valid
      throw new gitErrors.ErrorGitPermissionDenied();
    }

    // Create the handler for git to clone from
    const gitRequest = await vaultsUtils.constructGitHandler(
      client,
      this.nodeManager.getNodeId(),
    );

    // Search for the given vault Id and return the name
    const list = await gitRequest.scanVaults();
    let vaultName = '' as VaultName;
    // let vaultName = vaultsUtils.searchVaultName(list, vaultId);

    // Add ' copy' until the vault name is unique
    let valid = false;
    while (!valid) {
      if (await this.getVaultId(vaultName)) {
        this.logger.warn(
          `'${vaultName}' already exists, cloned into '${vaultName} copy'`,
        );
        // Add an extra string to avoid conflicts
        // vaultName += ' copy';
      } else {
        valid = true;
      }
    }

    // Clone the vault
    await this.cloneVaultOps(gitRequest, vaultName, vaultId, nodeId);

    // Set the default pulling node to the specified node Id
    await this.setDefaultNode(
      `${vaultsUtils.splitVaultId(
        vaultId,
      )}':'${this.nodeManager.getNodeId()}` as VaultId,
      nodeId,
    );
  }

  /**
   * Pulls a vault from another node
   *
   * @throws ErrorVaultUnlinked if the vault does not have an already cloned repo
   * @throws ErrorVaultModified if changes have been made to the local repo
   * @throws ErrorNodeConnectionNotExist if the address of the node to connect to
   * does not exist
   * @throws ErrorRGitPermissionDenied if the node cannot access the desired vault
   * @param vaultId Id of vault
   * @param nodeId identifier of node to clone from
   */
  public async pullVault(vaultId: VaultId, nodeId?: NodeId): Promise<void> {
    let node = nodeId;
    // If no nodeId was provided, obtain the default node
    if (nodeId == null) {
      node = await this.getDefaultNode(vaultId);
    }
    if (node == null) {
      // Throw an error if a linked vault cannot be found for the vault
      throw new vaultsErrors.ErrorVaultUnlinked(
        'Vault Id has not been cloned from remote repository',
      );
    }

    // Create a connection to the specified node
    await this.nodeManager.getConnectionToNode(node);
    const client = await this.nodeManager.getClient(node);

    // Compile the vault Id
    const id = `${vaultsUtils.splitVaultId(vaultId)}:${node}` as VaultId;

    // Send a message to the connected agent to see if the pull can occur
    const vaultPermMessage = new agentPB.VaultPermMessage();
    vaultPermMessage.setNodeId(this.nodeManager.getNodeId());
    vaultPermMessage.setVaultId(id);
    const permission = await client.vaultsPermisssionsCheck(vaultPermMessage);
    if (permission.getPermission() === false) {
      // Throw an error if the permissions for the node are not valid
      throw new gitErrors.ErrorGitPermissionDenied();
    }

    // Create the handler for git to pull from
    const gitRequest = await vaultsUtils.constructGitHandler(
      client,
      this.nodeManager.getNodeId(),
    );

    // Obtain a list of the remote vaults and throw an error if the desired vault is undefined
    const list = await gitRequest.scanVaults();
    // vaultsUtils.searchVaultName(list, id);

    // Pull the vault
    const vault = await this.getVault(vaultId);
    await vault.pullVault(gitRequest, node);

    // Set the default pulling node to the specified node Id
    await this.setDefaultNode(vaultId, node);
  }

  /**
   * Returns a generator that yields the names of the vaults
   */
  public async *handleVaultNamesRequest(
    nodeId: NodeId,
  ): AsyncGenerator<Uint8Array> {
    // Obtain a list of all vaults
    const vaults = await this.scanVaults(nodeId);
    for (const vault in vaults) {
      // Yield each vault Id and name
      yield Buffer.from(`${vaults[vault].name}\t${vaults[vault].id}`);
    }
  }

  /* === Helpers === */
  /**
   * Generates a vault Id that is unique
   * @throws If a unique Id cannot be made after 50 attempts
   */
  protected async generateVaultId(): Promise<VaultId> {
    // While the vault Id is not unique, generate a new Id
    let vaultId = vaultsUtils.generateVaultId(this.nodeManager.getNodeId());
    let i = 0;
    while (1) {
      try {
        await this.getVault(vaultId);
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
    return vaultId;
  }

  /**
   * Creates an empty vault that can be cloned into
   *
   * @throws ErrorVaultDefined if vault with the same name already exists
   * @param vaultName Name of the new vault
   * @returns The newly created vault object
   */
  protected async cloneVaultOps(
    gitHandler: GitRequest,
    vaultName: VaultName,
    vaultId: VaultId,
    nodeId: NodeId,
  ): Promise<void> {
    // Compile the new vaultId with the current node Id appended
    const newVaultId = `${vaultsUtils.splitVaultId(
      vaultId,
    )}:${this.nodeManager.getNodeId()}` as VaultId;

    // Create the Vault instance and path
    await this.fs.promises.mkdir(path.join(this.vaultsPath, newVaultId));
    const vault = new Vault({
      vaultId: newVaultId,
      vaultName: vaultName,
      baseDir: path.join(this.vaultsPath, newVaultId),
      fs: fs,
      logger: this.logger,
    });
    this.logger.info(`Created empty vault at '${vault.baseDir}'`);

    // Generate the key and store the vault in memory and on disk
    const key = await vaultsUtils.generateVaultKey();
    await this.createVaultOps(vaultName, newVaultId, key);
    this.vaults[newVaultId] = vault;

    // Clone into the vault
    await vault.cloneVault(gitHandler, key, nodeId);
  }

  /**
   * Renames an existing vault name to a new vault name
   * If the existing vault name doesn't exist, nothing will change
   */
  protected async renameVaultOps(
    vaultName: VaultName,
    newVaultName: VaultName,
  ): Promise<void> {
    await this._transaction(async () => {
      const vaultId = await this.db.get<VaultId>(
        this.vaultsNamesDbDomain,
        vaultName,
      );
      if (vaultId == null) {
        return;
      }
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
    });
  }

  /**
   * Puts a new vault and the vault Id into the db
   */
  protected async createVaultOps(
    vaultName: VaultName,
    vaultId: VaultId,
    vaultKey: VaultKey,
  ): Promise<void> {
    await this._transaction(async () => {
      const existingId = await this.db.get<VaultId>(
        this.vaultsNamesDbDomain,
        vaultName,
      );
      if (existingId != null) {
        // Throw an error if the vault name already exists
        throw new vaultsErrors.ErrorVaultDefined(
          'Vault Name already exists in Polykey, specify a new Vault Name',
        );
      }
      const ops: Array<DBOp> = [
        {
          type: 'put',
          domain: this.vaultsNamesDbDomain,
          key: vaultName,
          value: vaultId,
        },
        {
          type: 'put',
          domain: this.vaultsKeysDbDomain,
          key: vaultId,
          value: vaultKey,
        },
      ];
      await this.db.batch(ops);
    });
  }

  /**
   * Deletes a vault using an existing vault name
   * If the existing vault name doesn't exist, nothing will change
   */
  protected async deleteVaultOps(vaultName: VaultName): Promise<void> {
    await this._transaction(async () => {
      const vaultId = await this.db.get<VaultId>(
        this.vaultsNamesDbDomain,
        vaultName,
      );
      if (vaultId == null) {
        return;
      }
      const ops: Array<DBOp> = [
        {
          type: 'del',
          domain: this.vaultsNamesDbDomain,
          key: vaultName,
        },
        {
          type: 'del',
          domain: this.vaultsKeysDbDomain,
          key: vaultId,
        },
        {
          type: 'del',
          domain: this.vaultsNodesDbDomain,
          key: vaultId,
        },
      ];
      await this.db.batch(ops);
    });
  }

  protected async setupVault(vaultId: VaultId) {
    return await this._transaction(async () => {
      let vaultName = '' as VaultName;

      // Obtain the vault information form the database
      for await (const o of this.vaultsNamesDb.createReadStream({})) {
        const vId = (o as any).value;
        const name = (o as any).key as VaultName;
        const id = await this.db.deserializeDecrypt<VaultId>(vId, false);
        if (vaultId === id) {
          vaultName = name;
          break;
        }
      }
      if (vaultName === '') {
        // Throw an error if the vault name does not exist
        throw new vaultsErrors.ErrorVaultUndefined();
      }

      // Obtain the vault key from the database
      const vaultKey = await this.getVaultKeyByVaultId(vaultId);
      if (vaultKey == null) {
        // Throw an error if the vault key does not exist
        throw new vaultsErrors.ErrorVaultUndefined();
      }

      // Construct and start the vault
      this.vaults[vaultId] = new Vault({
        vaultId: vaultId,
        vaultName: vaultName,
        baseDir: path.join(this.vaultsPath, vaultId),
        fs: fs,
        logger: this.logger,
      });
      this.vaults[vaultId].start({ key: vaultKey });
    });
  }

  /**
   * Gets the vault id for a given vault name
   */
  protected async getVaultIdByVaultName(
    vaultName: VaultName,
  ): Promise<VaultId | undefined> {
    return await this._transaction(async () => {
      const vaultId = await this.db.get<VaultId>(
        this.vaultsNamesDbDomain,
        vaultName,
      );
      if (vaultId == null) {
        return;
      }
      return vaultId;
    });
  }

  /**
   * Gets the vault key for a given vault id
   */
  protected async getVaultKeyByVaultId(
    vaultId: VaultId,
  ): Promise<VaultKey | undefined> {
    return await this._transaction(async () => {
      const vaultKey = await this.db.get<VaultKey>(
        this.vaultsKeysDbDomain,
        vaultId,
      );
      if (vaultKey == null) {
        return;
      }
      return vaultKey;
    });
  }

  /**
   * Gets the vault link for a given vault id
   */
  protected async getVaultNodeByVaultId(
    vaultId: VaultId,
  ): Promise<NodeId | undefined> {
    return await this._transaction(async () => {
      const vaultLink = await this.db.get<NodeId>(
        this.vaultsNodesDbDomain,
        vaultId,
      );
      if (vaultLink == null) {
        return;
      }
      return vaultLink;
    });
  }

  /**
   * Sets the default node Id to pull from for a vault Id
   */
  protected async setVaultNodebyVaultId(
    vaultId: VaultId,
    vaultNode: NodeId,
  ): Promise<void> {
    await this._transaction(async () => {
      await this.db.put(this.vaultsNodesDbDomain, vaultId, vaultNode);
    });
  }

  /**
   * Gives pulling permissions for a vault to one or more nodes
   *
   * @param nodeIds Id(s) of the nodes to share with
   * @param vaultId Id of the vault that the permissions are for
   */
  protected async setVaultAction(
    nodeIds: NodeId[],
    vaultId: VaultId,
  ): Promise<void> {
    return await this.acl._transaction(async () => {
      for (const nodeId of nodeIds) {
        try {
          await this.acl.setVaultAction(vaultId, nodeId, 'pull');
        } catch (err) {
          if (err instanceof aclErrors.ErrorACLNodeIdMissing) {
            await this.acl.setNodePerm(nodeId, {
              gestalt: {
                notify: null,
              },
              vaults: {},
            });
            await this.acl.setVaultAction(vaultId, nodeId, 'pull');
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
  protected async unsetVaultAction(
    nodeIds: NodeId[],
    vaultId: VaultId,
  ): Promise<void> {
    return await this.acl._transaction(async () => {
      for (const nodeId of nodeIds) {
        try {
          await this.acl.unsetVaultAction(vaultId, nodeId, 'pull');
        } catch (err) {
          if (err instanceof aclErrors.ErrorACLNodeIdMissing) {
            return;
          }
        }
      }
    });
  }
}

export default VaultManager;
