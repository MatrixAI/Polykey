import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { IdentityId, ProviderId } from '../../identities/types';
import { utils as grpcUtils } from '../../grpc';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';

function identitiesTokenGet({
  identitiesManager,
  authenticate,
}: {
  identitiesManager: IdentitiesManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<identitiesPB.Provider, identitiesPB.Token>,
    callback: grpc.sendUnaryData<identitiesPB.Token>,
  ): Promise<void> => {
    const response = new identitiesPB.Token();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const tokens = await identitiesManager.getToken(
        call.request.getProviderId() as ProviderId,
        call.request.getIdentityId() as IdentityId,
      );
      response.setToken(JSON.stringify(tokens));
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default identitiesTokenGet;
