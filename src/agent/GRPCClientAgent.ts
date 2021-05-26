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

  public getRootCertificate(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.CertificateMessage>(
      this.client,
      this.client.getRootCertificate,
    )(...args);
  }

  public requestCertificateSigning(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.CertificateMessage>(
      this.client,
      this.client.requestCertificateSigning,
    )(...args);
  }

  public getClosestLocalNodes(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.NodeTableMessage>(
      this.client,
      this.client.getClosestLocalNodes,
    )(...args);
  }

  public synchronizeDHT(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.NodeTableMessage>(
      this.client,
      this.client.synchronizeDHT,
    )(...args);
  }

  public sendHolePunchMessage(...args) {
    if (!this._started) throw new agentErrors.ErrorAgentClientNotStarted();
    return grpcUtils.promisifyUnaryCall<agentPB.EmptyMessage>(
      this.client,
      this.client.sendHolePunchMessage,
    )(...args);
  }
}

export default GRPCClientAgent;
