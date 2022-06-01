import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { GestaltAction } from '../../gestalts/types';
import type { NodeId } from '../../nodes/types';
import type * as permissionsPB from '../../proto/js/polykey/v1/permissions/permissions_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as gestaltsErrors from '../../gestalts/errors';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

function gestaltsActionsSetByNode({
  authenticate,
  gestaltGraph,
  db,
  logger,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
  db: DB;
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
      await db.withTransactionF(async (tran) =>
        gestaltGraph.setGestaltActionByNode(nodeId, action, tran),
      );
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientError(e, [
        gestaltsErrors.ErrorGestaltsGraphNodeIdMissing,
      ]) && logger.error(e);
      return;
    }
  };
}

export default gestaltsActionsSetByNode;
