import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import { utils as grpcUtils } from '../../grpc';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import * as utilsPB from '../../proto/js/polykey/v1/utils/utils_pb';

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
    const response = new identitiesPB.Provider();
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);

      const providers = identitiesManager.getProviders();
      response.setProviderId(JSON.stringify(Object.keys(providers)));
      callback(null, response);
      return;
    } catch (err) {
      callback(grpcUtils.fromError(err), null);
      return;
    }
  };
}

export default identitiesProvidersList;

