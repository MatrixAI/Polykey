import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { GestaltGraph } from '../../gestalts';
import { utils as grpcUtils } from '../../grpc';
import { utils as nodesUtils } from '../../nodes';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as permissionsPB from '../../proto/js/polykey/v1/permissions/permissions_pb';

function gestaltsActionsGetByNode({
  authenticate,
  gestaltGraph,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, permissionsPB.Actions>,
    callback: grpc.sendUnaryData<permissionsPB.Actions>,
  ): Promise<void> => {
    const info = call.request;
    const response = new permissionsPB.Actions();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const result = await gestaltGraph.getGestaltActionsByNode(
        nodesUtils.makeNodeId(info.getNodeId()),
      );
      if (result == null) {
        // Node doesn't exist, so no permissions. might throw error instead TBD.
        response.setActionList([]);
      } else {
        // Contains permission
        const actions = Object.keys(result);
        response.setActionList(actions);
      }
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default gestaltsActionsGetByNode;
