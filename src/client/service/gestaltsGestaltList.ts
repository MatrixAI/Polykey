import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { Gestalt } from '../../gestalts/types';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as gestaltsPB from '../../proto/js/polykey/v1/gestalts/gestalts_pb';
import * as clientUtils from '../utils';

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
    let gestaltMessage: gestaltsPB.Gestalt;
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const certs: Array<Gestalt> = [] // FIXME: this should be streaming the data
      await db.withTransactionF(async (tran) => {
          for await (const gestalt of gestaltGraph.getGestalts(tran)) {
            certs.push(gestalt);
          }
        }
      );
      for (const cert of certs) {
        gestaltMessage = new gestaltsPB.Gestalt();
        gestaltMessage.setName(JSON.stringify(cert));
        await genWritable.next(gestaltMessage);
      }
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
