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

  public vaultsGitInfoGet(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<agentPB.PackChunk>(
      this.client,
      this.client.vaultsGitInfoGet,
    )(...args);
  }

  public vaultsGitPackGet(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return this.client.vaultsGitPackGet(...args);
  }

  public vaultsScan(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyReadableStreamCall<agentPB.VaultListMessage>(
      this.client,
      this.client.vaultsScan,
    )(...args);
  }

  public nodesClosestLocalNodesGet(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.NodeTableMessage>(
      this.client,
      this.client.nodesClosestLocalNodesGet,
    )(...args);
  }

  public nodesClaimsGet(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.ClaimsMessage>(
      this.client,
      this.client.nodesClaimsGet,
    )(...args);
  }

  public nodesChainDataGet(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.ChainDataMessage>(
      this.client,
      this.client.nodesChainDataGet,
    )(...args);
  }

  public nodesHolePunchMessageSend(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.EmptyMessage>(
      this.client,
      this.client.nodesHolePunchMessageSend,
    )(...args);
  }

  public notificationsSend(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.NotificationMessage>(
      this.client,
      this.client.notificationsSend,
    )(...args);
  }

  public vaultsPermisssionsCheck(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.PermissionMessage>(
      this.client,
      this.client.vaultsPermisssionsCheck,
    )(...args);
  }

  public nodesCrossSignClaim(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyDuplexStreamCall<
      agentPB.CrossSignMessage,
      agentPB.CrossSignMessage
    >(
      this.client,
      this.client.nodesCrossSignClaim,
    )(...args);
  }
}

export default GRPCClientAgent;
