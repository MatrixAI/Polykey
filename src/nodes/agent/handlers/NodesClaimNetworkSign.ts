import type { JSONValue } from '@matrixai/rpc';
import type {
  AgentRPCRequestParams,
  AgentRPCResponseResult,
  AgentClaimMessage,
} from '../types.js';
import type NodeManager from '../../NodeManager.js';
import type { AgentClientManifest } from '../callers/index.js';
import type ACL from '../../../acl/ACL.js';
import { DuplexHandler } from '@matrixai/rpc';
import * as agentUtils from '../utils.js';
import * as nodesErrors from '../../errors.js';

/**
 * Claims a node
 */
class NodesCrossSignClaim extends DuplexHandler<
  {
    nodeManager: NodeManager<AgentClientManifest>;
    acl: ACL;
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
      nodeManager,
      acl,
    }: {
      nodeManager: NodeManager<AgentClientManifest>;
      acl: ACL;
    } = this.container;
    const requestingNodeId = agentUtils.nodeIdFromMeta(meta);
    if (requestingNodeId == null) {
      throw new nodesErrors.ErrorNodeConnectionInvalidIdentity();
    }
    // Get the current NetworkAccessPermission
    const isPrivate = nodeManager.isClaimNetworkAuthorityPrivate();
    // Check the ACL for permissions
    const permissions = await acl.getNodePerm(requestingNodeId);
    // Permissions only apply if isPrivate is true
    if (isPrivate != null && isPrivate && permissions?.gestalt.join !== null) {
      // Throw new nodesErrors.ErrorNodePermissionDenied();
      // Throwing seems to be broken right now. We're going to return early to force a protocol error
      return;
    }

    // Handle claiming the node
    yield* nodeManager.handleClaimNetwork(requestingNodeId, input);
  };
}

export default NodesCrossSignClaim;
