import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { KeyManager } from '../../keys';
import { utils as grpcUtils } from '../../grpc';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';

function keysDecrypt({
  keyManager,
  authenticate,
}: {
  keyManager: KeyManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<keysPB.Crypto, keysPB.Crypto>,
    callback: grpc.sendUnaryData<keysPB.Crypto>,
  ): Promise<void> => {
    try {
      const response = new keysPB.Crypto();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const data = await keyManager.decryptWithRootKeyPair(
        Buffer.from(call.request.getData(), 'binary'),
      );
      response.setData(data.toString('binary'));
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default keysDecrypt;
