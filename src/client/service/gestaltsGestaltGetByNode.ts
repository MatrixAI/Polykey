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
import * as gestaltsPB from '../../proto/js/polykey/v1/gestalts/gestalts_pb';
import * as clientUtils from '../utils';
import * as nodesUtils from '../../nodes/utils';

function gestaltsGestaltGetByNode({
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
    call: grpc.ServerUnaryCall<nodesPB.Node, gestaltsPB.Graph>,
    callback: grpc.sendUnaryData<gestaltsPB.Graph>,
  ): Promise<void> => {
    try {
      const response = new gestaltsPB.Graph();
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
      const gestalt = await db.withTransactionF((tran) =>
        gestaltGraph.getGestaltByNode(nodeId, tran),
      );
      if (gestalt != null) {
        const newGestalt = {
          matrix: {},
          nodes: {},
          identities: gestalt.identities,
        };
        for (const [key, value] of Object.entries(gestalt.nodes)) {
          newGestalt.nodes[key] = {
            nodeId: nodesUtils.encodeNodeId(value.nodeId),
          };
        }
        for (const keyA of Object.keys(gestalt.matrix)) {
          for (const keyB of Object.keys(gestalt.matrix[keyA])) {
            let record = newGestalt.matrix[keyA];
            if (record == null) {
              record = {};
              newGestalt.matrix[keyA] = record;
            }
            record[keyB] = null;
          }
        }
        response.setGestaltGraph(JSON.stringify(newGestalt));
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${gestaltsGestaltGetByNode.name}:${e}`);
      return;
    }
  };
}

export default gestaltsGestaltGetByNode;
