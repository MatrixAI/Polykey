import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { IdentityId, ProviderId, TokenData } from '../../identities/types';
import type * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import { utils as grpcUtils } from '../../grpc';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
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
    try {
      const response = new utilsPB.EmptyMessage();
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
          providerId: call.request.getProvider()?.getProviderId(),
          identityId: call.request.getProvider()?.getIdentityId(),
        },
      );
      await identitiesManager.putToken(providerId, identityId, {
        accessToken: call.request.getToken(),
      } as TokenData);
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default identitiesTokenPut;
