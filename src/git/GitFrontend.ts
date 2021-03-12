import GitRequest from './GitRequest';
import { promisifyGrpc } from '../bin/utils';
import * as nodeInterface from '../proto/js/Node_pb';
import * as agentInterface from '../proto/js/Agent_pb';
import NodeConnection from '../nodes/node-connection/NodeConnection';
import Logger from '@matrixai/logger';

/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific node.
 */
class GitFrontend {
  private connectToNode: (nodeId: string) => NodeConnection;
  private logger: Logger;

  constructor(
    connectToNode: (nodeId: string) => NodeConnection,
    logger: Logger,
  ) {
    this.connectToNode = connectToNode;
    this.logger = logger;
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
    const client = await nodeConnection.getNodeClient();
    const request = new nodeInterface.InfoRequest();
    request.setVaultName(vaultName);
    const response = (await promisifyGrpc(client.getGitInfo.bind(client))(
      request,
    )) as nodeInterface.InfoReply;
    return response.getBody_asU8();
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
    const client = await nodeConnection.getNodeClient();
    const request = new nodeInterface.PackRequest();
    request.setVaultName(vaultName);
    request.setBody(body);
    const response = (await promisifyGrpc(client.getGitPack.bind(client))(
      request,
    )) as nodeInterface.PackReply;
    return response.getBody_asU8();
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
    const client = await nodeConnection.getNodeClient();
    const request = new agentInterface.EmptyMessage();
    const response = (await promisifyGrpc(client.getVaultNames.bind(client))(
      request,
    )) as nodeInterface.VaultNamesReply;
    return response.getVaultNameListList();
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
