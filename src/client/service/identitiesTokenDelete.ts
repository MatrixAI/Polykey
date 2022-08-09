import type * as grpc from '@grpc/grpc-js';
import type { DB } from '@matrixai/db';
import type { Authenticate } from '../types';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type { IdentityId, ProviderId } from '../../identities/types';
import type * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import { validateSync } from '../../validation';
import * as validationUtils from '../../validation/utils';
import { matchSync } from '../../utils';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import * as clientUtils from '../utils';

function identitiesTokenDelete({
  authenticate,
  identitiesManager,
  db,
  logger,
}: {
  authenticate: Authenticate;
  identitiesManager: IdentitiesManager;
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
      await db.withTransactionF((tran) =>
        identitiesManager.delToken(providerId, identityId, tran),
      );
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${identitiesTokenDelete.name}:${e}`);
      return;
    }
  };
}

export default identitiesTokenDelete;
