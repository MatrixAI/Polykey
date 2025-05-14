import type {
  AgentClaimMessage,
  AgentRPCRequestParams,
  AgentRPCResponseResult,
} from '../types.js';
import type NodeManager from '../../../nodes/NodeManager.js';
import type { JSONValue } from '../../../types.js';
import type { AgentClientManifest } from '#nodes/agent/callers/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as agentUtils from '../utils.js';
import * as nodesErrors from '../../errors.js';

class NodesClaimNetworkVerify extends UnaryHandler<
  {
    nodeManager: NodeManager<AgentClientManifest>;
  },
  AgentRPCRequestParams<AgentClaimMessage>,
  AgentRPCResponseResult<{ success: true }>
> {
  public handle = async (
    input: AgentRPCRequestParams<AgentClaimMessage>,
    _cancel: (reason?: any) => void,
    meta: Record<string, JSONValue> | undefined,
  ): Promise<AgentRPCResponseResult<{ success: true }>> => {
    const { nodeManager }: { nodeManager: NodeManager<AgentClientManifest> } =
      this.container;
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new nodesErrors.ErrorNodeConnectionInvalidIdentity();
    }
    return nodeManager.handleVerifyClaimNetwork(requestingNodeId, input);
  };
}

export default NodesClaimNetworkVerify;
