import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyManager from '../../keys/KeyManager';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import * as clientUtils from '../utils';

function keysCertsGet({
  authenticate,
  keyManager,
  logger,
}: {
  authenticate: Authenticate;
  keyManager: KeyManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, keysPB.Certificate>,
    callback: grpc.sendUnaryData<keysPB.Certificate>,
  ): Promise<void> => {
    try {
      const response = new keysPB.Certificate();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const cert = keyManager.getRootCertPem();
      response.setCert(cert);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientError(e) && logger.error(e);
      return;
    }
  };
}

export default keysCertsGet;
