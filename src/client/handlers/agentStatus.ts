import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type { StatusResultMessage } from './types';
import type PolykeyAgent from '../../PolykeyAgent';
import * as nodesUtils from '../../nodes/utils';
import * as keysUtils from '../../keys/utils';
import { UnaryHandler } from '../../rpc/handlers';
import { UnaryCaller } from '../../rpc/callers';

const agentStatus = new UnaryCaller<
  ClientRPCRequestParams,
  ClientRPCResponseResult<StatusResultMessage>
>();

class AgentStatusHandler extends UnaryHandler<
  {
    pkAgentProm: Promise<PolykeyAgent>;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<StatusResultMessage>
> {
  public async handle(): Promise<ClientRPCResponseResult<StatusResultMessage>> {
    const { pkAgentProm } = this.container;
    const pkAgent = await pkAgentProm;
    return {
      pid: process.pid,
      nodeIdEncoded: nodesUtils.encodeNodeId(pkAgent.keyRing.getNodeId()),
      clientHost: pkAgent.webSocketServerClient.host,
      clientPort: pkAgent.webSocketServerClient.port,
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
