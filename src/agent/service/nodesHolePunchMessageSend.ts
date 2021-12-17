import type * as grpc from '@grpc/grpc-js';
import type { NodeManager } from '../../nodes';
import { utils as networkUtils } from '../../network';
import { utils as grpcUtils } from '../../grpc';
import { utils as nodesUtils } from '../../nodes';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function nodesHolePunchMessageSend({
  nodeManager,
}: {
  nodeManager: NodeManager;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Relay, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    try {
      // Firstly, check if this node is the desired node
      // If so, then we want to make this node start sending hole punching packets
      // back to the source node.
      if (
        nodeManager.getNodeId() === nodesUtils.makeNodeId(call.request.getTargetId())
      ) {
        const [host, port] = networkUtils.parseAddress(
          call.request.getEgressAddress(),
        );
        await nodeManager.openConnection(host, port);
        // Otherwise, find if node in table
        // If so, ask the nodeManager to relay to the node
      } else if (
        await nodeManager.knowsNode(nodesUtils.makeNodeId(call.request.getSrcId()))
      ) {
        await nodeManager.relayHolePunchMessage(call.request);
      }
    } catch (err) {
      callback(grpcUtils.fromError(err), response);
    }
    callback(null, response);
  };
}

export default nodesHolePunchMessageSend;
