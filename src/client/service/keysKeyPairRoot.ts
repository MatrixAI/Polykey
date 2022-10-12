import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import * as clientUtils from '../utils';
import * as keysUtils from '../../keys/utils';

function keysKeyPairRoot({
  authenticate,
  keyRing,
  logger,
}: {
  authenticate: Authenticate;
  keyRing: KeyRing;
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
      const keyPair = keyRing.keyPair;
      response.setPublic(keysUtils.publicKeyToPEM(keyPair.publicKey));
      response.setPrivate(keysUtils.privateKeyToPEM(keyPair.privateKey));
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${keysKeyPairRoot.name}:${e}`);
      return;
    }
  };
}

export default keysKeyPairRoot;
