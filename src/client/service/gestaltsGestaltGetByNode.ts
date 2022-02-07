import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeId } from '../../nodes/types';
import type { GestaltGraph } from '../../gestalts';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import { utils as grpcUtils } from '../../grpc';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
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
    try {
      const response = new gestaltsPB.Graph();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        nodeId,
      }: {
        nodeId: NodeId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['nodeId'], () => validationUtils.parseNodeId(value)],
            () => value,
          );
        },
        {
          nodeId: call.request.getNodeId(),
        },
      );
      const gestalt = await gestaltGraph.getGestaltByNode(nodeId);
      if (gestalt != null) {
        response.setGestaltGraph(JSON.stringify(gestalt));
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default gestaltsGestaltGetByNode;
