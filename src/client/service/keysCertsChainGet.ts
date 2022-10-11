import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type CertManager from '../../keys/CertManager';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import * as clientUtils from '../utils';

function keysCertsChainGet({
  authenticate,
  certManager,
  logger,
}: {
  authenticate: Authenticate;
  certManager: CertManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerWritableStream<utilsPB.EmptyMessage, keysPB.Certificate>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const certsPEMs: Array<string> = await certManager.getCertPEMsChain();
      let certMessage: keysPB.Certificate;
      for (const certPEM of certsPEMs) {
        certMessage = new keysPB.Certificate();
        certMessage.setCert(certPEM);
        await genWritable.next(certMessage);
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      !clientUtils.isClientClientError(e) &&
        logger.error(`${keysCertsChainGet.name}:${e}`);
      return;
    }
  };
}

export default keysCertsChainGet;
