import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { GestaltGraph } from '../../gestalts';
import type { Discovery } from '../../discovery';
import type { NodeId } from '../../nodes/types';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as grpcUtils from '../../grpc/utils';
import * as validationUtils from '../../validation/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as nodesUtils from '../../nodes/utils';

function gestaltsGestaltTrustByNode({
  authenticate,
  gestaltGraph,
  discovery,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
  discovery: Discovery;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.EmptyMessage();
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
      // Set the node in the gestalt graph if not already
      if ((await gestaltGraph.getGestaltByNode(nodeId)) == null) {
        await gestaltGraph.setNode({
          id: nodesUtils.encodeNodeId(nodeId),
          chain: {},
        });
        // Queue the new node for discovery
        await discovery.queueDiscoveryByNode(nodeId);
      }
      // Set notify permission
      await gestaltGraph.setGestaltActionByNode(nodeId, 'notify');
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default gestaltsGestaltTrustByNode;
