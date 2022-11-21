import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type { NodeId } from '../../ids/types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import * as permissionsPB from '../../proto/js/polykey/v1/permissions/permissions_pb';
import * as clientUtils from '../utils';

function gestaltsActionsGetByNode({
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
      const result = await db.withTransactionF((tran) =>
        gestaltGraph.getGestaltActions(['node', nodeId], tran),
      );
      response.setActionList(Object.keys(result));
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${gestaltsActionsGetByNode.name}:${e}`);
      return;
    }
  };
}

export default gestaltsActionsGetByNode;
