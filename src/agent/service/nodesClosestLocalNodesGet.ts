import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type { NodeId } from '../../nodes/types';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as nodesUtils from '../../nodes/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';

/**
 * Retrieves the local nodes (i.e. from the current node) that are closest
 * to some provided node ID.
 */
function nodesClosestLocalNodesGet({
  nodeConnectionManager,
  db,
  logger,
}: {
  nodeConnectionManager: NodeConnectionManager;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, nodesPB.NodeTable>,
    callback: grpc.sendUnaryData<nodesPB.NodeTable>,
  ): Promise<void> => {
    try {
      const response = new nodesPB.NodeTable();
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
      // Get all local nodes that are closest to the target node from the request
      const closestNodes = await db.withTransactionF(
        async (tran) =>
          await nodeConnectionManager.getClosestLocalNodes(
            nodeId,
            undefined,
            tran,
          ),
      );
      for (const node of closestNodes) {
        const addressMessage = new nodesPB.Address();
        addressMessage.setHost(node.address.host);
        addressMessage.setPort(node.address.port);
        // Add the node to the response's map (mapping of node ID -> node address)
        response
          .getNodeTableMap()
          .set(nodesUtils.encodeNodeId(node.id), addressMessage);
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e, true));
      logger.error(e);
      return;
    }
  };
}

export default nodesClosestLocalNodesGet;
