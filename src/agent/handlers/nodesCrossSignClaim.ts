import type { EchoMessage } from './types';
import type { AgentRPCRequestParams, AgentRPCResponseResult } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type { NodeId } from '../../ids';
import type ACL from '../../acl/ACL';
import type NodeManager from '../../nodes/NodeManager';
import * as nodesErrors from '../../nodes/errors';
import * as nodesUtils from '../../nodes/utils';
import { DuplexHandler } from '../../rpc/handlers';

// TODO: come back to this!
class NodesCrossSignClaimHandler extends DuplexHandler<
  {
    keyRing: KeyRing;
    acl: ACL;
    nodeManager: NodeManager;
  },
  AgentRPCRequestParams<EchoMessage>,
  AgentRPCResponseResult<EchoMessage>
> {
  public async *handle(
    input: AsyncIterable<AgentRPCRequestParams<EchoMessage>>,
    _,
    meta,
  ): AsyncGenerator<AgentRPCResponseResult<EchoMessage>> {
    const { acl } = this.container;
    // TODO: get remote info from metadata. dependent on js-quic meta types
    const requestingNodeId: NodeId | undefined = nodesUtils.decodeNodeId(
      meta?.remoteNodeId,
    );
    if (requestingNodeId == null) throw Error('TMP invalid nodeId');
    // Check the ACL for permissions
    const permissions = await acl.getNodePerm(requestingNodeId);
    if (permissions?.gestalt.claim !== null) {
      throw new nodesErrors.ErrorNodePermissionDenied();
    }
    // Handle claiming the node
    await nodeManager.handleClaimNode(requestingNodeId, genClaims);
  }
}

export { NodesCrossSignClaimHandler };
