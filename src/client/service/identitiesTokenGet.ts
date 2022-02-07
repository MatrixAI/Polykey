import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { IdentityId, ProviderId } from '../../identities/types';
import { utils as grpcUtils } from '../../grpc';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
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
    try {
      const response = new identitiesPB.Token();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        providerId,
        identityId,
      }: {
        providerId: ProviderId;
        identityId: IdentityId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['providerId'], () => validationUtils.parseProviderId(value)],
            [['identityId'], () => validationUtils.parseIdentityId(value)],
            () => value,
          );
        },
        {
          providerId: call.request.getProviderId(),
          identityId: call.request.getIdentityId(),
        },
      );
      const tokens = await identitiesManager.getToken(providerId, identityId);
      response.setToken(JSON.stringify(tokens));
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default identitiesTokenGet;
