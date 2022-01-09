import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { ProviderId } from '../../identities/types';
import * as clientErrors from '../errors';
import { utils as grpcUtils } from '../../grpc';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import { never } from '../../utils';

function identitiesAuthenticate({
  identitiesManager,
  authenticate,
}: {
  identitiesManager: IdentitiesManager;
  authenticate: Authenticate;
}) {
  return async (
    call: grpc.ServerWritableStream<
      identitiesPB.Provider,
      identitiesPB.AuthenticationProcess
    >,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const provider = identitiesManager.getProvider(
        call.request.getProviderId() as ProviderId,
      );
      if (provider == null) {
        throw new clientErrors.ErrorClientInvalidProvider();
      }
      const authFlow = provider.authenticate();
      let authFlowResult = await authFlow.next();
      if (authFlowResult.done) {
        never();
      }
      const authProcess = new identitiesPB.AuthenticationProcess();
      const authRequest = new identitiesPB.AuthenticationRequest();
      authRequest.setUrl(authFlowResult.value.url);
      const map = authRequest.getDataMap();
      for (const [k, v] of Object.entries(authFlowResult.value.data)) {
        map.set(k, v);
      }
      authProcess.setRequest(authRequest);
      await genWritable.next(authProcess);
      authFlowResult = await authFlow.next();
      if (!authFlowResult.done) {
        never();
      }
      const authResponse = new identitiesPB.AuthenticationResponse();
      authResponse.setIdentityId(authFlowResult.value);
      authProcess.setResponse(authResponse);
      await genWritable.next(authProcess);
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      return;
    }
  };
}

export default identitiesAuthenticate;
