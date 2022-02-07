import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { KeyManager } from '../../keys';
import type * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function keysKeyPairReset({
  keyManager,
  authenticate,
}: {
  keyManager: KeyManager;
  authenticate: Authenticate;
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
      await keyManager.resetRootKeyPair(call.request.getName());
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default keysKeyPairReset;
