import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as gestaltsPB from '../../proto/js/polykey/v1/gestalts/gestalts_pb';
import * as clientUtils from '../utils';
import * as nodesUtils from '../../nodes/utils';

function gestaltsGestaltList({
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
    call: grpc.ServerWritableStream<utilsPB.EmptyMessage, gestaltsPB.Gestalt>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      await db.withTransactionF(async (tran) => {
        for await (const gestalt of gestaltGraph.getGestalts(tran)) {
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
            let record = newGestalt.matrix[keyA];
            if (record == null) {
              record = {};
              newGestalt.matrix[keyA] = record;
            }
            for (const keyB of Object.keys(gestalt.matrix[keyA])) {
              record[keyB] = null;
            }
          }
          const gestaltMessage = new gestaltsPB.Gestalt();
          gestaltMessage.setName(JSON.stringify(newGestalt));
          await genWritable.next(gestaltMessage);
        }
      });
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      !clientUtils.isClientClientError(e) &&
        logger.error(`${gestaltsGestaltList.name}:${e}`);
      return;
    }
  };
}

export default gestaltsGestaltList;
