import type { Host, Port, ProxyConfig } from '../network/types';
import type { NodeId } from '../nodes/types';
import type { TLSConfig } from '../network/types';
import type * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import type * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import type * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import type * as notificationsPB from '../proto/js/polykey/v1/notifications/notifications_pb';
import Logger from '@matrixai/logger';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import * as agentErrors from './errors';
import { GRPCClient, utils as grpcUtils } from '../grpc';
import { AgentServiceClient } from '../proto/js/polykey/v1/agent_service_grpc_pb';

interface GRPCClientAgent extends CreateDestroy {}
@CreateDestroy()
class GRPCClientAgent extends GRPCClient<AgentServiceClient> {
  /**
   * Creates GRPCClientAgent
   * This connects to the agent service
   * This connection should not be encrypted with TLS because it
   * will go through the network proxies
   */
  static async createGRPCClientAgent({
    nodeId,
    host,
    port,
    tlsConfig,
    proxyConfig,
    timeout = Infinity,
    logger = new Logger(this.name),
  }: {
    nodeId: NodeId;
    host: Host;
    port: Port;
    proxyConfig?: ProxyConfig;
    tlsConfig?: Partial<TLSConfig>;
    timeout?: number;
    logger?: Logger;
  }): Promise<GRPCClientAgent> {
    logger.info(`Creating ${this.name}`);
    const { client, serverCertChain } = await super.createClient({
      clientConstructor: AgentServiceClient,
      nodeId,
      host,
      port,
      tlsConfig,
      proxyConfig,
      timeout,
      logger,
    });
    const grpcClientAgent = new GRPCClientAgent({
      client,
      nodeId,
      host,
      port,
      tlsConfig,
      proxyConfig,
      serverCertChain,
      logger,
    });
    logger.info(`Created ${this.name}`);
    return grpcClientAgent;
  }

  public async destroy() {
    this.logger.info(`Destroying ${this.constructor.name}`);
    await super.destroy();
    this.logger.info(`Destroyed ${this.constructor.name}`);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public echo(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      this.client,
      this.client.echo,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public vaultsGitInfoGet(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.PackChunk>(
      this.client,
      this.client.vaultsGitInfoGet,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public vaultsGitPackGet(...args) {
    return this.client.vaultsGitPackGet(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public vaultsScan(...args) {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.Vault>(
      this.client,
      this.client.vaultsScan,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public nodesClosestLocalNodesGet(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.NodeTable>(
      this.client,
      this.client.nodesClosestLocalNodesGet,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public nodesClaimsGet(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.Claims>(
      this.client,
      this.client.nodesClaimsGet,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public nodesChainDataGet(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.ChainData>(
      this.client,
      this.client.nodesChainDataGet,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public nodesHolePunchMessageSend(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      this.client.nodesHolePunchMessageSend,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public notificationsSend(...args) {
    return grpcUtils.promisifyUnaryCall<notificationsPB.AgentNotification>(
      this.client,
      this.client.notificationsSend,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public vaultsPermisssionsCheck(...args) {
    return grpcUtils.promisifyUnaryCall<vaultsPB.NodePermissionAllowed>(
      this.client,
      this.client.vaultsPermisssionsCheck,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
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
