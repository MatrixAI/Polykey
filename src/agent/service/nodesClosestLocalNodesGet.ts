import type * as grpc from '@grpc/grpc-js';
import type { NodeManager } from '../../nodes';
import { utils as grpcUtils } from '../../grpc';
import { utils as nodesUtils } from '../../nodes';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';

/**
 * Retrieves the local nodes (i.e. from the current node) that are closest
 * to some provided node ID.
 */
function nodesClosestLocalNodesGet({
  nodeManager,
}: {
  nodeManager: NodeManager;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, nodesPB.NodeTable>,
    callback: grpc.sendUnaryData<nodesPB.NodeTable>,
  ): Promise<void> => {
    const response = new nodesPB.NodeTable();
    try {
      const targetNodeId = nodesUtils.makeNodeId(call.request.getNodeId());
      // Get all local nodes that are closest to the target node from the request
      const closestNodes = await nodeManager.getClosestLocalNodes(targetNodeId);
      for (const node of closestNodes) {
        const addressMessage = new nodesPB.Address();
        addressMessage.setHost(node.address.host);
        addressMessage.setPort(node.address.port);
        // Add the node to the response's map (mapping of node ID -> node address)
        response.getNodeTableMap().set(node.id, addressMessage);
      }
    } catch (err) {
      callback(grpcUtils.fromError(err), response);
    }
    callback(null, response);
  };
}

export default nodesClosestLocalNodesGet;
