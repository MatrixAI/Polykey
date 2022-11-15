import type * as grpc from '@grpc/grpc-js';
import type NodeManager from '../../nodes/NodeManager';
import type KeyRing from '../../keys/KeyRing';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as claimsErrors from '../../claims/errors';
import * as agentUtils from '../utils';
import { ConnectionInfoGet } from '../types';

function nodesCrossSignClaim({
  keyRing,
  nodeManager,
  connectionInfoGet,
  logger,
}: {
  keyRing: KeyRing;
  nodeManager: NodeManager;
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
      await nodeManager.handleClaimNode(requestingNodeId, genClaims);
    } catch (e) {
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
