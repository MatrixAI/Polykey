import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyManager from '../../keys/KeyManager';
import type GRPCServer from '../../grpc/GRPCServer';
import type Proxy from '../../network/Proxy';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import process from 'process';
import * as grpcUtils from '../../grpc/utils';
import * as nodesUtils from '../../nodes/utils';
import * as agentPB from '../../proto/js/polykey/v1/agent/agent_pb';
import * as clientUtils from '../utils';

function agentStatus({
  authenticate,
  keyManager,
  grpcServerClient,
  grpcServerAgent,
  proxy,
  logger,
}: {
  authenticate: Authenticate;
  keyManager: KeyManager;
  grpcServerClient: GRPCServer;
  grpcServerAgent: GRPCServer;
  proxy: Proxy;
  logger: Logger;
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
      response.setNodeId(nodesUtils.encodeNodeId(keyManager.getNodeId()));
      response.setClientHost(grpcServerClient.getHost());
      response.setClientPort(grpcServerClient.getPort());
      response.setAgentHost(grpcServerAgent.getHost());
      response.setAgentPort(grpcServerAgent.getPort());
      response.setForwardHost(proxy.getForwardHost());
      response.setForwardPort(proxy.getForwardPort());
      response.setProxyHost(proxy.getProxyHost());
      response.setProxyPort(proxy.getProxyPort());
      response.setRootPublicKeyPem(keyManager.getRootKeyPairPem().publicKey);
      response.setRootCertPem(keyManager.getRootCertPem());
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${agentStatus.name}:${e}`);
      return;
    }
  };
}

export default agentStatus;
