import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { KeyManager } from '../../keys';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import { utils as grpcUtils } from '../../grpc';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';

function keysKeyPairRoot({
  authenticate,
  keyManager,
  logger,
}: {
  authenticate: Authenticate;
  keyManager: KeyManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, keysPB.KeyPair>,
    callback: grpc.sendUnaryData<keysPB.KeyPair>,
  ): Promise<void> => {
    try {
      const response = new keysPB.KeyPair();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const keyPair = keyManager.getRootKeyPairPem();
      response.setPublic(keyPair.publicKey);
      response.setPrivate(keyPair.privateKey);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default keysKeyPairRoot;
