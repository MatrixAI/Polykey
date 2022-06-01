import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type IdentitiesManager from '../../identities/IdentitiesManager';
import type {
  IdentityData,
  IdentityId,
  ProviderId,
} from '../../identities/types';
import type Logger from '@matrixai/logger';
import { validateSync } from '../../validation';
import { matchSync } from '../../utils';
import * as grpcUtils from '../../grpc/utils';
import * as validationUtils from '../../validation/utils';
import * as identitiesErrors from '../../identities/errors';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';
import * as clientUtils from '../utils';

function identitiesInfoConnectedGet({
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
      identitiesPB.ProviderSearch,
      identitiesPB.Info
    >,
  ): Promise<void> => {
    const genWritable = grpcUtils.generatorWritable(call, false);
    try {
      const metadata = await authenticate(call.metadata);
      call.sendMetadata(metadata);
      const {
        providerIds,
      }: {
        providerIds: Array<ProviderId>;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['providerIds'], () => value.map(validationUtils.parseProviderId)],
            () => value,
          );
        },
        {
          providerIds: call.request.getProviderIdList(),
        },
      );
      let identityId: IdentityId | undefined;
      if (call.request.hasAuthIdentityId()) {
        identityId = validateSync(
          (keyPath, value) => {
            return matchSync(keyPath)(
              [['identityId'], () => validationUtils.parseIdentityId(value)],
              () => value,
            );
          },
          {
            identityId: call.request.getAuthIdentityId(),
          },
        ).identityId;
      }
      // Process options that were set
      if (providerIds.length === 0) {
        Object.keys(identitiesManager.getProviders()).forEach((id) =>
          providerIds.push(id as ProviderId),
        );
      }
      const getDisconnected = call.request.getDisconnected();
      if (getDisconnected) {
        // Can only get connected identities at this stage
        throw new identitiesErrors.ErrorProviderUnimplemented();
      }
      const identities: Array<AsyncGenerator<IdentityData, any, unknown>> = [];
      for (const providerId of providerIds) {
        // Get provider from id
        const provider = identitiesManager.getProvider(providerId);
        if (provider === undefined) {
          throw new identitiesErrors.ErrorProviderMissing();
        }
        // Get our own authenticated identity in order to query, skip provider
        // if not authenticated
        const authIdentities = await provider.getAuthIdentityIds();
        if (authIdentities.length === 0) {
          continue;
        }
        const authIdentityId =
          identityId === undefined ? authIdentities[0] : identityId;
        identities.push(
          provider.getConnectedIdentityDatas(
            authIdentityId,
            call.request.getSearchTermList(),
          ),
        );
      }
      let limit: number | undefined;
      if (call.request.getLimit() !== '') {
        limit = parseInt(call.request.getLimit());
      }
      let count = 0;
      for (const gen of identities) {
        for await (const identity of gen) {
          if (limit !== undefined && count >= limit) break;
          const identityInfoMessage = new identitiesPB.Info();
          const providerMessage = new identitiesPB.Provider();
          providerMessage.setProviderId(identity.providerId);
          providerMessage.setIdentityId(identity.identityId);
          identityInfoMessage.setProvider(providerMessage);
          identityInfoMessage.setName(identity.name ?? '');
          identityInfoMessage.setEmail(identity.email ?? '');
          identityInfoMessage.setUrl(identity.url ?? '');
          await genWritable.next(identityInfoMessage);
          count++;
        }
      }
      await genWritable.next(null);
      return;
    } catch (e) {
      await genWritable.throw(e);
      !clientUtils.isClientError(e, [
        identitiesErrors.ErrorProviderMissing,
        identitiesErrors.ErrorProviderUnauthenticated,
        identitiesErrors.ErrorProviderUnimplemented,
      ]) && logger.error(e);
      return;
    }
  };
}

export default identitiesInfoConnectedGet;
