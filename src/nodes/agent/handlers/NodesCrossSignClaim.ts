import type { JSONValue } from '@matrixai/rpc';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AgentClaimMessage,
} from '../types.js';
import type NodeManager from '../../NodeManager.js';
import type ACL from '../../../acl/ACL.js';
import { DuplexHandler } from '@matrixai/rpc';
import * as agentErrors from '../errors.js';
import * as agentUtils from '../utils.js';
import * as nodesErrors from '../../errors.js';

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
  public handle = async function* (
    input: AsyncIterableIterator<AgentRPCRequestParams<AgentClaimMessage>>,
    _cancel: (reason?: any) => void,
    meta: Record<string, JSONValue>,
  ): AsyncGenerator<AgentRPCResponseResult<AgentClaimMessage>> {
    const {
      acl,
      nodeManager,
    }: {
      acl: ACL;
      nodeManager: NodeManager;
    } = this.container;
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
  };
}

export default NodesCrossSignClaim;
