import type { TLSConfig } from '../network/types';

import * as agentErrors from './errors';
import { GRPCClient, utils as grpcUtils } from '../grpc';
import * as agentPB from '../proto/js/Agent_pb';
import { AgentClient } from '../proto/js/Agent_grpc_pb';

/**
 * GRPC Agent Endpoints.
 */
class GRPCClientAgent extends GRPCClient<AgentClient> {
  public async start({
    tlsConfig,
    timeout = Infinity,
  }: {
    tlsConfig?: TLSConfig;
    timeout?: number;
  } = {}): Promise<void> {
    await super.start({
      clientConstructor: AgentClient,
      tlsConfig,
      timeout,
    });
  }

  public echo(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.EchoMessage>(
      this.client,
      this.client.echo,
    )(...args);
  }

  public getGitInfo(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<agentPB.PackChunk>(
      this.client,
      this.client.getGitInfo,
    )(...args);
  }

  public getGitPack(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return this.client.getGitPack(...args);
  }

  public scanVaults(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<agentPB.VaultListMessage>(
      this.client,
      this.client.scanVaults,
    )(...args);
  }

  public getNodeDetails(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.NodeDetailsMessage>(
      this.client,
      this.client.getNodeDetails,
    )(...args);
  }

  public getClosestLocalNodes(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.NodeTableMessage>(
      this.client,
      this.client.getClosestLocalNodes,
    )(...args);
  }

  public getClaims(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.ClaimsMessage>(
      this.client,
      this.client.getClaims,
    )(...args);
  }

  public getChainData(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.ChainDataMessage>(
      this.client,
      this.client.getChainData,
    )(...args);
  }

  public sendHolePunchMessage(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.EmptyMessage>(
      this.client,
      this.client.sendHolePunchMessage,
    )(...args);
  }

  public notificationsSend(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.NotificationMessage>(
      this.client,
      this.client.notificationsSend,
    )(...args);
  }

  public checkVaultPermissions(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.PermissionMessage>(
      this.client,
      this.client.checkVaultPermisssions,
    )(...args);
  }
}

export default GRPCClientAgent;
