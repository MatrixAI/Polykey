import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type KeyRing from '../../keys/KeyRing';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';
import * as clientUtils from '../utils';

function keysSign({
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
      const signature = keyRing.sign(
        Buffer.from(call.request.getData(), 'binary'),
      );
      response.setData(call.request.getData());
      response.setSignature(signature.toString('binary'));
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${keysSign.name}:${e}`);
      return;
    }
  };
}

export default keysSign;
