import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { StatusResultMessage } from './types';
import type PolykeyAgent from '../../PolykeyAgent';
import * as nodesUtils from '../../nodes/utils';
import * as keysUtils from '../../keys/utils';
import { UnaryHandler } from '../../RPC/handlers';
import { UnaryCaller } from '../../RPC/callers';

const agentStatus = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<StatusResultMessage>
>();

class AgentStatusHandler extends UnaryHandler<
  {
    pkAgent: PolykeyAgent;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<StatusResultMessage>
> {
  public async handle(): Promise<ClientRPCResponseResult<StatusResultMessage>> {
    const { pkAgent } = this.container;
    return {
      pid: process.pid,
      nodeIdEncoded: nodesUtils.encodeNodeId(pkAgent.keyRing.getNodeId()),
      clientHost: pkAgent.webSocketServer.host,
      clientPort: pkAgent.webSocketServer.port,
      proxyHost: pkAgent.proxy.getProxyHost(),
      proxyPort: pkAgent.proxy.getProxyPort(),
      agentHost: pkAgent.grpcServerAgent.getHost(),
      agentPort: pkAgent.grpcServerAgent.getPort(),
      forwardHost: pkAgent.proxy.getForwardHost(),
      forwardPort: pkAgent.proxy.getForwardPort(),
      publicKeyJwk: keysUtils.publicKeyToJWK(pkAgent.keyRing.keyPair.publicKey),
      certChainPEM: await pkAgent.certManager.getCertPEMsChainPEM(),
    };
  }
}

export { AgentStatusHandler, agentStatus };
