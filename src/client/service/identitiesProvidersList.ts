import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import type Logger from '@matrixai/logger';
import * as grpcUtils from '../../grpc/utils';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import * as clientUtils from '../utils';

function identitiesProvidersList({
  authenticate,
  identitiesManager,
  logger,
}: {
  authenticate: Authenticate;
  identitiesManager: IdentitiesManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerUnaryCall<utilsPB.EmptyMessage, identitiesPB.Provider>,
    callback: grpc.sendUnaryData<identitiesPB.Provider>,
  ): Promise<void> => {
    try {
      const response = new identitiesPB.Provider();
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const providers = identitiesManager.getProviders();
      response.setProviderId(JSON.stringify(Object.keys(providers)));
      callback(null, response);
      return;
    } catch (e) {
      callback(grpcUtils.fromError(e));
      !clientUtils.isClientClientError(e) &&
        logger.error(`${identitiesProvidersList.name}:${e}`);
      return;
    }
  };
}

export default identitiesProvidersList;
