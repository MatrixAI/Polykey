import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { KeyManager } from '../../keys';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import { utils as grpcUtils } from '../../grpc';
import * as keysPB from '../../proto/js/polykey/v1/keys/keys_pb';

function keysCertsChainGet({
  keyManager,
  authenticate,
}: {
  keyManager: KeyManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerWritableStream<utilsPB.EmptyMessage, keysPB.Certificate>,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const certs: Array<string> = await keyManager.getRootCertChainPems();
      let certMessage: keysPB.Certificate;
      for (const cert of certs) {
        certMessage = new keysPB.Certificate();
        certMessage.setCert(cert);
        await genWritable.next(certMessage);
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      return;
    }
  };
}

export default keysCertsChainGet;
