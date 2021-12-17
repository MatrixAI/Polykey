import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { GestaltGraph } from '../../gestalts';
import type { IdentityId, ProviderId } from '../../identities/types';
import { utils as grpcUtils } from '../../grpc';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import * as permissionsPB from '../../proto/js/polykey/v1/permissions/permissions_pb';

function gestaltsActionsGetByIdentity({
  authenticate,
  gestaltGraph,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
}) {
  return async (
    call: grpc.ServerUnaryCall<identitiesPB.Provider, permissionsPB.Actions>,
    callback: grpc.sendUnaryData<permissionsPB.Actions>,
  ): Promise<void> => {
    const info = call.request;
    const response = new permissionsPB.Actions();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const providerId = info.getProviderId() as ProviderId;
      const identityId = info.getIdentityId() as IdentityId;
      const result = await gestaltGraph.getGestaltActionsByIdentity(
        providerId,
        identityId,
      );
      if (result == null) {
        // Node doesn't exist, so no permissions. might throw error instead TBD.
        response.setActionList([]);
      } else {
        // Contains permission
        const actions = Object.keys(result);
        response.setActionList(actions);
      }
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default gestaltsActionsGetByIdentity;
