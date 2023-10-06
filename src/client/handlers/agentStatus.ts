import type { StatusResultMessage } from './types';
import type { ClientRPCRequestParams, ClientRPCResponseResult } from '../types';
import type PolykeyAgent from '../../PolykeyAgent';
import { UnaryHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils';
import * as keysUtils from '../../keys/utils';

class AgentStatusHandler extends UnaryHandler<
  {
    pkAgentProm: Promise<PolykeyAgent>;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<StatusResultMessage>
> {
  public handle = async (): Promise<
    ClientRPCResponseResult<StatusResultMessage>
  > => {
    const { pkAgentProm } = this.container;
    const pkAgent = await pkAgentProm;
    return {
      pid: process.pid,
      nodeIdEncoded: nodesUtils.encodeNodeId(pkAgent.keyRing.getNodeId()),
      clientHost: pkAgent.clientServiceHost,
      clientPort: pkAgent.clientServicePort,
      agentHost: pkAgent.agentServiceHost,
      agentPort: pkAgent.agentServicePort,
      publicKeyJwk: keysUtils.publicKeyToJWK(pkAgent.keyRing.keyPair.publicKey),
      certChainPEM: await pkAgent.certManager.getCertPEMsChainPEM(),
    };
  };
}

export { AgentStatusHandler };
