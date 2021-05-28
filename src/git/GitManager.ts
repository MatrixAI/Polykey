import type { NodeId } from '../nodes/types';

import git from 'isomorphic-git';

import { VaultManager, errors as vaultsErrors } from '../vaults';
import { NodeManager, errors as nodesErrors } from '../nodes';
import { GitFrontend } from '.';

class GitManager {
  protected vaultManager: VaultManager;
  protected nodeManager: NodeManager;
  protected gitFrontend: GitFrontend;

  /**
   * Construct a VaultManager object
   * @param vaultManager Vault Manager object
   * @param nodeManager Node Manager object
   */
  constructor({
    vaultManager,
    nodeManager,
  }: {
    vaultManager: VaultManager;
    nodeManager: NodeManager;
  }) {
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
   * @param vaultName name of vault
   * @param nodeId identifier of node to pull/clone from
   */
  public async cloneVault(vaultName: string, nodeId: string): Promise<void> {
    if (this.vaultManager.getVaultIds(vaultName).length != 0) {
      throw new vaultsErrors.ErrorVaultDefined(
        'Vault name already exists locally, try pulling instead',
      );
    }
    const nodeAddress = await this.nodeManager.getNode(nodeId as NodeId);
    if (!nodeAddress) {
      throw new nodesErrors.ErrorNodeConnectionNotExist(
        'Node does not exist in node store',
      );
    }
    this.nodeManager.createConnectionToNode(nodeId as NodeId, nodeAddress);
    const client = this.nodeManager.getClient(nodeId as NodeId);
    const gitRequest = this.gitFrontend.connectToNodeGit(client);
    const vaultUrl = `http://0.0.0.0/${vaultName}`;
    const info = await git.getRemoteInfo({
      http: gitRequest,
      url: vaultUrl,
    });
    if (!info.refs) {
      // node does not have vault
      throw new vaultsErrors.ErrorRemoteVaultUndefined(
        `${vaultName} does not exist on connected node ${nodeId}`,
      );
    }
    const vault = await this.vaultManager.createVault(vaultName);
    await git.clone({
      fs: vault.EncryptedFS,
      http: gitRequest,
      dir: vault.vaultId,
      url: vaultUrl,
      ref: 'master',
      singleBranch: true,
    });
  }

  public async pullVault(vaultName: string, nodeId: string): Promise<void> {
    // Strangely enough this is needed for pulls along with ref set to 'HEAD'
    // In isogit's documentation, this is just to get the currentBranch name
    // But it solves a bug whereby if not used, git.pull complains that it can't
    // find the master branch or HEAD
    const vaultId = this.vaultManager.getVaultIds(vaultName);
    if (this.vaultManager.getVaultIds(vaultName).length == 0) {
      throw new vaultsErrors.ErrorVaultUndefined(
        'Vault name does not exist, try cloning instead',
      );
    }
    const vault = this.vaultManager.getVault(vaultId[0]);
    let branch;
    try {
      branch = await git.currentBranch({
        fs: vault.EncryptedFS,
        dir: vault.vaultId,
        fullname: false,
      });
    } catch (err) {
      throw new vaultsErrors.ErrorVaultUnlinked(
        'Vault has not been cloned from a remote repository',
      );
    }
    if (branch !== 'master') {
      throw new vaultsErrors.ErrorVaultModified(
        'Modified repository can no longer pull changes',
      );
    }
    const vaultUrl = `http://0.0.0.0/${vaultName}`;
    // First pull
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
