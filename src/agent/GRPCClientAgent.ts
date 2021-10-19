import type { TLSConfig } from '../network/types';

import { GRPCClient, utils as grpcUtils } from '../grpc';
import * as agentPB from '../proto/js/Agent_pb';
import { AgentClient } from '../proto/js/Agent_grpc_pb';
import { NodeId } from '../nodes/types';
import { Host, Port, ProxyConfig } from '../network/types';
import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { errors as grpcErrors } from '../grpc';

/**
 * GRPC Agent Endpoints.
 */

@CreateDestroyStartStop(
  new grpcErrors.ErrorGRPCClientNotStarted(),
  new grpcErrors.ErrorGRPCClientDestroyed(),
)
class GRPCClientAgent extends GRPCClient<AgentClient> {
  static async createGRPCClientAgent({
    nodeId,
    host,
    port,
    proxyConfig,
    logger,
  }: {
    nodeId: NodeId;
    host: Host;
    port: Port;
    proxyConfig?: ProxyConfig;
    logger?: Logger;
  }): Promise<GRPCClientAgent> {
    const logger_ = logger ?? new Logger('GRPCClientAgent');
    logger_.info('Creating GRPCClientAgent');
    const grpcClientAgent = new GRPCClientAgent({
      host,
      logger: logger_,
      nodeId,
      port,
      proxyConfig,
    });
    logger_.info('Created GRPCClientAgent');
    return grpcClientAgent;
  }

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

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public echo(...args) {
    return grpcUtils.promisifyUnaryCall<agentPB.EchoMessage>(
      this.client,
      this.client.echo,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsGitInfoGet(...args) {
    return grpcUtils.promisifyReadableStreamCall<agentPB.PackChunk>(
      this.client,
      this.client.vaultsGitInfoGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsGitPackGet(...args) {
    return this.client.vaultsGitPackGet(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsScan(...args) {
    return grpcUtils.promisifyReadableStreamCall<agentPB.VaultListMessage>(
      this.client,
      this.client.vaultsScan,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesClosestLocalNodesGet(...args) {
    return grpcUtils.promisifyUnaryCall<agentPB.NodeTableMessage>(
      this.client,
      this.client.nodesClosestLocalNodesGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesClaimsGet(...args) {
    return grpcUtils.promisifyUnaryCall<agentPB.ClaimsMessage>(
      this.client,
      this.client.nodesClaimsGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesChainDataGet(...args) {
    return grpcUtils.promisifyUnaryCall<agentPB.ChainDataMessage>(
      this.client,
      this.client.nodesChainDataGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesHolePunchMessageSend(...args) {
    return grpcUtils.promisifyUnaryCall<agentPB.EmptyMessage>(
      this.client,
      this.client.nodesHolePunchMessageSend,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public notificationsSend(...args) {
    return grpcUtils.promisifyUnaryCall<agentPB.NotificationMessage>(
      this.client,
      this.client.notificationsSend,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsPermisssionsCheck(...args) {
    return grpcUtils.promisifyUnaryCall<agentPB.PermissionMessage>(
      this.client,
      this.client.vaultsPermisssionsCheck,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesCrossSignClaim(...args) {
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
