import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyManager from '../../keys/KeyManager';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import * as clientUtils from '../utils';

function keysCertsChainGet({
  authenticate,
  keyManager,
  logger,
}: {
  authenticate: Authenticate;
  keyManager: KeyManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerWritableStream<utilsPB.EmptyMessage, keysPB.Certificate>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const certs: Array<string> = await keyManager.getRootCertChainPems();
      let certMessage: keysPB.Certificate;
      for (const cert of certs) {
        certMessage = new keysPB.Certificate();
        certMessage.setCert(cert);
        await genWritable.next(certMessage);
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      !clientUtils.isClientClientError(e) && logger.error(`${keysCertsChainGet.name}:${e}`);
      return;
    }
  };
}

export default keysCertsChainGet;
