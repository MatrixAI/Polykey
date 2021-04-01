import type { NodeConnection } from '../nodes/types';
import GitRequest from './GitRequest';
import Logger from '@matrixai/logger';

/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific node.
 */
class GitFrontend {
  private connectToNode: (nodeId: string) => NodeConnection;
  private logger: Logger;

  constructor(
    connectToNode: (nodeId: string) => NodeConnection,
    logger?: Logger,
  ) {
    this.connectToNode = connectToNode;
    this.logger = logger ?? new Logger('GitFrontend');
  }

  /**
   * Requests remote info from the connected node for the named vault.
   * @param vaultName Name of the desired vault
   * @param nodeConnection A connection object to the node
   */
  private async requestInfo(
    vaultName: string,
    nodeConnection: NodeConnection,
  ): Promise<Uint8Array> {
    return new Uint8Array(1);
  }

  /**
   * Requests a pack from the connected node for the named vault.
   * @param vaultName Name of the desired vault
   * @param body Contains the pack request
   * @param nodeConnection A connection object to the node
   */
  private async requestPack(
    vaultName: string,
    body: Uint8Array,
    nodeConnection: NodeConnection,
  ): Promise<Uint8Array> {
    return new Uint8Array(1);
  }

  /**
   * Requests a pack from the connected node for the named vault.
   * @param vaultName Name of the desired vault
   * @param body Contains the pack request
   * @param nodeConnection A connection object to the node
   */
  private async requestVaultNames(
    nodeConnection: NodeConnection,
  ): Promise<string[]> {
    return [''];
  }

  connectToNodeGit(nodeId: string): GitRequest {
    const nodeConnection = this.connectToNode(nodeId);
    const gitRequest = new GitRequest(
      ((vaultName: string) => this.requestInfo(vaultName, nodeConnection)).bind(
        this,
      ),
      ((vaultName: string, body: Buffer) =>
        this.requestPack(vaultName, body, nodeConnection)).bind(this),
      (() => this.requestVaultNames(nodeConnection)).bind(this),
    );
    return gitRequest;
  }
}

export default GitFrontend;
