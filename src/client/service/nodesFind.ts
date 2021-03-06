import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type NodeConnectionManager from '../../nodes/NodeConnectionManager';
import type { NodeId } from '../../nodes/types';
import type Logger from '@matrixai/logger';
import * as nodesUtils from '../../nodes/utils';
import * as nodesErrors from '../../nodes/errors';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import * as clientUtils from '../utils';

/**
 * Attempts to get the node address of a provided node ID (by contacting
 * keynodes in the wider Polykey network).
 * @throws ErrorNodeGraphNodeNotFound if node address cannot be found
 */
function nodesFind({
  authenticate,
  nodeConnectionManager,
  logger,
}: {
  authenticate: Authenticate;
  nodeConnectionManager: NodeConnectionManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, nodesPB.NodeAddress>,
    callback: grpc.sendUnaryData<nodesPB.NodeAddress>,
  ): Promise<void> => {
    try {
      const response = new nodesPB.NodeAddress();
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
      const address = await nodeConnectionManager.findNode(nodeId);
      if (address == null) throw new nodesErrors.ErrorNodeGraphNodeIdNotFound();
      response
        .setNodeId(nodesUtils.encodeNodeId(nodeId))
        .setAddress(
          new nodesPB.Address().setHost(address.host).setPort(address.port),
        );
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        nodesErrors.ErrorNodeGraphNodeIdNotFound,
      ]) && logger.error(`${nodesFind.name}:${e}`);
      return;
    }
  };
}

export default nodesFind;
