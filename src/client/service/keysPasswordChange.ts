import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyManager from '../../keys/KeyManager';
import type * as sessionsPB from '../../proto/js/polykey/v1/sessions/sessions_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

function keysPasswordChange({
  authenticate,
  keyManager,
  logger,
}: {
  authenticate: Authenticate;
  keyManager: KeyManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<sessionsPB.Password, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.EmptyMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      await keyManager.changePassword(call.request.getPassword());
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) && logger.error(e);
      return;
    }
  };
}

export default keysPasswordChange;
