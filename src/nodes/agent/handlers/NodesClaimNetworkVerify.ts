import type {
  AgentClaimMessage,
  AgentRPCRequestParams,
  AgentRPCResponseResult,
} from '../types.js';
import type NodeManager from '../../../nodes/NodeManager.js';
import type { JSONValue } from '../../../types.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as agentErrors from '../errors.js';
import * as agentUtils from '../utils.js';

class NodesClaimNetworkVerify extends UnaryHandler<
  {
    nodeManager: NodeManager;
  },
  AgentRPCRequestParams<AgentClaimMessage>,
  AgentRPCResponseResult<{ success: true }>
> {
  public handle = async (
    input: AgentRPCRequestParams<AgentClaimMessage>,
    _cancel: (reason?: any) => void,
    meta: Record<string, JSONValue> | undefined,
  ): Promise<AgentRPCResponseResult<{ success: true }>> => {
    const { nodeManager }: { nodeManager: NodeManager } = this.container;
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    return nodeManager.handleVerifyClaimNetwork(requestingNodeId, input);
  };
}

export default NodesClaimNetworkVerify;
