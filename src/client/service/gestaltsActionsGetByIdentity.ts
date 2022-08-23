import type Logger from '@matrixai/logger';
import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { IdentityId, ProviderId } from '../../identities/types';
import type * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import { matchSync } from '../../utils/matchers';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as grpcUtils from '../../grpc/utils';
import * as permissionsPB from '../../proto/js/polykey/v1/permissions/permissions_pb';
import * as clientUtils from '../utils';

function gestaltsActionsGetByIdentity({
  authenticate,
  gestaltGraph,
  db,
  logger,
}: {
  authenticate: Authenticate;
  gestaltGraph: GestaltGraph;
  db: DB;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<identitiesPB.Provider, permissionsPB.Actions>,
    callback: grpc.sendUnaryData<permissionsPB.Actions>,
  ): Promise<void> => {
    try {
      const response = new permissionsPB.Actions();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        providerId,
        identityId,
      }: { providerId: ProviderId; identityId: IdentityId } = validateSync(
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

      const result = await db.withTransactionF((tran) =>
        gestaltGraph.getGestaltActionsByIdentity(providerId, identityId, tran),
      );
      if (result == null) {
        // Node doesn't exist, so no permissions
        response.setActionList([]);
      } else {
        // Contains permission
        const actions = Object.keys(result);
        response.setActionList(actions);
      }
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${gestaltsActionsGetByIdentity.name}:${e}`);
      return;
    }
  };
}

export default gestaltsActionsGetByIdentity;
