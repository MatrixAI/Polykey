import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type GestaltGraph from '../../gestalts/GestaltGraph';
import type { GestaltAction } from '../../gestalts/types';
import type { IdentityId, ProviderId } from '../../identities/types';
import type * as permissionsPB from '../../proto/js/polykey/v1/permissions/permissions_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import * as gestaltsErrors from '../../gestalts/errors';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

function gestaltsActionsSetByIdentity({
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
    call: grpc.ServerUnaryCall<permissionsPB.ActionSet, utilsPB.EmptyMessage>,
    callback: grpc.sendUnaryData<utilsPB.EmptyMessage>,
  ): Promise<void> => {
    try {
      const response = new utilsPB.EmptyMessage();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        action,
        providerId,
        identityId,
      }: {
        action: GestaltAction;
        providerId: ProviderId;
        identityId: IdentityId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['action'], () => validationUtils.parseGestaltAction(value)],
            [['providerId'], () => validationUtils.parseProviderId(value)],
            [['identityId'], () => validationUtils.parseIdentityId(value)],
            () => value,
          );
        },
        {
          action: call.request.getAction(),
          providerId: call.request.getIdentity()?.getProviderId(),
          identityId: call.request.getIdentity()?.getIdentityId(),
        },
      );
      await db.withTransactionF((tran) =>
        gestaltGraph.setGestaltActions(
          ['identity', [providerId, identityId]],
          action,
          tran,
        ),
      );
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e, [
        gestaltsErrors.ErrorGestaltsGraphIdentityIdMissing,
        gestaltsErrors.ErrorGestaltsGraphNodeIdMissing,
      ]) && logger.error(`${gestaltsActionsSetByIdentity.name}:${e}`);
      return;
    }
  };
}

export default gestaltsActionsSetByIdentity;
