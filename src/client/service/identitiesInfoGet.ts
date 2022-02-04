import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { ProviderId } from '../../identities/types';
import { utils as grpcUtils } from '../../grpc';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
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
    try {
      const response = new identitiesPB.Provider();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        providerId,
      }: {
        providerId: ProviderId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['providerId'], () => validationUtils.parseProviderId(value)],
            () => value,
          );
        },
        {
          providerId: call.request.getProviderId(),
        },
      );
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
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default identitiesInfoGet;
