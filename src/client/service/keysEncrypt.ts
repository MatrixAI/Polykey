import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type Logger from '@matrixai/logger';
import type { PublicKey, JWK } from '../../keys/types';
import * as grpcUtils from '../../grpc/utils';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import * as clientUtils from '../utils';
import * as keysUtils from '../../keys/utils/index';
import { never } from '../../utils/index';
import * as keysErrors from '../../keys/errors';

function keysEncrypt({
  authenticate,
  keyRing,
  logger,
}: {
  authenticate: Authenticate;
  keyRing: KeyRing;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<keysPB.Crypto, keysPB.Crypto>,
    callback: grpc.sendUnaryData<keysPB.Crypto>,
  ): Promise<void> => {
    try {
      const response = new keysPB.Crypto();
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
      const data = keyRing.encrypt(
        publicKey,
        Buffer.from(call.request.getData(), 'binary'),
      );
      response.setData(data.toString('binary'));
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${keysEncrypt.name}:${e}`);
      return;
    }
  };
}

export default keysEncrypt;
