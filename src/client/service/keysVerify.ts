import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import type Logger from '@matrixai/logger';
import type { Signature, JWK, PublicKey } from '../../keys/types';
import * as grpcUtils from '../../grpc/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';
import * as keysUtils from '../../keys/utils';
import * as keysErrors from '../../keys/errors';
import { never } from '../../utils/index';

function keysVerify({
  authenticate,
  keyRing,
  logger,
}: {
  authenticate: Authenticate;
  keyRing: KeyRing;
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
      let publicKey: PublicKey | undefined;
      try {
        const jwk = JSON.parse(call.request.getPublicKeyJwk()) as JWK;
        publicKey = keysUtils.publicKeyFromJWK(jwk);
        if (publicKey == null) never();
      } catch (e) {
        throw new keysErrors.ErrorPublicKeyParse(undefined, { cause: e });
      }
      const status = keyRing.verify(
        publicKey,
        Buffer.from(call.request.getData(), 'binary'),
        Buffer.from(call.request.getSignature(), 'binary') as Signature,
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
