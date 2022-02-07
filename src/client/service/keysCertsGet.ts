import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { KeyManager } from '../../keys';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import { utils as grpcUtils } from '../../grpc';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';

function keysCertsGet({
  keyManager,
  authenticate,
}: {
  keyManager: KeyManager;
  authenticate: Authenticate;
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
      return;
    }
  };
}

export default keysCertsGet;
