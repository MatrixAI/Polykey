import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { ProviderId } from '../../identities/types';
import type Logger from '@matrixai/logger';
import { utils as grpcUtils } from '../../grpc';
import { errors as identitiesErrors } from '../../identities';
import { validateSync, utils as validationUtils } from '../../validation';
import { matchSync, never } from '../../utils';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';

function identitiesAuthenticate({
  authenticate,
  identitiesManager,
  logger,
}: {
  authenticate: Authenticate;
  identitiesManager: IdentitiesManager;
  logger: Logger;
}) {
  return async (
    call: grpc.ServerWritableStream<
      identitiesPB.Provider,
      identitiesPB.AuthenticationProcess
    >,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        providerId,
      }: {
        providerId: ProviderId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['providerId'], () => validationUtils.parseProviderId(value)],
            () => value,
          );
        },
        {
          providerId: call.request.getProviderId(),
        },
      );
      const provider = identitiesManager.getProvider(providerId);
      if (provider == null) {
        throw new identitiesErrors.ErrorProviderMissing();
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
      logger.error(e);
      return;
    }
  };
}

export default identitiesAuthenticate;
