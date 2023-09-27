import type { AgentClaimMessage } from './types';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type ACL from '../../acl/ACL';
import type NodeManager from '../../nodes/NodeManager';
import * as agentErrors from '../errors';
import * as agentUtils from '../utils';
import * as nodesErrors from '../../nodes/errors';
import { DuplexHandler } from '../../rpc/handlers';

class NodesCrossSignClaimHandler extends DuplexHandler<
  {
    acl: ACL;
    nodeManager: NodeManager;
  },
  AgentRPCRequestParams<AgentClaimMessage>,
  AgentRPCResponseResult<AgentClaimMessage>
> {
  public async *handle(
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

export { NodesCrossSignClaimHandler };