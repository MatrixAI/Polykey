import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
import type { ProviderId } from '../../identities/types';
import type Logger from '@matrixai/logger';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as grpcUtils from '../../grpc/utils';
import * as validationUtils from '../../validation/utils';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';

function identitiesAuthenticatedGet({
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
      identitiesPB.OptionalProvider,
      identitiesPB.Provider
    >,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      let providerId: ProviderId | undefined;
      if (call.request.hasProviderId()) {
        providerId = validateSync(
          (keyPath, value) => {
            return matchSync(keyPath)(
              [['providerId'], () => validationUtils.parseProviderId(value)],
              () => value,
            );
          },
          {
            providerId: call.request.getProviderId(),
          },
        ).providerId;
      }
      const providerIds: Array<ProviderId> =
        providerId == null
          ? (Object.keys(identitiesManager.getProviders()) as Array<ProviderId>)
          : [providerId];
      for (const providerId of providerIds) {
        const provider = identitiesManager.getProvider(providerId);
        if (provider == null) {
          continue;
        }
        const identities = await provider.getAuthIdentityIds();
        const providerMessage = new identitiesPB.Provider();
        providerMessage.setProviderId(provider.id);
        for (const identityId of identities) {
          providerMessage.setIdentityId(identityId);
          await genWritable.next(providerMessage);
        }
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      logger.error(e);
      return;
    }
  };
}

export default identitiesAuthenticatedGet;
