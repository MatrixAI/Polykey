import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';
import { utils as grpcUtils } from '../../grpc';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';

function identitiesProvidersList({
  identitiesManager,
  authenticate,
}: {
  identitiesManager: IdentitiesManager;
  authenticate: Authenticate;
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
      return;
    }
  };
}

export default identitiesProvidersList;
