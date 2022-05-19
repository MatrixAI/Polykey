import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { IdentityId, ProviderId } from '../../identities/types';
import type Discovery from '../../discovery/Discovery';
import type * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import type Logger from '@matrixai/logger';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as grpcUtils from '../../grpc/utils';
import * as validationUtils from '../../validation/utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

function gestaltsGestaltTrustByIdentity({
  authenticate,
  gestaltGraph,
  discovery,
  db,
  logger,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
  discovery: Discovery;
  db: DB;
  logger: Logger;
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
      // Set the identity in the gestalt graph if not already
      await db.withTransactionF(async (tran) => {
        if (
          (await gestaltGraph.getGestaltByIdentity(
            providerId,
            identityId,
            tran,
          )) == null
        ) {
          // Queue the new identity for discovery
          // This will only add the identity to the GG if it is connected to a
          // node (required to set permissions for it)
          await discovery.queueDiscoveryByIdentity(providerId, identityId);
        }
        // We can currently only set permissions for identities that are
        // connected to at least one node. If these conditions are not met, this
        // will throw an error. Since discovery can take time, you may need to
        // reattempt this command if it fails on the first attempt and you expect
        // there to be a linked node for the identity.
        await gestaltGraph.setGestaltActionByIdentity(
          providerId,
          identityId,
          'notify',
          tran,
        );
      });
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      logger.error(e);
      return;
    }
  };
}

export default gestaltsGestaltTrustByIdentity;
