import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { NodeId } from '../../nodes/types';
import type { GestaltGraph } from '../../gestalts';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import { utils as grpcUtils } from '../../grpc';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
import * as permissionsPB from '../../proto/js/polykey/v1/permissions/permissions_pb';

function gestaltsActionsGetByNode({
  authenticate,
  gestaltGraph,
  logger,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, permissionsPB.Actions>,
    callback: grpc.sendUnaryData<permissionsPB.Actions>,
  ): Promise<void> => {
    try {
      const response = new permissionsPB.Actions();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const { nodeId }: { nodeId: NodeId } = validateSync(
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
      const result = await gestaltGraph.getGestaltActionsByNode(nodeId);
      if (result == null) {
        // Node doesn't exist, so no permissions
        response.setActionList([]);
      } else {
        // Contains permission
        const actions = Object.keys(result);
        response.setActionList(actions);
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default gestaltsActionsGetByNode;
