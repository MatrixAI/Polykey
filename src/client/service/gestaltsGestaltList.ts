import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { GestaltGraph } from '../../gestalts';
import type { Gestalt } from '../../gestalts/types';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import { utils as grpcUtils } from '../../grpc';
import * as gestaltsPB from '../../proto/js/polykey/v1/gestalts/gestalts_pb';

function gestaltsGestaltList({
  authenticate,
  gestaltGraph,
  logger,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
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
      const certs: Array<Gestalt> = await gestaltGraph.getGestalts();
      for (const cert of certs) {
        gestaltMessage = new gestaltsPB.Gestalt();
        gestaltMessage.setName(JSON.stringify(cert));
        await genWritable.next(gestaltMessage);
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      logger.error(e);
      return;
    }
  };
}

export default gestaltsGestaltList;
