import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  StatusResultMessage,
} from '../types';
import type PolykeyAgent from '../../PolykeyAgent';
import { UnaryHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils';

class AgentStatus extends UnaryHandler<
  {
    polykeyAgent: PolykeyAgent;
  },
  ClientRPCRequestParams,
  ClientRPCResponseResult<StatusResultMessage>
> {
  public handle = async (): Promise<
    ClientRPCResponseResult<StatusResultMessage>
  > => {
    const { polykeyAgent } = this.container;
    return {
      pid: process.pid,
      nodeIdEncoded: nodesUtils.encodeNodeId(polykeyAgent.keyRing.getNodeId()),
      clientHost: polykeyAgent.clientServiceHost,
      clientPort: polykeyAgent.clientServicePort,
      agentHost: polykeyAgent.agentServiceHost,
      agentPort: polykeyAgent.agentServicePort,
      upTime: polykeyAgent.upTime,
      ...polykeyAgent.nodeConnectionManager.getStats(),
      ...(await polykeyAgent.nodeGraph.getStats()),
    };
  };
}

export default AgentStatus;
