import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { GestaltGraph } from '../../gestalts';
import { utils as grpcUtils } from '../../grpc';
import { utils as nodesUtils } from '../../nodes';
import { utils as gestaltsUtils } from '../../gestalts';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as permissionsPB from '../../proto/js/polykey/v1/permissions/permissions_pb';

function gestaltsActionsUnsetByNode({
  authenticate,
  gestaltGraph,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
}) {
  return async (
    call: grpc.ServerUnaryCall<permissionsPB.ActionSet, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const info = call.request;
    const response = new utilsPB.EmptyMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Setting the action.
      const action = gestaltsUtils.makeGestaltAction(info.getAction());
      const nodeId = nodesUtils.makeNodeId(info.getNode()?.getNodeId());
      await gestaltGraph.unsetGestaltActionByNode(nodeId, action);
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default gestaltsActionsUnsetByNode;
