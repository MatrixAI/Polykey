import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AgentClaimMessage,
} from '../types';
import type NodeManager from '../../../nodes/NodeManager';
import type { JSONValue } from '../../../types';
import { UnaryHandler } from '@matrixai/rpc';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';

class NodesClaimNetworkSign extends UnaryHandler<
  {
    nodeManager: NodeManager;
  },
  AgentRPCRequestParams<AgentClaimMessage>,
  AgentRPCResponseResult<AgentClaimMessage>
> {
  public handle = async (
    input: AgentRPCRequestParams<AgentClaimMessage>,
    _cancel,
    meta: Record<string, JSONValue> | undefined,
  ): Promise<AgentRPCResponseResult<AgentClaimMessage>> => {
    const { nodeManager } = this.container;
    // Connections should always be validated
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    return nodeManager.handleClaimNetwork(requestingNodeId, input);
  };
}

export default NodesClaimNetworkSign;
