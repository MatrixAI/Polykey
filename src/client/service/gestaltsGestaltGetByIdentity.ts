import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { GestaltGraph } from '../../gestalts';
import type { IdentityId, ProviderId } from '../../identities/types';
import type * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import { utils as grpcUtils } from '../../grpc';
import * as gestaltsPB from '../../proto/js/polykey/v1/gestalts/gestalts_pb';

function gestaltsGestaltGetByIdentity({
  authenticate,
  gestaltGraph,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
}) {
  return async (
    call: grpc.ServerUnaryCall<identitiesPB.Provider, gestaltsPB.Graph>,
    callback: grpc.sendUnaryData<gestaltsPB.Graph>,
  ): Promise<void> => {
    const response = new gestaltsPB.Graph();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const gestalt = await gestaltGraph.getGestaltByIdentity(
        call.request.getProviderId() as ProviderId,
        call.request.getIdentityId() as IdentityId,
      );
      if (gestalt != null) {
        response.setGestaltGraph(JSON.stringify(gestalt));
      }
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default gestaltsGestaltGetByIdentity;
