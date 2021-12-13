import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from './utils';
import type { KeyManager } from '../keys';
import type { GRPCServer } from '../grpc';
import type { ForwardProxy, ReverseProxy } from '../network';
import type * as utilsPB from '../proto/js/polykey/v1/utils/utils_pb';
import process from 'process';
import * as grpcUtils from '../grpc/utils';
import * as agentPB from '../proto/js/polykey/v1/agent/agent_pb';

const createStatusRPC = ({
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
}) => {
  return {
    agentStatus: async (
      call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, agentPB.InfoMessage>,
      callback: grpc.sendUnaryData<agentPB.InfoMessage>,
    ): Promise<void> => {
      const response = new agentPB.InfoMessage();
      try {
        const metadata = await authenticate(call.metadata);
        call.sendMetadata(metadata);
        response.setPid(process.pid);
        response.setNodeId(keyManager.getNodeId());
        response.setClientHost(grpcServerClient.host);
        response.setClientPort(grpcServerClient.port);
        response.setIngressHost(revProxy.ingressHost);
        response.setIngressPort(revProxy.ingressPort);
        response.setEgressHost(fwdProxy.egressHost);
        response.setEgressPort(fwdProxy.egressPort);
        response.setAgentHost(grpcServerAgent.host);
        response.setAgentPort(grpcServerAgent.port);
        response.setProxyHost(fwdProxy.proxyHost);
        response.setProxyPort(fwdProxy.proxyPort);
        response.setRootPublicKeyPem(keyManager.getRootKeyPairPem().publicKey);
        response.setRootCertPem(keyManager.getRootCertPem());
        response.setRootCertChainPem(await keyManager.getRootCertChainPem());
        callback(null, response);
        return;
      } catch (err) {
        callback(grpcUtils.fromError(err), null);
        return;
      }
    },
  };
};

export default createStatusRPC;
