import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { ProviderId } from '../../identities/types';
import { utils as grpcUtils } from '../../grpc';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';

/**
 * Gets the first identityId of the local keynode.
 */
function identitiesInfoGet({
  identitiesManager,
  authenticate,
}: {
  identitiesManager: IdentitiesManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerUnaryCall<identitiesPB.Provider, identitiesPB.Provider>,
    callback: grpc.sendUnaryData<identitiesPB.Provider>,
  ): Promise<void> => {
    const response = new identitiesPB.Provider();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Get's an identity out of all identities.
      const providerId = call.request.getProviderId() as ProviderId;
      const provider = identitiesManager.getProvider(providerId);
      if (provider !== undefined) {
        const identities = await provider.getAuthIdentityIds();
        response.setProviderId(providerId);
        if (identities.length !== 0) {
          response.setIdentityId(identities[0]);
        }
      }
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default identitiesInfoGet;
