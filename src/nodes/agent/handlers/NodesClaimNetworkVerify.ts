import type {
  AgentClaimMessage,
  AgentRPCRequestParams,
  AgentRPCResponseResult,
} from '../types';
import type NodeManager from '../../../nodes/NodeManager';
import type { JSONValue } from '../../../types';
import { UnaryHandler } from '@matrixai/rpc';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';

class NodesClaimNetworkVerify extends UnaryHandler<
  {
    nodeManager: NodeManager;
  },
  AgentRPCRequestParams<AgentClaimMessage>,
  AgentRPCResponseResult<{ success: true }>
> {
  public handle = async (
    input: AgentRPCRequestParams<AgentClaimMessage>,
    _cancel,
    meta: Record<string, JSONValue> | undefined,
  ): Promise<AgentRPCResponseResult<{ success: true }>> => {
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    return this.container.nodeManager.handleVerifyClaimNetwork(
      requestingNodeId,
      input,
    );
  };
}

export default NodesClaimNetworkVerify;
