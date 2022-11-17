import type * as grpc from '@grpc/grpc-js';
import type NodeManager from '../../nodes/NodeManager';
import type KeyRing from '../../keys/KeyRing';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as claimsErrors from '../../claims/errors';
import * as agentUtils from '../utils';
import { ConnectionInfoGet } from '../types';
import ACL from '../../acl/ACL';
import * as nodesErrors  from '../../nodes/errors';

function nodesCrossSignClaim({
  keyRing,
  nodeManager,
  acl,
  connectionInfoGet,
  logger,
}: {
  keyRing: KeyRing;
  nodeManager: NodeManager;
  acl: ACL;
  connectionInfoGet: ConnectionInfoGet;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerDuplexStream<nodesPB.AgentClaim, nodesPB.AgentClaim>,
  ) => {
    const requestingNodeId = connectionInfoGet(call)!.remoteNodeId
    const nodeId = keyRing.getNodeId();
    const genClaims = grpcUtils.generatorDuplex(
      call,
      { nodeId, command: nodesCrossSignClaim.name },
      true,
    );
    try {
      // Check the ACL for permissions
      const permissions = await acl.getNodePerm(requestingNodeId)
      if (permissions?.gestalt.claim !== null) throw new nodesErrors.ErrorNodePermissionDenied();
      // Handle claiming the node
      await nodeManager.handleClaimNode(requestingNodeId, genClaims);
    } catch (e) {
      console.error(e);
      await genClaims.throw(e);
      !agentUtils.isAgentClientError(e, [
        claimsErrors.ErrorEmptyStream,
        claimsErrors.ErrorUndefinedSinglySignedClaim,
        claimsErrors.ErrorUndefinedSignature,
        claimsErrors.ErrorNodesClaimType,
        claimsErrors.ErrorUndefinedDoublySignedClaim,
      ]) && logger.error(`${nodesCrossSignClaim.name}:${e}`);
      return;
    }
  };
}

export default nodesCrossSignClaim;
