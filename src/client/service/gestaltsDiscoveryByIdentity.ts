import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { Discovery } from '../../discovery';
import type { IdentityId, ProviderId } from '../../identities/types';
import type * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import { utils as grpcUtils } from '../../grpc';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function gestaltsDiscoveryByIdentity({
  authenticate,
  discovery,
}: {
  authenticate: Authenticate;
  discovery: Discovery;
}) {
  return async (
    call: grpc.ServerUnaryCall<identitiesPB.Provider, utilsPB.EmptyMessage>,
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
          providerId: call.request.getProviderId(),
          identityId: call.request.getIdentityId(),
        },
      );
      const gen = discovery.discoverGestaltByIdentity(providerId, identityId);
      for await (const _ of gen) {
        // Empty
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      return;
    }
  };
}

export default gestaltsDiscoveryByIdentity;
