import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeManager } from '../../nodes';
import { utils as nodesUtils } from '../../nodes';
import { utils as grpcUtils } from '../../grpc';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';

/**
 * Attempts to get the node address of a provided node ID (by contacting
 * keynodes in the wider Polykey network).
 * @throws ErrorNodeGraphNodeNotFound if node address cannot be found
 */
function nodesFind({
  nodeManager,
  authenticate,
}: {
  nodeManager: NodeManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, nodesPB.NodeAddress>,
    callback: grpc.sendUnaryData<nodesPB.NodeAddress>,
  ): Promise<void> => {
    const response = new nodesPB.NodeAddress();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const nodeId = nodesUtils.makeNodeId(call.request.getNodeId());
      const address = await nodeManager.findNode(nodeId);
      response
        .setNodeId(nodeId)
        .setAddress(
          new nodesPB.Address().setHost(address.host).setPort(address.port),
        );
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default nodesFind;
