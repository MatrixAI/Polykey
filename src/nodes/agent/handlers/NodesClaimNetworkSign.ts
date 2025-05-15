import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AgentClaimMessage,
} from '../types.js';
import type NodeManager from '../../../nodes/NodeManager.js';
import type { JSONValue } from '../../../types.js';
import type { AgentClientManifest } from '../callers/index.js';
import { UnaryHandler } from '@matrixai/rpc';
import * as agentUtils from '../utils.js';
import * as nodesErrors from '../../errors.js';

class NodesClaimNetworkSign extends UnaryHandler<
  {
    nodeManager: NodeManager<AgentClientManifest>;
  },
  AgentRPCRequestParams<AgentClaimMessage>,
  AgentRPCResponseResult<AgentClaimMessage>
> {
  public handle = async (
    input: AgentRPCRequestParams<AgentClaimMessage>,
    _cancel: (reason?: any) => void,
    meta: Record<string, JSONValue> | undefined,
  ): Promise<AgentRPCResponseResult<AgentClaimMessage>> => {
    const { nodeManager }: { nodeManager: NodeManager<AgentClientManifest> } =
      this.container;
    // Connections should always be validated
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new nodesErrors.ErrorNodeConnectionInvalidIdentity();
    }
    return nodeManager.handleClaimNetwork(requestingNodeId, input);
  };
}

export default NodesClaimNetworkSign;
