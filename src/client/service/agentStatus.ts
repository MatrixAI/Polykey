import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { KeyManager } from '../../keys';
import type { GRPCServer } from '../../grpc';
import type { ForwardProxy, ReverseProxy } from '../../network';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import process from 'process';
import * as grpcUtils from '../../grpc/utils';
import * as agentPB from '../../proto/js/polykey/v1/agent/agent_pb';
import { utils as nodeUtils } from '../../nodes';

function agentStatus({
  authenticate,
  keyManager,
  grpcServerClient,
  grpcServerAgent,
  fwdProxy,
  revProxy,
}: {
  authenticate: Authenticate;
  keyManager: KeyManager;
  grpcServerClient: GRPCServer;
  grpcServerAgent: GRPCServer;
  fwdProxy: ForwardProxy;
  revProxy: ReverseProxy;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, agentPB.InfoMessage>,
    callback: grpc.sendUnaryData<agentPB.InfoMessage>,
  ): Promise<void> => {
    try {
      const response = new agentPB.InfoMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      response.setPid(process.pid);
      response.setNodeId(nodeUtils.encodeNodeId(keyManager.getNodeId()));
      response.setClientHost(grpcServerClient.host);
      response.setClientPort(grpcServerClient.port);
      response.setIngressHost(revProxy.getIngressHost());
      response.setIngressPort(revProxy.getIngressPort());
      response.setEgressHost(fwdProxy.getEgressHost());
      response.setEgressPort(fwdProxy.getEgressPort());
      response.setAgentHost(grpcServerAgent.host);
      response.setAgentPort(grpcServerAgent.port);
      response.setProxyHost(fwdProxy.getProxyHost());
      response.setProxyPort(fwdProxy.getProxyPort());
      response.setRootPublicKeyPem(keyManager.getRootKeyPairPem().publicKey);
      response.setRootCertPem(keyManager.getRootCertPem());
      response.setRootCertChainPem(await keyManager.getRootCertChainPem());
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default agentStatus;
