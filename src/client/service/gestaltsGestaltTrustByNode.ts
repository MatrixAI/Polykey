import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type Discovery from '../../discovery/Discovery';
import type { NodeId } from '../../ids/types';
import type * as nodesPB from '../../proto/js/polykey/v1/nodes/nodes_pb';
import type Logger from '@matrixai/logger';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as grpcUtils from '../../grpc/utils';
import * as gestaltsErrors from '../../gestalts/errors';
import * as validationUtils from '../../validation/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as nodesUtils from '../../nodes/utils';
import * as clientUtils from '../utils';

function gestaltsGestaltTrustByNode({
  authenticate,
  gestaltGraph,
  discovery,
  db,
  logger,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
  discovery: Discovery;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<nodesPB.Node, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.EmptyMessage();
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
      await db.withTransactionF(async (tran) => {
        // Set the node in the gestalt graph if not already
        if ((await gestaltGraph.getGestaltByNode(nodeId, tran)) == null) {
          await gestaltGraph.setNode(
            {
              nodeId,
            },
            tran,
          );
          // Queue the new node for discovery
          await discovery.queueDiscoveryByNode(nodeId);
        }
        // Set notify permission
        await gestaltGraph.setGestaltActions(['node', nodeId], 'notify', tran);
      });
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        gestaltsErrors.ErrorGestaltsGraphNodeIdMissing,
      ]) && logger.error(`${gestaltsGestaltTrustByNode.name}:${e}`);
      return;
    }
  };
}

export default gestaltsGestaltTrustByNode;
