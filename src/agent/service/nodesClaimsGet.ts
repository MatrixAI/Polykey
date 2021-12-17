import type * as grpc from '@grpc/grpc-js';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';

/**
 * Retrieves all claims (of a specific type) of this node (within its sigchain).
 * TODO: Currently not required. Will need to refactor once we filter on what
 * claims we desire from the sigchain (e.g. in discoverGestalt).
 */
function nodesClaimsGet(_) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.ClaimType, nodesPB.Claims>,
    callback: grpc.sendUnaryData<nodesPB.Claims>,
  ): Promise<void> => {
    const response = new nodesPB.Claims();
    // Response.setClaimsList(
    //   await sigchain.getClaims(call.request.getClaimtype() as ClaimType)
    // );
    callback(null, response);
  };
}

export default nodesClaimsGet;
