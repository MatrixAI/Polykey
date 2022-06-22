import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyManager from '../../keys/KeyManager';
import type * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

function keysVerify({
  authenticate,
  keyManager,
  logger,
}: {
  authenticate: Authenticate;
  keyManager: KeyManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<keysPB.Crypto, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.StatusMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const status = await keyManager.verifyWithRootKeyPair(
        Buffer.from(call.request.getData(), 'binary'),
        Buffer.from(call.request.getSignature(), 'binary'),
      );
      response.setSuccess(status);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${keysVerify.name}:${e}`);
      return;
    }
  };
}

export default keysVerify;
