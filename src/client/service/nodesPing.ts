import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type NodeManager from '../../nodes/NodeManager';
import type { NodeId } from '../../nodes/types';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as nodesErrors from '../../nodes/errors';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

/**
 * Checks if a remote node is online.
 */
function nodesPing({
  authenticate,
  nodeManager,
  logger,
}: {
  authenticate: Authenticate;
  nodeManager: NodeManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.StatusMessage();
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
      const status = await nodeManager.pingNode(nodeId);
      response.setSuccess(status);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        nodesErrors.ErrorNodeGraphNodeIdNotFound,
      ]) && logger.error(`${nodesPing.name}:${e}`);
      return;
    }
  };
}

export default nodesPing;
