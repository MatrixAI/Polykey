import GitRequest from './GitRequest';
import Logger from '@matrixai/logger';

import { AgentClient } from '../../src/proto/js/Agent_grpc_pb';

import * as grpcUtils from '../../src/grpc/utils';
import * as agentPB from '../../src/proto/js/Agent_pb';

/**
 * Responsible for converting HTTP messages from isomorphic-git into requests and sending them to a specific node.
 */
class GitFrontend {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? new Logger('GitFrontend');
  }

  /**
   * Requests remote info from the connected node for the named vault.
   * @param vaultName Name of the desired vault
   * @param nodeConnection A connection object to the node
   */
  private async requestInfo(
    vaultName: string,
    client: AgentClient,
  ): Promise<Buffer> {
    const serverStream = grpcUtils.promisifyReadableStreamCall<agentPB.PackChunk>(
      client,
      client.getGitInfo,
    );
    const request = new agentPB.InfoRequest();
    request.setVaultName(vaultName);
    const response = serverStream(request);

    const data: Buffer[] = [];
    for await (const resp of response) {
      const chunk = resp.getChunk_asU8();
      data.push(Buffer.from(chunk));
    }

    return Buffer.concat(data);
  }

  /**
   * Requests a pack from the connected node for the named vault.
   * @param vaultName Name of the desired vault
   * @param body Contains the pack request
   * @param nodeConnection A connection object to the node
   */
  private async requestPack(
    vaultName: string,
    body: any,
    client: AgentClient,
  ): Promise<Uint8Array> {
    const serverStream = grpcUtils.promisifyReadableStreamCall<agentPB.PackChunk>(
      client,
      client.getGitPackStream,
    );
    const request = new agentPB.PackRequest();
    request.setVaultName(vaultName);
    request.setBody(body);
    const response = serverStream(request);

    const data: Buffer[] = [];
    for await (const resp of response) {
      const chunk = resp.getChunk_asU8();
      data.push(Buffer.from(chunk));
    }

    return Buffer.concat(data);
  }

  /**
   * Requests a pack from the connected node for the named vault.
   * @param vaultName Name of the desired vault
   * @param body Contains the pack request
   * @param nodeConnection A connection object to the node
   */
  private async requestVaultNames(client: AgentClient): Promise<string[]> {
    const serverStream = grpcUtils.promisifyReadableStreamCall<agentPB.PackChunk>(
      client,
      client.scanVaults,
    );
    const request = new agentPB.EmptyMessage();
    const response = serverStream(request);

    const data: string[] = [];
    for await (const resp of response) {
      const chunk = resp.getChunk_asU8();
      data.push(Buffer.from(chunk).toString());
    }

    return data;
  }

  /**
   * Creates a GitRequest object from the desired node connection.
   * @param client GRPC connection to desired node
   */
  connectToNodeGit(client: AgentClient): GitRequest {
    const gitRequest = new GitRequest(
      ((vaultName: string) => this.requestInfo(vaultName, client)).bind(this),
      ((vaultName: string, body: any) =>
        this.requestPack(vaultName, body, client)).bind(this),
      (() => this.requestVaultNames(client)).bind(this),
    );
    return gitRequest;
  }
}

export default GitFrontend;
