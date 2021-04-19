import { ChannelCredentials, ClientOptions } from '@grpc/grpc-js';
import Logger from '@matrixai/logger';
import { AgentClient } from '../proto/js/Agent_grpc_pb';
import * as agentPB from '../proto/js/Agent_pb';
import GRPCClient from '../grpc/GRPCClient';
import * as agentErrors from './errors';
import { utils as grpcUtils } from '../grpc';

/**
 * GRPC Agent Endpoints.
 */
class GRPCClientAgent extends GRPCClient<AgentClient> {
  constructor({
    host,
    port,
    logger,
  }: {
    host: string;
    port: number;
    logger?: Logger;
  }) {
    super({ host, port, logger });
  }

  public async start({
    credentials,
    options,
    timeout = Infinity,
  }: {
    credentials: ChannelCredentials;
    options?: Partial<ClientOptions>;
    timeout?: number;
  }): Promise<void> {
    await super.start({
      clientConstructor: AgentClient,
      credentials,
      options,
      timeout,
    });
  }

  public echo(...args) {
    if (!this.client) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.EchoMessage>(
      this.client,
      this.client.echo,
    )(...args);
  }

  public getRootCertificate(...args) {
    if (!this.client) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.CertificateMessage>(
      this.client,
      this.client.getRootCertificate,
    )(...args);
  }

  public requestCertificateSigning(...args) {
    if (!this.client) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.CertificateMessage>(
      this.client,
      this.client.requestCertificateSigning,
    )(...args);
  }

  public getClosestLocalNodes(...args) {
    if (!this.client) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.NodeTableMessage>(
      this.client,
      this.client.getClosestLocalNodes,
    )(...args);
  }

  public synchronizeDHT(...args) {
    if (!this.client) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.NodeTableMessage>(
      this.client,
      this.client.synchronizeDHT,
    )(...args);
  }

  public relayHolePunchMessage(...args) {
    if (!this.client) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.NodeTableMessage>(
      this.client,
      this.client.relayHolePunchMessage,
    )(...args);
  }
}

export default GRPCClientAgent;
