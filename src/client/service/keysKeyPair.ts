import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type * as sessionsPB from '../../proto/js/polykey/v1/sessions/sessions_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import * as clientUtils from '../utils';
import * as keysUtils from '../../keys/utils';

function keysKeyPair({
  authenticate,
  keyRing,
  logger,
}: {
  authenticate: Authenticate;
  keyRing: KeyRing;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<sessionsPB.Password, keysPB.KeyPairJWK>,
    callback: grpc.sendUnaryData<keysPB.KeyPairJWK>,
  ): Promise<void> => {
    try {
      const response = new keysPB.KeyPairJWK();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const privateJWK = keysUtils.privateKeyToJWK(keyRing.keyPair.privateKey);
      const privateJWE = keysUtils.wrapWithPassword(
        call.request.getPassword(),
        privateJWK,
      );
      const publicJWK = keysUtils.publicKeyToJWK(keyRing.keyPair.publicKey);
      response.setPrivateKeyJwe(JSON.stringify(privateJWE));
      response.setPublicKeyJwk(JSON.stringify(publicJWK));
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${keysKeyPair.name}:${e}`);
      return;
    }
  };
}

export default keysKeyPair;
