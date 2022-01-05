import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { KeyManager } from '../../keys';
import type * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function keysVerify({
  keyManager,
  authenticate,
}: {
  keyManager: KeyManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<keysPB.Crypto, utilsPB.StatusMessage>,
    callback: grpc.sendUnaryData<utilsPB.StatusMessage>,
  ): Promise<void> => {
    const response = new utilsPB.StatusMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const status = await keyManager.verifyWithRootKeyPair(
        Buffer.from(call.request.getData(), 'binary'),
        Buffer.from(call.request.getSignature(), 'binary'),
      );
      response.setSuccess(status);
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default keysVerify;
