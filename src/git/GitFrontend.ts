import * as grpc from '@grpc/grpc-js';
import Logger from '@matrixai/logger';

import { GitRequest } from '.';
import { promisify } from '../utils';
import { AgentClient } from '../proto/js/Agent_grpc_pb';

import * as grpcUtils from '../grpc/utils';
import * as agentPB from '../proto/js/Agent_pb';

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
   * @returns Async Generator of Uint8Arrays representing the Info Response
   */
  private async *requestInfo(
    vaultName: string,
    client: AgentClient,
  ): AsyncGenerator<Uint8Array> {
    const serverStream = grpcUtils.promisifyReadableStreamCall<agentPB.PackChunk>(
      client,
      client.getGitInfo,
    );
    const request = new agentPB.InfoRequest();
    request.setVaultName(vaultName);
    const response = serverStream(request);

    for await (const resp of response) {
      yield resp.getChunk_asU8();
    }
  }

  /**
   * Requests a pack from the connected node for the named vault
   * @param vaultName name of vault
   * @param body contains the pack request
   * @param client AgentClient
   * @returns AsyncGenerator of Uint8Arrays representing the Pack Response
   */
  private async *requestPack(
    vaultName: string,
    body: any,
    client: AgentClient,
  ): AsyncGenerator<Uint8Array> {
    const responseBuffers: Array<Buffer> = [];

    const meta = new grpc.Metadata();
    meta.set('vault-name', vaultName);

    const stream = client.getGitPack(meta);
    const write = promisify(stream.write).bind(stream);

    stream.on('data', (d) => {
      responseBuffers.push(d.getChunk_asU8());
    });

    const chunk = new agentPB.PackChunk();
    chunk.setChunk(body);
    write(chunk);
    stream.end();

    yield await new Promise<Uint8Array>((resolve) => {
      stream.once('end', () => {
        resolve(Buffer.concat(responseBuffers));
      });
    });
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
