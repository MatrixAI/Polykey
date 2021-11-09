import type { Host, Port, ProxyConfig } from '../network/types';
import type { NodeId } from '../nodes/types';
import type { TLSConfig } from '../network/types';

import Logger from '@matrixai/logger';
import {
  CreateDestroyStartStop,
  ready,
} from '@matrixai/async-init/dist/CreateDestroyStartStop';
import { GRPCClient, utils as grpcUtils, errors as grpcErrors } from '../grpc';
import { AgentServiceClient } from '../proto/js/polykey/v1/agent_service_grpc_pb';
import * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import * as notificationsPB from '../proto/js/polykey/v1/notifications/notifications_pb';

/**
 * GRPC Agent Endpoints.
 */

@CreateDestroyStartStop(
  new grpcErrors.ErrorGRPCClientNotStarted(),
  new grpcErrors.ErrorGRPCClientDestroyed(),
)
class GRPCClientAgent extends GRPCClient<AgentServiceClient> {
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
    timeout = 25000,
  }: {
    tlsConfig?: TLSConfig;
    timeout?: number;
  } = {}): Promise<void> {
    await super.start({
      clientConstructor: AgentServiceClient,
      tlsConfig,
      timeout,
    });
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public echo(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      this.client,
      this.client.echo,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsGitInfoGet(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.PackChunk>(
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
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.Vault>(
      this.client,
      this.client.vaultsScan,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesClosestLocalNodesGet(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.NodeTable>(
      this.client,
      this.client.nodesClosestLocalNodesGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesClaimsGet(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.Claims>(
      this.client,
      this.client.nodesClaimsGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesChainDataGet(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.ChainData>(
      this.client,
      this.client.nodesChainDataGet,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesHolePunchMessageSend(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.nodesHolePunchMessageSend,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public notificationsSend(...args) {
    return grpcUtils.promisifyUnaryCall<notificationsPB.AgentNotification>(
      this.client,
      this.client.notificationsSend,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public vaultsPermisssionsCheck(...args) {
    return grpcUtils.promisifyUnaryCall<vaultsPB.NodePermissionAllowed>(
      this.client,
      this.client.vaultsPermisssionsCheck,
    )(...args);
  }

  @ready(new grpcErrors.ErrorGRPCClientNotStarted())
  public nodesCrossSignClaim(...args) {
    return grpcUtils.promisifyDuplexStreamCall<
      nodesPB.CrossSign,
      nodesPB.CrossSign
    >(
      this.client,
      this.client.nodesCrossSignClaim,
    )(...args);
  }
}

export default GRPCClientAgent;
