import type { ClientDuplexStream } from '@grpc/grpc-js';
import type { ClientReadableStream } from '@grpc/grpc-js/build/src/call';
import type {
  AsyncGeneratorReadableStreamClient,
  AsyncGeneratorDuplexStreamClient,
} from '../grpc/types';
import type { NodeId } from '../nodes/types';
import type { Host, Port, ProxyConfig, TLSConfig } from '../network/types';
import type * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import type * as vaultsPB from '../proto/js/polykey/v1/vaults/vaults_pb';
import type * as nodesPB from '../proto/js/polykey/v1/nodes/nodes_pb';
import type * as notificationsPB from '../proto/js/polykey/v1/notifications/notifications_pb';
import Logger from '@matrixai/logger';
import { CreateDestroy, ready } from '@matrixai/async-init/dist/CreateDestroy';
import * as agentErrors from './errors';
import * as grpcUtils from '../grpc/utils';
import GRPCClient from '../grpc/GRPCClient';
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
    destroyCallback = async () => {},
    logger = new Logger(this.name),
  }: {
    nodeId: NodeId;
    host: Host;
    port: Port;
    tlsConfig?: Partial<TLSConfig>;
    proxyConfig?: ProxyConfig;
    timeout?: number;
    destroyCallback?: () => Promise<void>;
    logger?: Logger;
  }): Promise<GRPCClientAgent> {
    const { client, serverCertChain, flowCountInterceptor } =
      await super.createClient({
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
      flowCountInterceptor,
      destroyCallback,
      logger,
    });
    return grpcClientAgent;
  }

  public async destroy() {
    await super.destroy();
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public echo(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EchoMessage>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
      },
      this.client.echo,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public vaultsGitInfoGet(
    ...args
  ): AsyncGeneratorReadableStreamClient<
    vaultsPB.PackChunk,
    ClientReadableStream<vaultsPB.PackChunk>
  > {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.PackChunk>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
      },
      this.client.vaultsGitInfoGet,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public vaultsGitPackGet(
    ...args
  ): AsyncGeneratorDuplexStreamClient<
    vaultsPB.PackChunk,
    vaultsPB.PackChunk,
    ClientDuplexStream<vaultsPB.PackChunk, vaultsPB.PackChunk>
  > {
    return grpcUtils.promisifyDuplexStreamCall(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
      },
      this.client.vaultsGitPackGet,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public vaultsScan(
    ...args
  ): AsyncGeneratorReadableStreamClient<
    vaultsPB.List,
    ClientReadableStream<vaultsPB.List>
  > {
    return grpcUtils.promisifyReadableStreamCall<vaultsPB.List>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
      },
      this.client.vaultsScan,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public nodesClosestLocalNodesGet(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.NodeTable>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
      },
      this.client.nodesClosestLocalNodesGet,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public nodesClaimsGet(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.Claims>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
      },
      this.client.nodesClaimsGet,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public nodesChainDataGet(...args) {
    return grpcUtils.promisifyUnaryCall<nodesPB.ChainData>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
      },
      this.client.nodesChainDataGet,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public nodesHolePunchMessageSend(...args) {
    return grpcUtils.promisifyUnaryCall<utilsPB.EmptyMessage>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
      },
      this.client.nodesHolePunchMessageSend,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public notificationsSend(...args) {
    return grpcUtils.promisifyUnaryCall<notificationsPB.AgentNotification>(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
      },
      this.client.notificationsSend,
    )(...args);
  }

  @ready(new agentErrors.ErrorAgentClientDestroyed())
  public nodesCrossSignClaim(
    ...args
  ): AsyncGeneratorDuplexStreamClient<
    nodesPB.CrossSign,
    nodesPB.CrossSign,
    ClientDuplexStream<nodesPB.CrossSign, nodesPB.CrossSign>
  > {
    return grpcUtils.promisifyDuplexStreamCall<
      nodesPB.CrossSign,
      nodesPB.CrossSign
    >(
      this.client,
      {
        nodeId: this.nodeId,
        host: this.host,
        port: this.port,
      },
      this.client.nodesCrossSignClaim,
    )(...args);
  }
}

export default GRPCClientAgent;
