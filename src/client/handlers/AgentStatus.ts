import type {
  ClientRPCRequestParams,
  ClientRPCResponseResult,
  StatusResultMessage,
} from '../types';
import type PolykeyAgent from '../../PolykeyAgent';
import { UnaryHandler } from '@matrixai/rpc';
import * as nodesUtils from '../../nodes/utils';
import config from '../../config';

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
    const { polykeyAgent }: { polykeyAgent: PolykeyAgent } = this.container;
    return {
      pid: process.pid,
      nodeIdEncoded: nodesUtils.encodeNodeId(polykeyAgent.keyRing.getNodeId()),
      clientHost: polykeyAgent.clientServiceHost,
      clientPort: polykeyAgent.clientServicePort,
      agentHost: polykeyAgent.agentServiceHost,
      agentPort: polykeyAgent.agentServicePort,
      startTime: polykeyAgent.startTime,
      connectionsActive: polykeyAgent.nodeConnectionManager.connectionsActive(),
      nodesTotal: await polykeyAgent.nodeGraph.nodesTotal(),
      version: config.version,
      sourceVersion: config.sourceVersion,
      stateVersion: config.stateVersion,
      networkVersion: config.networkVersion,
      versionMetadata: polykeyAgent.versionMetadata,
    };
  };
}

export default AgentStatus;
