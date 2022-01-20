import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { GestaltGraph } from '../../gestalts';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import { utils as grpcUtils } from '../../grpc';
import { utils as nodesUtils } from '../../nodes';
import * as gestaltsPB from '../../proto/js/polykey/v1/gestalts/gestalts_pb';

function gestaltsGestaltGetByNode({
  authenticate,
  gestaltGraph,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, gestaltsPB.Graph>,
    callback: grpc.sendUnaryData<gestaltsPB.Graph>,
  ): Promise<void> => {
    const response = new gestaltsPB.Graph();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const nodeId = nodesUtils.decodeNodeId(call.request.getNodeId()!);
      const gestalt = await gestaltGraph.getGestaltByNode(nodeId);
      if (gestalt != null) {
        response.setGestaltGraph(JSON.stringify(gestalt));
      }
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default gestaltsGestaltGetByNode;
