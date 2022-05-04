import type * as grpc from '@grpc/grpc-js';
import type { Authenticate } from '../types';
import type { IdentitiesManager } from '../../identities';
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
import * as identitiesUtils from '../../identities/utils';
import * as identitiesErrors from '../../identities/errors';
import * as identitiesPB from '../../proto/js/polykey/v1/identities/identities_pb';

function identitiesInfoGet({
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
        identityId,
      }: {
        providerIds: Array<ProviderId>;
        identityId: IdentityId;
      } = validateSync(
        (keyPath, value) => {
          return matchSync(keyPath)(
            [['providerIds'], () => value.map(validationUtils.parseProviderId)],
            [['identityId'], () => validationUtils.parseIdentityId(value)],
            () => value,
          );
        },
        {
          providerIds: call.request.getProviderIdList(),
          identityId: call.request.getIdentityId(),
        },
      );
      // Process options that were set
      if (providerIds.length === 0) {
        Object.keys(identitiesManager.getProviders()).forEach((id) =>
          providerIds.push(id as ProviderId),
        );
      }
      const searchTerms = call.request.getSearchTermList();
      const getDisconnected = call.request.getDisconnected();
      if (getDisconnected) {
        // Currently this command performs the same way regardless of whether
        // this option is set (i.e. always disconnected)
      }
      const identities: Array<IdentityData | undefined> = [];
      for (const providerId of providerIds) {
        // Get provider from id
        const provider = identitiesManager.getProvider(providerId);
        if (provider === undefined) {
          throw new identitiesErrors.ErrorProviderMissing();
        }
        // Get our own authenticated identity in order to query, skip provider
        // if not authenticated
        // It doesn't matter which one we use since `getIdentityData` does not
        // require the identity to be connected
        const authIdentities = await provider.getAuthIdentityIds();
        if (authIdentities.length === 0) {
          continue;
        }
        // Get identity data
        identities.push(
          await provider.getIdentityData(authIdentities[0], identityId),
        );
      }
      let limit: number | undefined;
      if (call.request.getLimit() !== '') {
        limit = parseInt(call.request.getLimit());
      }
      if (limit === undefined || limit > identities.length) {
        limit = identities.length;
      }
      for (let i = 0; i < limit; i++) {
        const identity = identities[i];
        if (identity !== undefined) {
          if (identitiesUtils.matchIdentityData(identity, searchTerms)) {
            const identityInfoMessage = new identitiesPB.Info();
            const providerMessage = new identitiesPB.Provider();
            providerMessage.setProviderId(identity.providerId);
            providerMessage.setIdentityId(identity.identityId);
            identityInfoMessage.setProvider(providerMessage);
            identityInfoMessage.setName(identity.name ?? '');
            identityInfoMessage.setEmail(identity.email ?? '');
            identityInfoMessage.setUrl(identity.url ?? '');
            await genWritable.next(identityInfoMessage);
          }
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

export default identitiesInfoGet;
