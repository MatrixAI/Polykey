import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AgentClaimMessage
} from '../types';
import type NodeManager from '../../NodeManager';
import type ACL from '../../../acl/ACL';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';
import * as nodesErrors from '../../errors';
import { DuplexHandler } from '../../../rpc/handlers';

/**
 * Claims a node
 */
class NodesCrossSignClaim extends DuplexHandler<
  {
    acl: ACL;
    nodeManager: NodeManager;
  },
  AgentRPCRequestParams<AgentClaimMessage>,
  AgentRPCResponseResult<AgentClaimMessage>
> {
  public handle = async function*(
    input: AsyncIterableIterator<AgentRPCRequestParams<AgentClaimMessage>>,
    _cancel,
    meta,
  ): AsyncGenerator<AgentRPCResponseResult<AgentClaimMessage>> {
    const { acl, nodeManager } = this.container;
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new agentErrors.ErrorAgentNodeIdMissing();
    }
    // Check the ACL for permissions
    const permissions = await acl.getNodePerm(requestingNodeId);
    if (permissions?.gestalt.claim !== null) {
      throw new nodesErrors.ErrorNodePermissionDenied();
    }
    // Handle claiming the node
    yield* nodeManager.handleClaimNode(requestingNodeId, input);
  }
}

export default NodesCrossSignClaim;
