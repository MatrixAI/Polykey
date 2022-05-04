import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { GestaltGraph } from '../../gestalts';
import type { GestaltAction } from '../../gestalts/types';
import type { NodeId } from '../../nodes/types';
import type * as permissionsPB from '../../proto/js/polykey/v1/permissions/permissions_pb';
import type Logger from '@matrixai/logger';
import { utils as grpcUtils } from '../../grpc';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function gestaltsActionsUnsetByNode({
  authenticate,
  gestaltGraph,
  logger,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<permissionsPB.ActionSet, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.EmptyMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const { nodeId, action }: { nodeId: NodeId; action: GestaltAction } =
        validateSync(
          (keyPath, value) => {
            return matchSync(keyPath)(
              [['nodeId'], () => validationUtils.parseNodeId(value)],
              [['action'], () => validationUtils.parseGestaltAction(value)],
              () => value,
            );
          },
          {
            nodeId: call.request.getNode()?.getNodeId(),
            action: call.request.getAction(),
          },
        );
      await gestaltGraph.unsetGestaltActionByNode(nodeId, action);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default gestaltsActionsUnsetByNode;
