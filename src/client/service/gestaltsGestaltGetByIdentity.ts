import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { GestaltGraph } from '../../gestalts';
import type { IdentityId, ProviderId } from '../../identities/types';
import type * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import type Logger from '@matrixai/logger';
import { utils as grpcUtils } from '../../grpc';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync } from '../../utils';
import * as gestaltsPB from '../../proto/js/polykey/v1/gestalts/gestalts_pb';

function gestaltsGestaltGetByIdentity({
  authenticate,
  gestaltGraph,
  logger,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<identitiesPB.Provider, gestaltsPB.Graph>,
    callback: grpc.sendUnaryData<gestaltsPB.Graph>,
  ): Promise<void> => {
    try {
      const response = new gestaltsPB.Graph();
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
      const gestalt = await gestaltGraph.getGestaltByIdentity(
        providerId,
        identityId,
      );
      if (gestalt != null) {
        response.setGestaltGraph(JSON.stringify(gestalt));
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default gestaltsGestaltGetByIdentity;
