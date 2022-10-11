import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type CertManager from '../../keys/CertManager';
import type * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

function keysKeyPairReset({
  authenticate,
  certManager,
  logger,
}: {
  authenticate: Authenticate;
  certManager: CertManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<keysPB.Key, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.EmptyMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Other domains will be updated accordingly via the `EventBus` so we
      // only need to modify the KeyManager
      await certManager.resetCertWithNewKeyPair(call.request.getName());
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${keysKeyPairReset.name}:${e}`);
      return;
    }
  };
}

export default keysKeyPairReset;
