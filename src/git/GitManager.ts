import type { NodeId } from '../nodes/types';

import git from 'isomorphic-git';

import Logger from '@matrixai/logger';

import { VaultManager, errors as vaultsErrors } from '../vaults';
import { NodeManager, errors as nodesErrors } from '../nodes';
import { GitFrontend } from '.';

class GitManager {
  protected vaultManager: VaultManager;
  protected nodeManager: NodeManager;
  protected gitFrontend: GitFrontend;
  protected logger: Logger;

  /**
   * Construct a VaultManager object
   * @param vaultManager Vault Manager object
   * @param nodeManager Node Manager object
   */
  constructor({
    vaultManager,
    nodeManager,
    logger,
  }: {
    vaultManager: VaultManager;
    nodeManager: NodeManager;
    logger?: Logger;
  }) {
    this.logger = logger ?? new Logger(this.constructor.name);
    this.vaultManager = vaultManager;
    this.nodeManager = nodeManager;
    this.gitFrontend = new GitFrontend();
  }

  public async start() {
    if (!(await this.vaultManager.started())) {
      throw new vaultsErrors.ErrorVaultManagerNotStarted();
    }
    if (!(await this.nodeManager.started())) {
      throw new nodesErrors.ErrorNodeManagerNotStarted();
    }
  }

  public async stop() {}

  /**
   * Retrieve all the vaults for a peers node
   *
   * @param nodeId identifier of node to scan vaults from
   * @returns a list of vault names from the connected node
   */
  public async scanNodeVaults(nodeId: string): Promise<Array<string>> {
    const nodeAddress = await this.nodeManager.getNode(nodeId as NodeId);
    if (!nodeAddress) {
      throw new nodesErrors.ErrorNodeConnectionNotExist(
        'Node does not exist in node store',
      );
    }
    await this.nodeManager.createConnectionToNode(
      nodeId as NodeId,
      nodeAddress,
    );
    const client = this.nodeManager.getClient(nodeId as NodeId);
    const gitRequest = this.gitFrontend.connectToNodeGit(client);
    return await gitRequest.scanVaults();
  }

  /**
   * Pull a vault from another node, clones it if the vault does not already
   * exist locally
   *
   * @throws ErrorRemoteVaultUndefined if vaultName does not exist on
   * connected node
   * @param vaultId Id of vault
   * @param nodeId identifier of node to pull/clone from
   */
  public async cloneVault(vaultId: string, nodeId: string): Promise<void> {
    const nodeAddress = await this.nodeManager.getNode(nodeId as NodeId);
    if (!nodeAddress) {
      throw new nodesErrors.ErrorNodeConnectionNotExist(
        'Node does not exist in node store',
      );
    }
    this.nodeManager.createConnectionToNode(nodeId as NodeId, nodeAddress);
    const client = this.nodeManager.getClient(nodeId as NodeId);
    const gitRequest = this.gitFrontend.connectToNodeGit(client);
    const vaultUrl = `http://0.0.0.0/${vaultId}`;
    const info = await git.getRemoteInfo({
      http: gitRequest,
      url: vaultUrl,
    });
    if (!info.refs) {
      // node does not have vault
      throw new vaultsErrors.ErrorRemoteVaultUndefined(
        `${vaultId} does not exist on connected node ${nodeId}`,
      );
    }
    const list = await gitRequest.scanVaults();
    let vaultName;
    for (const elem in list) {
      const value = list[elem].split('\t');
      if (value[0] === vaultId) {
        vaultName = value[1];
        break;
      }
    }
    if (!vaultName) {
      throw new vaultsErrors.ErrorRemoteVaultUndefined(
        `${vaultId} does not exist on connected node ${nodeId}`,
      );
    } else if (this.vaultManager.getVaultIds(vaultName).length != 0) {
      this.logger.warn(
        `Vault name '${vaultName}' already exists, cloned into '${vaultName} copy' instead`,
      );
      vaultName += ' copy';
    }
    const vault = await this.vaultManager.createVault(vaultName);
    this.vaultManager.setLinkVault(vault.vaultId, vaultId);
    await git.clone({
      fs: vault.EncryptedFS,
      http: gitRequest,
      dir: vault.vaultId,
      url: vaultUrl,
      ref: 'master',
      singleBranch: true,
    });
  }

  public async pullVault(vaultId: string, nodeId: string): Promise<void> {
    // Strangely enough this is needed for pulls along with ref set to 'HEAD'
    // In isogit's documentation, this is just to get the currentBranch name
    // But it solves a bug whereby if not used, git.pull complains that it can't
    // find the master branch or HEAD
    const vault = this.vaultManager.getLinkVault(vaultId);
    if (!vault) {
      throw new vaultsErrors.ErrorVaultUnlinked(
        'Vault Id has not been cloned from remote repository',
      );
    }
    const branch = await git.currentBranch({
      fs: vault.EncryptedFS,
      dir: vault.vaultId,
      fullname: false,
    });
    if (branch !== 'master') {
      throw new vaultsErrors.ErrorVaultModified(
        'Modified repository can no longer pull changes',
      );
    }
    const vaultUrl = `http://0.0.0.0/${vaultId}`;
    const nodeAddress = await this.nodeManager.getNode(nodeId as NodeId);
    if (!nodeAddress) {
      throw new nodesErrors.ErrorNodeConnectionNotExist(
        'Node does not exist in node store',
      );
    }
    this.nodeManager.createConnectionToNode(nodeId as NodeId, nodeAddress);
    const client = this.nodeManager.getClient(nodeId as NodeId);
    const gitRequest = this.gitFrontend.connectToNodeGit(client);
    await git.pull({
      fs: vault.EncryptedFS,
      http: gitRequest,
      dir: vault.vaultId,
      url: vaultUrl,
      ref: 'HEAD',
      singleBranch: true,
      author: {
        name: vault.vaultId,
      },
    });
  }
}

export default GitManager;
