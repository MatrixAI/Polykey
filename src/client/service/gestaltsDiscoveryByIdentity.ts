import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { Discovery } from '../../discovery';
import type { IdentityId, ProviderId } from '../../identities/types';
import { utils as grpcUtils } from '../../grpc';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';

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
    const info = call.request;
    const response = new utilsPB.EmptyMessage();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      // Constructing identity info.
      const gen = discovery.discoverGestaltByIdentity(
        info.getProviderId() as ProviderId,
        info.getIdentityId() as IdentityId,
      );
      for await (const _ of gen) {
        // Empty
      }
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default gestaltsDiscoveryByIdentity;
