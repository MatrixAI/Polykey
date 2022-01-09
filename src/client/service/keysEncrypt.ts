import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { KeyManager } from '../../keys';
import { utils as grpcUtils } from '../../grpc';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';

function keysEncrypt({
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
    const response = new keysPB.Crypto();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const data = await keyManager.encryptWithRootKeyPair(
        Buffer.from(call.request.getData(), 'binary'),
      );
      response.setData(data.toString('binary'));
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default keysEncrypt;
