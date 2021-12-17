import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { IdentityId, ProviderId, TokenData } from '../../identities/types';
import { utils as grpcUtils } from '../../grpc';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function identitiesTokenPut({
  identitiesManager,
  authenticate,
}: {
  identitiesManager: IdentitiesManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<
      identitiesPB.TokenSpecific,
      utilsPB.EmptyMessage
    >,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    const response = new utilsPB.EmptyMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const provider = call.request.getProvider();
      await identitiesManager.putToken(
        provider?.getProviderId() as ProviderId,
        provider?.getIdentityId() as IdentityId,
        { accessToken: call.request.getToken() } as TokenData,
      );
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default identitiesTokenPut;

